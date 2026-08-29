import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('../forge.config.js', import.meta.url), 'utf8');

assert.equal(packageJson.name, 'fortissimo-desktop');
assert.equal(packageJson.version, '0.3.0');
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
  'ipcMain.handle(MIDI_STAGE_CHANNEL'
]) {
  assert.ok(main.includes(token), `Desktop shell contract missing: ${token}`);
}

assert.ok(!main.includes('startDrag('), 'Phase 3 must not implement native MIDI drag yet.');
assert.ok(!main.includes("require('node:fs')"), 'Phase 3 must not access the filesystem yet.');
assert.ok(!main.includes("require('node:child_process')"), 'Desktop shell must not spawn child processes.');

for (const token of [
  "contextBridge.exposeInMainWorld('fortissimoDesktop'",
  'isDesktop: true',
  "platform: 'windows'",
  "const CAPABILITIES = Object.freeze(['persistent-session', 'midi-stage'])",
  'stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL'
]) {
  assert.ok(preload.includes(token), `Desktop preload contract missing: ${token}`);
}

assert.ok(!preload.includes('ipcRenderer.send('), 'Preload must not expose arbitrary fire-and-forget IPC.');
assert.ok(!preload.includes('ipcRenderer.on('), 'Preload must not expose arbitrary IPC listeners.');
assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!preload.includes("require('node:child_process')"), 'Preload must not expose process spawning.');

assert.ok(forge.includes("executableName: 'FORTISSIMO'"));
assert.ok(forge.includes("setupExe: 'FORTISSIMO-Setup.exe'"));
assert.ok(forge.includes('asar: true'));

console.log('PASS FORTISSIMO Desktop Phase 3 shell contract: remote web source of truth, isolated renderer, narrow validated MIDI staging IPC, no filesystem or native drag yet.');
