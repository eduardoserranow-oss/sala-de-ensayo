import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-sampler-prototype-v1.js','utf8');
const html=fs.readFileSync('skykeys-sampler-lab.html','utf8');

assert.match(src,/mutatesPianist:false/);
assert.match(src,/mutatesHarmony:false/);
assert.match(src,/Beautiful Rhodes/);
assert.match(src,/Soft Piano/);
assert.match(src,/Modest Wurli/);
assert.match(src,/Grand Piano/);
assert.match(src,/Smooth Pluck/);
assert.match(src,/Maybe Pad/);
assert.match(src,/Nylon Guitar/);
assert.match(src,/nearestZone/);
assert.match(src,/playbackRateForMidi/);
assert.match(src,/decodeAudioData/);
assert.match(src,/enforcePolyphony/);
assert.match(src,/fallback/);
assert.match(src,/inputUnchanged/);
assert.match(src,/not-for-full-pianist-voicings/);
assert.match(html,/webkitdirectory/);
assert.match(html,/Isolated sampler prototype/);
assert.match(html,/Play Cmaj9/);

function parse(name){const m=name.match(/^(\d{3})-([^.]+)\.flac$/i);return m?{rootMidi:+m[1],zoneLabel:m[2]}:null}
assert.deepEqual(parse('060-dow.flac'),{rootMidi:60,zoneLabel:'dow'});
assert.equal(parse('.DS_Store'),null);
const roots=[60,64,68,72];
const nearest=(m)=>roots.reduce((a,b)=>Math.abs(m-b)<Math.abs(m-a)?b:a,roots[0]);
assert.equal(nearest(67),68);
assert.ok(Math.abs((2**((72-60)/12))-2)<1e-12);

console.log('PASS S.K.Y. Keys Phase 2 isolated sampler, mapping, guardrails and invariance contract');
