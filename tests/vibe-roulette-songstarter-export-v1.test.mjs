import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SONG_STARTER_EXPORT_V1_INFO,
  eventTimingTicks,
  layerToMidiBytes,
  buildStoredZip,
  buildStarterMetadata,
  buildSongStarterArchive
} from '../assets/vibe-roulette-songstarter-export-v1.js';

assert.equal(SONG_STARTER_EXPORT_V1_INFO.phase,6);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.version,'1.0.0');
assert.deepEqual(SONG_STARTER_EXPORT_V1_INFO.activeRoles,['foundation','support']);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.hookDormant,true);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.drumsAudioExported,false);
assert.deepEqual(SONG_STARTER_EXPORT_V1_INFO.files,[
  '01_Foundation_<S.K.Y.-Preset>.mid',
  '02_Support_<S.K.Y.-Preset>.mid',
  'starter-info.json'
]);

const timing=eventTimingTicks({startBeat:4,durationBeats:1,fingerOffsetSeconds:0.02},{bpm:120,ppq:480,totalBeats:32});
assert.equal(timing.startTick,1939,'20 ms at 120 BPM must survive as roughly 19 ticks of human microtiming after beat 4');
assert.equal(timing.endTick,2419);

const foundation={
  role:'foundation',player:'Human Pianist V1.3',preset:'About Time',active:true,gainScale:1,
  export:{filename:'01_Foundation_About-Time.mid'},
  events:[
    {midi:60,velocity:51,startBeat:0,durationBeats:1.8,fingerOffsetSeconds:0.018,role:'bass-root',pass:'A'},
    {midi:67,velocity:58,startBeat:0,durationBeats:1.55,fingerOffsetSeconds:0.031,role:'top-voice',pass:'A'},
    {midi:69,velocity:62,startBeat:16,durationBeats:1.4,fingerOffsetSeconds:0.012,role:'top-voice',pass:'A′'}
  ]
};
const support={
  role:'support',player:'Support / Texture Player V1 · Phase 5 arranged',preset:'Broad Texture',active:true,gainScale:0.48,
  export:{filename:'02_Support_Broad-Texture.mid'},
  events:[
    {midi:64,velocity:38,startBeat:1.2,durationBeats:2.1,fingerOffsetSeconds:0.01,role:'support-harmony',pass:'A'},
    {midi:71,velocity:43,startBeat:22.1,durationBeats:1.7,fingerOffsetSeconds:0.014,role:'support-harmony',pass:'A′'}
  ]
};
const plan={
  bpm:120,energy:0.72,mood:'connection',emotionFilters:['sensual','calm'],
  arrangementIntelligence:{phase:5,version:'1.0',archetype:'memory-bloom'},
  layers:[foundation,support],activeLayerCount:2,hook:null,hookPreset:null
};
const result={
  key:'D',mode:'major',mood:'connection',emotionFilters:['sensual','calm'],
  storyProfile:{primaryTerritory:'connection'},intent:{energyTarget:0.72},
  userEdit:{bar:4,replacement:'bVIIadd9',reason:'user chromatic choice'}
};
const arrangement={
  bpm:120,
  firstPass:{roman:['vi7','IVadd9','I','V'],chords:['Bm7','Gadd9','D','A']},
  secondPass:{roman:['vi7','IVadd9','I','bVIIadd9'],chords:['Bm7','Gadd9','D','Cadd9'],strategy:'custom-afro-substitution'}
};
const drum={originalName:'Afro Banger 118.wav',originalBpm:118,sessionBpm:120,bars:8,pocket:'laid-back',audioIncluded:false};

const midi=layerToMidiBytes(foundation,{bpm:120});
assert.equal(String.fromCharCode(...midi.slice(0,4)),'MThd');
assert.equal(String.fromCharCode(...midi.slice(14,18)),'MTrk');
const midiText=new TextDecoder().decode(midi);
assert.ok(midiText.includes('Foundation — About Time'),'MIDI track must carry the exact S.K.Y. preset as track name metadata');
assert.ok(midiText.includes('A · bars 1–4'));
assert.ok(midiText.includes('A′ · bars 5–8'));
assert.ok(midi.includes(51),'exported MIDI must retain the original Foundation velocity');
assert.ok(midi.includes(62),'A′ velocity must survive export');

const metadata=buildStarterMetadata({plan,result,arrangement,title:'De Camino',drum,exportedAt:'2026-08-29T06:40:00.000Z'});
assert.equal(metadata.phase,6);
assert.equal(metadata.session.bpm,120);
assert.equal(metadata.session.key,'D');
assert.equal(metadata.harmony.secondPass.chords.at(-1),'Cadd9');
assert.equal(metadata.harmony.userEdit.replacement,'bVIIadd9');
assert.deepEqual(metadata.layers.map(layer=>layer.preset),['About Time','Broad Texture']);
assert.deepEqual(metadata.layers.map(layer=>layer.midiFile),['01_Foundation_About-Time.mid','02_Support_Broad-Texture.mid']);
assert.equal(metadata.contract.foundationAndTextureOnly,true);
assert.equal(metadata.contract.hookDormant,true);
assert.equal(metadata.contract.humanPianistMicrotimingPreserved,true);
assert.equal(metadata.drums.audioIncluded,false);

const archive=buildSongStarterArchive({plan,result,arrangement,title:'De Camino',drum,exportedAt:'2026-08-29T06:40:00.000Z'});
assert.equal(archive.filename,'FORTISSIMO_De-Camino_D-major_120BPM.zip');
assert.deepEqual(archive.entries,['01_Foundation_About-Time.mid','02_Support_Broad-Texture.mid','starter-info.json']);
assert.equal(archive.entries.some(name=>name.includes('03_Hook_')),false,'M3/Hook must stay dormant and absent from Phase 6 export');
assert.deepEqual([...archive.bytes.slice(0,4)],[0x50,0x4b,0x03,0x04],'ZIP must begin with a local-file PK signature');
assert.deepEqual([...archive.bytes.slice(-22,-18)],[0x50,0x4b,0x05,0x06],'ZIP must end with an EOCD PK signature');
const zipText=new TextDecoder().decode(archive.bytes);
for(const name of archive.entries)assert.ok(zipText.includes(name),`ZIP directory must contain ${name}`);

const tinyZip=buildStoredZip([{name:'a.txt',data:'A'},{name:'b.txt',data:'B'}]);
assert.equal(tinyZip[0],0x50);assert.equal(tinyZip[1],0x4b);
assert.ok(new TextDecoder().decode(tinyZip).includes('a.txt'));
assert.ok(new TextDecoder().decode(tinyZip).includes('b.txt'));

const eightbarSource=fs.readFileSync('assets/vibe-roulette-eightbar.js','utf8');
assert.ok(eightbarSource.includes('__FORTISSIMO_VIBE_LAST_ARRANGEMENT__'),'current rebuilt/user-edited arrangement must be exposed to Phase 6');
assert.ok(eightbarSource.includes('fortissimo:vibe-arrangement-updated'));

const producerSource=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
assert.ok(producerSource.includes("import('./vibe-roulette-songstarter-export-v1.js')"),'Phase 6 export runtime must load in the browser');
assert.ok(producerSource.includes('phase6ExportAvailable:true'));
assert.ok(!producerSource.includes("import { buildHookPlayerPlan }"),'Hook Player must remain archived after Phase 6');

const exportSource=fs.readFileSync('assets/vibe-roulette-songstarter-export-v1.js','utf8');
for(const token of ['Export Song Starter','Foundation MIDI + Texture MIDI + starter-info.json','navigator.canShare','application/zip','fingerOffsetSeconds','buildPhase5ArrangementDirection','applyPhase5FoundationArrangement'])assert.ok(exportSource.includes(token),`missing Phase 6 export capability: ${token}`);
assert.equal(exportSource.includes('JSZip'),false,'Phase 6 ZIP must not depend on a third-party runtime');
assert.equal(exportSource.includes("import './vibe-roulette-afro-drums-v1.js'"),false,'Phase 6 must not patch or own the Afro drum engine');

// Regression gates for the last approved chord editor. Phase 6 must leave it intact.
const cardEditor=fs.readFileSync('assets/vibe-roulette-per-candidate-editor-v2.js','utf8');
for(const token of ['fortissimo-candidate-card','data-card-shift','data-card-quality','Major','Minor','selectionUsesEditedCandidate:true'])assert.ok(cardEditor.includes(token),`Phase 4.4.1 regression: ${token}`);

console.log('PASS Phase 6 Song Starter Export: exact two-layer MIDI, S.K.Y. preset names, human microtiming, ZIP + metadata, user edits preserved, Hook/drums/editor regressions protected');
