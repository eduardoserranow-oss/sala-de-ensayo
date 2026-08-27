import { buildFourBarPlan } from './vibe-roulette-audio.js';

const RHODES_BASE_URL = 'https://raw.githubusercontent.com/danielpodrazka/piano/main/audio/rhodes-fm';
const NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SIMPLE_PC_NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clamp01(value, fallback = 0.65) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
}
function mod(n, m = 12) { return ((n % m) + m) % m; }
function lerp(a, b, t) { return a + (b - a) * clamp01(t); }
function hash01(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function jitter(seed, amount) { return (hash01(seed) * 2 - 1) * amount; }

function pitchClassFromNoteName(name) {
  const match = String(name).match(/^([A-G])([b#]{0,2})$/);
  if (!match) throw new Error(`Unsupported note name: ${name}`);
  let pc = NATURAL_PC[match[1]];
  for (const acc of match[2]) pc += acc === '#' ? 1 : -1;
  return mod(pc);
}

function splitChord(chord) {
  const match = String(chord || '').match(/^([A-G][b#]{0,2})(.*)$/);
  if (!match) throw new Error(`Unsupported chord: ${chord}`);
  return { root: match[1], suffix: match[2], pc: pitchClassFromNoteName(match[1]) };
}

export function practicalizeChordForPlayback(chord) {
  const info = splitChord(chord);
  return `${SIMPLE_PC_NAMES[info.pc]}${info.suffix}`;
}

export function midiToRhodesSampleName(midi) {
  const safe = Math.round(clamp(Number(midi) || 60, 35, 86));
  const octave = Math.floor(safe / 12) - 1;
  return `${NOTE_NAMES[mod(safe)]}${octave}.mp3`;
}

export function velocityLayerForMidiVelocity(velocity) {
  const v = clamp(Math.round(Number(velocity) || 56), 1, 127);
  return clamp(Math.ceil(v / 16), 1, 8);
}

function chordIntervals(chord) {
  const { suffix } = splitChord(chord);
  if (/m7b5/.test(suffix)) return [0,3,6,10];
  if (/dim7/.test(suffix)) return [0,3,6,9];
  if (/dim/.test(suffix)) return [0,3,6];
  if (/sus2/.test(suffix)) return [0,2,7];
  if (/sus4/.test(suffix)) return [0,5,7];
  const minor = /m(?!aj)/.test(suffix);
  const notes = minor ? [0,3,7] : [0,4,7];
  if (/maj(?:7|9|11|13)/.test(suffix)) notes.push(11);
  else if (/(?:7|9|11|13)/.test(suffix)) notes.push(10);
  return notes;
}

function midiForPcNear(pc, target) {
  let midi = Math.round(target);
  while (mod(midi) !== pc) midi += 1;
  while (midi - 12 >= target - 5) midi -= 12;
  return midi;
}

function romanFamily(token = '') {
  return String(token).replace(/[♭#b]/g, '').replace(/[^ivIV]/g, '');
}

function chooseRightHandPcs(chord, romanToken, energy) {
  const info = splitChord(chord);
  const ints = chordIntervals(chord);
  const pcs = ints.slice(1).map(i => mod(info.pc + i));
  const family = romanFamily(romanToken);
  const minor = /m(?!aj)/.test(info.suffix);
  const has7 = /(?:7|9|11|13)/.test(info.suffix);
  const isDominantFunction = family === 'V' || family === 'v';

  if (!has7 && !/dim|sus/.test(info.suffix)) {
    const seventh = mod(info.pc + (minor ? 10 : 11));
    const ninth = mod(info.pc + 14);
    if (!isDominantFunction && energy < 0.82 && !pcs.includes(seventh)) pcs.push(seventh);
    if (!pcs.includes(ninth)) pcs.push(ninth);
  }

  const unique = [...new Set(pcs)];
  if (unique.length > 3) {
    // Prefer 3rd/7th/9th style shell over a dense four-note block.
    return [unique[0], unique[unique.length - 2], unique[unique.length - 1]].filter((v, i, a) => a.indexOf(v) === i);
  }
  return unique;
}

function voiceLeadPcs(pcs, previous = null, targetCenter = 62) {
  const candidates = pcs.map(pc => {
    const base = midiForPcNear(pc, targetCenter);
    return [base - 12, base, base + 12].filter(n => n >= 50 && n <= 76);
  });

  const chosen = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const options = candidates[i];
    options.sort((a,b) => {
      const targetA = previous?.length ? Math.min(...previous.map(p => Math.abs(p-a))) : Math.abs(a-targetCenter);
      const targetB = previous?.length ? Math.min(...previous.map(p => Math.abs(p-b))) : Math.abs(b-targetCenter);
      return targetA - targetB;
    });
    let note = options[0];
    while (chosen.some(n => Math.abs(n-note) < 2) && note + 12 <= 76) note += 12;
    chosen.push(note);
  }
  return [...new Set(chosen)].sort((a,b)=>a-b);
}

function playedLabel(chord, romanToken, energy) {
  const info = splitChord(chord);
  if (/dim|sus|(?:7|9|11|13)/.test(info.suffix)) return chord;
  const minor = /m(?!aj)/.test(info.suffix);
  if (minor) return energy < 0.42 ? `${info.root}m7` : `${info.root}m9`;
  const family = romanFamily(romanToken);
  if (family === 'V' || family === 'v') return `${info.root}add9`;
  return energy < 0.42 ? `${info.root}maj7` : `${info.root}maj9`;
}

function makeVoicing(chord, romanToken, previousRight, energy, index) {
  const practical = practicalizeChordForPlayback(chord);
  const info = splitChord(practical);
  const rightPcs = chooseRightHandPcs(practical, romanToken, energy);
  const right = voiceLeadPcs(rightPcs, previousRight, 60 + (index % 2));
  let bass = midiForPcNear(info.pc, 40 + (index % 2));
  while (bass < 35) bass += 12;
  while (bass > 47) bass -= 12;
  return {
    baseChord: chord,
    playbackChord: practical,
    playedChord: playedLabel(practical, romanToken, energy),
    left: [bass],
    right
  };
}

function dynamicsForEnergy(energy) {
  return {
    bass: lerp(44, 58, energy),
    right: lerp(50, 68, energy),
    response: lerp(38, 54, energy),
    topBoost: lerp(4, 7, energy),
    fingerSpreadMs: lerp(30, 18, energy),
    mainLength: lerp(3.55, 2.65, energy),
    bassLength: lerp(3.8, 3.15, energy)
  };
}

function phraseOffsetsForBar(barIndex, energy) {
  if (energy < 0.38) return barIndex % 2 === 0 ? [2.75] : [3.05];
  if (energy < 0.72) return barIndex % 2 === 0 ? [2.45, 3.55] : [1.85, 3.2];
  return barIndex % 2 === 0 ? [1.55, 3.25] : [2.05, 3.55];
}

function pushEvent(events, event) {
  events.push({
    ...event,
    midi: clamp(Math.round(event.midi), 35, 86),
    velocity: clamp(Math.round(event.velocity), 1, 127),
    startBeat: Math.max(0, event.startBeat),
    durationBeats: Math.max(0.08, event.durationBeats),
    fingerOffsetSeconds: Math.max(0, event.fingerOffsetSeconds || 0)
  });
}

export function buildSoftHumanRhodesPlan(chords, {
  roman = [], bars = 4, beatsPerBar = 4, bpm = 96, energyTarget = 0.65
} = {}) {
  const energy = clamp01(energyTarget, 0.65);
  const harmonicPlan = buildFourBarPlan(chords, { bars, beatsPerBar });
  const dyn = dynamicsForEnergy(energy);
  const events = [];
  const voicings = [];
  let cursorBeat = 0;
  let previousRight = null;

  harmonicPlan.forEach((item, chordIndex) => {
    const voicing = makeVoicing(item.chord, roman[chordIndex] || '', previousRight, energy, chordIndex);
    previousRight = voicing.right;
    voicings.push(voicing);
    const span = item.beats;
    const barArc = [0.96,0.90,1.0,0.93][chordIndex % 4];

    voicing.left.forEach((midi, i) => pushEvent(events, {
      midi,
      velocity: (dyn.bass + jitter(`bass-${chordIndex}-${i}`, 2.2)) * barArc,
      startBeat: cursorBeat,
      durationBeats: Math.min(span * 0.96, dyn.bassLength * Math.max(1, span / 4)),
      role: 'bass-root', chordIndex,
      fingerOffsetSeconds: i * 0.006
    }));

    voicing.right.forEach((midi, i) => {
      const isTop = i === voicing.right.length - 1;
      const spreadOrder = chordIndex % 2 === 0 ? i : voicing.right.length - 1 - i;
      pushEvent(events, {
        midi,
        velocity: (dyn.right + (isTop ? dyn.topBoost : i === 0 ? 1 : -4) + jitter(`main-${chordIndex}-${i}`, 2.5)) * barArc,
        startBeat: cursorBeat + Math.min(0.16, 0.04 + energy * 0.08),
        durationBeats: Math.min(span * 0.9, dyn.mainLength * Math.max(1, span / 4)),
        role: isTop ? 'top-voice' : 'right-hand', chordIndex,
        fingerOffsetSeconds: (spreadOrder / Math.max(1, voicing.right.length - 1)) * dyn.fingerSpreadMs / 1000
      });
    });

    if (span >= 4) {
      const offsets = phraseOffsetsForBar(chordIndex, energy);
      offsets.forEach((offset, responseIndex) => {
        if (offset >= span - 0.15) return;
        const responseNotes = responseIndex % 2 === 0 ? voicing.right.slice(-2) : voicing.right.slice(-1);
        responseNotes.forEach((midi, i) => pushEvent(events, {
          midi,
          velocity: dyn.response + (i === responseNotes.length - 1 ? 3 : -2) + jitter(`resp-${chordIndex}-${responseIndex}-${i}`, 2),
          startBeat: cursorBeat + offset,
          durationBeats: Math.min(0.65 + (1-energy)*0.35, span - offset - 0.08),
          role: 'afro-response', chordIndex,
          fingerOffsetSeconds: i * 0.011
        }));
      });
    }

    cursorBeat += span;
  });

  return {
    instrument: 'Rhodes FM',
    style: 'Indie · Lo-Fi · Jazzy · Afro pocket',
    profile: 'soft-human-v2',
    bpm: clamp(Number(bpm) || 96, 40, 220),
    bars, beatsPerBar, totalBeats: bars * beatsPerBar, energy,
    plan: harmonicPlan, voicings, events
  };
}

export function rotaryProfileForEnergy(value) {
  const energy = clamp01(value, 0.65);
  return {
    drumHz: lerp(0.42, 1.55, Math.pow(energy, 1.25)),
    hornHz: lerp(0.68, 2.9, Math.pow(energy, 1.2)),
    wet: lerp(0.18, 0.31, energy),
    depth: lerp(0.20, 0.36, energy),
    label: energy < 0.38 ? 'slow rotary' : energy < 0.72 ? 'gentle flow rotary' : 'lively rotary'
  };
}

function softDriveCurve(amount = 0.12) {
  const curve = new Float32Array(1024);
  const drive = 1 + amount * 1.2;
  for (let i=0;i<curve.length;i++) {
    const x = (i/(curve.length-1))*2-1;
    curve[i] = Math.tanh(x*drive)/Math.tanh(drive);
  }
  return curve;
}

class RhodesSampleBank {
  constructor(baseUrl = RHODES_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.byteCache = new Map();
    this.bufferCache = new Map();
  }
  key(layer,midi){ return `v${layer}/${midiToRhodesSampleName(midi)}`; }
  url(layer,midi){ return `${this.baseUrl}/${this.key(layer,midi)}`; }
  async fetchBytes(layer,midi){
    const key = this.key(layer,midi);
    if (this.byteCache.has(key)) return this.byteCache.get(key);
    const promise = fetch(this.url(layer,midi), { mode:'cors', cache:'force-cache' }).then(r => {
      if (!r.ok) throw new Error(`Rhodes sample failed to load (${r.status})`);
      return r.arrayBuffer();
    });
    this.byteCache.set(key,promise);
    return promise;
  }
  async decode(ctx,layer,midi){
    const key = this.key(layer,midi);
    if (this.bufferCache.has(key)) return this.bufferCache.get(key);
    const promise = this.fetchBytes(layer,midi).then(bytes => ctx.decodeAudioData(bytes.slice(0)));
    this.bufferCache.set(key,promise);
    return promise;
  }
  async preload(performance){
    const unique = new Map();
    for (const event of performance.events) {
      const layer = velocityLayerForMidiVelocity(event.velocity);
      unique.set(this.key(layer,event.midi), [layer,event.midi]);
    }
    await Promise.all([...unique.values()].map(([layer,midi]) => this.fetchBytes(layer,midi).catch(()=>null)));
  }
}

export class SoftHumanRhodesPreview {
  constructor(options = {}) {
    this.context = null;
    this.sampleBank = new RhodesSampleBank(options.baseUrl || RHODES_BASE_URL);
    this.activeSources = new Set();
    this.activeNodes = [];
    this.output = null;
    this.handlePageHide = () => this.stop();
    this.handleVisibilityChange = () => { if (typeof document !== 'undefined' && document.hidden) this.stop(); };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this.handlePageHide, { passive:true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive:true });
  }
  createContext(){
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('Web Audio API is not supported in this browser.');
    try { return new AudioCtx({latencyHint:'interactive'}); } catch (_) { return new AudioCtx(); }
  }
  async ensureContext(){
    if (!this.context || this.context.state === 'closed') this.context = this.createContext();
    if (this.context.state !== 'running') { try { await this.context.resume(); } catch (_) {} }
    if (this.context.state !== 'running') throw new Error('Audio is waiting for an iPhone/Safari user gesture. Tap Play again.');
    return this.context;
  }
  stop(){
    for (const source of this.activeSources) { try{source.stop();}catch(_){} try{source.disconnect();}catch(_){} }
    this.activeSources.clear();
    for (const node of this.activeNodes) { try{if(typeof node.stop==='function')node.stop();}catch(_){} try{node.disconnect();}catch(_){} }
    this.activeNodes=[];
    if (this.output) { try{this.output.disconnect();}catch(_){} this.output=null; }
  }
  createChain(ctx,energy){
    const rotary = rotaryProfileForEnergy(energy);
    const input = ctx.createGain();
    const drive = ctx.createWaveShaper();
    drive.curve = softDriveCurve(0.08 + energy*0.05);
    drive.oversample = '2x';
    const highShelf = ctx.createBiquadFilter();
    highShelf.type='highshelf'; highShelf.frequency.value=2800; highShelf.gain.value=-2.8;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type='lowpass'; lowpass.frequency.value=lerp(4300,5200,energy); lowpass.Q.value=0.18;
    input.connect(drive); drive.connect(highShelf); highShelf.connect(lowpass);

    const dry = ctx.createGain(); dry.gain.value = 1 - rotary.wet*0.45;
    const wet = ctx.createGain(); wet.gain.value = rotary.wet;
    lowpass.connect(dry); lowpass.connect(wet);

    const low = ctx.createBiquadFilter(); low.type='lowpass'; low.frequency.value=760;
    const high = ctx.createBiquadFilter(); high.type='highpass'; high.frequency.value=680;
    wet.connect(low); wet.connect(high);
    const lowDelay=ctx.createDelay(0.015), highDelay=ctx.createDelay(0.015);
    lowDelay.delayTime.value=0.0027; highDelay.delayTime.value=0.0019;
    low.connect(lowDelay); high.connect(highDelay);
    const lowPan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    const highPan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    lowDelay.connect(lowPan); highDelay.connect(highPan);

    const sum = ctx.createGain();
    dry.connect(sum); lowPan.connect(sum); highPan.connect(sum);
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-8; comp.knee.value=10; comp.ratio.value=1.25; comp.attack.value=0.025; comp.release.value=0.28;
    sum.connect(comp);
    const output=ctx.createGain(); output.gain.value=0.48;
    comp.connect(output); output.connect(ctx.destination); this.output=output;

    const attachLfo=(rate,panNode,delayNode,delayDepth)=>{
      const osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.value=rate;
      const depth=ctx.createGain(); depth.gain.value=rotary.depth;
      const d=ctx.createGain(); d.gain.value=delayDepth;
      osc.connect(d); d.connect(delayNode.delayTime);
      if (panNode.pan) { osc.connect(depth); depth.connect(panNode.pan); }
      osc.start(); this.activeNodes.push(osc,depth,d);
    };
    attachLfo(rotary.drumHz,lowPan,lowDelay,0.00042);
    attachLfo(rotary.hornHz,highPan,highDelay,0.00072);
    this.activeNodes.push(input,drive,highShelf,lowpass,dry,wet,low,high,lowDelay,highDelay,lowPan,highPan,sum,comp);
    return { input, rotary };
  }
  async prepareFourBars(chords,options={}){
    const performance=buildSoftHumanRhodesPlan(chords,options);
    await this.sampleBank.preload(performance);
    return performance;
  }
  async playFourBars(chords,options={}){
    const performance=buildSoftHumanRhodesPlan(chords,options);
    const ctx=await this.ensureContext();
    this.stop();
    const chain=this.createChain(ctx,performance.energy);
    const secondsPerBeat=60/performance.bpm;
    const unique=new Map();
    for (const event of performance.events) {
      const layer=velocityLayerForMidiVelocity(event.velocity);
      unique.set(`${layer}:${event.midi}`,[layer,event.midi]);
    }
    const decoded=new Map();
    await Promise.all([...unique.entries()].map(async ([key,[layer,midi]])=>decoded.set(key,await this.sampleBank.decode(ctx,layer,midi))));
    const startBase=ctx.currentTime+0.07;
    for (const event of performance.events) {
      const layer=velocityLayerForMidiVelocity(event.velocity);
      const buffer=decoded.get(`${layer}:${event.midi}`); if(!buffer) continue;
      const source=ctx.createBufferSource(); source.buffer=buffer;
      const gain=ctx.createGain();
      const roleGain=event.role==='bass-root'?0.62:event.role==='top-voice'?0.76:event.role==='afro-response'?0.50:0.66;
      const start=startBase+event.startBeat*secondsPerBeat+event.fingerOffsetSeconds;
      const duration=Math.max(0.12,Math.min(buffer.duration-0.03,event.durationBeats*secondsPerBeat));
      const end=start+duration;
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(roleGain,start+0.018);
      gain.gain.setValueAtTime(roleGain*0.86,Math.max(start+0.05,end-Math.min(0.22,duration*0.22)));
      gain.gain.exponentialRampToValueAtTime(0.0001,end);
      source.connect(gain); gain.connect(chain.input);
      source.start(start); source.stop(end+0.03);
      this.activeSources.add(source);
      source.onended=()=>{this.activeSources.delete(source);try{source.disconnect();}catch(_){}try{gain.disconnect();}catch(_){}};
    }
    const totalSeconds=performance.totalBeats*secondsPerBeat;
    window.setTimeout(()=>{ if(this.output) this.stop(); },Math.ceil((totalSeconds+0.9)*1000));
    return {...performance,totalSeconds,rotary:chain.rotary};
  }
}

export const RHODES_LIBRARY_INFO = {
  name:'Physics-Based Rhodes FM', source:'danielpodrazka/piano', range:'B1–D6', velocityLayers:8, license:'MIT', baseUrl:RHODES_BASE_URL
};
