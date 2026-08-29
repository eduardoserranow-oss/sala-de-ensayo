import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ROULETTE_SPIN_DURATION_MS,
  ROULETTE_SPIN_AUDIO_MIME
} from '../assets/fortissimo-roulette-spin-audio-v1.js';
import { VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO } from '../assets/vibe-roulette-spin-audio-sync-v1.js';

const audioSource = fs.readFileSync(new URL('../assets/fortissimo-roulette-spin-audio-v1.js', import.meta.url), 'utf8');
const wheelFixSource = fs.readFileSync(new URL('../assets/wheel-fix-v2.js', import.meta.url), 'utf8');
const routineSource = fs.readFileSync(new URL('../assets/routine-practice-v2.js', import.meta.url), 'utf8');
const eightBarSource = fs.readFileSync(new URL('../assets/vibe-roulette-eightbar.js', import.meta.url), 'utf8');
const vibeSyncSource = fs.readFileSync(new URL('../assets/vibe-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');
const vibeHtml = fs.readFileSync(new URL('../vibe-roulette.html', import.meta.url), 'utf8');

assert.equal(ROULETTE_SPIN_DURATION_MS, 3530, 'The extracted roulette sound must remain the 3.53 s master used by the UI.');
assert.equal(ROULETTE_SPIN_AUDIO_MIME, 'audio/mp4');
assert.match(audioSource, /data:\$\{ROULETTE_SPIN_AUDIO_MIME\};base64/);
assert.match(audioSource, /AUDIO_B64_PART_1/);
assert.match(audioSource, /AUDIO_B64_PART_2/);

assert.match(routineSource, /type:\s*"wheel-fourths"/);
assert.match(routineSource, /type:\s*"wheel-chords"/);
assert.match(wheelFixSource, /fortissimo-roulette-spin-audio-v1\.js/);
assert.match(wheelFixSource, /applySpinDuration\(wheel, spinner/);
assert.match(wheelFixSource, /playRouletteSpinAudio/);
assert.match(wheelFixSource, /if \(endedNormally\) finish\(\)/);
assert.doesNotMatch(wheelFixSource, /addEventListener\(["']transitionend["']/,
  'Routine wheels must not stop early from CSS transitionend; audio ended is authoritative.');

assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.durationMs, ROULETTE_SPIN_DURATION_MS);
assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.expectedSlotStops, 8);
assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.stopAuthority, 'audio-ended');
assert.deepEqual(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.slotStopDelays, [520, 602, 684, 766, 938, 1020, 1102, 1184]);
assert.match(vibeSyncSource, /button\.addEventListener\('click'/);
assert.match(vibeSyncSource, /\{ capture: true \}/);
assert.match(vibeSyncSource, /looksLikeVibeSlotStop/);
assert.match(vibeSyncSource, /if \(endedNormally\) flushStops\(\)/);
assert.match(eightBarSource, /import '\.\/vibe-roulette-spin-audio-sync-v1\.js';/);
assert.match(vibeHtml, /id="spinBtn"/);
assert.match(vibeHtml, /function spinCard\(card,target,index\)/);

console.log('Global roulette spin audio contract passed: Guitar/Bass wheels + Vibe Roulette stop on the extracted sound.');
