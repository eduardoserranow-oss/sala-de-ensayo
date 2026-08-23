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
    { label: "120BPM - JAZZ", src: "assets/jazz-120.mp3" }
  ];

  const OWNER_EMAIL = "eduardoserranow@gmail.com";
  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const EDITOR_SETTINGS_KEY = "myLessons.tabEditorSettings.v2";
  const TUTORIAL_SEEN_KEY = "myLessons.tabTutorialSeen.v2";

  const EDITOR_INSTRUMENTS = {
    guitar6: {
      label: "Guitar",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 },
        { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 },
        { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 },
        { label: "E", fretLabel: "E2", midi: 40 }
      ]
    },
    guitar7: {
      label: "Guitar (7-string)",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 }, { label: "E", fretLabel: "E2", midi: 40 },
        { label: "B", fretLabel: "B1", midi: 35 }
      ]
    },
    guitar8: {
      label: "Guitar (8-string)",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 }, { label: "E", fretLabel: "E2", midi: 40 },
        { label: "B", fretLabel: "B1", midi: 35 }, { label: "F#", fretLabel: "F#1", midi: 30 }
      ]
    },
    bass4: {
      label: "Bass (4-string)",
      group: "bass",
      strings: [
        { label: "G", fretLabel: "G2", midi: 43 },
        { label: "D", fretLabel: "D2", midi: 38 },
        { label: "A", fretLabel: "A1", midi: 33 },
        { label: "E", fretLabel: "E1", midi: 28 }
      ]
    },
    bass5: {
      label: "Bass (5-string)",
      group: "bass",
      strings: [
        { label: "G", fretLabel: "G2", midi: 43 }, { label: "D", fretLabel: "D2", midi: 38 },
        { label: "A", fretLabel: "A1", midi: 33 }, { label: "E", fretLabel: "E1", midi: 28 },
        { label: "B", fretLabel: "B0", midi: 23 }
      ]
    },
    bass6: {
      label: "Bass (6-string)",
      group: "bass",
      strings: [
        { label: "C", fretLabel: "C3", midi: 48 }, { label: "G", fretLabel: "G2", midi: 43 },
        { label: "D", fretLabel: "D2", midi: 38 }, { label: "A", fretLabel: "A1", midi: 33 },
        { label: "E", fretLabel: "E1", midi: 28 }, { label: "B", fretLabel: "B0", midi: 23 }
      ]
    },
    banjo5: {
      label: "Banjo (5-string)",
      group: "other",
      strings: [
        { label: "D", fretLabel: "D4", midi: 62 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "g", fretLabel: "G4", midi: 67 }
      ]
    },
    ukulele4: {
      label: "Ukulele",
      group: "other",
      strings: [
        { label: "A", fretLabel: "A4", midi: 69 }, { label: "E", fretLabel: "E4", midi: 64 },
        { label: "C", fretLabel: "C4", midi: 60 }, { label: "G", fretLabel: "G4", midi: 67 }
      ]
    },
    mandolin4: {
      label: "Mandolin",
      group: "other",
      strings: [
        { label: "E", fretLabel: "E5", midi: 76 }, { label: "A", fretLabel: "A4", midi: 69 },
        { label: "D", fretLabel: "D4", midi: 62 }, { label: "G", fretLabel: "G3", midi: 55 }
      ]
    },
    charango5: {
      label: "Charango",
      group: "other",
      strings: [
        { label: "E", fretLabel: "E5", midi: 76 }, { label: "A", fretLabel: "A4", midi: 69 },
        { label: "E", fretLabel: "E5", midi: 76 }, { label: "C", fretLabel: "C5", midi: 72 },
        { label: "G", fretLabel: "G4", midi: 67 }
      ]
    },
    guitar5: {
      label: "Guitar (5-string)",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 }
      ]
    },
    guitar9: {
      label: "Guitar (9-string)",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 }, { label: "E", fretLabel: "E2", midi: 40 },
        { label: "B", fretLabel: "B1", midi: 35 }, { label: "F#", fretLabel: "F#1", midi: 30 },
        { label: "C#", fretLabel: "C#1", midi: 25 }
      ]
    },
    guitar10: {
      label: "Guitar (10-string)",
      group: "guitar",
      strings: [
        { label: "e", fretLabel: "E4", midi: 64 }, { label: "B", fretLabel: "B3", midi: 59 },
        { label: "G", fretLabel: "G3", midi: 55 }, { label: "D", fretLabel: "D3", midi: 50 },
        { label: "A", fretLabel: "A2", midi: 45 }, { label: "E", fretLabel: "E2", midi: 40 },
        { label: "B", fretLabel: "B1", midi: 35 }, { label: "F#", fretLabel: "F#1", midi: 30 },
        { label: "C#", fretLabel: "C#1", midi: 25 }, { label: "G#", fretLabel: "G#0", midi: 20 }
      ]
    }
  };

  const PLAYBACK_OPTIONS = {
    guitar: [
      ["acoustic", "Acoustic guitar"], ["fingerstyle", "Acoustic guitar (fingerstyle)"],
      ["electric", "Electric guitar"], ["jazz", "Electric guitar (jazz)"],
      ["lespaul", "Electric guitar (Les Paul)"], ["muted", "Electric guitar (muted)"]
    ],
    bass: [["bass1", "Bass"], ["bass2", "Bass 2"], ["bass3", "Bass 3"]],
    other: [["pluck", "Natural pluck"], ["bright", "Bright pluck"]]
  };

  const PAGE_CONFIG = {
    guitar: {
      title: "MY GUITAR ROUTINE",
      storageKey: "myLessons.guitarRoutine.v2",
      defaultProfile: "guitar6",
      exercises: [
        { id: "g-warmup", type: "image", title: "Calentamiento", desc: "", enabled: false, image: "assets/warmup-hands.jpg" },
        { id: "g-5878", type: "tab", title: "5878", desc: "", enabled: false, tab: makeTab(["e", "B", "G", "D", "A", "E"], { e: "--------------------------------", B: "--------------------------------", G: "--------------------------------", D: "---8-7-8------------5-----------", A: "-----------5-8-7-8--------------", E: "-5----------------------8-7-8---" }) },
        { id: "g-5868", type: "tab", title: "5868", desc: "", enabled: false, tab: makeTab(["e", "B", "G", "D", "A", "E"], { e: "--------------------------------", B: "--------------------------------", G: "--------------------------------", D: "---8-6-8------------5-----------", A: "-----------5-8-6-8--------------", E: "-5----------------------8-6-8---" }) },
        { id: "g-5979", type: "tab", title: "5979", desc: "Independencia de dedos", enabled: false, tab: makeTab(["e", "B", "G", "D", "A", "E"], { e: "--------------------------------", B: "--------------------------------", G: "--------------------------------", D: "---9-7-9------------5-----------", A: "-----------5-9-7-9--------------", E: "-5----------------------9-7-9---" }) },
        { id: "g-578", type: "tab", title: "578", desc: "Hammer On", enabled: false, tab: makeTab(["e", "B", "G", "D", "A", "E"], { e: "--------------------------------", B: "--------------------------------", G: "--------------------------------", D: "--------------------------------", A: "---------5h7h8-----------5h7h8--", E: "-5h7h8-----------5h7h8----------" }) },
        { id: "g-1087", type: "tab", title: "1087 1086", desc: "Pull Off", enabled: false, tab: makeTab(["e", "B", "G", "D", "A", "E"], { e: "-10p8p7-------------10p8p7------", B: "---------10p8p6-------------10p8p6", G: "--------------------------------", D: "--------------------------------", A: "--------------------------------", E: "--------------------------------" }) },
        { id: "g-fourths", type: "wheel-fourths", title: "Ruleta De 4tas", desc: "Toca en secuencia de arriba a bajo la misma nota en todas las cuerdas y luego ve a su cuarta", enabled: false },
        { id: "g-scales", type: "wheel-chords", title: "Escalas", desc: "Elige 4 acordes random y toca en secuencia su escala mayor o menor en el mastil. Usa: Escala Pentatonica Mayor y Menor - Escala CAGED Mayor y Menor", enabled: false }
      ]
    },
    bass: {
      title: "MY BASS ROUTINE",
      storageKey: "myLessons.bassRoutine.v2",
      defaultProfile: "bass4",
      exercises: [
        { id: "b-warmup", type: "image", title: "Calentamiento", desc: "", enabled: false, image: "assets/warmup-hands.jpg" },
        { id: "b-2341", type: "tab", title: "2341", desc: "Todas las cuerdas ida y vuelta hasta el traste 12", enabled: false, tab: makeTab(["G", "D", "A", "E"], { G: "----------------2341-", D: "-----------2341------", A: "------2341-----------", E: "-2341----------------" }) },
        { id: "b-3412", type: "tab", title: "3412", desc: "Todas las cuerdas ida y vuelta hasta el traste 12", enabled: false, tab: makeTab(["G", "D", "A", "E"], { G: "----------------3412-", D: "-----------3412------", A: "------3412-----------", E: "-3412----------------" }) },
        { id: "b-arana", type: "tab", title: "ARAÑA", desc: "Trabaja el salto de cuerdas en mano derecha y la secuencia 1-2, y desbloquea mano izquierda", enabled: false, tab: makeTab(["G", "D", "A", "E"], { G: "--7-8-5-6-7-8-5-6-7-8-5-6-", D: "-5-6-7-8-------------------", A: "--------5-6-7-8------------", E: "----------------5-6-7-8----" }) },
        { id: "b-octaves", type: "wheel-fourths", title: "Salto De 8vas", desc: "Busca esa nota y toca su octava 7 trastes adelante y dos cuerdas abajo, y dos traste alantes 2 cuerdas abajo, luego ve a la cuarta de esa tonalidad y repite", enabled: false },
        { id: "b-scales", type: "wheel-chords", title: "Escalas", desc: "Elige 4 acordes random y toca en secuencia su escala mayor o menor en el mastil. Usa: Escala CAGED Mayor y Menor", enabled: false }
      ]
    }
  };

  const appRoot = document.querySelector("[data-routine-app]");
  if (!appRoot) return;

  const pageKey = document.body.dataset.instrument || "guitar";
  const config = PAGE_CONFIG[pageKey] || PAGE_CONFIG.guitar;
  const listEl = document.getElementById("exerciseList");
  const tracksEl = document.getElementById("backingTracks");
  const titleEl = document.querySelector("[data-routine-title]");
  const addButton = document.getElementById("addExercise");
  const resetButton = document.getElementById("resetRoutine");
  const editor = createEditorState();

  let state = { exercises: [] };
  let currentUser = null;
  let cloudReady = false;
  let activeAudio = null;
  let activeTrackButton = null;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let timerRunning = false;
  let audioContext = null;
  let editorSettings = loadEditorSettings();
  let settingsTab = "general";
  let tutorialStep = 0;

  titleEl.textContent = config.title;
  initEditorChrome();
  initEditorEvents();
  initTimer();
  initRoutineEvents();
  bootAuth();

  function initRoutineEvents() {
    addButton.addEventListener("click", addExercise);
    resetButton.addEventListener("click", () => {
      const message = isOwnerUser()
        ? "Esto restaura tu rutina base y borra tus cambios guardados en este dispositivo. Continuar?"
        : "Esto vacia tu rutina guardada en este dispositivo. Continuar?";
      if (!window.confirm(message)) return;
      state = getBaseStateForCurrentUser();
      saveState();
      renderRoutine();
    });
  }

  async function bootAuth() {
    document.body.classList.add("is-guest");
    const session = getLocalSession();
    currentUser = session?.user || null;
    if (!currentUser) {
      redirectToLogin();
      return;
    }
    loadLocalRoutine();
  }

  function loadLocalRoutine() {
    cloudReady = false;
    setAuthView(true);
    state = getCachedStateForCurrentUser() || getBaseStateForCurrentUser();
    ensureExerciseMetadata();
    cacheStateForCurrentUser();
    cloudReady = true;
    renderRoutine();
    renderTracks();
    setSaveStatus("Guardado en este dispositivo");
  }

  function ensureExerciseMetadata() {
    if (!Array.isArray(state.exercises)) state.exercises = [];
    state.exercises.forEach((exercise) => {
      if (exercise.type !== "tab") return;
      if (!EDITOR_INSTRUMENTS[exercise.instrumentProfile]) exercise.instrumentProfile = config.defaultProfile;
      if (!exercise.playbackInstrument) exercise.playbackInstrument = defaultPlaybackForProfile(exercise.instrumentProfile);
      normalizeTab(exercise);
    });
  }

  function setSaveStatus(message) {
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = message;
  }

  function redirectToLogin() {
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "createacct2");
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    loginUrl.searchParams.set("returnTo", currentPath);
    window.location.replace(loginUrl.href);
  }

  function setAuthView(isLoggedIn) {
    document.body.classList.toggle("is-guest", !isLoggedIn);
    document.body.classList.toggle("is-authenticated", isLoggedIn);
    addButton.disabled = !isLoggedIn;
    resetButton.disabled = !isLoggedIn;
    resetButton.textContent = isOwnerUser() ? "Restaurar base" : "Vaciar rutina";
  }

  function addExercise() {
    if (!currentUser) return;
    const title = window.prompt("Titulo del nuevo ejercicio:", "Nuevo ejercicio");
    if (!title) return;
    const profileId = config.defaultProfile;
    state.exercises.push({
      id: `custom-${Date.now()}`,
      type: "tab",
      title,
      desc: "",
      enabled: false,
      instrumentProfile: profileId,
      playbackInstrument: defaultPlaybackForProfile(profileId),
      tab: makeEmptyTab(EDITOR_INSTRUMENTS[profileId].strings.map((string) => string.label), 32)
    });
    saveState();
    renderRoutine();
  }

  function makeTab(labels, rows) {
    const width = Math.max(...labels.map((label) => (rows[label] || "").length), 24);
    return labels.map((label) => ({ label, body: padTab(rows[label] || "", width) }));
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

  function getLocalSession() {
    try {
      return JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY)) || JSON.parse(window.sessionStorage.getItem(LOCAL_SESSION_KEY));
    } catch (error) {
      return null;
    }
  }

  function getBaseStateForCurrentUser() {
    if (!isOwnerUser()) return { exercises: [] };
    return loadLegacyLocalState(config) || cloneDefault(config);
  }

  function isOwnerUser() {
    return (currentUser?.email || "").toLowerCase() === OWNER_EMAIL;
  }

  function getUserStorageKey() {
    return `${config.storageKey}.${currentUser?.id || "guest"}`;
  }

  function cacheStateForCurrentUser() {
    if (!currentUser) return;
    try {
      window.localStorage.setItem(getUserStorageKey(), JSON.stringify(state));
    } catch (error) {
      console.warn("No se pudo guardar copia local", error);
    }
  }

  function getCachedStateForCurrentUser() {
    if (!currentUser) return null;
    try {
      const saved = JSON.parse(window.localStorage.getItem(getUserStorageKey()));
      if (saved && Array.isArray(saved.exercises)) return saved;
    } catch (error) {
      console.warn("No se pudo cargar copia local", error);
    }
    return null;
  }

  function loadLegacyLocalState(routineConfig) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(routineConfig.storageKey));
      if (saved && Array.isArray(saved.exercises)) return saved;
    } catch (error) {
      console.warn("No se pudo cargar la rutina guardada", error);
    }
    return null;
  }

  function saveState() {
    cacheStateForCurrentUser();
    if (cloudReady && currentUser) setSaveStatus("Guardado en este dispositivo");
  }

  function renderRoutine() {
    listEl.innerHTML = "";
    if (!currentUser) return;
    if (!Array.isArray(state.exercises)) state.exercises = [];

    if (state.exercises.length === 0) {
      listEl.innerHTML = `<div class="empty-routine"><h2>Tu rutina esta vacia</h2><p>Crea tu primer ejercicio y se guardara en este dispositivo.</p><button type="button" id="createFirstExercise">Crear rutina</button></div>`;
      document.getElementById("createFirstExercise").addEventListener("click", addExercise);
      return;
    }

    state.exercises.forEach((exercise, index) => {
      const row = document.createElement("article");
      const isWheelExercise = exercise.type === "wheel-fourths" || exercise.type === "wheel-chords";
      row.className = `exercise-row ${isWheelExercise ? "is-wheel-row" : ""}`;
      row.dataset.exerciseId = exercise.id;
      row.innerHTML = `
        <div class="exercise-number">${index + 1}</div>
        <div class="exercise-card ${isWheelExercise ? "is-wheel-card" : ""}">
          <div class="switch-wrap"><button class="routine-switch ${exercise.enabled ? "is-on" : ""}" type="button" aria-label="Activar ejercicio"></button></div>
          <div class="exercise-copy"><h2 class="exercise-title" contenteditable="true" spellcheck="false">${escapeHtml(exercise.title)}</h2><div class="exercise-desc" contenteditable="true" spellcheck="false">${escapeHtml(exercise.desc || "")}</div></div>
          <div class="exercise-preview">${renderPreview(exercise, index)}</div>
        </div>`;

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
      if (deleteButton) deleteButton.addEventListener("click", () => {
        if (!window.confirm(`Eliminar "${exercise.title}"?`)) return;
        state.exercises.splice(index, 1);
        saveState();
        renderRoutine();
      });
      listEl.appendChild(row);
    });
    setupWheels();
  }

  function renderPreview(exercise, index) {
    if (exercise.type === "image") {
      return `<img class="warmup-image" src="${exercise.image}" alt="Calentamiento de manos" /><div class="preview-actions"><button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button></div>`;
    }
    if (exercise.type === "tab") {
      return `<pre class="tab-preview">${escapeHtml(formatTab(exercise.tab))}</pre><div class="preview-actions"><button class="mini-button" type="button" data-edit-tab>Editar Tab</button><button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button></div>`;
    }
    if (exercise.type === "wheel-fourths") {
      return `<div class="wheel-card compact" data-fourths-wheel="${index}"><div class="wheel-box"><div class="wheel-spinner"></div><button class="wheel-spin" type="button">GIRAR</button></div><div class="wheel-result-panel"><div><div class="wheel-result-label">Tonalidad</div><div class="wheel-result-value">—</div></div></div></div><div class="preview-actions"><button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button></div>`;
    }
    if (exercise.type === "wheel-chords") {
      return `<div class="wheel-card" data-chord-wheel="${index}"><div class="wheel-box"><div class="wheel-spinner"></div><button class="wheel-spin" type="button">GIRAR</button></div><div class="chord-results">${[1, 2, 3, 4].map((number) => `<div class="chord-slot"><div><div class="chord-title">Acorde ${number}</div><div class="chord-value">—</div></div></div>`).join("")}</div></div><div class="preview-actions"><button class="mini-button danger" type="button" data-delete-exercise>Eliminar</button></div>`;
    }
    return "";
  }

  function formatTab(tab) {
    return (tab || []).map((line) => `${line.label}|${line.body}`).join("\n");
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
        slots.forEach((slot, slotIndex) => { slot.textContent = chords[slotIndex]; });
      });
    });
  }

  function buildWheelLabels(spinner, labels, includeMinors) {
    if (!spinner || spinner.dataset.ready === "true") return;
    spinner.dataset.ready = "true";
    labels.forEach((label, index) => {
      const angle = -90 + index * (360 / labels.length);
      addWheelLabel(spinner, label, angle, includeMinors ? 38 : 37, "major");
      if (includeMinors) addWheelLabel(spinner, `${label}m`, angle, 25, "minor");
    });
  }

  function addWheelLabel(parent, label, angle, radius, className) {
    const rad = angle * Math.PI / 180;
    const el = document.createElement("span");
    el.className = `wheel-label ${className || ""}`;
    el.style.left = `${50 + Math.cos(rad) * radius}%`;
    el.style.top = `${50 + Math.sin(rad) * radius}%`;
    el.textContent = label;
    parent.appendChild(el);
  }

  function renderTracks() {
    tracksEl.innerHTML = TRACKS.map((track, index) => `<button class="track-button" type="button" data-track="${index}"><span class="track-icon" aria-hidden="true"></span><span>${track.label}</span></button>`).join("");
    tracksEl.querySelectorAll("[data-track]").forEach((button) => button.addEventListener("click", () => toggleTrack(Number(button.dataset.track), button)));
  }

  function toggleTrack(index, button) {
    if (activeAudio && activeTrackButton === button) {
      activeAudio.pause(); activeAudio.currentTime = 0; activeTrackButton.classList.remove("is-playing"); activeAudio = null; activeTrackButton = null; return;
    }
    if (activeAudio) {
      activeAudio.pause(); activeAudio.currentTime = 0; activeTrackButton.classList.remove("is-playing");
    }
    activeAudio = new Audio(TRACKS[index].src);
    activeTrackButton = button;
    button.classList.add("is-playing");
    activeAudio.play().catch(() => button.classList.remove("is-playing"));
    activeAudio.addEventListener("ended", () => { button.classList.remove("is-playing"); activeAudio = null; activeTrackButton = null; });
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
      timerRunning = true; playBtn.classList.add("is-inactive"); pauseBtn.classList.remove("is-inactive");
      timerInterval = setInterval(() => { elapsedSeconds += 1; updateDisplay(); }, 1000);
    });
    pauseBtn.addEventListener("click", () => {
      if (!timerRunning) return;
      timerRunning = false; window.clearInterval(timerInterval); timerInterval = null; playBtn.classList.remove("is-inactive"); pauseBtn.classList.add("is-inactive");
    });
    updateDisplay();
  }

  function createEditorState() {
    return {
      modal: document.getElementById("tabEditor"),
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

  function initEditorChrome() {
    const topbar = editor.modal.querySelector(".editor-topbar");
    const closeButton = document.getElementById("closeEditor");
    const menuButton = document.createElement("button");
    menuButton.id = "editorMenuButton";
    menuButton.className = "editor-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Menu del editor");
    menuButton.textContent = "☰";
    topbar.insertBefore(menuButton, closeButton);

    editor.modal.insertAdjacentHTML("beforeend", `
      <div class="editor-popover-backdrop" id="editorMenuBackdrop" hidden>
        <div class="editor-menu-card" role="dialog" aria-label="Menu">
          <div class="editor-menu-head"><strong>Menu</strong><button type="button" data-close-menu>×</button></div>
          <button type="button" class="editor-menu-item" data-open-tutorial>▤ <span>Tutorial</span></button>
          <button type="button" class="editor-menu-item" data-open-settings>⚙ <span>Settings</span></button>
        </div>
      </div>
      <div class="editor-popover-backdrop" id="editorSettingsBackdrop" hidden>
        <div class="editor-settings-card" role="dialog" aria-label="Settings">
          <div class="editor-settings-tabs">
            <button type="button" data-settings-tab="general" class="is-active">⚙ General</button>
            <button type="button" data-settings-tab="instruments">♫ Instruments</button>
          </div>
          <div class="editor-settings-head"><strong id="settingsHeading">General Settings</strong><button type="button" data-close-settings>×</button></div>
          <div id="settingsBody"></div>
        </div>
      </div>
      <div class="editor-popover-backdrop tutorial-backdrop" id="editorTutorialBackdrop" hidden>
        <div class="tutorial-card" role="dialog" aria-label="Tutorial">
          <button class="tutorial-x" type="button" data-close-tutorial>×</button>
          <div class="tutorial-step-count" id="tutorialStepCount"></div>
          <h2 id="tutorialTitle"></h2>
          <p id="tutorialText"></p>
          <div class="tutorial-visual" id="tutorialVisual"></div>
          <div class="tutorial-footer"><span id="tutorialProgress"></span><button type="button" id="tutorialNext">Next</button></div>
        </div>
      </div>`);
    applyEditorTheme();
  }

  function initEditorEvents() {
    document.getElementById("closeEditor").addEventListener("click", () => closeEditor(true));
    document.getElementById("saveEditor").addEventListener("click", () => closeEditor(true));
    document.getElementById("cursorBack").addEventListener("click", () => moveCursor(-1));
    document.getElementById("cursorForward").addEventListener("click", () => moveCursor(1));
    document.getElementById("deleteNote").addEventListener("click", deleteAtCursor);
    document.getElementById("undoEdit").addEventListener("click", undoEdit);
    document.getElementById("playTab").addEventListener("click", () => {
      if (editor.index === null) return;
      if (editorSettings.singleColumnPlayback) playColumn(editor.cursor);
      else playTab(getActiveExercise().tab);
    });
    document.getElementById("addSpace").addEventListener("click", () => {
      if (editor.index === null) return;
      pushHistory();
      getActiveExercise().tab.forEach((line) => { line.body += "--------"; });
      saveState();
      renderEditor();
    });
    document.getElementById("editorMenuButton").addEventListener("click", openEditorMenu);

    editor.fretboardEl.addEventListener("pointerdown", (event) => {
      const button = event.target.closest(".fret-note");
      if (!button || editor.index === null) return;
      event.preventDefault();
      event.stopPropagation();
      const stringIndex = Number(button.dataset.string);
      const fret = Number(button.dataset.fret);
      const midi = Number(button.dataset.midi);
      warmAudioContext();
      insertFret(stringIndex, fret);
      playPluckedMidi(midi, getActiveExercise().playbackInstrument);
    }, { passive: false });

    editor.fretboardEl.addEventListener("pointerover", (event) => {
      if (!editorSettings.chordPreviewOnHover || event.pointerType === "touch") return;
      const button = event.target.closest(".fret-note");
      if (!button || !isGuitarProfile(getActiveExercise()?.instrumentProfile)) return;
      const hoveredMidi = Number(button.dataset.midi);
      const chord = getColumnMidis(editor.cursor).filter((midi) => midi !== hoveredMidi);
      [hoveredMidi, ...chord].slice(0, 6).forEach((midi) => playPluckedMidi(midi, getActiveExercise().playbackInstrument));
    });

    editor.tabEl.addEventListener("pointerdown", (event) => {
      const line = event.target.closest("[data-editor-string]");
      if (!line || editor.index === null) return;
      event.preventDefault();
      editor.selectedString = Number(line.dataset.editorString);
      const bodyEl = line.querySelector(".editor-line-body");
      const rect = bodyEl.getBoundingClientRect();
      const body = getActiveExercise().tab[editor.selectedString].body;
      const charWidth = rect.width / Math.max(body.length, 1);
      editor.cursor = clamp(Math.floor((event.clientX - rect.left) / Math.max(charWidth, 1)), 0, Math.max(body.length - 1, 0));
      renderEditor();
      if (editorSettings.singleColumnPlayback) playColumn(editor.cursor);
    }, { passive: false });

    const menuBackdrop = document.getElementById("editorMenuBackdrop");
    menuBackdrop.addEventListener("click", (event) => {
      if (event.target === menuBackdrop || event.target.closest("[data-close-menu]")) closeEditorMenu();
      if (event.target.closest("[data-open-tutorial]")) { closeEditorMenu(); startTutorial(); }
      if (event.target.closest("[data-open-settings]")) { closeEditorMenu(); openSettings(); }
    });

    const settingsBackdrop = document.getElementById("editorSettingsBackdrop");
    settingsBackdrop.addEventListener("click", (event) => {
      if (event.target === settingsBackdrop || event.target.closest("[data-close-settings]")) closeSettings();
      const tabButton = event.target.closest("[data-settings-tab]");
      if (tabButton) { settingsTab = tabButton.dataset.settingsTab; renderSettings(); }
    });
    settingsBackdrop.addEventListener("change", handleSettingsChange);

    const tutorialBackdrop = document.getElementById("editorTutorialBackdrop");
    tutorialBackdrop.addEventListener("click", (event) => {
      if (event.target === tutorialBackdrop || event.target.closest("[data-close-tutorial]")) finishTutorial();
    });
    document.getElementById("tutorialNext").addEventListener("click", nextTutorialStep);
  }

  function openEditor(index) {
    editor.index = index;
    editor.selectedString = 0;
    editor.cursor = 0;
    editor.history = [];
    const exercise = getActiveExercise();
    if (!EDITOR_INSTRUMENTS[exercise.instrumentProfile]) exercise.instrumentProfile = config.defaultProfile;
    if (!exercise.playbackInstrument) exercise.playbackInstrument = defaultPlaybackForProfile(exercise.instrumentProfile);
    normalizeTab(exercise);
    editor.titleInput.value = exercise.title;
    editor.descInput.value = exercise.desc || "";
    editor.modal.classList.add("is-open");
    applyEditorTheme();
    renderEditor();
    warmAudioContext();
    if (!window.localStorage.getItem(TUTORIAL_SEEN_KEY)) window.setTimeout(startTutorial, 180);
  }

  function closeEditor(save) {
    if (save && editor.index !== null) {
      const exercise = getActiveExercise();
      exercise.title = editor.titleInput.value.trim() || "Sin titulo";
      exercise.desc = editor.descInput.value.trim();
      saveState();
      renderRoutine();
    }
    closeEditorMenu();
    closeSettings();
    document.getElementById("editorTutorialBackdrop").hidden = true;
    editor.modal.classList.remove("is-open");
    editor.index = null;
  }

  function getActiveExercise() {
    return editor.index === null ? null : state.exercises[editor.index];
  }

  function getActiveProfile() {
    const exercise = getActiveExercise();
    return EDITOR_INSTRUMENTS[exercise?.instrumentProfile] || EDITOR_INSTRUMENTS[config.defaultProfile];
  }

  function normalizeTab(exercise) {
    const profile = EDITOR_INSTRUMENTS[exercise.instrumentProfile] || EDITOR_INSTRUMENTS[config.defaultProfile];
    if (!Array.isArray(exercise.tab)) exercise.tab = makeEmptyTab(profile.strings.map((string) => string.label), 32);
    const width = Math.max(32, ...exercise.tab.map((line) => String(line?.body || "").length));
    if (exercise.tab.length === profile.strings.length) {
      exercise.tab = profile.strings.map((string, index) => ({ label: string.label, body: padTab(exercise.tab[index]?.body || "", width) }));
      return;
    }
    const byLabel = new Map();
    exercise.tab.forEach((line) => {
      const key = String(line.label || "");
      if (!byLabel.has(key)) byLabel.set(key, []);
      byLabel.get(key).push(line.body || "");
    });
    exercise.tab = profile.strings.map((string) => {
      const pool = byLabel.get(string.label);
      return { label: string.label, body: padTab(pool?.shift() || "", width) };
    });
  }

  function changeInstrumentProfile(newProfileId) {
    const exercise = getActiveExercise();
    if (!exercise || !EDITOR_INSTRUMENTS[newProfileId]) return;
    const oldProfileId = exercise.instrumentProfile || config.defaultProfile;
    if (oldProfileId === newProfileId) return;
    pushHistory();
    convertTabBetweenProfiles(exercise, oldProfileId, newProfileId);
    exercise.instrumentProfile = newProfileId;
    const allowed = PLAYBACK_OPTIONS[EDITOR_INSTRUMENTS[newProfileId].group].map(([value]) => value);
    if (!allowed.includes(exercise.playbackInstrument)) exercise.playbackInstrument = defaultPlaybackForProfile(newProfileId);
    editor.selectedString = 0;
    editor.cursor = 0;
    saveState();
    renderEditor();
    renderSettings();
  }

  function convertTabBetweenProfiles(exercise, oldProfileId, newProfileId) {
    const oldProfile = EDITOR_INSTRUMENTS[oldProfileId] || EDITOR_INSTRUMENTS[config.defaultProfile];
    const newProfile = EDITOR_INSTRUMENTS[newProfileId];
    const oldTab = Array.isArray(exercise.tab) ? exercise.tab : [];
    const width = Math.max(32, ...oldTab.map((line) => String(line?.body || "").length));
    const byMidi = new Map();
    oldProfile.strings.forEach((string, index) => {
      if (!byMidi.has(string.midi)) byMidi.set(string.midi, []);
      byMidi.get(string.midi).push(oldTab[index]?.body || "");
    });
    exercise.tab = newProfile.strings.map((string) => {
      const pool = byMidi.get(string.midi);
      return { label: string.label, body: padTab(pool?.shift() || "", width) };
    });
  }

  function renderEditor() {
    if (editor.index === null) return;
    const exercise = getActiveExercise();
    normalizeTab(exercise);
    const width = Math.max(...exercise.tab.map((line) => line.body.length), 1);
    editor.cursor = clamp(editor.cursor, 0, width - 1);
    editor.selectedString = clamp(editor.selectedString, 0, exercise.tab.length - 1);
    editor.tabEl.innerHTML = exercise.tab.map((line, stringIndex) => {
      const body = line.body;
      const before = escapeHtml(body.slice(0, editor.cursor));
      const char = escapeHtml(body[editor.cursor] || "-");
      const after = escapeHtml(body.slice(editor.cursor + 1));
      return `<div class="editor-line ${stringIndex === editor.selectedString ? "is-selected" : ""}" data-editor-string="${stringIndex}"><span>${escapeHtml(line.label)}|</span><span class="editor-line-body">${before}<span class="cursor-slot">${char}</span>${after}</span></div>`;
    }).join("");
    renderFretboard();
  }

  function renderFretboard() {
    const profile = getActiveProfile();
    const frets = Array.from({ length: 13 }, (_, index) => index);
    const heat = editorSettings.fretboardHeatmap ? calculateHeatmap() : new Map();
    editor.fretboardEl.innerHTML = `
      <div class="fret-head"></div>${frets.map((fret) => `<div class="fret-head">${fret}</div>`).join("")}
      ${profile.strings.map((string, stringIndex) => `
        <div class="string-name">${string.fretLabel}</div>
        ${frets.map((fret) => {
          const midi = string.midi + fret;
          const heatValue = heat.get(`${stringIndex}:${fret}`) || 0;
          return `<div class="fret-cell ${heatValue ? "has-heat" : ""}" style="--heat:${Math.min(1, 0.22 + heatValue * 0.18)}"><button class="fret-note" type="button" data-string="${stringIndex}" data-fret="${fret}" data-midi="${midi}">${noteName(midi)}</button></div>`;
        }).join("")}`).join("")}`;
  }

  function calculateHeatmap() {
    const map = new Map();
    const exercise = getActiveExercise();
    if (!exercise) return map;
    exercise.tab.forEach((line, stringIndex) => {
      const regex = /\d+/g;
      let match;
      while ((match = regex.exec(line.body)) !== null) {
        const fret = Number(match[0]);
        if (fret < 0 || fret > 12) continue;
        const key = `${stringIndex}:${fret}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }

  function insertFret(stringIndex, fret) {
    if (editor.index === null) return;
    pushHistory();
    const exercise = getActiveExercise();
    const token = String(fret);
    editor.selectedString = stringIndex;
    const required = editor.cursor + token.length + 2;
    exercise.tab.forEach((line) => { if (line.body.length < required) line.body = line.body.padEnd(required, "-"); });
    const line = exercise.tab[stringIndex];
    line.body = line.body.slice(0, editor.cursor) + token + line.body.slice(editor.cursor + token.length);
    const separatorIndex = editor.cursor + token.length;
    if (line.body[separatorIndex] !== "-") line.body = line.body.slice(0, separatorIndex) + "-" + line.body.slice(separatorIndex + 1);
    editor.cursor = clamp(editor.cursor + token.length + 1, 0, line.body.length - 1);
    saveState();
    renderEditor();
  }

  function moveCursor(delta) {
    if (editor.index === null) return;
    const width = Math.max(...getActiveExercise().tab.map((line) => line.body.length));
    editor.cursor = clamp(editor.cursor + delta, 0, width - 1);
    renderEditor();
  }

  function deleteAtCursor() {
    if (editor.index === null) return;
    pushHistory();
    const line = getActiveExercise().tab[editor.selectedString];
    let start = editor.cursor;
    let end = editor.cursor + 1;
    if (/\d/.test(line.body[editor.cursor] || "")) {
      while (start > 0 && /\d/.test(line.body[start - 1])) start -= 1;
      while (end < line.body.length && /\d/.test(line.body[end])) end += 1;
    }
    line.body = line.body.slice(0, start) + "-".repeat(Math.max(1, end - start)) + line.body.slice(end);
    editor.cursor = start;
    saveState();
    renderEditor();
  }

  function pushHistory() {
    if (editor.index === null) return;
    editor.history.push(JSON.stringify({ tab: getActiveExercise().tab, instrumentProfile: getActiveExercise().instrumentProfile, playbackInstrument: getActiveExercise().playbackInstrument }));
    if (editor.history.length > 40) editor.history.shift();
  }

  function undoEdit() {
    if (editor.index === null || editor.history.length === 0) return;
    const previous = JSON.parse(editor.history.pop());
    const exercise = getActiveExercise();
    exercise.tab = previous.tab;
    exercise.instrumentProfile = previous.instrumentProfile;
    exercise.playbackInstrument = previous.playbackInstrument;
    saveState();
    renderEditor();
  }

  function getTabEvents(tab) {
    const profile = getActiveProfile();
    const events = [];
    tab.forEach((line, stringIndex) => {
      const baseMidi = profile.strings[stringIndex]?.midi;
      if (baseMidi === undefined) return;
      const regex = /\d+/g;
      let match;
      while ((match = regex.exec(line.body)) !== null) events.push({ column: match.index, midi: baseMidi + Number(match[0]) });
    });
    return events;
  }

  function playTab(tab) {
    const exercise = getActiveExercise();
    if (!exercise) return;
    const events = getTabEvents(tab);
    const byColumn = new Map();
    events.forEach((event) => {
      if (!byColumn.has(event.column)) byColumn.set(event.column, []);
      byColumn.get(event.column).push(event.midi);
    });
    [...byColumn.keys()].sort((a, b) => a - b).forEach((column, step) => {
      window.setTimeout(() => byColumn.get(column).forEach((midi) => playPluckedMidi(midi, exercise.playbackInstrument)), step * 180);
    });
  }

  function getColumnMidis(column) {
    return getTabEvents(getActiveExercise()?.tab || []).filter((event) => event.column === column).map((event) => event.midi);
  }

  function playColumn(column) {
    const exercise = getActiveExercise();
    if (!exercise) return;
    getColumnMidis(column).forEach((midi) => playPluckedMidi(midi, exercise.playbackInstrument));
  }

  function warmAudioContext() {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContext = new AudioContextCtor();
    }
    return audioContext;
  }

  function playPluckedMidi(midi, style) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const start = () => {
      const now = ctx.currentTime;
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const params = soundParams(style);
      const burstLength = Math.max(0.02, Math.min(0.08, 4 / frequency));
      const frameCount = Math.max(64, Math.floor(ctx.sampleRate * burstLength));
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const delay = ctx.createDelay(1);
      delay.delayTime.setValueAtTime(1 / Math.max(35, frequency), now);
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(params.feedback, now);
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.setValueAtTime(params.cutoff, now);
      tone.Q.setValueAtTime(params.q, now);
      const body = ctx.createBiquadFilter();
      body.type = "peaking";
      body.frequency.setValueAtTime(params.body, now);
      body.Q.setValueAtTime(0.75, now);
      body.gain.setValueAtTime(params.bodyGain, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(params.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + params.decay);
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(tone);
      tone.connect(body);
      body.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + burstLength + 0.02);
      window.setTimeout(() => {
        try { source.disconnect(); delay.disconnect(); feedback.disconnect(); tone.disconnect(); body.disconnect(); gain.disconnect(); } catch (error) {}
      }, Math.ceil((params.decay + 0.3) * 1000));
    };
    if (ctx.state === "suspended") ctx.resume().then(start).catch(() => {});
    else start();
  }

  function soundParams(style) {
    const table = {
      acoustic: { feedback: 0.935, cutoff: 3800, q: 0.5, body: 210, bodyGain: 3, gain: 0.18, decay: 1.25 },
      fingerstyle: { feedback: 0.945, cutoff: 3000, q: 0.45, body: 185, bodyGain: 4, gain: 0.16, decay: 1.45 },
      electric: { feedback: 0.95, cutoff: 5200, q: 0.6, body: 420, bodyGain: 2, gain: 0.15, decay: 1.55 },
      jazz: { feedback: 0.94, cutoff: 2350, q: 0.75, body: 300, bodyGain: 4, gain: 0.16, decay: 1.35 },
      lespaul: { feedback: 0.955, cutoff: 4100, q: 0.65, body: 360, bodyGain: 5, gain: 0.17, decay: 1.7 },
      muted: { feedback: 0.82, cutoff: 1900, q: 0.7, body: 260, bodyGain: 2, gain: 0.18, decay: 0.36 },
      bass1: { feedback: 0.965, cutoff: 1450, q: 0.7, body: 105, bodyGain: 5, gain: 0.24, decay: 1.6 },
      bass2: { feedback: 0.97, cutoff: 1050, q: 0.8, body: 90, bodyGain: 6, gain: 0.25, decay: 1.9 },
      bass3: { feedback: 0.945, cutoff: 2050, q: 0.6, body: 125, bodyGain: 4, gain: 0.22, decay: 1.25 },
      bright: { feedback: 0.93, cutoff: 5000, q: 0.55, body: 450, bodyGain: 2, gain: 0.15, decay: 1.0 },
      pluck: { feedback: 0.925, cutoff: 3600, q: 0.5, body: 300, bodyGain: 3, gain: 0.16, decay: 1.15 }
    };
    return table[style] || table.pluck;
  }

  function openEditorMenu() {
    document.getElementById("editorMenuBackdrop").hidden = false;
  }
  function closeEditorMenu() { document.getElementById("editorMenuBackdrop").hidden = true; }
  function openSettings() { settingsTab = "general"; document.getElementById("editorSettingsBackdrop").hidden = false; renderSettings(); }
  function closeSettings() { document.getElementById("editorSettingsBackdrop").hidden = true; }

  function renderSettings() {
    const backdrop = document.getElementById("editorSettingsBackdrop");
    backdrop.querySelectorAll("[data-settings-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.settingsTab === settingsTab));
    const heading = document.getElementById("settingsHeading");
    const body = document.getElementById("settingsBody");
    if (settingsTab === "general") {
      heading.textContent = "General Settings";
      body.innerHTML = `
        <div class="settings-section-label">INTERFACE</div>
        ${toggleRow("darkMode", "☾", "Dark mode", editorSettings.darkMode)}
        ${toggleRow("fretboardHeatmap", "▣", "Fretboard Heatmap", editorSettings.fretboardHeatmap)}
        <div class="settings-section-label">PLAYBACK</div>
        ${toggleRow("singleColumnPlayback", "☷", "Single column playback", editorSettings.singleColumnPlayback)}
        ${toggleRow("chordPreviewOnHover", "♫", "Chord preview on hover (guitar only)", editorSettings.chordPreviewOnHover)}
      `;
      return;
    }
    heading.textContent = "Instrument Config";
    const exercise = getActiveExercise();
    const profileId = exercise?.instrumentProfile || config.defaultProfile;
    const profile = EDITOR_INSTRUMENTS[profileId];
    const options = Object.entries(EDITOR_INSTRUMENTS).map(([value, item]) => `<option value="${value}" ${value === profileId ? "selected" : ""}>${item.label}</option>`).join("");
    const playback = PLAYBACK_OPTIONS[profile.group].map(([value, label]) => `<option value="${value}" ${value === exercise.playbackInstrument ? "selected" : ""}>${label}</option>`).join("");
    body.innerHTML = `
      <label class="settings-field"><span>Select instrument</span><select name="instrumentProfile">${options}</select></label>
      <label class="settings-field"><span>Select playback instrument</span><select name="playbackInstrument">${playback}</select></label>
      <div class="instrument-summary"><strong>${profile.label}</strong><span>${profile.strings.length} strings · ${profile.strings.map((string) => string.fretLabel).join(" · ")}</span></div>`;
  }

  function toggleRow(name, icon, label, checked) {
    return `<label class="setting-row"><span class="setting-icon">${icon}</span><span class="setting-label">${label}</span><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span class="setting-switch"></span></label>`;
  }

  function handleSettingsChange(event) {
    const target = event.target;
    if (target.name === "instrumentProfile") { changeInstrumentProfile(target.value); return; }
    if (target.name === "playbackInstrument") {
      const exercise = getActiveExercise();
      if (!exercise) return;
      exercise.playbackInstrument = target.value;
      saveState();
      return;
    }
    if (["darkMode", "fretboardHeatmap", "singleColumnPlayback", "chordPreviewOnHover"].includes(target.name)) {
      editorSettings[target.name] = Boolean(target.checked);
      saveEditorSettings();
      applyEditorTheme();
      if (target.name === "fretboardHeatmap") renderFretboard();
    }
  }

  function loadEditorSettings() {
    const defaults = { darkMode: true, fretboardHeatmap: true, singleColumnPlayback: false, chordPreviewOnHover: true };
    try { return { ...defaults, ...(JSON.parse(window.localStorage.getItem(EDITOR_SETTINGS_KEY)) || {}) }; }
    catch (error) { return defaults; }
  }
  function saveEditorSettings() { window.localStorage.setItem(EDITOR_SETTINGS_KEY, JSON.stringify(editorSettings)); }
  function applyEditorTheme() { editor.modal.classList.toggle("is-light", !editorSettings.darkMode); }

  const TUTORIAL_STEPS = [
    { title: "My Lessons Tab Editor", text: "Compón tablaturas de guitarra, bajo y otros instrumentos tocando directamente el diapasón.", visual: "Toca una nota y aparecerá en la tablatura." },
    { title: "Add a note", text: "Toca cualquier traste en cualquier cuerda. La nota se escribe exactamente en esa cuerda y el cursor avanza automáticamente.", visual: "Cada toque también reproduce el sonido del instrumento seleccionado." },
    { title: "Edit the tab", text: "Toca cualquier lugar de la tablatura para mover el cursor. También puedes usar ‹ y ›, borrar y deshacer.", visual: "Los trastes 10, 11 y 12 se escriben completos sin romper la columna." },
    { title: "Playback", text: "Usa ▶ para escuchar la tablatura. Los números de una misma columna suenan juntos.", visual: "En Settings puedes activar Single column playback." },
    { title: "Menu", text: "El botón ☰ abre solamente las dos opciones importantes: Tutorial y Settings.", visual: "Tutorial repite esta guía cuando quieras." },
    { title: "General Settings", text: "Puedes activar Dark mode, Fretboard Heatmap, Single column playback y el preview al pasar sobre notas.", visual: "El Heatmap resalta las posiciones que ya utilizaste." },
    { title: "Instruments", text: "En Settings → Instruments cambia guitarra, bajo, cantidad de cuerdas y el sonido de reproducción.", visual: "La tablatura y el diapasón se adaptan al instrumento elegido." }
  ];

  function startTutorial() {
    tutorialStep = 0;
    document.getElementById("editorTutorialBackdrop").hidden = false;
    renderTutorial();
  }
  function renderTutorial() {
    const step = TUTORIAL_STEPS[tutorialStep];
    document.getElementById("tutorialStepCount").textContent = `${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`;
    document.getElementById("tutorialTitle").textContent = step.title;
    document.getElementById("tutorialText").textContent = step.text;
    document.getElementById("tutorialVisual").textContent = step.visual;
    document.getElementById("tutorialProgress").textContent = `${tutorialStep + 1} / ${TUTORIAL_STEPS.length}`;
    document.getElementById("tutorialNext").textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? "Finish" : "Next";
  }
  function nextTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) { finishTutorial(); return; }
    tutorialStep += 1;
    renderTutorial();
  }
  function finishTutorial() {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    document.getElementById("editorTutorialBackdrop").hidden = true;
  }

  function defaultPlaybackForProfile(profileId) {
    const group = EDITOR_INSTRUMENTS[profileId]?.group || "other";
    return PLAYBACK_OPTIONS[group][0][0];
  }
  function isGuitarProfile(profileId) { return EDITOR_INSTRUMENTS[profileId]?.group === "guitar"; }
  function noteName(midi) { return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function randomInt(max) { return Math.floor(Math.random() * max); }
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }
})();
