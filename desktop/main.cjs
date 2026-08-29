const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
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

const DEFAULT_APP_URL = 'https://fortegym.vercel.app/';
const APP_URL = normalizeAppUrl(process.env.FORTISSIMO_APP_URL || DEFAULT_APP_URL);
const DEVTOOLS_ENABLED = process.env.FORTISSIMO_DEVTOOLS === '1';
const PERSISTENT_PARTITION = 'persist:fortissimo-main';
const stagedMidiBySender = new Map();
let midiStageSerial = 0;

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

function materializeStagedMidi(senderId, staged) {
  const directory = senderMidiDragDirectory(senderId);
  removeDirectorySafely(directory);
  fs.mkdirSync(directory, { recursive: true });

  return staged.files.map(file => {
    const filePath = path.join(directory, file.filename);
    if (path.dirname(filePath) !== directory) throw new Error('Unsafe MIDI drag path rejected.');
    fs.writeFileSync(filePath, file.bytes, { flag: 'w' });
    return filePath;
  });
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
      const senderId = event.sender.id;
      const staged = stagedMidiBySender.get(senderId);
      if (!staged || staged.stageId !== request.stageId) throw new Error('MIDI stage is missing or no longer current.');
      if (Date.now() - staged.stagedAt > MAX_STAGE_AGE_MS) {
        cleanupSenderMidi(senderId);
        throw new Error('MIDI stage expired. Spin or edit the direction to prepare it again.');
      }

      const files = materializeStagedMidi(senderId, staged);
      if (files.length !== 2 || files.some(file => !fs.existsSync(file))) throw new Error('MIDI drag files were not created correctly.');
      const icon = dragIconPath();
      if (!fs.existsSync(icon)) throw new Error('FORTISSIMO drag icon is missing.');

      event.sender.startDrag({ files, icon });
    } catch (error) {
      console.error(`[FORTISSIMO Desktop ${MIDI_DRAG_VERSION}] MIDI drag failed:`, error);
    }
  });
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

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  let mainWindow = null;

  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.fortissimo.desktop');
    const desktopSession = session.fromPartition(PERSISTENT_PARTITION, { cache: true });
    installPermissionGuard(desktopSession);
    installMidiStageBridge();
    installMidiDragBridge();
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
    });
  });

  app.on('before-quit', () => {
    try { removeDirectorySafely(midiDragRoot()); } catch (_) {}
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}