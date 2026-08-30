import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contract = require('../phase91-background-audio-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');

assert.equal(contract.BACKGROUND_AUDIO_VERSION, '1.0.0');
assert.deepEqual(contract.backgroundAudioWebPreferences(), { backgroundThrottling: false });
assert.ok(main.includes('backgroundThrottling: false'), 'Desktop BrowserWindow must keep timers/audio active while unfocused or minimized.');
assert.ok(!main.includes("document.addEventListener('visibilitychange'"), 'Desktop main-process must not add visibility-driven playback stops.');
assert.ok(!main.includes("win.on('blur'"), 'Desktop shell must not stop playback on window blur.');

console.log('PASS FORTISSIMO Desktop Phase 9.1 background audio contract.');
