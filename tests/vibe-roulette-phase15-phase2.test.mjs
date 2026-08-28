import assert from 'node:assert/strict';
import { SeamlessEightBarLoopTransport } from '../assets/vibe-roulette-seamless-loop-v1.js';
import { PHASE15_INFO } from '../assets/vibe-roulette-phase15-workflow-v1.js';
import { performanceToMidiBytes, PHASE2_INFO } from '../assets/vibe-roulette-phase2-library-midi-v1.js';

assert.equal(PHASE15_INFO.version,1);
assert.match(PHASE15_INFO.principle,/shared|transport/i);
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.switchToSection,'function');
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.returnToMain,'function');
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.getCurrentPerformance,'function');

const performance={bpm:112,events:[
  {midi:59,velocity:62,startBeat:0,durationBeats:1},
  {midi:62,velocity:74,startBeat:1.5,durationBeats:2},
  {midi:66,velocity:58,startBeat:4,durationBeats:3.5}
]};
const midi=performanceToMidiBytes(performance);
assert.ok(midi instanceof Uint8Array);
assert.deepEqual([...midi.slice(0,4)],[77,84,104,100]);
assert.ok(midi.length>40);
assert.equal(PHASE2_INFO.version,1);
assert.match(PHASE2_INFO.midi,/timing and velocities/i);

console.log('Vibe Roulette phase 1.5 / phase 2 regression checks passed.');
