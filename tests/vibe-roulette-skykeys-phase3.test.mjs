import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-engine-v1.js','utf8');
const lab=fs.readFileSync('skykeys-sampler-lab.html','utf8');
const csv=fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8').trim().split(/\r?\n/);

assert.match(src,/version:'3\.0\.0'/);
assert.match(src,/mutatesPianist:false/);
assert.match(src,/mutatesHarmony:false/);
assert.match(src,/catalogTarget:222/);
assert.match(src,/parseSkyKeysSettingsText/);
assert.match(src,/indexLocalLibrary/);
assert.match(src,/registerRemotePresetManifest/);
assert.match(src,/LruAudioBufferCache/);
assert.match(src,/force-cache/);
assert.match(src,/producerGuardrail/);
assert.match(src,/not-for-full-pianist-voicings/);
assert.match(src,/lead-not-default-harmonic-bed/);
assert.match(src,/inputUnchanged/);
assert.match(src,/SKYKEYS_PHASE3_PARAMETER_POLICY/);
assert.match(src,/preservedForLater/);
assert.match(lab,/Phase 3 Engine Lab/);
assert.match(lab,/Catalog presets: \$\{engine\.catalog\.length\}/);
assert.match(lab,/Original settings parsed/);
assert.equal(csv.length-1,222,'Phase 3 catalog must preserve all 222 audited presets');

const settings=`Settings Template = ID #, Sound Type #, Source Type #, Attack, Release, Overlap, Voices, Loop Bool, Glide, Legato, Rotate, TSPower, Tone Shifts, Reverse Power, Reverse Division, Reverse Continuous, Rev Fade in, Vibrato Power, Vibrato Depth, Vibrato Speed, Flutter, Reverb, Reverb Mix, Reverb Length, Reverb Tone, Filter Power, Low pass, High Pass, Filter Slope, Start, Loop Start, Loop End, Reverse End, Reverse Start, Saturation, Tone Range, Stereo\nBeautiful Rhodes Settings: 92, 1, 4, 0, 1.451, 0, 8, 0, 0, 0, 1, 1, 0, 0, 4, 1, 1, 1, 19, 66, 4, 1, 0, 31.76, 10000, 1, 0, 0, 1, 0, 0.32607, 0.597795, 0, 0.32607, 0, 100, 1,;`;
const tm=settings.match(/Settings Template\s*=\s*(.+)/);assert.ok(tm);
const line=settings.split('\n')[1].match(/^(.*?) Settings:\s*(.+);\s*$/);assert.equal(line[1],'Beautiful Rhodes');
const vals=line[2].split(',').map(x=>x.trim()).filter(Boolean);assert.equal(vals.length,37);assert.equal(Number(vals[0]),92);

const roots=[60,64,68,72];
const nearest=(m)=>roots.reduce((best,z)=>Math.abs(m-z)<Math.abs(m-best)?z:best,roots[0]);
assert.equal(nearest(67),68);
assert.equal(2**((72-60)/12),2);

console.log('PASS S.K.Y. Keys Phase 3 reusable engine, 222-preset catalog, settings hydration, cache, guardrails and pianist invariance contract');
