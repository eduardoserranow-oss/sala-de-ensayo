import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('../forge.config.js', import.meta.url), 'utf8');

assert.equal(packageJson.name, 'fortissimo-desktop');
assert.equal(packageJson.version, '0.2.0');
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
  'requestSingleInstanceLock'
]) {
  assert.ok(main.includes(token), `Desktop shell contract missing: ${token}`);
}

assert.ok(!main.includes('startDrag('), 'Phase 2 must not implement native MIDI drag yet.');
assert.ok(!main.includes('ipcMain'), 'Phase 2 must not expose privileged IPC handlers yet.');
assert.ok(!main.includes("require('node:fs')"), 'Desktop shell must not access the filesystem yet.');
assert.ok(!main.includes("require('node:child_process')"), 'Desktop shell must not spawn child processes.');

for (const token of [
  "contextBridge.exposeInMainWorld('fortissimoDesktop'",
  'isDesktop: true',
  "platform: 'windows'",
  "const CAPABILITIES = Object.freeze(['persistent-session'])"
]) {
  assert.ok(preload.includes(token), `Desktop preload contract missing: ${token}`);
}

assert.ok(!preload.includes('ipcRenderer'), 'Phase 2 preload must not expose or use renderer IPC.');
assert.ok(!preload.includes('invoke('), 'Phase 2 renderer must not have privileged request IPC.');
assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!preload.includes("require('node:child_process')"), 'Preload must not expose process spawning.');

assert.ok(forge.includes("executableName: 'FORTISSIMO'"));
assert.ok(forge.includes("setupExe: 'FORTISSIMO-Setup.exe'"));
assert.ok(forge.includes('asar: true'));

console.log('PASS FORTISSIMO Desktop Phase 2 shell contract: remote web source of truth, isolated renderer, persistent session capability, no native MIDI/filesystem privileges yet.');
