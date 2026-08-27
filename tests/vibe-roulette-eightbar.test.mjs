import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildSecondPassRoman,
  buildEightBarArrangement,
  chooseTurnaroundType,
  SLOT_REEL_POOL
} from '../assets/vibe-roulette-eightbar.js';

const baseResult = {
  progressionId: 'test-afro-loop',
  mood: 'nostalgia',
  key: 'C',
  mode: 'major',
  roman: ['IV','V','vi','V'],
  intent: { energyTarget: 0.72 }
};

const arrangement = buildEightBarArrangement(baseResult, { energyTarget: 0.72 });
assert.equal(arrangement.bars, 8);
assert.equal(arrangement.totalBeats, 32);
assert.equal(arrangement.firstPass.chordBars.length, 4);
assert.equal(arrangement.secondPass.chordBars.length, 4);
assert.deepEqual(arrangement.firstPass.chordBars, ['F','G','Am','G']);
assert.equal(arrangement.firstPass.romanBars.length, 4);
assert.equal(arrangement.secondPass.romanBars.length, 4);
assert.ok(['loop-home','soft-turnaround','open-ending'].includes(arrangement.secondPass.strategy));
assert.ok(arrangement.secondPass.note.length > 20);

let loopSeed = null;
for (let i = 0; i < 200; i += 1) {
  const seed = `seed-${i}`;
  if (chooseTurnaroundType({ mood:'illusion', energyTarget:0.72, seed }) === 'loop-home') { loopSeed = seed; break; }
}
assert.ok(loopSeed, 'test should find a deterministic loop-home seed');
const varied = buildSecondPassRoman(['I','V','vi','IV'], { mode:'major', mood:'illusion', energyTarget:0.72, seed:loopSeed });
assert.equal(varied.strategy, 'loop-home');
assert.equal(varied.roman.length, 5, 'four-chord loop may add a fifth harmonic event only as a shared final-bar turnaround');
assert.equal(varied.roman.at(-1), 'V7');

assert.ok(SLOT_REEL_POOL.length >= 20, 'slot animation needs enough chord symbols to feel like a reel rather than a text swap');

const html = fs.readFileSync('vibe-roulette.html','utf8');
const css = fs.readFileSync('assets/vibe-roulette-eightbar.css','utf8');
const session = fs.readFileSync('assets/vibe-roulette-session.js','utf8');

assert.equal((html.match(/data-slot="\d"/g) || []).length, 8, 'UI must expose exactly eight bar reels');
assert.ok(html.includes('A · First pass · Bars 1–4'));
assert.ok(html.includes('A′ · Variation · Bars 5–8'));
assert.ok(html.includes('▶ Play 8-bar loop'));
assert.ok(html.includes('⏸ Pause loop'));
assert.ok(html.includes('EightBarLoopTransport'));
assert.ok(html.includes('SLOT_REEL_POOL'));
assert.ok(html.includes('clearSlots();'), 'initial page must explicitly clear all reels');
assert.ok(!html.includes('renderResult(state.engine.spin'), 'page must not auto-spin on load');
assert.ok(html.includes('fortissimo-header-fix.js'), 'Vibe Roulette must consume the shared global header system');
assert.ok(html.includes('home-tuner.js'), 'Vibe Roulette must mount the same tuner used by the shared header');
assert.ok(html.includes('fortissimo-header-logo-v6.jpg'), 'shared header must use the canonical current logo asset');
assert.ok(html.includes('href="./?return=vibe-roulette&internal=1"'), 'center logo/header navigation must return to Home');
assert.ok(css.includes('@keyframes vr-slot-flick'));
assert.ok(css.includes('@keyframes vr-slot-land'));
assert.ok(css.includes('grid-template-columns:repeat(4'));
assert.ok(session.includes('secondPass'), 'saved/copy snapshot must preserve A-prime variation');
assert.ok(session.includes('playbackBars'), 'snapshot must preserve eight-bar session length');

console.log('PASS Vibe Roulette eight-bar A/A-prime loop, slot reels and shared header contract');
