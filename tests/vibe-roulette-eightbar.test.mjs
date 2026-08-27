import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildSecondPassRoman,
  buildEightBarArrangement,
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
assert.ok(['early-color','middle-color','phrasing-only','loop-home','soft-turnaround','open-ending'].includes(arrangement.secondPass.strategy));
assert.ok(arrangement.secondPass.note.length > 20);
assert.ok(Array.isArray(arrangement.secondPass.variationEvents));

// V1.1 intentionally makes functional turnarounds rare. Keep the old structural
// contract—if one is admitted it must share bar 8 rather than create a ninth bar—
// without requiring that rare case to appear inside a tiny 500-seed window.
let varied = null;
for (let i = 0; i < 20000; i += 1) {
  const candidate = buildSecondPassRoman(['I','V','vi','IV'], {
    mode:'major', mood:'illusion', energyTarget:0.72, seed:`seed-${i}`
  });
  if (candidate.roman.length === 5 && candidate.roman.at(-1) === 'V7') { varied = candidate; break; }
}
assert.ok(varied, 'rare gated turnaround should still remain structurally available');
assert.equal(varied.roman.length, 5, 'four-chord loop may add a fifth harmonic event only as a shared final-bar turnaround');
assert.equal(varied.roman.at(-1), 'V7');

let early = null;
for (let i = 0; i < 500; i += 1) {
  const candidate=buildSecondPassRoman(['i','V7'],{mode:'minor',mood:'connection',energyTarget:0.58,seed:`early-${i}`});
  if(candidate.strategy==='early-color'){early=candidate;break;}
}
assert.ok(early,'short commercial loops must sometimes vary the opening harmony of A-prime');
assert.notEqual(early.roman[0],'i','bar 5/6 opening harmony should receive a restrained color variation');
assert.equal(early.roman.at(-1),'V7','an early A-prime variation may preserve the familiar closing harmony');

assert.ok(SLOT_REEL_POOL.length >= 20, 'slot animation needs enough chord symbols to feel like a reel rather than a text swap');

const html = fs.readFileSync('vibe-roulette.html','utf8');
const css = fs.readFileSync('assets/vibe-roulette-eightbar.css','utf8');
const session = fs.readFileSync('assets/vibe-roulette-session.js','utf8');
const seamless=fs.readFileSync('assets/vibe-roulette-seamless-loop-v1.js','utf8');

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
assert.ok(seamless.includes('totalBeats:32'),'seamless performance must be one 32-beat phrase');
assert.ok((seamless.match(/this\.scheduleCycle\(this\.nextCycleStart,token\)/g)||[]).length>=2,'loop transport should schedule at least two complete cycles up front before any boundary');
assert.ok(seamless.includes('fillLookahead(token)'),'loop transport must keep filling a Web Audio lookahead horizon');
assert.ok(!seamless.includes('playFourBars(pass.chords'), 'new loop transport must not restart a four-bar player at bar 5');

console.log('PASS Vibe Roulette eight-bar A/A-prime V2, seamless loop, slot reels and shared header contract');
