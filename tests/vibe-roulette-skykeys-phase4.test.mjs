import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSoundDirectionContext,deriveMusicalFunction,scorePresetForContext,rankSkyKeysPresets,chooseSkyKeysPreset,SKYKEYS_PHASE4_INFO} from '../assets/vibe-roulette-skykeys-sound-direction-v1.js';

assert.equal(SKYKEYS_PHASE4_INFO.version,'4.0.0');
assert.equal(SKYKEYS_PHASE4_INFO.mutatesPianist,false);
assert.equal(SKYKEYS_PHASE4_INFO.mutatesHarmony,false);
assert.equal(SKYKEYS_PHASE4_INFO.selectionPolicy,'function-first-contextual-ranking');

const keys={id:92,name:'Beautiful Rhodes',function:'Keys',source:'Acoustic',section:'Real Keys',favorite:true,pianistCompatibility:'preferred',roleScores:{main_harmony:.92,rhythmic_chords:.78,support_pad:.28,pluck_arp:.35,hook_lead:.42,texture:.25}};
const guitar={id:99,name:'Nylon Guitar',function:'Plucks',source:'Acoustic',section:'Guitars',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const pad={id:1,name:'Pure Swell',function:'Pads',source:'Synths',section:'Pads',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.42,rhythmic_chords:.22,support_pad:.96,pluck_arp:.12,hook_lead:.28,texture:.78}};
const pluck={id:61,name:'Candy',function:'Plucks',source:'Synths',section:'Plucks',favorite:false,pianistCompatibility:'conditional',roleScores:{main_harmony:.28,rhythmic_chords:.72,support_pad:.12,pluck_arp:.97,hook_lead:.78,texture:.38}};
const lead={id:220,name:'Clean Lead',function:'Leads',source:'Synths',section:'Leads',favorite:false,pianistCompatibility:'restricted',roleScores:{main_harmony:.1,rhythmic_chords:.2,support_pad:.1,pluck_arp:.4,hook_lead:.98,texture:.5}};
const catalog=[keys,guitar,pad,pluck,lead];

const sensual=buildSoundDirectionContext({emotionalTerritory:'sensual',bodyEnergy:.34,bpm:102,pianistDensity:.58,vocalSpace:.86,seed:'same'});
assert.equal(deriveMusicalFunction(sensual),'main_harmony');
assert.equal(scorePresetForContext(guitar,sensual).blocked,true,'Guitar must not receive blind full pianist voicings');
assert.equal(scorePresetForContext(lead,sensual).blocked,true,'Lead must not become main harmonic bed');
const sensualPick=chooseSkyKeysPreset(catalog,sensual,{exploration:0});
assert.equal(sensualPick.preset.name,'Beautiful Rhodes');

const support=buildSoundDirectionContext({emotionalTerritory:'calma',bodyEnergy:.25,bpm:96,pianistDensity:.91,vocalSpace:.8,sectionRole:'support',seed:'support'});
assert.equal(deriveMusicalFunction(support),'support_pad');
assert.equal(chooseSkyKeysPreset(catalog,support,{exploration:0}).preset.name,'Pure Swell');

const dance=buildSoundDirectionContext({emotionalTerritory:'fiesta',bodyEnergy:.88,bpm:130,pianistDensity:.35,vocalSpace:.8,role:'pluck_arp',seed:'dance'});
assert.equal(chooseSkyKeysPreset(catalog,dance,{exploration:0}).preset.name,'Candy');

const hook=buildSoundDirectionContext({emotionalTerritory:'alegria',bodyEnergy:.86,bpm:126,pianistDensity:.30,vocalSpace:.5,sectionRole:'hook',seed:'hook'});
assert.equal(deriveMusicalFunction(hook),'hook_lead');
assert.equal(chooseSkyKeysPreset(catalog,hook,{exploration:0}).preset.name,'Clean Lead');

const a=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.05}).map(x=>x.preset.name);
const b=rankSkyKeysPresets(catalog,sensual,{limit:5,exploration:.05}).map(x=>x.preset.name);
assert.deepEqual(a,b,'Same context + seed must produce deterministic ranking');

const source=fs.readFileSync('assets/vibe-roulette-skykeys-sound-direction-v1.js','utf8');
for(const token of ['bodyEnergy','pianistDensity','vocalSpace','emotionalTerritory','emotions','afroPriority','neoSoulHands','function-first-contextual-ranking'])assert.ok(source.includes(token),`missing context token ${token}`);
assert.ok(source.includes('guitar-needs-guitar-appropriate-pattern'));
assert.ok(source.includes('vocal-not-default-harmonic-bed'));

console.log('PASS S.K.Y. Keys Phase 4 sound direction: function-first contextual ranking, emotion/body-energy intelligence, guardrails and deterministic selection');
