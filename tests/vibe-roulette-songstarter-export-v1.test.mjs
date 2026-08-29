import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SONG_STARTER_EXPORT_V1_INFO,
  eventTimingTicks,
  layerToMidiBytes,
  buildSongStarterMidiPair
} from '../assets/vibe-roulette-songstarter-export-v1.js';

assert.equal(SONG_STARTER_EXPORT_V1_INFO.phase,6);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.version,'1.1.0-desktop-two-midi');
assert.equal(SONG_STARTER_EXPORT_V1_INFO.desktopOnly,true);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.mobileUi,false);
assert.deepEqual(SONG_STARTER_EXPORT_V1_INFO.activeRoles,['foundation','support']);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.hookDormant,true);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.drumsExported,false);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.audioExported,false);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.metadataFileExported,false);
assert.equal(SONG_STARTER_EXPORT_V1_INFO.zipExported,false);
assert.deepEqual(SONG_STARTER_EXPORT_V1_INFO.files,[
  '01_Foundation_<S.K.Y.-Preset>.mid',
  '02_Texture_<S.K.Y.-Preset>.mid'
]);

const timing=eventTimingTicks({startBeat:4,durationBeats:1,fingerOffsetSeconds:0.02},{bpm:120,ppq:480,totalBeats:32});
assert.equal(timing.startTick,1939,'20 ms at 120 BPM must survive as roughly 19 ticks of human microtiming after beat 4');
assert.equal(timing.endTick,2419);

const foundation={
  role:'foundation',player:'Human Pianist V1.3',preset:'About Time',active:true,gainScale:1,
  events:[
    {midi:60,velocity:51,startBeat:0,durationBeats:1.8,fingerOffsetSeconds:0.018,role:'bass-root',pass:'A'},
    {midi:67,velocity:58,startBeat:0,durationBeats:1.55,fingerOffsetSeconds:0.031,role:'top-voice',pass:'A'},
    {midi:69,velocity:62,startBeat:16,durationBeats:1.4,fingerOffsetSeconds:0.012,role:'top-voice',pass:'A′'}
  ]
};
const support={
  role:'support',player:'Support / Texture Player V1 · Phase 5 arranged',preset:'Broad Texture',active:true,gainScale:0.48,
  events:[
    {midi:64,velocity:38,startBeat:1.2,durationBeats:2.1,fingerOffsetSeconds:0.01,role:'support-harmony',pass:'A'},
    {midi:71,velocity:43,startBeat:22.1,durationBeats:1.7,fingerOffsetSeconds:0.014,role:'support-harmony',pass:'A′'}
  ]
};
const plan={
  bpm:120,
  energy:0.72,
  mood:'connection',
  emotionFilters:['sensual','calm'],
  arrangementIntelligence:{phase:5,version:'1.0',archetype:'memory-bloom'},
  layers:[foundation,support],
  activeLayerCount:2,
  hook:null,
  hookPreset:null
};

const foundationMidi=layerToMidiBytes(foundation,{bpm:120});
assert.equal(String.fromCharCode(...foundationMidi.slice(0,4)),'MThd');
assert.equal(String.fromCharCode(...foundationMidi.slice(14,18)),'MTrk');
const foundationText=new TextDecoder().decode(foundationMidi);
assert.ok(foundationText.includes('Foundation — About Time'),'Foundation MIDI must carry the exact S.K.Y. preset as track metadata');
assert.ok(foundationText.includes('A · bars 1–4'));
assert.ok(foundationText.includes('A′ · bars 5–8'));
assert.ok(foundationMidi.includes(51),'exported MIDI must retain the original Foundation velocity');
assert.ok(foundationMidi.includes(62),'A′ velocity must survive export');

const textureMidi=layerToMidiBytes(support,{bpm:120});
const textureText=new TextDecoder().decode(textureMidi);
assert.ok(textureText.includes('Texture — Broad Texture'),'Texture MIDI must identify the exact S.K.Y. Texture preset');
assert.ok(textureMidi.includes(38));
assert.ok(textureMidi.includes(43));

const pair=buildSongStarterMidiPair({plan});
assert.equal(pair.phase,6);
assert.equal(pair.bpm,120);
assert.equal(pair.files.length,2);
assert.deepEqual(pair.files.map(file=>file.role),['foundation','texture']);
assert.deepEqual(pair.files.map(file=>file.preset),['About Time','Broad Texture']);
assert.deepEqual(pair.files.map(file=>file.filename),['01_Foundation_About-Time.mid','02_Texture_Broad-Texture.mid']);
assert.equal(pair.files.some(file=>file.filename.includes('03_Hook_')),false,'M3/Hook must stay dormant and absent from Phase 6 export');
assert.equal(pair.drumsIncluded,false);
assert.equal(pair.audioIncluded,false);
assert.equal(pair.metadataIncluded,false);
assert.equal(pair.zipIncluded,false);
for(const file of pair.files){
  assert.equal(String.fromCharCode(...file.bytes.slice(0,4)),'MThd',`${file.filename} must be a Standard MIDI File`);
}

const eightbarSource=fs.readFileSync('assets/vibe-roulette-eightbar.js','utf8');
assert.ok(eightbarSource.includes('__FORTISSIMO_VIBE_LAST_ARRANGEMENT__'),'current rebuilt/user-edited arrangement must be exposed to Phase 6');
assert.ok(eightbarSource.includes('fortissimo:vibe-arrangement-updated'));

const producerSource=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
assert.ok(producerSource.includes("import('./vibe-roulette-songstarter-export-v1.js')"),'Phase 6 export runtime must load in the browser');
assert.ok(producerSource.includes('phase6ExportAvailable:true'));
assert.ok(!producerSource.includes("import { buildHookPlayerPlan }"),'Hook Player must remain archived after Phase 6');

const exportSource=fs.readFileSync('assets/vibe-roulette-songstarter-export-v1.js','utf8');
for(const token of [
  'Export 2 MIDI',
  'Desktop only · Foundation MIDI + Texture MIDI',
  '02_Texture_',
  'isDesktopExportSurface',
  '(min-width: 900px) and (any-pointer: fine)',
  'fingerOffsetSeconds',
  'buildPhase5ArrangementDirection',
  'applyPhase5FoundationArrangement'
])assert.ok(exportSource.includes(token),`missing Phase 6 final export capability: ${token}`);
assert.equal(exportSource.includes('starter-info.json'),false,'Phase 6 final export must not create or mention a metadata JSON file');
assert.equal(exportSource.includes('application/zip'),false,'Phase 6 final export must not create a ZIP');
assert.equal(exportSource.includes('navigator.share'),false,'Mobile/iOS share-sheet export must be removed');
assert.equal(exportSource.includes('currentDrumMetadata'),false,'Phase 6 final export must not collect drum export metadata');
assert.equal(exportSource.includes("import './vibe-roulette-afro-drums-v1.js'"),false,'Phase 6 must not patch or own the Afro drum engine');

// Regression gates for the last approved chord editor. Phase 6 must leave it intact.
const cardEditor=fs.readFileSync('assets/vibe-roulette-per-candidate-editor-v2.js','utf8');
for(const token of ['fortissimo-candidate-card','data-card-shift','data-card-quality','Major','Minor','selectionUsesEditedCandidate:true'])assert.ok(cardEditor.includes(token),`Phase 4.4.1 regression: ${token}`);

console.log('PASS Phase 6 final: desktop-only two-MIDI Foundation + Texture export, no drums/audio/ZIP/JSON/mobile UI, exact S.K.Y. preset names and Human Pianist timing preserved');
