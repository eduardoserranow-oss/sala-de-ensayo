import {
  ROULETTE_SPIN_DURATION_MS,
  playRouletteSpinAudio,
  preloadRouletteSpinAudio
} from './fortissimo-roulette-spin-audio-v1.js';

const LEGACY_HOME_STOP_DELAY_MS = 1650;

export function installHomeRouletteSpinAudioSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const button = document.getElementById('spinButton');
  if (!button || button.dataset.rouletteAudioSyncBound === 'true') return false;

  button.dataset.rouletteAudioSyncBound = 'true';
  preloadRouletteSpinAudio();

  document.addEventListener('click', (event) => {
    const clicked = event.target?.closest?.('#spinButton');
    if (clicked !== button || button.disabled) return;

    const spinner = document.getElementById('spinnerLayer');
    if (spinner) spinner.style.transitionDuration = `${ROULETTE_SPIN_DURATION_MS}ms`;

    const originalSetTimeout = window.setTimeout;
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    let pendingLegacyStop = null;
    let restored = false;
    let flushed = false;
    let fallbackTimer = null;

    const restoreTimer = () => {
      if (restored) return;
      restored = true;
      if (window.setTimeout === interceptedSetTimeout) window.setTimeout = originalSetTimeout;
    };

    const flushLegacyStop = () => {
      if (flushed) return;
      flushed = true;
      restoreTimer();
      if (fallbackTimer) nativeClearTimeout(fallbackTimer);
      if (pendingLegacyStop) {
        const { callback, args } = pendingLegacyStop;
        pendingLegacyStop = null;
        callback(...args);
      }
    };

    function interceptedSetTimeout(callback, delay, ...args) {
      if (
        !pendingLegacyStop &&
        Number(delay) === LEGACY_HOME_STOP_DELAY_MS &&
        typeof callback === 'function'
      ) {
        pendingLegacyStop = { callback, args };
        return 910001;
      }
      return nativeSetTimeout(callback, delay, ...args);
    }

    window.setTimeout = interceptedSetTimeout;
    queueMicrotask(restoreTimer);

    fallbackTimer = nativeSetTimeout(flushLegacyStop, ROULETTE_SPIN_DURATION_MS + 450);
    const playback = playRouletteSpinAudio();
    playback?.promise?.then((endedNormally) => {
      if (endedNormally) flushLegacyStop();
    }).catch(() => {});
  }, { capture: true });

  return true;
}

function installWhenReady() {
  if (installHomeRouletteSpinAudioSync()) return;
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installHomeRouletteSpinAudioSync, { once: true });
  }
}

installWhenReady();

export const HOME_ROULETTE_SPIN_AUDIO_SYNC_INFO = Object.freeze({
  version: '1.0',
  durationMs: ROULETTE_SPIN_DURATION_MS,
  legacyStopDelayMs: LEGACY_HOME_STOP_DELAY_MS,
  stopAuthority: 'audio-ended'
});
