import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js';

export const VIBE_ROULETTE_DESKTOP_MIDI_DRAG_V1_INFO = Object.freeze({
  version: '3.0.0',
  capability: 'native-midi-drag-to-daw',
  files: Object.freeze(['foundation', 'texture']),
  delivery: 'windows-native-file-drag',
  principle: 'Grab the prepared MIDI and drop it directly into Ableton Live.'
});

let stagedMidi = null;
let prepareSerial = 0;
let prepareTimer = null;
let ui = null;
let legacyObserver = null;

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
  if (document.getElementById('vr-phase13-midi-drag-style')) return;
  const style = document.createElement('style');
  style.id = 'vr-phase13-midi-drag-style';
  style.textContent = `
    .vr-phase13-midi-drag{margin:12px 0;display:grid;gap:9px;padding:14px;border:1px solid rgba(255,100,20,.42);border-radius:16px;background:linear-gradient(150deg,rgba(255,90,0,.10),rgba(14,14,14,.92));box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
    .vr-phase13-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.vr-phase13-title{display:flex;align-items:center;gap:8px;font:950 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#ff9a5d}.vr-phase13-hand{font-size:22px;filter:grayscale(.15)}.vr-phase13-badge{font:850 8px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.48);padding:5px 7px;border:1px solid rgba(255,255,255,.10);border-radius:999px}
    .vr-phase13-grab{min-height:70px;width:100%;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid rgba(255,102,20,.82);border-radius:14px;background:linear-gradient(180deg,rgba(255,103,20,.20),rgba(255,82,0,.09));color:#ffd2b7;font:950 14px/1.1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:grab;user-select:none;-webkit-user-select:none;transition:transform .12s ease,border-color .12s ease,background .12s ease}.vr-phase13-grab:hover{border-color:#ff6a14;background:linear-gradient(180deg,rgba(255,103,20,.28),rgba(255,82,0,.12));transform:translateY(-1px)}.vr-phase13-grab:active{cursor:grabbing;transform:scale(.994)}.vr-phase13-grab[aria-disabled="true"]{opacity:.42;cursor:default;transform:none}.vr-phase13-grab-icon{font-size:27px}.vr-phase13-grab-copy{display:grid;gap:4px;text-align:left}.vr-phase13-grab-copy small{font-size:9px;font-weight:750;color:rgba(255,255,255,.48)}
    .vr-phase13-layers{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vr-phase13-layer{min-height:45px;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.78);font:900 10px/1.15 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:grab;text-align:left;user-select:none;-webkit-user-select:none}.vr-phase13-layer small{display:block;margin-top:4px;font-size:8px;font-weight:700;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-phase13-layer[aria-disabled="true"]{opacity:.4;cursor:default}
    .vr-phase13-status{min-height:14px;text-align:center;font-size:9px;line-height:1.35;color:rgba(255,255,255,.48)}.vr-phase13-midi-drag.is-ready .vr-phase13-status{color:rgba(255,255,255,.64)}
    body.fortissimo-desktop #vrPhase6Export,body.fortissimo-desktop #vrNativeMidiDrag,body.fortissimo-desktop [data-vr-export-midi],body.fortissimo-desktop .vr-midi-export-legacy{display:none!important}
  `;
  document.head.appendChild(style);
}

function suppressLegacyExportUi() {
  const direct = [
    document.getElementById('vrPhase6Export'),
    document.getElementById('vrNativeMidiDrag')
  ].filter(Boolean);
  for (const node of direct) node.remove();

  for (const node of document.querySelectorAll('button,a,[role="button"]')) {
    const label = String(node.textContent || '').trim().toLowerCase();
    if (label === 'export 2 midi' || label === 'export midi' || label.includes('export 2 midi')) {
      const candidate = node.closest('#vrPhase6Export,.utility-row,.vr-native-midi-drag') || node;
      if (candidate?.id === 'vrPhase13MidiDrag') continue;
      candidate.remove();
    }
  }
}

function watchLegacyExportUi() {
  if (legacyObserver) return;
  legacyObserver = new MutationObserver(() => suppressLegacyExportUi());
  legacyObserver.observe(document.body, { childList: true, subtree: true });
}

function setUiState(state = 'waiting', message = '') {
  if (!ui) return;
  const ready = state === 'ready' && Boolean(stagedMidi?.stageId);
  ui.wrap.classList.toggle('is-ready', ready);
  for (const node of ui.dragNodes) {
    node.draggable = ready;
    node.setAttribute('aria-disabled', String(!ready));
  }
  ui.status.textContent = message || (
    state === 'ready' ? 'Listo. Mantén presionado y arrastra directamente a Ableton Live.' :
    state === 'preparing' ? 'Preparando Foundation + Texture para arrastre nativo…' :
    state === 'dragging' ? 'Suelta el MIDI dentro de una pista de Ableton Live.' :
    state === 'error' ? 'No se pudo preparar el MIDI. Haz Spin o edita la dirección para refrescarlo.' :
    'Haz Spin para preparar el MIDI de esta dirección.'
  );
}

async function prepareCurrentMidi() {
  const api = desktopBridge();
  if (!api) return null;
  const serial = ++prepareSerial;
  stagedMidi = null;
  if (!currentDirectionReady()) {
    setUiState('waiting');
    return null;
  }
  setUiState('preparing');
  try {
    const pair = await buildCurrentSongStarterMidiPair();
    if (serial !== prepareSerial) return null;
    const stage = await api.stageMidiPair(pair);
    if (serial !== prepareSerial) return null;
    if (!stage?.ok || !stage.stageId || stage.fileCount !== 2) throw new Error('Desktop did not stage Foundation + Texture MIDI.');
    stagedMidi = Object.freeze({
      ...stage,
      files: pair.files.map(file => Object.freeze({ role: file.role, filename: file.filename }))
    });
    if (ui) {
      const foundation = stagedMidi.files.find(file => file.role === 'foundation');
      const texture = stagedMidi.files.find(file => file.role === 'texture');
      ui.foundationName.textContent = foundation?.filename || 'Foundation MIDI';
      ui.textureName.textContent = texture?.filename || 'Texture MIDI';
    }
    setUiState('ready');
    return stagedMidi;
  } catch (error) {
    if (serial !== prepareSerial) return null;
    stagedMidi = null;
    console.error('[FORTISSIMO Phase 13 native MIDI drag]', error);
    setUiState('error');
    return null;
  }
}

function schedulePrepare(delay = 100) {
  if (prepareTimer) clearTimeout(prepareTimer);
  const scheduledSerial = ++prepareSerial;
  stagedMidi = null;
  setUiState(currentDirectionReady() ? 'preparing' : 'waiting');
  prepareTimer = setTimeout(() => {
    if (scheduledSerial !== prepareSerial) return;
    prepareTimer = null;
    prepareCurrentMidi().catch(() => {});
  }, delay);
}

function bindNativeDrag(node, selection) {
  node.addEventListener('dragstart', event => {
    const api = desktopBridge();
    if (!api || !stagedMidi?.stageId) {
      event.preventDefault();
      schedulePrepare(0);
      return;
    }
    event.preventDefault();
    api.startMidiDrag(stagedMidi.stageId, selection);
    const label = selection === 'pair' ? 'Foundation + Texture' : selection === 'foundation' ? 'Foundation' : 'Texture';
    setUiState('dragging', `Arrastrando ${label} · suéltalo dentro de Ableton Live.`);
  });
  node.addEventListener('dragend', () => setTimeout(() => setUiState(stagedMidi?.stageId ? 'ready' : 'waiting'), 180));
  node.addEventListener('click', event => {
    event.preventDefault();
    if (!stagedMidi?.stageId) schedulePrepare(0);
    else setUiState('ready', 'Mantén presionado este control, muévelo a Ableton y suéltalo allí.');
  });
}

function findMountPoint() {
  return document.querySelector('.vr-result-rail .utility-row') ||
    document.querySelector('.utility-row') ||
    document.querySelector('.vr-result-rail') ||
    document.querySelector('.vr-grid > section.vr-panel');
}

function installUi() {
  if (ui) return true;
  const api = desktopBridge();
  if (!api) return false;
  const mount = findMountPoint();
  if (!mount) return false;
  installStyles();
  suppressLegacyExportUi();
  watchLegacyExportUi();

  const wrap = document.createElement('section');
  wrap.id = 'vrPhase13MidiDrag';
  wrap.className = 'vr-phase13-midi-drag';
  wrap.setAttribute('aria-label', 'Arrastrar MIDI a Ableton Live');
  wrap.innerHTML = `
    <div class="vr-phase13-head">
      <div class="vr-phase13-title"><span class="vr-phase13-hand" aria-hidden="true">✋</span><span>Arrastrar MIDI</span></div>
      <span class="vr-phase13-badge">DESKTOP · NATIVE DRAG</span>
    </div>
    <div class="vr-phase13-grab" id="vrPhase13DragPair" draggable="false" aria-disabled="true">
      <span class="vr-phase13-grab-icon" aria-hidden="true">✋</span>
      <span class="vr-phase13-grab-copy"><strong>ARRASTRAR 2 MIDI A ABLETON</strong><small>Foundation + Texture · performance actual</small></span>
    </div>
    <div class="vr-phase13-layers">
      <div class="vr-phase13-layer" id="vrPhase13Foundation" draggable="false" aria-disabled="true">✋ ARRASTRAR FOUNDATION<small id="vrPhase13FoundationName">Foundation MIDI</small></div>
      <div class="vr-phase13-layer" id="vrPhase13Texture" draggable="false" aria-disabled="true">✋ ARRASTRAR TEXTURE<small id="vrPhase13TextureName">Texture MIDI</small></div>
    </div>
    <div class="vr-phase13-status" id="vrPhase13Status">Preparando MIDI…</div>
  `;

  if (mount.classList.contains('utility-row')) mount.insertAdjacentElement('afterend', wrap);
  else mount.prepend(wrap);

  const pair = wrap.querySelector('#vrPhase13DragPair');
  const foundation = wrap.querySelector('#vrPhase13Foundation');
  const texture = wrap.querySelector('#vrPhase13Texture');
  ui = {
    wrap,
    pair,
    foundation,
    texture,
    foundationName: wrap.querySelector('#vrPhase13FoundationName'),
    textureName: wrap.querySelector('#vrPhase13TextureName'),
    status: wrap.querySelector('#vrPhase13Status'),
    dragNodes: [pair, foundation, texture]
  };
  bindNativeDrag(pair, 'pair');
  bindNativeDrag(foundation, 'foundation');
  bindNativeDrag(texture, 'texture');
  setUiState(currentDirectionReady() ? 'preparing' : 'waiting');
  return true;
}

function installWhenReady() {
  suppressLegacyExportUi();
  if (!desktopBridge()) return;
  if (!installUi()) {
    setTimeout(installWhenReady, 120);
    return;
  }
  window.addEventListener('fortissimo:vibe-arrangement-updated', () => schedulePrepare(80));
  document.getElementById('energySlider')?.addEventListener('input', () => schedulePrepare(260), { passive: true });
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
