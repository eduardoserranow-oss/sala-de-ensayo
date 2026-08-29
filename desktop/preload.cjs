const { contextBridge } = require('electron');

const BRIDGE_VERSION = '1.0.0';
const CAPABILITIES = Object.freeze([]);

const desktopApi = Object.freeze({
  isDesktop: true,
  platform: 'windows',
  bridgeVersion: BRIDGE_VERSION,
  capabilities: CAPABILITIES
});

contextBridge.exposeInMainWorld('fortissimoDesktop', desktopApi);

window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new CustomEvent('fortissimo:desktop-ready', {
    detail: Object.freeze({
      bridgeVersion: BRIDGE_VERSION,
      capabilities: CAPABILITIES
    })
  }));
}, { once: true });
