import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VibeRouletteEngine, progressionToChords } from '../assets/vibe-roulette-engine.js';
import {
  AFRO_HARMONY_DNA_PROGRESSIONS,
  AFRO_HARMONY_DNA_V2_INFO,
  referenceDnaSimilarity,
  afroHarmonyDnaWeight
} from '../assets/vibe-roulette-afro-harmony-dna-v2.js';

assert.equal(AFRO_HARMONY_DNA_V2_INFO.phase,4.3);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.version,'2.0-reference-dna-b1');
assert.equal(AFRO_HARMONY_DNA_V2_INFO.referenceMidiCount,22);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.pairedAudioCount,21);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.analyzedMidiNoteCount,1360);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.harmonicRoleReferenceCount,19);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.derivedFamilyCount,14);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.activeSelectionBias,.86);
assert.equal(AFRO_HARMONY_DNA_V2_INFO.rawReferenceAssetsEmbedded,false);
assert.equal(AFRO_HARMONY_DNA_PROGRESSIONS.length,14);

for(const item of AFRO_HARMONY_DNA_PROGRESSIONS){
  assert.equal(item.referenceDna,true);
  assert.ok(item.roman.length>=2&&item.roman.length<=4,`${item.id} must stay a compact 2–4 chord writing family`);
  assert.ok(['major','minor'].includes(item.mode));
  assert.ok(Number(item.evidenceConfidence)>=.78);
  const key=item.mode==='minor'?'A':'C';
  const chords=progressionToChords(item.roman,key,item.mode);
  assert.equal(chords.length,item.roman.length,`${item.id} must render through the existing Roman/chord engine`);
  assert.ok(chords.every(Boolean));
  assert.ok(item.chorusVariation?.roman?.length>=2);
}

const exact=referenceDnaSimilarity(['i7','VIIadd9','VImaj7','VIIadd9'],'minor');
assert.ok(exact.score>.99,'an exact curated DNA family should score as a near-perfect match');
assert.equal(exact.family.referenceDnaFamily,'afro-minor-descending-1767');
const dnaWeight=afroHarmonyDnaWeight(exact.family,{energyTarget:.72});
assert.ok(dnaWeight>1.9,'curated Reference DNA should receive a strong harmony prior');

const legacy={
  id:'legacy-test-1451',roman:['I','IV','V','I'],mode:'major',provisional:false,evidenceConfidence:.8,
  mood:{illusion:.6,nostalgia:.6,connection:.6,energy:.6,movement:.6},
  styleAffinity:['pop'],evidence:[],
  chorusVariation:{strategy:'legacy',roman:['I','IV','V','I'],note:'legacy control'}
};
const dataset={
  version:'phase43-test',sources:[],songs:[],
  vocalProfiles:[{id:'serra'}],
  progressions:[legacy]
};

const dnaEngine=new VibeRouletteEngine(dataset,{random:()=>0});
const dnaResult=dnaEngine.spin({mood:'nostalgia'});
assert.equal(dnaResult.referenceDna,true,'the curated bank should drive the Spin when the Reference-DNA gate is selected');
assert.equal(dnaResult.evidenceClass,'REFERENCE_DNA_CURATED');
assert.ok(dnaResult.harmonyDna?.family);
assert.equal(dnaResult.harmonyDna.rawReferenceAssetsEmbedded,false);
assert.equal(dnaEngine.dataset.progressions.length,1,'temporary DNA candidate routing must restore the original dataset after Spin');
assert.equal(dnaEngine.dataset.progressions[0].id,legacy.id);

const explorationEngine=new VibeRouletteEngine(dataset,{random:()=>.99});
const explorationResult=explorationEngine.spin({mood:'nostalgia'});
assert.equal(Boolean(explorationResult.referenceDna),false,'the exploration window must preserve access to the legacy verified/practitioner corpus');
assert.equal(explorationResult.progressionId,legacy.id);

const source=fs.readFileSync('assets/vibe-roulette-afro-harmony-dna-v2.js','utf8');
assert.ok(!/\.mid\b|\.mp3\b|\.wav\b/i.test(source),'raw premium reference filenames/assets must not be embedded in the public runtime DNA module');
assert.ok(source.includes('22 user-supplied MIDI references'));
assert.ok(source.includes('21 had paired audio'));
assert.ok(source.includes('19 sources carried useful harmonic-role information'));

const groove=fs.readFileSync('assets/vibe-roulette-groove.js','utf8');
assert.ok(groove.includes("import './vibe-roulette-afro-harmony-dna-v2.js';"),'Phase 4.3 DNA must load on the live progression-selection module graph');
const producer=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
assert.ok(producer.includes("activeRoles:['foundation','support']"),'Phase 4.3 must preserve the Phase 4.2 two-layer lock');
assert.ok(producer.includes('hookDormant:true'),'Phase 4.3 must not reactivate M3/Hook');
const drums=fs.readFileSync('assets/vibe-roulette-afro-drums-v1.js','utf8');
assert.ok(!drums.includes('afro-harmony-dna-v2'),'Phase 4.3 must not mutate the drum engine');

console.log('PASS Phase 4.3 Afro Harmony DNA: 22 MIDI / 21 audio Reference DNA, compact transposable progression families, strong curated selection prior, legacy exploration, no raw premium assets, and Phase 4.2/drums preserved');
