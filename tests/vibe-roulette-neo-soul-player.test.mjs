import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildNeoSoulRhodesPlan,
  buildSafeVoicingSequence,
  safePitchClassesForChord,
  velocityToGain,
  NEO_SOUL_PLAYER_INFO
} from '../assets/vibe-roulette-neo-soul-player-v1.js';

const pattern={id:'soul-topline',label:'Soul Topline',variant:331,variantSeed:'soul-topline-331',tag:'#SoulTopline'};
const chords=['Cmaj7','Am7','Dm7','G7'];
const roman=['Imaj7','vi7','ii7','V7'];
const plan=buildNeoSoulRhodesPlan(chords,{roman,bpm:102,energyTarget:0.58,mood:'connection',performancePattern:pattern,pass:'A',seed:'neo-soul-ci'});

assert.equal(plan.profile,'fortissimo-neo-soul-player-v1');
assert.equal(plan.harmonicSafety.count,0,'no generated note may fall outside the chord-safe pitch-class set');
assert.equal(plan.voicings.length,4);
assert.ok(plan.events.length>12,'player should build a performed phrase rather than four block chords');
assert.ok(plan.gestures.length>=4);
assert.ok(new Set(plan.gestures.map(item=>item.id)).size>=2,'one phrase should contain more than one hand gesture');
assert.ok(plan.dynamics.velocityMax-plan.dynamics.velocityMin>=12,'finger/phrase dynamics must produce meaningful velocity contrast');
assert.ok(plan.events.some(event=>event.fingerOffsetSeconds>=0.08),'at least one intentional hand gesture must spread notes far enough to sound performed, not simultaneous');
assert.ok(plan.events.some(event=>event.role==='top-voice'));
assert.ok(plan.events.some(event=>event.role==='inner-voice'));
assert.ok(plan.events.some(event=>event.role==='bass-root'));
assert.ok(velocityToGain(72,'top-voice')>velocityToGain(38,'top-voice'),'continuous gain must preserve velocity differences after sample-layer selection');

for(const [index,voicing] of plan.voicings.entries()){
  const safe=new Set(safePitchClassesForChord(chords[index],{romanToken:roman[index]}));
  for(const midi of [...voicing.left,...voicing.right]) assert.ok(safe.has(((midi%12)+12)%12),`voicing note ${midi} must be harmonically safe for ${chords[index]}`);
}

const sequence=buildSafeVoicingSequence(chords,{roman,energyTarget:0.58,performancePattern:pattern,seed:'voice-leading-ci'});
for(let i=1;i<sequence.length;i+=1){
  const leap=Math.abs(sequence[i].right.at(-1)-sequence[i-1].right.at(-1));
  assert.ok(leap<=7,`top voice should remain singable; found ${leap}-semitone leap`);
}

const prime=buildNeoSoulRhodesPlan(chords,{roman,bpm:102,energyTarget:0.58,mood:'connection',performancePattern:pattern,pass:'A′',phraseBarOffset:4,previousRight:plan.finalRight,seed:'neo-soul-ci'});
assert.equal(prime.harmonicSafety.count,0);
assert.notDeepEqual(prime.gestures.map(g=>g.id),plan.gestures.map(g=>g.id),'A′ should evolve the hand choreography even when harmony stays familiar');

assert.match(NEO_SOUL_PLAYER_INFO.principle,/Neo-Soul/i);
const seamless=fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8');
assert.ok(seamless.includes('buildNeoSoulRhodesPlan'),'8-bar playback must use the Neo-Soul Player, not the legacy block-chord builder');
assert.ok(seamless.includes('velocityToGain(event.velocity,event.role)'),'transport must use continuous per-note velocity gain');
assert.ok(!seamless.includes('buildCommercialAfroRhodesPlan(arrangement.firstPass'),'main 8-bar transport must not route through the legacy pianist');

console.log('PASS FORTISSIMO Neo-Soul Player: harmonic safety, voice leading, gestures and real velocity dynamics');

