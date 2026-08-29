import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js';

export const VIBE_ROULETTE_DESKTOP_MIDI_DRAG_V1_INFO = Object.freeze({
  version: '1.0.1',
  desktopBridge: '4.0.0',
  capability: 'midi-drag',
  files: Object.freeze(['foundation', 'texture']),
  delivery: 'native-windows-drag',
  principle: 'Prepare silently, drag instantly. No Downloads-folder step.'
});

let stagedMidi = null;
let prepareSerial = 0;
let prepareTimer = null;
let ui = null;

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
    .vr-native-midi-drag{margin-top:10px;display:grid;gap:6px}
    .vr-native-midi-drag-btn{width:100%;min-height:50px;border:1px solid rgba(255,107,20,.68);border-radius:14px;background:linear-gradient(180deg,rgba(255,107,20,.14),rgba(255,107,20,.07));color:#ff9b61;font:900 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.045em;cursor:grab;user-select:none;-webkit-user-select:none}
    .vr-native-midi-drag-btn:active{cursor:grabbing}
    .vr-native-midi-drag-btn:disabled{opacity:.42;cursor:default}
    .vr-native-midi-drag-note{color:rgba(255,255,255,.46);font-size:10px;line-height:1.35;text-align:center}
    .vr-native-midi-drag.is-ready .vr-native-midi-drag-note{color:rgba(255,255,255,.62)}
  `;
  document.head.appendChild(style);
}

function suppressLegacyDownloadUi() {
  document.getElementById('vrPhase6Export')?.remove();
}

function renderUi(state = 'waiting', message = '') {
  if (!ui) return;
  const { wrap, button, note } = ui;
  const ready = state === 'ready' && Boolean(stagedMidi?.stageId);
  wrap.classList.toggle('is-ready', ready);
  button.disabled = !ready;
  button.draggable = ready;

  if (state === 'preparing') button.textContent = 'Preparing MIDI…';
  else if (state === 'ready') button.textContent = '↗ Drag 2 MIDI → DAW';
  else if (state === 'dragging') button.textContent = '↗ Drop in your DAW';
  else if (state === 'error') button.textContent = 'MIDI needs refresh';
  else button.textContent = '↗ Drag 2 MIDI → DAW';

  note.textContent = message || (
    state === 'ready'
      ? 'FORTISSIMO Desktop · Foundation + Texture · drag directly into Ableton or another DAW'
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
    if (!stage?.ok || !stage.stageId || stage.fileCount !== 2) throw new Error('Desktop did not accept the two MIDI files.');
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
  if (currentDirectionReady()) renderUi('preparing');
  else renderUi('waiting');
  prepareTimer = setTimeout(() => {
    if (serialAtSchedule !== prepareSerial) return;
    prepareTimer = null;
    prepareCurrentMidi().catch(() => {});
  }, delay);
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
  wrap.innerHTML = '<button type="button" class="vr-native-midi-drag-btn" id="vrNativeMidiDragBtn" disabled>↗ Drag 2 MIDI → DAW</button><div class="vr-native-midi-drag-note" id="vrNativeMidiDragNote"></div>';
  utility.insertAdjacentElement('afterend', wrap);

  const button = wrap.querySelector('#vrNativeMidiDragBtn');
  const note = wrap.querySelector('#vrNativeMidiDragNote');
  ui = { wrap, button, note };

  button.addEventListener('dragstart', event => {
    const api = desktopBridge();
    if (!api || !stagedMidi?.stageId) {
      event.preventDefault();
      schedulePrepare(0);
      return;
    }
    event.preventDefault();
    api.startMidiDrag(stagedMidi.stageId);
    renderUi('dragging');
  });

  button.addEventListener('dragend', () => {
    setTimeout(() => renderUi(stagedMidi?.stageId ? 'ready' : 'waiting'), 180);
  });

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!stagedMidi?.stageId) schedulePrepare(0);
    else renderUi('ready', 'Drag this control into Ableton. No download step is needed.');
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
