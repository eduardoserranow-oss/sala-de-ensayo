import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('vibe-roulette.html', 'utf8');
const css = fs.readFileSync('assets/vibe-roulette.css', 'utf8');
const energyCss = fs.readFileSync('assets/vibe-roulette-energy.css', 'utf8');
const productCss = fs.readFileSync('assets/vibe-roulette-product.css', 'utf8');
const engineV2 = fs.readFileSync('assets/vibe-roulette-engine-v2.js', 'utf8');
const rhodes = fs.readFileSync('assets/vibe-roulette-rhodes-v2.js', 'utf8');

for (const id of [
  'workingTitle','moodGrid','energySlider','energyValue','tempoGuide','spinBtn','resultMood','resultKey','romanLine','chordGrid','metaRow','playBaseBtn','anotherKeyBtn','saveBtn','copyBtn','evidenceContent','serraFitNote','chorusStrategy','chorusNote','chorusChords','playChorusBtn','feedbackActions','savedList'
]) assert.ok(html.includes(`id="${id}"`), `missing required UI control #${id}`);

for (const mood of ['illusion','nostalgia','connection']) assert.ok(html.includes(`data-mood="${mood}"`));
for (const feedback of ['inspire','interesting','generic','wrongVibe']) assert.ok(html.includes(`data-feedback="${feedback}"`));

assert.ok(html.includes('VibeRouletteIntentEngine'));
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.1.json'"));
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.2-supplement.json'"));
assert.ok(html.includes("'./data/vibe-roulette/corpus-v0.3-modern-verified.json'"));
assert.ok(!html.includes("'./data/vibe-roulette/seed-v0.json'"));
assert.ok(!html.includes("'./data/vibe-roulette/candidate-intake-v0.2.json'"));
assert.ok(!html.includes("'./data/vibe-roulette/afrobeats-practitioner-v0.1.json'"), 'practitioner evidence must not silently enter verified roulette feed');
assert.ok(html.includes('HIT-DERIVED · VERIFIED'));
assert.ok(html.includes('Mood mapping: Serra editorial model'));
assert.ok(html.includes('F2–Ab4 · sweet spot G3'));
assert.ok(html.includes('progressionToChords'));
assert.ok(html.includes('energyTarget'));
assert.ok(html.includes('recommendedBpmForEnergy'));
assert.ok(html.includes('playFourBars'));
assert.ok(html.includes('Four-chord results play one chord per bar'));
assert.ok(html.includes('fortissimo.vibeRoulette.saved.v1'));
assert.ok(html.includes('fortissimo.vibeRoulette.feedback.v1'));
assert.ok(html.includes('formatSnapshotForClipboard'));
assert.ok(html.includes('<details class="details-toggle">'));
assert.ok(css.includes('@media(max-width:780px)'));
assert.ok(css.includes('.evidence-box'));
assert.ok(energyCss.includes('.energy-slider'));
assert.ok(productCss.includes('font-size:16px'));
assert.ok(productCss.includes('touch-action:manipulation'));
assert.ok(productCss.includes('@media(pointer:coarse)'));
assert.ok(productCss.includes('overflow-x:hidden'));

assert.ok(engineV2.includes('SoftHumanRhodesPreview'), 'intent engine must use soft Rhodes V2');
assert.ok(engineV2.includes('choosePracticalEnharmonicKey'), 'engine must prevent impractical Cb-style user-facing spellings when cleaner equivalent keys exist');
assert.ok(engineV2.includes('prepareFourBars'), 'current direction should preload samples');
assert.ok(rhodes.includes('audio/rhodes-fm'), 'Rhodes V2 must point only at MIT generated FM samples');
assert.ok(rhodes.includes('velocityLayerForMidiVelocity'));
assert.ok(rhodes.includes('buildSoftHumanRhodesPlan'));
assert.ok(rhodes.includes('practicalizeChordForPlayback'), 'playback parser must accept theoretical enharmonic roots safely');
assert.ok(rhodes.includes('rotaryProfileForEnergy'));
assert.ok(!rhodes.includes('/audio/rhodes/'), 'must not reference non-commercial jRhodes3d samples');
assert.ok(rhodes.includes("comp.ratio.value=1.25"), 'V2 dynamics must stay much gentler than prior compression');
assert.ok(rhodes.includes("output.gain.value=0.48"), 'V2 output must be calibrated below aggressive V1 level');

console.log('PASS Vibe Roulette writing-session UI + practical spelling + soft Rhodes V2 smoke test');
