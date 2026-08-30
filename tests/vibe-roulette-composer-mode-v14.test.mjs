import assert from 'node:assert/strict';
import fs from 'node:fs';

const composer=fs.readFileSync(new URL('../assets/vibe-roulette-composer-mode-v1.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/vibe-roulette-spin-audio-sync-v1.js',import.meta.url),'utf8');

for(const token of [
  "version:'14.0.0'",
  "pillars:Object.freeze(['listen','lock','edit','variate'])",
  'keepDnaMaxChanges:2',
  'pianoRoll:false',
  'subdivisions:false',
  'window.__FORTISSIMO_VIBE_SESSION_V1__',
  'window.__FORTISSIMO_VIBE_ENGINE__',
  'engine.playFourBars([target.chord]',
  'bars:1',
  'beatsPerBar:4',
  'performancePattern:snapshot.result.performancePattern',
  'const locks=new Set()',
  'function toggleLock(slotIndex)',
  'function regenerateSlot(slotIndex)',
  'function keepDNA()',
  'const desired=Math.min(VIBE_ROULETTE_COMPOSER_MODE_V1_INFO.keepDnaMaxChanges',
  'function undo()',
  'function redo()',
  "showCompare('A')",
  "showCompare('B')",
  'buildEightBarArrangement(next.result',
  'suggestAfroChordAlternatives',
  'replaceRomanAt',
  'SPIN AGAIN TO REPLACE',
  'Your edited composition is protected',
  'LISTEN · LOCK · EDIT · VARIATE',
  '✦ Keep DNA',
  'data-action="listen"',
  'data-action="lock"',
  'data-action="vary"',
  'data-action="edit"'
])assert.ok(composer.includes(token),`Composer Mode contract missing: ${token}`);

for(const token of [
  "const COMPOSER_MODE_MODULE_URL = './vibe-roulette-composer-mode-v1.js?v=composer14-0'",
  'installComposerMode();',
  "version: '1.7-phase14-composer-mode'"
])assert.ok(loader.includes(token),`Composer Mode loader missing: ${token}`);

assert.ok(!composer.includes("require('node:"),'Composer Mode must remain browser-only.');
assert.ok(!composer.includes('child_process'),'Composer Mode must not control a DAW process.');
assert.ok(!composer.includes('startDrag('),'Composer Mode must not change Phase 13 drag behavior.');
assert.ok(!composer.includes('Piano Roll'),'Phase 14.0 must not implement the Phase 14.1 Piano Roll.');
assert.ok(!composer.includes('2+2'),'Phase 14.0 must not implement harmonic subdivisions yet.');

console.log('PASS Vibe Roulette Phase 14.0 Composer Mode: listen, lock, edit, variate, A/B and history without Piano Roll or subdivisions.');
