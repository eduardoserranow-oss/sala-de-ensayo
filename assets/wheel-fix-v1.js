(function () {
  "use strict";

  const CANONICAL_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const ENHARMONIC_LABELS = {
    "C#/Db": "C#",
    "D#/Eb": "Eb",
    "F#/Gb": "F#",
    "G#/Ab": "Ab",
    "A#/Bb": "Bb"
  };

  function canonicalizeChordLabel(value) {
    const text = String(value || "");
    const isMinor = text.endsWith("m");
    const root = isMinor ? text.slice(0, -1) : text;
    const cleanRoot = ENHARMONIC_LABELS[root] || root;
    return `${cleanRoot}${isMinor ? "m" : ""}`;
  }

  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeRandomChords() {
    return shuffle(CANONICAL_ROOTS)
      .slice(0, 4)
      .map((root) => (Math.random() < 0.5 ? root : `${root}m`));
  }

  function getRotation(spinner) {
    const match = String(spinner?.style?.transform || "").match(/rotate\((-?[\d.]+)deg\)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  function syncCounterRotation(wheel) {
    const spinner = wheel.querySelector(".wheel-spinner");
    if (!spinner) return;
    const rotation = getRotation(spinner);
    wheel.querySelectorAll(".wheel-label").forEach((label) => {
      label.style.setProperty("--wheel-counter-rotation", `${-rotation}deg`);
    });
  }

  function cleanChordWheelLabels(wheel) {
    wheel.querySelectorAll(".wheel-label").forEach((label) => {
      const clean = canonicalizeChordLabel(label.textContent);
      if (clean !== label.textContent) label.textContent = clean;
    });
  }

  function bindWheel(wheel) {
    const button = wheel.querySelector(".wheel-spin");
    if (!button || button.dataset.wheelFixBound === "true") return;
    button.dataset.wheelFixBound = "true";

    button.addEventListener("click", () => {
      /* The original wheel listener runs first. We then keep the labels
         visually upright and replace chord results with one spelling only. */
      syncCounterRotation(wheel);

      if (wheel.hasAttribute("data-chord-wheel")) {
        const chords = makeRandomChords();
        wheel.querySelectorAll(".chord-value").forEach((slot, index) => {
          slot.textContent = chords[index] || "—";
        });
      }
    });
  }

  function applyWheelFixes() {
    document.querySelectorAll(".wheel-card").forEach((wheel) => {
      if (wheel.hasAttribute("data-chord-wheel")) cleanChordWheelLabels(wheel);
      syncCounterRotation(wheel);
      bindWheel(wheel);
    });
  }

  applyWheelFixes();

  const list = document.getElementById("exerciseList");
  if (list) {
    new MutationObserver(applyWheelFixes).observe(list, {
      childList: true,
      subtree: true
    });
  }
})();
