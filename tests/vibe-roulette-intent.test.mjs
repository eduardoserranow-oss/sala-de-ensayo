import assert from 'node:assert/strict';
import {
  VibeRouletteIntentEngine,
  mergeVibeDatasets,
  progressionToChords,
  choosePracticalEnharmonicKey,
  practicalSpellingPenalty
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

{
  const roman = ['i','VI','III','VII'];
  const chorus = ['VI','III','VII','i'];
  const practical = choosePracticalEnharmonicKey('Eb', 'minor', roman, chorus);
  assert.equal(practical, 'D#', 'Eb-minor result with Cb should flip to the cleaner D#-minor spelling');
  assert.deepEqual(progressionToChords(roman, practical, 'minor'), ['D#m','B','F#','C#']);
  assert.ok(
    practicalSpellingPenalty(progressionToChords(roman, 'D#', 'minor')) < practicalSpellingPenalty(progressionToChords(roman, 'Eb', 'minor')),
    'practical spelling score should penalize Cb-style output'
  );
}

{
  const oneProgression = {
    version:'test-practical', songs:[],
    vocalProfiles:[{id:'serra', rangeLow:'F2', rangeHigh:'Ab4', sweetSpot:'G3'}],
    progressions:[{
      id:'despacito-family', roman:['i','VI','III','VII'], mode:'minor',
      mood:{nostalgia:1,movement:1,energy:.72}, provisional:false, evidenceConfidence:1, evidence:[],
      chorusVariation:{strategy:'same-loop',roman:['i','VI','III','VII']}
    }]
  };
  const result = new VibeRouletteIntentEngine(oneProgression, {random:()=>0, energyTarget:.72}).spin({mood:'nostalgia'});
  assert.ok(!result.chords.some(chord => /^Cb/.test(chord)), 'user-facing spin should avoid Cb when a cleaner enharmonic key exists');
}

console.log('PASS Vibe Roulette intent/energy + practical spelling tests');
