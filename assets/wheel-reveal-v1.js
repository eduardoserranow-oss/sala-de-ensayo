(function () {
  "use strict";

  const ROOTS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  const FOURTHS = ["C", "F", "Bb", "Eb", "Ab", "Db/C#", "F#/Gb", "B", "E", "A", "D", "G"];
  const SPIN_MS = 1250;
  const rotations = new WeakMap();

  function randomInt(max) { return Math.floor(Math.random() * max); }
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function canonicalize(value) {
    const map = {"C#/Db":"C#","D#/Eb":"Eb","F#/Gb":"F#","G#/Ab":"Ab","A#/Bb":"Bb","Db/C#":"C#"};
    const text = String(value || "");
    const minor = text.endsWith("m");
    const root = minor ? text.slice(0, -1) : text;
    return `${map[root] || root}${minor ? "m" : ""}`;
  }

  function setButtonSpinning(button, spinning) {
    button.disabled = spinning;
    if (spinning) {
      button.style.filter = "brightness(.7) saturate(.9)";
      button.style.boxShadow = "0 0 0 rgba(255,101,0,0)";
    } else {
      button.style.filter = "";
      button.style.boxShadow = "0 0 0 3px rgba(255,101,0,.12), 0 0 22px rgba(255,101,0,.48)";
      window.setTimeout(() => { button.style.boxShadow = ""; }, 320);
    }
  }

  function fadeReveal(elements, values) {
    elements.forEach((el) => {
      el.style.opacity = "0";
      el.style.transition = "opacity 180ms ease";
    });
    requestAnimationFrame(() => {
      elements.forEach((el, i) => { el.textContent = values[i]; });
      requestAnimationFrame(() => elements.forEach((el) => { el.style.opacity = "1"; }));
    });
  }

  function syncLabels(wheel, rotation) {
    wheel.querySelectorAll(".wheel-label").forEach((label) => {
      label.style.setProperty("--wheel-counter-rotation", `${-rotation}deg`);
    });
  }

  function spinWheel(wheel) {
    const spinner = wheel.querySelector(".wheel-spinner");
    const button = wheel.querySelector(".wheel-spin");
    if (!spinner || !button || button.disabled) return;

    const isChordWheel = wheel.hasAttribute("data-chord-wheel");
    const resultEls = isChordWheel
      ? [...wheel.querySelectorAll(".chord-value")]
      : [wheel.querySelector(".wheel-result-value")].filter(Boolean);

    resultEls.forEach((el) => {
      el.textContent = "—";
      el.style.opacity = "1";
    });

    const current = rotations.get(wheel) || 0;
    const next = current + 720 + randomInt(360);
    rotations.set(wheel, next);

    const finalValues = isChordWheel
      ? shuffle(ROOTS.flatMap((root) => [root, `${root}m`])).slice(0, 4).map(canonicalize)
      : [canonicalize(FOURTHS[randomInt(FOURTHS.length)])];

    setButtonSpinning(button, true);
    spinner.style.transform = `rotate(${next}deg)`;
    syncLabels(wheel, next);

    window.setTimeout(() => {
      fadeReveal(resultEls, finalValues);
      setButtonSpinning(button, false);
    }, SPIN_MS + 40);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wheel-spin");
    if (!button) return;
    const wheel = button.closest(".wheel-card");
    if (!wheel) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    spinWheel(wheel);
  }, true);
})();
