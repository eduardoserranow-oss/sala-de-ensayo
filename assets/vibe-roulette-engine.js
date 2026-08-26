const NOTE_TO_PC = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  'E#': 5, F: 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11
};

const PC_TO_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ROMAN_DEGREE = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

function mod(n, m = 12) {
  return ((n % m) + m) % m;
}

function normalizeRomanCore(token) {
  return token.replace(/[°ø+0-9]/g, '').replace(/maj|min|sus|add/gi, '');
}

function parseRoman(token) {
  const [head, appliedTarget] = token.split('/');
  const accidentalMatch = head.match(/^([b#]*)([ivIV]+)(.*)$/);
  if (!accidentalMatch) throw new Error(`Unsupported Roman token: ${token}`);
  const [, accidentalText, numeral, suffix] = accidentalMatch;
  const lowerNumeral = numeral.toLowerCase();
  const degree = ROMAN_DEGREE[lowerNumeral];
  if (degree === undefined) throw new Error(`Unsupported degree: ${token}`);
  const accidental = [...accidentalText].reduce((sum, ch) => sum + (ch === '#' ? 1 : -1), 0);
  const diminished = suffix.includes('°') || suffix.includes('dim');
  const halfDiminished = suffix.includes('ø');
  const major = numeral === numeral.toUpperCase();
  return { token, degree, accidental, major, diminished, halfDiminished, appliedTarget };
}

function scaleForMode(mode) {
  return mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
}

function romanRootPc(token, tonicPc, mode) {
  const parsed = parseRoman(token);
  if (parsed.appliedTarget) {
    const target = parseRoman(parsed.appliedTarget);
    const targetPc = mod(tonicPc + scaleForMode(mode)[target.degree] + target.accidental);
    return mod(targetPc + 7); // applied dominant root
  }
  return mod(tonicPc + scaleForMode(mode)[parsed.degree] + parsed.accidental);
}

function romanQuality(token) {
  const parsed = parseRoman(token);
  if (parsed.appliedTarget) return 'major';
  if (parsed.diminished || parsed.halfDiminished) return 'diminished';
  return parsed.major ? 'major' : 'minor';
}

export function romanToChord(token, key, mode = 'major') {
  const tonicPc = NOTE_TO_PC[key];
  if (tonicPc === undefined) throw new Error(`Unsupported key: ${key}`);
  const rootPc = romanRootPc(token, tonicPc, mode);
  const quality = romanQuality(token);
  const suffix = quality === 'minor' ? 'm' : quality === 'diminished' ? 'dim' : '';
  return `${PC_TO_FLAT[rootPc]}${suffix}`;
}

export function progressionToChords(roman, key, mode = 'major') {
  return roman.map(token => romanToChord(token, key, mode));
}

function weightedPick(items, weightFn, random = Math.random) {
  const weights = items.map(item => Math.max(0, Number(weightFn(item)) || 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return items[Math.floor(random() * items.length)];
  let cursor = random() * total;
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return items[i];
  }
  return items[items.length - 1];
}

function midiFromPcNear(pc, floorMidi = 48) {
  let midi = floorMidi;
  while (mod(midi) !== pc) midi += 1;
  return midi;
}

function chordIntervals(quality) {
  if (quality === 'minor') return [0, 3, 7];
  if (quality === 'diminished') return [0, 3, 6];
  return [0, 4, 7];
}

function noteNameToPc(chordName) {
  const root = chordName.match(/^[A-G](?:b|#)?/);
  if (!root) throw new Error(`Unsupported chord name: ${chordName}`);
  return NOTE_TO_PC[root[0]];
}

function chordNameQuality(chordName) {
  if (/dim/.test(chordName)) return 'diminished';
  if (/m(?!aj)/.test(chordName)) return 'minor';
  return 'major';
}

export class VibeRouletteEngine {
  constructor(dataset, options = {}) {
    this.dataset = dataset;
    this.vocalProfileId = options.vocalProfileId || 'serra';
    this.random = options.random || Math.random;
    this.history = [];
    this.maxHistory = options.maxHistory || 4;
    this.audioContext = null;
    this.activeNodes = new Set();
  }

  get vocalProfile() {
    return this.dataset.vocalProfiles.find(v => v.id === this.vocalProfileId) || null;
  }

  candidatesForMood(mood) {
    const normalized = mood.toLowerCase();
    return this.dataset.progressions.filter(p => Number(p.mood?.[normalized]) > 0);
  }

  scoreProgression(item, mood) {
    const moodScore = Number(item.mood?.[mood]) || 0;
    const evidence = item.provisional ? 0.35 : 0.7 + 0.3 * (Number(item.evidenceConfidence) || 0);
    const repeated = this.history.includes(item.id);
    const antiRepeat = repeated ? 0.12 : 1;
    const movement = 0.7 + 0.3 * (Number(item.mood?.movement) || 0.5);
    return moodScore * evidence * antiRepeat * movement;
  }

  suggestedKeys(mode = 'major') {
    // Low-confidence pre-melody heuristic only. The supplied G3 sweet spot is used
    // as an expected melodic-center anchor, not as proof that one key is "best".
    const sweetSpotPc = NOTE_TO_PC.G;
    const thirdOffset = mode === 'minor' ? 3 : 4;
    const ranked = PC_TO_FLAT.map(key => {
      const tonicPc = NOTE_TO_PC[key];
      const estimatedCenterPc = mod(tonicPc + thirdOffset);
      const clockwise = mod(estimatedCenterPc - sweetSpotPc);
      const distance = Math.min(clockwise, 12 - clockwise);
      return { key, distance, confidence: 'low-pre-melody' };
    }).sort((a, b) => a.distance - b.distance);
    return ranked.slice(0, 5);
  }

  spin({ mood = 'nostalgia', key = null } = {}) {
    const normalizedMood = mood.toLowerCase();
    const candidates = this.candidatesForMood(normalizedMood);
    if (!candidates.length) throw new Error(`No candidates for mood: ${mood}`);

    const selected = weightedPick(candidates, item => this.scoreProgression(item, normalizedMood), this.random);
    this.history.unshift(selected.id);
    this.history = [...new Set(this.history)].slice(0, this.maxHistory);

    const keyCandidates = this.suggestedKeys(selected.mode);
    const selectedKey = key || keyCandidates[0].key;
    const chords = progressionToChords(selected.roman, selectedKey, selected.mode);
    const chorusChords = progressionToChords(selected.chorusVariation.roman, selectedKey, selected.mode);

    return {
      id: `${Date.now()}-${selected.id}`,
      mood: normalizedMood,
      progressionId: selected.id,
      roman: selected.roman,
      chords,
      mode: selected.mode,
      key: selectedKey,
      keyCandidates,
      vocalProfile: this.vocalProfile,
      vocalFit: {
        confidence: 'low-pre-melody',
        note: 'Key fit is heuristic until a melody/tessitura exists; range and sweet spot are constraints, not a guarantee.'
      },
      moodProfile: selected.mood,
      styleAffinity: selected.styleAffinity || [],
      provisional: Boolean(selected.provisional),
      evidenceConfidence: Number(selected.evidenceConfidence) || 0,
      chorusVariation: {
        ...selected.chorusVariation,
        chords: chorusChords
      }
    };
  }

  stopAudio() {
    for (const node of this.activeNodes) {
      try { node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
    this.activeNodes.clear();
  }

  async ensureAudio() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API is not supported in this browser.');
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    return this.audioContext;
  }

  async playChords(chords, { secondsPerChord = 0.72 } = {}) {
    const ctx = await this.ensureAudio();
    this.stopAudio();
    const master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);

    const now = ctx.currentTime + 0.04;
    chords.forEach((chordName, chordIndex) => {
      const pc = noteNameToPc(chordName);
      const quality = chordNameQuality(chordName);
      const rootMidi = midiFromPcNear(pc, 48);
      const start = now + chordIndex * secondsPerChord;
      const end = start + secondsPerChord * 0.9;

      chordIntervals(quality).forEach((interval, voiceIndex) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const midi = rootMidi + interval + (voiceIndex === 2 ? 12 : 0);
        osc.type = voiceIndex === 0 ? 'triangle' : 'sine';
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
        gain.gain.setValueAtTime(0.18, Math.max(start + 0.03, end - 0.12));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(end + 0.02);
        this.activeNodes.add(osc);
        osc.onended = () => this.activeNodes.delete(osc);
      });
    });

    window.setTimeout(() => {
      try { master.disconnect(); } catch (_) {}
    }, Math.ceil((chords.length * secondsPerChord + 0.3) * 1000));
  }
}

export async function loadVibeRouletteDataset(url = 'data/vibe-roulette/seed-v0.json') {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load Vibe Roulette dataset (${response.status}).`);
  return response.json();
}
