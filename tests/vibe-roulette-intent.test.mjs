import assert from 'node:assert/strict';
import {
  VibeRouletteIntentEngine,
  mergeVibeDatasets,
  progressionToChords
} from '../assets/vibe-roulette-engine-v2.js';

const baseProgression = {
  mode: 'major',
  mood: { nostalgia: 1, movement: 0.8, energy: 0.5 },
  provisional: false,
  evidenceConfidence: 1,
  evidence: [],
  chorusVariation: { strategy: 'test', roman: ['I','IV'] }
};

const fake = {
  version: 'test',
  vocalProfiles: [{ id: 'serra', rangeLow: 'F2', rangeHigh: 'Ab4', sweetSpot: 'G3' }],
  songs: [],
  progressions: [
    { ...baseProgression, id: 'calm', roman: ['I','IV'], mood: { ...baseProgression.mood, energy: 0.2 } },
    { ...baseProgression, id: 'dance', roman: ['I','V'], mood: { ...baseProgression.mood, energy: 0.9 } }
  ]
};

{
  const calmEngine = new VibeRouletteIntentEngine(fake, { energyTarget: 0.2 });
  assert.ok(
    calmEngine.scoreProgression(fake.progressions[0], 'nostalgia') > calmEngine.scoreProgression(fake.progressions[1], 'nostalgia'),
    'calm intent should favor the calm candidate'
  );
}

{
  const danceEngine = new VibeRouletteIntentEngine(fake, { energyTarget: 0.9 });
  assert.ok(
    danceEngine.scoreProgression(fake.progressions[1], 'nostalgia') > danceEngine.scoreProgression(fake.progressions[0], 'nostalgia'),
    'danceable intent should favor the high-energy candidate'
  );
}

{
  const merged = mergeVibeDatasets([
    { version: 'a', vocalProfiles: [{ id: 'serra', sweetSpot: 'G3' }], songs: [{ id: 's1' }], progressions: [{ id: 'p1' }] },
    { version: 'b', vocalProfiles: [], songs: [{ id: 's2' }], progressions: [{ id: 'p2' }] }
  ]);
  assert.equal(merged.songs.length, 2);
  assert.equal(merged.progressions.length, 2);
  assert.equal(merged.vocalProfiles.length, 1);
}

assert.deepEqual(
  progressionToChords(['i','IV7','V7'], 'G', 'minor'),
  ['Gm','C7','D7'],
  'Santana-style modal vamp/turnaround should transpose correctly'
);

console.log('PASS Vibe Roulette intent/energy ranking tests');
