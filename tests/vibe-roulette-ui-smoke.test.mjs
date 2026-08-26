import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('vibe-roulette.html', 'utf8');
const css = fs.readFileSync('assets/vibe-roulette.css', 'utf8');

for (const id of [
  'moodGrid',
  'spinBtn',
  'resultMood',
  'resultKey',
  'romanLine',
  'chordGrid',
  'metaRow',
  'playBaseBtn',
  'anotherKeyBtn',
  'evidenceContent',
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

assert.ok(
  html.includes("loadVibeRouletteDataset('./data/vibe-roulette/corpus-v0.1.json')"),
  'alpha must load verified corpus-v0.1.json, not provisional seed'
);
assert.ok(!html.includes("loadVibeRouletteDataset('./data/vibe-roulette/seed-v0.json')"), 'alpha must not load provisional seed');
assert.ok(html.includes('HIT-DERIVED · VERIFIED'), 'verified result status must be visible');
assert.ok(html.includes('Mood mapping: Serra editorial model'), 'mood evidence caveat must be visible');
assert.ok(html.includes('F2–Ab4 · sweet spot G3'), 'Serra vocal profile diagnostic must remain visible');
assert.ok(html.includes('progressionToChords'), 'another-key control must re-transpose the current family rather than spin a new one');
assert.ok(css.includes('@media(max-width:780px)'), 'mobile breakpoint is required');
assert.ok(css.includes('.evidence-box'), 'evidence panel styling is required');

console.log('PASS Vibe Roulette isolated UI smoke test');
