import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCatalogCsv} from '../assets/vibe-roulette-skykeys-engine-v1.js';
import {SKYKEYS_PHASE4_INFO,SKYKEYS_SOUND_DIRECTION_CONTRACT,normalizeBodyEnergy,analyzePianistPerformance,buildSoundDirectionContext,deriveMusicalFunction,scorePresetForContext,rankSkyKeysPresets,chooseSkyKeysPreset} from '../assets/vibe-roulette-skykeys-sound-direction-v1.js';

assert.equal(SKYKEYS_PHASE4_INFO.version,'4.0.0');
assert.equal(SKYKEYS_PHASE4_INFO.mutatesPianist,false);
assert.equal(SKYKEYS_PHASE4_INFO.mutatesHarmony,false);
assert.match(SKYKEYS_PHASE4_INFO.selectionPolicy,/musical-function-first/);
assert.equal(SKYKEYS_SOUND_DIRECTION_CONTRACT.deterministic,true);
assert.match(SKYKEYS_SOUND_DIRECTION_CONTRACT.mainRule,/function first/i);
assert.match(SKYKEYS_SOUND_DIRECTION_CONTRACT.upstreamInvariant,/never rewrite harmony/i);

assert.equal(normalizeBodyEnergy(90),0);
assert.equal(normalizeBodyEnergy(120),.5);
assert.equal(normalizeBodyEnergy(150),1);
assert.equal(normalizeBodyEnergy(75),.75);

const performancePlan=[
  {midi:60,start:0,duration:.8,velocity:92},{midi:64,start:0,duration:.8,velocity:88},{midi:67,start:0,duration:.8,velocity:86},
  {midi:62,start:1,duration:.7,velocity:90},{midi:65,start:1,duration:.7,velocity:86},{midi:69,start:1,duration:.7,velocity:84}
];
const performanceFingerprint=JSON.stringify(performancePlan);
const analysis=analyzePianistPerformance(performancePlan);
assert.ok(analysis.density>0&&analysis.density<=1);
assert.ok(analysis.polyphonyPeak>=3);
assert.equal(JSON.stringify(performancePlan),performanceFingerprint);

const keys={id:92,name:'Beautiful Rhodes',function:'Keys',source:'Acoustic',section:'Real Keys',favorite:true,pianistCompatibility:'preferred',roleScores:{main_harmony:.92,rhythmic_chords:.78,support_pad:.28,pluck_arp:.35,hook_lead:.42,texture:.25}};
const guitar={id:99,name:'Nylon Guitar',function:'Plucks',source:'Acoustic',section:'Guitars',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const pad={id:1,name:'Pure Swell',function:'Pads',source:'Synths',section:'Pads',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.42,rhythmic_chords:.22,support_pad:.96,pluck_arp:.12,hook_lead:.28,texture:.78}};
const pluck={id:61,name:'Candy',function:'Plucks',source:'Synths',section:'Plucks',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const lead={id:220,name:'Clean Lead',function:'Leads',source:'Synths',section:'Leads',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.1,rhythmic_chords:.2,support_pad:.1,pluck_arp:.4,hook_lead:.98,texture:.5}};
const catalog=[keys,guitar,pad,pluck,lead];
const settings=name=>name==='Beautiful Rhodes'?{Attack:0,Release:1.45}:{Attack:.01,Release:.5};

const sensual=buildSoundDirectionContext({emotionalTerritory:'sensual',bodyEnergy:105,bpm:105,pianistDensity:.58,vocalSpace:.86,performancePlan,seed:'same'});
assert.equal(deriveMusicalFunction(sensual),'main_harmony');
assert.equal(scorePresetForContext(guitar,sensual).blocked,true,'Guitar must not receive blind full pianist voicings');
assert.equal(scorePresetForContext(lead,sensual).blocked,true,'Lead must not become the main harmonic bed');
assert.equal(chooseSkyKeysPreset(catalog,sensual,{exploration:0,getSettings:settings}).preset.name,'Beautiful Rhodes');

const support=buildSoundDirectionContext({emotionalTerritory:'calma',bodyEnergy:96,bpm:96,pianistDensity:.91,vocalSpace:.8,sectionRole:'support',seed:'support'});
assert.equal(deriveMusicalFunction(support),'support_pad');
assert.equal(chooseSkyKeysPreset(catalog,support,{exploration:0,getSettings:settings}).preset.name,'Pure Swell');

const dance=buildSoundDirectionContext({emotionalTerritory:'fiesta',bodyEnergy:145,bpm:145,pianistDensity:.35,vocalSpace:.8,performancePlan,seed:'dance'});
assert.equal(deriveMusicalFunction(dance),'pluck_arp');
assert.equal(chooseSkyKeysPreset(catalog,dance,{exploration:0,getSettings:settings}).preset.name,'Candy');

const melodicHook=buildSoundDirectionContext({emotionalTerritory:'alegria',bodyEnergy:126,bpm:126,pianistDensity:.3,vocalSpace:.5,role:'hook_lead',seed:'hook'});
assert.equal(chooseSkyKeysPreset(catalog,melodicHook,{exploration:0,getSettings:settings}).preset.name,'Clean Lead');

const a=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.04,getSettings:settings}).map(x=>x.preset.name);
const b=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.04,getSettings:settings}).map(x=>x.preset.name);
assert.deepEqual(a,b,'Same context + seed must produce deterministic ranking');
assert.equal(JSON.stringify(performancePlan),performanceFingerprint,'Sound Direction must not mutate the pianist performance plan');

const real=parseCatalogCsv(fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8'));
assert.equal(real.length,222);
const realSensual=chooseSkyKeysPreset(real,sensual,{exploration:.02});
assert.ok(realSensual.preset);
assert.notEqual(realSensual.preset.pianistCompatibility,'restricted');
assert.notEqual(realSensual.preset.section,'Guitars');
assert.notEqual(realSensual.preset.section,'Vocals');

console.log('PASS S.K.Y. Keys Phase 4 function-first contextual Sound Direction, Body Energy, emotion, pianist density, vocal-space guardrails, determinism and invariance');
