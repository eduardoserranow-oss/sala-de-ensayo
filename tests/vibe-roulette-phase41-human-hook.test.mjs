import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHookPlayerPlan, HOOK_PLAYER_V1_INFO } from '../assets/vibe-roulette-hook-player-v1.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';

const chords=['F','G','Am','G'];
const roman=['IV','V','vi','V'];
const presets=['Warm Pluck','Hidden Whistle','Toy Piano'];

assert.equal(HOOK_PLAYER_V1_INFO.version,'1.1-human-phrase');
assert.equal(HOOK_PLAYER_V1_INFO.phase,4.1);
assert.ok(HOOK_PLAYER_V1_INFO.principles.includes('intentional rests'));
assert.ok(HOOK_PLAYER_V1_INFO.principles.includes('mixed note lengths'));

for(const preset of presets){
  const plan=buildHookPlayerPlan(chords,{roman,bpm:119,energyTarget:.72,mood:'connection',emotionFilters:['sensual'],seed:`phase41-${preset}`,presetHint:preset,pass:'A'});
  assert.equal(plan.player,'Human Hook Player V1.1');
  assert.equal(plan.version,'1.1');
  assert.equal(plan.events.every(event=>event.layerRole==='hook'),true);
  assert.ok(plan.events.length>=6&&plan.events.length<=12,`${preset} should phrase sparsely instead of machine-gunning every subdivision`);
  assert.ok(new Set(plan.events.map(event=>event.durationBeats.toFixed(2))).size>=4,`${preset} needs mixed note lengths`);
  assert.ok(Math.max(...plan.events.map(event=>event.velocity))-Math.min(...plan.events.map(event=>event.velocity))>=10,`${preset} needs a real human velocity contour`);
  assert.ok(plan.events.some(event=>event.durationBeats>=.55),`${preset} needs notes that breathe beyond staccato length`);
  assert.ok(plan.events.some(event=>event.fingerOffsetSeconds>=.012),`${preset} needs contextual microtiming larger than the old robotic 6–10ms pattern`);
  assert.ok(plan.motifs.some(motif=>/breath|answer|variation/.test(motif.pattern)),`${preset} needs phrase-level statement/breath/answer behavior`);
  for(const event of plan.events){
    const safe=new Set(safePitchClassesForChord(chords[event.chordIndex],{romanToken:roman[event.chordIndex],allowColor:true}));
    assert.ok(safe.has(((event.midi%12)+12)%12),`${preset} hook note ${event.midi} must remain harmonically safe`);
  }
}

const controls=fs.readFileSync('assets/vibe-roulette-songstarter-layer-controls-v1.js','utf8');
for(const token of [
  "phase:4.1",
  "roles:['support','hook']",
  "labels:{support:'M2',hook:'M3'}",
  'M2 ·',
  'M3 ·',
  'data-songstarter-mute',
  'setSongStarterLayerMuted',
  'getSongStarterLayerMuteState',
  "layer.role==='foundation'||!muted[layer.role]",
  'activeTransport.pause()',
  'await activeTransport.resume()',
  'preserves the current transport position',
  'existing drum mute remains separate and untouched'
]) assert.ok(controls.includes(token),`missing Phase 4.1 layer-control token: ${token}`);

const chordAlternatives=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');
assert.ok(chordAlternatives.includes("import './vibe-roulette-songstarter-layer-controls-v1.js';"),'Phase 4.1 layer mute controls must load after the existing S.K.Y. multilayer integration');

const support=fs.readFileSync('assets/vibe-roulette-support-player-v1.js','utf8');
assert.ok(!support.includes('Human Hook Player V1.1'),'Phase 4.1 must not rewrite the Support/Texture player');
const drums=fs.readFileSync('assets/vibe-roulette-afro-drums-v1.js','utf8');
assert.ok(!drums.includes('songstarter-layer-mute'),'Phase 4.1 must not modify drum behavior');

console.log('PASS Song Starter Phase 4.1: Human Hook phrase-level timing/dynamics/space + independent M2 Support and M3 Hook mutes with current-position transport reprime');
