const fs = require('node:fs');
const path = require('node:path');
const { app, autoUpdater, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const squirrelStartup = require('electron-squirrel-startup');
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');
const {
  MIDI_STAGE_CHANNEL,
  MIDI_STAGE_VERSION,
  normalizeMidiStagePayload
} = require('./midi-stage-contract.cjs');
const {
  MIDI_DRAG_CHANNEL,
  MIDI_DRAG_VERSION,
  MAX_STAGE_AGE_MS,
  normalizeMidiDragRequest
} = require('./midi-drag-contract.cjs');
const {
  MIDI_EXPORT_FOLDER_CHANNEL,
  MIDI_EXPORT_SAVE_CHANNEL,
  MIDI_EXPORT_OPEN_CHANNEL,
  DESKTOP_TOOLKIT_VERSION,
  normalizeToolkitRequest
} = require('./native-toolkit-contract.cjs');
const {
  UPDATE_STATE_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_CONTRACT_VERSION,
  UPDATE_REPOSITORY,
  UPDATE_INTERVAL,
  normalizeUpdateState
} = require('./update-contract.cjs');

const DEFAULT_APP_URL = 'https://fortegym.vercel.app/';
const APP_URL = normalizeAppUrl(process.env.FORTISSIMO_APP_URL || DEFAULT_APP_URL);
const DEVTOOLS_ENABLED = process.env.FORTISSIMO_DEVTOOLS === '1';
const PERSISTENT_PARTITION = 'persist:fortissimo-main';
const WINDOWS_APP_USER_MODEL_ID = 'com.squirrel.fortissimo_desktop.FORTISSIMO';
const stagedMidiBySender = new Map();
let midiStageSerial = 0;
let mainWindow = null;
let updaterControl = null;
let updateState = normalizeUpdateState({ state: 'idle', currentVersion: app.getVersion() });
let lastMidiExportDirectory = '';

const allowedOrigins = new Set([
  new URL(APP_URL).origin,
  'https://fortegym.vercel.app',
  'https://fortissimoapp-serranowmusic-7198s-projects.vercel.app',
  'https://fortissimoapp-git-main-serranowmusic-7198s-projects.vercel.app'
]);

function normalizeAppUrl(value) {
  const url = new URL(String(value || DEFAULT_APP_URL));
  if (url.protocol !== 'https:') throw new Error('FORTISSIMO Desktop requires an HTTPS app URL.');
  return url.href;
}

function isAllowedAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedOrigins.has(url.origin);
  } catch (_) {
    return false;
  }
}

function isAllowedIpcSender(event) {
  const senderUrl = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
  return isAllowedAppUrl(senderUrl);
}

function openExternalSafely(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) return;
    shell.openExternal(url.href).catch(() => {});
  } catch (_) {}
}

function installNavigationGuard(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAppUrl(url)) {
      win.loadURL(url).catch(() => {});
      return { action: 'deny' };
    }
    openExternalSafely(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedAppUrl(url)) return;
    event.preventDefault();
    openExternalSafely(url);
  });

  win.webContents.on('will-attach-webview', event => {
    event.preventDefault();
  });
}

function isAllowedPermission(permission) {
  return permission === 'media' || permission === 'notifications';
}

function installPermissionGuard(ses) {
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const requestingUrl = details?.requestingUrl || requestingOrigin || webContents?.getURL?.() || '';
    return Boolean(isAllowedAppUrl(requestingUrl) && isAllowedPermission(permission));
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || webContents?.getURL?.() || '';
    callback(Boolean(isAllowedAppUrl(requestingUrl) && isAllowedPermission(permission)));
  });
}

function midiDragRoot() {
  return path.join(app.getPath('temp'), 'FORTISSIMO', 'midi-drag');
}

function senderMidiDragDirectory(senderId) {
  return path.join(midiDragRoot(), String(senderId));
}

function removeDirectorySafely(directory) {
  if (!directory) return;
  try { fs.rmSync(directory, { recursive: true, force: true }); } catch (_) {}
}

function cleanupSenderMidi(senderId) {
  stagedMidiBySender.delete(senderId);
  removeDirectorySafely(senderMidiDragDirectory(senderId));
}

function dragIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'favicon.png')
    : path.join(__dirname, '..', 'assets', 'favicon.png');
}

function desktopIconPath() {
  return path.join(__dirname, '..', 'assets', 'forte-favicon.ico');
}

function installDesktopSurface(win) {
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      (() => {
        document.documentElement.classList.add('fortissimo-desktop');
        document.body?.classList.add('fortissimo-desktop');
        const splash = document.querySelector('.app-splash');
        if (splash) splash.remove();
      })();
    `, true).catch(() => {});
  });
}

function selectStagedFiles(staged, selection = 'pair') {
  if (selection === 'pair') return staged.files.slice();
  return staged.files.filter(file => file.role === selection);
}

function materializeStagedMidi(senderId, staged, selection = 'pair') {
  const directory = senderMidiDragDirectory(senderId);
  removeDirectorySafely(directory);
  fs.mkdirSync(directory, { recursive: true });

  return selectStagedFiles(staged, selection).map(file => {
    const filePath = path.join(directory, file.filename);
    if (path.dirname(filePath) !== directory) throw new Error('Unsafe MIDI drag path rejected.');
    fs.writeFileSync(filePath, file.bytes, { flag: 'w' });
    return filePath;
  });
}

function requireCurrentStage(event, stageId) {
  const senderId = event.sender.id;
  const staged = stagedMidiBySender.get(senderId);
  if (!staged || staged.stageId !== stageId) throw new Error('MIDI stage is missing or no longer current.');
  if (Date.now() - staged.stagedAt > MAX_STAGE_AGE_MS) {
    cleanupSenderMidi(senderId);
    throw new Error('MIDI stage expired. Spin or edit the direction to prepare it again.');
  }
  return { senderId, staged };
}

function toolkitSettingsPath() {
  return path.join(app.getPath('userData'), 'desktop-toolkit.json');
}

function loadToolkitSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(toolkitSettingsPath(), 'utf8'));
    const candidate = typeof parsed?.midiExportDirectory === 'string' ? parsed.midiExportDirectory : '';
    lastMidiExportDirectory = candidate && path.isAbsolute(candidate) ? path.resolve(candidate) : '';
  } catch (_) {
    lastMidiExportDirectory = '';
  }
}

function saveToolkitSettings() {
  try {
    fs.mkdirSync(path.dirname(toolkitSettingsPath()), { recursive: true });
    fs.writeFileSync(toolkitSettingsPath(), JSON.stringify({ midiExportDirectory: lastMidiExportDirectory }, null, 2), { flag: 'w' });
  } catch (_) {}
}

function exportFolderLabel(directory = lastMidiExportDirectory) {
  return directory ? (path.basename(directory) || directory) : '';
}

async function chooseMidiExportDirectory() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose FORTISSIMO MIDI export folder',
    buttonLabel: 'Use this folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  const selected = path.resolve(result.filePaths[0]);
  if (!path.isAbsolute(selected)) throw new Error('Invalid MIDI export folder.');
  lastMidiExportDirectory = selected;
  saveToolkitSettings();
  return selected;
}

function uniqueExportPath(directory, filename) {
  const safeName = path.basename(filename);
  const parsed = path.parse(safeName);
  let candidate = path.join(directory, safeName);
  let serial = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name}_${serial}${parsed.ext}`);
    serial += 1;
  }
  if (path.dirname(candidate) !== directory) throw new Error('Unsafe MIDI export path rejected.');
  return candidate;
}

function installMidiStageBridge() {
  ipcMain.handle(MIDI_STAGE_CHANNEL, (event, payload) => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot stage MIDI.');

    const normalized = normalizeMidiStagePayload(payload);
    const senderId = event.sender.id;
    const stageId = `${senderId}:${Date.now()}:${++midiStageSerial}`;
    removeDirectorySafely(senderMidiDragDirectory(senderId));
    stagedMidiBySender.set(senderId, {
      ...normalized,
      stageId,
      stagedAt: Date.now()
    });

    return Object.freeze({
      ok: true,
      stageId,
      stageVersion: MIDI_STAGE_VERSION,
      bpm: normalized.bpm,
      fileCount: normalized.files.length,
      totalBytes: normalized.totalBytes,
      files: normalized.files.map(file => Object.freeze({
        role: file.role,
        preset: file.preset,
        filename: file.filename,
        byteLength: file.bytes.length
      }))
    });
  });
}

function installMidiDragBridge() {
  ipcMain.on(MIDI_DRAG_CHANNEL, (event, payload) => {
    try {
      if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot start MIDI drag.');
      const request = normalizeMidiDragRequest(payload);
      const { senderId, staged } = requireCurrentStage(event, request.stageId);
      const files = materializeStagedMidi(senderId, staged, request.selection);
      const expectedCount = request.selection === 'pair' ? 2 : 1;
      if (files.length !== expectedCount || files.some(file => !fs.existsSync(file))) throw new Error('MIDI drag files were not created correctly.');
      const icon = dragIconPath();
      if (!fs.existsSync(icon)) throw new Error('FORTISSIMO drag icon is missing.');

      event.sender.startDrag({ files, icon });
    } catch (error) {
      console.error(`[FORTISSIMO Desktop ${MIDI_DRAG_VERSION}] MIDI drag failed:`, error);
    }
  });
}

function installNativeToolkitBridge() {
  ipcMain.handle(MIDI_EXPORT_FOLDER_CHANNEL, async event => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot choose an export folder.');
    const directory = await chooseMidiExportDirectory();
    return Object.freeze({ ok: Boolean(directory), canceled: !directory, folderLabel: exportFolderLabel(directory || '') });
  });

  ipcMain.handle(MIDI_EXPORT_SAVE_CHANNEL, async (event, payload) => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot export MIDI.');
    const request = normalizeToolkitRequest(payload);
    const { staged } = requireCurrentStage(event, request.stageId);
    const directory = lastMidiExportDirectory || await chooseMidiExportDirectory();
    if (!directory) return Object.freeze({ ok: false, canceled: true, files: [] });
    fs.mkdirSync(directory, { recursive: true });

    const selected = selectStagedFiles(staged, request.selection);
    const saved = selected.map(file => {
      const filePath = uniqueExportPath(directory, file.filename);
      fs.writeFileSync(filePath, file.bytes, { flag: 'wx' });
      return path.basename(filePath);
    });

    return Object.freeze({
      ok: true,
      canceled: false,
      folderLabel: exportFolderLabel(directory),
      fileCount: saved.length,
      files: Object.freeze(saved)
    });
  });

  ipcMain.handle(MIDI_EXPORT_OPEN_CHANNEL, async event => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot open the MIDI export folder.');
    if (!lastMidiExportDirectory) return Object.freeze({ ok: false, reason: 'no-folder' });
    const errorMessage = await shell.openPath(lastMidiExportDirectory);
    return Object.freeze({ ok: !errorMessage, folderLabel: exportFolderLabel(), error: String(errorMessage || '') });
  });
}

function publishUpdateState(next) {
  updateState = normalizeUpdateState({ currentVersion: app.getVersion(), ...next });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(UPDATE_STATE_CHANNEL, updateState);
  }
}

function installUpdateBridge() {
  ipcMain.handle(UPDATE_GET_STATE_CHANNEL, event => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot read update state.');
    return updateState;
  });

  ipcMain.on(UPDATE_RESTART_CHANNEL, event => {
    if (!isAllowedIpcSender(event)) return;
    if (!updateState.canRestart || updateState.state !== 'downloaded') return;
    autoUpdater.quitAndInstall();
  });
}

function initializeAutoUpdater() {
  if (!app.isPackaged || process.platform !== 'win32') {
    publishUpdateState({ state: 'disabled', message: 'Automatic updates are enabled in packaged Windows builds only.' });
    return;
  }

  autoUpdater.on('checking-for-update', () => publishUpdateState({ state: 'checking' }));
  autoUpdater.on('update-available', () => publishUpdateState({ state: 'available' }));
  autoUpdater.on('update-not-available', () => publishUpdateState({ state: 'current' }));
  autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName) => {
    publishUpdateState({
      state: 'downloaded',
      releaseName: String(releaseName || ''),
      message: 'Update ready — Restart FORTISSIMO',
      canRestart: true
    });
  });
  autoUpdater.on('error', error => {
    publishUpdateState({ state: 'error', message: error?.message || String(error) });
  });

  const startUpdater = () => {
    try {
      updaterControl = updateElectronApp({
        updateSource: {
          type: UpdateSourceType.ElectronPublicUpdateService,
          repo: UPDATE_REPOSITORY
        },
        updateInterval: UPDATE_INTERVAL,
        notifyUser: false,
        logger: console
      });
    } catch (error) {
      publishUpdateState({ state: 'error', message: error?.message || String(error) });
    }
  };

  const firstRunDelay = process.argv.includes('--squirrel-firstrun') ? 12000 : 2500;
  setTimeout(startUpdater, firstRunDelay);
}

function createMainWindow() {
  const win = new BrowserWindow({
    title: 'FORTISSIMO',
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    show: false,
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    icon: desktopIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      partition: PERSISTENT_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: DEVTOOLS_ENABLED
    }
  });

  installNavigationGuard(win);
  installDesktopSurface(win);
  const senderId = win.webContents.id;
  win.webContents.once('destroyed', () => {
    cleanupSenderMidi(senderId);
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadURL(APP_URL).catch(error => {
    console.error('FORTISSIMO Desktop failed to load the web app:', error);
  });

  return win;
}

if (squirrelStartup) {
  app.quit();
} else {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });

    app.whenReady().then(() => {
      if (process.platform === 'win32') app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
      loadToolkitSettings();
      const desktopSession = session.fromPartition(PERSISTENT_PARTITION, { cache: true });
      installPermissionGuard(desktopSession);
      installMidiStageBridge();
      installMidiDragBridge();
      installNativeToolkitBridge();
      installUpdateBridge();
      mainWindow = createMainWindow();
      initializeAutoUpdater();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
      });
    });

    const cleanupBeforeExit = () => {
      try { updaterControl?.stopUpdates?.(); } catch (_) {}
      try { removeDirectorySafely(midiDragRoot()); } catch (_) {}
    };

    app.on('before-quit', cleanupBeforeExit);
    autoUpdater.on('before-quit-for-update', cleanupBeforeExit);

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }
}

console.log(`[FORTISSIMO Desktop toolkit ${DESKTOP_TOOLKIT_VERSION}] native MIDI workflow ready`);
console.log(`[FORTISSIMO Desktop updater ${UPDATE_CONTRACT_VERSION}] ${UPDATE_REPOSITORY}`);
