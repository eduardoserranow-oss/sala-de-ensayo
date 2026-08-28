import assert from 'node:assert/strict';
import fs from 'node:fs';

const pack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
const phase5=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');

for(const token of [
  "version:'1.0.0-pilot'",
  "codec:'AAC-LC'",
  "container:'m4a'",
  "mimeType:'audio/mp4'",
  'sampleRate:44100',
  'channels:2',
  'presetCount:4',
  'zoneCount:205',
  'sourceBytes:288166375',
  'webBytes:67656500',
  "'Beautiful Rhodes':13",
  "'Soft Piano':84",
  "'Modest Wurli':20",
  "'Grand Piano':88",
  '/skykeys-web-v1/beautiful-rhodes/manifest.json',
  '/skykeys-web-v1/soft-piano/manifest.json',
  '/skykeys-web-v1/modest-wurli/manifest.json',
  '/skykeys-web-v1/grand-piano/manifest.json',
  'normalizeWebManifestSettings',
  "loopBool:'Loop Bool'",
  'loadSkyKeysWebPilot',
  "cache:'no-store'",
  "response?.status",
  "report.status=report.loaded.length===Object.keys(SKYKEYS_WEB_MANIFEST_URLS).length",
  "secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'"
]) assert.ok(pack.includes(token),`missing web-pack token: ${token}`);

assert.ok(!pack.includes('.mp3'),'Supabase pilot must not depend on the obsolete MP3 proof files');
assert.ok(!pack.includes('SUPABASE_SERVICE_ROLE_KEY'),'frontend web-pack module must never contain the service-role environment variable');

for(const token of [
  "version:'5.2.0-web-pilot'",
  "./vibe-roulette-skykeys-web-pack-v1.js",
  'SKYKEYS_WEB_PACK_INFO,loadSkyKeysWebPilot',
  'await loadWebPilot()',
  'reloadSkyKeysWebPilot',
  'reloadWebPilot:reloadSkyKeysWebPilot',
  'webPackReport',
  "mutatesPianist:false",
  "mutatesHarmony:false",
  "drumsUntouched:true",
  "rhodesFallback:true",
  "originalPrepareSources.call(this,token)",
  "Rhodes fallback until this preset has hosted samples"
]) assert.ok(phase5.includes(token),`missing Phase 5 web delivery token: ${token}`);

console.log('PASS S.K.Y. Keys four-preset AAC/M4A Supabase manifest loader, settings normalization, retry, fallback and pianist invariance contract');
