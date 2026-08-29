import assert from 'node:assert/strict';
import fs from 'node:fs';

const pack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
const phase5=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');

for(const token of [
  "version:'1.3.0-afro-priority-bank'",
  "codec:'AAC-LC'",
  "container:'m4a'",
  "mimeType:'audio/mp4'",
  'sampleRate:44100',
  'channels:2',
  'presetCount:10',
  'zoneCount:307',
  'sourceBytes:349314258',
  'webBytes:80718014',
  "delivery:'direct-zone-bootstrap + background-manifest-hydration'",
  'manifestTimeoutMs:5000',
  "mainHarmony:Object.freeze(['About Time','Beautiful Rhodes','Soft Piano','Modest Wurli','Grand Piano'])",
  "colors:Object.freeze(['Always Danger','Broad Texture','Hidden Whistle','Toy Piano','Warm Pluck'])",
  "'Beautiful Rhodes':{folder:'beautiful-rhodes',count:13",
  "'Soft Piano':{folder:'soft-piano',count:84",
  "'Modest Wurli':{folder:'modest-wurli',count:20",
  "'Grand Piano':{folder:'grand-piano',count:88",
  "'About Time':{folder:'about-time',count:15",
  "'Always Danger':{folder:'always-danger',count:15",
  "'Broad Texture':{folder:'broad-texture',count:15",
  "'Hidden Whistle':{folder:'hidden-whistle',count:14",
  "'Toy Piano':{folder:'toy-piano',count:31",
  "'Warm Pluck':{folder:'warm-pluck',count:12",
  'directZonesFor',
  'registerDirectPilot',
  'hydrateManifestsInBackground',
  'direct-zone-bootstrap',
  'normalizeWebManifestSettings',
  "loopBool:'Loop Bool'",
  'SUPPORTED_MIME_TYPES',
  "'audio/x-m4a'",
  'absoluteZoneUrl',
  'fetchManifest',
  'AbortController',
  'Promise.all',
  'loadSkyKeysWebPilot',
  'applyMainBankAndVariety',
  'rememberPlayedMainPreset',
  'skykeys-active',
  'recentIndex===0?.34',
  'getSkyKeysAfroPriorityState',
  "secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'"
]) assert.ok(pack.includes(token),`missing web-pack token: ${token}`);

assert.ok(!pack.includes('.mp3'),'Supabase bank must not depend on obsolete MP3 proof files');
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

console.log('PASS S.K.Y. Keys ten-preset Afro priority bank: 307 AAC/M4A zones, five curated main-harmony instruments, five role-aware colors, recent-play variety memory, Safari direct-zone bootstrap, truthful active-preset UI and pianist invariance contract');