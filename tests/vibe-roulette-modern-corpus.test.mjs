import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../data/vibe-roulette/corpus-v0.3-modern-verified.json', import.meta.url), 'utf8'));
assert.ok(data.version.includes('modern-verified'));
assert.ok(data.songs.length >= 1);
assert.ok(data.progressions.length >= 1);

const song = data.songs.find(item => item.id === 'modern-despacito-2017');
assert.ok(song, 'Despacito must exist in the first modern verified slice');
assert.equal(song.peakRank, 1);
assert.equal(song.weeksAtNumberOne, 16);
assert.equal(song.hitLane, 'A-cross-market-mainstream');
assert.equal(song.harmonicReview.status, 'community-cross-corroborated');
assert.equal(song.harmonicReview.expertAnnotation, false, 'community corroboration must not be mislabeled expert');
assert.ok(song.harmonicReview.sources.length >= 2, 'modern community harmony requires independent corroboration');

const progression = data.progressions.find(item => item.id === 'modern-p01-despacito-chorus');
assert.deepEqual(progression.roman, ['i','VI','III','VII']);
assert.equal(progression.provisional, false);
assert.ok(progression.evidenceConfidence >= 0.8 && progression.evidenceConfidence < 0.95, 'community corroboration should be strong but below expert confidence');

const verifiedEvidence = progression.evidence.filter(item => item.verified);
assert.ok(verifiedEvidence.some(item => item.kind === 'billboard-chart'), 'modern record needs verified hit evidence');
const harmonicSources = new Set(verifiedEvidence.filter(item => item.kind === 'community-harmonic-corroboration').map(item => item.source));
assert.ok(harmonicSources.has('choco-ireal-community'));
assert.ok(harmonicSources.has('hooktheory-despacito'));
assert.equal(progression.chorusVariation.strategy, 'constant-loop-arrangement-contrast');
assert.deepEqual(progression.chorusVariation.roman, progression.roman, 'verified lesson should preserve the loop instead of fabricating a chorus change');

console.log('PASS first modern independently corroborated corpus slice');
