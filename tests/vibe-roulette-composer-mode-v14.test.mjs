import assert from 'node:assert/strict';import fs from 'node:fs';
const composer=fs.readFileSync(new URL('../assets/vibe-roulette-composer-mode-v1.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/vibe-roulette-spin-audio-sync-v1.js',import.meta.url),'utf8');
for(const token of ["version:'14.1.1'","pillars:Object.freeze(['listen','edit','variate'])",'keepDnaMaxChanges:2','pianoRoll:true','subdivisions:true','barExact:true','window.__FORTISSIMO_VIBE_SESSION_V1__','window.__FORTISSIMO_VIBE_ENGINE__','playFourBars([t.chord]','function regenerateSlot(slot)','function keepDNA()','function undo()','function redo()','SPIN AGAIN TO REPLACE','Your edited composition is protected','✦ Keep DNA','data-action="vary"','data-action="edit"','expandPassToBars','applyExactAlternative'])assert.ok(composer.includes(token),`Composer contract missing: ${token}`);
for(const token of ['composer14-1b','installComposerMode()','1.9-phase14-1b-polish'])assert.ok(loader.includes(token),`Composer loader missing: ${token}`);
assert.ok(!composer.includes('data-action="lock"'),'lock button must stay removed');
assert.ok(!composer.includes('data-action="listen"'),'play button must stay removed');
assert.ok(!composer.includes("require('node:"));assert.ok(!composer.includes('child_process'));assert.ok(!composer.includes('startDrag('));
console.log('PASS Composer Mode 14.1: tap bar to listen, regenerate/edit only, bar-exact variation, no lock/play clutter.');
