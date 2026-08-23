(function () {
  "use strict";

  const modal = document.getElementById("tabEditor");
  const tabEl = document.getElementById("editorTab");
  const fretboard = document.getElementById("fretboard");
  const titleInput = document.getElementById("editorTitle");
  const descInput = document.getElementById("editorDescription");
  if (!modal || !tabEl || !fretboard || !titleInput || !descInput) return;

  const PAGE_INSTRUMENT = document.body.dataset.instrument === "bass" ? "bass" : "guitar";
  const STORAGE_BASE = PAGE_INSTRUMENT === "bass" ? "myLessons.bassRoutine.v2" : "myLessons.guitarRoutine.v2";
  const SESSION_KEY = "myLessons.localSession";
  const SETTINGS_KEY = "myLessons.tabEditorSettings.v3";
  const TUTORIAL_KEY = "myLessons.tabTutorialSeen.v3";
  const SAMPLE_COMMIT = "622c2f1c32c8cfce4158ddc3eb26e518ddef37e5";
  const SAMPLE_CDN = `https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@${SAMPLE_COMMIT}/samples`;
  const SAMPLE_RAW = `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/${SAMPLE_COMMIT}/samples`;
  const STEP_MS = 155;

  const PROFILES = {
    guitar5: profile("Guitar (5-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45]]),
    guitar6: profile("Guitar (6-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45],["E","E2",40]]),
    guitar7: profile("Guitar (7-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45],["E","E2",40],["B","B1",35]]),
    guitar8: profile("Guitar (8-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45],["E","E2",40],["B","B1",35],["F#","F#1",30]]),
    guitar9: profile("Guitar (9-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45],["E","E2",40],["B","B1",35],["F#","F#1",30],["C#","C#1",25]]),
    guitar10: profile("Guitar (10-string)", "guitar", [["e","E4",64],["B","B3",59],["G","G3",55],["D","D3",50],["A","A2",45],["E","E2",40],["B","B1",35],["F#","F#1",30],["C#","C#1",25],["G#","G#0",20]]),
    bass4: profile("Bass (4-string)", "bass", [["G","G2",43],["D","D2",38],["A","A1",33],["E","E1",28]]),
    bass5: profile("Bass (5-string)", "bass", [["G","G2",43],["D","D2",38],["A","A1",33],["E","E1",28],["B","B0",23]]),
    bass6: profile("Bass (6-string)", "bass", [["C","C3",48],["G","G2",43],["D","D2",38],["A","A1",33],["E","E1",28],["B","B0",23]]),
    bass7: profile("Bass (7-string)", "bass", [["F","F3",53],["C","C3",48],["G","G2",43],["D","D2",38],["A","A1",33],["E","E1",28],["B","B0",23]])
  };

  const PLAYBACK = {
    guitar: [["acoustic","Acoustic Guitar"],["electric","Electric Guitar"],["nylon","Nylon Guitar"]],
    bass: [["bass-electric","Electric Bass"]]
  };

  const SAMPLE_LIBRARY = {
    acoustic: sampleEntries("guitar-acoustic", "D2,Ds2,E2,F2,Fs2,G2,Gs2,A2,As2,B2,C3,Cs3,D3,Ds3,E3,F3,Fs3,G3,Gs3,A3,As3,B3,C4,Cs4,D4,Ds4,E4,F4,Fs4,G4,Gs4,A4,As4,B4,C5,Cs5,D5"),
    electric: sampleEntries("guitar-electric", "Cs2,E2,Fs2,A2,C3,Ds3,Fs3,A3,C4,Ds4,Fs4,A4,C5,Ds5,Fs5,A5,C6"),
    nylon: sampleEntries("guitar-nylon", "B1,D2,E2,Fs2,Gs2,A2,B2,Cs3,D3,E3,Fs3,G3,A3,B3,Cs4,Ds4,E4,Fs4,Gs4,A4,B4,Cs5,D5,E5,Fs5,G5,Gs5,A5,As5"),
    "bass-electric": sampleEntries("bass-electric", "Cs1,E1,G1,As1,Cs2,E2,G2,As2,Cs3,E3,G3,As3,Cs4,E4,G4,As4,Cs5")
  };

  const TUTORIAL = [
    ["My Lessons Tab Editor", "Compón tablaturas de guitarra y bajo tocando directamente el diapasón.", "Cada nota puede escucharse mientras compones."],
    ["Add a note", "Toca cualquier traste. Se escribe en la cuerda correcta y el cursor avanza.", "Cada toque reproduce el sample real del instrumento seleccionado."],
    ["Edit the tab", "Toca la tablatura para mover el cursor. Usa ‹ ›, ⌫, + y ↶ para editar.", "⌫ borra la nota actual o la última nota anterior de esa cuerda."],
    ["Playback", "Usa ▶ para escuchar el arreglo completo como un arrangement view.", "La línea naranja sigue la reproducción; ▶ cambia a ■ para detener."],
    ["Menu", "☰ abre solamente Tutorial y Settings.", "La X superior cierra el editor; ✓ guarda los cambios."],
    ["General Settings", "Dark mode, Fretboard Heatmap, Single column playback y chord preview.", "Puedes personalizar cómo se comporta el editor."],
    ["Instruments", "Selecciona Guitar 5–10 strings o Bass 4–7 strings y el sonido de playback.", "La tablatura y el diapasón se adaptan automáticamente."]
  ];

  let settings = loadSettings();
  let state = null;
  let activeIndex = null;
  let exercise = null;
  let profileId = PAGE_INSTRUMENT === "bass" ? "bass4" : "guitar6";
  let playbackStyle = PAGE_INSTRUMENT === "bass" ? "bass-electric" : "acoustic";
  let cursor = 0;
  let selectedString = 0;
  let history = [];
  let dirty = false;
  let settingsTab = "general";
  let audioContext = null;
  const bufferCache = new Map();
  const packPromises = new Map();
  let playbackTimers = [];
  let playbackSources = [];
  let playing = false;

  setupChrome();
  installCaptureHandlers();
  applyTheme();

  function profile(label, group, rows) {
    return { label, group, strings: rows.map(([label, fretLabel, midi]) => ({ label, fretLabel, midi })) };
  }

  function sampleEntries(folder, notes) {
    return notes.split(",").map((note) => ({ folder, file: `${note}.mp3`, midi: noteToMidi(note) }));
  }

  function noteToMidi(note) {
    const match = /^([A-G])([s]?)(-?\d+)$/.exec(note);
    const pcs = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
    return (Number(match[3]) + 1) * 12 + pcs[match[1]] + (match[2] ? 1 : 0);
  }

  function setupChrome() {
    const close = document.getElementById("closeEditor");
    close?.classList.add("editor-close-floating");
    if (close && close.parentElement !== modal) modal.appendChild(close);
    const menu = document.getElementById("editorMenuButton");
    if (menu) {
      menu.textContent = "☰";
      menu.setAttribute("aria-label", "Tutorial y Settings");
    }
    const add = document.getElementById("addSpace");
    const del = document.getElementById("deleteNote");
    if (add) { add.textContent = "+"; add.title = "Insertar espacio"; }
    if (del) { del.textContent = "⌫"; del.title = "Borrar nota"; }
    document.getElementById("playTab")?.setAttribute("title", "Reproducir arreglo");

    let toast = document.getElementById("editorActionToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "editorActionToast";
      toast.className = "editor-action-toast";
      modal.appendChild(toast);
    }
    window.addEventListener("resize", positionClose, { passive: true });
  }

  function installCaptureHandlers() {
    document.addEventListener("click", (event) => {
      const edit = event.target.closest?.("[data-edit-tab]");
      if (edit) {
        event.preventDefault(); event.stopImmediatePropagation();
        const row = edit.closest(".exercise-row");
        const rows = [...document.querySelectorAll("#exerciseList .exercise-row")];
        const index = rows.indexOf(row);
        if (index >= 0) openEditor(index);
        return;
      }

      if (!modal.classList.contains("is-open")) return;
      const target = event.target;
      const id = target.closest?.("button")?.id;
      if (["closeEditor","saveEditor","cursorBack","cursorForward","deleteNote","undoEdit","playTab","addSpace","editorMenuButton"].includes(id)) {
        event.preventDefault(); event.stopImmediatePropagation();
        handleToolbar(id);
        return;
      }

      const menuBackdrop = document.getElementById("editorMenuBackdrop");
      if (!menuBackdrop?.hidden && (target === menuBackdrop || target.closest?.("[data-close-menu]"))) {
        event.preventDefault(); event.stopImmediatePropagation(); closeMenu(); return;
      }
      if (target.closest?.("[data-open-tutorial]")) {
        event.preventDefault(); event.stopImmediatePropagation(); closeMenu(); startTutorial(); return;
      }
      if (target.closest?.("[data-open-settings]")) {
        event.preventDefault(); event.stopImmediatePropagation(); closeMenu(); openSettings(); return;
      }

      const settingsBackdrop = document.getElementById("editorSettingsBackdrop");
      if (!settingsBackdrop?.hidden) {
        if (target === settingsBackdrop || target.closest?.("[data-close-settings]")) {
          event.preventDefault(); event.stopImmediatePropagation(); closeSettings(); return;
        }
        const tabButton = target.closest?.("[data-settings-tab]");
        if (tabButton) {
          event.preventDefault(); event.stopImmediatePropagation(); settingsTab = tabButton.dataset.settingsTab; renderSettings(); return;
        }
      }

      const tutorialBackdrop = document.getElementById("editorTutorialBackdrop");
      if (!tutorialBackdrop?.hidden && (target === tutorialBackdrop || target.closest?.("[data-close-tutorial]"))) {
        event.preventDefault(); event.stopImmediatePropagation(); finishTutorial(); return;
      }
      if (target.id === "tutorialNext") {
        event.preventDefault(); event.stopImmediatePropagation(); nextTutorial();
      }
    }, true);

    document.addEventListener("change", (event) => {
      if (!modal.classList.contains("is-open")) return;
      const target = event.target;
      if (!target?.name) return;
      if (["instrumentProfile","playbackInstrument","darkMode","fretboardHeatmap","singleColumnPlayback","chordPreviewOnHover"].includes(target.name)) {
        event.stopImmediatePropagation();
        handleSettingsChange(target);
      }
    }, true);

    fretboard.addEventListener("pointerdown", (event) => {
      const note = event.target.closest?.(".fret-note");
      if (!note || !modal.classList.contains("is-open")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      unlockAudio();
      insertFret(Number(note.dataset.string), Number(note.dataset.fret));
      playMidi(Number(note.dataset.midi), playbackStyle);
      note.classList.add("is-auditioning");
      window.setTimeout(() => note.classList.remove("is-auditioning"), 110);
    }, true);

    fretboard.addEventListener("pointerover", (event) => {
      if (!settings.chordPreviewOnHover || event.pointerType === "touch") return;
      const note = event.target.closest?.(".fret-note");
      if (!note || PROFILES[profileId].group !== "guitar") return;
      event.stopImmediatePropagation();
      const midi = Number(note.dataset.midi);
      [midi, ...columnMidis(cursor).filter((x) => x !== midi)].slice(0, 6).forEach((x) => playMidi(x, playbackStyle));
    }, true);

    tabEl.addEventListener("pointerdown", (event) => {
      const line = event.target.closest?.("[data-editor-string]");
      if (!line || !modal.classList.contains("is-open")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      selectedString = Number(line.dataset.editorString);
      const bodyEl = line.querySelector(".editor-line-body");
      const rect = bodyEl.getBoundingClientRect();
      const body = exercise.tab[selectedString].body;
      const charWidth = rect.width / Math.max(body.length, 1);
      cursor = clamp(Math.floor((event.clientX - rect.left) / Math.max(charWidth, 1)), 0, body.length - 1);
      renderEditor();
      if (settings.singleColumnPlayback) playColumn(cursor);
    }, true);
  }

  function openEditor(index) {
    state = readRoutineState();
    if (!state?.exercises?.[index] || state.exercises[index].type !== "tab") return;
    activeIndex = index;
    exercise = JSON.parse(JSON.stringify(state.exercises[index]));
    profileId = PROFILES[exercise.instrumentProfile] ? exercise.instrumentProfile : (PAGE_INSTRUMENT === "bass" ? "bass4" : "guitar6");
    playbackStyle = normalizePlayback(exercise.playbackInstrument, profileId);
    exercise.instrumentProfile = profileId;
    exercise.playbackInstrument = playbackStyle;
    normalizeTab();
    cursor = 0; selectedString = 0; history = []; dirty = false;
    titleInput.value = exercise.title || "Sin titulo";
    descInput.value = exercise.desc || "";
    modal.classList.add("is-open");
    applyTheme(); renderEditor(); positionClose(); unlockAudio();
    preloadPack(playbackStyle).catch(() => {});
    if (!localStorage.getItem(TUTORIAL_KEY)) window.setTimeout(startTutorial, 160);
  }

  function handleToolbar(id) {
    if (id === "closeEditor") { closeWithoutSave(); return; }
    if (id === "saveEditor") { saveAndExit(); return; }
    if (id === "cursorBack") { cursor = clamp(cursor - 1, 0, tabWidth() - 1); renderEditor(); return; }
    if (id === "cursorForward") { cursor = clamp(cursor + 1, 0, tabWidth() - 1); renderEditor(); return; }
    if (id === "deleteNote") { deleteAtCursor(); return; }
    if (id === "undoEdit") { undo(); return; }
    if (id === "addSpace") { insertSpace(); return; }
    if (id === "playTab") { if (playing) stopPlayback(); else if (settings.singleColumnPlayback) playColumn(cursor); else playArrangement(); return; }
    if (id === "editorMenuButton") openMenu();
  }

  function closeWithoutSave() {
    stopPlayback();
    if (dirty && !window.confirm("Salir sin guardar los cambios?")) return;
    hideAllPopovers();
    modal.classList.remove("is-open");
    activeIndex = null; exercise = null; state = null;
  }

  function saveAndExit() {
    if (!state || activeIndex === null || !exercise) return;
    exercise.title = titleInput.value.trim() || "Sin titulo";
    exercise.desc = descInput.value.trim();
    exercise.instrumentProfile = profileId;
    exercise.playbackInstrument = playbackStyle;
    state.exercises[activeIndex] = exercise;
    const key = routineStorageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(state));
    stopPlayback(); hideAllPopovers();
    modal.classList.remove("is-open");
    dirty = false;
    window.location.reload();
  }

  function renderEditor() {
    if (!exercise) return;
    normalizeTab();
    const width = tabWidth();
    cursor = clamp(cursor, 0, width - 1);
    selectedString = clamp(selectedString, 0, exercise.tab.length - 1);
    tabEl.innerHTML = exercise.tab.map((line, index) => {
      const before = esc(line.body.slice(0, cursor));
      const char = esc(line.body[cursor] || "-");
      const after = esc(line.body.slice(cursor + 1));
      return `<div class="editor-line ${index === selectedString ? "is-selected" : ""}" data-editor-string="${index}"><span>${esc(line.label)}|</span><span class="editor-line-body">${before}<span class="cursor-slot">${char}</span>${after}</span></div>`;
    }).join("");
    renderFretboard();
  }

  function renderFretboard() {
    const profile = PROFILES[profileId];
    const frets = Array.from({ length: 13 }, (_, i) => i);
    const heat = settings.fretboardHeatmap ? heatmap() : new Map();
    fretboard.innerHTML = `<div class="fret-head"></div>${frets.map((f) => `<div class="fret-head">${f}</div>`).join("")}${profile.strings.map((string, si) => `<div class="string-name">${string.fretLabel}</div>${frets.map((fret) => { const midi = string.midi + fret; const h = heat.get(`${si}:${fret}`) || 0; return `<div class="fret-cell ${h ? "has-heat" : ""}" style="--heat:${Math.min(1,.22+h*.18)}"><button class="fret-note" type="button" data-string="${si}" data-fret="${fret}" data-midi="${midi}">${midiName(midi)}</button></div>`; }).join("")}`).join("")}`;
  }

  function normalizeTab() {
    const profile = PROFILES[profileId];
    if (!Array.isArray(exercise.tab)) exercise.tab = [];
    const width = Math.max(32, ...exercise.tab.map((line) => String(line?.body || "").length), 0);
    if (exercise.tab.length === profile.strings.length) {
      exercise.tab = profile.strings.map((s, i) => ({ label: s.label, body: pad(exercise.tab[i]?.body || "", width) }));
      return;
    }
    const old = exercise.tab;
    exercise.tab = profile.strings.map((s, i) => ({ label: s.label, body: pad(old[i]?.body || "", width) }));
  }

  function convertProfile(nextId) {
    if (!PROFILES[nextId] || nextId === profileId) return;
    pushHistory();
    const oldProfile = PROFILES[profileId];
    const oldTab = exercise.tab;
    const width = Math.max(32, ...oldTab.map((line) => line.body.length));
    const byMidi = new Map();
    oldProfile.strings.forEach((s, i) => { if (!byMidi.has(s.midi)) byMidi.set(s.midi, []); byMidi.get(s.midi).push(oldTab[i]?.body || ""); });
    const next = PROFILES[nextId];
    exercise.tab = next.strings.map((s) => ({ label: s.label, body: pad((byMidi.get(s.midi) || []).shift() || "", width) }));
    profileId = nextId;
    playbackStyle = normalizePlayback(playbackStyle, profileId);
    exercise.instrumentProfile = profileId; exercise.playbackInstrument = playbackStyle;
    selectedString = 0; cursor = 0; dirty = true;
    renderEditor(); renderSettings(); preloadPack(playbackStyle).catch(() => {});
  }

  function insertFret(stringIndex, fret) {
    if (!exercise) return;
    pushHistory();
    selectedString = stringIndex;
    const token = String(fret);
    const required = cursor + token.length + 2;
    exercise.tab.forEach((line) => { if (line.body.length < required) line.body = line.body.padEnd(required, "-"); });
    const line = exercise.tab[stringIndex];
    line.body = line.body.slice(0, cursor) + token + line.body.slice(cursor + token.length);
    const sep = cursor + token.length;
    if (line.body[sep] !== "-") line.body = line.body.slice(0, sep) + "-" + line.body.slice(sep + 1);
    cursor = clamp(cursor + token.length + 1, 0, line.body.length - 1);
    dirty = true; renderEditor();
  }

  function deleteAtCursor() {
    if (!exercise) return;
    const line = exercise.tab[selectedString];
    const body = line.body;
    let start = cursor, end = cursor;
    if (/\d/.test(body[cursor] || "")) {
      end = cursor + 1;
      while (start > 0 && /\d/.test(body[start - 1])) start--;
      while (end < body.length && /\d/.test(body[end])) end++;
    } else {
      let scan = Math.min(cursor - 1, body.length - 1);
      while (scan >= 0 && !/\d/.test(body[scan])) scan--;
      if (scan < 0) { toast("No hay una nota anterior para borrar"); return; }
      end = scan + 1;
      while (end < body.length && /\d/.test(body[end])) end++;
      start = scan;
      while (start > 0 && /\d/.test(body[start - 1])) start--;
    }
    pushHistory();
    line.body = body.slice(0, start) + "-".repeat(Math.max(1, end - start)) + body.slice(end);
    cursor = start; dirty = true; renderEditor(); toast("Nota borrada");
  }

  function insertSpace() {
    pushHistory();
    exercise.tab.forEach((line) => { line.body = line.body.slice(0, cursor) + "-" + line.body.slice(cursor); });
    cursor++; dirty = true; renderEditor(); toast("Espacio insertado");
  }

  function pushHistory() {
    history.push(JSON.stringify({ tab: exercise.tab, profileId, playbackStyle }));
    if (history.length > 50) history.shift();
  }

  function undo() {
    if (!history.length) { toast("Nada que deshacer"); return; }
    const prev = JSON.parse(history.pop());
    exercise.tab = prev.tab; profileId = prev.profileId; playbackStyle = prev.playbackStyle;
    exercise.instrumentProfile = profileId; exercise.playbackInstrument = playbackStyle;
    dirty = true; renderEditor(); toast("Deshacer");
  }

  function heatmap() {
    const map = new Map();
    exercise.tab.forEach((line, si) => {
      const re = /\d+/g; let m;
      while ((m = re.exec(line.body))) { const fret = Number(m[0]); if (fret <= 12) { const k = `${si}:${fret}`; map.set(k, (map.get(k)||0)+1); } }
    });
    return map;
  }

  async function playArrangement() {
    const events = tabEvents();
    if (!events.length) { toast("No hay notas para reproducir"); return; }
    unlockAudio();
    try { await preloadPack(playbackStyle); } catch (_) { toast("No se pudo cargar el audio"); return; }
    const byColumn = new Map();
    events.forEach((e) => { if (!byColumn.has(e.column)) byColumn.set(e.column, []); byColumn.get(e.column).push(e.midi); });
    const cols = [...byColumn.keys()].sort((a,b)=>a-b); const first = cols[0], last = cols[cols.length-1];
    playing = true; const button = document.getElementById("playTab"); button.textContent = "■"; button.classList.add("is-playing-arrangement"); modal.classList.add("is-arrangement-playing"); ensurePlayhead();
    for (let col = first; col <= last; col++) playbackTimers.push(setTimeout(() => { if (!playing) return; updatePlayhead(col); (byColumn.get(col)||[]).forEach((m)=>playMidiNow(m, playbackStyle)); }, (col-first)*STEP_MS));
    playbackTimers.push(setTimeout(stopPlayback, (last-first+1)*STEP_MS + 180));
  }

  async function playColumn(column) {
    unlockAudio();
    try { await preloadPack(playbackStyle); } catch (_) { return; }
    columnMidis(column).forEach((m) => playMidiNow(m, playbackStyle));
  }

  function stopPlayback() {
    playbackTimers.forEach(clearTimeout); playbackTimers = [];
    playbackSources.forEach((s) => { try { s.stop(); } catch (_) {} }); playbackSources = [];
    playing = false;
    const button = document.getElementById("playTab"); if (button) { button.textContent = "▶"; button.classList.remove("is-playing-arrangement"); }
    modal.classList.remove("is-arrangement-playing"); document.getElementById("arrangementPlayhead")?.remove();
  }

  function tabEvents() {
    const p = PROFILES[profileId]; const out = [];
    exercise.tab.forEach((line, si) => { const base = p.strings[si]?.midi; if (base == null) return; const re=/\d+/g; let m; while ((m=re.exec(line.body))) out.push({ column:m.index, midi:base+Number(m[0]) }); });
    return out;
  }
  function columnMidis(col) { return tabEvents().filter((e)=>e.column===col).map((e)=>e.midi); }

  function ensurePlayhead() { if (document.getElementById("arrangementPlayhead")) return; const h=document.createElement("div"); h.id="arrangementPlayhead"; h.className="arrangement-playhead"; tabEl.appendChild(h); }
  function updatePlayhead(col) { const body=tabEl.querySelector(".editor-line-body"), head=document.getElementById("arrangementPlayhead"); if(!body||!head)return; const text=body.textContent||""; const r=body.getBoundingClientRect(); const cw=r.width/Math.max(1,text.length); const left=body.offsetLeft+col*cw; head.style.left=`${left}px`; const wrap=tabEl.closest(".editor-tab-wrap"); if(wrap&&(left<wrap.scrollLeft+36||left>wrap.scrollLeft+wrap.clientWidth-54)) wrap.scrollTo({left:Math.max(0,left-wrap.clientWidth*.42),behavior:"smooth"}); }

  function unlockAudio() { const ctx=getAudioContext(); if(ctx?.state==="suspended")ctx.resume().catch(()=>{}); }
  function getAudioContext() { if(!audioContext){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;audioContext=new C();} return audioContext; }
  function nearestSample(style,midi){return (SAMPLE_LIBRARY[style]||SAMPLE_LIBRARY.acoustic).reduce((best,e)=>!best||Math.abs(e.midi-midi)<Math.abs(best.midi-midi)?e:best,null);}
  async function preloadPack(style){ if(packPromises.has(style))return packPromises.get(style); const promise=Promise.all((SAMPLE_LIBRARY[style]||[]).map((e)=>loadBuffer(style,e))).catch((err)=>{packPromises.delete(style);throw err;}); packPromises.set(style,promise); return promise; }
  async function loadBuffer(style,entry){ const ctx=getAudioContext(); if(!ctx)throw new Error("Web Audio unavailable"); const key=`${style}:${entry.file}`; if(bufferCache.has(key))return bufferCache.get(key); const p=(async()=>{const path=`${entry.folder}/${entry.file}`;let res;try{res=await fetch(`${SAMPLE_CDN}/${path}`,{mode:"cors",cache:"force-cache"});if(!res.ok)throw new Error(String(res.status));}catch(first){res=await fetch(`${SAMPLE_RAW}/${path}`,{mode:"cors",cache:"force-cache"});if(!res.ok)throw first;}const ab=await res.arrayBuffer();return ctx.decodeAudioData(ab.slice(0));})(); bufferCache.set(key,p); try{const b=await p;bufferCache.set(key,b);return b;}catch(err){bufferCache.delete(key);throw err;} }
  async function playMidi(midi,style){const entry=nearestSample(style,midi);if(!entry)return;unlockAudio();try{await loadBuffer(style,entry);playMidiNow(midi,style,entry);}catch(err){console.warn("Sample playback failed",err);toast("No se pudo cargar el audio");}}
  function playMidiNow(midi,style,known){const ctx=getAudioContext(),entry=known||nearestSample(style,midi);if(!ctx||!entry)return;const buffer=bufferCache.get(`${style}:${entry.file}`);if(!buffer||typeof buffer.then==="function"){loadBuffer(style,entry).then(()=>playMidiNow(midi,style,entry)).catch(()=>{});return;}const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.playbackRate.value=Math.pow(2,(midi-entry.midi)/12);gain.gain.value=style==="bass-electric"?.72:.62;src.connect(gain);gain.connect(ctx.destination);playbackSources.push(src);src.onended=()=>{playbackSources=playbackSources.filter((x)=>x!==src);try{src.disconnect();gain.disconnect();}catch(_){}};src.start();}

  function openMenu(){document.getElementById("editorMenuBackdrop").hidden=false;}
  function closeMenu(){document.getElementById("editorMenuBackdrop").hidden=true;}
  function openSettings(){settingsTab="general";document.getElementById("editorSettingsBackdrop").hidden=false;renderSettings();}
  function closeSettings(){document.getElementById("editorSettingsBackdrop").hidden=true;}
  function hideAllPopovers(){closeMenu();closeSettings();const t=document.getElementById("editorTutorialBackdrop");if(t)t.hidden=true;}

  function renderSettings(){
    const back=document.getElementById("editorSettingsBackdrop");back.querySelectorAll("[data-settings-tab]").forEach((b)=>b.classList.toggle("is-active",b.dataset.settingsTab===settingsTab));
    const heading=document.getElementById("settingsHeading"),body=document.getElementById("settingsBody");
    if(settingsTab==="general"){
      heading.textContent="General Settings";
      body.innerHTML=`<div class="settings-section-label">INTERFACE</div>${toggle("darkMode","☾","Dark mode",settings.darkMode)}${toggle("fretboardHeatmap","▣","Fretboard Heatmap",settings.fretboardHeatmap)}<div class="settings-section-label">PLAYBACK</div>${toggle("singleColumnPlayback","☷","Single column playback",settings.singleColumnPlayback)}${toggle("chordPreviewOnHover","♫","Chord preview on hover (guitar only)",settings.chordPreviewOnHover)}`;
      return;
    }
    heading.textContent="Instrument Config";
    const p=PROFILES[profileId];
    const options=Object.entries(PROFILES).map(([value,item])=>`<option value="${value}" ${value===profileId?"selected":""}>${item.label}</option>`).join("");
    const playback=PLAYBACK[p.group].map(([value,label])=>`<option value="${value}" ${value===playbackStyle?"selected":""}>${label}</option>`).join("");
    body.innerHTML=`<label class="settings-field"><span>Select instrument</span><select name="instrumentProfile">${options}</select></label><label class="settings-field"><span>Select playback instrument</span><select name="playbackInstrument">${playback}</select></label><div class="instrument-summary"><strong>${p.label}</strong><span>${p.strings.length} strings · ${p.strings.map((s)=>s.fretLabel).join(" · ")}</span></div><div class="instrument-summary" style="opacity:.62;font-size:11px"><span>Real instrument samples · Audio Credits en el Home</span></div>`;
  }
  function toggle(name,icon,label,checked){return `<label class="setting-row"><span class="setting-icon">${icon}</span><span class="setting-label">${label}</span><input type="checkbox" name="${name}" ${checked?"checked":""}><span class="setting-switch"></span></label>`;}
  function handleSettingsChange(target){
    if(target.name==="instrumentProfile"){convertProfile(target.value);return;}
    if(target.name==="playbackInstrument"){playbackStyle=normalizePlayback(target.value,profileId);exercise.playbackInstrument=playbackStyle;dirty=true;preloadPack(playbackStyle).catch(()=>{});playMidi(PROFILES[profileId].strings[0].midi,playbackStyle);return;}
    if(["darkMode","fretboardHeatmap","singleColumnPlayback","chordPreviewOnHover"].includes(target.name)){settings[target.name]=Boolean(target.checked);saveSettings();applyTheme();if(target.name==="fretboardHeatmap")renderFretboard();}
  }
  function normalizePlayback(style,pid){const group=PROFILES[pid]?.group||"guitar";if(group==="bass")return "bass-electric";if(["acoustic","electric","nylon"].includes(style))return style;if(style==="fingerstyle")return "acoustic";if(["jazz","lespaul","muted"].includes(style))return "electric";return "acoustic";}

  let tutorialStep=0;
  function startTutorial(){tutorialStep=0;document.getElementById("editorTutorialBackdrop").hidden=false;renderTutorial();}
  function renderTutorial(){const step=TUTORIAL[tutorialStep];document.getElementById("tutorialStepCount").textContent=`${tutorialStep+1} of ${TUTORIAL.length}`;document.getElementById("tutorialTitle").textContent=step[0];document.getElementById("tutorialText").textContent=step[1];document.getElementById("tutorialVisual").textContent=step[2];document.getElementById("tutorialProgress").textContent=`${tutorialStep+1} / ${TUTORIAL.length}`;document.getElementById("tutorialNext").textContent=tutorialStep===TUTORIAL.length-1?"Finish":"Next";}
  function nextTutorial(){if(tutorialStep>=TUTORIAL.length-1){finishTutorial();return;}tutorialStep++;renderTutorial();}
  function finishTutorial(){localStorage.setItem(TUTORIAL_KEY,"1");document.getElementById("editorTutorialBackdrop").hidden=true;}

  function loadSettings(){const d={darkMode:true,fretboardHeatmap:true,singleColumnPlayback:false,chordPreviewOnHover:true};try{return{...d,...(JSON.parse(localStorage.getItem(SETTINGS_KEY))||{})};}catch(_){return d;}}
  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
  function applyTheme(){modal.classList.toggle("is-light",!settings.darkMode);}
  function positionClose(){const close=document.getElementById("closeEditor");if(!close||!modal.classList.contains("is-open"))return;const panel=modal.querySelector(".editor-panel");if(!panel)return;const r=panel.getBoundingClientRect();close.style.top=`${Math.max(12,r.top-54)}px`;close.style.right="14px";}

  function readRoutineState(){const key=routineStorageKey();if(!key)return null;try{return JSON.parse(localStorage.getItem(key)||"null");}catch(_){return null;}}
  function routineStorageKey(){try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||"null");const id=session?.user?.id;return id?`${STORAGE_BASE}.${id}`:null;}catch(_){return null;}}
  function tabWidth(){return Math.max(1,...exercise.tab.map((l)=>l.body.length));}
  function pad(body,width){return String(body||"").replace(/\s/g,"-").padEnd(width,"-");}
  function midiName(midi){const names=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];return `${names[((midi%12)+12)%12]}${Math.floor(midi/12)-1}`;}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function esc(v){return String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  let toastTimer=null;function toast(text){const el=document.getElementById("editorActionToast");if(!el)return;el.textContent=text;el.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("is-visible"),900);}
})();
