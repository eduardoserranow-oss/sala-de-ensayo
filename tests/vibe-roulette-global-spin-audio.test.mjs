// Final-tree regression gate for Home + Guitar/Bass + Vibe Roulette audio sync.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ROULETTE_SPIN_DURATION_MS,
  ROULETTE_SPIN_AUDIO_MIME,
  ROULETTE_SPIN_AUDIO_VERSION,
  ROULETTE_SPIN_AUDIO_V2_INFO
} from '../assets/fortissimo-roulette-spin-audio-v2.js';
import { HOME_ROULETTE_SPIN_AUDIO_SYNC_INFO } from '../assets/home-roulette-spin-audio-sync-v1.js';
import { VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO } from '../assets/vibe-roulette-spin-audio-sync-v1.js';

const audioSource = fs.readFileSync(new URL('../assets/fortissimo-roulette-spin-audio-v2.js', import.meta.url), 'utf8');
const homeSyncSource = fs.readFileSync(new URL('../assets/home-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');
const homeLoaderSource = fs.readFileSync(new URL('../assets/vocal-hero-hd-loader.js', import.meta.url), 'utf8');
const wheelFixSource = fs.readFileSync(new URL('../assets/wheel-fix-v2.js', import.meta.url), 'utf8');
const wheelRevealSource = fs.readFileSync(new URL('../assets/wheel-reveal-v1.js', import.meta.url), 'utf8');
const routineSource = fs.readFileSync(new URL('../assets/routine-practice-v2.js', import.meta.url), 'utf8');
const eightBarSource = fs.readFileSync(new URL('../assets/vibe-roulette-eightbar.js', import.meta.url), 'utf8');
const vibeSyncSource = fs.readFileSync(new URL('../assets/vibe-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');
const vibeHtml = fs.readFileSync(new URL('../vibe-roulette.html', import.meta.url), 'utf8');
const homeHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.equal(ROULETTE_SPIN_DURATION_MS, 1450, 'Roulette Experience V2 must use the approved 1.45 s short master.');
assert.equal(ROULETTE_SPIN_AUDIO_MIME, 'audio/generated');
assert.equal(ROULETTE_SPIN_AUDIO_VERSION, '2.0-short-mechanical');
assert.equal(ROULETTE_SPIN_AUDIO_V2_INFO.landingClickSeconds, 1.36);
assert.equal(ROULETTE_SPIN_AUDIO_V2_INFO.revealAuthority, 'audio-buffer-source-ended');
assert.equal(ROULETTE_SPIN_AUDIO_V2_INFO.clickTimesSeconds.length, 13);
assert.match(audioSource, /AudioContext \|\| window\.webkitAudioContext/);
assert.match(audioSource, /source\.addEventListener\('ended'/);
assert.match(audioSource, /source\.start\(0\)/);
assert.match(audioSource, /Strong final landing click/);
assert.doesNotMatch(audioSource, /AUDIO_B64_PART_/,
  'The short master is generated locally so it cannot fall back to the old long embedded audio.');

assert.equal(HOME_ROULETTE_SPIN_AUDIO_SYNC_INFO.durationMs, ROULETTE_SPIN_DURATION_MS);
assert.equal(HOME_ROULETTE_SPIN_AUDIO_SYNC_INFO.legacyStopDelayMs, 1650);
assert.equal(HOME_ROULETTE_SPIN_AUDIO_SYNC_INFO.stopAuthority, 'audio-ended');
assert.match(homeHtml, /id="spinButton"/);
assert.match(homeHtml, /setTimeout\(resolve,1650\)/);
assert.match(homeSyncSource, /fortissimo-roulette-spin-audio-v2\.js/);
assert.match(homeSyncSource, /document\.addEventListener\('click'/);
assert.match(homeSyncSource, /Number\(delay\) === LEGACY_HOME_STOP_DELAY_MS/);
assert.match(homeSyncSource, /if \(endedNormally\) flushLegacyStop\(\)/);
assert.match(homeLoaderSource, /home-roulette-spin-audio-sync-v1\.js/);

assert.match(routineSource, /type:\s*"wheel-fourths"/);
assert.match(routineSource, /type:\s*"wheel-chords"/);
assert.match(wheelFixSource, /fortissimo-roulette-spin-audio-v2\.js/);
assert.match(wheelFixSource, /const DEFAULT_SPIN_DURATION_MS = 1450/);
assert.match(wheelFixSource, /applySpinDuration\(wheel, spinner/);
assert.match(wheelFixSource, /playRouletteSpinAudio/);
assert.match(wheelFixSource, /if \(endedNormally\) finish\(\)/);
assert.doesNotMatch(wheelFixSource, /addEventListener\(["']transitionend["']/,
  'Routine wheels must not stop early from CSS transitionend; audio ended is authoritative.');
assert.match(wheelRevealSource, /__FORTISSIMO_LEGACY_WHEEL_REVEAL_DISABLED__/);
assert.doesNotMatch(wheelRevealSource, /stopImmediatePropagation/,
  'The legacy document-capture wheel interceptor must stay disabled so wheel-fix-v2 can receive the iPhone gesture.');
assert.doesNotMatch(wheelRevealSource, /const SPIN_MS\s*=\s*1250/,
  'The old 1.25 s wheel stop must not remain active.');

assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.durationMs, ROULETTE_SPIN_DURATION_MS);
assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.expectedSlotStops, 8);
assert.equal(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.stopAuthority, 'audio-ended');
assert.deepEqual(VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO.slotStopDelays, [520, 602, 684, 766, 938, 1020, 1102, 1184]);
assert.match(vibeSyncSource, /fortissimo-roulette-spin-audio-v2\.js/);
assert.match(vibeSyncSource, /button\.addEventListener\('click'/);
assert.match(vibeSyncSource, /\{ capture: true \}/);
assert.match(vibeSyncSource, /looksLikeVibeSlotStop/);
assert.match(vibeSyncSource, /if \(endedNormally\) flushStops\(\)/);
assert.match(eightBarSource, /import '\.\/vibe-roulette-spin-audio-sync-v1\.js';/);
assert.match(vibeHtml, /id="spinBtn"/);
assert.match(vibeHtml, /function spinCard\(card,target,index\)/);

console.log('Roulette Experience V2 passed: short 1.45 s sound + result reveal only when the sound ends across Home, Guitar/Bass and Vibe Roulette.');
