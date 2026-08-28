import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/vibe-roulette-skykeys-sound-direction-v1.js','utf8');
const manifest=JSON.parse(fs.readFileSync('data/vibe-roulette/skykeys-sound-direction-v1.json','utf8'));
const csv=fs.readFileSync('data/vibe-roulette/skykeys-catalog-v1.csv','utf8').trim().split(/\r?\n/);

assert.ok(src.includes("version:'4.0.0'"));
assert.ok(src.includes('mutatesPianist:false'));
assert.ok(src.includes('mutatesHarmony:false'));
assert.ok(src.includes('deriveMusicalFunction'));
assert.ok(src.includes('chooseSkyKeysPreset'));
assert.ok(src.includes('producerGuardrail'));
assert.ok(src.includes('bodyEnergy'));
assert.ok(src.includes('pianistDensity'));
assert.ok(src.includes('vocalSpace'));
assert.ok(src.includes("preset.section==='Guitars'"));
assert.ok(src.includes("preset.section==='Vocals'"));
assert.equal(csv.length-1,222);
assert.equal(manifest.catalog_count,222);
assert.equal(manifest.status,'sound-direction-ready-isolated');
assert.equal(manifest.taste_training_mutation,false);

console.log('PASS S.K.Y. Keys Phase 4 essential Sound Direction invariants');
