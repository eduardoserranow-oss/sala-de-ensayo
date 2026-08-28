import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SeamlessEightBarLoopTransport } from '../assets/vibe-roulette-seamless-loop-v1.js';
import { PHASE15_INFO } from '../assets/vibe-roulette-phase15-workflow-v1.js';
import { PHASE151_INFO } from '../assets/vibe-roulette-phase151-ux-v1.js';
import { performanceToMidiBytes, PHASE2_INFO } from '../assets/vibe-roulette-phase2-library-midi-v1.js';

assert.equal(PHASE15_INFO.version,1);
assert.match(PHASE15_INFO.principle,/shared|transport/i);
assert.equal(PHASE151_INFO.version,'1.5.1');
assert.match(PHASE151_INFO.principle,/Main and Section/i);
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.switchToSection,'function');
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.returnToMain,'function');
assert.equal(typeof SeamlessEightBarLoopTransport.prototype.getCurrentPerformance,'function');

const phase151=fs.readFileSync('assets/vibe-roulette-phase151-ux-v1.js','utf8');
assert.match(phase151,/Main Progression/);
assert.match(phase151,/Play Section/);
assert.match(phase151,/SECTION DIRECTION/);
assert.match(phase151,/moveMetadataIntoDetails/);
assert.match(phase151,/returnToMain/);
assert.match(phase151,/switchToSection/);
const taste=fs.readFileSync('assets/vibe-roulette-taste-training-v1.js','utf8');
assert.match(taste,/vibe-roulette-phase151-ux-v1\.js/);

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

console.log('Vibe Roulette phase 1.5 / 1.5.1 / phase 2 regression checks passed.');
