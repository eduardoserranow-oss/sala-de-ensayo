import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contract = require('../native-toolkit-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../../assets/vibe-roulette-desktop-midi-drag-v1.js', import.meta.url), 'utf8');

assert.equal(contract.DESKTOP_TOOLKIT_VERSION, '1.0.0');
assert.equal(contract.MIDI_EXPORT_FOLDER_CHANNEL, 'fortissimo:midi:export-folder');
assert.equal(contract.MIDI_EXPORT_SAVE_CHANNEL, 'fortissimo:midi:save');
assert.equal(contract.MIDI_EXPORT_OPEN_CHANNEL, 'fortissimo:midi:open-folder');
assert.deepEqual(contract.MIDI_SELECTIONS, ['pair', 'foundation', 'texture']);
assert.equal(contract.normalizeMidiSelection('foundation'), 'foundation');
assert.throws(() => contract.normalizeMidiSelection('all-files'), /Invalid MIDI selection/);
assert.deepEqual(contract.normalizeToolkitRequest({ stageId:'12:1788033523000:7', selection:'texture' }), { stageId:'12:1788033523000:7', selection:'texture' });
assert.throws(() => contract.normalizeToolkitRequest({ stageId:'../../evil', selection:'pair' }), /Malformed MIDI stage id/);

for (const token of [
  'dialog.showOpenDialog(mainWindow',
  "properties: ['openDirectory', 'createDirectory']",
  "path.join(app.getPath('userData'), 'desktop-toolkit.json')",
  'lastMidiExportDirectory',
  'uniqueExportPath(directory, file.filename)',
  "fs.writeFileSync(filePath, file.bytes, { flag: 'wx' })",
  'shell.openPath(lastMidiExportDirectory)',
  'ipcMain.handle(MIDI_EXPORT_FOLDER_CHANNEL',
  'ipcMain.handle(MIDI_EXPORT_SAVE_CHANNEL',
  'ipcMain.handle(MIDI_EXPORT_OPEN_CHANNEL',
  'normalizeToolkitRequest(payload)',
  'selectStagedFiles(staged, request.selection)'
]) assert.ok(main.includes(token), `Phase 6 native toolkit main-process contract missing: ${token}`);

for (const token of [
  "const BRIDGE_VERSION = '6.0.0'",
  "'midi-drag-selective'",
  "'midi-export-folder'",
  "'midi-export-native'",
  'chooseMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_FOLDER_CHANNEL)',
  'saveStagedMidi: (stageId, selection = \'pair\') => ipcRenderer.invoke(MIDI_EXPORT_SAVE_CHANNEL',
  'openMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_OPEN_CHANNEL)'
]) assert.ok(preload.includes(token), `Phase 6 preload toolkit bridge missing: ${token}`);

for (const token of [
  'DAW EXPORT',
  'DESKTOP NATIVE',
  '↗ DRAG 2 MIDI → DAW',
  '↗ Foundation',
  '↗ Texture',
  'Choose MIDI Folder',
  'Save 2 MIDI',
  'Open Folder',
  "api.startMidiDrag(stagedMidi.stageId, selection)",
  "api.saveStagedMidi(stagedMidi.stageId, selection)",
  'api.chooseMidiExportFolder()',
  'api.openMidiExportFolder()'
]) assert.ok(ui.includes(token), `Phase 6 Vibe Roulette toolkit UX missing: ${token}`);

assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!ui.includes('require('), 'Remote Vibe Roulette module must not import Node.js primitives.');
assert.ok(!ui.includes('writeFile'), 'Remote Vibe Roulette module must not write files itself.');
assert.ok(!main.includes('child_process'), 'Desktop toolkit must never spawn or control a DAW process.');

console.log('PASS FORTISSIMO Desktop Phase 6 native toolkit: selective MIDI drag, user-chosen project-folder export, collision-safe writes and open-folder actions remain behind trusted narrow IPC.');
