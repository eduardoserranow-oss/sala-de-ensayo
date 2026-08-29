import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';
import { buildSongStarterProducerPlan, SONG_STARTER_PRODUCER_V1_INFO } from '../assets/vibe-roulette-songstarter-producer-v1.js';

const chords=['F','G','Am','G'];
const roman=['IV','V','vi','V'];
const performancePattern={id:'afro-pocket',label:'Afro Pocket',variant:'phase42-ci',tag:'#AfroPocket',variantSeed:'phase42-ci'};
const arrangement={bpm:104,performancePattern,firstPass:{chords:[...chords],roman:[...roman]},secondPass:{chords:[...chords],roman:[...roman]}};
const options={bpm:104,energyTarget:0.76,mood:'connection',emotionFilters:['hope','intimacy'],performancePattern,seed:'phase42-ci'};
const first=buildNeoSoulRhodesPlan(arrangement.firstPass.chords,{...options,roman:arrangement.firstPass.roman,pass:'A',phraseBarOffset:0});
const second=buildNeoSoulRhodesPlan(arrangement.secondPass.chords,{...options,roman:arrangement.secondPass.roman,pass:'A′',phraseBarOffset:4,previousRight:first.finalRight});
const foundation={
  bpm:104,energy:0.76,mood:'connection',emotionFilters:['hope','intimacy'],firstPass:first,secondPass:second,
  events:[...first.events.map(event=>({...event,pass:'A'})),...second.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+first.voicings.length,pass:'A′'}))]
};
const starter=buildSongStarterProducerPlan(arrangement,{foundationPerformance:foundation,foundationPreset:'About Time',bpm:104,energyTarget:0.76,mood:'connection',emotionFilters:['hope','intimacy'],seed:'phase42-ci'});

assert.equal(SONG_STARTER_PRODUCER_V1_INFO.phase,4.2);
assert.equal(SONG_STARTER_PRODUCER_V1_INFO.version,'1.2-two-layer-lock');
assert.equal(SONG_STARTER_PRODUCER_V1_INFO.maxMusicalLayers,2);
assert.equal(SONG_STARTER_PRODUCER_V1_INFO.supportAlwaysActive,true);
assert.equal(SONG_STARTER_PRODUCER_V1_INFO.hookDormant,true);
assert.deepEqual(SONG_STARTER_PRODUCER_V1_INFO.activeRoles,['foundation','support']);
assert.equal(starter.activeLayerCount,2);
assert.deepEqual(starter.layers.map(layer=>layer.role),['foundation','support']);
assert.equal(starter.layers[0].preset,'About Time');
assert.ok(['Always Danger','Broad Texture'].includes(starter.layers[1].preset));
assert.equal(starter.hook,null);
assert.equal(starter.hookPreset,null);
assert.equal(starter.contract.supportAlwaysActive,true);
assert.equal(starter.contract.hookDormant,true);
assert.equal(starter.contract.maxMusicalLayers,2);
assert.deepEqual(starter.contract.activeRoles,['foundation','support']);
assert.equal(starter.contract.foundationPerformanceUnchanged,true);
assert.equal(starter.contract.separateMidiPerLayer,true);
assert.equal(starter.contract.sharedTransport,true);

const essential=event=>({midi:event.midi,velocity:event.velocity,startBeat:event.startBeat,durationBeats:event.durationBeats,fingerOffsetSeconds:event.fingerOffsetSeconds,role:event.role,chordIndex:event.chordIndex,pass:event.pass});
assert.deepEqual(starter.layers[0].events.map(essential),foundation.events.map(essential),'Phase 4.2 must not rewrite the Human Pianist Foundation performance');

const support=starter.layers[1];
assert.ok(support.events.length>0,'Texture must always compose real independent MIDI events');
assert.ok(support.events.every(event=>event.layerRole==='support'));
assert.ok(support.events.some(event=>event.pass==='A′'&&event.startBeat>=16));
assert.ok(support.events.every(event=>event.startBeat>=0&&event.startBeat<32));
const allChords=[...arrangement.firstPass.chords,...arrangement.secondPass.chords];
const allRoman=[...arrangement.firstPass.roman,...arrangement.secondPass.roman];
for(const event of support.events){
  const safe=new Set(safePitchClassesForChord(allChords[event.chordIndex],{romanToken:allRoman[event.chordIndex],allowColor:true}));
  assert.ok(safe.has(((event.midi%12)+12)%12),`support note ${event.midi} must stay harmonically safe`);
}
const signature=events=>events.map(event=>`${event.startBeat.toFixed(3)}:${event.midi}:${event.role}`).join('|');
assert.notEqual(signature(support.events),signature(foundation.events),'Support MIDI may never clone Foundation');

assert.equal(starter.exportFiles.length,2);
assert.equal(starter.exportFiles[0],'01_Foundation_About-Time.mid');
assert.ok(starter.exportFiles[1].startsWith('02_Support_')&&starter.exportFiles[1].endsWith('.mid'));
assert.equal(starter.exportFiles.some(name=>name.includes('03_Hook_')),false);
assert.equal(starter.metadataFile,'starter-info.json');

const producer=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
assert.ok(!producer.includes("import { buildHookPlayerPlan }"),'Hook Player stays archived and must not be imported into the active producer');
assert.ok(producer.includes("hook:'archived/dormant; never generated, played or exported"));
assert.ok(producer.includes("architecture:'Foundation + Support/Texture + existing Afro drums'"));

const runtime=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');
for(const token of ['buildStarterPlan(','preloadStarterLayer','__songStarterPhase4Layers','activeSongStarterLayers','presetName:layer.preset','gainScale:layer.gainScale','SONG STARTER AUDIO ACTIVE'])assert.ok(runtime.includes(token),`missing Song Starter runtime token: ${token}`);
assert.ok(runtime.includes('originalPrepareSources.call(this,token)'));
assert.ok(fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8').includes('scheduleDrum'));

const webPack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
for(const preset of ['About Time','Beautiful Rhodes','Soft Piano','Modest Wurli','Grand Piano','Always Danger','Broad Texture','Hidden Whistle','Toy Piano','Warm Pluck'])assert.ok(webPack.includes(preset),`hosted preset missing from web pack: ${preset}`);

console.log('PASS Song Starter Phase 4.2: permanent Foundation + Support/Texture pair, no Hook playback/export, Foundation invariance, shared clock and drums/fallback protection');
