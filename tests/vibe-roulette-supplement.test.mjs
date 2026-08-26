import fs from 'node:fs';
import assert from 'node:assert/strict';

const data = JSON.parse(fs.readFileSync(new URL('../data/vibe-roulette/corpus-v0.2-supplement.json', import.meta.url), 'utf8'));
assert.ok(data.version.includes('verified-supplement'));
assert.ok(data.songs.length >= 1);
assert.ok(data.progressions.length >= 1);

const songIds = new Set(data.songs.map(song => song.id));
for (const song of data.songs) {
  assert.ok(song.peakRank <= 10, `${song.title} must satisfy the historical Top-10 calibration rule`);
  assert.ok(song.weeksOnChart > 0, `${song.title} needs chart longevity metadata`);
}

for (const progression of data.progressions) {
  assert.equal(progression.provisional, false, `${progression.id} cannot be provisional in verified supplement`);
  assert.ok(progression.evidenceConfidence >= 0.9, `${progression.id} needs high harmonic confidence`);
  const verified = progression.evidence.filter(entry => entry.verified);
  assert.ok(verified.some(entry => entry.kind === 'expert-harmonic-annotation'), `${progression.id} needs expert harmony evidence`);
  assert.ok(verified.some(entry => entry.kind === 'billboard-chart'), `${progression.id} needs hit evidence`);
  assert.ok(verified.every(entry => !entry.songId || songIds.has(entry.songId)), `${progression.id} references a missing source song`);
  assert.ok(progression.chorusVariation?.evidenceSongId, `${progression.id} needs auditable section-variation evidence`);
}

const evilWays = data.progressions.find(item => item.id === 'mcgill-p10-evil-ways');
assert.deepEqual(evilWays.roman, ['i','IV7']);
assert.equal(evilWays.chorusVariation.strategy, 'dominant-turnaround');

console.log('PASS verified supplement integrity');
