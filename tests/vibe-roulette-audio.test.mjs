import assert from 'node:assert/strict';
import {
  voiceLeadChords,
  recommendedBpmForEnergy,
  describeBodyEnergy,
  buildFourBarPlan
} from '../assets/vibe-roulette-audio.js';

const chords = ['C', 'G', 'Am', 'F'];
const voicings = voiceLeadChords(chords);
assert.equal(voicings.length, chords.length);

for (const voicing of voicings) {
  assert.ok(voicing.length >= 3, 'preview voicing should contain at least a triad');
  assert.ok(Math.min(...voicing) >= 43, 'voicing should stay out of muddy sub-bass range');
  assert.ok(Math.max(...voicing) <= 76, 'voicing should stay in compact preview range');
  for (let i = 1; i < voicing.length; i += 1) {
    assert.ok(voicing[i] > voicing[i - 1], 'voices must remain ascending');
  }
}

const movement = [];
for (let i = 1; i < voicings.length; i += 1) {
  const a = voicings[i - 1];
  const b = voicings[i];
  const count = Math.min(a.length, b.length);
  const average = Array.from({ length: count }, (_, n) => Math.abs(a[n] - b[n])).reduce((x, y) => x + y, 0) / count;
  movement.push(average);
}
assert.ok(Math.max(...movement) <= 7, `voice-leading movement too large: ${movement.join(', ')}`);

const colored = voiceLeadChords(['Gm', 'C7', 'D7']);
assert.equal(colored.length, 3);
assert.equal(colored[1].length, 4, 'dominant seventh should retain its seventh color in preview');

const calm = describeBodyEnergy(0.3);
const flowing = describeBodyEnergy(0.55);
const danceable = describeBodyEnergy(0.8);
assert.equal(calm.label, 'Calm');
assert.equal(flowing.label, 'Flowing');
assert.equal(danceable.label, 'Danceable');
assert.ok(calm.bpm < flowing.bpm && flowing.bpm < danceable.bpm, 'body energy BPM must rise monotonically across bands');
assert.equal(recommendedBpmForEnergy(0.72), 106, '72% body energy should enter the danceable playback band');

const fourChordPlan = buildFourBarPlan(['Am', 'F', 'C', 'G']);
assert.equal(fourChordPlan.length, 4);
assert.deepEqual(fourChordPlan.map(item => item.beats), [4, 4, 4, 4], 'four chords should play one chord per 4/4 bar');
assert.equal(fourChordPlan.reduce((sum, item) => sum + item.beats, 0), 16, 'four-bar plan must total 16 quarter-note beats');

const twoChordPlan = buildFourBarPlan(['Am', 'F']);
assert.deepEqual(twoChordPlan.map(item => item.beats), [8, 8], 'two chords should each occupy two bars');

const eightChordPlan = buildFourBarPlan(['C', 'G', 'Am', 'F', 'Dm', 'Em', 'F', 'G']);
assert.ok(eightChordPlan.every(item => item.beats === 2), 'eight chords should fit as two chords per bar across four bars');
assert.throws(() => buildFourBarPlan([]), /at least one chord/);

console.log('PASS Vibe Roulette voice-led, BPM and four-bar audio tests');