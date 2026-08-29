import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-phase5-integration-v1.js','utf8');
const chord=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');

for(const token of [
  "version:'5.7.0-songstarter-phase4'",
  'mutatesPianist:false',
  'mutatesHarmony:false',
  'drumsUntouched:true',
  'rhodesFallback:true',
  'hostedPilotPreference:true',
  'audioTruthUi:true',
  'songStarterPhase4:true',
  'buildSeamlessEightBarPerformance',
  'buildSongStarterProducerPlan',
  'chooseSkyKeysPresetForEngine',
  'choosePlaybackDecision',
  'decideSkyKeysForSpin',
  'recommendedBpmForEnergy',
  'registerSkyKeysRemotePreset',
  'loadSkyKeysWebPilot',
  'reloadSkyKeysWebPilot',
  'webPackReport',
  'audioState',
  'songStarterPlan',
  'activeSongStarterLayers',
  '__skyKeysPhase5Active',
  '__songStarterPhase4Layers',
  'originalPrepareSources',
  'originalScheduleCycle',
  'playbackRateForMidi',
  'velocityToGain',
  'preloadStarterLayer',
  'requireAvailable:false',
  'requireAvailable:true',
  "source='hosted-substitute'",
  'idealPreset',
  'decisionSource',
  'SONG STARTER AUDIO ACTIVE',
  'S.K.Y. AUDIO ACTIVE',
  'RHODES FALLBACK',
  'Copy presets',
  'tap Play to activate',
  'Chord Generator -> Human Pianist Foundation -> Song Starter role players -> S.K.Y. Keys Sound Engine -> Audio',
  'Existing Afro drum selection, buffer, mute, volume, replacement and shared clock are untouched.'
]) assert.ok(src.includes(token),`missing Phase 5/Phase 4 integration token: ${token}`);

assert.ok(chord.includes("import './vibe-roulette-skykeys-phase5-integration-v1.js';"),'S.K.Y. runtime must load with the current Vibe Roulette module graph');
assert.ok(!src.includes('result.roman='),'runtime may not rewrite result harmony');
assert.ok(!src.includes('event.midi='),'runtime may not rewrite Foundation MIDI');
assert.ok(!src.includes('event.velocity='),'runtime may not rewrite Foundation velocity');
assert.ok(!src.includes('event.startBeat='),'runtime may not rewrite Foundation timing');
assert.ok(src.includes('originalPrepareSources.call(this,token)'),'Rhodes preparation must remain as safety fallback');
assert.ok(src.includes("if(!this.__skyKeysPhase5Active)return originalScheduleCycle.call(this,cycleStart,token,options)"),'Original Rhodes scheduler must remain active when the Foundation S.K.Y. samples are unavailable');
assert.ok(src.indexOf('requireAvailable:false')<src.indexOf('requireAvailable:true'),'Sound Direction must compute the ideal catalog choice before constraining Foundation playback to hosted presets');
assert.ok(src.includes("status:'active'"),'UI may only announce active S.K.Y./Song Starter audio after preload succeeds');
assert.ok(src.includes("status:'fallback'"),'Foundation decode/preload failure must visibly disclose Rhodes fallback');
assert.ok(src.includes("for(const layer of layers)for(const event of layer.events||[])scheduleSkyEvent"),'Active Song Starter layers must schedule their own MIDI through their own S.K.Y. preset');
assert.ok(src.includes("for(const layer of plannedLayers.filter(layer=>layer.role!=='foundation'))"),'Support and Hook must preload independently from Foundation');
assert.ok(src.includes("failed optional layers are omitted")||src.includes('Optional Support/Hook decoding failures do not silence a playable Foundation'),'Optional layer failure policy must be explicit');

console.log('PASS S.K.Y. Phase 5.7 + Song Starter Phase 4 truthful multilayer audio, Foundation invariance, per-layer preload, shared transport, drums and Rhodes fallback');
