import assert from 'node:assert/strict';
import { AFRO_DRUM_LIBRARY, selectAfroDrum } from '../assets/vibe-roulette-drums.js';

assert.equal(AFRO_DRUM_LIBRARY.length,28);
assert.ok(AFRO_DRUM_LIBRARY.every(loop=>loop.originalFilename.endsWith('.wav')));
assert.ok(AFRO_DRUM_LIBRARY.every(loop=>loop.src.endsWith('.mp3')));
const near=selectAfroDrum({bpm:118,mood:'connection',seed:'near'});
assert.ok(Math.abs(near.nativeBpm-118)<=10);
const high=selectAfroDrum({bpm:150,mood:'illusion',seed:'high'});
assert.equal(high.nativeBpm,125);
assert.equal(high.sessionBpm,150);
const low=selectAfroDrum({bpm:90,mood:'nostalgia',seed:'low'});
assert.equal(low.nativeBpm,95);
console.log('PASS Vibe Roulette drum library, nearest-tempo fallback and original filenames');
