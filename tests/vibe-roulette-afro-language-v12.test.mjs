import fs from 'node:fs';
import assert from 'node:assert/strict';
import { classifyAfroProgression, afroLanguageWeight, afroPocketPolicy } from '../assets/vibe-roulette-afro-language-v12.js';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';

const core236=classifyAfroProgression(['ii','iii','vi']);
assert.equal(core236.id,'relative-minor-236');
assert.deepEqual(core236.relativeMinor,['iv','v','i']);
assert.equal(core236.rank,'core');
assert.deepEqual(classifyAfroProgression(['vi','ii','iii']).relativeMinor,['i','iv','v']);
assert.ok(afroLanguageWeight({roman:['ii','iii','vi']})>afroLanguageWeight({roman:['iii','vi','ii']}),'2-3-6 permutations must not be ranked equally');
assert.ok(afroLanguageWeight({roman:['IV','V','vi','V']})>afroLanguageWeight({roman:['vi','ii','V','I']}),'core commercial lift-return should outrank conditional functional cadence');

const stab=afroPocketPolicy({roman:['IV','V','vi','V'],bpm:95});
assert.equal(stab.archetype,'staggered-stabs');
assert.equal(stab.leftHandMode,'roots-only');
assert.ok(stab.sustainRatio<0.55);
const compound=afroPocketPolicy({roman:['vi','V','IV'],timeSignature:'6/8'});
assert.equal(compound.archetype,'compound-6-8-arpeggio');
assert.deepEqual(compound.arpeggioContour,['root','third','fifth','third','octave','fifth']);

const plan=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],bpm:95,energyTarget:0.66,mood:'connection',seed:'v12-test'});
assert.equal(plan.profile,'fortissimo-neo-soul-player-v1.2');
assert.equal(plan.afroPocket.archetype,'staggered-stabs');
assert.ok(plan.events.every(event=>event.role!=='bass-tenth'));
for(const event of plan.events.filter(event=>['top-voice','inner-voice'].includes(event.role))){
  const chordSpan=plan.plan[event.chordIndex].beats;
  assert.ok(event.durationBeats<=chordSpan*0.48+0.001,'staggered gestures must leave intentional space');
}
assert.equal(plan.harmonicSafety.count,0,'V1.2 must preserve the existing safe voicing engine');

const dataset=JSON.parse(fs.readFileSync('data/vibe-roulette/afrobeats-practitioner-v0.2.json','utf8'));
assert.equal(dataset.progressions.length,11);
assert.ok(dataset.progressions.every(item=>item.evidenceClass==='PRACTITIONER_EDUCATIONAL'));
assert.ok(dataset.progressions.every(item=>item.evidence.every(entry=>entry.verified===false)));
assert.ok(dataset.progressions.every(item=>!String(item.evidenceClass).includes('BILLBOARD')));
const permutations=new Set(dataset.progressions.filter(item=>item.relativeMinorRoman).map(item=>item.roman.join('-')));
assert.deepEqual(permutations,new Set(['ii-iii-vi','vi-ii-iii','iii-ii-vi','vi-iii-ii','ii-vi-iii','iii-vi-ii']));

const html=fs.readFileSync('vibe-roulette.html','utf8');
assert.ok(html.includes('afrobeats-practitioner-v0.2.json'));
assert.ok(html.includes('PRACTITIONER · EDUCATIONAL'));
assert.ok(html.includes('not chart or historical verification'));

console.log('PASS Afro language V1.2 families, evidence boundary, pocket and preserved harmonic safety');
