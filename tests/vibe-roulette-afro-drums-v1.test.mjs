import assert from 'node:assert/strict';
import fs from 'node:fs';

const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};

const { AFRO_DRUM_LOOPS,AFRO_DRUM_LIBRARY_INFO }=await import('../assets/vibe-roulette-afro-drums-catalog-v1.js');
const { AFRO_DRUM_BANK,AFRO_DRUM_BANK_URL,AFRO_DRUM_BANK_INFO }=await import('../assets/vibe-roulette-afro-drum-bank-v1.js');
const { AfroDrumSelector,drumStretchInfo,AFRO_DRUM_ENGINE_INFO }=await import('../assets/vibe-roulette-afro-drums-v1.js');
const { VIBE_DRUM_UI_DEFAULTS }=await import('../assets/vibe-roulette-drum-defaults-v2.js');
const { recordTasteFeedback,loadTasteTraining,getTasteTrainingCount }=await import('../assets/vibe-roulette-taste-training-v1.js');
const { recommendedBpmForEnergy,VIBE_BPM_MIN,VIBE_BPM_MAX }=await import('../assets/vibe-roulette-tempo-v2.js');
const webManifest=JSON.parse(fs.readFileSync('data/vibe-roulette/afro-drums-web-v1.manifest.json','utf8'));

assert.equal(AFRO_DRUM_LOOPS.length,28);
assert.equal(AFRO_DRUM_LIBRARY_INFO.nativeEightBar,22);
assert.equal(AFRO_DRUM_LIBRARY_INFO.nativeFourBar,6);
assert.equal(AFRO_DRUM_LOOPS.filter(loop=>loop.bars===4).length,6);
assert.equal(AFRO_DRUM_LOOPS.find(loop=>loop.alias==='Kente').originalName,'Afrobeat Producers_AfroBanger_Vol.3_Kente_116 Bpm_Full Drums.wav');
assert.equal(AFRO_DRUM_LOOPS.find(loop=>loop.alias==='Mistura').originalName,'Afrobeat Producers_AfroBanger_Vol.3_Mistura_98pm_Full Drums.wav');
assert.equal(AFRO_DRUM_LOOPS.find(loop=>loop.alias==='Owerri').originalName,'Afrobeat Producers_AfroBanger_Vol.3_Owerri_112Bpm_Full Drums_.wav');
assert.ok(AFRO_DRUM_LOOPS.every(loop=>loop.historicalEvidence===false&&loop.billboardEvidence===false&&loop.harmonicEvidence===false));

assert.equal(Object.keys(AFRO_DRUM_BANK).length,28,'all 28 loops need a production bank cue');
assert.ok(AFRO_DRUM_BANK_URL.startsWith('https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/'));
assert.equal(AFRO_DRUM_BANK_INFO.codec,'AAC-LC');
assert.ok(Object.values(AFRO_DRUM_BANK).every(cue=>cue.start>=0&&cue.duration>8));

assert.equal(webManifest.technicalSummary.fileCount,28);
assert.equal(webManifest.technicalSummary.nativeEightBar,22);
assert.equal(webManifest.technicalSummary.nativeFourBar,6);
assert.deepEqual(webManifest.selection.bodyEnergyBpmRange,[90,150]);
assert.deepEqual(webManifest.selection.priorityBpmBands,[3,6,10]);
assert.equal(webManifest.delivery.mastersInGitHub,false);
assert.equal(webManifest.delivery.derivativesReady,true,'production web bank must only be marked ready after the binary asset exists');
assert.equal(webManifest.delivery.runtimeBankUrl,AFRO_DRUM_BANK_URL);
assert.equal(webManifest.loops.length,28);
for(const runtimeLoop of AFRO_DRUM_LOOPS){
  const declared=webManifest.loops.find(loop=>loop.id===runtimeLoop.id);
  assert.ok(declared,`web manifest missing ${runtimeLoop.id}`);
  assert.equal(declared.originalName,runtimeLoop.originalName);
  assert.equal(declared.sourceBpm,runtimeLoop.bpm);
  assert.equal(declared.nativeBars,runtimeLoop.bars);
  assert.ok(AFRO_DRUM_BANK[runtimeLoop.id],`bank cue missing ${runtimeLoop.id}`);
}

assert.equal(VIBE_BPM_MIN,90);assert.equal(VIBE_BPM_MAX,150);assert.equal(recommendedBpmForEnergy(0),90);assert.equal(recommendedBpmForEnergy(1),150);
assert.deepEqual(AFRO_DRUM_ENGINE_INFO.tempoPriorityBands,[3,6,10]);
assert.equal(AFRO_DRUM_ENGINE_INFO.version,2);
assert.equal(VIBE_DRUM_UI_DEFAULTS.muted,true);
assert.equal(VIBE_DRUM_UI_DEFAULTS.volume,0.42);

const deterministic=()=>0.51;const selector=new AfroDrumSelector({random:deterministic});
const pool100=selector.candidatePool({bpm:100});assert.ok(pool100.length>0&&pool100.every(loop=>Math.abs(loop.bpm-100)<=3),'0-3 BPM band must win before wider bands');
const pool107=selector.candidatePool({bpm:107});assert.ok(pool107.length>0&&pool107.every(loop=>Math.abs(loop.bpm-107)<=3),'closest priority band should be used when available');
assert.equal(selector.candidatePool({bpm:140})[0].bpm,125,'140 BPM must fall back to the nearest 125 BPM source');
assert.equal(selector.candidatePool({bpm:150})[0].bpm,125,'150 BPM must fall back to the nearest 125 BPM source');
assert.equal(selector.candidatePool({bpm:90})[0].bpm,95,'90 BPM must fall back to the nearest 95 BPM source');
const picked=selector.select({bpm:112,energyTarget:.6,mood:'connection',emotionFilters:['sensuality']});assert.ok(picked);
const next=selector.next({bpm:112,energyTarget:.6,mood:'connection',emotionFilters:['sensuality']},picked.id);assert.notEqual(next.id,picked.id);
const stretch=drumStretchInfo(AFRO_DRUM_LOOPS[0],120);assert.equal(stretch.sourceBpm,100);assert.equal(stretch.sessionBpm,120);assert.equal(Math.round(stretch.playbackTempoRatio*100),120);assert.equal(Math.round(stretch.durationRatio*100),83);

const context={roman:['IV','V','vi','V'],chords:['F','G','Am','G'],key:'C',mood:'connection',energyTarget:.62,bpm:114,emotionFilters:['sensuality'],performancePattern:{id:'afro-pocket'},drum:AFRO_DRUM_LOOPS[3],timeStretch:drumStretchInfo(AFRO_DRUM_LOOPS[3],114)};
recordTasteFeedback(context,'wrongVibe','drum-groove');let model=loadTasteTraining();assert.equal(Object.keys(model.harmony).length,0,'drum criticism must not punish harmony');assert.ok(Object.keys(model.rhythm).length>0);assert.equal(getTasteTrainingCount(),1);
recordTasteFeedback(context,'inspire','progression');model=loadTasteTraining();assert.ok(Object.keys(model.harmony).length>0);assert.equal(getTasteTrainingCount(),2);

const transport=fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8');
const drumsRuntime=fs.readFileSync('assets/vibe-roulette-afro-drums-v1.js','utf8');
const defaultsRuntime=fs.readFileSync('assets/vibe-roulette-drum-defaults-v2.js','utf8');
const drumCss=fs.readFileSync('assets/vibe-roulette-afro-drums-v1.css','utf8');
const html=fs.readFileSync('vibe-roulette.html','utf8');
const session=fs.readFileSync('assets/vibe-roulette-session.js','utf8');
const performance=fs.readFileSync('assets/vibe-roulette-performance-v1.js','utf8');
assert.ok(transport.includes('renderPitchPreservedDrumBuffer'));
assert.ok(transport.includes('source.loop=true'));
assert.ok(transport.includes('setDrumMuted'));
assert.ok(transport.includes('pauseOffsetSeconds'));
assert.ok(transport.includes('async resume()'));
assert.ok(transport.includes('this.drumMuted=true'));
assert.ok(transport.includes('this.drumVolume=0.42'));
assert.ok(!drumsRuntime.includes('.playbackRate.value='),'drum tempo adjustment must not use pitch-shifting playbackRate');
assert.ok(drumsRuntime.includes('AFRO_DRUM_BANK_URL'));
assert.ok(drumsRuntime.includes("mode:'cors'"));
assert.ok(defaultsRuntime.includes("toggle.remove()"),'legacy Drum level toggle must be removed at runtime');
assert.ok(defaultsRuntime.includes("slider.value='42'"));
assert.ok(defaultsRuntime.includes("mute.click()"),'legacy private page state must be migrated to factory-muted');
assert.ok(drumCss.includes('.drum-level-toggle{display:none!important}'));
assert.ok(drumCss.includes("content:'Drum level'"),'direct slider should retain a clear inline label without a disclosure button');
assert.ok(html.includes('id="drumMuteBtn"'));
assert.ok(html.includes('>M</button>'));
assert.ok(html.includes('id="nextDrumBtn"'));
assert.ok(html.includes('Copy filename'));
assert.ok(html.includes('data-feedback-reason="drum-groove"'));
assert.ok(html.includes('Taste training'));
assert.ok(session.includes('originalName'));
assert.ok(session.includes('timeStretch'));
assert.ok(performance.includes('performanceTasteWeight'));

console.log('PASS Vibe Roulette Afro drums V2 production bank, factory mute 42%, direct level slider, selection, transport and taste learning');
