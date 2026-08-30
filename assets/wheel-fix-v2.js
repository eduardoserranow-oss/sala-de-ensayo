(function () {
  "use strict";

  const DEFAULT_SPIN_DURATION_MS = 1450;
  let rouletteAudioApi = null;
  const rouletteAudioReady = import("./fortissimo-roulette-spin-audio-v2.js")
    .then((api) => {
      rouletteAudioApi = api;
      api.preloadRouletteSpinAudio?.();
      return api;
    })
    .catch(() => null);

  const ROOTS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  const FOURTHS = ["C", "F", "Bb", "Eb", "Ab", "Db/C#", "F#/Gb", "B", "E", "A", "D", "G"];
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
  const rotations = new WeakMap();

  function randomInt(max) {
    return Math.floor(Math.random() * Math.max(1, Number(max) || 1));
  }

  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
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

  function resultNodesFor(wheel) {
    if (wheel.hasAttribute("data-chord-wheel")) {
      return [...wheel.querySelectorAll(".chord-value")];
    }
    const value = wheel.querySelector(".wheel-result-value");
    return value ? [value] : [];
  }

  function buildFinalValues(wheel) {
    if (wheel.hasAttribute("data-chord-wheel")) {
      return shuffle(ROOTS.flatMap((root) => [root, `${root}m`]))
        .slice(0, 4)
        .map(canonicalizeChordLabel);
    }
    return [canonicalizeChordLabel(FOURTHS[randomInt(FOURTHS.length)])];
  }

  function beginOwnedSpin(wheel, button, spinner) {
    if (button.disabled || wheel.classList.contains("is-spinning")) return;

    const nodes = resultNodesFor(wheel);
    if (!nodes.length) return;

    // Generate the final result once, before animation begins. This module is
    // the single owner of routine-wheel results so no later handler can replace
    // the landed value with an old placeholder.
    const finalValues = buildFinalValues(wheel);
    const durationMs = rouletteAudioApi?.ROULETTE_SPIN_DURATION_MS || DEFAULT_SPIN_DURATION_MS;

    applySpinDuration(wheel, spinner, durationMs);
    wheel.classList.remove("wheel-just-stopped");
    wheel.classList.add("is-spinning");
    button.disabled = true;

    nodes.forEach((node) => {
      node.textContent = "—";
      node.classList.add("wheel-result-hidden");
      node.classList.remove("wheel-result-reveal");
    });

    const current = rotations.has(wheel) ? rotations.get(wheel) : readRotation(spinner);
    const next = current + 720 + randomInt(360);
    rotations.set(wheel, next);
    spinner.style.transform = `rotate(${next}deg)`;
    syncCounterRotation(wheel);

    let finished = false;
    let fallbackTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);

      syncCounterRotation(wheel);
      nodes.forEach((node, index) => {
        // Landed results are persistent by design. They remain visible until
        // the user presses GIRAR again.
        node.textContent = finalValues[index] || "—";
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
    if (rouletteAudioApi) startSound(rouletteAudioApi);
    else rouletteAudioReady.then(startSound);
  }

  function bindWheel(wheel) {
    const button = wheel.querySelector(".wheel-spin");
    const spinner = wheel.querySelector(".wheel-spinner");
    if (!button || !spinner || button.dataset.wheelFixBound === "true") return;

    button.dataset.wheelFixBound = "true";
    applySpinDuration(wheel, spinner, DEFAULT_SPIN_DURATION_MS);

    button.addEventListener("click", (event) => {
      if (button.disabled || wheel.classList.contains("is-spinning")) return;

      // The routine-practice file still contains its historical bubble-phase
      // generator. Stop it here so there is exactly one result authority.
      event.preventDefault();
      event.stopImmediatePropagation();
      beginOwnedSpin(wheel, button, spinner);
    }, { capture: true });

    syncCounterRotation(wheel);
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
