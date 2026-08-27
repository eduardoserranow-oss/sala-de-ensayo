import {
  VibeRouletteEngine,
  progressionToChords,
  romanToChord,
  loadVibeRouletteDataset
} from './vibe-roulette-engine.js';
import {
  recommendedBpmForEnergy,
  describeBodyEnergy
} from './vibe-roulette-audio.js';
import {
  CommercialAfroRhodesPreview,
  buildCommercialAfroRhodesPlan,
  rotaryProfileForEnergy,
  RHODES_LIBRARY_INFO
} from './vibe-roulette-rhodes-v3.js';
import {
  matchesAfrobeatsPractitionerPattern,
  commercialProgressionWeight,
  afroTropicalStyleWeight,
  formatCommercialFourBarPlan
} from './vibe-roulette-groove.js';

const KEY_TO_PC = {
  C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,
  'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11
};
const KEY_ALIASES = {
  0:['C'], 1:['C#','Db'], 2:['D'], 3:['D#','Eb'], 4:['E'], 5:['F'],
  6:['F#','Gb'], 7:['G'], 8:['G#','Ab'], 9:['A'], 10:['Bb','A#'], 11:['B']
};
const MINOR_KEY_PREFERENCE = ['A','E','B','F#','C#','G#','D#','D','G','C','F','Bb','Eb','Ab','Db','Gb'];
const MAJOR_KEY_PREFERENCE = ['C','G','D','A','E','F','Bb','Eb','Ab','Db','F#','B','Gb','C#'];

function clamp01(value, fallback = 0.65) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

function sameChordSequence(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function mergeUniqueById(items = []) {
  const map = new Map();
  for (const item of items) {
    if (!item?.id) continue;
    map.set(item.id, item);
  }
  return [...map.values()];
}

function rootOfChord(chord) {
  return String(chord).match(/^[A-G](?:bb|##|b|#)?/)?.[0] || '';
}

export function practicalSpellingPenalty(chords = []) {
  let score = 0;
  for (const chord of chords) {
    const root = rootOfChord(chord);
    if (!root) { score += 20; continue; }
    if (/bb|##/.test(root)) score += 12;
    if (/^(Cb|Fb|B#|E#)$/.test(root)) score += 6;
    if (/[#b]/.test(root)) score += 0.08;
  }
  return score;
}

function preferencePenalty(key, mode) {
  const list = mode === 'minor' ? MINOR_KEY_PREFERENCE : MAJOR_KEY_PREFERENCE;
  const index = list.indexOf(key);
  return index < 0 ? 2 : index * 0.018;
}

export function choosePracticalEnharmonicKey(baseKey, mode, roman = [], chorusRoman = []) {
  const pc = KEY_TO_PC[String(baseKey).replaceAll('♭','b').replaceAll('♯','#')];
  if (pc === undefined) return baseKey;
  const aliases = KEY_ALIASES[pc] || [baseKey];
  const ranked = aliases.map(key => {
    try {
      const allChords = [
        ...progressionToChords(roman, key, mode),
        ...progressionToChords(chorusRoman, key, mode)
      ];
      return { key, score: practicalSpellingPenalty(allChords) + preferencePenalty(key, mode) };
    } catch (_) {
      return { key, score: 999 };
    }
  }).sort((a,b) => a.score - b.score);
  return ranked[0]?.key || baseKey;
}

function practicalizeKeyCandidates(baseCandidates = [], mode, roman, chorusRoman) {
  const out = [];
  const seen = new Set();
  for (const candidate of baseCandidates) {
    const key = choosePracticalEnharmonicKey(candidate.key, mode, roman, chorusRoman);
    const pc = KEY_TO_PC[key];
    if (seen.has(pc)) continue;
    seen.add(pc);
    out.push({ ...candidate, key, sourceSpelling: candidate.key });
  }
  return out;
}

export function mergeVibeDatasets(datasets) {
  const valid = datasets.filter(Boolean);
  if (!valid.length) throw new Error('No Vibe Roulette datasets supplied.');
  return {
    version: valid.map(d => d.version).filter(Boolean).join('+'),
    notice: valid.map(d => d.notice).filter(Boolean).join(' | '),
    corpusPolicy: valid[0].corpusPolicy || null,
    sources: mergeUniqueById(valid.flatMap(d => d.sources || [])),
    vocalProfiles: mergeUniqueById(valid.flatMap(d => d.vocalProfiles || [])),
    songs: mergeUniqueById(valid.flatMap(d => d.songs || [])),
    progressions: mergeUniqueById(valid.flatMap(d => d.progressions || []))
  };
}

export async function loadVibeRouletteDatasets(urls) {
  const loaded = await Promise.all(urls.map(url => loadVibeRouletteDataset(url)));
  return mergeVibeDatasets(loaded);
}

export class VibeRouletteIntentEngine extends VibeRouletteEngine {
  constructor(dataset, options = {}) {
    super(dataset, options);
    this.energyTarget = clamp01(options.energyTarget, 0.68);
    this.audioPreview = null;
    this.lastResult = null;
  }

  scoreProgression(item, mood) {
    const base = super.scoreProgression(item, mood);
    const energy = clamp01(item?.mood?.energy, 0.5);
    const proximity = 1 - Math.abs(energy - this.energyTarget);
    const energyFit = 0.35 + 0.65 * proximity;
    const chordCountFit = commercialProgressionWeight(item?.roman || []);
    const styleFit = afroTropicalStyleWeight(item?.styleAffinity || []);
    const practitionerFit = matchesAfrobeatsPractitionerPattern(item?.roman || []) ? 1.18 : 1;
    return base * energyFit * chordCountFit * styleFit * practitionerFit;
  }

  spin({ mood = 'nostalgia', key = null, energyTarget = this.energyTarget } = {}) {
    this.energyTarget = clamp01(energyTarget, this.energyTarget);
    const baseResult = super.spin({ mood });
    const sourceEnergy = clamp01(baseResult?.moodProfile?.energy, 0.5);
    const energyFit = 1 - Math.abs(sourceEnergy - this.energyTarget);
    const practicalCandidates = practicalizeKeyCandidates(
      baseResult.keyCandidates,
      baseResult.mode,
      baseResult.roman,
      baseResult.chorusVariation?.roman || []
    );
    const requestedBase = key || practicalCandidates[0]?.key || baseResult.key;
    const selectedKey = choosePracticalEnharmonicKey(
      requestedBase,
      baseResult.mode,
      baseResult.roman,
      baseResult.chorusVariation?.roman || []
    );
    const chords = progressionToChords(baseResult.roman, selectedKey, baseResult.mode);
    const chorusChords = progressionToChords(baseResult.chorusVariation.roman, selectedKey, baseResult.mode);

    const result = {
      ...baseResult,
      key: selectedKey,
      keyCandidates: practicalCandidates,
      chords,
      chorusVariation: { ...baseResult.chorusVariation, chords: chorusChords },
      practicalSpelling: {
        enabled: true,
        changedFromBase: selectedKey !== baseResult.key,
        sourceKey: baseResult.key
      },
      intent: {
        energyTarget: this.energyTarget,
        sourceEnergy,
        energyFit,
        recommendedBpm: recommendedBpmForEnergy(this.energyTarget),
        commercialChordCount: baseResult.roman.length,
        afrobeatsPatternMatch: matchesAfrobeatsPractitionerPattern(baseResult.roman)
      }
    };
    this.lastResult = result;

    const bpm = recommendedBpmForEnergy(this.energyTarget);
    this.prepareFourBars(result.chords, {
      bpm,
      roman: result.roman,
      energyTarget: this.energyTarget,
      mood: result.mood
    }).catch(() => {});
    if (result.chorusVariation?.chords?.length) {
      this.prepareFourBars(result.chorusVariation.chords, {
        bpm,
        roman: result.chorusVariation.roman,
        energyTarget: this.energyTarget,
        mood: result.mood
      }).catch(() => {});
    }
    return result;
  }

  getAudioPreview() {
    if (!this.audioPreview) this.audioPreview = new CommercialAfroRhodesPreview();
    return this.audioPreview;
  }

  stopAudio() {
    if (this.audioPreview) this.audioPreview.stop();
    else super.stopAudio();
  }

  resolveRomanForChords(chords, explicitRoman) {
    if (Array.isArray(explicitRoman) && explicitRoman.length) return explicitRoman;
    if (sameChordSequence(chords, this.lastResult?.chords)) return this.lastResult.roman || [];
    if (sameChordSequence(chords, this.lastResult?.chorusVariation?.chords)) return this.lastResult.chorusVariation?.roman || [];
    return [];
  }

  resolveMood(options = {}) {
    return options.mood || this.lastResult?.mood || 'connection';
  }

  getPlaybackGuide(energyTarget = this.energyTarget) {
    const energyGuide = describeBodyEnergy(energyTarget);
    const rotary = rotaryProfileForEnergy(energyTarget);
    return {
      ...energyGuide,
      bars: 4,
      beatsPerBar: 4,
      instrument: RHODES_LIBRARY_INFO.name,
      performanceStyle: 'Afro-Tropical · Indie · Lo-Fi · Soulful · Commercial',
      rotary: rotary.label
    };
  }

  getHumanPerformancePlan(chords, options = {}) {
    const energyTarget = options.energyTarget ?? this.energyTarget;
    const bpm = Number(options.bpm) || recommendedBpmForEnergy(energyTarget);
    return buildCommercialAfroRhodesPlan(chords, {
      bars: 4,
      beatsPerBar: 4,
      energyTarget,
      ...options,
      mood: this.resolveMood(options),
      roman: this.resolveRomanForChords(chords, options.roman),
      bpm
    });
  }

  async prepareFourBars(chords, options = {}) {
    const energyTarget = options.energyTarget ?? this.energyTarget;
    const bpm = Number(options.bpm) || recommendedBpmForEnergy(energyTarget);
    return this.getAudioPreview().prepareFourBars(chords, {
      bars: 4,
      beatsPerBar: 4,
      energyTarget,
      ...options,
      mood: this.resolveMood(options),
      roman: this.resolveRomanForChords(chords, options.roman),
      bpm
    });
  }

  async playChords(chords, options = {}) {
    return this.playFourBars(chords, options);
  }

  async playFourBars(chords, options = {}) {
    const energyTarget = options.energyTarget ?? this.energyTarget;
    const bpm = Number(options.bpm) || recommendedBpmForEnergy(energyTarget);
    return this.getAudioPreview().playFourBars(chords, {
      bars: 4,
      beatsPerBar: 4,
      energyTarget,
      ...options,
      mood: this.resolveMood(options),
      roman: this.resolveRomanForChords(chords, options.roman),
      bpm
    });
  }
}

export {
  progressionToChords,
  romanToChord,
  loadVibeRouletteDataset,
  recommendedBpmForEnergy,
  describeBodyEnergy,
  buildCommercialAfroRhodesPlan,
  rotaryProfileForEnergy,
  RHODES_LIBRARY_INFO,
  formatCommercialFourBarPlan
};
