module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'FORTISSIMO'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'fortissimo_desktop',
        setupExe: 'FORTISSIMO-Setup.exe',
        noMsi: true
      }
    }
  ]
};
