import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('../forge.config.js', import.meta.url), 'utf8');

assert.equal(packageJson.name, 'fortissimo-desktop');
assert.equal(packageJson.version, '0.4.0');
assert.equal(packageJson.devDependencies.electron, '44.0.0');
assert.equal(packageJson.devDependencies['@electron-forge/cli'], '7.11.2');
assert.equal(packageJson.devDependencies['@electron-forge/maker-squirrel'], '7.11.2');

for (const token of [
  "const DEFAULT_APP_URL = 'https://fortegym.vercel.app/'",
  'nodeIntegration: false',
  'contextIsolation: true',
  'sandbox: true',
  'webviewTag: false',
  'webSecurity: true',
  'allowRunningInsecureContent: false',
  'setWindowOpenHandler',
  'setPermissionCheckHandler',
  'setPermissionRequestHandler',
  "permission === 'media'",
  'requestSingleInstanceLock',
  'isAllowedIpcSender(event)',
  'ipcMain.handle(MIDI_STAGE_CHANNEL',
  'ipcMain.on(MIDI_DRAG_CHANNEL',
  "path.join(app.getPath('temp'), 'FORTISSIMO', 'midi-drag')",
  'fs.writeFileSync(filePath, file.bytes',
  'event.sender.startDrag({ files, icon })',
  'MAX_STAGE_AGE_MS',
  'cleanupSenderMidi(senderId)'
]) {
  assert.ok(main.includes(token), `Desktop Phase 4 shell contract missing: ${token}`);
}

assert.ok(main.includes("require('node:fs')"), 'Phase 4 main process must own the narrow temporary-file capability.');
assert.ok(!main.includes("require('node:child_process')"), 'Desktop shell must not spawn child processes.');
assert.ok(!main.includes('shell.execute'), 'Desktop shell must not execute arbitrary shell commands.');

for (const token of [
  "contextBridge.exposeInMainWorld('fortissimoDesktop'",
  'isDesktop: true',
  "platform: 'windows'",
  "const BRIDGE_VERSION = '4.0.0'",
  "const CAPABILITIES = Object.freeze(['persistent-session', 'midi-stage', 'midi-drag'])",
  'stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL',
  'startMidiDrag: stageId => ipcRenderer.send(MIDI_DRAG_CHANNEL'
]) {
  assert.ok(preload.includes(token), `Desktop Phase 4 preload contract missing: ${token}`);
}

assert.ok(!preload.includes('ipcRenderer.on('), 'Preload must not expose arbitrary IPC listeners.');
assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!preload.includes("require('node:child_process')"), 'Preload must not expose process spawning.');

for (const token of [
  "executableName: 'FORTISSIMO'",
  "setupExe: 'FORTISSIMO-Setup.exe'",
  'asar: true',
  'extraResource: [dragIcon]',
  'setupIcon: windowsIcon'
]) assert.ok(forge.includes(token), `Forge Phase 4 packaging contract missing: ${token}`);

console.log('PASS FORTISSIMO Desktop Phase 4 shell contract: remote web source of truth, isolated renderer, validated MIDI staging, controlled temp files, native multi-file drag, no arbitrary OS execution.');
