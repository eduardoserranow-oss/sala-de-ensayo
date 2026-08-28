import fs from 'node:fs';
import assert from 'node:assert/strict';
import { commercialProgressionWeight, afroTropicalStyleWeight } from '../assets/vibe-roulette-groove.js';
import { buildSecondPassRoman } from '../assets/vibe-roulette-eightbar.js';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { performanceComplexityBudget } from '../assets/vibe-roulette-afro-commercial-v11.js';

assert.ok(commercialProgressionWeight(['IV','V','vi','V'])>commercialProgressionWeight(['I','ii','V','I','vi','ii','V']), 'Afro-commercial four-chord formulas should outrank longer harmonic chains');
assert.ok(afroTropicalStyleWeight(['afropop','latin'])>afroTropicalStyleWeight(['jazz','fusion']), 'Afro/Latin identity must outrank jazz-only affinity');

let phrasing=0,color=0,turnaround=0;
for(let i=0;i<1000;i+=1){
  const result=buildSecondPassRoman(['IV','V','vi','V'],{mode:'major',mood:'connection',energyTarget:0.65,seed:`discipline-${i}`});
  if(result.roman.length>4||/turnaround|dominant-strengthening/.test(result.variationEvents.map(e=>e.kind).join('|')))turnaround+=1;
  else if(result.strategy==='early-color'||result.strategy==='middle-color')color+=1;
  else phrasing+=1;
}
assert.ok(phrasing>=650,`A-prime should stay performance-led most of the time; got ${phrasing}/1000`);
assert.ok(color<=260,`harmonic color should remain secondary; got ${color}/1000`);
assert.ok(turnaround<=100,`functional turnarounds must stay at or below 10%; got ${turnaround}/1000`);

const pocket={id:'afro-pocket',label:'Afro Pocket',variant:'test',tag:'#AfroPocket',variantSeed:'discipline-test'};
const simple=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],bpm:102,energyTarget:0.62,mood:'connection',performancePattern:pocket,seed:'simple'});
assert.equal(simple.profile,'fortissimo-neo-soul-player-v1.2');
assert.ok(simple.events.every(event=>Number(event.releaseTailSeconds||0)>=0.06),'V1.2 should give every event a non-abrupt release tail');
const sustained=simple.events.filter(event=>['top-voice','inner-voice','bass-root','bass-tenth'].includes(event.role));
assert.ok(sustained.some(event=>event.continuityIntent==='staggered-stabs'),'4-5-6-5 should receive the observed staggered-stab pocket');
assert.ok(simple.events.every(event=>event.role!=='bass-tenth'),'core Afro formulas should use a roots-only left hand by default');

const richBudget=performanceComplexityBudget(['Imaj7','vi7','ii7','V7']);
const simpleBudget=performanceComplexityBudget(['I','vi','IV','V']);
assert.ok(richBudget.performance<simpleBudget.performance,'richer harmony must reduce performance complexity budget');

const seamless=fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8');
assert.ok(seamless.includes("vibe-roulette-neo-soul-player-v12.js"),'main 8-bar transport must route through V1.2');
assert.ok(seamless.includes('releaseTailSeconds'),'renderer must honor musical release tails');

console.log('PASS Neo-Soul Player V1.2 Afro commercial discipline, A-prime restraint and pocket contract');
