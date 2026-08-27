import {
  progressionToChords,
  recommendedBpmForEnergy,
  formatCommercialFourBarPlan
} from './vibe-roulette-engine-v2.js';

function hash01(seed='') {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function stripExtension(token='') {
  return String(token).replace(/(?:maj|add|sus|dim|m)?(?:7|9|11|13).*$/i, match => match ? '' : match);
}

function hasDominantFunction(token='') {
  return /^V(?:7|9|11|13)?(?:\/.*)?$/i.test(String(token).replaceAll('♭','b').replaceAll('♯','#'));
}

function dominantTurnaroundToken(mode='major') {
  return 'V7';
}

export function chooseTurnaroundType({ mood='connection', energyTarget=0.65, seed='' } = {}) {
  const r = hash01(`${mood}|${Math.round(energyTarget*100)}|${seed}`);
  if (mood === 'nostalgia') return r < 0.68 ? 'soft-turnaround' : 'loop-home';
  if (mood === 'illusion') return r < 0.58 ? 'loop-home' : 'open-ending';
  return r < 0.52 ? 'soft-turnaround' : r < 0.84 ? 'loop-home' : 'open-ending';
}

export function buildSecondPassRoman(baseRoman=[], {
  mode='major',
  mood='connection',
  energyTarget=0.65,
  seed=''
} = {}) {
  const roman = [...baseRoman];
  if (!roman.length) return { roman: [], strategy: 'open-ending', note: 'No harmonic variation available.' };

  const strategy = chooseTurnaroundType({ mood, energyTarget, seed: `${seed}|${roman.join('-')}` });
  const dominant = dominantTurnaroundToken(mode);

  if (strategy === 'open-ending') {
    return {
      roman,
      strategy,
      note: 'Second pass keeps the same harmonic loop and varies phrasing/voicing instead of forcing a new chord.'
    };
  }

  const last = roman[roman.length - 1];
  if (hasDominantFunction(stripExtension(last))) {
    roman[roman.length - 1] = dominant;
    return {
      roman,
      strategy,
      note: strategy === 'loop-home'
        ? 'The final dominant is strengthened so bar 8 pulls clearly back to bar 1.'
        : 'A gentle dominant-color ending creates motion back into the loop without over-arranging it.'
    };
  }

  // Keep the first three bars intact and let the final bar share the original close + V7.
  // buildCommercialFourBarPlan interprets 5 events as 4 + 4 + 4 + 2 + 2 beats.
  if (roman.length === 4) {
    roman.push(dominant);
    return {
      roman,
      strategy,
      note: strategy === 'loop-home'
        ? 'Bar 8 splits into the original closing harmony and a dominant turnaround, creating a clear need to return to bar 1.'
        : 'Bar 8 gains a short dominant pickup so the second pass resolves naturally back into the loop.'
    };
  }

  // For shorter source loops, replace the last event rather than inflating the phrase.
  roman[roman.length - 1] = dominant;
  return {
    roman,
    strategy,
    note: 'The second pass keeps the source loop compact and uses a dominant-colored close to reconnect with bar 1.'
  };
}

export function buildEightBarArrangement(result, {
  key = result?.key,
  mode = result?.mode,
  mood = result?.mood,
  energyTarget = result?.intent?.energyTarget ?? 0.65
} = {}) {
  if (!result?.roman?.length) throw new Error('A roulette result is required to build an eight-bar arrangement.');

  const firstRoman = [...result.roman];
  const firstChords = progressionToChords(firstRoman, key, mode);
  const second = buildSecondPassRoman(firstRoman, {
    mode,
    mood,
    energyTarget,
    seed: result.progressionId || firstRoman.join('-')
  });
  const secondChords = progressionToChords(second.roman, key, mode);

  return {
    bars: 8,
    beatsPerBar: 4,
    totalBeats: 32,
    bpm: recommendedBpmForEnergy(energyTarget),
    firstPass: {
      label: 'A · First pass',
      roman: firstRoman,
      chords: firstChords,
      romanBars: formatCommercialFourBarPlan(firstRoman),
      chordBars: formatCommercialFourBarPlan(firstChords)
    },
    secondPass: {
      label: "A′ · Variation",
      roman: second.roman,
      chords: secondChords,
      romanBars: formatCommercialFourBarPlan(second.roman),
      chordBars: formatCommercialFourBarPlan(secondChords),
      strategy: second.strategy,
      note: second.note
    }
  };
}

export class EightBarLoopTransport {
  constructor(engine, { onStateChange = null } = {}) {
    this.engine = engine;
    this.onStateChange = onStateChange;
    this.timer = null;
    this.running = false;
    this.passIndex = 0;
    this.arrangement = null;
    this.options = null;
    this.token = 0;
  }

  emit(state, extra={}) {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({ state, running: this.running, passIndex: this.passIndex, ...extra });
    }
  }

  passDurationMs() {
    const bpm = Number(this.options?.bpm || this.arrangement?.bpm || 96);
    return 16 * (60 / bpm) * 1000;
  }

  async start(arrangement, options={}) {
    this.stop();
    this.arrangement = arrangement;
    this.options = { ...options, bpm: Number(options.bpm || arrangement.bpm || 96) };
    this.running = true;
    this.passIndex = 0;
    this.token += 1;
    this.emit('playing');
    await this.playCurrentPass(this.token);
  }

  async playCurrentPass(token) {
    if (!this.running || token !== this.token || !this.arrangement) return;
    const pass = this.passIndex === 0 ? this.arrangement.firstPass : this.arrangement.secondPass;
    await this.engine.playFourBars(pass.chords, {
      bpm: this.options.bpm,
      roman: pass.roman,
      energyTarget: this.options.energyTarget,
      mood: this.options.mood
    });
    if (!this.running || token !== this.token) return;
    this.emit('playing', { activePass: this.passIndex === 0 ? 'A' : "A′" });
    this.timer = window.setTimeout(async () => {
      if (!this.running || token !== this.token) return;
      this.passIndex = (this.passIndex + 1) % 2;
      await this.playCurrentPass(token);
    }, this.passDurationMs());
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.token += 1;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
    this.engine.stopAudio();
    this.emit('paused');
  }

  stop() {
    this.running = false;
    this.token += 1;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
    if (this.engine) this.engine.stopAudio();
    this.passIndex = 0;
    this.emit('stopped');
  }
}

export const SLOT_REEL_POOL = [
  'C','Cm','Db','D','Dm','Eb','E','Em','F','Fm','F#','G','Gm','Ab','A','Am','Bb','B','Bm',
  'Cadd9','Dm7','Em7','Fmaj7','G7','Am7','Bbadd9'
];
