import assert from 'node:assert/strict';
import {
  AFROBEATS_PRACTITIONER_PATTERNS,
  romanDegrees,
  matchesAfrobeatsPractitionerPattern,
  commercialProgressionWeight,
  afroTropicalStyleWeight,
  buildCommercialFourBarPlan,
  formatCommercialFourBarPlan
} from '../assets/vibe-roulette-groove.js';
import {
  buildCommercialAfroRhodesPlan,
  practicalizeChordForPlayback
} from '../assets/vibe-roulette-rhodes-v3.js';

assert.ok(AFROBEATS_PRACTITIONER_PATTERNS.length >= 16);
assert.deepEqual(romanDegrees(['IV','V','vi','V']), [4,5,6,5]);
assert.equal(matchesAfrobeatsPractitionerPattern(['IV','V','vi','V']), true);
assert.equal(matchesAfrobeatsPractitionerPattern(['vi','iii','IV','V']), true);
assert.equal(matchesAfrobeatsPractitionerPattern(['ii','iii','vi']), true);
assert.equal(matchesAfrobeatsPractitionerPattern(['I','V','vi','IV']), false);
assert.ok(commercialProgressionWeight(['I','V','vi','IV']) > commercialProgressionWeight(['i','iv','bVI','bVII','I']));
assert.ok(afroTropicalStyleWeight(['afropop']) > 1);
assert.ok(afroTropicalStyleWeight(['latin-pop']) > 1);

const four = buildCommercialFourBarPlan(['Am','F','C','G']);
assert.deepEqual(four.map(item => item.beats), [4,4,4,4]);
assert.deepEqual(four.map(item => item.startBeat), [0,4,8,12]);

const five = buildCommercialFourBarPlan(['Am','F','C','G','Em']);
assert.deepEqual(five.map(item => item.beats), [4,4,4,2,2], 'a fifth chord must share bar 4 instead of creating/equally dividing a fifth harmonic block');
assert.deepEqual(five.map(item => item.startBeat), [0,4,8,12,14]);
assert.equal(five.reduce((sum,item) => sum + item.beats, 0), 16);
assert.deepEqual(formatCommercialFourBarPlan(['Am','F','C','G','Em']), ['Am','F','C','G → Em']);

const six = buildCommercialFourBarPlan(['C','G','Am','F','Dm','G']);
assert.deepEqual(six.map(item => item.beats), [4,4,2,2,2,2]);
assert.equal(six.reduce((sum,item) => sum + item.beats, 0), 16);

const eight = buildCommercialFourBarPlan(['C','G','Am','F','Dm','Em','F','G']);
assert.ok(eight.every(item => item.beats === 2));
assert.equal(eight.reduce((sum,item) => sum + item.beats, 0), 16);

assert.equal(practicalizeChordForPlayback('Cb'), 'B');
assert.equal(practicalizeChordForPlayback('E#'), 'F');

const plan = buildCommercialAfroRhodesPlan(['Bb','C','Dm','C'], {
  roman:['IV','V','vi','V'],
  bpm:97,
  energyTarget:0.72,
  mood:'connection'
});
assert.equal(plan.totalBeats, 16);
assert.equal(plan.profile, 'commercial-afro-v1');
assert.match(plan.style, /Afro-Tropical/);
assert.equal(plan.plan.length, 4);
assert.ok(plan.events.length > 10);
assert.ok(plan.voicings.every(voicing => voicing.right.length <= 3), 'right hand should stay commercially open instead of dense jazz stacks');
assert.ok(plan.voicings.every(voicing => !/maj9|m9/.test(voicing.playedChord)), 'automatic maj9/m9 treatment must not be the default language');

const fiveChordPerformance = buildCommercialAfroRhodesPlan(['C','G','Am','F','Em'], {
  roman:['I','V','vi','IV','iii'],
  bpm:100,
  energyTarget:0.66,
  mood:'nostalgia'
});
assert.deepEqual(fiveChordPerformance.plan.map(item => item.beats), [4,4,4,2,2]);
assert.ok(Math.max(...fiveChordPerformance.events.map(event => event.startBeat)) < 16);

console.log('PASS Vibe Roulette afro-commercial harmony, four-bar timing and Rhodes policy');
