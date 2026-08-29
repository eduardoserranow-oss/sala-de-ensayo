const { contextBridge, ipcRenderer } = require('electron');
const { MIDI_STAGE_CHANNEL, MAX_MIDI_FILES, MAX_MIDI_FILE_BYTES } = require('./midi-stage-contract.cjs');
const { MIDI_DRAG_CHANNEL, normalizeMidiDragRequest } = require('./midi-drag-contract.cjs');

const BRIDGE_VERSION = '4.1.0';
const CAPABILITIES = Object.freeze(['persistent-session', 'midi-stage', 'midi-drag', 'desktop-workspace']);

function normalizeRendererMidiPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid MIDI stage payload.');
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (files.length !== MAX_MIDI_FILES) throw new Error('FORTISSIMO Desktop requires Foundation + Texture MIDI.');

  return {
    bpm: Number(payload.bpm),
    files: files.map(file => {
      const sourceBytes = file?.bytes;
      const bytes = Array.isArray(sourceBytes)
        ? sourceBytes.slice()
        : ArrayBuffer.isView(sourceBytes)
          ? Array.from(sourceBytes)
          : [];
      if (bytes.length > MAX_MIDI_FILE_BYTES) throw new Error('MIDI file exceeds the Desktop stage limit.');
      return {
        role: String(file?.role || ''),
        preset: String(file?.preset || ''),
        filename: String(file?.filename || ''),
        bytes
      };
    })
  };
}

const desktopApi = Object.freeze({
  isDesktop: true,
  platform: 'windows',
  bridgeVersion: BRIDGE_VERSION,
  capabilities: CAPABILITIES,
  sessionPersistence: 'remember-login',
  stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL, normalizeRendererMidiPayload(payload)),
  startMidiDrag: stageId => ipcRenderer.send(MIDI_DRAG_CHANNEL, normalizeMidiDragRequest({ stageId }))
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

  if (location.pathname.endsWith('/vibe-roulette.html')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = new URL('/assets/vibe-roulette-desktop-workspace-v1.js?v=desktop-workspace1', location.origin).href;
    script.dataset.fortissimoDesktopWorkspace = 'true';
    document.head.appendChild(script);
  }
}, { once: true });