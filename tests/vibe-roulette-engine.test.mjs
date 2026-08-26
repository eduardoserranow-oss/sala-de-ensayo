import assert from 'node:assert/strict';
import { romanToChord, progressionToChords, VibeRouletteEngine } from '../assets/vibe-roulette-engine.js';

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

test('C major I-V-vi-IV', () => {
  assert.deepEqual(progressionToChords(['I','V','vi','IV'], 'C', 'major'), ['C','G','Am','F']);
});

test('D major I-V-vi-IV', () => {
  assert.deepEqual(progressionToChords(['I','V','vi','IV'], 'D', 'major'), ['D','A','Bm','G']);
});

test('Eb major I-V-vi-IV', () => {
  assert.deepEqual(progressionToChords(['I','V','vi','IV'], 'Eb', 'major'), ['Eb','Bb','Cm','Ab']);
});

test('E major uses theoretically readable sharps', () => {
  assert.deepEqual(progressionToChords(['I','V','vi','IV'], 'E', 'major'), ['E','B','C#m','A']);
});

test('F# major uses theoretically readable sharps', () => {
  assert.deepEqual(progressionToChords(['I','V','vi','IV'], 'F#', 'major'), ['F#','C#','D#m','B']);
});

test('Gb major can spell Cb diatonically', () => {
  assert.equal(romanToChord('IV', 'Gb', 'major'), 'Cb');
});

test('A minor i-VII-VI-VII', () => {
  assert.deepEqual(progressionToChords(['i','VII','VI','VII'], 'A', 'minor'), ['Am','G','F','G']);
});

test('applied dominant V/vi in C major', () => {
  assert.equal(romanToChord('V/vi', 'C', 'major'), 'E');
});

test('applied dominant V7/vi in E major preserves spelling and seventh', () => {
  assert.equal(romanToChord('V7/vi', 'E', 'major'), 'G#7');
});

test('ii7-V7-Imaj7 preserves chord extensions', () => {
  assert.deepEqual(progressionToChords(['ii7','V7','Imaj7'], 'C', 'major'), ['Dm7','G7','Cmaj7']);
});

test('dominant-color funk progression preserves sevenths', () => {
  assert.deepEqual(progressionToChords(['I7','bIII','IV','I7'], 'Eb', 'mixed'), ['Eb7','Gb','Ab','Eb7']);
});

test('ii-V-I-vi quality handling', () => {
  assert.deepEqual(progressionToChords(['ii','V','I','vi'], 'C', 'major'), ['Dm','G','C','Am']);
});

test('borrowed bVII is transposed chromatically', () => {
  assert.equal(romanToChord('bVII', 'C', 'major'), 'Bb');
});

test('borrowed iv remains minor in major context', () => {
  assert.equal(romanToChord('iv', 'C', 'mixed'), 'Fm');
});

test('all 12 canonical chromatic keys yield complete progressions', () => {
  const keys = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  for (const key of keys) {
    assert.equal(progressionToChords(['I','V','vi','IV'], key, 'major').length, 4, key);
  }
});

test('verified evidence receives more weight than provisional evidence at equal mood', () => {
  const fake = {
    vocalProfiles: [{ id:'serra', rangeLow:'F2', rangeHigh:'Ab4', sweetSpot:'G3' }],
    progressions: [
      { id:'verified', roman:['I','IV'], mode:'major', mood:{nostalgia:1,movement:1}, provisional:false, evidenceConfidence:1, evidence:[{kind:'billboard-chart',verified:true,songId:'s'}], chorusVariation:{strategy:'x',roman:['IV','I']} },
      { id:'provisional', roman:['I','IV'], mode:'major', mood:{nostalgia:1,movement:1}, provisional:true, evidenceConfidence:0, evidence:[], chorusVariation:{strategy:'x',roman:['IV','I']} }
    ]
  };
  const engine = new VibeRouletteEngine(fake, { random: () => 0.6 });
  assert.equal(engine.spin({ mood:'nostalgia', key:'C' }).progressionId, 'verified');
});

test('spin exposes evidence summary for explainability', () => {
  const fake = {
    vocalProfiles: [{ id:'serra', rangeLow:'F2', rangeHigh:'Ab4', sweetSpot:'G3' }],
    progressions: [
      { id:'verified', roman:['IV','V'], mode:'major', mood:{connection:1,movement:1}, provisional:false, evidenceConfidence:1, evidence:[
        {kind:'expert-harmonic-annotation',verified:true,songId:'song-1'},
        {kind:'billboard-chart',verified:true,songId:'song-1'}
      ], chorusVariation:{strategy:'tonic-payoff',roman:['IV','V','I']} }
    ]
  };
  const result = new VibeRouletteEngine(fake, { random: () => 0 }).spin({ mood:'connection', key:'D' });
  assert.deepEqual(result.evidenceSummary.supportedSongIds, ['song-1']);
  assert.equal(result.evidenceSummary.verifiedCount, 2);
});

test('anti-repeat can move away from previous result', () => {
  const fake = {
    vocalProfiles: [{ id:'serra', rangeLow:'F2', rangeHigh:'Ab4', sweetSpot:'G3' }],
    progressions: [
      { id:'a', roman:['I','V'], mode:'major', mood:{nostalgia:1,movement:1}, provisional:true, evidenceConfidence:0, chorusVariation:{strategy:'x',roman:['V','I']} },
      { id:'b', roman:['vi','IV'], mode:'major', mood:{nostalgia:.9,movement:1}, provisional:true, evidenceConfidence:0, chorusVariation:{strategy:'x',roman:['IV','vi']} }
    ]
  };
  const sequence = [0, .99, .99, .99];
  const engine = new VibeRouletteEngine(fake, { random: () => sequence.shift() ?? .5, maxHistory:4 });
  const first = engine.spin({ mood:'nostalgia', key:'C' }).progressionId;
  const second = engine.spin({ mood:'nostalgia', key:'C' }).progressionId;
  assert.notEqual(first, second);
});

let passed = 0;
for (const { name, fn } of cases) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
console.log(`\n${passed}/${cases.length} Vibe Roulette engine tests passed.`);
