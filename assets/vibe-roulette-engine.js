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

const CANONICAL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ROMAN_DEGREE = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function mod(n, m = 12) {
  return ((n % m) + m) % m;
}

function normalizeRomanToken(token) {
  return String(token).trim().replaceAll('♭', 'b').replaceAll('♯', '#');
}

function accidentalCount(text = '') {
  return [...text].reduce((sum, ch) => sum + (ch === '#' ? 1 : ch === 'b' ? -1 : 0), 0);
}

function accidentalText(count) {
  if (count > 0) return '#'.repeat(count);
  if (count < 0) return 'b'.repeat(Math.abs(count));
  return '';
}

function parseNoteName(note) {
  const match = String(note).match(/^([A-G])([b#]*)$/);
  if (!match) throw new Error(`Unsupported note name: ${note}`);
  return {
    letter: match[1],
    accidental: accidentalCount(match[2]),
    pc: NOTE_TO_PC[note]
  };
}

function spellPitchClassForLetter(pc, letter) {
  const naturalPc = NATURAL_LETTER_PC[letter];
  let delta = mod(pc - naturalPc);
  if (delta > 6) delta -= 12;
  if (Math.abs(delta) > 2) {
    // Extremely rare theoretical spelling fallback. Keep pitch correct and readable.
    const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    return flats[mod(pc)];
  }
  return `${letter}${accidentalText(delta)}`;
}

function parseRoman(token) {
  const normalized = normalizeRomanToken(token);
  const slashIndex = normalized.indexOf('/');
  const head = slashIndex >= 0 ? normalized.slice(0, slashIndex) : normalized;
  const appliedTarget = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : null;
  const accidentalMatch = head.match(/^([b#]*)([ivIV]+)(.*)$/);
  if (!accidentalMatch) throw new Error(`Unsupported Roman token: ${token}`);
  const [, accidentalTextValue, numeral, suffix] = accidentalMatch;
  const lowerNumeral = numeral.toLowerCase();
  const degree = ROMAN_DEGREE[lowerNumeral];
  if (degree === undefined) throw new Error(`Unsupported degree: ${token}`);
  const accidental = accidentalCount(accidentalTextValue);
  const diminished = suffix.includes('°') || /dim/i.test(suffix);
  const halfDiminished = suffix.includes('ø') || /hdim/i.test(suffix);
  const major = numeral === numeral.toUpperCase();
  return {
    token: normalized,
    head,
    degree,
    accidental,
    numeral,
    suffix,
    major,
    diminished,
    halfDiminished,
    appliedTarget
  };
}

function scaleForMode(mode) {
  return mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
}

function scaleDegreeRootInfo(token, tonicPc, tonicName, mode) {
  const parsed = parseRoman(token);
  const tonic = parseNoteName(tonicName);
  const scale = scaleForMode(mode);
  const degreePc = mod(tonicPc + scale[parsed.degree] + parsed.accidental);
  const degreeLetter = LETTERS[mod(LETTERS.indexOf(tonic.letter) + parsed.degree, 7)];
  return { pc: degreePc, name: spellPitchClassForLetter(degreePc, degreeLetter), parsed };
}

function romanRootInfo(token, tonicPc, tonicName, mode) {
  const parsed = parseRoman(token);
  if (parsed.appliedTarget) {
    const targetInfo = scaleDegreeRootInfo(parsed.appliedTarget, tonicPc, tonicName, mode);
    const targetLetter = parseNoteName(targetInfo.name).letter;
    const dominantLetter = LETTERS[mod(LETTERS.indexOf(targetLetter) + 4, 7)];
    const dominantPc = mod(targetInfo.pc + 7);
    return { pc: dominantPc, name: spellPitchClassForLetter(dominantPc, dominantLetter), parsed };
  }
  return scaleDegreeRootInfo(token, tonicPc, tonicName, mode);
}

function romanQuality(token) {
  const parsed = parseRoman(token);
  if (parsed.appliedTarget) return 'major';
  if (parsed.halfDiminished) return 'half-diminished';
  if (parsed.diminished) return 'diminished';
  return parsed.major ? 'major' : 'minor';
}

function romanExtension(token) {
  const parsed = parseRoman(token);
  const suffix = parsed.suffix.toLowerCase();
  if (suffix.includes('maj13')) return 'maj13';
  if (suffix.includes('maj11')) return 'maj11';
  if (suffix.includes('maj9')) return 'maj9';
  if (suffix.includes('maj7')) return 'maj7';
  if (suffix.includes('sus2')) return 'sus2';
  if (suffix.includes('sus4')) return 'sus4';
  if (suffix.includes('add13')) return 'add13';
  if (suffix.includes('add11')) return 'add11';
  if (suffix.includes('add9')) return 'add9';
  if (suffix.includes('13')) return '13';
  if (suffix.includes('11')) return '11';
  if (suffix.includes('9')) return '9';
  if (suffix.includes('7')) return '7';
  return '';
}

export function romanToChord(token, key, mode = 'major') {
  const normalizedKey = String(key).replaceAll('♭', 'b').replaceAll('♯', '#');
  const tonicPc = NOTE_TO_PC[normalizedKey];
  if (tonicPc === undefined) throw new Error(`Unsupported key: ${key}`);
  const root = romanRootInfo(token, tonicPc, normalizedKey, mode);
  const quality = romanQuality(token);
  const extension = romanExtension(token);

  let qualitySuffix = '';
  if (quality === 'minor') qualitySuffix = 'm';
  if (quality === 'diminished') qualitySuffix = 'dim';
  if (quality === 'half-diminished') qualitySuffix = 'm7b5';

  if (quality === 'half-diminished') return `${root.name}${qualitySuffix}`;
  if (quality === 'diminished' && extension === '7') return `${root.name}dim7`;
  return `${root.name}${qualitySuffix}${extension}`;
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

function chordIntervals(chordName) {
  if (/sus2/.test(chordName)) return [0, 2, 7];
  if (/sus4/.test(chordName)) return [0, 5, 7];
  if (/dim7/.test(chordName)) return [0, 3, 6, 9];
  if (/m7b5/.test(chordName)) return [0, 3, 6, 10];
  const minor = /m(?!aj)/.test(chordName);
  const majorSeventh = /maj7|maj9|maj11|maj13/.test(chordName);
  const dominantSeventh = !majorSeventh && /(?:7|9|11|13)/.test(chordName);
  const intervals = minor ? [0, 3, 7] : [0, 4, 7];
  if (majorSeventh) intervals.push(11);
  else if (dominantSeventh || (minor && /7|9|11|13/.test(chordName))) intervals.push(10);
  return intervals;
}

function noteNameToPc(chordName) {
  const root = chordName.match(/^[A-G](?:bb|##|b|#)?/);
  if (!root) throw new Error(`Unsupported chord name: ${chordName}`);
  const direct = NOTE_TO_PC[root[0]];
  if (direct !== undefined) return direct;
  const parsed = parseNoteName(root[0]);
  return mod(NATURAL_LETTER_PC[parsed.letter] + parsed.accidental);
}

function semitoneDistance(a, b) {
  const clockwise = mod(a - b);
  return Math.min(clockwise, 12 - clockwise);
}

function keyCenterEstimate(key, mode) {
  const tonicPc = NOTE_TO_PC[key];
  // A pre-melody estimate only: thirds often sit near a stable melodic center,
  // but this must never be represented as a guarantee of vocal comfort.
  return mod(tonicPc + (mode === 'minor' ? 3 : 4));
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
    const evidence = item.provisional
      ? 0.25
      : 0.45 + 0.55 * (Number(item.evidenceConfidence) || 0);
    const repeated = this.history.includes(item.id);
    const antiRepeat = repeated ? 0.12 : 1;
    const movement = 0.7 + 0.3 * (Number(item.mood?.movement) || 0.5);
    return moodScore * evidence * antiRepeat * movement;
  }

  suggestedKeys(mode = 'major') {
    // Low-confidence pre-melody heuristic only. G3 is a user-supplied sweet spot,
    // not a claim that a particular key universally fits the voice.
    const sweetSpotPc = NOTE_TO_PC.G;
    return CANONICAL_KEYS.map(key => {
      const estimatedCenterPc = keyCenterEstimate(key, mode);
      return {
        key,
        distance: semitoneDistance(estimatedCenterPc, sweetSpotPc),
        confidence: 'low-pre-melody'
      };
    }).sort((a, b) => a.distance - b.distance).slice(0, 5);
  }

  evidenceSummary(item) {
    const evidence = Array.isArray(item.evidence) ? item.evidence : [];
    const verified = evidence.filter(entry => entry.verified);
    const songIds = [...new Set(verified.map(entry => entry.songId).filter(Boolean))];
    const kinds = [...new Set(verified.map(entry => entry.kind).filter(Boolean))];
    return {
      verifiedCount: verified.length,
      supportedSongIds: songIds,
      kinds,
      confidence: Number(item.evidenceConfidence) || 0,
      provisional: Boolean(item.provisional)
    };
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
      moodDerivation: selected.moodDerivation || null,
      styleAffinity: selected.styleAffinity || [],
      serraFitNote: selected.serraFitNote || null,
      provisional: Boolean(selected.provisional),
      evidenceClass: selected.evidenceClass || (selected.provisional ? 'PROVISIONAL' : 'HISTORICAL_VERIFIED'),
      practitionerSource: selected.practitionerSource || null,
      tonalInterpretation: selected.tonalInterpretation || null,
      relativeMinorRoman: selected.relativeMinorRoman || null,
      evidenceConfidence: Number(selected.evidenceConfidence) || 0,
      evidenceSummary: this.evidenceSummary(selected),
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
      const intervals = chordIntervals(chordName);
      const rootMidi = midiFromPcNear(pc, 48);
      const start = now + chordIndex * secondsPerChord;
      const end = start + secondsPerChord * 0.9;

      intervals.forEach((interval, voiceIndex) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const octaveLift = voiceIndex >= 2 ? 12 : 0;
        const midi = rootMidi + interval + octaveLift;
        osc.type = voiceIndex === 0 ? 'triangle' : 'sine';
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.025);
        gain.gain.setValueAtTime(0.16, Math.max(start + 0.03, end - 0.12));
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
