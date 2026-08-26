import assert from 'node:assert/strict';
import fs from 'node:fs';

const queue = JSON.parse(fs.readFileSync(new URL('../data/vibe-roulette/candidate-intake-v0.2.json', import.meta.url), 'utf8'));

assert.ok(Array.isArray(queue.candidates) && queue.candidates.length >= 4, 'research queue should retain culturally broad pending candidates');
assert.ok(Array.isArray(queue.promoted) && queue.promoted.length >= 1, 'queue should retain an auditable promotion history');

for (const candidate of queue.candidates) {
  assert.equal(candidate.feedEligible, false, `${candidate.id} must remain blocked until harmonic review`);
  assert.ok(
    candidate.harmonicStatus?.includes('pending'),
    `${candidate.id} must explicitly show a pending harmonic gate even when a community lead exists`
  );
  assert.ok(Array.isArray(candidate.hitEvidence) && candidate.hitEvidence.length >= 1, `${candidate.id} needs hit evidence before research priority`);
  assert.ok(candidate.hitEvidence.some(entry => entry.verified === true), `${candidate.id} needs at least one verified hit-evidence statement`);
}

const promotedDespacito = queue.promoted.find(item => item.id === 'candidate-despacito-2017');
assert.ok(promotedDespacito, 'Despacito promotion must be auditable');
assert.equal(promotedDespacito.promotedTo, 'corpus-v0.3-modern-verified.json');
assert.ok(promotedDespacito.reason.includes('ChoCo') && promotedDespacito.reason.includes('Hooktheory'), 'promotion must name both independent harmonic corroboration paths');

const vivir = queue.candidates.find(item => item.id === 'candidate-vivir-mi-vida-2013');
assert.ok(vivir.harmonicLeads?.length >= 1, 'Vivir Mi Vida should preserve the discovered ChoCo/iReal harmonic lead');
assert.equal(vivir.harmonicLeads[0].verifiedAsFeedEvidence, false, 'one community lead cannot silently become feed evidence');

const culturalOverride = queue.candidates.find(item => item.id === 'candidate-gasolina-2004');
assert.equal(culturalOverride.qualificationStatus, 'cultural-impact-override-review');
assert.ok(culturalOverride.policyNote.includes('Top-10 Hot 100'), 'culturally essential override must be documented rather than silently changing thresholds');

console.log(`PASS candidate gate: ${queue.candidates.length} pending candidates isolated; ${queue.promoted.length} promotion(s) auditable`);
