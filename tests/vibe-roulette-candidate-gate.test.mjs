import assert from 'node:assert/strict';
import fs from 'node:fs';

const queue = JSON.parse(fs.readFileSync(new URL('../data/vibe-roulette/candidate-intake-v0.2.json', import.meta.url), 'utf8'));

assert.ok(Array.isArray(queue.candidates) && queue.candidates.length >= 6, 'candidate queue should contain the cross-cultural research set');

for (const candidate of queue.candidates) {
  assert.equal(candidate.feedEligible, false, `${candidate.id} must remain blocked until harmonic review`);
  assert.ok(candidate.harmonicStatus?.startsWith('pending'), `${candidate.id} must explicitly show pending harmonic review`);
  assert.ok(Array.isArray(candidate.hitEvidence) && candidate.hitEvidence.length >= 1, `${candidate.id} needs hit evidence before research priority`);
  assert.ok(candidate.hitEvidence.some(entry => entry.verified === true), `${candidate.id} needs at least one verified hit-evidence statement`);
}

const culturalOverride = queue.candidates.find(item => item.id === 'candidate-gasolina-2004');
assert.equal(culturalOverride.qualificationStatus, 'cultural-impact-override-review');
assert.ok(culturalOverride.policyNote.includes('Top-10 Hot 100'), 'culturally essential override must be documented rather than silently changing thresholds');

console.log(`PASS candidate gate: ${queue.candidates.length} research candidates remain isolated from roulette feed`);
