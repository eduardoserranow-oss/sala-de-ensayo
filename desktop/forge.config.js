const path = require('node:path');

const windowsIcon = path.resolve(__dirname, '..', 'assets', 'forte-favicon.ico');
const dragIcon = path.resolve(__dirname, '..', 'assets', 'favicon.png');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'FORTISSIMO',
    icon: windowsIcon,
    extraResource: [dragIcon]
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
