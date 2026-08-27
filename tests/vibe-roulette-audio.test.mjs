import assert from 'node:assert/strict';
import {
  voiceLeadChords,
  recommendedBpmForEnergy,
  describeBodyEnergy,
  buildFourBarPlan
} from '../assets/vibe-roulette-audio.js';
import {
  buildSoftHumanRhodesPlan,
  midiToRhodesSampleName,
  velocityLayerForMidiVelocity,
  rotaryProfileForEnergy,
  practicalizeChordForPlayback,
  RHODES_LIBRARY_INFO
} from '../assets/vibe-roulette-rhodes-v2.js';

const chords = ['C', 'G', 'Am', 'F'];
const voicings = voiceLeadChords(chords);
assert.equal(voicings.length, chords.length);

for (const voicing of voicings) {
  assert.ok(voicing.length >= 3, 'preview voicing should contain at least a triad');
  assert.ok(Math.min(...voicing) >= 43, 'voicing should stay out of muddy sub-bass range');
  assert.ok(Math.max(...voicing) <= 76, 'voicing should stay in compact preview range');
}

const calm = describeBodyEnergy(0.3);
const flowing = describeBodyEnergy(0.55);
const danceable = describeBodyEnergy(0.8);
assert.equal(calm.label, 'Calm');
assert.equal(flowing.label, 'Flowing');
assert.equal(danceable.label, 'Danceable');
assert.ok(calm.bpm < flowing.bpm && flowing.bpm < danceable.bpm, 'body energy BPM must rise monotonically across bands');
assert.equal(recommendedBpmForEnergy(0.72), 106, '72% body energy should enter the danceable playback band');

const fourChordPlan = buildFourBarPlan(['Am', 'F', 'C', 'G']);
assert.deepEqual(fourChordPlan.map(item => item.beats), [4,4,4,4]);
assert.equal(fourChordPlan.reduce((sum,item)=>sum+item.beats,0),16);
assert.deepEqual(buildFourBarPlan(['Am','F']).map(item=>item.beats),[8,8]);
assert.ok(buildFourBarPlan(['C','G','Am','F','Dm','Em','F','G']).every(item=>item.beats===2));
assert.throws(()=>buildFourBarPlan([]),/at least one chord/);

assert.equal(RHODES_LIBRARY_INFO.range, 'B1–D6');
assert.equal(RHODES_LIBRARY_INFO.velocityLayers, 8);
assert.equal(RHODES_LIBRARY_INFO.license, 'MIT');
assert.equal(midiToRhodesSampleName(35), 'B1.mp3');
assert.equal(midiToRhodesSampleName(60), 'C4.mp3');
assert.equal(midiToRhodesSampleName(61), 'Cs4.mp3');
assert.equal(midiToRhodesSampleName(86), 'D6.mp3');
assert.equal(velocityLayerForMidiVelocity(1),1);
assert.equal(velocityLayerForMidiVelocity(64),4);
assert.equal(velocityLayerForMidiVelocity(127),8);

assert.equal(practicalizeChordForPlayback('Cb'), 'B', 'Cb must never break Rhodes playback');
assert.equal(practicalizeChordForPlayback('B#7'), 'C7');
assert.equal(practicalizeChordForPlayback('Fbmaj7'), 'Emaj7');
assert.equal(practicalizeChordForPlayback('E#m9'), 'Fm9');

const human = buildSoftHumanRhodesPlan(['Am','F','C','G'], {
  roman:['vi','IV','I','V'], bpm:106, energyTarget:0.72
});
assert.equal(human.bars,4);
assert.equal(human.totalBeats,16);
assert.equal(human.bpm,106);
assert.equal(human.instrument,'Rhodes FM');
assert.equal(human.profile,'soft-human-v2');
assert.equal(human.voicings.length,4);
assert.ok(human.events.length > 18, 'V2 should phrase inside the harmony without reverting to four block chords');
assert.ok(human.events.some(event=>event.role==='bass-root'));
assert.ok(human.events.some(event=>event.role==='top-voice'));
assert.ok(human.events.some(event=>event.role==='afro-response'), 'V2 should include restrained Afro-style response phrasing');
assert.ok(human.events.some(event=>event.fingerOffsetSeconds>0));
assert.ok(new Set(human.events.map(event=>velocityLayerForMidiVelocity(event.velocity))).size>=2);
assert.ok(human.voicings.some(voicing=>/9/.test(voicing.playedChord)));
assert.ok(Math.max(...human.events.map(event=>event.velocity)) <= 80, '72% energy must remain substantially softer than V1 hard-strike behavior');
for (const event of human.events) {
  assert.ok(event.midi>=35 && event.midi<=86, `sample note ${event.midi} must remain inside B1-D6`);
  assert.ok(event.startBeat>=0 && event.startBeat<16);
}

const beforeBoundary = rotaryProfileForEnergy(0.719);
const afterBoundary = rotaryProfileForEnergy(0.72);
assert.ok(Math.abs(afterBoundary.hornHz-beforeBoundary.hornHz)<0.03, 'rotary must not jump abruptly at 72%');
assert.ok(Math.abs(afterBoundary.wet-beforeBoundary.wet)<0.01, 'rotary wetness must be continuous at 72%');
const slowRotary=rotaryProfileForEnergy(0.25);
const fastRotary=rotaryProfileForEnergy(0.85);
assert.ok(slowRotary.hornHz<fastRotary.hornHz);
assert.ok(slowRotary.drumHz<fastRotary.drumHz);
assert.ok(fastRotary.hornHz<3.0, 'soft Leslie V2 should stay below the aggressive V1 fast-horn range');
assert.ok(fastRotary.wet<0.32, 'rotary must remain secondary to the Rhodes');

console.log('PASS Vibe Roulette BPM, practical spelling and soft human Rhodes V2 tests');
