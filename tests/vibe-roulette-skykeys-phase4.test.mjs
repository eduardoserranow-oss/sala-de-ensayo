import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCatalogCsv} from '../assets/vibe-roulette-skykeys-engine-v1.js';
import {SKYKEYS_PHASE4_INFO,SKYKEYS_SOUND_DIRECTION_CONTRACT,normalizeBodyEnergy,analyzePianistPerformance,buildSoundDirectionContext,deriveMusicalFunction,scorePresetForContext,rankSkyKeysPresets,chooseSkyKeysPreset} from '../assets/vibe-roulette-skykeys-sound-direction-v1.js';

assert.equal(SKYKEYS_PHASE4_INFO.version,'4.0.0');
assert.equal(SKYKEYS_PHASE4_INFO.mutatesPianist,false);
assert.equal(SKYKEYS_PHASE4_INFO.mutatesHarmony,false);
assert.ok(SKYKEYS_PHASE4_INFO.selectionPolicy.includes('musical-function-first'));
assert.equal(SKYKEYS_SOUND_DIRECTION_CONTRACT.deterministic,true);
assert.equal(SKYKEYS_SOUND_DIRECTION_CONTRACT.tasteTrainingMutation,false);
assert.ok(SKYKEYS_SOUND_DIRECTION_CONTRACT.upstreamInvariant.includes('never rewrite harmony'));

assert.equal(normalizeBodyEnergy(90),0);
assert.equal(normalizeBodyEnergy(120),.5);
assert.equal(normalizeBodyEnergy(150),1);
assert.equal(normalizeBodyEnergy(75),.75);

const plan=[
 {midi:60,start:0,duration:.8,velocity:92},{midi:64,start:0,duration:.8,velocity:88},{midi:67,start:0,duration:.8,velocity:86},
 {midi:62,start:1,duration:.7,velocity:90},{midi:65,start:1,duration:.7,velocity:86},{midi:69,start:1,duration:.7,velocity:84}
];
const fingerprint=JSON.stringify(plan);
const perf=analyzePianistPerformance(plan);
assert.ok(perf.density>0&&perf.density<=1);
assert.ok(perf.polyphonyPeak>=3);
assert.equal(JSON.stringify(plan),fingerprint,'performance analysis must not mutate pianist plan');

const keys={id:92,name:'Beautiful Rhodes',function:'Keys',source:'Acoustic',section:'Real Keys',favorite:true,pianistCompatibility:'preferred',roleScores:{main_harmony:.92,rhythmic_chords:.78,support_pad:.28,pluck_arp:.35,hook_lead:.42,texture:.25}};
const guitar={id:99,name:'Nylon Guitar',function:'Plucks',source:'Acoustic',section:'Guitars',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const pad={id:1,name:'Pure Swell',function:'Pads',source:'Synths',section:'Pads',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.42,rhythmic_chords:.22,support_pad:.96,pluck_arp:.12,hook_lead:.28,texture:.78}};
const pluck={id:61,name:'Candy',function:'Plucks',source:'Synths',section:'Plucks',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const lead={id:220,name:'Clean Lead',function:'Leads',source:'Synths',section:'Leads',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.1,rhythmic_chords:.2,support_pad:.1,pluck_arp:.4,hook_lead:.98,texture:.5}};
const catalog=[keys,guitar,pad,pluck,lead];

const sensual=buildSoundDirectionContext({emotionalTerritory:'sensual',bodyEnergy:105,bpm:105,pianistDensity:.58,vocalSpace:.86,performancePlan:plan,seed:'same'});
assert.equal(deriveMusicalFunction(sensual),'main_harmony');
assert.equal(scorePresetForContext(guitar,sensual).blocked,true);
assert.equal(scorePresetForContext(lead,sensual).blocked,true);
const sensualPick=chooseSkyKeysPreset(catalog,sensual,{exploration:0});
assert.ok(sensualPick.preset);
assert.equal(sensualPick.role,'main_harmony');
assert.notEqual(sensualPick.preset.pianistCompatibility,'restricted');

const support=buildSoundDirectionContext({emotionalTerritory:'calma',bodyEnergy:96,bpm:96,pianistDensity:.91,vocalSpace:.8,sectionRole:'support',seed:'support'});
assert.equal(deriveMusicalFunction(support),'support_pad');
assert.ok(chooseSkyKeysPreset(catalog,support,{exploration:0}).preset);

const dance=buildSoundDirectionContext({emotionalTerritory:'fiesta',bodyEnergy:145,bpm:145,pianistDensity:.35,vocalSpace:.8,performancePlan:plan,seed:'dance'});
assert.equal(deriveMusicalFunction(dance),'pluck_arp');
assert.ok(chooseSkyKeysPreset(catalog,dance,{exploration:0}).preset);

const hook=buildSoundDirectionContext({emotionalTerritory:'alegria',bodyEnergy:126,bpm:126,pianistDensity:.3,vocalSpace:.5,role:'hook_lead',seed:'hook'});
assert.equal(deriveMusicalFunction(hook),'hook_lead');
assert.ok(chooseSkyKeysPreset(catalog,hook,{exploration:0}).preset);

const a=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.04}).map(x=>x.preset.name);
const b=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.04}).map(x=>x.preset.name);
assert.deepEqual(a,b,'same context + seed must rank deterministically');
assert.equal(JSON.stringify(plan),fingerprint,'selection must not mutate pianist plan');

const real=parseCatalogCsv(fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8'));
assert.equal(real.length,222);
const realDecision=chooseSkyKeysPreset(real,sensual,{exploration:.02});
assert.ok(realDecision.preset);
assert.equal(realDecision.role,'main_harmony');
assert.notEqual(realDecision.preset.pianistCompatibility,'restricted');

console.log('PASS S.K.Y. Keys Phase 4 Sound Direction contract, contextual roles, guardrails, determinism and pianist invariance');
