import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('vibe-roulette.html', 'utf8');
const css = fs.readFileSync('assets/vibe-roulette.css', 'utf8');
const energyCss = fs.readFileSync('assets/vibe-roulette-energy.css', 'utf8');
const productCss = fs.readFileSync('assets/vibe-roulette-product.css', 'utf8');

for (const id of [
  'workingTitle',
  'moodGrid',
  'energySlider',
  'energyValue',
  'spinBtn',
  'resultMood',
  'resultKey',
  'romanLine',
  'chordGrid',
  'metaRow',
  'playBaseBtn',
  'anotherKeyBtn',
  'saveBtn',
  'copyBtn',
  'evidenceContent',
  'serraFitNote',
  'chorusStrategy',
  'chorusNote',
  'chorusChords',
  'playChorusBtn',
  'feedbackActions',
  'feedbackStatus',
  'savedList'
]) {
  assert.ok(html.includes(`id="${id}"`), `missing required UI control #${id}`);
}

for (const mood of ['illusion', 'nostalgia', 'connection']) {
  assert.ok(html.includes(`data-mood="${mood}"`), `missing mood ${mood}`);
}

for (const feedback of ['inspire', 'interesting', 'generic', 'wrongVibe']) {
  assert.ok(html.includes(`data-feedback="${feedback}"`), `missing feedback control ${feedback}`);
}

assert.ok(html.includes('VibeRouletteIntentEngine'), 'product build must use the intent-aware engine');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.1.json'"), 'product build must load verified corpus-v0.1.json');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.2-supplement.json'"), 'product build must load the verified historical supplement');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.3-modern-verified.json'"), 'product build must load the corroborated modern Latin slice');
assert.ok(!html.includes("'./data/vibe-roulette/seed-v0.json'"), 'product build must not load provisional seed');
assert.ok(!html.includes("'./data/vibe-roulette/candidate-intake-v0.2.json'"), 'research queue must never be loaded by the roulette UI');
assert.ok(html.includes('HIT-DERIVED · VERIFIED'), 'verified result status must remain visible');
assert.ok(html.includes('Mood mapping: Serra editorial model'), 'mood evidence caveat must remain available in details');
assert.ok(html.includes('F2–Ab4 · sweet spot G3'), 'Serra vocal profile diagnostic must remain available');
assert.ok(html.includes('progressionToChords'), 'another-key control must re-transpose the current family rather than spin a new one');
assert.ok(html.includes('energyTarget'), 'energy intent must be passed into the ranking engine');
assert.ok(html.includes('createSessionSnapshot'), 'writing-session snapshots must be wired into the product UI');
assert.ok(html.includes('fortissimo.vibeRoulette.saved.v1'), 'saved directions must persist locally');
assert.ok(html.includes('fortissimo.vibeRoulette.feedback.v1'), 'calibration feedback must persist locally');
assert.ok(html.includes('chartLongevityLabel'), 'evidence UI must handle modern chart metadata without fabricating total weeks-on-chart');
assert.ok(css.includes('@media(max-width:780px)'), 'mobile breakpoint is required');
assert.ok(css.includes('.evidence-box'), 'evidence panel styling is required');
assert.ok(energyCss.includes('.energy-slider'), 'energy slider styling is required');
assert.ok(productCss.includes('.feedback-actions'), 'product feedback styling is required');
assert.ok(productCss.includes('.saved-list'), 'saved-session styling is required');

console.log('PASS Vibe Roulette writing-session UI smoke test');
