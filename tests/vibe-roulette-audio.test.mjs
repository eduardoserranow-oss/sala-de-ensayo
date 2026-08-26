import assert from 'node:assert/strict';
import { voiceLeadChords } from '../assets/vibe-roulette-audio.js';

const chords = ['C', 'G', 'Am', 'F'];
const voicings = voiceLeadChords(chords);
assert.equal(voicings.length, chords.length);

for (const voicing of voicings) {
  assert.ok(voicing.length >= 3, 'preview voicing should contain at least a triad');
  assert.ok(Math.min(...voicing) >= 43, 'voicing should stay out of muddy sub-bass range');
  assert.ok(Math.max(...voicing) <= 76, 'voicing should stay in compact preview range');
  for (let i = 1; i < voicing.length; i += 1) {
    assert.ok(voicing[i] > voicing[i - 1], 'voices must remain ascending');
  }
}

const movement = [];
for (let i = 1; i < voicings.length; i += 1) {
  const a = voicings[i - 1];
  const b = voicings[i];
  const count = Math.min(a.length, b.length);
  const average = Array.from({ length: count }, (_, n) => Math.abs(a[n] - b[n])).reduce((x, y) => x + y, 0) / count;
  movement.push(average);
}
assert.ok(Math.max(...movement) <= 7, `voice-leading movement too large: ${movement.join(', ')}`);

const colored = voiceLeadChords(['Gm', 'C7', 'D7']);
assert.equal(colored.length, 3);
assert.equal(colored[1].length, 4, 'dominant seventh should retain its seventh color in preview');

console.log('PASS Vibe Roulette voice-led audio tests');
