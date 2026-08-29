import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js';

export const VIBE_ROULETTE_DESKTOP_MIDI_DRAG_V1_INFO = Object.freeze({
  version: '2.0.0',
  desktopBridge: '6.0.0',
  capability: 'desktop-native-toolkit',
  files: Object.freeze(['foundation', 'texture']),
  delivery: 'native-windows-drag-and-project-folder',
  principle: 'Drag exactly what you need, or save directly into the project folder.'
});

let stagedMidi = null;
let prepareSerial = 0;
let prepareTimer = null;
let ui = null;
let folderLabel = '';

function desktopBridge() {
  if (typeof window === 'undefined') return null;
  const api = window.fortissimoDesktop;
  const capabilities = Array.isArray(api?.capabilities) ? api.capabilities : [];
  if (!api?.isDesktop || typeof api.stageMidiPair !== 'function' || typeof api.startMidiDrag !== 'function') return null;
  if (!capabilities.includes('midi-stage') || !capabilities.includes('midi-drag')) return null;
  return api;
}

function currentDirectionReady() {
  return Boolean(window.__FORTISSIMO_VIBE_LAST_RESULT__ && window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__);
}

function installStyles() {
  if (document.getElementById('vr-native-midi-drag-style')) return;
  const style = document.createElement('style');
  style.id = 'vr-native-midi-drag-style';
  style.textContent = `
    .vr-native-midi-drag{margin-top:12px;display:grid;gap:9px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(12,12,12,.76)}
    .vr-native-midi-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vr-native-midi-title{font:900 10px/1 system-ui,-apple-system,sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.48)}.vr-native-midi-badge{font:800 9px/1 system-ui,-apple-system,sans-serif;color:#ff9b61;padding:5px 7px;border:1px solid rgba(255,107,20,.28);border-radius:999px;background:rgba(255,107,20,.06)}
    .vr-native-midi-drag-btn{width:100%;min-height:52px;border:1px solid rgba(255,107,20,.72);border-radius:13px;background:linear-gradient(180deg,rgba(255,107,20,.17),rgba(255,107,20,.08));color:#ff9b61;font:900 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.04em;cursor:grab;user-select:none;-webkit-user-select:none}.vr-native-midi-drag-btn:active{cursor:grabbing}.vr-native-midi-drag-btn:disabled{opacity:.4;cursor:default}
    .vr-native-midi-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vr-native-midi-file{min-height:42px;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.82);font:850 10px/1.1 system-ui,-apple-system,sans-serif;cursor:grab}.vr-native-midi-file:disabled{opacity:.38;cursor:default}.vr-native-midi-file span{display:block;margin-top:3px;font-size:8px;font-weight:700;color:rgba(255,255,255,.38)}
    .vr-native-midi-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.vr-native-midi-action{min-height:35px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.72);font:800 9px/1 system-ui,-apple-system,sans-serif;cursor:pointer}.vr-native-midi-action.primary{border-color:rgba(255,107,20,.38);color:#ff9b61}.vr-native-midi-action:disabled{opacity:.4;cursor:default}
    .vr-native-midi-drag-note{color:rgba(255,255,255,.45);font-size:9px;line-height:1.35;text-align:center;min-height:12px}.vr-native-midi-drag.is-ready .vr-native-midi-drag-note{color:rgba(255,255,255,.6)}
  `;
  document.head.appendChild(style);
}

function suppressLegacyDownloadUi() {
  document.getElementById('vrPhase6Export')?.remove();
}

function renderUi(state = 'waiting', message = '') {
  if (!ui) return;
  const ready = state === 'ready' && Boolean(stagedMidi?.stageId);
  ui.wrap.classList.toggle('is-ready', ready);
  for (const button of ui.dragButtons) {
    button.disabled = !ready;
    button.draggable = ready;
  }
  ui.save.disabled = !ready;

  if (state === 'preparing') ui.pair.textContent = 'Preparing MIDI…';
  else if (state === 'dragging') ui.pair.textContent = '↗ Drop in your DAW';
  else ui.pair.textContent = '↗ DRAG 2 MIDI → DAW';

  ui.folder.textContent = folderLabel ? `Folder: ${folderLabel}` : 'Choose MIDI Folder';
  ui.note.textContent = message || (
    state === 'ready'
      ? 'Drag both, drag one layer, or save the current performance directly into your project folder.'
      : state === 'preparing'
        ? 'Building the exact current pianist performance in the background.'
        : state === 'error'
          ? 'Spin or edit the direction to prepare the MIDI again.'
          : 'Spin a direction to prepare Foundation + Texture MIDI.'
  );
}

async function prepareCurrentMidi() {
  const api = desktopBridge();
  if (!api) return null;
  const serial = ++prepareSerial;
  stagedMidi = null;

  if (!currentDirectionReady()) {
    renderUi('waiting');
    return null;
  }

  renderUi('preparing');
  try {
    const pair = await buildCurrentSongStarterMidiPair();
    if (serial !== prepareSerial) return null;
    const stage = await api.stageMidiPair(pair);
    if (serial !== prepareSerial) return null;
    if (!stage?.ok || !stage.stageId || stage.fileCount !== 2) throw new Error('Desktop did not accept Foundation + Texture MIDI.');
    stagedMidi = Object.freeze({ ...stage });
    renderUi('ready');
    return stagedMidi;
  } catch (error) {
    if (serial !== prepareSerial) return null;
    stagedMidi = null;
    renderUi('error', error?.message || String(error));
    return null;
  }
}

function schedulePrepare(delay = 120) {
  if (prepareTimer) clearTimeout(prepareTimer);
  const serialAtSchedule = ++prepareSerial;
  stagedMidi = null;
  renderUi(currentDirectionReady() ? 'preparing' : 'waiting');
  prepareTimer = setTimeout(() => {
    if (serialAtSchedule !== prepareSerial) return;
    prepareTimer = null;
    prepareCurrentMidi().catch(() => {});
  }, delay);
}

function bindNativeDrag(button, selection) {
  button.addEventListener('dragstart', event => {
    const api = desktopBridge();
    if (!api || !stagedMidi?.stageId) {
      event.preventDefault();
      schedulePrepare(0);
      return;
    }
    event.preventDefault();
    api.startMidiDrag(stagedMidi.stageId, selection);
    renderUi('dragging', selection === 'pair' ? 'Drop Foundation + Texture in your DAW.' : `Drop ${selection} in your DAW.`);
  });
  button.addEventListener('dragend', () => setTimeout(() => renderUi(stagedMidi?.stageId ? 'ready' : 'waiting'), 160));
}

async function chooseFolder() {
  const api = desktopBridge();
  if (!api || typeof api.chooseMidiExportFolder !== 'function') return;
  try {
    const result = await api.chooseMidiExportFolder();
    if (result?.ok) folderLabel = result.folderLabel || '';
    renderUi(stagedMidi?.stageId ? 'ready' : 'waiting', result?.canceled ? 'Folder selection canceled.' : 'Project MIDI folder saved for future exports.');
  } catch (error) {
    renderUi('error', error?.message || String(error));
  }
}

async function saveMidi(selection = 'pair') {
  const api = desktopBridge();
  if (!api || typeof api.saveStagedMidi !== 'function' || !stagedMidi?.stageId) return;
  try {
    ui.save.disabled = true;
    const result = await api.saveStagedMidi(stagedMidi.stageId, selection);
    if (result?.ok) {
      folderLabel = result.folderLabel || folderLabel;
      renderUi('ready', `${result.fileCount} MIDI file${result.fileCount === 1 ? '' : 's'} saved to ${folderLabel || 'your project folder'}.`);
    } else if (result?.canceled) {
      renderUi('ready', 'Export canceled.');
    }
  } catch (error) {
    renderUi('error', error?.message || String(error));
  } finally {
    if (ui) ui.save.disabled = !stagedMidi?.stageId;
  }
}

async function openFolder() {
  const api = desktopBridge();
  if (!api || typeof api.openMidiExportFolder !== 'function') return;
  try {
    const result = await api.openMidiExportFolder();
    if (!result?.ok) renderUi(stagedMidi?.stageId ? 'ready' : 'waiting', 'Choose a MIDI project folder first.');
    else {
      folderLabel = result.folderLabel || folderLabel;
      renderUi(stagedMidi?.stageId ? 'ready' : 'waiting', `Opened ${folderLabel}.`);
    }
  } catch (error) {
    renderUi('error', error?.message || String(error));
  }
}

function installUi() {
  if (ui || !desktopBridge()) return Boolean(ui);
  const utility = document.querySelector('.utility-row');
  if (!utility) return false;
  installStyles();
  suppressLegacyDownloadUi();

  const wrap = document.createElement('div');
  wrap.id = 'vrNativeMidiDrag';
  wrap.className = 'vr-native-midi-drag';
  wrap.innerHTML = `
    <div class="vr-native-midi-head"><span class="vr-native-midi-title">DAW EXPORT</span><span class="vr-native-midi-badge">DESKTOP NATIVE</span></div>
    <button type="button" class="vr-native-midi-drag-btn" id="vrNativeMidiDragBtn" disabled>↗ DRAG 2 MIDI → DAW</button>
    <div class="vr-native-midi-split">
      <button type="button" class="vr-native-midi-file" id="vrNativeFoundation" disabled>↗ Foundation<span>drag only this layer</span></button>
      <button type="button" class="vr-native-midi-file" id="vrNativeTexture" disabled>↗ Texture<span>drag only this layer</span></button>
    </div>
    <div class="vr-native-midi-actions">
      <button type="button" class="vr-native-midi-action" id="vrNativeFolder">Choose MIDI Folder</button>
      <button type="button" class="vr-native-midi-action primary" id="vrNativeSave" disabled>Save 2 MIDI</button>
      <button type="button" class="vr-native-midi-action" id="vrNativeOpen">Open Folder</button>
    </div>
    <div class="vr-native-midi-drag-note" id="vrNativeMidiDragNote"></div>
  `;
  utility.insertAdjacentElement('afterend', wrap);

  const pair = wrap.querySelector('#vrNativeMidiDragBtn');
  const foundation = wrap.querySelector('#vrNativeFoundation');
  const texture = wrap.querySelector('#vrNativeTexture');
  const folder = wrap.querySelector('#vrNativeFolder');
  const save = wrap.querySelector('#vrNativeSave');
  const open = wrap.querySelector('#vrNativeOpen');
  const note = wrap.querySelector('#vrNativeMidiDragNote');
  ui = { wrap, pair, foundation, texture, folder, save, open, note, dragButtons: [pair, foundation, texture] };

  bindNativeDrag(pair, 'pair');
  bindNativeDrag(foundation, 'foundation');
  bindNativeDrag(texture, 'texture');
  folder.addEventListener('click', event => { event.preventDefault(); chooseFolder(); });
  save.addEventListener('click', event => { event.preventDefault(); saveMidi('pair'); });
  open.addEventListener('click', event => { event.preventDefault(); openFolder(); });
  pair.addEventListener('click', event => {
    event.preventDefault();
    if (!stagedMidi?.stageId) schedulePrepare(0);
    else renderUi('ready', 'Grab this orange control and drag it into Ableton.');
  });

  renderUi(currentDirectionReady() ? 'preparing' : 'waiting');
  return true;
}

function installWhenReady() {
  if (!desktopBridge()) return;
  suppressLegacyDownloadUi();
  if (!installUi()) {
    setTimeout(installWhenReady, 120);
    return;
  }

  window.addEventListener('fortissimo:vibe-arrangement-updated', () => schedulePrepare(90));
  const energySlider = document.getElementById('energySlider');
  energySlider?.addEventListener('input', () => schedulePrepare(280), { passive: true });
  window.addEventListener('resize', () => setTimeout(suppressLegacyDownloadUi, 0), { passive: true });

  if (currentDirectionReady()) schedulePrepare(0);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installWhenReady, { once: true });
  else installWhenReady();
}

if (typeof window !== 'undefined') {
  window.__FORTISSIMO_DESKTOP_MIDI_DRAG_V1__ = Object.freeze({
    info: VIBE_ROULETTE_DESKTOP_MIDI_DRAG_V1_INFO,
    prepareCurrent: prepareCurrentMidi,
    getStage: () => stagedMidi
  });
}
