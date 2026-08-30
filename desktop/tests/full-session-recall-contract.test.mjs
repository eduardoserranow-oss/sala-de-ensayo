import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const preload=fs.readFileSync(new URL('../preload.cjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../main.cjs',import.meta.url),'utf8');
const vibe=fs.readFileSync(new URL('../../vibe-roulette.html',import.meta.url),'utf8');
const recall=fs.readFileSync(new URL('../../assets/vibe-roulette-full-session-recall-v1.js',import.meta.url),'utf8');

assert.equal(pkg.version,'0.13.0');
for(const token of ["const BRIDGE_VERSION = '13.0.0'","'full-session-recall'","'project-version-history'","'background-audio'","'stable-desktop-release'",'desktop-workspace13','vibe-roulette-full-session-recall-v1.js?v=project-versions13'])assert.ok(preload.includes(token),`Phase 12 preload missing ${token}`);
assert.ok(main.includes('backgroundThrottling: false'),'Phase 9.1 background audio must remain enabled');

for(const token of [
  'window.__FORTISSIMO_VIBE_SESSION_V1__','capture:captureFullSession','restore:restoreFullSession',"version:'1.0.0'",'result:cloneSessionValue(state.result)','arrangement:cloneSessionValue(state.arrangement)','selectedDrum:cloneSessionValue(state.selectedDrum)','drumMuted:Boolean(state.drumMuted)','drumVolume:Number(state.drumVolume)','renderArrangementCards(state.arrangement)','renderResultDetails(state.result,state.arrangement)','state.transport?.setDrumVolume(state.drumVolume)','state.transport?.setDrumMuted(state.drumMuted)','window.__FORTISSIMO_VIBE_LAST_RESULT__=state.result','window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__=state.arrangement',"new CustomEvent('fortissimo:vibe-session-restored'"
])assert.ok(vibe.includes(token),`Vibe full-session contract missing ${token}`);

const restoreSource=vibe.slice(vibe.indexOf('async function restoreFullSession'),vibe.indexOf('window.__FORTISSIMO_VIBE_SESSION_V1__'));
assert.ok(restoreSource.length>100,'Restore source must exist');
assert.ok(!restoreSource.includes('.spin('),'Open must never regenerate by spinning');
assert.ok(!restoreSource.includes('buildEightBarArrangement('),'Open must reuse stored arrangement rather than rebuild it');

for(const token of [
  "const STORAGE_KEY='fortissimo.desktop.fullSessions.v1'",'MAX_SESSIONS=24','captureFullSession','openFullSession','duplicateSession','renameVersion','Project Versions','Remember exact','Duplicate','Rename','EXACT STATE',"item.version==='1.0.0'",'projectVersion',"capability:'project-version-history'", "window.addEventListener('fortissimo:vibe-session-restored'"
])assert.ok(recall.includes(token),`Desktop Phase 12 project version UI missing ${token}`);

assert.ok(!recall.includes('buildEightBarArrangement('));
assert.ok(!recall.includes('.spin('));
assert.ok(!recall.includes("require('node:fs')"));
assert.ok(!recall.includes("filter(item=>titleOf(item).toLowerCase()!==title)"),'Saving a new version must not erase prior project versions');

console.log('PASS FORTISSIMO Desktop Phase 12 preserves exact Project Versions and Full Session Recall without regeneration.');
