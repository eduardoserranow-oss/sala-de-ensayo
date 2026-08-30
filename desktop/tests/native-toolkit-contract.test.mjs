import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contract = require('../native-toolkit-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../../assets/vibe-roulette-desktop-midi-drag-v1.js', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../../assets/vibe-roulette-desktop-workspace-v1.js', import.meta.url), 'utf8');
const recall = fs.readFileSync(new URL('../../assets/vibe-roulette-full-session-recall-v1.js', import.meta.url), 'utf8');

assert.equal(contract.DESKTOP_TOOLKIT_VERSION, '2.0.0');
assert.equal(contract.MIDI_EXPORT_FOLDER_CHANNEL, 'fortissimo:midi:export-folder');
assert.equal(contract.MIDI_EXPORT_SAVE_CHANNEL, 'fortissimo:midi:save');
assert.equal(contract.MIDI_EXPORT_OPEN_CHANNEL, 'fortissimo:midi:open-folder');
assert.deepEqual(contract.MIDI_SELECTIONS, ['pair', 'foundation', 'texture']);
assert.equal(contract.normalizeMidiSelection('foundation'), 'foundation');
assert.throws(() => contract.normalizeMidiSelection('all-files'), /Invalid MIDI selection/);
assert.equal(contract.normalizeProjectName('  Mi Canción: Demo?  '), 'Mi Canción Demo');
assert.equal(contract.normalizeProjectName(''), 'Untitled Direction');
assert.equal(contract.normalizeProjectName('../evil\\name'), 'evil name');
assert.deepEqual(contract.normalizeToolkitRequest({ stageId:'12:1788033523000:7', selection:'texture', projectName:'Mi canción' }), { stageId:'12:1788033523000:7', selection:'texture', projectName:'Mi canción' });
assert.throws(() => contract.normalizeToolkitRequest({ stageId:'../../evil', selection:'pair', projectName:'x' }), /Malformed MIDI stage id/);

for (const token of [
  'dialog.showOpenDialog(mainWindow',"title: 'Choose FORTISSIMO project root folder'","properties: ['openDirectory', 'createDirectory']", "path.join(app.getPath('userData'), 'desktop-toolkit.json')",'lastMidiExportDirectory','lastMidiProjectDirectory',"path.resolve(root, projectName, 'FORTISSIMO MIDI')",'path.relative(root, projectDirectory)','projectMidiDirectory(rootDirectory, request.projectName)','uniqueExportPath(directory, file.filename)',"fs.writeFileSync(filePath, file.bytes, { flag: 'wx' })",'shell.openPath(directory)','ipcMain.handle(MIDI_EXPORT_FOLDER_CHANNEL','ipcMain.handle(MIDI_EXPORT_SAVE_CHANNEL','ipcMain.handle(MIDI_EXPORT_OPEN_CHANNEL','normalizeToolkitRequest(payload)','selectStagedFiles(staged, request.selection)',"projectMidiLabel: 'FORTISSIMO MIDI'"
]) assert.ok(main.includes(token), `Native toolkit main-process contract missing: ${token}`);

for (const token of [
  "const BRIDGE_VERSION = '11.0.0'","'midi-drag-selective'","'midi-export-folder'","'midi-export-native'","'midi-project-workflow'","'project-session-intelligence'","'full-session-recall'","'project-version-history'",'chooseMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_FOLDER_CHANNEL)',"saveStagedMidi: (stageId, selection = 'pair', projectName = 'Untitled Direction')",'normalizeToolkitRequest({ stageId, selection: normalizeMidiSelection(selection), projectName })','openMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_OPEN_CHANNEL)','desktop-workspace11','project-versions11'
]) assert.ok(preload.includes(token), `Phase 11 preload toolkit bridge missing: ${token}`);

for (const token of ['DAW EXPORT','DESKTOP NATIVE','↗ DRAG 2 MIDI → DAW','↗ Foundation','↗ Texture','Choose MIDI Folder','Save 2 MIDI','Open Folder',"api.startMidiDrag(stagedMidi.stageId, selection)","api.saveStagedMidi(stagedMidi.stageId, selection)",'api.chooseMidiExportFolder()','api.openMidiExportFolder()']) assert.ok(ui.includes(token), `Phase 6 fallback toolkit UX missing: ${token}`);

for (const token of [
  'DAW / PROJECT WORKFLOW','Current writing project',"document.getElementById('workingTitle')",'Choose Project Root','Open Current MIDI Folder','DRAG 2 MIDI TO ABLETON','DRAG FOUNDATION','DRAG TEXTURE',"bindDrag(dock.querySelector('#vrDawDrag'),'pair')", "bindDrag(dock.querySelector('#vrDawFoundation'),'foundation')", "bindDrag(dock.querySelector('#vrDawTexture'),'texture')", "saveSelection('pair')", "saveSelection('foundation')", "saveSelection('texture')", "api.saveStagedMidi(staged.stageId,selection,title)",'midi-project-workflow','Working title / FORTISSIMO MIDI',
  "const SESSION_STORAGE_KEY='fortissimo.desktop.projectSessions.v1'",'MAX_RECENT_SESSIONS=12','Recent project sessions','Remember current','rememberCurrentSession','currentSessionSnapshot','resumeSession(session)','applyPressedGroup',"document.getElementById('energySlider')",'#moodGrid [data-mood]','#serraFilterGrid [data-serra-filter]','resultKey','drumFilename','Foundation + Texture','localStorage.setItem(SESSION_STORAGE_KEY'
]) assert.ok(workspace.includes(token), `Phase 9 project session intelligence UX missing: ${token}`);

for(const token of ['Project Versions','Remember exact','Open','Duplicate','Rename',"const STORAGE_KEY='fortissimo.desktop.fullSessions.v1'",'captureFullSession','openFullSession','duplicateSession','renameVersion','project-version-history'])assert.ok(recall.includes(token),`Phase 11 project-version UX missing: ${token}`);

assert.ok(!preload.includes("require('node:fs')"), 'Preload must not expose filesystem primitives.');
assert.ok(!ui.includes('require('), 'Remote Vibe Roulette fallback module must not import Node.js primitives.');
assert.ok(!workspace.includes('require('), 'Workspace must not import Node.js primitives.');
assert.ok(!recall.includes('require('), 'Recall UI must not import Node.js primitives.');
assert.ok(!workspace.includes('writeFile'), 'Workspace must not write files itself.');
assert.ok(!main.includes('child_process'), 'Desktop toolkit must never spawn or control a DAW process.');
assert.ok(!main.includes('filePath:') && !main.includes('directoryPath:'), 'Raw filesystem paths must not be returned to the renderer.');

console.log('PASS FORTISSIMO Desktop Phase 11: project version history layers on exact-session recall without widening native filesystem boundaries.');
