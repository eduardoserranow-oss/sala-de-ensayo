import assert from 'node:assert/strict';
import fs from 'node:fs';

const phase15=fs.readFileSync('assets/vibe-roulette-phase15-workflow-v1.js','utf8');
const phase151=fs.readFileSync('assets/vibe-roulette-phase151-ux-v1.js','utf8');
const phase2=fs.readFileSync('assets/vibe-roulette-phase2-library-midi-v1.js','utf8');
const taste=fs.readFileSync('assets/vibe-roulette-taste-training-v1.js','utf8');

assert.match(phase15,/switchToSection/);
assert.match(phase15,/returnToMain/);
assert.match(phase15,/getCurrentPerformance/);
assert.match(phase15,/Section queued/);
assert.match(phase15,/Main queued/);

assert.match(phase151,/version:'1\.5\.1'/);
assert.match(phase151,/Main Progression/);
assert.match(phase151,/Play Section/);
assert.match(phase151,/SECTION DIRECTION/);
assert.match(phase151,/moveMetadataIntoDetails/);
assert.match(phase151,/moveSectionNearMain/);
assert.match(phase151,/returnToMain/);
assert.match(phase151,/switchToSection/);
assert.match(phase151,/is-active/);
assert.match(taste,/vibe-roulette-phase151-ux-v1\.js/);

assert.match(phase2,/performanceToMidiBytes/);
assert.match(phase2,/audio\/midi/);
assert.match(phase2,/timing and velocities/i);
assert.match(phase2,/FORTISSIMO\.mid/);
assert.match(phase2,/Favorites/);

console.log('Vibe Roulette phase 1.5 / 1.5.1 / phase 2 regression checks passed.');
