import assert from 'node:assert/strict';
import fs from 'node:fs';

const pack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
const phase5=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');

for(const token of [
  "version:'0.5.1-pilot'",
  "preset:'Beautiful Rhodes'",
  "codec:'audio/mpeg'",
  'bitrateKbps:112',
  'sampleRate:44100',
  'zoneCount:4',
  'completeSourceZones:false',
  "rootMidi:60",
  "rootMidi:64",
  "rootMidi:68",
  "rootMidi:72",
  "assets/vibe-roulette/skykeys/web/beautiful-rhodes"
]) assert.ok(pack.includes(token),`missing web-pack token: ${token}`);

for(const token of [
  "./vibe-roulette-skykeys-web-pack-v1.js",
  "registerRemotePresetManifest('Beautiful Rhodes',BEAUTIFUL_RHODES_WEB_ZONES)",
  "registerPresetSettings('Beautiful Rhodes',BEAUTIFUL_RHODES_WEB_SETTINGS)",
  "mutatesPianist:false",
  "mutatesHarmony:false",
  "drumsUntouched:true",
  "rhodesFallback:true",
  "originalPrepareSources.call(this,token)",
  "Rhodes fallback until this preset has hosted samples"
]) assert.ok(phase5.includes(token),`missing Phase 5 web delivery token: ${token}`);

for(const file of ['060-dow.mp3','064-ev4.mp3','068-ev4.mp3','072-ev4.mp3']){
  const p=`assets/vibe-roulette/skykeys/web/beautiful-rhodes/${file}`;
  assert.ok(fs.existsSync(p),`missing hosted pilot sample: ${p}`);
  assert.ok(fs.statSync(p).size>40000,`pilot sample unexpectedly small: ${p}`);
}

console.log('PASS S.K.Y. Keys Beautiful Rhodes same-origin web delivery pilot, manifest, fallback and pianist invariance contract');
