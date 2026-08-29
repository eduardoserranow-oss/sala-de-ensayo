const path = require('node:path');
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const {
  MIDI_STAGE_CHANNEL,
  MIDI_STAGE_VERSION,
  normalizeMidiStagePayload
} = require('./midi-stage-contract.cjs');

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

function installMidiStageBridge() {
  ipcMain.handle(MIDI_STAGE_CHANNEL, (event, payload) => {
    if (!isAllowedIpcSender(event)) throw new Error('Untrusted renderer cannot stage MIDI.');

    const normalized = normalizeMidiStagePayload(payload);
    const stageId = `${event.sender.id}:${Date.now()}:${++midiStageSerial}`;
    stagedMidiBySender.set(event.sender.id, {
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
  const senderId = win.webContents.id;
  win.webContents.once('destroyed', () => {
    stagedMidiBySender.delete(senderId);
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
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
