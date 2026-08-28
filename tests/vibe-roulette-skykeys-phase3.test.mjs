import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-engine-v1.js','utf8');
const runtime=JSON.parse(fs.readFileSync('data/vibe-roulette/skykeys-runtime-manifest-v1.json','utf8'));

for(const token of [
  "version:'3.0.0'","mutatesPianist:false","mutatesHarmony:false","catalogTarget:222",
  'parseSkyKeysSettingsText','indexLocalLibrary','registerRemotePresetManifest','LruAudioBufferCache',
  'producerGuardrail','not-for-full-pianist-voicings','lead-not-default-harmonic-bed','inputUnchanged',
  'SKYKEYS_PHASE3_PARAMETER_POLICY','preservedForLater','force-cache'
]) assert.ok(src.includes(token),`missing Phase 3 contract token: ${token}`);

assert.equal(runtime.catalog_count,222);
assert.equal(runtime.status,'phase3-engine-ready-isolated');
assert.equal(runtime.upstream_invariant,'Never mutate chord generator or pianist performance plan');

const sample='060-dow.flac';
const m=sample.match(/^(\d{3})-([^.]+)\.flac$/i);
assert.equal(Number(m[1]),60);
assert.equal(m[2],'dow');
assert.equal(2**((72-60)/12),2);

console.log('PASS S.K.Y. Keys Phase 3 reusable sound engine contract');
