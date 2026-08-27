import assert from 'node:assert/strict';
import {
  voiceLeadChords,
  recommendedBpmForEnergy,
  describeBodyEnergy,
  buildFourBarPlan
} from '../assets/vibe-roulette-audio.js';
import {
  buildHumanRhodesPlan,
  midiToRhodesSampleName,
  velocityLayerForMidiVelocity,
  rotaryProfileForEnergy,
  RHODES_LIBRARY_INFO
} from '../assets/vibe-roulette-rhodes.js';

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

assert.equal(RHODES_LIBRARY_INFO.range, 'B1–D6');
assert.equal(RHODES_LIBRARY_INFO.velocityLayers, 8);
assert.equal(RHODES_LIBRARY_INFO.license, 'MIT');
assert.equal(midiToRhodesSampleName(35), 'B1.mp3');
assert.equal(midiToRhodesSampleName(60), 'C4.mp3');
assert.equal(midiToRhodesSampleName(61), 'Cs4.mp3');
assert.equal(midiToRhodesSampleName(86), 'D6.mp3');
assert.equal(velocityLayerForMidiVelocity(1), 1);
assert.equal(velocityLayerForMidiVelocity(64), 4);
assert.equal(velocityLayerForMidiVelocity(127), 8);

const human = buildHumanRhodesPlan(['Am', 'F', 'C', 'G'], {
  roman: ['vi', 'IV', 'I', 'V'],
  bpm: 106,
  energyTarget: 0.72
});
assert.equal(human.bars, 4);
assert.equal(human.totalBeats, 16);
assert.equal(human.bpm, 106);
assert.equal(human.instrument, 'Rhodes FM');
assert.equal(human.voicings.length, 4);
assert.ok(human.events.length > 20, 'human performance should contain phrasing beyond four block chords');
assert.ok(human.events.some(event => event.role === 'bass-root'), 'human performance needs a left-hand bass voice');
assert.ok(human.events.some(event => event.role === 'top-voice'), 'human performance needs an expressive top voice');
assert.ok(human.events.some(event => event.role.includes('response')), 'danceable performance needs rhythmic response notes');
assert.ok(human.events.some(event => event.fingerOffsetSeconds > 0), 'notes inside chords must not all strike at exactly the same instant');
assert.ok(new Set(human.events.map(event => velocityLayerForMidiVelocity(event.velocity))).size >= 2, 'performance should exercise more than one velocity layer');
assert.ok(human.voicings.some(voicing => /9/.test(voicing.playedChord)), 'Serra performance language should introduce safe ninth color where appropriate');
for (const event of human.events) {
  assert.ok(event.midi >= 35 && event.midi <= 86, `sample note ${event.midi} must remain inside Rhodes B1-D6 coverage`);
  assert.ok(event.startBeat >= 0 && event.startBeat < 16, 'performance event must start inside the four-bar window');
}

const slowRotary = rotaryProfileForEnergy(0.25);
const fastRotary = rotaryProfileForEnergy(0.85);
assert.ok(slowRotary.hornHz < fastRotary.hornHz, 'rotary horn should accelerate with body energy');
assert.ok(slowRotary.drumHz < fastRotary.drumHz, 'rotary drum should accelerate with body energy');
assert.ok(slowRotary.wet < fastRotary.wet, 'higher energy may carry a slightly stronger rotary impression');

console.log('PASS Vibe Roulette voice-led, BPM, four-bar and human Rhodes audio tests');
