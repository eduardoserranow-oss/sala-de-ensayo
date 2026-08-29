const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow } = require('electron');

const MIN_SPLASH_VISIBLE_MS = 1350;

function splashAssetPath(filename) {
  return app.isPackaged
    ? path.join(process.resourcesPath, filename)
    : path.join(__dirname, '..', 'assets', filename);
}

function splashAssetUrl(filename) {
  return pathToFileURL(splashAssetPath(filename)).href;
}

function createDesktopSplash() {
  const createdAt = Date.now();
  const win = new BrowserWindow({
    width: 760,
    height: 460,
    useContentSize: true,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#050505',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: false
    }
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
  });

  win.loadFile(path.join(__dirname, 'splash.html'), {
    query: {
      version: app.getVersion(),
      logo: splashAssetUrl('fortissimo-header-logo-v6.jpg'),
      mark: splashAssetUrl('fortissimo-icon-20260824.svg')
    }
  }).catch(error => {
    console.error('FORTISSIMO Desktop splash failed to load:', error);
  });

  return { win, createdAt };
}

function setSplashStatus(splash, status) {
  if (!splash?.win || splash.win.isDestroyed()) return;
  const value = JSON.stringify(String(status || 'Loading FORTISSIMO workspace…'));
  splash.win.webContents.executeJavaScript(`window.setFortissimoBootStatus?.(${value})`, true).catch(() => {});
}

function handoffSplashToMain(splash, mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.once('did-finish-load', () => {
    setSplashStatus(splash, 'Workspace ready · opening FORTISSIMO…');
    const elapsed = Date.now() - Number(splash?.createdAt || Date.now());
    const remaining = Math.max(220, MIN_SPLASH_VISIBLE_MS - elapsed);
    setTimeout(() => {
      if (splash?.win && !splash.win.isDestroyed()) splash.win.close();
      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, remaining);
  });
}

module.exports = Object.freeze({
  MIN_SPLASH_VISIBLE_MS,
  createDesktopSplash,
  handoffSplashToMain,
  setSplashStatus
});
