import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNeoSoulRhodesPlan } from '../assets/vibe-roulette-neo-soul-player-v12.js';
import { safePitchClassesForChord } from '../assets/vibe-roulette-neo-soul-player-v1.js';
import { buildSupportPlayerPlan, SUPPORT_PLAYER_V1_INFO } from '../assets/vibe-roulette-support-player-v1.js';
import { buildHookPlayerPlan, HOOK_PLAYER_V1_INFO } from '../assets/vibe-roulette-hook-player-v1.js';
import { buildRoleAwarePlayersPlan, ROLE_AWARE_PLAYERS_V1_INFO } from '../assets/vibe-roulette-role-aware-players-v1.js';
import { roleDensityPolicy, ROLE_AWARE_PRESET_GROUPS, SONG_STARTER_ROLE_CONTRACT_V1, layerExportDescriptor } from '../assets/vibe-roulette-role-density-v1.js';

const chords=['F','G','Am','G'];
const roman=['IV','V','vi','V'];
const baseOptions={roman,bpm:102,energyTarget:0.68,mood:'connection',emotionFilters:['hope','intimacy'],pass:'A',seed:'role-aware-ci'};
const foundation=buildNeoSoulRhodesPlan(chords,baseOptions);
const support=buildSupportPlayerPlan(chords,{...baseOptions,foundationPlan:foundation});
const hook=buildHookPlayerPlan(chords,{...baseOptions,foundationPlan:foundation});

assert.equal(SUPPORT_PLAYER_V1_INFO.role,'support');
assert.equal(HOOK_PLAYER_V1_INFO.role,'hook');
assert.equal(ROLE_AWARE_PLAYERS_V1_INFO.phase,3);
assert.deepEqual(ROLE_AWARE_PRESET_GROUPS.support,['Always Danger','Broad Texture']);
assert.deepEqual(ROLE_AWARE_PRESET_GROUPS.hook,['Hidden Whistle','Toy Piano','Warm Pluck']);
assert.equal(SONG_STARTER_ROLE_CONTRACT_V1.midiExport.support,'02_Support_<S.K.Y.-Preset>.mid');
assert.equal(layerExportDescriptor('hook','Warm Pluck').filename,'03_Hook_Warm-Pluck.mid');

assert.equal(support.profile,'fortissimo-songstarter-support-player-v1');
assert.equal(hook.profile,'fortissimo-songstarter-hook-player-v1');
assert.ok(support.events.length>0,'Support Player must compose actual MIDI events');
assert.ok(hook.events.length>0,'Hook Player must compose actual MIDI events');
assert.ok(support.events.every(event=>event.layerRole==='support'));
assert.ok(hook.events.every(event=>event.layerRole==='hook'));
assert.ok(support.events.every(event=>event.velocity<=62),'Support must remain dynamically behind the main instrument');
assert.ok(hook.events.every(event=>event.midi>=68),'Hook vocabulary should stay out of the foundation/bass register');
assert.ok(support.events.some(event=>event.startBeat%4>0.15),'Support should sometimes enter after the chord attack instead of cloning Foundation');
assert.ok(new Set(hook.events.map(event=>event.hookPattern)).size>=1);

for(const plan of [support,hook]){
  for(const event of plan.events){
    const safe=new Set(safePitchClassesForChord(chords[event.chordIndex],{romanToken:roman[event.chordIndex]}));
    assert.ok(safe.has(((event.midi%12)+12)%12),`${plan.layerRole} event ${event.midi} must remain harmonically safe for ${chords[event.chordIndex]}`);
  }
}

const signature=events=>events.map(e=>`${e.chordIndex}:${e.startBeat.toFixed(3)}:${e.midi}:${e.role}`).join('|');
assert.notEqual(signature(support.events),signature(foundation.events),'Support Player must not duplicate the Foundation performance');
assert.notEqual(signature(hook.events),signature(foundation.events),'Hook Player must not duplicate the Foundation performance');
assert.notEqual(signature(hook.events),signature(support.events),'Hook and Support must think as different musicians');

const low=roleDensityPolicy({energyTarget:0.22,emotionFilters:['calm'],mood:'calm',foundationEventCount:30,chordCount:4});
const high=roleDensityPolicy({energyTarget:0.82,emotionFilters:['enthusiasm'],mood:'illusion',foundationEventCount:16,chordCount:4});
assert.equal(low.maxLayers,2,'very low/open energy should cap orchestration at two active musical layers');
assert.equal(high.maxLayers,3,'higher energy should allow a three-layer starter');
assert.ok(high.hookDensity>low.hookDensity,'Body Energy should increase hook/movement allowance without redefining emotion');

const starter=buildRoleAwarePlayersPlan(chords,{...baseOptions,energyTarget:0.76,seed:'role-aware-full-ci'});
assert.equal(starter.profile,'fortissimo-songstarter-role-aware-players-v1');
assert.equal(starter.layers[0].role,'foundation');
assert.ok(starter.support,'Phase 3 orchestrator should produce an independent Support plan when density allows');
assert.ok(starter.hook,'Phase 3 orchestrator should produce an independent Hook plan when density allows');
assert.equal(starter.layers.length,3);
assert.ok(starter.layers.every(layer=>layer.plan.events.every(event=>event.layerRole===layer.role)));
assert.equal(starter.runtimeIntegration.skyKeysMultilayerPlayback,'deferred-to-phase4');
assert.equal(starter.runtimeIntegration.drumsUntouched,true);

const seamless=fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8');
assert.ok(!seamless.includes('vibe-roulette-role-aware-players-v1.js'),'Phase 3 must stay additive: current Vibe Roulette playback is not wired to multilayer players until Phase 4');
for(const path of ['assets/vibe-roulette-support-player-v1.js','assets/vibe-roulette-hook-player-v1.js','assets/vibe-roulette-role-aware-players-v1.js']){
  const source=fs.readFileSync(path,'utf8');
  assert.ok(!/\.mid\b|\.mp3\b|\.wav\b/.test(source),'Role-aware runtime must contain derived grammar, not embedded premium source asset paths');
}

console.log('PASS Song Starter Phase 3: independent Support/Texture + Hook players, emotion/Body-Energy role density, harmonic safety, Foundation non-duplication and MIDI layer export contract preparation');
