const { contextBridge, ipcRenderer } = require('electron');
const { MIDI_STAGE_CHANNEL, MAX_MIDI_FILES, MAX_MIDI_FILE_BYTES } = require('./midi-stage-contract.cjs');
const { MIDI_DRAG_CHANNEL, normalizeMidiDragRequest } = require('./midi-drag-contract.cjs');
const {
  MIDI_EXPORT_FOLDER_CHANNEL,
  MIDI_EXPORT_SAVE_CHANNEL,
  MIDI_EXPORT_OPEN_CHANNEL,
  normalizeMidiSelection,
  normalizeToolkitRequest
} = require('./native-toolkit-contract.cjs');
const {
  UPDATE_STATE_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  normalizeUpdateState
} = require('./update-contract.cjs');

const BRIDGE_VERSION = '13.0.0';
const CAPABILITIES = Object.freeze([
  'persistent-session',
  'midi-stage',
  'midi-drag',
  'midi-drag-selective',
  'midi-export-folder',
  'midi-export-native',
  'midi-project-workflow',
  'project-session-intelligence',
  'full-session-recall',
  'project-version-history',
  'background-audio',
  'auto-update',
  'stable-desktop-release'
]);
let latestUpdateState = normalizeUpdateState({ state: 'idle' });

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

function installUpdateReadyUi() {
  if (document.getElementById('fortissimoDesktopUpdateReady')) return;
  const style = document.createElement('style');
  style.id = 'fortissimoDesktopUpdateStyle';
  style.textContent = `
    #fortissimoDesktopUpdateReady{position:fixed;right:18px;bottom:18px;z-index:2147483600;display:none;align-items:center;gap:12px;max-width:min(470px,calc(100vw - 36px));padding:11px 12px 11px 15px;border:1px solid rgba(255,106,20,.52);border-radius:14px;background:rgba(16,16,16,.96);box-shadow:0 14px 42px rgba(0,0,0,.48);backdrop-filter:blur(18px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
    #fortissimoDesktopUpdateReady[data-open="true"]{display:flex}
    .fortissimo-desktop-update-copy{min-width:0;display:grid;gap:2px;flex:1}.fortissimo-desktop-update-copy strong{font-size:12px;line-height:1.2;font-weight:900;letter-spacing:.015em}.fortissimo-desktop-update-copy span{font-size:10px;line-height:1.25;color:rgba(255,255,255,.56);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #fortissimoDesktopUpdateRestart{border:1px solid rgba(255,106,20,.72);border-radius:10px;background:#ff6a14;color:#fff;padding:9px 12px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap}
    #fortissimoDesktopUpdateLater{border:0;background:transparent;color:rgba(255,255,255,.54);padding:8px 5px;font-size:11px;font-weight:800;cursor:pointer}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('aside');
  wrap.id = 'fortissimoDesktopUpdateReady';
  wrap.setAttribute('aria-live', 'polite');
  wrap.innerHTML = `
    <div class="fortissimo-desktop-update-copy">
      <strong>Update ready</strong>
      <span>Restart FORTISSIMO to apply the new Desktop version.</span>
    </div>
    <button type="button" id="fortissimoDesktopUpdateLater">Later</button>
    <button type="button" id="fortissimoDesktopUpdateRestart">Restart FORTISSIMO</button>
  `;
  document.body.appendChild(wrap);

  wrap.querySelector('#fortissimoDesktopUpdateRestart')?.addEventListener('click', event => {
    event.preventDefault();
    ipcRenderer.send(UPDATE_RESTART_CHANNEL);
  });
  wrap.querySelector('#fortissimoDesktopUpdateLater')?.addEventListener('click', event => {
    event.preventDefault();
    wrap.dataset.open = 'false';
  });
  renderUpdateState(latestUpdateState);
}

function renderUpdateState(state) {
  latestUpdateState = normalizeUpdateState(state);
  const wrap = document.getElementById('fortissimoDesktopUpdateReady');
  if (!wrap) return;
  const title = wrap.querySelector('.fortissimo-desktop-update-copy strong');
  const detail = wrap.querySelector('.fortissimo-desktop-update-copy span');
  const ready = latestUpdateState.state === 'downloaded' && latestUpdateState.canRestart;
  wrap.dataset.open = String(ready);
  if (!ready) return;
  if (title) title.textContent = latestUpdateState.releaseName ? `Update ${latestUpdateState.releaseName} ready` : 'Update ready';
  if (detail) detail.textContent = 'Restart FORTISSIMO to apply the new Desktop version.';
}

ipcRenderer.on(UPDATE_STATE_CHANNEL, (_event, state) => {
  renderUpdateState(state);
});

const desktopApi = Object.freeze({
  isDesktop: true,
  platform: 'windows',
  bridgeVersion: BRIDGE_VERSION,
  capabilities: CAPABILITIES,
  sessionPersistence: 'remember-login',
  stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL, normalizeRendererMidiPayload(payload)),
  startMidiDrag: (stageId, selection = 'pair') => ipcRenderer.send(MIDI_DRAG_CHANNEL, normalizeMidiDragRequest({ stageId, selection })),
  chooseMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_FOLDER_CHANNEL),
  saveStagedMidi: (stageId, selection = 'pair', projectName = 'Untitled Direction') => ipcRenderer.invoke(
    MIDI_EXPORT_SAVE_CHANNEL,
    normalizeToolkitRequest({ stageId, selection: normalizeMidiSelection(selection), projectName })
  ),
  openMidiExportFolder: () => ipcRenderer.invoke(MIDI_EXPORT_OPEN_CHANNEL)
});

contextBridge.exposeInMainWorld('fortissimoDesktop', desktopApi);

window.addEventListener('DOMContentLoaded', () => {
  installUpdateReadyUi();
  ipcRenderer.invoke(UPDATE_GET_STATE_CHANNEL).then(renderUpdateState).catch(() => {});

  window.dispatchEvent(new CustomEvent('fortissimo:desktop-ready', {
    detail: Object.freeze({
      bridgeVersion: BRIDGE_VERSION,
      capabilities: CAPABILITIES,
      sessionPersistence: 'remember-login'
    })
  }));

  if (location.pathname.endsWith('/vibe-roulette.html')) {
    // Native file drag is the primary reason the Windows shell exists. Load it
    // directly from the preload bridge instead of depending on an indirect web
    // module chain that an older cached renderer can skip.
    const nativeMidiDrag = document.createElement('script');
    nativeMidiDrag.type = 'module';
    nativeMidiDrag.src = new URL('/assets/vibe-roulette-desktop-midi-drag-v14-1b.js?v=desktop-native-drag13', location.origin).href;
    nativeMidiDrag.dataset.fortissimoNativeMidiDrag = 'true';
    document.head.appendChild(nativeMidiDrag);

    const workspace = document.createElement('script');
    workspace.type = 'module';
    workspace.src = new URL('/assets/vibe-roulette-desktop-workspace-v1.js?v=desktop-workspace13', location.origin).href;
    workspace.dataset.fortissimoDesktopWorkspace = 'true';
    document.head.appendChild(workspace);

    const recall = document.createElement('script');
    recall.type = 'module';
    recall.src = new URL('/assets/vibe-roulette-full-session-recall-v1.js?v=project-versions13', location.origin).href;
    recall.dataset.fortissimoFullSessionRecall = 'true';
    document.head.appendChild(recall);
  }
}, { once: true });
