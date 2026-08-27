import { buildFourBarPlan, voiceLeadChords } from './vibe-roulette-audio.js';

const RHODES_BASE_URL = 'https://raw.githubusercontent.com/danielpodrazka/piano/main/audio/rhodes-fm';
const NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const NOTE_TO_PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clamp01(value, fallback = 0.65) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : fallback;
}
function mod(n, m = 12) { return ((n % m) + m) % m; }
function hash01(seed) {
  let h = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function variation(seed, amount = 1) { return (hash01(seed) * 2 - 1) * amount; }

export function midiToRhodesSampleName(midi) {
  const safe = Math.round(clamp(Number(midi) || 60, 35, 86));
  const octave = Math.floor(safe / 12) - 1;
  return `${NOTE_NAMES[mod(safe)]}${octave}.mp3`;
}

export function velocityLayerForMidiVelocity(velocity) {
  const v = clamp(Math.round(Number(velocity) || 64), 1, 127);
  return clamp(Math.ceil(v / 16), 1, 8);
}

function parseChord(chord) {
  const text = String(chord || '');
  const match = text.match(/^([A-G](?:b|#)?)/);
  if (!match || NOTE_TO_PC[match[1]] === undefined) throw new Error(`Unsupported chord: ${chord}`);
  const root = match[1];
  return {
    text,
    root,
    pc: NOTE_TO_PC[root],
    minor: /m(?!aj)/.test(text),
    diminished: /dim|m7b5/.test(text),
    majorSeventh: /maj(?:7|9|11|13)/.test(text),
    hasSeventh: /(?:7|9|11|13)/.test(text),
    suspended: /sus/.test(text)
  };
}

function midiForPcNear(pc, target) {
  let note = Math.round(target);
  while (mod(note) !== pc) note += 1;
  while (note - 12 >= target - 6) note -= 12;
  return note;
}

function romanFamily(token = '') {
  return String(token).replace(/[♭#b]/g, '').replace(/[^ivIV]/g, '');
}

function colorIntervalsFor(chordInfo, romanToken, energy) {
  if (chordInfo.diminished || chordInfo.suspended) return [];
  const family = romanFamily(romanToken);
  if (chordInfo.hasSeventh) {
    return energy > 0.58 ? [14] : [];
  }
  if (chordInfo.minor) {
    return energy > 0.66 ? [10, 14] : [10];
  }
  if (family === 'V' || family === 'v') {
    return [14];
  }
  if (['I', 'IV', 'III', 'VI'].includes(family)) {
    return energy < 0.48 ? [11] : [11, 14];
  }
  return energy > 0.52 ? [14] : [];
}

function playedChordLabel(chordInfo, romanToken, energy) {
  if (chordInfo.diminished || chordInfo.suspended || chordInfo.hasSeventh) return chordInfo.text;
  const family = romanFamily(romanToken);
  if (chordInfo.minor) return energy > 0.66 ? `${chordInfo.root}m9` : `${chordInfo.root}m7`;
  if (family === 'V' || family === 'v') return `${chordInfo.root}add9`;
  if (['I', 'IV', 'III', 'VI'].includes(family)) return energy < 0.48 ? `${chordInfo.root}maj7` : `${chordInfo.root}maj9`;
  return energy > 0.52 ? `${chordInfo.root}add9` : chordInfo.text;
}

function makePianisticVoicing(chord, romanToken, previousRight, energy, index) {
  const info = parseChord(chord);
  const core = voiceLeadChords([chord])[0];
  let right = core.map(note => {
    let n = note;
    while (n < 52) n += 12;
    while (n > 72) n -= 12;
    return n;
  }).sort((a, b) => a - b);

  const colors = colorIntervalsFor(info, romanToken, energy);
  for (const interval of colors) {
    let note = midiForPcNear(mod(info.pc + interval), 64 + index * 0.3);
    while (note < 55) note += 12;
    while (note > 76) note -= 12;
    if (!right.some(existing => mod(existing) === mod(note))) right.push(note);
  }
  right = [...new Set(right)].sort((a, b) => a - b);

  if (previousRight?.length) {
    right = right.map(note => {
      const alternatives = [note - 12, note, note + 12].filter(n => n >= 50 && n <= 78);
      alternatives.sort((a, b) => {
        const da = Math.min(...previousRight.map(p => Math.abs(a - p)));
        const db = Math.min(...previousRight.map(p => Math.abs(b - p)));
        return da - db;
      });
      return alternatives[0] ?? note;
    });
    right = [...new Set(right)].sort((a, b) => a - b);
  }

  let bass = midiForPcNear(info.pc, 41 + (index % 2) * 2);
  while (bass < 35) bass += 12;
  while (bass > 48) bass -= 12;
  const left = [bass];
  if (energy < 0.58 && bass + 7 <= 52) left.push(bass + 7);

  return {
    baseChord: chord,
    playedChord: playedChordLabel(info, romanToken, energy),
    left: [...new Set(left)].sort((a, b) => a - b),
    right
  };
}

function phraseProfile(energy) {
  if (energy < 0.38) {
    return {
      name: 'lo-fi breathe',
      sustainRatio: 1.03,
      fingerSpreadMs: 34,
      bassVelocity: 62,
      rightVelocity: 68,
      responseOffsets: [0.69],
      responseLength: 0.7
    };
  }
  if (energy < 0.72) {
    return {
      name: 'indie flow',
      sustainRatio: 0.92,
      fingerSpreadMs: 26,
      bassVelocity: 68,
      rightVelocity: 76,
      responseOffsets: [0.61],
      responseLength: 0.55
    };
  }
  return {
    name: 'jazzy pocket',
    sustainRatio: 0.78,
    fingerSpreadMs: 20,
    bassVelocity: 74,
    rightVelocity: 84,
    responseOffsets: [0.41, 0.76],
    responseLength: 0.32
  };
}

function phraseArc(index, count) {
  const arcs = [1.0, 0.93, 1.06, 0.97, 1.02, 0.95, 1.04, 0.98];
  return arcs[index % Math.min(arcs.length, Math.max(1, count))] || 1;
}

function pushNoteEvent(events, {
  midi, velocity, startBeat, durationBeats, role, chordIndex, fingerOffsetSeconds = 0
}) {
  events.push({
    midi: clamp(Math.round(midi), 35, 86),
    velocity: clamp(Math.round(velocity), 1, 127),
    startBeat: Math.max(0, startBeat),
    durationBeats: Math.max(0.08, durationBeats),
    role,
    chordIndex,
    fingerOffsetSeconds
  });
}

export function buildHumanRhodesPlan(chords, {
  roman = [],
  bars = 4,
  beatsPerBar = 4,
  bpm = 96,
  energyTarget = 0.65
} = {}) {
  const energy = clamp01(energyTarget, 0.65);
  const plan = buildFourBarPlan(chords, { bars, beatsPerBar });
  const profile = phraseProfile(energy);
  const events = [];
  const voicings = [];
  let cursorBeat = 0;
  let previousRight = null;

  plan.forEach((item, chordIndex) => {
    const romanToken = roman[chordIndex] || '';
    const voicing = makePianisticVoicing(item.chord, romanToken, previousRight, energy, chordIndex);
    previousRight = voicing.right;
    voicings.push(voicing);
    const arc = phraseArc(chordIndex, plan.length);
    const sectionBeats = item.beats;
    const sustain = Math.min(sectionBeats + (energy < 0.38 ? 0.12 : 0), Math.max(0.55, sectionBeats * profile.sustainRatio));

    voicing.left.forEach((midi, noteIndex) => {
      const velocity = (profile.bassVelocity + variation(`bass-${chordIndex}-${noteIndex}`, 4)) * arc;
      pushNoteEvent(events, {
        midi,
        velocity,
        startBeat: cursorBeat,
        durationBeats: Math.min(sectionBeats * 0.93, sustain),
        role: noteIndex === 0 ? 'bass-root' : 'bass-fifth',
        chordIndex,
        fingerOffsetSeconds: noteIndex * 0.008
      });
    });

    const rightNotes = voicing.right;
    const reverseRoll = chordIndex % 3 === 1;
    rightNotes.forEach((midi, noteIndex) => {
      const position = reverseRoll ? rightNotes.length - 1 - noteIndex : noteIndex;
      const topBoost = noteIndex === rightNotes.length - 1 ? 8 : noteIndex === 0 ? 2 : -3;
      const velocity = (profile.rightVelocity + topBoost + variation(`rh-${chordIndex}-${noteIndex}`, 4.5)) * arc;
      pushNoteEvent(events, {
        midi,
        velocity,
        startBeat: cursorBeat,
        durationBeats: sustain,
        role: noteIndex === rightNotes.length - 1 ? 'top-voice' : 'right-hand',
        chordIndex,
        fingerOffsetSeconds: (position / Math.max(1, rightNotes.length - 1)) * (profile.fingerSpreadMs / 1000)
      });
    });

    if (sectionBeats >= 4) {
      const responseNotes = energy < 0.38 ? rightNotes.slice(-2) : rightNotes.slice(-3);
      profile.responseOffsets.forEach((ratio, responseIndex) => {
        const responseBeat = cursorBeat + sectionBeats * ratio;
        responseNotes.forEach((midi, noteIndex) => {
          const velocity = profile.rightVelocity - 12 + responseIndex * 3 + (noteIndex === responseNotes.length - 1 ? 5 : 0) + variation(`resp-${chordIndex}-${responseIndex}-${noteIndex}`, 3);
          pushNoteEvent(events, {
            midi,
            velocity,
            startBeat: responseBeat,
            durationBeats: Math.max(0.25, Math.min(sectionBeats * profile.responseLength, sectionBeats - sectionBeats * ratio - 0.08)),
            role: 'rhythmic-response',
            chordIndex,
            fingerOffsetSeconds: noteIndex * 0.012
          });
        });
      });

      if (sectionBeats >= 8) {
        const secondBarBeat = cursorBeat + 4;
        rightNotes.forEach((midi, noteIndex) => {
          pushNoteEvent(events, {
            midi,
            velocity: profile.rightVelocity - 7 + (noteIndex === rightNotes.length - 1 ? 6 : 0),
            startBeat: secondBarBeat,
            durationBeats: Math.min(3.2, sectionBeats - 4),
            role: 'second-bar-rearticulation',
            chordIndex,
            fingerOffsetSeconds: noteIndex * 0.01
          });
        });
      }
    } else if (sectionBeats >= 2 && energy >= 0.55) {
      rightNotes.slice(-2).forEach((midi, noteIndex) => {
        pushNoteEvent(events, {
          midi,
          velocity: profile.rightVelocity - 14 + noteIndex * 4,
          startBeat: cursorBeat + sectionBeats * 0.62,
          durationBeats: sectionBeats * 0.27,
          role: 'short-response',
          chordIndex,
          fingerOffsetSeconds: noteIndex * 0.01
        });
      });
    }

    cursorBeat += sectionBeats;
  });

  return {
    instrument: 'Rhodes FM',
    style: 'Indie · Lo-Fi · Jazzy',
    profile: profile.name,
    bpm: clamp(Number(bpm) || 96, 40, 220),
    bars,
    beatsPerBar,
    totalBeats: bars * beatsPerBar,
    energy,
    plan,
    voicings,
    events
  };
}

export function rotaryProfileForEnergy(value) {
  const energy = clamp01(value, 0.65);
  if (energy < 0.38) return { drumHz: 0.48, hornHz: 0.72, wet: 0.30, depth: 0.38, label: 'slow rotary' };
  if (energy < 0.72) return { drumHz: 1.15, hornHz: 1.9, wet: 0.38, depth: 0.48, label: 'flow rotary' };
  return { drumHz: 3.8, hornHz: 5.4, wet: 0.44, depth: 0.55, label: 'fast rotary' };
}

function softSaturationCurve(amount = 0.7) {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 3.2;
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

class RhodesSampleBank {
  constructor(baseUrl = RHODES_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.byteCache = new Map();
    this.bufferCache = new Map();
  }

  sampleKey(layer, midi) {
    return `v${layer}/${midiToRhodesSampleName(midi)}`;
  }

  sampleUrl(layer, midi) {
    return `${this.baseUrl}/${this.sampleKey(layer, midi)}`;
  }

  async fetchBytes(layer, midi) {
    const key = this.sampleKey(layer, midi);
    if (this.byteCache.has(key)) return this.byteCache.get(key);
    const promise = fetch(this.sampleUrl(layer, midi), { mode: 'cors', cache: 'force-cache' }).then(response => {
      if (!response.ok) throw new Error(`Rhodes sample failed to load (${response.status})`);
      return response.arrayBuffer();
    });
    this.byteCache.set(key, promise);
    return promise;
  }

  async decode(ctx, layer, midi) {
    const key = this.sampleKey(layer, midi);
    if (this.bufferCache.has(key)) return this.bufferCache.get(key);
    const promise = this.fetchBytes(layer, midi).then(bytes => ctx.decodeAudioData(bytes.slice(0)));
    this.bufferCache.set(key, promise);
    return promise;
  }

  async preloadPerformance(performance) {
    const unique = new Map();
    for (const event of performance.events) {
      const layer = velocityLayerForMidiVelocity(event.velocity);
      unique.set(this.sampleKey(layer, event.midi), [layer, event.midi]);
    }
    await Promise.all([...unique.values()].map(([layer, midi]) => this.fetchBytes(layer, midi).catch(() => null)));
  }
}

export class HumanRhodesPreview {
  constructor(options = {}) {
    this.context = null;
    this.sampleBank = new RhodesSampleBank(options.baseUrl || RHODES_BASE_URL);
    this.activeSources = new Set();
    this.activeNodes = [];
    this.output = null;
    this.handlePageHide = () => this.stop();
    this.handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) this.stop();
    };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this.handlePageHide, { passive: true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
  }

  createContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('Web Audio API is not supported in this browser.');
    try { return new AudioCtx({ latencyHint: 'interactive' }); }
    catch (_) { return new AudioCtx(); }
  }

  async ensureContext() {
    if (!this.context || this.context.state === 'closed') this.context = this.createContext();
    if (this.context.state !== 'running') {
      try { await this.context.resume(); } catch (_) {}
    }
    if (this.context.state !== 'running') {
      throw new Error('Audio is waiting for an iPhone/Safari user gesture. Tap Play again.');
    }
    return this.context;
  }

  stop() {
    for (const source of this.activeSources) {
      try { source.stop(); } catch (_) {}
      try { source.disconnect(); } catch (_) {}
    }
    this.activeSources.clear();
    for (const node of this.activeNodes) {
      try { if (typeof node.stop === 'function') node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
    this.activeNodes = [];
    if (this.output) {
      try { this.output.disconnect(); } catch (_) {}
      this.output = null;
    }
  }

  createRotaryChain(ctx, energy) {
    const rotary = rotaryProfileForEnergy(energy);
    const input = ctx.createGain();
    const saturator = ctx.createWaveShaper();
    saturator.curve = softSaturationCurve(0.42 + energy * 0.28);
    saturator.oversample = '2x';
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 6200 + energy * 1800;
    tone.Q.value = 0.25;
    input.connect(saturator);
    saturator.connect(tone);

    const dry = ctx.createGain();
    dry.gain.value = 1 - rotary.wet * 0.58;
    const wetBus = ctx.createGain();
    wetBus.gain.value = rotary.wet;
    tone.connect(dry);
    tone.connect(wetBus);

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 820;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 720;
    wetBus.connect(low);
    wetBus.connect(high);

    const lowDelay = ctx.createDelay(0.02);
    const highDelay = ctx.createDelay(0.02);
    lowDelay.delayTime.value = 0.0032;
    highDelay.delayTime.value = 0.0023;
    low.connect(lowDelay);
    high.connect(highDelay);

    const lowPan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    const highPan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    lowDelay.connect(lowPan);
    highDelay.connect(highPan);

    const lowGain = ctx.createGain();
    const highGain = ctx.createGain();
    lowGain.gain.value = 0.78;
    highGain.gain.value = 0.9;
    lowPan.connect(lowGain);
    highPan.connect(highGain);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -17;
    compressor.knee.value = 14;
    compressor.ratio.value = 2.2;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.18;
    dry.connect(compressor);
    lowGain.connect(compressor);
    highGain.connect(compressor);

    const output = ctx.createGain();
    output.gain.value = 0.72;
    compressor.connect(output);
    output.connect(ctx.destination);
    this.output = output;

    const makeLfo = (rate, panNode, delayNode, phaseDepth) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = rate;
      const panDepth = ctx.createGain();
      panDepth.gain.value = rotary.depth;
      const delayDepth = ctx.createGain();
      delayDepth.gain.value = phaseDepth;
      osc.connect(delayDepth);
      delayDepth.connect(delayNode.delayTime);
      if (panNode.pan) {
        osc.connect(panDepth);
        panDepth.connect(panNode.pan);
      }
      osc.start();
      this.activeNodes.push(osc, panDepth, delayDepth);
    };

    makeLfo(rotary.drumHz, lowPan, lowDelay, 0.00065);
    makeLfo(rotary.hornHz, highPan, highDelay, 0.00115);
    this.activeNodes.push(input, saturator, tone, dry, wetBus, low, high, lowDelay, highDelay, lowPan, highPan, lowGain, highGain, compressor);
    return { input, rotary };
  }

  async prepareFourBars(chords, options = {}) {
    const performance = buildHumanRhodesPlan(chords, options);
    await this.sampleBank.preloadPerformance(performance);
    return performance;
  }

  async playFourBars(chords, options = {}) {
    const performance = buildHumanRhodesPlan(chords, options);
    const ctx = await this.ensureContext();
    this.stop();
    const chain = this.createRotaryChain(ctx, performance.energy);
    const secondsPerBeat = 60 / performance.bpm;
    const startBase = ctx.currentTime + 0.075;

    const decoded = new Map();
    const unique = new Map();
    for (const event of performance.events) {
      const layer = velocityLayerForMidiVelocity(event.velocity);
      const key = `${layer}:${event.midi}`;
      if (!unique.has(key)) unique.set(key, [layer, event.midi]);
    }
    await Promise.all([...unique.entries()].map(async ([key, [layer, midi]]) => {
      decoded.set(key, await this.sampleBank.decode(ctx, layer, midi));
    }));

    for (const event of performance.events) {
      const layer = velocityLayerForMidiVelocity(event.velocity);
      const buffer = decoded.get(`${layer}:${event.midi}`);
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      const roleGain = event.role === 'bass-root' ? 0.9 : event.role.startsWith('bass') ? 0.68 : event.role === 'top-voice' ? 0.92 : event.role.includes('response') ? 0.72 : 0.82;
      const start = startBase + event.startBeat * secondsPerBeat + event.fingerOffsetSeconds;
      const maxDuration = Math.max(0.12, Math.min(buffer.duration - 0.02, event.durationBeats * secondsPerBeat));
      const end = start + maxDuration;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.03, roleGain), start + 0.012);
      gain.gain.setValueAtTime(Math.max(0.028, roleGain * 0.94), Math.max(start + 0.04, end - Math.min(0.16, maxDuration * 0.18)));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(gain);
      gain.connect(chain.input);
      source.start(start);
      source.stop(end + 0.025);
      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        try { source.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      };
    }

    const totalSeconds = performance.totalBeats * secondsPerBeat;
    window.setTimeout(() => {
      if (this.output) this.stop();
    }, Math.ceil((totalSeconds + 0.8) * 1000));

    return {
      ...performance,
      totalSeconds,
      rotary: chain.rotary
    };
  }
}

export const RHODES_LIBRARY_INFO = {
  name: 'Physics-Based Rhodes FM',
  source: 'danielpodrazka/piano',
  range: 'B1–D6',
  velocityLayers: 8,
  license: 'MIT',
  baseUrl: RHODES_BASE_URL
};
