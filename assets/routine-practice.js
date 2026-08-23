(function () {
  "use strict";

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const ROOTS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  const FOURTHS = ["C", "F", "Bb", "Eb", "Ab", "Db/C#", "F#/Gb", "B", "E", "A", "D", "G"];
  const TRACKS = [
    { label: "85 BPM - HIP HOP", src: "assets/hiphop-85.mp3" },
    { label: "80BPM - JAZZ", src: "assets/jazz-80.mp3" },
    { label: "100 BPM - HIP HOP", src: "assets/hiphop-100.mp3" },
    { label: "100BPM - JAZZ", src: "assets/jazz-100.mp3" },
    { label: "120 BPM - HIP HOP", src: "assets/hiphop-120.mp3" },
    { label: "120 BPM - JAZZ", src: "assets/jazz-120.mp3" }
  ];

  const INSTRUMENTS = {
    guitar: {
      title: "MY GUITAR ROUTINE",
      storageKey: "myLessons.guitarRoutine.v2",
      sound: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 },
        { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 },
        { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 },
        { label: "E", fretLabel: "E2", midi: 40 }
      ],
      exercises: [
        { id: "g-warmup", type: "image", title: "Calentamiento", desc: "", enabled: false, image: "assets/warmup-hands.jpg" },
        {
          id: "g-5878",
          type: "tab",
          title: "5878",
          desc: "",
          enabled: false,
          tab: makeTab(["e", "B", "G", "D", "A", "E"], {
            e: "--------------------------------",
            B: "--------------------------------",
            G: "--------------------------------",
            D: "---8-7-8------------5-----------",
            A: "-----------5-8-7-8--------------",
            E: "-5----------------------8-7-8---"
          })
        },
        {
          id: "g-5868",
          type: "tab",
          title: "5868",
          desc: "",
          enabled: false,
          tab: makeTab(["e", "B", "G", "D", "A", "E"], {
            e: "--------------------------------",
            B: "--------------------------------",
            G: "--------------------------------",
            D: "---8-6-8------------5-----------",
            A: "-----------5-8-6-8--------------",
            E: "-5----------------------8-6-8---"
          })
        },
        {
          id: "g-5979",
          type: "tab",
          title: "5979",
          desc: "Independencia de dedos",
          enabled: false,
          tab: makeTab(["e", "B", "G", "D", "A", "E"], {
            e: "--------------------------------",
            B: "--------------------------------",
            G: "--------------------------------",
            D: "---9-7-9------------5-----------",
            A: "-----------5-9-7-9--------------",
            E: "-5----------------------9-7-9---"
          })
        },
        {
          id: "g-578",
          type: "tab",
          title: "578",
          desc: "Hammer On",
          enabled: false,
          tab: makeTab(["e", "B", "G", "D", "A", "E"], {
            e: "--------------------------------",
            B: "--------------------------------",
            G: "--------------------------------",
            D: "--------------------------------",
            A: "---------5h7h8-----------5h7h8--",
            E: "-5h7h8-----------5h7h8----------"
          })
        },
        {
          id: "g-1087",
          type: "tab",
          title: "1087 1086",
          desc: "Pull Off",
          enabled: false,
          tab: makeTab(["e", "B", "G", "D", "A", "E"], {
            e: "-10p8p7-------------10p8p7------",
            B: "---------10p8p6-------------10p8p6",
            G: "--------------------------------",
            D: "--------------------------------",
            A: "--------------------------------",
            E: "--------------------------------"
          })
        },
        {
          id: "g-fourths",
          type: "wheel-fourths",
          title: "Ruleta De 4tas",
          desc: "Toca en secuencia de arriba a bajo la misma nota en todas las cuerdas y luego ve a su cuarta",
          enabled: false
        },
        {
          id: "g-scales",
          type: "wheel-chords",
          title: "Escalas",
          desc: "Elige 4 acordes random y toca en secuencia su escala mayor o menor en el mastil. Usa: Escala Pentatonica Mayor y Menor - Escala CAGED Mayor y Menor",
          enabled: false
        }
      ]
    },
    bass: {
      title: "MY BASS ROUTINE",
      storageKey: "myLessons.bassRoutine.v2",
      sound: "bass",
      strings: [
        { label: "G", fretLabel: "G2", midi: 43 },
        { label: "D", fretLabel: "D2", midi: 38 },
        { label: "A", fretLabel: "A1", midi: 33 },
        { label: "E", fretLabel: "E1", midi: 28 }
      ],
      exercises: [
        { id: "b-warmup", type: "image", title: "Calentamiento", desc: "", enabled: false, image: "assets/warmup-hands.jpg" },
        {
          id: "b-2341",
          type: "tab",
          title: "2341",
          desc: "Todas las cuerdas ida y vuelta hasta el traste 12",
          enabled: false,
          tab: makeTab(["G", "D", "A", "E"], {
            G: "----------------2341-",
            D: "-----------2341------",
            A: "------2341-----------",
            E: "-2341----------------"
          })
        },
        {
          id: "b-3412",
          type: "tab",
          title: "3412",
          desc: "Todas las cuerdas ida y vuelta hasta el traste 12",
          enabled: false,
          tab: makeTab(["G", "D", "A", "E"], {
            G: "----------------3412-",
            D: "-----------3412------",
            A: "------3412-----------",
            E: "-3412----------------"
          })
        },
        {
          id: "b-arana",
          type: "tab",
          title: "ARAÑA",
          desc: "Trabaja el salto de cuerdas en mano derecha y la secuencia 1-2, y desbloquea mano izquierda",
          enabled: false,
          tab: makeTab(["G", "D", "A", "E"], {
            G: "--7-8-5-6-7-8-5-6-7-8-5-6-",
            D: "-5-6-7-8-------------------",
            A: "--------5-6-7-8------------",
            E: "----------------5-6-7-8----"
          })
        },
        {
          id: "b-octaves",
          type: "wheel-fourths",
          title: "Salto De 8vas",
          desc: "Busca esa nota y toca su octava 7 trastes adelante y dos cuerdas abajo, y dos traste alantes 2 cuerdas abajo, luego ve a la cuarta de esa tonalidad y repite",
          enabled: false
        },
        {
          id: "b-scales",
          type: "wheel-chords",
          title: "Escalas",
          desc: "Elige 4 acordes random y toca en secuencia su escala mayor o menor en el mastil. Usa: Escala CAGED Mayor y Menor",
          enabled: false
        }
      ]
    }
  };

  const appRoot = document.querySelector("[data-routine-app]");
  if (!appRoot) return;

  const instrumentKey = document.body.dataset.instrument || "guitar";
  const config = INSTRUMENTS[instrumentKey];
  const listEl = document.getElementById("exerciseList");
  const tracksEl = document.getElementById("backingTracks");
  const titleEl = document.querySelector("[data-routine-title]");
  const addButton = document.getElementById("addExercise");
  const resetButton = document.getElementById("resetRoutine");
  const editor = createEditorState();
  let state = loadState(config);
  let activeAudio = null;
  let activeTrackButton = null;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let timerRunning = false;
  let audioContext = null;

  titleEl.textContent = config.title;
  renderRoutine();
  renderTracks();
  initTimer();

  addButton.addEventListener("click", () => {
    const title = window.prompt("Titulo del nuevo ejercicio:", "Nuevo ejercicio");
    if (!title) return;
    state.exercises.push({
      id: `custom-${Date.now()}`,
      type: "tab",
      title,
      desc: "",
      enabled: false,
      tab: makeEmptyTab(config.strings.map((string) => string.label), 32)
    });
    saveState();
    renderRoutine();
  });

  resetButton.addEventListener("click", () => {
    if (!window.confirm("Esto restaura la rutina base y borra cambios guardados en este navegador. Continuar?")) return;
    window.localStorage.removeItem(config.storageKey);
    state = cloneDefault(config);
    renderRoutine();
  });

  function makeTab(labels, rows) {
    const width = Math.max(...labels.map((label) => (rows[label] || "").length), 24);
    return labels.map((label) => ({
      label,
      body: padTab(rows[label] || "", width)
    }));
  }

  function makeEmptyTab(labels, width) {
    return labels.map((label) => ({ label, body: "-".repeat(width) }));
  }

  function padTab(body, width) {
    const cleaned = String(body || "").replace(/\s/g, "-");
    return cleaned.padEnd(width, "-");
  }

  function cloneDefault(routineConfig) {
    return JSON.parse(JSON.stringify({ exercises: routineConfig.exercises }));
  }

  function loadState(routineConfig) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(routineConfig.storageKey));
      if (saved && Array.isArray(saved.exercises)) return saved;
    } catch (error) {
      console.warn("No se pudo cargar la rutina guardada", error);
    }
    return cloneDefault(routineConfig);
  }

  function saveState() {
    window.localStorage.setItem(config.storageKey, JSON.stringify(state));
  }

  function renderRoutine() {
    listEl.innerHTML = "";
    state.exercises.forEach((exercise, index) => {
      const row = document.createElement("article");
      const isWheelExercise = exercise.type === "wheel-fourths" || exercise.type === "wheel-chords";
      row.className = `exercise-row ${isWheelExercise ? "is-wheel-row" : ""}`;
      row.dataset.exerciseId = exercise.id;
      row.innerHTML = `
        <div class="exercise-number">${index + 1}</div>
        <div class="exercise-card ${isWheelExercise ? "is-wheel-card" : ""}">
          <div class="switch-wrap">
            <button class="routine-switch ${exercise.enabled ? "is-on" : ""}" type="button" aria-label="Activar ejercicio"></button>
          </div>
          <div class="exercise-copy">
            <h2 class="exercise-title" contenteditable="true" spellcheck="false">${escapeHtml(exercise.title)}</h2>
            <div class="exercise-desc" contenteditable="true" spellcheck="false">${escapeHtml(exercise.desc || "")}</div>
          </div>
          <div class="exercise-preview">${renderPreview(exercise, index)}</div>
        </div>
      `;

      row.querySelector(".routine-switch").addEventListener("click", () => {
        exercise.enabled = !exercise.enabled;
        saveState();
        renderRoutine();
      });

      row.querySelector(".exercise-title").addEventListener("blur", (event) => {
        exercise.title = event.currentTarget.textContent.trim() || "Sin titulo";
        saveState();
      });

      row.querySelector(".exercise-desc").addEventListener("blur", (event) => {
        exercise.desc = event.currentTarget.textContent.trim();
        saveState();
      });

      const editButton = row.querySelector("[data-edit-tab]");
      if (editButton) editButton.addEventListener("click", () => openEditor(index));

      const deleteButton = row.querySelector("[data-delete-exercise]");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          if (!window.confirm(`Eliminar "${exercise.title}"?`)) return;
          state.exercises.splice(index, 1);
          saveState();
          renderRoutine();
        });
      }

      listEl.appendChild(row);
    });

    setupWheels();
  }

  function renderPreview(exercise, index) {
    if (exercise.type === "image") {
      return `
        <img class="warmup-image" src="${exercise.image}" alt="Calentamiento de manos" />
        <div class="preview-actions">
          <button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button>
        </div>
      `;
    }

    if (exercise.type === "tab") {
      return `
        ${renderTabHtml(exercise.tab, "tab-preview")}
        <div class="preview-actions">
          <button class="mini-button" type="button" data-edit-tab>Editar Tab</button>
          <button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button>
        </div>
      `;
    }

    if (exercise.type === "wheel-fourths") {
      return `
        <div class="wheel-card compact" data-fourths-wheel="${index}">
          <div class="wheel-box">
            <div class="wheel-spinner"></div>
            <button class="wheel-spin" type="button">GIRAR</button>
          </div>
          <div class="wheel-result-panel">
            <div>
              <div class="wheel-result-label">Tonalidad</div>
              <div class="wheel-result-value">—</div>
            </div>
          </div>
        </div>
        <div class="preview-actions">
          <button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button>
        </div>
      `;
    }

    if (exercise.type === "wheel-chords") {
      return `
        <div class="wheel-card" data-chord-wheel="${index}">
          <div class="wheel-box">
            <div class="wheel-spinner"></div>
            <button class="wheel-spin" type="button">GIRAR</button>
          </div>
          <div class="chord-results">
            ${[1, 2, 3, 4].map((number) => `
              <div class="chord-slot">
                <div>
                  <div class="chord-title">Acorde ${number}</div>
                  <div class="chord-value">—</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="preview-actions">
          <button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button>
        </div>
      `;
    }

    return "";
  }

  function formatTab(tab) {
    return tab.map((line) => `${line.label}|${line.body}`).join("\n");
  }

  function renderTabHtml(tab, className) {
    return `
      <div class="${className}" role="img" aria-label="${escapeHtml(formatTab(tab))}">
        ${tab.map((line) => `
          <div class="tab-row">
            <span class="tab-label">${escapeHtml(line.label)}|</span>
            <span class="tab-body">${renderTabBody(line.body)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTabBody(body, cursor = -1) {
    const value = String(body || "");
    const linkedGroups = /\d+(?:[hp]\d+)+/gi;
    let html = "";
    let lastIndex = 0;
    let match;

    while ((match = linkedGroups.exec(value)) !== null) {
      html += renderPlainTabChars(value.slice(lastIndex, match.index), lastIndex, cursor);
      html += renderLinkedTabGroup(match[0], match.index, cursor);
      lastIndex = match.index + match[0].length;
    }

    html += renderPlainTabChars(value.slice(lastIndex), lastIndex, cursor);
    return html;
  }

  function renderPlainTabChars(text, offset, cursor) {
    return [...text].map((char, index) => renderTabChar(char, offset + index, cursor)).join("");
  }

  function renderLinkedTabGroup(text, offset, cursor) {
    const kind = text.toLowerCase().includes("p") ? "pull-off" : "hammer-on";
    const chars = [...text].map((char, index) => {
      const hidden = /[hp]/i.test(char) ? " is-link-letter" : "";
      return renderTabChar(char, offset + index, cursor, hidden);
    }).join("");

    return `
      <span class="tab-ligature ${kind}" aria-label="${escapeHtml(text)}">
        ${chars}
        <svg class="tab-slur" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 5 5 Q 50 18 95 5"></path>
        </svg>
      </span>
    `;
  }

  function renderTabChar(char, absoluteIndex, cursor, extraClass = "") {
    const cursorClass = absoluteIndex === cursor ? " cursor-slot" : "";
    const visible = char || "-";
    return `<span class="tab-char${cursorClass}${extraClass}">${escapeHtml(visible)}</span>`;
  }

  function setupWheels() {
    document.querySelectorAll("[data-fourths-wheel]").forEach((wheel) => {
      buildWheelLabels(wheel.querySelector(".wheel-spinner"), FOURTHS, false);
      const spinner = wheel.querySelector(".wheel-spinner");
      const button = wheel.querySelector(".wheel-spin");
      const value = wheel.querySelector(".wheel-result-value");
      let rotation = 0;
      button.addEventListener("click", () => {
        const picked = FOURTHS[randomInt(FOURTHS.length)];
        rotation += 720 + randomInt(360);
        spinner.style.transform = `rotate(${rotation}deg)`;
        value.textContent = picked;
      });
    });

    document.querySelectorAll("[data-chord-wheel]").forEach((wheel) => {
      buildWheelLabels(wheel.querySelector(".wheel-spinner"), ROOTS, true);
      const spinner = wheel.querySelector(".wheel-spinner");
      const button = wheel.querySelector(".wheel-spin");
      const slots = [...wheel.querySelectorAll(".chord-value")];
      let rotation = 0;
      button.addEventListener("click", () => {
        const chords = shuffle(ROOTS.flatMap((root) => [root, `${root}m`])).slice(0, 4);
        rotation += 720 + randomInt(360);
        spinner.style.transform = `rotate(${rotation}deg)`;
        slots.forEach((slot, index) => {
          slot.textContent = chords[index];
        });
      });
    });
  }

  function buildWheelLabels(spinner, labels, includeMinors) {
    if (spinner.dataset.ready === "true") return;
    spinner.dataset.ready = "true";
    labels.forEach((label, index) => {
      const angle = -90 + index * (360 / labels.length);
      addWheelLabel(spinner, label, angle, includeMinors ? 38 : 37, "major");
      if (includeMinors) addWheelLabel(spinner, `${label}m`, angle, 25, "minor");
    });
  }

  function addWheelLabel(parent, label, angle, radius, className) {
    const rad = angle * Math.PI / 180;
    const x = 50 + Math.cos(rad) * radius;
    const y = 50 + Math.sin(rad) * radius;
    const el = document.createElement("span");
    el.className = `wheel-label ${className || ""}`;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.textContent = label;
    parent.appendChild(el);
  }

  function renderTracks() {
    tracksEl.innerHTML = TRACKS.map((track, index) => `
      <button class="track-button" type="button" data-track="${index}">
        <span class="track-icon" aria-hidden="true"></span>
        <span>${track.label}</span>
      </button>
    `).join("");

    tracksEl.querySelectorAll("[data-track]").forEach((button) => {
      button.addEventListener("click", () => toggleTrack(Number(button.dataset.track), button));
    });
  }

  function toggleTrack(index, button) {
    if (activeAudio && activeTrackButton === button) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeTrackButton.classList.remove("is-playing");
      activeAudio = null;
      activeTrackButton = null;
      return;
    }

    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeTrackButton.classList.remove("is-playing");
    }

    activeAudio = new Audio(TRACKS[index].src);
    activeTrackButton = button;
    button.classList.add("is-playing");
    activeAudio.play().catch(() => {
      button.classList.remove("is-playing");
    });
    activeAudio.addEventListener("ended", () => {
      button.classList.remove("is-playing");
      activeAudio = null;
      activeTrackButton = null;
    });
  }

  function initTimer() {
    const timeDisplay = document.getElementById("time");
    const playBtn = document.getElementById("playTimer");
    const pauseBtn = document.getElementById("pauseTimer");

    const updateDisplay = () => {
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    playBtn.addEventListener("click", () => {
      if (timerRunning) return;
      timerRunning = true;
      playBtn.classList.add("is-inactive");
      pauseBtn.classList.remove("is-inactive");
      timerInterval = setInterval(() => {
        elapsedSeconds += 1;
        updateDisplay();
      }, 1000);
    });

    pauseBtn.addEventListener("click", () => {
      if (!timerRunning) return;
      timerRunning = false;
      window.clearInterval(timerInterval);
      timerInterval = null;
      playBtn.classList.remove("is-inactive");
      pauseBtn.classList.add("is-inactive");
    });

    updateDisplay();
  }

  function createEditorState() {
    const modal = document.getElementById("tabEditor");
    return {
      modal,
      titleInput: document.getElementById("editorTitle"),
      descInput: document.getElementById("editorDescription"),
      tabEl: document.getElementById("editorTab"),
      fretboardEl: document.getElementById("fretboard"),
      index: null,
      selectedString: 0,
      cursor: 0,
      history: []
    };
  }

  function openEditor(index) {
    editor.index = index;
    editor.selectedString = 0;
    editor.cursor = 0;
    editor.history = [];
    const exercise = state.exercises[index];
    normalizeTab(exercise);
    editor.titleInput.value = exercise.title;
    editor.descInput.value = exercise.desc || "";
    editor.modal.classList.add("is-open");
    renderEditor();
  }

  function closeEditor(save) {
    if (save && editor.index !== null) {
      const exercise = state.exercises[editor.index];
      exercise.title = editor.titleInput.value.trim() || "Sin titulo";
      exercise.desc = editor.descInput.value.trim();
      saveState();
      renderRoutine();
    }
    editor.modal.classList.remove("is-open");
    editor.index = null;
  }

  document.getElementById("closeEditor").addEventListener("click", () => closeEditor(true));
  document.getElementById("saveEditor").addEventListener("click", () => closeEditor(true));
  document.getElementById("cursorBack").addEventListener("click", () => moveCursor(-1));
  document.getElementById("cursorForward").addEventListener("click", () => moveCursor(1));
  document.getElementById("deleteNote").addEventListener("click", deleteAtCursor);
  document.getElementById("undoEdit").addEventListener("click", undoEdit);
  document.getElementById("playTab").addEventListener("click", () => {
    if (editor.index === null) return;
    playTab(state.exercises[editor.index].tab);
  });
  document.getElementById("addSpace").addEventListener("click", () => {
    if (editor.index === null) return;
    pushHistory();
    state.exercises[editor.index].tab.forEach((line) => {
      line.body += "--------";
    });
    renderEditor();
  });

  function normalizeTab(exercise) {
    if (!Array.isArray(exercise.tab)) {
      exercise.tab = makeEmptyTab(config.strings.map((string) => string.label), 32);
    }
    const width = Math.max(...exercise.tab.map((line) => line.body.length), 32);
    exercise.tab = config.strings.map((string) => {
      const existing = exercise.tab.find((line) => line.label.toLowerCase() === string.label.toLowerCase());
      return { label: string.label, body: padTab(existing?.body || "", width) };
    });
  }

  function renderEditor() {
    if (editor.index === null) return;
    const exercise = state.exercises[editor.index];
    normalizeTab(exercise);
    const width = exercise.tab[0].body.length;
    editor.cursor = Math.max(0, Math.min(editor.cursor, width - 1));
    editor.selectedString = Math.max(0, Math.min(editor.selectedString, exercise.tab.length - 1));

    editor.tabEl.innerHTML = exercise.tab.map((line, stringIndex) => {
      return `
        <div class="editor-line ${stringIndex === editor.selectedString ? "is-selected" : ""}" data-editor-string="${stringIndex}">
          <span class="tab-label">${escapeHtml(line.label)}|</span><span class="editor-line-body tab-body">${renderTabBody(line.body, editor.cursor)}</span>
        </div>
      `;
    }).join("");

    editor.tabEl.querySelectorAll("[data-editor-string]").forEach((line) => {
      line.addEventListener("click", () => {
        editor.selectedString = Number(line.dataset.editorString);
        renderEditor();
      });
    });

    renderFretboard();
  }

  function renderFretboard() {
    const frets = Array.from({ length: 13 }, (_, index) => index);
    editor.fretboardEl.innerHTML = `
      <div class="fret-head"></div>
      ${frets.map((fret) => `<div class="fret-head">${fret}</div>`).join("")}
      ${config.strings.map((string, stringIndex) => `
        <div class="string-name">${string.fretLabel}</div>
        ${frets.map((fret) => {
          const midi = string.midi + fret;
          return `
            <div class="fret-cell">
              <button class="fret-note" type="button" data-string="${stringIndex}" data-fret="${fret}" data-midi="${midi}">
                ${noteName(midi)}
              </button>
            </div>
          `;
        }).join("")}
      `).join("")}
    `;

    editor.fretboardEl.querySelectorAll(".fret-note").forEach((button) => {
      button.addEventListener("click", () => {
        const stringIndex = Number(button.dataset.string);
        const fret = Number(button.dataset.fret);
        const midi = Number(button.dataset.midi);
        insertFret(stringIndex, fret);
        playMidi(midi, config.sound);
      });
    });
  }

  function insertFret(stringIndex, fret) {
    if (editor.index === null) return;
    pushHistory();
    editor.selectedString = stringIndex;
    const exercise = state.exercises[editor.index];
    const token = String(fret);
    exercise.tab.forEach((line) => {
      if (line.body.length < editor.cursor + token.length + 1) {
        line.body = line.body.padEnd(editor.cursor + token.length + 1, "-");
      }
    });
    const line = exercise.tab[stringIndex];
    line.body = line.body.slice(0, editor.cursor) + token + line.body.slice(editor.cursor + token.length);
    editor.cursor = Math.min(editor.cursor + token.length + 1, line.body.length - 1);
    saveState();
    renderEditor();
  }

  function moveCursor(delta) {
    if (editor.index === null) return;
    const tab = state.exercises[editor.index].tab;
    const width = Math.max(...tab.map((line) => line.body.length));
    editor.cursor = Math.max(0, Math.min(width - 1, editor.cursor + delta));
    renderEditor();
  }

  function deleteAtCursor() {
    if (editor.index === null) return;
    pushHistory();
    const exercise = state.exercises[editor.index];
    const line = exercise.tab[editor.selectedString];
    line.body = line.body.slice(0, editor.cursor) + "-" + line.body.slice(editor.cursor + 1);
    saveState();
    renderEditor();
  }

  function pushHistory() {
    if (editor.index === null) return;
    editor.history.push(JSON.stringify(state.exercises[editor.index].tab));
    if (editor.history.length > 30) editor.history.shift();
  }

  function undoEdit() {
    if (editor.index === null || editor.history.length === 0) return;
    state.exercises[editor.index].tab = JSON.parse(editor.history.pop());
    saveState();
    renderEditor();
  }

  function playTab(tab) {
    const events = [];
    tab.forEach((line, stringIndex) => {
      const baseMidi = config.strings[stringIndex]?.midi;
      if (baseMidi === undefined) return;
      const regex = /\d+/g;
      let match;
      while ((match = regex.exec(line.body)) !== null) {
        events.push({
          column: match.index,
          midi: baseMidi + Number(match[0])
        });
      }
    });
    events.sort((a, b) => a.column - b.column);
    events.forEach((event, index) => {
      window.setTimeout(() => playMidi(event.midi, config.sound), index * 155);
    });
  }

  function playMidi(midi, sound) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = sound === "bass" ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(frequency, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(sound === "bass" ? 780 : 1850, now);
    filter.Q.setValueAtTime(sound === "bass" ? 0.8 : 0.45, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound === "bass" ? 0.24 : 0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (sound === "bass" ? 0.46 : 0.34));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  function noteName(midi) {
    return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function randomInt(max) {
    return Math.floor(randomFloat() * max);
  }

  function randomFloat() {
    if (window.crypto?.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
