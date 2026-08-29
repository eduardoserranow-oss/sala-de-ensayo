import assert from 'node:assert/strict';
import { buildNeoSoulRhodesPlan as buildHuman, NEO_SOUL_PLAYER_V13_INFO } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { buildNeoSoulRhodesPlan as buildV11 } from '../assets/vibe-roulette-neo-soul-player-v11.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';
import { HUMAN_PERFORMANCE_DNA_B1, HUMAN_PERFORMANCE_DNA_B1_CONTRACT } from '../assets/vibe-roulette-human-performance-dna-b1.js';

assert.equal(HUMAN_PERFORMANCE_DNA_B1.midiReferences,22);
assert.equal(HUMAN_PERFORMANCE_DNA_B1.audioPairs,21);
assert.ok(HUMAN_PERFORMANCE_DNA_B1.findings.velocityStdMedian>20);
assert.ok(HUMAN_PERFORMANCE_DNA_B1.findings.rollSpreadMedianBeats>0.08);
assert.ok(HUMAN_PERFORMANCE_DNA_B1.findings.sustainAcrossNextMedianRatio>0.60);
assert.match(HUMAN_PERFORMANCE_DNA_B1_CONTRACT.sourcePolicy,/derived/i);
assert.equal(NEO_SOUL_PLAYER_V13_INFO.version,'1.3-human-dna-b1');

const chords=['Cmaj7','Cmaj7','Am7','Am7'];
const roman=['Imaj7','Imaj7','vi7','vi7'];
const pocket={id:'afro-pocket',label:'Afro Pocket',variant:'human-b1',tag:'#AfroPocket',variantSeed:'human-b1'};
const options={roman,bpm:100,energyTarget:0.58,mood:'connection',performancePattern:pocket,pass:'A',seed:'human-dna-ci'};
const legacy=buildV11(chords,options);
const human=buildHuman(chords,options);

assert.equal(human.profile,'fortissimo-neo-soul-player-v1.3-human-dna-b1');
assert.equal(human.humanPerformance?.version,'1.3');
assert.equal(human.humanPerformance?.sharedTransportUntouched,true);
assert.deepEqual(human.voicings,legacy.voicings,'Human Performance DNA must not rewrite the harmonic voicings');
assert.ok(human.events.every(event=>Number(event.fingerOffsetSeconds||0)>=0),'human timing offsets must not create negative loop-boundary starts');
assert.ok(human.events.some(event=>event.humanDnaVersion==='B1'));
assert.ok(new Set(human.events.filter(event=>['top-voice','inner-voice','bass-root'].includes(event.role)).map(event=>event.humanGesture)).size>=2,'one phrase should use multiple contextual human gestures');

const inner=human.events.filter(event=>event.role==='inner-voice').map(event=>event.velocity);
const top=human.events.filter(event=>event.role==='top-voice').map(event=>event.velocity);
assert.ok(inner.length&&top.length);
assert.ok(Math.min(...inner)<Math.max(...top),'finger-mixed dynamics should allow softer inner voices than top voices');

for(const event of human.events){
  if(!Number.isFinite(Number(event.chordIndex))||!chords[event.chordIndex])continue;
  const safe=new Set(safePitchClassesForChord(chords[event.chordIndex],{romanToken:roman[event.chordIndex]}));
  assert.ok(safe.has(((event.midi%12)+12)%12),`Human DNA event ${event.midi} must remain harmonically safe for ${chords[event.chordIndex]}`);
}

let held=0,responses=0,ghosty=0;
for(let i=0;i<24;i+=1){
  const plan=buildHuman(chords,{...options,seed:`human-dna-ci-${i}`});
  held+=plan.events.filter(event=>event.commonToneHeld).length;
  responses+=plan.events.filter(event=>event.role==='human-phrase-response').length;
  ghosty+=plan.events.filter(event=>event.role==='inner-voice'&&event.velocity<=24).length;
}
assert.ok(held>0,'Reference DNA B1 should sometimes sustain a common tone instead of re-striking it');
assert.ok(responses>0,'Reference DNA B1 should sometimes add a sparse phrase-end response');
assert.ok(ghosty>0,'Reference DNA B1 should sometimes create ghost-level inner voices');

const prime=buildHuman(chords,{...options,pass:'A′',seed:'human-dna-ci'});
assert.equal(prime.humanPerformance?.version,'1.3');
assert.ok(prime.humanPerformance?.gestureSummary?.length>0);
assert.deepEqual(prime.voicings.map(v=>v.chord),human.voicings.map(v=>v.chord),'Human shading must not change the A/A-prime chord identities');

console.log('PASS Human Pianist V1.3: Reference DNA B1 dynamics, contextual timing, common-tone sustain, independent release, phrase responses, harmonic safety and A/A-prime compatibility');
