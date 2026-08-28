import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const srcPath='assets/vibe-roulette-skykeys-sound-direction-v1.js';
const src=fs.readFileSync(srcPath,'utf8');
const csv=fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8').trim().split(/\r?\n/);
const manifest=JSON.parse(fs.readFileSync('data/vibe-roulette/skykeys-sound-direction-v1.json','utf8'));

execFileSync(process.execPath,['--check',srcPath],{stdio:'pipe'});

for(const token of [
 "version:'4.0.0'","mutatesPianist:false","mutatesHarmony:false","musical-function-first",
 'normalizeBodyEnergy','analyzePianistPerformance','deriveMusicalFunction','scorePresetForContext',
 'rankSkyKeysPresets','chooseSkyKeysPreset','chooseSkyKeysPresetForEngine','applySoundDirectionToEngine',
 'emotionalTerritory','bodyEnergy','pianistDensity','vocalSpace','afroPriority','neoSoulHands',
 'guitar-needs-guitar-appropriate-pattern','vocal-not-default-harmonic-bed','producerGuardrail',
 'deterministic:true','tasteTrainingMutation:false','never rewrite harmony'
]) assert.ok(src.includes(token),`missing Phase 4 contract token: ${token}`);

for(const territory of ['alegria','tristeza','calma','sensual','bailable','fiesta','introspeccion','ilusion','nostalgia','conexion'])assert.ok(src.includes(`${territory}:`),`missing emotional territory ${territory}`);
for(const role of ['main_harmony','rhythmic_chords','support_pad','pluck_arp','hook_lead'])assert.ok(src.includes(role),`missing producer role ${role}`);

assert.equal(csv.length-1,222,'Phase 4 must rank the complete 222-preset catalog');
assert.equal(manifest.status,'sound-direction-ready-isolated');
assert.equal(manifest.catalog_count,222);
assert.equal(manifest.taste_training_mutation,false);
assert.match(manifest.upstream_invariant,/Never mutate chord generator, pianist notes, voicings, inversions, timing, velocities or A\/A-prime phrase memory/);
assert.match(manifest.phase5_boundary,/Not connected to Vibe Roulette Spin until Phase 5/);

const mainHarmonyGuardIndex=src.indexOf("role==='main_harmony'");
const guitarGuardIndex=src.indexOf("preset.section==='Guitars'");
const vocalGuardIndex=src.indexOf("preset.section==='Vocals'");
assert.ok(mainHarmonyGuardIndex>=0&&guitarGuardIndex>mainHarmonyGuardIndex&&vocalGuardIndex>mainHarmonyGuardIndex,'main-harmony guitar/vocal guardrails must exist');

console.log('PASS S.K.Y. Keys Phase 4 static/runtime-syntax contract: function-first context, 222 presets, emotional/energy intelligence, guardrails and pianist invariance');
