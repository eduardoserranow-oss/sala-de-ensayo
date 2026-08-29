import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHookPlayerPlan, HOOK_PLAYER_V1_INFO } from '../assets/vibe-roulette-hook-player-v1.js';

// Phase 4.1 work remains preserved as dormant R&D; Phase 4.2 removes it from active generation/playback.
const archived=buildHookPlayerPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],bpm:119,energyTarget:.72,mood:'connection',emotionFilters:['sensual'],seed:'phase42-archive',presetHint:'Warm Pluck',pass:'A'});
assert.equal(HOOK_PLAYER_V1_INFO.version,'1.1-human-phrase');
assert.equal(archived.player,'Human Hook Player V1.1');
assert.ok(archived.events.length>0,'Hook R&D should remain recoverable in source control');

const producer=fs.readFileSync('assets/vibe-roulette-songstarter-producer-v1.js','utf8');
for(const token of [
  "version:'1.2-two-layer-lock'",
  'phase:4.2',
  "activeRoles:['foundation','support']",
  'hookDormant:true',
  'maxMusicalLayers:2',
  'hookPreset:null',
  'hook:null'
]) assert.ok(producer.includes(token),`missing Phase 4.2 producer lock token: ${token}`);
assert.ok(!producer.includes("import { buildHookPlayerPlan }"),'active producer must not import the Hook Player');
assert.ok(!producer.includes("role:'hook',player:"),'active producer must not build a Hook layer');

const controls=fs.readFileSync('assets/vibe-roulette-songstarter-layer-controls-v1.js','utf8');
for(const token of [
  "version:'1.1-two-layer'",
  'phase:4.2',
  "roles:['support']",
  "labels:{support:'M2'}",
  'M2 ·',
  'data-songstarter-mute',
  'setSongStarterLayerMuted',
  'getSongStarterLayerMuteState',
  "role!=='support'||!muted.support",
  'activeTransport.pause()',
  'await activeTransport.resume()',
  'there is no active M3 control',
  'existing drum mute remains separate and untouched'
]) assert.ok(controls.includes(token),`missing Phase 4.2 layer-control token: ${token}`);
assert.ok(!controls.includes("labels:{support:'M2',hook:'M3'}"),'M3 must no longer be exposed');
assert.ok(!controls.includes("roles:['support','hook']"),'Hook must no longer be an active mute role');

const chordAlternatives=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');
assert.ok(chordAlternatives.includes("import './vibe-roulette-songstarter-layer-controls-v1.js';"),'M2 Texture mute controls must load after the S.K.Y. multilayer integration');

const support=fs.readFileSync('assets/vibe-roulette-support-player-v1.js','utf8');
assert.ok(!support.includes('Human Hook Player V1.1'),'Phase 4.2 must not rewrite the Support/Texture player');
const drums=fs.readFileSync('assets/vibe-roulette-afro-drums-v1.js','utf8');
assert.ok(!drums.includes('songstarter-layer-mute'),'Phase 4.2 must not modify drum behavior');

console.log('PASS Song Starter Phase 4.2: active Foundation + Support/Texture only, M2 mute preserved, M3 retired, Hook R&D archived, drums untouched');
