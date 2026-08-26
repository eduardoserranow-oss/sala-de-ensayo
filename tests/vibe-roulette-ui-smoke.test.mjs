import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('vibe-roulette.html', 'utf8');
const css = fs.readFileSync('assets/vibe-roulette.css', 'utf8');
const energyCss = fs.readFileSync('assets/vibe-roulette-energy.css', 'utf8');

for (const id of [
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
  'evidenceContent',
  'serraFitNote',
  'chorusStrategy',
  'chorusNote',
  'chorusChords',
  'playChorusBtn'
]) {
  assert.ok(html.includes(`id="${id}"`), `missing required UI control #${id}`);
}

for (const mood of ['illusion', 'nostalgia', 'connection']) {
  assert.ok(html.includes(`data-mood="${mood}"`), `missing mood ${mood}`);
}

assert.ok(html.includes('VibeRouletteIntentEngine'), 'alpha must use the intent-aware engine');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.1.json'"), 'alpha must load verified corpus-v0.1.json');
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.2-supplement.json'"), 'alpha must load the verified supplement');
assert.ok(!html.includes("'./data/vibe-roulette/seed-v0.json'"), 'alpha must not load provisional seed');
assert.ok(html.includes('HIT-DERIVED · VERIFIED'), 'verified result status must be visible');
assert.ok(html.includes('Mood mapping: Serra editorial model'), 'mood evidence caveat must be visible');
assert.ok(html.includes('F2–Ab4 · sweet spot G3'), 'Serra vocal profile diagnostic must remain visible');
assert.ok(html.includes('progressionToChords'), 'another-key control must re-transpose the current family rather than spin a new one');
assert.ok(html.includes('energyTarget'), 'energy intent must be passed into the ranking engine');
assert.ok(html.includes('Modern Latin and Afrobeats hits are kept in a separate research queue'), 'research candidates must be explicitly separated from feed data');
assert.ok(css.includes('@media(max-width:780px)'), 'mobile breakpoint is required');
assert.ok(css.includes('.evidence-box'), 'evidence panel styling is required');
assert.ok(energyCss.includes('.energy-slider'), 'energy slider styling is required');

console.log('PASS Vibe Roulette isolated UI smoke test');
