import {
  VibeRouletteEngine,
  progressionToChords,
  romanToChord,
  loadVibeRouletteDataset
} from './vibe-roulette-engine.js';
import { VibeAudioPreview } from './vibe-roulette-audio.js';

function clamp01(value, fallback = 0.65) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
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
    const result = super.spin({ mood, key });
    const sourceEnergy = clamp01(result?.moodProfile?.energy, 0.5);
    const energyFit = 1 - Math.abs(sourceEnergy - this.energyTarget);
    return {
      ...result,
      intent: {
        energyTarget: this.energyTarget,
        sourceEnergy,
        energyFit
      }
    };
  }

  getAudioPreview() {
    if (!this.audioPreview) this.audioPreview = new VibeAudioPreview();
    return this.audioPreview;
  }

  stopAudio() {
    if (this.audioPreview) this.audioPreview.stop();
    else super.stopAudio();
  }

  async playChords(chords, options = {}) {
    return this.getAudioPreview().play(chords, options);
  }
}

export { progressionToChords, romanToChord, loadVibeRouletteDataset };
