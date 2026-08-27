const NOTE_TO_PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};

function mod(n, m = 12) { return ((n % m) + m) % m; }

function chordRootPc(chord) {
  const match = String(chord).match(/^([A-G](?:b|#)?)/);
  if (!match || NOTE_TO_PC[match[1]] === undefined) throw new Error(`Unsupported chord: ${chord}`);
  return NOTE_TO_PC[match[1]];
}

function intervalsForChord(chord) {
  const text = String(chord);
  if (/sus2/.test(text)) return [0, 2, 7];
  if (/sus4/.test(text)) return [0, 5, 7];
  if (/dim7/.test(text)) return [0, 3, 6, 9];
  if (/m7b5/.test(text)) return [0, 3, 6, 10];
  if (/dim/.test(text)) return [0, 3, 6];

  const minor = /m(?!aj)/.test(text);
  const base = minor ? [0, 3, 7] : [0, 4, 7];
  const majorSeventh = /maj(?:7|9|11|13)/.test(text);
  const hasSeventhColor = /(?:7|9|11|13)/.test(text);
  if (majorSeventh) base.push(11);
  else if (hasSeventhColor) base.push(10);
  return base;
}

function rootMidiNear(pc, target = 48) {
  let note = target;
  while (mod(note) !== pc) note += 1;
  return note;
}

function inversionCandidates(chord) {
  const pc = chordRootPc(chord);
  const intervals = intervalsForChord(chord);
  const root = rootMidiNear(pc, 48);
  const candidates = [];

  for (let inversion = 0; inversion < intervals.length; inversion += 1) {
    const rotated = intervals.slice(inversion).concat(intervals.slice(0, inversion).map(i => i + 12));
    const raw = rotated.map(interval => root + interval);
    for (const shift of [-12, 0, 12]) {
      const notes = raw.map(note => note + shift);
      if (Math.min(...notes) >= 43 && Math.max(...notes) <= 76) candidates.push(notes);
    }
  }

  return candidates.length ? candidates : [intervals.map(interval => root + interval)];
}

function voicingScore(candidate, previous) {
  const center = candidate.reduce((a, b) => a + b, 0) / candidate.length;
  const centerPenalty = Math.abs(center - 59) * 0.22;
  if (!previous?.length) return centerPenalty + Math.abs(candidate[0] - 48) * 0.08;

  let movement = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    const source = previous[Math.min(i, previous.length - 1)];
    movement += Math.abs(candidate[i] - source);
  }
  movement /= candidate.length;
  return movement + centerPenalty;
}

export function voiceLeadChords(chords) {
  const result = [];
  let previous = null;
  for (const chord of chords) {
    const candidates = inversionCandidates(chord);
    candidates.sort((a, b) => voicingScore(a, previous) - voicingScore(b, previous));
    const selected = candidates[0];
    result.push(selected);
    previous = selected;
  }
  return result;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class VibeAudioPreview {
  constructor() {
    this.context = null;
    this.activeOscillators = new Set();
    this.activeMaster = null;
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
    try {
      return new AudioCtx({ latencyHint: 'interactive' });
    } catch (_) {
      return new AudioCtx();
    }
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
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch (_) {}
      try { osc.disconnect(); } catch (_) {}
    }
    this.activeOscillators.clear();
    if (this.activeMaster) {
      try { this.activeMaster.disconnect(); } catch (_) {}
      this.activeMaster = null;
    }
  }

  async play(chords, { secondsPerChord = 0.82 } = {}) {
    const ctx = await this.ensureContext();
    this.stop();

    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4200;
    filter.Q.value = 0.35;
    master.gain.value = 0.18;
    master.connect(filter);
    filter.connect(ctx.destination);
    this.activeMaster = master;

    const voicings = voiceLeadChords(chords);
    const startBase = ctx.currentTime + 0.045;

    voicings.forEach((notes, chordIndex) => {
      const start = startBase + chordIndex * secondsPerChord;
      const end = start + secondsPerChord * 0.92;
      notes.forEach((midi, voiceIndex) => {
        const gain = ctx.createGain();
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        const freq = midiToHz(midi);

        oscA.type = 'triangle';
        oscA.frequency.value = freq;
        oscB.type = 'sine';
        oscB.frequency.value = freq * 2;

        const peak = voiceIndex === 0 ? 0.12 : 0.09;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.035);
        gain.gain.exponentialRampToValueAtTime(peak * 0.62, start + Math.min(0.22, secondsPerChord * 0.35));
        gain.gain.setValueAtTime(peak * 0.55, Math.max(start + 0.24, end - 0.14));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscA.connect(gain);
        oscB.connect(gain);
        gain.connect(master);
        oscA.start(start);
        oscB.start(start);
        oscA.stop(end + 0.025);
        oscB.stop(end + 0.025);
        this.activeOscillators.add(oscA);
        this.activeOscillators.add(oscB);
        const cleanup = osc => { osc.onended = () => this.activeOscillators.delete(osc); };
        cleanup(oscA);
        cleanup(oscB);
      });
    });

    window.setTimeout(() => {
      if (this.activeMaster === master) {
        try { master.disconnect(); } catch (_) {}
        this.activeMaster = null;
      }
    }, Math.ceil((voicings.length * secondsPerChord + 0.5) * 1000));

    return voicings;
  }
}
