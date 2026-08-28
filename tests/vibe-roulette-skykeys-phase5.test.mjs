import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');
const chord=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');

for(const token of [
  "version:'5.1.0-web-pilot'",
  'mutatesPianist:false',
  'mutatesHarmony:false',
  'drumsUntouched:true',
  'rhodesFallback:true',
  'buildSeamlessEightBarPerformance',
  'chooseSkyKeysPresetForEngine',
  'decideSkyKeysForSpin',
  'recommendedBpmForEnergy',
  'registerSkyKeysRemotePreset',
  '__skyKeysPhase5Active',
  'originalPrepareSources',
  'originalScheduleCycle',
  'playbackRateForMidi',
  'velocityToGain',
  'Rhodes fallback until this preset has hosted samples',
  'Chord Generator -> Existing Pianist -> Sound Direction -> S.K.Y. Keys Sound Engine -> Audio',
  'Existing Afro drum selection, buffer, mute, volume, replacement and shared clock are untouched.'
]) assert.ok(src.includes(token),`missing Phase 5 contract token: ${token}`);

assert.ok(chord.includes("import './vibe-roulette-skykeys-phase5-integration-v1.js';"),'Phase 5 runtime must load with the current Vibe Roulette module graph');
assert.ok(!src.includes('result.roman='),'Phase 5 may not rewrite result harmony');
assert.ok(!src.includes('event.midi='),'Phase 5 may not rewrite pianist MIDI');
assert.ok(!src.includes('event.velocity='),'Phase 5 may not rewrite pianist velocity');
assert.ok(!src.includes('event.startBeat='),'Phase 5 may not rewrite pianist timing');
assert.ok(src.includes('originalPrepareSources.call(this,token)'),'Rhodes preparation must remain as safety fallback');
assert.ok(src.includes("if(!this.__skyKeysPhase5Active)return originalScheduleCycle.call(this,cycleStart,token,options)"),'Original Rhodes scheduler must remain active when S.K.Y. samples are unavailable');

console.log('PASS S.K.Y. Keys Phase 5 Vibe Roulette integration, pianist invariance, shared transport and Rhodes fallback contract');
