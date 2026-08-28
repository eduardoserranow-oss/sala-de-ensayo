import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KeyboardPerformanceSelector, PERFORMANCE_FAMILIES, performanceTimingForBar } from '../assets/vibe-roulette-performance-v1.js';
import { buildCommercialAfroRhodesPlan } from '../assets/vibe-roulette-rhodes-v3.js';
import { chooseRotatingKey } from '../assets/vibe-roulette-engine-v2.js';
import { findModernRelatives, canonicalRomanFamily, MODERN_PERFORMANCE_LENS } from '../assets/vibe-roulette-lineage-v1.js';
import { buildEightBarArrangement } from '../assets/vibe-roulette-eightbar.js';
import { buildSeamlessEightBarPerformance } from '../assets/vibe-roulette-seamless-loop-v1.js';

assert.ok(PERFORMANCE_FAMILIES.length>=7,'keyboard engine needs a broad performance-family pool');
let seq=[0.05,0.05,0.21,0.21,0.42,0.42,0.67,0.67];let cursor=0;
const selector=new KeyboardPerformanceSelector({random:()=>seq[(cursor++)%seq.length],maxHistory:4});
const context={mood:'connection',emotionalState:'love',energyTarget:0.65,storyProfile:{tags:['#Afropop','#RomanticTension'],vibeSignals:[{id:'romantic-tension'}]}};
const p1=selector.select(context);const p2=selector.select(context);const p3=selector.select(context);
assert.notEqual(p1.id,p2.id,'consecutive spins must not repeat the same keyboard performance family');
assert.notEqual(p2.id,p3.id,'consecutive spins must keep changing keyboard family');
assert.notEqual(p1.variant,p2.variant);
const aTiming=performanceTimingForBar(p1,0,{pass:'A',energyTarget:0.65});
const primeTiming=performanceTimingForBar(p1,0,{pass:'A′',energyTarget:0.65});
assert.equal(aTiming.passVariation,false);assert.equal(primeTiming.passVariation,true);

const chords=['Bb','C','Dm','C'];
const planA=buildCommercialAfroRhodesPlan(chords,{roman:['IV','V','vi','V'],bpm:102,energyTarget:0.65,mood:'connection',performancePattern:p1,pass:'A'});
const planB=buildCommercialAfroRhodesPlan(chords,{roman:['IV','V','vi','V'],bpm:102,energyTarget:0.65,mood:'connection',performancePattern:p2,pass:'A'});
assert.notEqual(planA.profile,planB.profile);
assert.notDeepEqual(planA.events.map(e=>Number(e.startBeat.toFixed(3))),planB.events.map(e=>Number(e.startBeat.toFixed(3))),'different keyboard families must create measurably different rhythmic event maps');
assert.match(planA.style,/Modern|Afro/);

const keys=[{key:'Eb',distance:0},{key:'Ab',distance:1},{key:'E',distance:1},{key:'B',distance:2}];
const picked=chooseRotatingKey(keys,[3],()=>0.01);
assert.notEqual(picked.key,'Eb','recent pitch class must receive a strong anti-repeat penalty');

assert.equal(canonicalRomanFamily(['IVmaj7','V','vi7','V7']),'IV-V-vi-V');
const relatives=findModernRelatives(['IV','V','vi','V']);
assert.ok(relatives.some(item=>item.artist==='Beéle'));
assert.ok(relatives.every(item=>item.evidenceClass!=='verified-historical-corpus'),'modern relatives must remain separately labeled from verified heritage evidence');
assert.ok(MODERN_PERFORMANCE_LENS.references.includes('Daramola'));
assert.ok(MODERN_PERFORMANCE_LENS.references.includes('Tems'));
assert.ok(MODERN_PERFORMANCE_LENS.references.includes('Victony'));

const result={
  id:'spin-unique-1',progressionId:'test',mood:'connection',emotionalState:'love',key:'F',mode:'major',roman:['IV','V','vi','V'],
  performancePattern:p1,intent:{energyTarget:0.65}
};
const arrangement=buildEightBarArrangement(result,{energyTarget:0.65});
assert.equal(arrangement.performancePattern.id,p1.id);
const eight=buildSeamlessEightBarPerformance(arrangement,{bpm:102,energyTarget:0.65,mood:'connection'});
assert.equal(eight.totalBeats,32);
assert.equal(eight.performancePattern.id,p1.id);
assert.equal(eight.firstPass.pass,'A');
assert.equal(eight.secondPass.pass,'A′');
assert.notDeepEqual(eight.firstPass.events.map(e=>Number(e.startBeat.toFixed(3))),eight.secondPass.events.map(e=>Number(e.startBeat.toFixed(3))),'A′ performance should evolve rhythmically even when chord identity stays related');

const story=fs.readFileSync('assets/vibe-roulette-story-v2.js','utf8');
assert.ok(story.includes('Historical DNA stays separate from present-day relatives'));
assert.ok(story.includes('Modern performance lens'));
const engine=fs.readFileSync('assets/vibe-roulette-engine-v2.js','utf8');
assert.ok(engine.includes('chooseRotatingKey'));
assert.ok(engine.includes('KeyboardPerformanceSelector'));
assert.ok(engine.includes('buildLineageSummary'));

console.log('PASS Vibe Roulette keyboard performance diversity, key rotation and historical-to-modern lineage policy');

