const path = require('node:path');
const { app, BrowserWindow, session, shell } = require('electron');

const DEFAULT_APP_URL = 'https://fortegym.vercel.app/';
const APP_URL = normalizeAppUrl(process.env.FORTISSIMO_APP_URL || DEFAULT_APP_URL);
const DEVTOOLS_ENABLED = process.env.FORTISSIMO_DEVTOOLS === '1';

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

function installPermissionGuard() {
  const ses = session.defaultSession;

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const requestingUrl = details?.requestingUrl || requestingOrigin || webContents?.getURL?.() || '';
    return Boolean(isAllowedAppUrl(requestingUrl) && isAllowedPermission(permission));
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || webContents?.getURL?.() || '';
    callback(Boolean(isAllowedAppUrl(requestingUrl) && isAllowedPermission(permission)));
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
    installPermissionGuard();
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
