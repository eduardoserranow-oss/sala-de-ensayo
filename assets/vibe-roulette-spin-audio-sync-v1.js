import {
  ROULETTE_SPIN_DURATION_MS,
  playRouletteSpinAudio,
  preloadRouletteSpinAudio
} from './fortissimo-roulette-spin-audio-v2.js';

const VIBE_SLOT_STOP_DELAYS = new Set([520, 602, 684, 766, 938, 1020, 1102, 1184]);
const EXPECTED_SLOT_STOPS = 8;

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

installWhenReady();

export const VIBE_ROULETTE_SPIN_AUDIO_SYNC_INFO = Object.freeze({
  version: '1.1-short-audio',
  durationMs: ROULETTE_SPIN_DURATION_MS,
  slotStopDelays: Object.freeze([...VIBE_SLOT_STOP_DELAYS]),
  expectedSlotStops: EXPECTED_SLOT_STOPS,
  stopAuthority: 'audio-ended'
});
