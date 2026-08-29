import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MIDI_DRAG_CHANNEL,
  MIDI_DRAG_VERSION,
  MAX_STAGE_AGE_MS,
  normalizeMidiDragRequest
} = require('../midi-drag-contract.cjs');

const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const dragUi = fs.readFileSync(new URL('../../assets/vibe-roulette-desktop-midi-drag-v1.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../../assets/vibe-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');

assert.equal(MIDI_DRAG_CHANNEL, 'fortissimo:midi:drag');
assert.equal(MIDI_DRAG_VERSION, '1.0.0');
assert.equal(MAX_STAGE_AGE_MS, 30 * 60 * 1000);
assert.deepEqual(normalizeMidiDragRequest({ stageId:'12:1788033523000:7' }), { stageId:'12:1788033523000:7' });
assert.throws(() => normalizeMidiDragRequest({ stageId:'../../evil' }), /Malformed MIDI stage id/);
assert.throws(() => normalizeMidiDragRequest({}), /Invalid MIDI stage id/);

for (const token of [
  "const fs = require('node:fs')",
  'ipcMain.on(MIDI_DRAG_CHANNEL',
  'normalizeMidiDragRequest(payload)',
  'staged.stageId !== request.stageId',
  'Date.now() - staged.stagedAt > MAX_STAGE_AGE_MS',
  "path.join(app.getPath('temp'), 'FORTISSIMO', 'midi-drag')",
  'path.dirname(filePath) !== directory',
  "fs.writeFileSync(filePath, file.bytes, { flag: 'w' })",
  'event.sender.startDrag({ files, icon })',
  'removeDirectorySafely(senderMidiDragDirectory(senderId))',
  "path.join(process.resourcesPath, 'favicon.png')"
]) assert.ok(main.includes(token), `Native MIDI drag main-process contract missing: ${token}`);

for (const token of [
  "const BRIDGE_VERSION = '5.0.0'",
  "'midi-drag'",
  'startMidiDrag: stageId => ipcRenderer.send(MIDI_DRAG_CHANNEL',
  'normalizeMidiDragRequest({ stageId })'
]) assert.ok(preload.includes(token), `Native MIDI drag preload contract missing: ${token}`);

for (const token of [
  "import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js'",
  "capabilities.includes('midi-stage')",
  "capabilities.includes('midi-drag')",
  'const pair = await buildCurrentSongStarterMidiPair()',
  'const stage = await api.stageMidiPair(pair)',
  "button.addEventListener('dragstart'",
  'api.startMidiDrag(stagedMidi.stageId)',
  "button.textContent = '↗ Drag 2 MIDI → DAW'",
  'No download step is needed'
]) assert.ok(dragUi.includes(token), `Vibe Roulette Desktop drag UX contract missing: ${token}`);

for (const token of [
  "api.capabilities.includes('midi-drag')",
  "import('./vibe-roulette-desktop-midi-drag-v1.js')"
]) assert.ok(loader.includes(token), `Desktop-only drag loader contract missing: ${token}`);

assert.ok(!dragUi.includes('require('), 'Remote web module must not import Node.js primitives.');
assert.ok(!dragUi.includes('writeFile'), 'Remote web module must not write files itself.');
assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!main.includes('child_process'), 'Native drag must never spawn a process or control the DAW directly.');

console.log('PASS FORTISSIMO Desktop Phase 5 native MIDI drag remains intact: current Foundation + Texture are staged, materialized only under the app temp directory, and exposed as a native Windows multi-file drag with no Downloads step.');
