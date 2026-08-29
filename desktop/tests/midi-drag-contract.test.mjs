import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MIDI_DRAG_CHANNEL, MIDI_DRAG_VERSION, MAX_STAGE_AGE_MS, normalizeMidiDragRequest } = require('../midi-drag-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const dragUi = fs.readFileSync(new URL('../../assets/vibe-roulette-desktop-midi-drag-v1.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../../assets/vibe-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');

assert.equal(MIDI_DRAG_CHANNEL, 'fortissimo:midi:drag');
assert.equal(MIDI_DRAG_VERSION, '2.0.0');
assert.equal(MAX_STAGE_AGE_MS, 30 * 60 * 1000);
assert.deepEqual(normalizeMidiDragRequest({ stageId:'12:1788033523000:7' }), { stageId:'12:1788033523000:7', selection:'pair' });
assert.deepEqual(normalizeMidiDragRequest({ stageId:'12:1788033523000:7', selection:'foundation' }), { stageId:'12:1788033523000:7', selection:'foundation' });
assert.throws(() => normalizeMidiDragRequest({ stageId:'12:1788033523000:7', selection:'wrong' }), /Invalid MIDI drag selection/);
assert.throws(() => normalizeMidiDragRequest({ stageId:'../../evil' }), /Malformed MIDI stage id/);

for (const token of [
  "const fs = require('node:fs')",
  'ipcMain.on(MIDI_DRAG_CHANNEL',
  'normalizeMidiDragRequest(payload)',
  'requireCurrentStage(event, request.stageId)',
  'materializeStagedMidi(senderId, staged, request.selection)',
  "const expectedCount = request.selection === 'pair' ? 2 : 1",
  "path.join(app.getPath('temp'), 'FORTISSIMO', 'midi-drag')",
  'event.sender.startDrag({ files, icon })',
  "path.join(process.resourcesPath, 'favicon.png')"
]) assert.ok(main.includes(token), `Native MIDI drag main-process contract missing: ${token}`);

for (const token of [
  "const BRIDGE_VERSION = '8.0.0'",
  "'midi-drag'",
  "'midi-drag-selective'",
  "startMidiDrag: (stageId, selection = 'pair') => ipcRenderer.send(MIDI_DRAG_CHANNEL",
  'normalizeMidiDragRequest({ stageId, selection })'
]) assert.ok(preload.includes(token), `Native MIDI drag preload contract missing: ${token}`);

for (const token of [
  "import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js'",
  "capabilities.includes('midi-stage')",
  "capabilities.includes('midi-drag')",
  'const pair = await buildCurrentSongStarterMidiPair()',
  'const stage = await api.stageMidiPair(pair)',
  "bindNativeDrag(pair, 'pair')",
  "bindNativeDrag(foundation, 'foundation')",
  "bindNativeDrag(texture, 'texture')",
  'api.startMidiDrag(stagedMidi.stageId, selection)'
]) assert.ok(dragUi.includes(token), `Vibe Roulette Desktop drag UX contract missing: ${token}`);

for (const token of [
  "api.capabilities.includes('midi-drag')",
  "const DESKTOP_MIDI_DRAG_MODULE_URL = './vibe-roulette-desktop-midi-drag-v1.js?v=desktop-midi-drag7'",
  'import(DESKTOP_MIDI_DRAG_MODULE_URL)',
  "window.__FORTISSIMO_DESKTOP_MIDI_DRAG_LOADED__ = true",
  'setTimeout(installAdaptiveWorkspace, 0)'
]) {
  assert.ok(loader.includes(token), `Desktop-only drag loader contract missing: ${token}`);
}
assert.ok(!dragUi.includes('require('));
assert.ok(!dragUi.includes('writeFile'));
assert.ok(!preload.includes("require('node:fs')"));
assert.ok(!main.includes('child_process'));
console.log('PASS FORTISSIMO Desktop Phase 8 keeps selective native MIDI drag isolated and secure.');
