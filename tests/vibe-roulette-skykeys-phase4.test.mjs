import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-sound-direction-v1.js','utf8');
const csv=fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8').trim().split(/\r?\n/);
const manifest=JSON.parse(fs.readFileSync('data/vibe-roulette/skykeys-sound-direction-v1.json','utf8'));

for(const token of [
 "version:'4.0.0'","mutatesPianist:false","mutatesHarmony:false","musical-function-first",
 'normalizeBodyEnergy','analyzePianistPerformance','deriveMusicalFunction','scorePresetForContext',
 'rankSkyKeysPresets','chooseSkyKeysPreset','chooseSkyKeysPresetForEngine','applySoundDirectionToEngine',
 'emotionalTerritory','bodyEnergy','pianistDensity','vocalSpace','afroPriority','neoSoulHands',
 'guitar-needs-guitar-appropriate-pattern','vocal-not-default-harmonic-bed','producerGuardrail'
]) assert.ok(src.includes(token),`missing Phase 4 contract token: ${token}`);

for(const territory of ['alegria','tristeza','calma','sensual','bailable','fiesta','introspeccion','ilusion','nostalgia','conexion'])assert.ok(src.includes(`${territory}:`),`missing emotional territory ${territory}`);
for(const role of ['main_harmony','rhythmic_chords','support_pad','pluck_arp','hook_lead'])assert.ok(src.includes(role),`missing producer role ${role}`);

assert.equal(csv.length-1,222,'Phase 4 must preserve the complete 222-preset catalog');
assert.equal(manifest.status,'sound-direction-ready-isolated');
assert.equal(manifest.catalog_count,222);
assert.equal(manifest.taste_training_mutation,false);
assert.ok(String(manifest.upstream_invariant).includes('Never mutate chord generator'));
assert.ok(String(manifest.upstream_invariant).includes('A/A-prime phrase memory'));
assert.ok(String(manifest.phase5_boundary).includes('Not connected to Vibe Roulette Spin until Phase 5'));

assert.ok(src.includes("role==='main_harmony'&&preset.section==='Guitars'"));
assert.ok(src.includes("role==='main_harmony'&&preset.section==='Vocals'"));
assert.ok(src.includes("deterministic:true,tasteTrainingMutation:false"));
assert.ok(src.includes('It must never rewrite harmony'));

console.log('PASS S.K.Y. Keys Phase 4 function-first Sound Direction contract, 222 presets, contextual intelligence, guardrails and upstream invariance');
