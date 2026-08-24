(function () {
  "use strict";

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

  function finalizeWheel(wheel) {
    syncCounterRotation(wheel);
    if (wheel.hasAttribute("data-chord-wheel")) {
      normalizeChordSlots(wheel);
    }
  }

  function scheduleFinalize(wheel) {
    setTimeout(() => finalizeWheel(wheel), 0);
    requestAnimationFrame(() => finalizeWheel(wheel));
    setTimeout(() => finalizeWheel(wheel), 60);
  }

  function bindWheel(wheel) {
    const button = wheel.querySelector(".wheel-spin");
    if (!button || button.dataset.wheelFixBound === "true") return;
    button.dataset.wheelFixBound = "true";
    button.addEventListener("click", () => scheduleFinalize(wheel));
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
