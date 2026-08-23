(function () {
  "use strict";

  const modal = document.getElementById("tabEditor");
  const fretboard = document.getElementById("fretboard");
  const playButton = document.getElementById("playTab");
  const deleteButton = document.getElementById("deleteNote");
  const addSpaceButton = document.getElementById("addSpace");
  const undoButton = document.getElementById("undoEdit");
  const saveButton = document.getElementById("saveEditor");
  const closeButton = document.getElementById("closeEditor");
  const backButton = document.getElementById("cursorBack");
  const forwardButton = document.getElementById("cursorForward");
  if (!modal || !fretboard || !playButton) return;

  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const STORAGE_BASE = document.body.dataset.instrument === "bass"
    ? "myLessons.bassRoutine.v2"
    : "myLessons.guitarRoutine.v2";
  const STEP_MS = 155;

  let audioContext = null;
  let activeExerciseIndex = null;
  let playbackTimer = null;
  let playbackColumn = null;
  let playbackEndColumn = null;
  let playbackColumns = null;
  let allowOriginalDelete = false;

  moveCloseButtonOutsideTopbar();
  improveToolbarLabels();
  installInteractionTracking();
  installReliableNotePreview();
  installArrangementPlayback();
  installDeleteAssist();
  installToolbarFeedback();
  installEditorObserver();

  function moveCloseButtonOutsideTopbar() {
    if (!closeButton) return;
    closeButton.classList.add("editor-close-floating");
    modal.appendChild(closeButton);
    positionFloatingClose();
    window.addEventListener("resize", positionFloatingClose, { passive: true });
    window.addEventListener("orientationchange", () => window.setTimeout(positionFloatingClose, 80), { passive: true });
  }

  function positionFloatingClose() {
    if (!closeButton || !modal.classList.contains("is-open")) return;
    const panel = modal.querySelector(".editor-panel");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const top = Math.max(12, rect.top - 54);
    closeButton.style.top = `${top}px`;
    closeButton.style.right = "14px";
  }

  function improveToolbarLabels() {
    if (addSpaceButton) {
      addSpaceButton.textContent = "+";
      addSpaceButton.setAttribute("aria-label", "Agregar 8 espacios al final");
      addSpaceButton.title = "Agregar espacio";
    }
    if (deleteButton) {
      deleteButton.textContent = "⌫";
      deleteButton.setAttribute("aria-label", "Borrar nota anterior o actual");
      deleteButton.title = "Borrar nota";
    }
    if (undoButton) undoButton.title = "Deshacer";
    if (saveButton) saveButton.title = "Guardar y cerrar";
    playButton.title = "Reproducir arreglo";
    if (backButton) backButton.title = "Cursor atrás";
    if (forwardButton) forwardButton.title = "Cursor adelante";
  }

  function installInteractionTracking() {
    document.addEventListener("pointerdown", (event) => {
      const edit = event.target.closest?.("[data-edit-tab]");
      if (!edit) return;
      const row = edit.closest(".exercise-row");
      const rows = [...document.querySelectorAll("#exerciseList .exercise-row")];
      const index = rows.indexOf(row);
      if (index >= 0) activeExerciseIndex = index;
      unlockAudioFromGesture();
      window.setTimeout(positionFloatingClose, 40);
    }, true);

    document.addEventListener("change", (event) => {
      if (event.target?.name === "playbackInstrument") {
        window.setTimeout(() => {
          const style = currentPlaybackStyle();
          if (style) previewOpenString(style);
        }, 0);
      }
    }, true);
  }

  function installReliableNotePreview() {
    fretboard.addEventListener("pointerdown", (event) => {
      const note = event.target.closest?.(".fret-note");
      if (!note || !modal.classList.contains("is-open")) return;
      const midi = Number(note.dataset.midi);
      if (!Number.isFinite(midi)) return;
      unlockAudioFromGesture();
      playReliableMidi(midi, currentPlaybackStyle());
      flashPressedNote(note);
    }, true);

    fretboard.addEventListener("touchstart", () => unlockAudioFromGesture(), { capture: true, passive: true });
  }

  function installArrangementPlayback() {
    document.addEventListener("click", (event) => {
      const targetPlay = event.target.closest?.("#playTab");
      if (!targetPlay) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      unlockAudioFromGesture();
      if (playbackTimer) stopArrangementPlayback();
      else startArrangementPlayback();
    }, true);

    [saveButton, closeButton].filter(Boolean).forEach((button) => {
      button.addEventListener("click", stopArrangementPlayback, true);
    });
  }

  function startArrangementPlayback() {
    const events = collectArrangementEvents();
    if (!events.length) {
      showEditorToast("No hay notas para reproducir");
      return;
    }

    playbackColumns = new Map();
    events.forEach((item) => {
      if (!playbackColumns.has(item.column)) playbackColumns.set(item.column, []);
      playbackColumns.get(item.column).push(item);
    });

    const columns = [...playbackColumns.keys()].sort((a, b) => a - b);
    playbackColumn = columns[0];
    playbackEndColumn = columns[columns.length - 1];
    playButton.textContent = "■";
    playButton.classList.add("is-playing-arrangement");
    modal.classList.add("is-arrangement-playing");
    ensurePlayhead();

    runPlaybackStep();
    playbackTimer = window.setInterval(runPlaybackStep, STEP_MS);
  }

  function runPlaybackStep() {
    if (playbackColumn === null || playbackEndColumn === null) return;
    if (playbackColumn > playbackEndColumn) {
      stopArrangementPlayback();
      return;
    }

    updatePlayhead(playbackColumn);
    const notes = playbackColumns?.get(playbackColumn) || [];
    const style = currentPlaybackStyle();
    notes.forEach((item) => playReliableMidi(item.midi, style));
    playbackColumn += 1;
  }

  function stopArrangementPlayback() {
    if (playbackTimer) window.clearInterval(playbackTimer);
    playbackTimer = null;
    playbackColumn = null;
    playbackEndColumn = null;
    playbackColumns = null;
    playButton.textContent = "▶";
    playButton.classList.remove("is-playing-arrangement");
    modal.classList.remove("is-arrangement-playing");
    const head = document.getElementById("arrangementPlayhead");
    if (head) head.remove();
  }

  function collectArrangementEvents() {
    const lines = [...document.querySelectorAll("#editorTab .editor-line")];
    const events = [];
    lines.forEach((line, stringIndex) => {
      const body = line.querySelector(".editor-line-body")?.textContent || "";
      const openString = fretboard.querySelector(`.fret-note[data-string="${stringIndex}"][data-fret="0"]`);
      const baseMidi = Number(openString?.dataset.midi);
      if (!Number.isFinite(baseMidi)) return;
      const regex = /\d+/g;
      let match;
      while ((match = regex.exec(body)) !== null) {
        const fret = Number(match[0]);
        if (!Number.isFinite(fret)) continue;
        events.push({ column: match.index, midi: baseMidi + fret, stringIndex, fret });
      }
    });
    return events;
  }

  function ensurePlayhead() {
    const editorTab = document.getElementById("editorTab");
    if (!editorTab || document.getElementById("arrangementPlayhead")) return;
    const head = document.createElement("div");
    head.id = "arrangementPlayhead";
    head.className = "arrangement-playhead";
    editorTab.appendChild(head);
  }

  function updatePlayhead(column) {
    const editorTab = document.getElementById("editorTab");
    const body = editorTab?.querySelector(".editor-line-body");
    const head = document.getElementById("arrangementPlayhead");
    if (!editorTab || !body || !head) return;
    const text = body.textContent || "";
    const rect = body.getBoundingClientRect();
    const charWidth = rect.width / Math.max(1, text.length);
    const left = body.offsetLeft + column * charWidth;
    head.style.left = `${left}px`;

    const wrap = editorTab.closest(".editor-tab-wrap");
    if (wrap) {
      const visibleLeft = wrap.scrollLeft;
      const visibleRight = visibleLeft + wrap.clientWidth;
      if (left < visibleLeft + 36 || left > visibleRight - 54) {
        wrap.scrollTo({ left: Math.max(0, left - wrap.clientWidth * 0.42), behavior: "smooth" });
      }
    }
  }

  function installDeleteAssist() {
    if (!deleteButton || !backButton) return;
    document.addEventListener("click", (event) => {
      if (!event.target.closest?.("#deleteNote")) return;
      if (allowOriginalDelete) return;

      const selected = document.querySelector("#editorTab .editor-line.is-selected .editor-line-body");
      const slot = selected?.querySelector(".cursor-slot");
      if (!selected || !slot) return;
      const beforeText = selected.firstChild?.textContent || "";
      const currentChar = slot.textContent || "-";
      if (/\d/.test(currentChar)) return;

      let scan = beforeText.length - 1;
      let skippedHyphens = 0;
      while (scan >= 0 && beforeText[scan] === "-" && skippedHyphens < 2) {
        scan -= 1;
        skippedHyphens += 1;
      }
      if (scan < 0 || !/\d/.test(beforeText[scan])) return;

      let tokenStart = scan;
      while (tokenStart > 0 && /\d/.test(beforeText[tokenStart - 1])) tokenStart -= 1;
      const moves = beforeText.length - tokenStart;

      event.preventDefault();
      event.stopImmediatePropagation();
      for (let i = 0; i < moves; i += 1) backButton.click();
      allowOriginalDelete = true;
      deleteButton.click();
      allowOriginalDelete = false;
      showEditorToast("Nota borrada");
    }, true);
  }

  function installToolbarFeedback() {
    if (addSpaceButton) {
      addSpaceButton.addEventListener("click", () => {
        window.setTimeout(() => {
          const wrap = document.querySelector(".editor-tab-wrap");
          if (wrap) wrap.scrollTo({ left: wrap.scrollWidth, behavior: "smooth" });
          showEditorToast("Espacio añadido");
        }, 0);
      }, true);
    }

    if (undoButton) {
      undoButton.addEventListener("click", () => window.setTimeout(() => showEditorToast("Deshacer"), 0), true);
    }
  }

  function installEditorObserver() {
    const observer = new MutationObserver(() => {
      if (modal.classList.contains("is-open")) {
        positionFloatingClose();
        const menu = document.getElementById("editorMenuButton");
        if (menu) menu.setAttribute("title", "Tutorial y Settings");
      } else {
        stopArrangementPlayback();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  function unlockAudioFromGesture() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch (error) {}
  }

  function getAudioContext() {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    return audioContext;
  }

  function playReliableMidi(midi, style) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const play = () => {
      const now = ctx.currentTime;
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const bass = String(style || "").startsWith("bass") || midi < 38;
      const muted = style === "muted";
      const electric = ["electric", "jazz", "lespaul"].includes(style);

      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const harmonicGain = ctx.createGain();

      osc.type = bass ? "triangle" : (electric ? "sawtooth" : "triangle");
      harmonic.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      harmonic.frequency.setValueAtTime(frequency * 2, now);
      harmonicGain.gain.setValueAtTime(bass ? 0.06 : 0.11, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(bass ? 1150 : (electric ? 3400 : 2850), now);
      filter.Q.setValueAtTime(bass ? 1.15 : 0.85, now);

      const peak = bass ? 0.32 : 0.22;
      const decay = muted ? 0.18 : (bass ? 0.78 : 0.56);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.02, peak * 0.38), now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(filter);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + decay + 0.03);
      harmonic.stop(now + decay + 0.03);
    };

    if (ctx.state === "running") play();
    else ctx.resume().then(play).catch(() => {});
  }

  function currentPlaybackStyle() {
    const exercise = readActiveExercise();
    if (exercise?.playbackInstrument) return exercise.playbackInstrument;
    return document.body.dataset.instrument === "bass" ? "bass1" : "acoustic";
  }

  function readActiveExercise() {
    try {
      const session = JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY) || window.sessionStorage.getItem(LOCAL_SESSION_KEY) || "null");
      const userId = session?.user?.id;
      if (!userId) return null;
      const state = JSON.parse(window.localStorage.getItem(`${STORAGE_BASE}.${userId}`) || "null");
      if (!state || !Array.isArray(state.exercises)) return null;
      if (activeExerciseIndex !== null && state.exercises[activeExerciseIndex]) return state.exercises[activeExerciseIndex];
      const title = document.getElementById("editorTitle")?.value?.trim();
      return state.exercises.find((item) => item?.type === "tab" && item.title === title) || null;
    } catch (error) {
      return null;
    }
  }

  function previewOpenString(style) {
    const first = fretboard.querySelector('.fret-note[data-fret="0"]');
    const midi = Number(first?.dataset.midi);
    if (Number.isFinite(midi)) playReliableMidi(midi, style);
  }

  function flashPressedNote(note) {
    note.classList.add("is-auditioning");
    window.setTimeout(() => note.classList.remove("is-auditioning"), 130);
  }

  function showEditorToast(message) {
    let toast = document.getElementById("editorActionToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "editorActionToast";
      toast.className = "editor-action-toast";
      modal.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showEditorToast.timer);
    showEditorToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 850);
  }
})();
