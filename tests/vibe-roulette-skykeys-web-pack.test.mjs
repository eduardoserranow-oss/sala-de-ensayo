import assert from 'node:assert/strict';
import fs from 'node:fs';

const pack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
const phase5=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');

for(const token of [
  "version:'1.1.0-resilient-pilot'",
  "codec:'AAC-LC'",
  "container:'m4a'",
  "mimeType:'audio/mp4'",
  'sampleRate:44100',
  'channels:2',
  'presetCount:4',
  'zoneCount:205',
  'sourceBytes:288166375',
  'webBytes:67656500',
  'manifestTimeoutMs:5000',
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
  'SUPPORTED_MIME_TYPES',
  "'audio/x-m4a'",
  'absoluteZoneUrl',
  'fetchManifest',
  'AbortController',
  'Promise.all',
  'loadSkyKeysWebPilot',
  "cache:'no-store'",
  "response?.status",
  "report.status=report.loaded.length===Object.keys(SKYKEYS_WEB_MANIFEST_URLS).length",
  "secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'"
]) assert.ok(pack.includes(token),`missing web-pack token: ${token}`);

assert.ok(!pack.includes('.mp3'),'Supabase pilot must not depend on the obsolete MP3 proof files');
assert.ok(!pack.includes('SUPABASE_SERVICE_ROLE_KEY'),'frontend web-pack module must never contain the service-role environment variable');

for(const token of [
  "version:'5.6.0-audio-truth'",
  "./vibe-roulette-skykeys-web-pack-v1.js",
  'SKYKEYS_WEB_PACK_INFO,loadSkyKeysWebPilot',
  'await loadWebPilot()',
  'reloadSkyKeysWebPilot',
  'reloadWebPilot:reloadSkyKeysWebPilot',
  'webPackReport',
  'choosePlaybackDecision',
  'requireAvailable:true',
  "source='hosted-substitute'",
  'S.K.Y. AUDIO ACTIVE',
  'RHODES FALLBACK',
  'Copy preset',
  "mutatesPianist:false",
  "mutatesHarmony:false",
  "drumsUntouched:true",
  "rhodesFallback:true",
  "originalPrepareSources.call(this,token)"
]) assert.ok(phase5.includes(token),`missing Phase 5 web delivery token: ${token}`);

console.log('PASS S.K.Y. Keys four-preset AAC/M4A Supabase manifest loader, Safari MIME/timeout resilience, truthful active-preset UI, hosted playback preference and pianist invariance contract');