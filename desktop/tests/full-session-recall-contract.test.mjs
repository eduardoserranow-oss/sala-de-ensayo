import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const preload=fs.readFileSync(new URL('../preload.cjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../main.cjs',import.meta.url),'utf8');
const vibe=fs.readFileSync(new URL('../../vibe-roulette.html',import.meta.url),'utf8');
const recall=fs.readFileSync(new URL('../../assets/vibe-roulette-full-session-recall-v1.js',import.meta.url),'utf8');

assert.equal(pkg.version,'0.10.0');
for(const token of ["const BRIDGE_VERSION = '10.0.0'","'full-session-recall'","'background-audio'",'desktop-workspace10','vibe-roulette-full-session-recall-v1.js?v=full-session10'])assert.ok(preload.includes(token),`Phase 10 preload missing ${token}`);
assert.ok(main.includes('backgroundThrottling: false'),'Phase 9.1 background audio must remain enabled');

for(const token of [
  'window.__FORTISSIMO_VIBE_SESSION_V1__',
  'capture:captureFullSession',
  'restore:restoreFullSession',
  "version:'1.0.0'",
  'result:cloneSessionValue(state.result)',
  'arrangement:cloneSessionValue(state.arrangement)',
  'selectedDrum:cloneSessionValue(state.selectedDrum)',
  'drumMuted:Boolean(state.drumMuted)',
  'drumVolume:Number(state.drumVolume)',
  'renderArrangementCards(state.arrangement)',
  'renderResultDetails(state.result,state.arrangement)',
  'state.transport?.setDrumVolume(state.drumVolume)',
  'state.transport?.setDrumMuted(state.drumMuted)',
  'window.__FORTISSIMO_VIBE_LAST_RESULT__=state.result',
  'window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__=state.arrangement',
  "new CustomEvent('fortissimo:vibe-session-restored'"
])assert.ok(vibe.includes(token),`Vibe full-session contract missing ${token}`);

const restoreSource=vibe.slice(vibe.indexOf('async function restoreFullSession'),vibe.indexOf('window.__FORTISSIMO_VIBE_SESSION_V1__'));
assert.ok(restoreSource.length>100,'Restore source must exist');
assert.ok(!restoreSource.includes('.spin('),'Open Session must never regenerate by spinning');
assert.ok(!restoreSource.includes('buildEightBarArrangement('),'Open Session must reuse stored arrangement rather than rebuild it');

for(const token of [
  "const STORAGE_KEY='fortissimo.desktop.fullSessions.v1'",
  'captureFullSession',
  'openFullSession',
  'Remember exact',
  'Open Session',
  'EXACT STATE',
  "snapshot.version==='1.0.0'",
  "window.addEventListener('fortissimo:vibe-session-restored'"
])assert.ok(recall.includes(token),`Desktop Full Session Recall UI missing ${token}`);

assert.ok(!recall.includes('buildEightBarArrangement('));
assert.ok(!recall.includes('.spin('));
assert.ok(!recall.includes("require('node:fs')"));

console.log('PASS FORTISSIMO Desktop Phase 10 Full Session Recall: exact structured musical state is captured and restored without regeneration, while Phase 9.1 background audio remains intact.');
