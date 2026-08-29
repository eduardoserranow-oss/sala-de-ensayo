import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';
import { buildSongStarterProducerPlan, SONG_STARTER_PRODUCER_V1_INFO } from '../assets/vibe-roulette-songstarter-producer-v1.js';

const chords=['F','G','Am','G'];
const roman=['IV','V','vi','V'];
const performancePattern={id:'afro-pocket',label:'Afro Pocket',variant:'phase4-ci',tag:'#AfroPocket',variantSeed:'phase4-ci'};
const arrangement={
  bpm:104,
  performancePattern,
  firstPass:{chords:[...chords],roman:[...roman]},
  secondPass:{chords:[...chords],roman:[...roman]}
};
const options={bpm:104,energyTarget:0.76,mood:'connection',emotionFilters:['hope','intimacy'],performancePattern,seed:'phase4-ci'};
const first=buildNeoSoulRhodesPlan(arrangement.firstPass.chords,{...options,roman:arrangement.firstPass.roman,pass:'A',phraseBarOffset:0});
const second=buildNeoSoulRhodesPlan(arrangement.secondPass.chords,{...options,roman:arrangement.secondPass.roman,pass:'A′',phraseBarOffset:4,previousRight:first.finalRight});
const foundation={
  bpm:104,energy:0.76,mood:'connection',emotionFilters:['hope','intimacy'],firstPass:first,secondPass:second,
  events:[
    ...first.events.map(event=>({...event,pass:'A'})),
    ...second.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+first.voicings.length,pass:'A′'}))
  ]
};
const starter=buildSongStarterProducerPlan(arrangement,{
  foundationPerformance:foundation,
  foundationPreset:'About Time',
  bpm:104,energyTarget:0.76,mood:'connection',emotionFilters:['hope','intimacy'],seed:'phase4-ci'
});

assert.equal(SONG_STARTER_PRODUCER_V1_INFO.phase,4);
assert.equal(SONG_STARTER_PRODUCER_V1_INFO.maxMusicalLayers,3);
assert.equal(starter.profile,'fortissimo-songstarter-producer-v1');
assert.equal(starter.phase,4);
assert.equal(starter.activeLayerCount,3,'this energetic/intimate test direction should produce Foundation + Support + Hook');
assert.deepEqual(starter.layers.map(layer=>layer.role),['foundation','support','hook']);
assert.equal(starter.layers[0].preset,'About Time');
assert.ok(['Always Danger','Broad Texture'].includes(starter.layers[1].preset));
assert.ok(['Hidden Whistle','Toy Piano','Warm Pluck'].includes(starter.layers[2].preset));
assert.equal(starter.contract.foundationPerformanceUnchanged,true);
assert.equal(starter.contract.separateMidiPerLayer,true);
assert.equal(starter.contract.sharedTransport,true);
assert.equal(starter.contract.phase5ArrangementEvolutionDeferred,true);

const essential=event=>({midi:event.midi,velocity:event.velocity,startBeat:event.startBeat,durationBeats:event.durationBeats,fingerOffsetSeconds:event.fingerOffsetSeconds,role:event.role,chordIndex:event.chordIndex,pass:event.pass});
assert.deepEqual(starter.layers[0].events.map(essential),foundation.events.map(essential),'Phase 4 must not rewrite the Human Pianist Foundation performance');

const support=starter.layers.find(layer=>layer.role==='support');
const hook=starter.layers.find(layer=>layer.role==='hook');
assert.ok(support.events.length>0&&hook.events.length>0,'Support and Hook must compose real independent MIDI events');
assert.ok(support.events.every(event=>event.layerRole==='support'));
assert.ok(hook.events.every(event=>event.layerRole==='hook'));
assert.ok(support.events.some(event=>event.pass==='A′'&&event.startBeat>=16),'Support must cover A-prime without requiring Phase 5 arrangement entry/exit logic');
assert.ok(hook.events.some(event=>event.pass==='A′'&&event.startBeat>=16),'Hook must cover A-prime without requiring Phase 5 arrangement entry/exit logic');
assert.ok([...support.events,...hook.events].every(event=>event.startBeat>=0&&event.startBeat<32),'all role-aware MIDI must stay inside the shared 8-bar clock');

const allChords=[...arrangement.firstPass.chords,...arrangement.secondPass.chords];
const allRoman=[...arrangement.firstPass.roman,...arrangement.secondPass.roman];
for(const layer of [support,hook]){
  for(const event of layer.events){
    const safe=new Set(safePitchClassesForChord(allChords[event.chordIndex],{romanToken:allRoman[event.chordIndex],allowColor:true}));
    assert.ok(safe.has(((event.midi%12)+12)%12),`${layer.role} note ${event.midi} must stay harmonically safe for ${allChords[event.chordIndex]}`);
  }
}

const signature=events=>events.map(event=>`${event.startBeat.toFixed(3)}:${event.midi}:${event.role}`).join('|');
assert.notEqual(signature(support.events),signature(foundation.events),'Support MIDI may never clone Foundation');
assert.notEqual(signature(hook.events),signature(foundation.events),'Hook MIDI may never clone Foundation');
assert.notEqual(signature(hook.events),signature(support.events),'Support and Hook must remain different musicians');

assert.equal(starter.exportFiles.length,3);
assert.equal(starter.exportFiles[0],'01_Foundation_About-Time.mid');
assert.ok(starter.exportFiles[1].startsWith('02_Support_')&&starter.exportFiles[1].endsWith('.mid'));
assert.ok(starter.exportFiles[2].startsWith('03_Hook_')&&starter.exportFiles[2].endsWith('.mid'));
assert.equal(starter.metadataFile,'starter-info.json');

const runtime=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');
for(const token of [
  "import {buildSongStarterProducerPlan,SONG_STARTER_PRODUCER_V1_INFO}",
  'buildStarterPlan(',
  'preloadStarterLayer',
  '__songStarterPhase4Layers',
  'activeSongStarterLayers',
  'presetName:layer.preset',
  'gainScale:layer.gainScale',
  'SONG STARTER AUDIO ACTIVE',
  'Support/Hook decoding failures do not silence a playable Foundation',
  'separate role-aware MIDI'
]) assert.ok(runtime.includes(token),`missing Phase 4 runtime token: ${token}`);
assert.ok(runtime.includes('originalPrepareSources.call(this,token)'),'existing Rhodes preparation must remain as the Foundation safety fallback');
assert.ok(fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8').includes('scheduleDrum'),'existing drum scheduler remains owned by the shared transport');

const webPack=fs.readFileSync('assets/vibe-roulette-skykeys-web-pack-v1.js','utf8');
for(const preset of ['About Time','Beautiful Rhodes','Soft Piano','Modest Wurli','Grand Piano','Always Danger','Broad Texture','Hidden Whistle','Toy Piano','Warm Pluck'])assert.ok(webPack.includes(preset),`hosted Song Starter preset missing from web pack: ${preset}`);

console.log('PASS Song Starter Phase 4: 2/3-layer producer architecture, independent role MIDI, actual S.K.Y. preset routing/preload, Foundation invariance, 8-bar shared clock, export metadata and drums/fallback protection');
