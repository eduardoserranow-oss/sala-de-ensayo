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
  'tempoGuide',
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

assert.ok(html.includes('VibeRouletteIntentEngine'), 'product must use the intent-aware engine');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.1.json'"), 'product must load verified corpus-v0.1.json');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.2-supplement.json'"), 'product must load verified historical supplement');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.3-modern-verified.json'"), 'product must load corroborated modern Latin slice');
assert.ok(!html.includes("'./data/vibe-roulette/seed-v0.json'"), 'product must not load provisional seed');
assert.ok(!html.includes("'./data/vibe-roulette/candidate-intake-v0.2.json'"), 'research queue must never be loaded by product UI');
assert.ok(html.includes('HIT-DERIVED · VERIFIED'), 'verified result status must be visible');
assert.ok(html.includes('Mood mapping: Serra editorial model'), 'mood evidence caveat must remain available');
assert.ok(html.includes('F2–Ab4 · sweet spot G3'), 'Serra vocal profile diagnostic must remain available');
assert.ok(html.includes('progressionToChords'), 'another-key control must re-transpose current family rather than spin a new one');
assert.ok(html.includes('energyTarget'), 'energy intent must be passed into ranking engine');
assert.ok(html.includes('recommendedBpmForEnergy'), 'body energy must map to a visible recommended BPM');
assert.ok(html.includes('playFourBars'), 'user-facing playback must use four-bar scheduling');
assert.ok(html.includes('Four-chord results play one chord per bar'), 'four-chord harmonic rhythm must be explicit in the writing UI');
assert.ok(html.includes('fortissimo.vibeRoulette.saved.v1'), 'saved directions must use isolated local storage key');
assert.ok(html.includes('fortissimo.vibeRoulette.feedback.v1'), 'feedback must use isolated local storage key');
assert.ok(html.includes('formatSnapshotForClipboard'), 'copy workflow must be wired');
assert.ok(html.includes('<details class="details-toggle">'), 'research diagnostics must be secondary disclosure');
assert.ok(css.includes('@media(max-width:780px)'), 'mobile breakpoint is required');
assert.ok(css.includes('.evidence-box'), 'evidence panel styling is required');
assert.ok(energyCss.includes('.energy-slider'), 'energy slider styling is required');
assert.ok(productCss.includes('font-size:16px'), 'iPhone text input must avoid Safari focus zoom');
assert.ok(productCss.includes('touch-action:manipulation'), 'touch controls must avoid delayed/double-tap interaction');
assert.ok(productCss.includes('@media(pointer:coarse)'), 'coarse-pointer touch target hardening is required');
assert.ok(productCss.includes('overflow-x:hidden'), 'product shell must guard against mobile horizontal overflow');

console.log('PASS Vibe Roulette writing-session UI smoke test');