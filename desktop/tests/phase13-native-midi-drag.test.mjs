import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dragSource = fs.readFileSync(path.join(root, 'assets', 'vibe-roulette-desktop-midi-drag-v1.js'), 'utf8');
const spinSource = fs.readFileSync(path.join(root, 'assets', 'vibe-roulette-spin-audio-sync-v1.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'desktop', 'main.cjs'), 'utf8');

assert.match(dragSource, /Arrastrar MIDI/);
assert.match(dragSource, /ARRASTRAR 2 MIDI A ABLETON/);
assert.match(dragSource, /✋/);
assert.match(dragSource, /api\.startMidiDrag\(stagedMidi\.stageId, selection\)/);
assert.match(dragSource, /event\.preventDefault\(\)/);
assert.match(dragSource, /buildCurrentSongStarterMidiPair/);
assert.match(dragSource, /Foundation \+ Texture/);
assert.match(dragSource, /export 2 midi/);
assert.match(dragSource, /MutationObserver/);
assert.match(spinSource, /desktop-midi-drag13/);
assert.match(spinSource, /1\.6-phase13-native-midi-drag/);
assert.match(mainSource, /event\.sender\.startDrag\(\{ files, icon \}\)/);
assert.doesNotMatch(dragSource, /child_process|exec\(|spawn\(/);

console.log('Phase 13 native MIDI drag contract OK');
