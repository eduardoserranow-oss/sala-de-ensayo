const path = require('node:path');

const windowsIcon = path.resolve(__dirname, '..', 'assets', 'forte-favicon.ico');
const dragIcon = path.resolve(__dirname, '..', 'assets', 'favicon.png');
const desktopIconPng = path.resolve(__dirname, '..', 'assets', 'fortissimo-desktop-icon.png');
const splashLogo = path.resolve(__dirname, '..', 'assets', 'fortissimo-header-logo-v6.jpg');
const splashMark = path.resolve(__dirname, '..', 'assets', 'forte-flex-favicon.svg');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'FORTISSIMO',
    icon: windowsIcon,
    extraResource: [dragIcon, desktopIconPng, splashLogo, splashMark]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'fortissimo_desktop',
        setupExe: 'FORTISSIMO-Setup.exe',
        setupIcon: windowsIcon,
        noMsi: true
      }
    }
  ]
};
