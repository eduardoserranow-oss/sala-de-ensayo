import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('../forge.config.js', import.meta.url), 'utf8');
const nativeAssets = fs.readFileSync(new URL('../prepare-native-assets.cjs', import.meta.url), 'utf8');

assert.equal(packageJson.name, 'fortissimo-desktop');
assert.equal(packageJson.version, '0.12.0');
assert.equal(packageJson.repository, 'https://github.com/eduardoserranow-oss/sala-de-ensayo');
assert.equal(packageJson.dependencies['update-electron-app'], '3.3.0');
assert.equal(packageJson.dependencies['electron-squirrel-startup'], '1.0.1');
assert.equal(packageJson.devDependencies.electron, '44.0.0');
assert.equal(packageJson.devDependencies['@electron-forge/cli'], '7.11.2');
assert.equal(packageJson.devDependencies['@electron-forge/maker-squirrel'], '7.11.2');
assert.equal(packageJson.devDependencies.sharp, '0.34.3');

for (const token of [
  "const DEFAULT_APP_URL = 'https://fortegym.vercel.app/'",
  'nodeIntegration: false','contextIsolation: true','sandbox: true','webviewTag: false','webSecurity: true','allowRunningInsecureContent: false','backgroundThrottling: false',
  'setWindowOpenHandler','setPermissionCheckHandler','setPermissionRequestHandler',"permission === 'media'",'requestSingleInstanceLock','isAllowedIpcSender(event)',
  'ipcMain.handle(MIDI_STAGE_CHANNEL','ipcMain.on(MIDI_DRAG_CHANNEL','installNativeToolkitBridge()','ipcMain.handle(MIDI_EXPORT_FOLDER_CHANNEL','ipcMain.handle(MIDI_EXPORT_SAVE_CHANNEL','ipcMain.handle(MIDI_EXPORT_OPEN_CHANNEL',
  "path.join(app.getPath('temp'), 'FORTISSIMO', 'midi-drag')",'event.sender.startDrag({ files, icon })','MAX_STAGE_AGE_MS','cleanupSenderMidi(senderId)',
  "const WINDOWS_APP_USER_MODEL_ID = 'com.squirrel.fortissimo_desktop.FORTISSIMO'",'updateElectronApp({','UpdateSourceType.ElectronPublicUpdateService','repo: UPDATE_REPOSITORY','updateInterval: UPDATE_INTERVAL','notifyUser: false',"autoUpdater.on('update-downloaded'",'autoUpdater.quitAndInstall()','ipcMain.handle(UPDATE_GET_STATE_CHANNEL','ipcMain.on(UPDATE_RESTART_CHANNEL',"process.argv.includes('--squirrel-firstrun') ? 12000 : 2500", "autoUpdater.on('before-quit-for-update'",
  "require('./splash-window.cjs')",'createDesktopSplash()','handoffSplashToMain(splash, win)',
  "require('./phase91-background-audio-contract.cjs')",'BACKGROUND_AUDIO_VERSION',
  'projectMidiDirectory(rootDirectory, request.projectName)',"path.resolve(root, projectName, 'FORTISSIMO MIDI')",'lastMidiProjectDirectory'
]) assert.ok(main.includes(token), `Desktop Phase 12 shell contract missing: ${token}`);

assert.ok(main.includes("require('node:fs')"));
assert.ok(main.includes("require('electron-squirrel-startup')"));
assert.ok(!main.includes("require('node:child_process')"));
assert.ok(!main.includes('shell.execute'));

for (const token of [
  "contextBridge.exposeInMainWorld('fortissimoDesktop'",'isDesktop: true',"platform: 'windows'", "const BRIDGE_VERSION = '12.0.0'",
  "'persistent-session'", "'midi-stage'", "'midi-drag'", "'midi-drag-selective'", "'midi-export-folder'", "'midi-export-native'", "'midi-project-workflow'", "'project-session-intelligence'", "'full-session-recall'", "'project-version-history'", "'background-audio'", "'auto-update'", "'stable-desktop-release'",
  'stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL', "startMidiDrag: (stageId, selection = 'pair') => ipcRenderer.send(MIDI_DRAG_CHANNEL",
  'chooseMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_FOLDER_CHANNEL)', "saveStagedMidi: (stageId, selection = 'pair', projectName = 'Untitled Direction')", 'openMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_OPEN_CHANNEL)',
  'ipcRenderer.on(UPDATE_STATE_CHANNEL','ipcRenderer.invoke(UPDATE_GET_STATE_CHANNEL)','ipcRenderer.send(UPDATE_RESTART_CHANNEL)','Restart FORTISSIMO',
  'desktop-workspace12','project-versions12'
]) assert.ok(preload.includes(token), `Desktop Phase 12 preload contract missing: ${token}`);

assert.equal((preload.match(/ipcRenderer\.on\(/g) || []).length, 1);
assert.ok(!preload.includes("require('node:fs')"));
assert.ok(!preload.includes("require('node:child_process')"));

for (const token of ["executableName: 'FORTISSIMO'","setupExe: 'FORTISSIMO-Setup.exe'",'asar: true','extraResource: [dragIcon, desktopIconPng, splashLogo, splashMark]','setupIcon: windowsIcon',"forte-flex-favicon.svg","fortissimo-desktop-icon.png"]) {
  assert.ok(forge.includes(token), `Forge packaging contract missing: ${token}`);
}
for (const token of ['forte-flex-favicon.svg','forte-favicon.ico','fortissimo-desktop-icon.png','buildIco(images)','sharp(sourceSvg']) assert.ok(nativeAssets.includes(token), `Native icon preparation missing: ${token}`);

console.log('PASS FORTISSIMO Desktop Phase 12 shell contract: secure stable live-web shell, original icon, project versions, exact recall, background audio, MIDI workflow, updater, adaptive workspace and native boot.');
