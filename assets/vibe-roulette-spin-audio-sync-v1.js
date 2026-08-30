import {
  ROULETTE_SPIN_DURATION_MS,
  playRouletteSpinAudio,
  preloadRouletteSpinAudio
} from './fortissimo-roulette-spin-audio-v2.js';

const VIBE_SLOT_STOP_DELAYS = new Set([520, 602, 684, 766, 938, 1020, 1102, 1184]);
const EXPECTED_SLOT_STOPS = 8;
const DESKTOP_MIDI_DRAG_MODULE_URL = './vibe-roulette-desktop-midi-drag-v1.js?v=desktop-midi-drag13';
const WIDE_LAYOUT_STYLESHEET_URL = './assets/vibe-roulette-wide-layout-v1.css?v=wide2';

function looksLikeVibeSlotStop(callback) {
  if (typeof callback !== 'function') return false;
  let source = '';
  try { source = Function.prototype.toString.call(callback); } catch (_) { return false; }
  return source.includes('is-spinning') && source.includes('is-landing') && source.includes('target.chord');
}

export function installVibeRouletteSpinAudioSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const button = document.getElementById('spinBtn');
  if (!button || button.dataset.rouletteAudioSyncBound === 'true') return false;

  button.dataset.rouletteAudioSyncBound = 'true';
  preloadRouletteSpinAudio();

  button.addEventListener('click', () => {
    const pendingStops = [];
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    const originalSetTimeout = window.setTimeout;
    let restored = false;
    let flushed = false;
    let fallbackTimer = null;

    const restoreTimer = () => {
      if (restored) return;
      restored = true;
      if (window.setTimeout === interceptedSetTimeout) window.setTimeout = originalSetTimeout;
    };

    const flushStops = () => {
      if (flushed) return;
      flushed = true;
      restoreTimer();
      if (fallbackTimer) nativeClearTimeout(fallbackTimer);
      pendingStops.splice(0).forEach(({ callback, args }) => {
        try {
          callback(...args);
        } catch (error) {
          nativeSetTimeout(() => { throw error; }, 0);
        }
      });
    };

    function interceptedSetTimeout(callback, delay, ...args) {
      const numericDelay = Number(delay);
      if (
        pendingStops.length < EXPECTED_SLOT_STOPS &&
        VIBE_SLOT_STOP_DELAYS.has(numericDelay) &&
        looksLikeVibeSlotStop(callback)
      ) {
        pendingStops.push({ callback, args, delay: numericDelay });
        return 900000 + pendingStops.length;
      }
      return nativeSetTimeout(callback, delay, ...args);
    }

    window.setTimeout = interceptedSetTimeout;
    queueMicrotask(restoreTimer);

    fallbackTimer = nativeSetTimeout(flushStops, ROULETTE_SPIN_DURATION_MS + 450);
    const playback = playRouletteSpinAudio();
    playback?.promise?.then((endedNormally) => {
      if (endedNormally) flushStops();
    }).catch(() => {});
  }, { capture: true });

  return true;
}

function installWhenReady() {
  if (installVibeRouletteSpinAudioSync()) return;
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installVibeRouletteSpinAudioSync, { once: true });
  }
}

function moveDesktopToolkitIntoRail(resultPanel, rail) {
  const nativeToolkit = resultPanel?.querySelector('#vrNativeMidiDrag');
  if (nativeToolkit && nativeToolkit.parentElement !== rail) rail.insertBefore(nativeToolkit, rail.querySelector('.serra-fit-note'));
}

function installAdaptiveWorkspace() {
  if (typeof document === 'undefined') return false;
  if (!document.querySelector(`link[href*="vibe-roulette-wide-layout-v1.css"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = WIDE_LAYOUT_STYLESHEET_URL;
    link.dataset.fortissimoWideLayout = 'true';
    document.head.appendChild(link);
  }

  const resultPanel = document.querySelector('.vr-grid > section.vr-panel');
  if (!resultPanel) return false;
  const existing = resultPanel.querySelector(':scope > .vr-result-layout');
  if (existing) {
    const rail = existing.querySelector('.vr-result-rail');
    if (rail) moveDesktopToolkitIntoRail(resultPanel, rail);
    return true;
  }

  const layout = document.createElement('div');
  layout.className = 'vr-result-layout';
  const main = document.createElement('div');
  main.className = 'vr-result-main';
  const rail = document.createElement('aside');
  rail.className = 'vr-result-rail';
  rail.setAttribute('aria-label', 'Production and DAW tools');

  const railSelectors = new Set([
    'drum-panel',
    'primary-actions',
    'utility-row',
    'serra-fit-note',
    'chorus',
    'feedback-box',
    'details-toggle'
  ]);

  [...resultPanel.children].forEach(child => {
    const goesToRail = [...railSelectors].some(className => child.classList.contains(className));
    (goesToRail ? rail : main).appendChild(child);
  });
  layout.append(main, rail);
  resultPanel.appendChild(layout);
  moveDesktopToolkitIntoRail(resultPanel, rail);
  document.documentElement.classList.add('fortissimo-adaptive-workspace');
  return true;
}

function installAdaptiveWorkspaceWhenReady() {
  if (installAdaptiveWorkspace()) return;
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installAdaptiveWorkspace, { once: true });
  }
}

function installDesktopMidiDrag() {
  if (typeof window === 'undefined') return false;
  const api = window.fortissimoDesktop;
  if (!api?.isDesktop || !Array.isArray(api.capabilities) || !api.capabilities.includes('midi-drag')) return false;
  if (window.__FORTISSIMO_DESKTOP_MIDI_DRAG_LOADING__) return true;
  window.__FORTISSIMO_DESKTOP_MIDI_DRAG_LOADING__ = true;
  import(DESKTOP_MIDI_DRAG_MODULE_URL).then(() => {
    window.__FORTISSIMO_DESKTOP_MIDI_DRAG_LOADED__ = true;
    setTimeout(installAdaptiveWorkspace, 0);
  }).catch(error => {
    window.__FORTISSIMO_DESKTOP_MIDI_DRAG_LOADING__ = false;
    console.error('FORTISSIMO Desktop MIDI drag module failed to load:', error);
  });
  return true;
}

installWhenReady();
installAdaptiveWorkspaceWhenReady();
if (!installDesktopMidiDrag() && typeof window !== 'undefined') {
  window.addEventListener('fortissimo:desktop-ready', installDesktopMidiDrag, { once: true });
}

export const VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO = Object.freeze({
  version: '1.6-phase13-native-midi-drag',
  durationMs: ROULETTE_SPIN_DURATION_MS,
  slotStopDelays: Object.freeze([...VIBE_SLOT_STOP_DELAYS]),
  expectedSlotStops: EXPECTED_SLOT_STOPS,
  stopAuthority: 'audio-ended'
});
