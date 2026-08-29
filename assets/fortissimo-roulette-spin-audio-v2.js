export const ROULETTE_SPIN_DURATION_MS = 1450;
export const ROULETTE_SPIN_AUDIO_MIME = 'audio/generated';
export const ROULETTE_SPIN_AUDIO_VERSION = '2.0-short-mechanical';

const MASTER_SAMPLE_RATE = 44100;
const CLICK_TIMES = Object.freeze([
  0.025, 0.075, 0.13075, 0.192796, 0.261737, 0.338227, 0.422983,
  0.516792, 0.620512, 0.735086, 0.861544, 1.001016, 1.154737
]);

let masterSamples = null;
let audioContext = null;
let cachedBuffer = null;

function seededNoise(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
}

function addClick(samples, random, timeSeconds, amp, freq, decay, extra = false) {
  const start = Math.floor(timeSeconds * MASTER_SAMPLE_RATE);
  const length = Math.min(
    Math.floor((extra ? 0.05 : 0.035) * MASTER_SAMPLE_RATE),
    samples.length - start
  );
  if (length <= 0) return;

  for (let i = 0; i < length; i += 1) {
    const t = i / MASTER_SAMPLE_RATE;
    const envelope = Math.exp(-t / decay);
    const tone = Math.sin(2 * Math.PI * freq * t)
      + 0.35 * Math.sin(2 * Math.PI * (freq * 0.52) * t);
    const transient = random() * Math.exp(-t / 0.006);
    samples[start + i] += amp * (0.18 * tone * envelope + 0.12 * transient);
  }
}

function buildMasterSamples() {
  if (masterSamples) return masterSamples;

  const length = Math.floor((ROULETTE_SPIN_DURATION_MS / 1000) * MASTER_SAMPLE_RATE);
  const samples = new Float32Array(length);
  const random = seededNoise(42);

  // Soft moving-air bed underneath the mechanical clicks.
  const rawNoise = new Float32Array(length);
  for (let i = 0; i < length; i += 1) rawNoise[i] = random();

  const windowSize = 180;
  let running = 0;
  for (let i = 0; i < length; i += 1) {
    running += rawNoise[i];
    if (i >= windowSize) running -= rawNoise[i - windowSize];
    const divisor = Math.min(i + 1, windowSize);
    const smooth = running / divisor;
    const progress = i / Math.max(1, length - 1);
    const envelope = Math.pow(Math.sin(Math.PI * progress), 1.5);
    samples[i] += 0.055 * smooth * envelope;
  }

  CLICK_TIMES.forEach((time, index) => {
    const progress = index / Math.max(1, CLICK_TIMES.length - 1);
    addClick(
      samples,
      random,
      time,
      0.50 + 0.10 * progress,
      2300 - 500 * progress,
      0.014 + 0.006 * progress
    );
  });

  // Strong final landing click: this is the result-reveal moment.
  addClick(samples, random, 1.36, 0.95, 1500, 0.024, true);

  const thumpStart = Math.floor(1.355 * MASTER_SAMPLE_RATE);
  const thumpLength = Math.min(Math.floor(0.09 * MASTER_SAMPLE_RATE), length - thumpStart);
  for (let i = 0; i < thumpLength; i += 1) {
    const t = i / MASTER_SAMPLE_RATE;
    samples[thumpStart + i] += 0.10 * Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t / 0.03);
  }

  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    samples[i] = Math.tanh(samples[i] * 1.9);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak > 0) {
    const scale = 0.92 / peak;
    for (let i = 0; i < length; i += 1) samples[i] *= scale;
  }

  masterSamples = samples;
  return masterSamples;
}

function ensureContext() {
  if (audioContext) return audioContext;
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  try {
    audioContext = new Context();
  } catch (_) {
    audioContext = null;
  }
  return audioContext;
}

function ensureBuffer(context) {
  if (cachedBuffer && cachedBuffer.sampleRate === MASTER_SAMPLE_RATE) return cachedBuffer;
  const samples = buildMasterSamples();
  const buffer = context.createBuffer(1, samples.length, MASTER_SAMPLE_RATE);
  buffer.copyToChannel(samples, 0);
  cachedBuffer = buffer;
  return buffer;
}

export function preloadRouletteSpinAudio() {
  // Build the PCM ahead of time without creating/resuming AudioContext.
  // That keeps the actual playback start inside the mobile user gesture.
  buildMasterSamples();
  return true;
}

export function playRouletteSpinAudio({ onEnded } = {}) {
  const context = ensureContext();
  if (!context) return { audio: null, promise: Promise.resolve(false) };

  const source = context.createBufferSource();
  source.buffer = ensureBuffer(context);
  source.connect(context.destination);

  let settled = false;
  const promise = new Promise((resolve) => {
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try { onEnded?.(); } catch (_) {}
      resolve(ok);
    };
    source.addEventListener('ended', () => finish(true), { once: true });
    try {
      const resume = context.resume?.();
      if (resume?.catch) resume.catch(() => {});
      source.start(0);
    } catch (_) {
      finish(false);
    }
  });

  return { audio: source, promise };
}

preloadRouletteSpinAudio();

export const ROULETTE_SPIN_AUDIO_V2_INFO = Object.freeze({
  version: ROULETTE_SPIN_AUDIO_VERSION,
  durationMs: ROULETTE_SPIN_DURATION_MS,
  clickTimesSeconds: CLICK_TIMES,
  landingClickSeconds: 1.36,
  revealAuthority: 'audio-buffer-source-ended'
});
