import assert from 'node:assert/strict';
import {
  applyFeedback,
  createSessionSnapshot,
  formatSnapshotForClipboard,
  upsertRecentSnapshot
} from '../assets/vibe-roulette-session.js';

const result = {
  progressionId: 'p-test',
  mood: 'nostalgia',
  key: 'G',
  mode: 'minor',
  roman: ['i', 'VII', 'VI', 'iv'],
  chords: ['Gm', 'F', 'Eb', 'Cm'],
  evidenceConfidence: 0.82,
  evidenceSummary: { supportedSongIds: ['song-a'] },
  intent: { energyTarget: 0.74, recommendedBpm: 108 },
  chorusVariation: {
    strategy: 'rotate-start',
    note: 'Start from VI for a new emotional entry point.',
    roman: ['VI', 'iv', 'i', 'VII'],
    chords: ['Eb', 'Cm', 'Gm', 'F']
  }
};

const snapshot = createSessionSnapshot(result, {
  id: 'snap-1',
  createdAt: '2026-08-26T00:00:00.000Z',
  title: 'Me topé con tu foto',
  energyTarget: 0.74,
  recommendedBpm: 108
});

assert.equal(snapshot.title, 'Me topé con tu foto');
assert.equal(snapshot.key, 'G');
assert.equal(snapshot.recommendedBpm, 108);
assert.equal(snapshot.playbackBars, 4);
assert.equal(snapshot.beatsPerBar, 4);
assert.deepEqual(snapshot.roman, ['i', 'VII', 'VI', 'iv']);
assert.deepEqual(snapshot.chorusVariation.roman, ['VI', 'iv', 'i', 'VII']);
assert.deepEqual(snapshot.sourceSongIds, ['song-a']);

const clipboard = formatSnapshotForClipboard(snapshot);
assert.ok(clipboard.includes('Me topé con tu foto'));
assert.ok(clipboard.includes('108 BPM'));
assert.ok(clipboard.includes('4 bars / 4/4'));
assert.ok(clipboard.includes('Gm – F – Eb – Cm'));
assert.ok(clipboard.includes('Chorus: VI – iv – i – VII'));

const recent = upsertRecentSnapshot([{ ...snapshot, id: 'old' }], snapshot, 8);
assert.equal(recent[0].id, 'snap-1');
assert.equal(recent.length, 2);

const replaced = upsertRecentSnapshot([snapshot], { ...snapshot, title: 'Updated' }, 8);
assert.equal(replaced.length, 1);
assert.equal(replaced[0].title, 'Updated');

const rated = applyFeedback(snapshot, 'inspire');
assert.equal(rated.feedback.key, 'inspire');
assert.equal(rated.feedback.weight, 1);
assert.equal(rated.feedback.label, 'Inspires me');

assert.throws(() => applyFeedback(snapshot, 'unknown'), /Unsupported feedback/);

console.log('PASS Vibe Roulette writing-session utilities');