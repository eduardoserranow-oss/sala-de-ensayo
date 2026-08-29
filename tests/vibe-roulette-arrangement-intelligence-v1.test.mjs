import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';
import {
  PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO,
  buildPhase5ArrangementDirection,
  applyPhase5FoundationArrangement,
  applyPhase5SupportArrangement
} from '../assets/vibe-roulette-arrangement-intelligence-v1.js';
import { buildSupportPlayerPlan } from '../assets/vibe-roulette-support-player-v1.js';
import { buildSongStarterProducerPlan } from '../assets/vibe-roulette-songstarter-producer-v1.js';

const chords=['Fadd9','G','Am7','Em7'];
const roman=['IVadd9','V','vi7','iii7'];
const secondChords=['Fadd9','G','Am7','Em7'];
const secondRoman=['IVadd9','V','vi7','iii7'];
const performancePattern={id:'afro-pocket',label:'Afro Pocket',variant:'phase5-ci',tag:'#AfroPocket',variantSeed:'phase5-ci'};
const arrangement={
  bpm:108,performancePattern,
  firstPass:{chords:[...chords],roman:[...roman]},
  secondPass:{chords:[...secondChords],roman:[...secondRoman]}
};
const options={bpm:108,energyTarget:0.68,mood:'connection',emotionFilters:['sensual','calm'],performancePattern,seed:'phase5-ci'};

assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.phase,5);
assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.version,'1.0');
assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.hookDormant,true);
assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.harmonyInvariant,true);
assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.userEditedChordInvariant,true);
assert.equal(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.drumsUntouched,true);
assert.deepEqual(PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.activeRoles,['foundation','support']);

const directionA=buildPhase5ArrangementDirection(arrangement,options);
const directionB=buildPhase5ArrangementDirection(arrangement,options);
assert.deepEqual(directionA,directionB,'Phase 5 arrangement decisions must be deterministic for the same writing direction');
assert.ok(['breath-and-return','memory-bloom','pocket-lift'].includes(directionA.archetype));
assert.equal(directionA.contract.harmonyInvariant,true);
assert.equal(directionA.contract.userEditedChordsInvariant,true);
assert.equal(directionA.contract.midiPitchClassesInvariant,true);
assert.equal(directionA.contract.sharedEightBarClock,true);
assert.equal(directionA.contract.hookDormant,true);

const arrangementBefore=JSON.stringify(arrangement);
const first=buildNeoSoulRhodesPlan(arrangement.firstPass.chords,{...options,roman:arrangement.firstPass.roman,pass:'A',phraseBarOffset:0,seed:options.seed});
const second=buildNeoSoulRhodesPlan(arrangement.secondPass.chords,{...options,roman:arrangement.secondPass.roman,pass:'A′',phraseBarOffset:4,previousRight:first.finalRight,previousPhrasePlan:first,seed:options.seed});
const foundation={
  bpm:108,energy:0.68,mood:'connection',emotionFilters:[...options.emotionFilters],performancePattern,
  firstPass:first,secondPass:second,
  events:[
    ...first.events.map(event=>({...event,pass:'A'})),
    ...second.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+first.voicings.length,pass:'A′'}))
  ]
};

const arrangedFoundation=applyPhase5FoundationArrangement(foundation,directionA);
assert.equal(JSON.stringify(arrangement),arrangementBefore,'Phase 5 must never rewrite the selected/user-edited chord arrangement');
assert.equal(arrangedFoundation.arrangementIntelligence.phase,5);
assert.equal(arrangedFoundation.arrangementIntelligence.harmonyMutated,false);
assert.equal(arrangedFoundation.arrangementIntelligence.pitchesAdded,false);
assert.ok(arrangedFoundation.events.length>0&&arrangedFoundation.events.length<=foundation.events.length,'Foundation arrangement may create space but may not add note events');

const sourceIdentity=new Set(foundation.events.map(event=>`${event.startBeat}|${event.chordIndex}|${event.midi}|${event.role}`));
for(const event of arrangedFoundation.events){
  assert.ok(sourceIdentity.has(`${event.startBeat}|${event.chordIndex}|${event.midi}|${event.role}`),`Phase 5 cannot invent or move Foundation pitches: ${event.midi}`);
  assert.ok(event.arrangementStage,'every retained Foundation event needs an arrangement stage');
}
assert.ok(arrangedFoundation.events.some(event=>Number(event.startBeat)>=16&&event.arrangementPass==='A′'),'A′ must remain present after arrangement');
const baseByIdentity=new Map(foundation.events.map(event=>[`${event.startBeat}|${event.chordIndex}|${event.midi}|${event.role}`,event]));
assert.ok(arrangedFoundation.events.some(event=>{
  const base=baseByIdentity.get(`${event.startBeat}|${event.chordIndex}|${event.midi}|${event.role}`);
  return base&&(event.velocity!==base.velocity||Math.abs(event.durationBeats-base.durationBeats)>.0001);
}),'Phase 5 must audibly evolve dynamics or sustain instead of being a no-op');
assert.ok(new Set(arrangedFoundation.events.filter(event=>event.startBeat>=16).map(event=>event.arrangementStage)).has('remembered-return'),'bar 5 must behave as a remembered return');
assert.ok(new Set(arrangedFoundation.events.filter(event=>event.startBeat>=24&&event.startBeat<28).map(event=>event.arrangementStage)).has('bloom'),'bar 7 must provide the controlled A′ bloom');

const supportFirst=buildSupportPlayerPlan(arrangement.firstPass.chords,{...options,roman:arrangement.firstPass.roman,pass:'A',foundationPlan:arrangedFoundation.firstPass});
const supportSecondRaw=buildSupportPlayerPlan(arrangement.secondPass.chords,{...options,roman:arrangement.secondPass.roman,pass:'A′',foundationPlan:arrangedFoundation.secondPass});
const supportSecond={...supportSecondRaw,events:supportSecondRaw.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+arrangement.firstPass.chords.length,pass:'A′'}))};
const supportBase={...supportFirst,events:[...supportFirst.events,...supportSecond.events]};
const arrangedSupport=applyPhase5SupportArrangement(supportBase,directionA);
assert.equal(arrangedSupport.arrangementIntelligence.phase,5);
assert.equal(arrangedSupport.arrangementIntelligence.foundationCloneForbidden,true);
assert.ok(arrangedSupport.events.length>0&&arrangedSupport.events.length<=supportBase.events.length);
const supportSourcePitches=new Set(supportBase.events.map(event=>event.midi));
assert.ok(arrangedSupport.events.every(event=>supportSourcePitches.has(event.midi)),'Texture arrangement may not invent new notes');
const allChords=[...arrangement.firstPass.chords,...arrangement.secondPass.chords];
const allRoman=[...arrangement.firstPass.roman,...arrangement.secondPass.roman];
for(const event of arrangedSupport.events){
  const safe=new Set(safePitchClassesForChord(allChords[event.chordIndex],{romanToken:allRoman[event.chordIndex],allowColor:true}));
  assert.ok(safe.has(((event.midi%12)+12)%12),`arranged Support note ${event.midi} must remain harmonically safe`);
}
assert.ok(arrangedSupport.events.some(event=>event.arrangementPass==='A′'&&['a-prime-air','support-lift','texture-bloom','texture-recede'].includes(event.arrangementStage)),'Texture must have an intentional A′ arc');

const starter=buildSongStarterProducerPlan(arrangement,{
  foundationPerformance:arrangedFoundation,foundationPreset:'About Time',...options
});
assert.equal(starter.activeLayerCount,2);
assert.deepEqual(starter.layers.map(layer=>layer.role),['foundation','support']);
assert.equal(starter.hook,null);
assert.equal(starter.hookPreset,null);
assert.equal(starter.contract.hookDormant,true);
assert.equal(starter.contract.phase5ArrangementEvolutionActive,true);
assert.equal(starter.contract.phase5ArrangementEvolutionDeferred,false);
assert.equal(starter.contract.harmonyInvariant,true);
assert.equal(starter.contract.userEditedChordInvariant,true);
assert.equal(starter.arrangementIntelligence.phase,5);
assert.equal(starter.support.arrangementIntelligence.phase,5);
assert.equal(starter.exportFiles.length,2);
assert.equal(starter.exportFiles.some(name=>name.includes('03_Hook_')),false);
const essential=event=>({midi:event.midi,velocity:event.velocity,startBeat:event.startBeat,durationBeats:event.durationBeats,fingerOffsetSeconds:event.fingerOffsetSeconds,role:event.role,chordIndex:event.chordIndex,pass:event.pass,arrangementStage:event.arrangementStage});
assert.deepEqual(starter.layers[0].events.map(essential),arrangedFoundation.events.map(essential),'Producer must preserve the already-arranged Human Pianist Foundation exactly');

const arrangementSource=fs.readFileSync('assets/vibe-roulette-arrangement-intelligence-v1.js','utf8');
for(const token of ['statement','breath','remembered-return','lift','bloom','loop-home','texture-bloom','texture-recede','harmonyInvariant:true','hookDormant:true','drumsUntouched:true'])assert.ok(arrangementSource.includes(token),`missing Phase 5 arrangement contract token: ${token}`);
assert.ok(!arrangementSource.includes("from './vibe-roulette-seamless-loop-v1.js'"),'Pure arrangement intelligence must not create a Seamless transport import cycle');
const runtimeSource=fs.readFileSync('assets/vibe-roulette-arrangement-runtime-v1.js','utf8');
for(const token of ['__phase5ArrangementRuntimePatched','transformsFoundationBeforeDecode:true','drumsTouched:false','editorTouched:false'])assert.ok(runtimeSource.includes(token),`missing cycle-safe Phase 5 runtime token: ${token}`);

// Regression gates for the user-approved Phase 4.4.1 editor. Phase 5 may not alter it.
const editor=fs.readFileSync('assets/vibe-roulette-progression-editor-v1.js','utf8');
const cardEditor=fs.readFileSync('assets/vibe-roulette-per-candidate-editor-v2.js','utf8');
const preview=fs.readFileSync('assets/vibe-roulette-chord-preview-v1.js','utf8');
for(const token of ['data-candidate-shift','data-candidate-quality','Major','Minor'])assert.ok(editor.includes(token),`Phase 4.4.1 regression: missing editor token ${token}`);
for(const token of ['fortissimo-candidate-card','data-card-shift','data-card-quality','Major','Minor','selectionUsesEditedCandidate:true'])assert.ok(cardEditor.includes(token),`Phase 4.4.1 regression: missing card-native token ${token}`);
assert.ok(cardEditor.includes('previewAfroChordAlternative({chord,roman,button:preview})'),'Preview must keep reading the live edited card value');
assert.ok(preview.includes("option.querySelector('.alternative-chord')"),'Chord preview compatibility must remain available');

const producerSource=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
assert.ok(!producerSource.includes("import { buildHookPlayerPlan }"),'M3/Hook must remain dormant in Phase 5');
assert.ok(producerSource.includes('phase5ArrangementEvolutionActive:true'));
assert.ok(producerSource.includes('foundationPerformanceUnchanged:true'));
assert.ok(producerSource.includes("import('./vibe-roulette-arrangement-runtime-v1.js')"),'Browser must activate the Phase 5 runtime after existing playback wrappers install');

console.log('PASS Phase 5 Arrangement Intelligence: A statement, A′ remembered evolution, responsive Texture, harmony/editor/drums invariants, two-layer lock preserved');
