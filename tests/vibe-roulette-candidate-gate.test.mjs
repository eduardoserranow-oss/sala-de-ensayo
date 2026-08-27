import assert from 'node:assert/strict';
import fs from 'node:fs';

const queue = JSON.parse(fs.readFileSync(new URL('../data/vibe-roulette/candidate-intake-v0.2.json', import.meta.url), 'utf8'));

assert.ok(Array.isArray(queue.candidates) && queue.candidates.length >= 9, 'research queue should retain a broad cross-cultural candidate set');
assert.ok(Array.isArray(queue.promoted) && queue.promoted.length >= 1, 'queue should retain an auditable promotion history');

for (const candidate of queue.candidates) {
  assert.equal(candidate.feedEligible, false, `${candidate.id} must remain blocked until all feed gates pass`);
  assert.ok(candidate.harmonicStatus, `${candidate.id} must explicitly document harmonic review state`);
  const evidence = [...(candidate.hitEvidence || []), ...(candidate.impactEvidence || [])];
  assert.ok(evidence.length >= 1, `${candidate.id} needs hit or impact evidence before research priority`);
  assert.ok(evidence.some(entry => entry.verified === true), `${candidate.id} needs at least one verified hit/impact statement`);
}

const promotedDespacito = queue.promoted.find(item => item.id === 'candidate-despacito-2017');
assert.ok(promotedDespacito, 'Despacito promotion must be auditable');
assert.equal(promotedDespacito.promotedTo, 'corpus-v0.3-modern-verified.json');
assert.ok(promotedDespacito.reason.includes('ChoCo') && promotedDespacito.reason.includes('Hooktheory'), 'promotion must name both independent harmonic corroboration paths');

const dakiti = queue.candidates.find(item => item.id === 'candidate-dakiti-2020');
assert.ok(dakiti.harmonicLeads?.length >= 3, 'Dákiti should preserve Hooktheory + Chordify + Cifra Club leads');
assert.deepEqual(dakiti.harmonicLeads[1].normalized, ['VI', 'iv', 'i', 'VII']);

const porAmar = queue.candidates.find(item => item.id === 'candidate-por-amar-a-ciegas-2008');
assert.ok(porAmar, 'Por Amar a Ciegas must be tracked as a cultural/catalog candidate');
const sectionLead = porAmar.harmonicLeads.find(item => item.source.includes('Lamucal'));
assert.deepEqual(sectionLead.verseNormalized, ['i', 'VII', 'VI', 'iv']);
assert.deepEqual(sectionLead.chorusNormalized, ['VI', 'iv', 'i', 'VII']);
assert.equal(porAmar.feedEligible, false, 'catalog longevity alone cannot bypass feed gates');

const vivir = queue.candidates.find(item => item.id === 'candidate-vivir-mi-vida-2013');
assert.ok(vivir.harmonicLeads?.length >= 1, 'Vivir Mi Vida should preserve the discovered ChoCo/iReal harmonic lead');
assert.equal(vivir.harmonicLeads[0].verifiedAsFeedEvidence, false, 'one community lead cannot silently become feed evidence');

const suavemente = queue.candidates.find(item => item.id === 'candidate-suavemente-1998');
assert.equal(suavemente.qualificationStatus, 'hit-evidence-accepted');
assert.ok(suavemente.harmonicLeads.some(item => item.source.includes('Hooktheory')), 'Suavemente should retain Hooktheory borrowed-chord/novelty lead');

const culturalOverride = queue.candidates.find(item => item.id === 'candidate-gasolina-2004');
assert.equal(culturalOverride.qualificationStatus, 'cultural-impact-override-review');
assert.ok(culturalOverride.policyNote.includes('Top-10 Hot 100'), 'culturally essential override must be documented rather than silently changing thresholds');

console.log(`PASS candidate gate: ${queue.candidates.length} candidates isolated; ${queue.promoted.length} promotion(s) auditable`);
