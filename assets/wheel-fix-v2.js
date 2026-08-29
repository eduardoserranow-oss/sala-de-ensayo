(function () {
  "use strict";

  const DEFAULT_SPIN_DURATION_MS = 3530;
  let rouletteAudioApi = null;
  const rouletteAudioReady = import("./fortissimo-roulette-spin-audio-v1.js")
    .then((api) => {
      rouletteAudioApi = api;
      api.preloadRouletteSpinAudio?.();
      return api;
    })
    .catch(() => null);

  const CANONICAL_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const ENHARMONIC_LABELS = {
    "C#/Db": "C#",
    "Db/C#": "C#",
    "D#/Eb": "Eb",
    "Eb/D#": "Eb",
    "F#/Gb": "F#",
    "Gb/F#": "F#",
    "G#/Ab": "Ab",
    "Ab/G#": "Ab",
    "A#/Bb": "Bb",
    "Bb/A#": "Bb"
  };

  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function canonicalizeChordLabel(value) {
    const text = String(value || "").trim();
    if (!text || text === "—") return "";
    const isMinor = text.endsWith("m");
    const rawRoot = isMinor ? text.slice(0, -1) : text;
    const cleanRoot = ENHARMONIC_LABELS[rawRoot] || rawRoot;
    return `${cleanRoot}${isMinor ? "m" : ""}`;
  }

  function getChordRoot(label) {
    return label.endsWith("m") ? label.slice(0, -1) : label;
  }

  function pickReplacementRoot(seenRoots) {
    const available = shuffle(CANONICAL_ROOTS.filter((root) => !seenRoots.has(root)));
    return available[0] || shuffle(CANONICAL_ROOTS)[0] || "C";
  }

  function makeChordFromRoot(root) {
    return Math.random() < 0.5 ? root : `${root}m`;
  }

  function normalizeChordSlots(wheel) {
    const slots = [...wheel.querySelectorAll(".chord-value")];
    if (!slots.some((slot) => canonicalizeChordLabel(slot.textContent))) return;

    const seenRoots = new Set();

    slots.forEach((slot) => {
      let label = canonicalizeChordLabel(slot.textContent);
      let root = label ? getChordRoot(label) : "";

      if (!root || seenRoots.has(root)) {
        root = pickReplacementRoot(seenRoots);
        label = makeChordFromRoot(root);
      }

      seenRoots.add(root);
      slot.textContent = label;
    });
  }

  function readRotation(spinner) {
    const match = String(spinner?.style?.transform || "").match(/rotate\((-?[\d.]+)deg\)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  function syncCounterRotation(wheel) {
    const spinner = wheel.querySelector(".wheel-spinner");
    if (!spinner) return;
    const rotation = readRotation(spinner);
    wheel.querySelectorAll(".wheel-label").forEach((label) => {
      label.style.setProperty("--wheel-counter-rotation", `${-rotation}deg`);
    });
  }

  function applySpinDuration(wheel, spinner, durationMs = DEFAULT_SPIN_DURATION_MS) {
    const duration = `${Math.max(1, Number(durationMs) || DEFAULT_SPIN_DURATION_MS)}ms`;
    spinner.style.transitionDuration = duration;
    wheel.querySelectorAll(".wheel-label").forEach((label) => {
      label.style.transitionDuration = duration;
    });
  }

  function finalizeWheel(wheel) {
    syncCounterRotation(wheel);
    if (wheel.hasAttribute("data-chord-wheel")) {
      normalizeChordSlots(wheel);
    }
  }

  function resultNodesFor(wheel) {
    if (wheel.hasAttribute("data-chord-wheel")) {
      return [...wheel.querySelectorAll(".chord-value")];
    }
    const value = wheel.querySelector(".wheel-result-value");
    return value ? [value] : [];
  }

  function beginSpinState(wheel, button, spinner) {
    if (wheel.classList.contains("is-spinning")) return;

    const durationMs = rouletteAudioApi?.ROULETTE_SPIN_DURATION_MS || DEFAULT_SPIN_DURATION_MS;
    applySpinDuration(wheel, spinner, durationMs);
    wheel.classList.remove("wheel-just-stopped");
    wheel.classList.add("is-spinning");
    button.disabled = true;

    let finished = false;
    let fallbackTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);

      syncCounterRotation(wheel);
      const nodes = resultNodesFor(wheel);
      nodes.forEach((node) => {
        const pending = node.dataset.pendingWheelResult;
        if (pending) node.textContent = pending;
        delete node.dataset.pendingWheelResult;
        node.classList.remove("wheel-result-hidden");
        node.classList.remove("wheel-result-reveal");
        void node.offsetWidth;
        node.classList.add("wheel-result-reveal");
      });

      wheel.classList.remove("is-spinning");
      wheel.classList.add("wheel-just-stopped");
      button.disabled = false;
      window.setTimeout(() => wheel.classList.remove("wheel-just-stopped"), 700);
    };

    const startSound = (api) => {
      if (!api || finished) return;
      const liveDuration = api.ROULETTE_SPIN_DURATION_MS || durationMs;
      applySpinDuration(wheel, spinner, liveDuration);
      const playback = api.playRouletteSpinAudio?.();
      playback?.promise?.then((endedNormally) => {
        if (endedNormally) finish();
      }).catch(() => {});
    };

    fallbackTimer = window.setTimeout(finish, durationMs + 450);

    if (rouletteAudioApi) {
      startSound(rouletteAudioApi);
    } else {
      rouletteAudioReady.then(startSound);
    }

    queueMicrotask(() => {
      syncCounterRotation(wheel);
      if (wheel.hasAttribute("data-chord-wheel")) normalizeChordSlots(wheel);

      resultNodesFor(wheel).forEach((node) => {
        const finalValue = String(node.textContent || "").trim();
        node.dataset.pendingWheelResult = finalValue && finalValue !== "—" ? finalValue : "—";
        node.textContent = "—";
        node.classList.add("wheel-result-hidden");
        node.classList.remove("wheel-result-reveal");
      });
    });
  }

  function bindWheel(wheel) {
    const button = wheel.querySelector(".wheel-spin");
    const spinner = wheel.querySelector(".wheel-spinner");
    if (!button || !spinner || button.dataset.wheelFixBound === "true") return;

    button.dataset.wheelFixBound = "true";
    applySpinDuration(wheel, spinner, DEFAULT_SPIN_DURATION_MS);
    button.addEventListener("click", () => beginSpinState(wheel, button, spinner), { capture: true });
    finalizeWheel(wheel);
  }

  function applyWheelFixes() {
    document.querySelectorAll(".wheel-card").forEach(bindWheel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyWheelFixes, { once: true });
  } else {
    applyWheelFixes();
  }

  const list = document.getElementById("exerciseList");
  if (list) {
    new MutationObserver(() => applyWheelFixes()).observe(list, {
      childList: true,
      subtree: true
    });
  }
})();
