const { contextBridge } = require('electron');

const BRIDGE_VERSION = '2.0.0';
const CAPABILITIES = Object.freeze(['persistent-session']);

const desktopApi = Object.freeze({
  isDesktop: true,
  platform: 'windows',
  bridgeVersion: BRIDGE_VERSION,
  capabilities: CAPABILITIES,
  sessionPersistence: 'remember-login'
});

contextBridge.exposeInMainWorld('fortissimoDesktop', desktopApi);

window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new CustomEvent('fortissimo:desktop-ready', {
    detail: Object.freeze({
      bridgeVersion: BRIDGE_VERSION,
      capabilities: CAPABILITIES,
      sessionPersistence: 'remember-login'
    })
  }));
}, { once: true });
