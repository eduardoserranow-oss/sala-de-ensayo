import fs from 'node:fs';
import assert from 'node:assert/strict';

const corpus = JSON.parse(fs.readFileSync('data/vibe-roulette/corpus-v0.1.json', 'utf8'));

assert.match(corpus.version, /verified-slice/, 'corpus version must identify verified slice');
assert.ok(Array.isArray(corpus.songs) && corpus.songs.length >= 10, 'first verified slice must contain at least 10 songs');
assert.ok(Array.isArray(corpus.progressions) && corpus.progressions.length >= 8, 'first verified slice must contain at least 8 progression families');

const songIds = new Set();
for (const song of corpus.songs) {
  assert.ok(song.id && !songIds.has(song.id), `duplicate or missing song id: ${song.id}`);
  songIds.add(song.id);
  assert.ok(Number.isInteger(song.peakRank) && song.peakRank >= 1 && song.peakRank <= 10, `${song.id} must meet verified-slice top-10 rule`);
  assert.ok(Number.isInteger(song.weeksOnChart) && song.weeksOnChart > 0, `${song.id} needs chart longevity evidence`);
  assert.ok(song.annotationPath?.endsWith('salami_chords.txt'), `${song.id} needs McGill annotation path`);
}

const progressionIds = new Set();
const moodCoverage = { illusion: 0, nostalgia: 0, connection: 0 };
for (const progression of corpus.progressions) {
  assert.ok(progression.id && !progressionIds.has(progression.id), `duplicate or missing progression id: ${progression.id}`);
  progressionIds.add(progression.id);
  assert.equal(progression.provisional, false, `${progression.id} cannot be provisional in verified corpus`);
  assert.ok(progression.evidenceConfidence >= 0.9 && progression.evidenceConfidence <= 1, `${progression.id} needs strong evidence confidence`);
  assert.ok(Array.isArray(progression.roman) && progression.roman.length >= 2, `${progression.id} needs a Roman progression`);
  assert.ok(Array.isArray(progression.evidence) && progression.evidence.length >= 2, `${progression.id} needs harmonic + chart evidence`);

  const kinds = new Set(progression.evidence.map(e => e.kind));
  assert.ok(kinds.has('expert-harmonic-annotation'), `${progression.id} missing harmonic evidence`);
  assert.ok(kinds.has('billboard-chart'), `${progression.id} missing chart evidence`);

  for (const evidence of progression.evidence) {
    assert.equal(evidence.verified, true, `${progression.id} has unverified evidence in verified corpus`);
    if (evidence.songId) assert.ok(songIds.has(evidence.songId), `${progression.id} references unknown song ${evidence.songId}`);
  }

  for (const mood of ['illusion', 'nostalgia', 'connection']) {
    const value = progression.mood?.[mood];
    assert.ok(typeof value === 'number' && value >= 0 && value <= 1, `${progression.id} invalid ${mood} score`);
    if (value > 0) moodCoverage[mood] += 1;
  }

  for (const dimension of ['energy','tension','sensuality','brightness','stability','movement']) {
    const value = progression.mood?.[dimension];
    assert.ok(typeof value === 'number' && value >= 0 && value <= 1, `${progression.id} invalid ${dimension} score`);
  }

  assert.ok(progression.chorusVariation?.strategy, `${progression.id} needs a chorus/section strategy`);
  assert.ok(Array.isArray(progression.chorusVariation?.roman) && progression.chorusVariation.roman.length >= 2, `${progression.id} needs variation Roman data`);
  if (progression.chorusVariation.evidenceSongId) {
    assert.ok(songIds.has(progression.chorusVariation.evidenceSongId), `${progression.id} variation references unknown song`);
  }
}

for (const [mood, count] of Object.entries(moodCoverage)) {
  assert.ok(count >= 3, `verified slice needs at least 3 candidates for ${mood}`);
}

const serra = corpus.vocalProfiles?.find(v => v.id === 'serra');
assert.ok(serra, 'Serra vocal profile missing');
assert.equal(serra.rangeLow, 'F2');
assert.equal(serra.rangeHigh, 'Ab4');
assert.equal(serra.sweetSpot, 'G3');

console.log(`PASS verified corpus integrity: ${corpus.songs.length} songs, ${corpus.progressions.length} progression families`);
console.log(`PASS mood coverage: ${JSON.stringify(moodCoverage)}`);
