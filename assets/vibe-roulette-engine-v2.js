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
  HumanRhodesPreview,
  buildHumanRhodesPlan,
  rotaryProfileForEnergy,
  RHODES_LIBRARY_INFO
} from './vibe-roulette-rhodes.js';

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
    return base * energyFit;
  }

  spin({ mood = 'nostalgia', key = null, energyTarget = this.energyTarget } = {}) {
    this.energyTarget = clamp01(energyTarget, this.energyTarget);
    const baseResult = super.spin({ mood, key });
    const sourceEnergy = clamp01(baseResult?.moodProfile?.energy, 0.5);
    const energyFit = 1 - Math.abs(sourceEnergy - this.energyTarget);
    const result = {
      ...baseResult,
      intent: {
        energyTarget: this.energyTarget,
        sourceEnergy,
        energyFit,
        recommendedBpm: recommendedBpmForEnergy(this.energyTarget)
      }
    };
    this.lastResult = result;

    const bpm = recommendedBpmForEnergy(this.energyTarget);
    this.prepareFourBars(result.chords, { bpm, roman: result.roman, energyTarget: this.energyTarget }).catch(() => {});
    if (result.chorusVariation?.chords?.length) {
      this.prepareFourBars(result.chorusVariation.chords, {
        bpm,
        roman: result.chorusVariation.roman,
        energyTarget: this.energyTarget
      }).catch(() => {});
    }
    return result;
  }

  getAudioPreview() {
    if (!this.audioPreview) this.audioPreview = new HumanRhodesPreview();
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

  getPlaybackGuide(energyTarget = this.energyTarget) {
    const energyGuide = describeBodyEnergy(energyTarget);
    const rotary = rotaryProfileForEnergy(energyTarget);
    return {
      ...energyGuide,
      bars: 4,
      beatsPerBar: 4,
      instrument: RHODES_LIBRARY_INFO.name,
      performanceStyle: 'Indie · Lo-Fi · Jazzy',
      rotary: rotary.label
    };
  }

  getHumanPerformancePlan(chords, options = {}) {
    const energyTarget = options.energyTarget ?? this.energyTarget;
    const bpm = Number(options.bpm) || recommendedBpmForEnergy(energyTarget);
    return buildHumanRhodesPlan(chords, {
      bars: 4,
      beatsPerBar: 4,
      energyTarget,
      ...options,
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
  buildHumanRhodesPlan,
  rotaryProfileForEnergy,
  RHODES_LIBRARY_INFO
};
