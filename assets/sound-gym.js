(function(){
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const STATS_KEY = "myLessons.soundGym.stats.v1";
  const LAST_KEY = "myLessons.soundGym.lastGame.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const ACTIVE_GAMES = new Set(["brighter-darker", "louder-quieter"]);
  const ROUND_TOTAL = 10;

  const GAME_CONFIG = {
    "brighter-darker": {
      title: "Brighter or Darker?",
      description: "Compara A/B y reconoce cuál versión tiene más o menos energía en los agudos.",
      targets: ["bright", "dark"],
      targetWord(target){ return target === "bright" ? "brillante" : "oscura"; },
      question(target){ return `¿Cuál versión suena más ${this.targetWord(target)}?`; },
      prompt(target){
        return {
          lead: "¿Cuál versión suena más",
          focus: target === "bright" ? "BRILLANTE?" : "OSCURA?",
          tone: target
        };
      },
      cue: "Escucha el ataque, los platos, el aire y las consonantes.",
      compatibleIds: [
        "drums-full-100", "drums-funky", "drums-flame-117",
        "mix-final-5", "mix-final-4", "mix-merengue-regueton",
        "guitar-afrobeat", "guitar-clean", "bass-funky-p",
        "female-vocal", "male-vocal", "percussion-dembow-120",
        "percussion-conto-105"
      ]
    },
    "louder-quieter": {
      title: "Louder or Quieter?",
      description: "Compara A/B y reconoce diferencias de nivel sin dejarte engañar por el timbre.",
      targets: ["louder", "quieter"],
      targetWord(target){ return target === "louder" ? "más fuerte" : "más suave"; },
      question(target){ return `¿Cuál versión suena ${this.targetWord(target)}?`; },
      prompt(target){
        return {
          lead: "¿Cuál versión suena",
          focus: target === "louder" ? "MÁS FUERTE?" : "MÁS SUAVE?",
          tone: target
        };
      },
      cue: "Escucha el nivel promedio y el cuerpo de la señal, no un pico aislado.",
      compatibleIds: [
        "drums-full-100", "drums-funky", "drums-flame-117",
        "mix-final-5", "mix-final-4", "mix-merengue-regueton",
        "guitar-afrobeat", "guitar-clean", "bass-funky-p",
        "female-vocal", "male-vocal", "keys-2", "keys-rhodes",
        "percussion-dembow-120", "percussion-conto-105"
      ]
    }
  };

  guardSession();

  const cards = [...document.querySelectorAll("[data-game]")];
  const progressFill = document.getElementById("sgProgressFill");
  const progressScore = document.getElementById("sgProgressScore");
  const toast = document.getElementById("sgToast");
  const shell = document.querySelector(".sg-shell");
  let toastTimer = 0;
  let questionTransitionTimer = 0;
  let decisionTimer = 0;
  let audioContext = null;
  let activeSource = null;
  let playRequestId = 0;
  let audioManifest = null;
  let trainer = null;
  const decodedBuffers = new Map();
  const processedBuffers = new Map();
  let trainerState = createInitialTrainerState();

  const levelMax = {
    ear: 18,
    engineer: 6,
    studio: 18
  };

  function guardSession(){
    try{
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      if(session?.user?.email) return;
    }catch(_){ }
    const u = new URL("login.html", location.href);
    u.searchParams.set("v", "soundgym2");
    u.searchParams.set("returnTo", "sound-gym.html?v=soundgym2");
    location.replace(u.href);
  }

  function createInitialTrainerState(){
    return {
      gameId: "brighter-darker",
      ready: false,
      round: 0,
      score: 0,
      answered: false,
      transitioning: false,
      correctSlot: "A",
      target: "bright",
      clip: null,
      clipDeck: [],
      intensity: 0,
      segmentStart: null,
      segmentDuration: 0,
      heardSlots: new Set(),
      decisionStartedAt: 0,
      responseTimes: [],
      roundPoints: 0
    };
  }

  function readProgress(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    }catch(_){ return {}; }
  }

  function writeProgress(data){
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  }

  function readStats(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    }catch(_){ return {}; }
  }

  function writeStats(data){
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  }

  function clampStars(value){
    const n = Number(value) || 0;
    return Math.max(0, Math.min(3, Math.round(n)));
  }

  function renderStars(card, count){
    const holder = card.querySelector("[data-stars]");
    if(!holder) return;
    holder.innerHTML = "";
    for(let i=1;i<=3;i++){
      const star = document.createElement("span");
      star.className = "sg-star " + (i <= count ? "on" : "off");
      star.textContent = i <= count ? "★" : "☆";
      holder.appendChild(star);
    }
  }

  function render(){
    const progress = readProgress();
    const stats = readStats();
    let total = 0;
    const levelTotals = {ear:0, engineer:0, studio:0};

    cards.forEach(card=>{
      const id = card.dataset.game;
      const level = card.dataset.level;
      const stars = clampStars(progress[id]);
      total += stars;
      if(levelTotals[level] !== undefined) levelTotals[level] += stars;
      renderStars(card, stars);
      renderCardStats(card, stats[id]);
      card.dataset.starsValue = String(stars);
      card.classList.toggle("is-live", ACTIVE_GAMES.has(id));
    });

    if(progressScore) progressScore.innerHTML = `<b>${total}</b> / 42 ★`;
    if(progressFill) progressFill.style.width = `${(total/42)*100}%`;

    Object.entries(levelTotals).forEach(([level,value])=>{
      const el = document.querySelector(`[data-level-score="${level}"]`);
      if(el) el.innerHTML = `<strong>${value}</strong> / ${levelMax[level]} ★`;
    });
  }

  function renderCardStats(card, stats){
    let line = card.querySelector("[data-game-stats]");
    if(!stats){
      line?.remove();
      return;
    }
    if(!line){
      line = document.createElement("div");
      line.className = "sg-game-stats";
      line.dataset.gameStats = "";
      card.querySelector("p")?.insertAdjacentElement("afterend", line);
    }
    const latest = Array.isArray(stats.recent) ? stats.recent[stats.recent.length - 1] : null;
    const accuracy = Math.round(Number(latest?.accuracy ?? stats.bestAccuracy) || 0);
    const average = Number(latest?.averageTime ?? stats.bestAverageTime);
    line.textContent = Number.isFinite(average) && average > 0
      ? `Precisión ${accuracy}% · ⌀ ${average.toFixed(1)} s`
      : `Precisión ${accuracy}%`;
  }

  function showToast(message){
    if(!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(()=>toast.classList.remove("show"), 2300);
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer = document.createElement("section");
    trainer.className = "sg-trainer";
    trainer.id = "sgTrainer";
    trainer.setAttribute("aria-live", "polite");
    trainer.innerHTML = `
      <div class="sg-trainer-head">
        <div>
          <span class="sg-trainer-kicker">Level 1 · Ear Basics</span>
          <h2 data-trainer-title>Brighter or Darker?</h2>
          <p data-trainer-description>Compara A/B y reconoce cuál versión tiene más o menos energía en los agudos.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-action="close-trainer" aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span data-round-label>Pregunta 1 de 10</span>
        <span data-score-label>Aciertos: 0</span>
      </div>
      <div class="sg-question-stage" data-question-stage role="status" aria-live="assertive" aria-atomic="true">
        <span class="sg-question-alert">Nuevo objetivo</span>
        <div class="sg-question" data-question>
          <span data-question-lead>¿Cuál versión suena más</span>
          <strong data-question-focus>BRILLANTE?</strong>
        </div>
      </div>
      <div class="sg-source-label" data-source-label>Fuente: cargando audio...</div>
      <div class="sg-source-label" data-listening-cue></div>
      <div class="sg-decision-status" data-decision-status>Escucha A y B y elige tu respuesta.</div>
      <div class="sg-ab-grid">
        <button class="sg-ab-play" type="button" data-play-slot="A"><span>A</span><strong>Escuchar A</strong></button>
        <button class="sg-ab-play" type="button" data-play-slot="B"><span>B</span><strong>Escuchar B</strong></button>
      </div>
      <div class="sg-answer-grid">
        <button class="sg-answer" type="button" data-answer-slot="A">A</button>
        <button class="sg-answer" type="button" data-answer-slot="B">B</button>
      </div>
      <div class="sg-feedback" data-feedback></div>
      <div class="sg-session-summary" data-session-summary></div>
      <button class="sg-next" type="button" data-action="next-round">Siguiente</button>
    `;
    const nav = document.querySelector(".sg-level-nav");
    shell.insertBefore(trainer, nav || shell.firstChild);

    trainer.querySelector("[data-action='close-trainer']")?.addEventListener("click",()=>{
      stopActiveSource();
      stopDecisionTimer();
      clearTimeout(questionTransitionTimer);
      trainerState.transitioning = false;
      trainer.classList.remove("show");
    });
    trainer.querySelectorAll("[data-play-slot]").forEach(button=>{
      button.addEventListener("click",()=>{
        if(!trainerState.transitioning) playSlot(button.dataset.playSlot);
      });
    });
    trainer.querySelectorAll("[data-answer-slot]").forEach(button=>{
      button.addEventListener("click",()=>{
        if(!trainerState.transitioning) answer(button.dataset.answerSlot);
      });
    });
    trainer.querySelector("[data-action='next-round']")?.addEventListener("click",nextRound);
    return trainer;
  }

  async function startGame(gameId){
    localStorage.setItem(LAST_KEY, gameId);
    playGameStartSound();
    ensureTrainer().classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});
    if(!audioManifest) await loadManifest();
    trainerState = createInitialTrainerState();
    trainerState.gameId = gameId;
    trainerState.ready = true;
    trainerState.clipDeck = buildClipDeck(gameId);
    nextRound();
  }

  async function loadManifest(){
    const response = await fetch(MANIFEST_URL, {cache:"force-cache"});
    if(!response.ok) throw new Error("No se pudo cargar el manifiesto de audio.");
    audioManifest = await response.json();
  }

  async function getAudioContext(){
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) throw new Error("Este navegador no soporta Web Audio.");
    if(!audioContext) audioContext = new Ctor();
    if(audioContext.state === "suspended") await audioContext.resume();
    return audioContext;
  }

  function buildClipDeck(gameId){
    const clips = audioManifest?.clips || [];
    const config = GAME_CONFIG[gameId];
    const deck = (config?.compatibleIds || [])
      .map(id=>clips.find(clip=>clip.id === id))
      .filter(Boolean);
    for(let i=deck.length-1;i>0;i--){
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function pickClip(){
    if(!trainerState.clipDeck.length) trainerState.clipDeck = buildClipDeck(trainerState.gameId);
    return trainerState.clipDeck.shift() || audioManifest?.clips?.[0];
  }

  function pickTarget(gameId){
    const targets = GAME_CONFIG[gameId]?.targets || ["bright", "dark"];
    return targets[Math.floor(Math.random() * targets.length)];
  }

  function getIntensity(gameId, round){
    if(gameId === "brighter-darker"){
      if(round <= 3) return 12;
      if(round <= 6) return 10;
      if(round <= 8) return 8;
      return 6;
    }
    if(round <= 3) return 6;
    if(round <= 6) return 3;
    if(round <= 8) return 1;
    return .5;
  }

  function nextRound(){
    stopActiveSource();
    stopDecisionTimer();
    if(!trainerState.ready) return;

    if(trainerState.round >= ROUND_TOTAL){
      finishSession();
      return;
    }

    trainerState.round += 1;
    trainerState.answered = false;
    trainerState.clip = pickClip();
    trainerState.target = pickTarget(trainerState.gameId);
    trainerState.intensity = getIntensity(trainerState.gameId, trainerState.round);
    trainerState.correctSlot = Math.random() > .5 ? "A" : "B";
    trainerState.segmentStart = null;
    trainerState.segmentDuration = 0;
    trainerState.heardSlots = new Set();
    trainerState.decisionStartedAt = 0;
    renderTrainer();
    beginQuestionTransition();
  }

  function getQuestionPresentation(config){
    if(typeof config.prompt === "function") return config.prompt(trainerState.target);
    return {
      lead: config.question(trainerState.target),
      focus: "",
      tone: "default"
    };
  }

  function setTrainerControlsLocked(locked){
    if(!trainer) return;
    trainer.classList.toggle("is-question-transitioning", locked);
    trainer.querySelectorAll("[data-play-slot]").forEach(button=>{
      button.disabled = locked;
    });
    trainer.querySelectorAll("[data-answer-slot]").forEach(button=>{
      button.disabled = locked || trainerState.answered;
    });
  }

  function beginQuestionTransition(){
    if(!trainer) return;
    clearTimeout(questionTransitionTimer);
    trainerState.transitioning = true;
    setTrainerControlsLocked(true);

    const stage = trainer.querySelector("[data-question-stage]");
    if(stage){
      stage.classList.remove("is-entering");
      void stage.offsetWidth;
      stage.classList.add("is-entering");
    }

    questionTransitionTimer = window.setTimeout(()=>{
      trainerState.transitioning = false;
      stage?.classList.remove("is-entering");
      setTrainerControlsLocked(false);
    }, 520);
  }

  function renderTrainer(){
    if(!trainer) return;
    const config = GAME_CONFIG[trainerState.gameId];
    trainer.querySelector("[data-trainer-title]").textContent = config.title;
    trainer.querySelector("[data-trainer-description]").textContent = config.description;
    trainer.querySelector("[data-round-label]").textContent = `Pregunta ${trainerState.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-score-label]").textContent = `Aciertos: ${trainerState.score}`;
    const presentation = getQuestionPresentation(config);
    const questionStage = trainer.querySelector("[data-question-stage]");
    questionStage.dataset.tone = presentation.tone;
    questionStage.setAttribute("aria-label", config.question(trainerState.target));
    trainer.querySelector("[data-question-lead]").textContent = presentation.lead;
    trainer.querySelector("[data-question-focus]").textContent = presentation.focus;
    trainer.querySelector("[data-source-label]").textContent = trainerState.clip ? `Fuente: ${trainerState.clip.title}` : "Fuente: cargando audio...";
    trainer.querySelector("[data-listening-cue]").textContent = config.cue;
    updateDecisionStatus();
    trainer.querySelector("[data-feedback]").textContent = "";
    trainer.querySelector("[data-feedback]").className = "sg-feedback";
    trainer.querySelector("[data-action='next-round']").textContent = "Siguiente";
    trainer.querySelector("[data-action='next-round']").classList.remove("show");
    trainer.querySelector("[data-session-summary]").classList.remove("show");
    trainer.querySelector("[data-session-summary]").innerHTML = "";
    trainer.querySelectorAll(".sg-answer").forEach(button=>{
      button.disabled = true;
      button.classList.remove("correct","wrong");
    });
  }

  async function decodeClip(clip){
    if(decodedBuffers.has(clip.id)) return decodedBuffers.get(clip.id);
    const context = await getAudioContext();
    const url = `${audioManifest.basePath}${clip.file}`;
    const response = await fetch(url);
    if(!response.ok) throw new Error(`No se pudo cargar ${clip.file}.`);
    const arrayBuffer = clip.file.endsWith(".b64")
      ? base64ToArrayBuffer(await response.text())
      : await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    decodedBuffers.set(clip.id, audioBuffer);
    return audioBuffer;
  }

  function base64ToArrayBuffer(value){
    const binary = atob(value.trim());
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function playSlot(slot){
    try{
      if(trainerState.transitioning || !trainerState.clip || trainerState.answered && trainerState.round > ROUND_TOTAL) return;
      stopActiveSource();
      const requestId = ++playRequestId;
      const context = await getAudioContext();
      const originalBuffer = await decodeClip(trainerState.clip);
      if(requestId !== playRequestId) return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      const isCorrectSlot = slot === trainerState.correctSlot;

      if(trainerState.gameId === "brighter-darker" && isCorrectSlot){
        const processed = await getBrightnessBuffer(
          trainerState.clip,
          originalBuffer,
          trainerState.target,
          trainerState.intensity
        );
        if(requestId !== playRequestId) return;
        source.buffer = processed.buffer;
        gain.gain.value = .78 * processed.compensation;
      }else if(trainerState.gameId === "louder-quieter"){
        source.buffer = originalBuffer;
        const halfDifference = trainerState.intensity / 2;
        const correctDb = trainerState.target === "louder" ? halfDifference : -halfDifference;
        const otherDb = -correctDb;
        gain.gain.value = .55 * dbToGain(isCorrectSlot ? correctDb : otherDb);
      }else{
        source.buffer = originalBuffer;
        gain.gain.value = .78;
      }

      source.connect(gain);
      gain.connect(context.destination);
      const fragmentDuration = Math.min(6, originalBuffer.duration);
      if(trainerState.segmentStart === null){
        const available = Math.max(0, originalBuffer.duration - fragmentDuration);
        trainerState.segmentStart = available ? Math.random() * available : 0;
        trainerState.segmentDuration = fragmentDuration;
      }
      source.onended = ()=>{
        if(requestId !== playRequestId || activeSource !== source) return;
        activeSource = null;
      };
      source.start(0, trainerState.segmentStart, trainerState.segmentDuration);
      activeSource = source;
      markSlotHeard(slot);
    }catch(error){
      showToast(error.message || "No se pudo reproducir el audio.");
    }
  }

  function markSlotHeard(slot){
    trainerState.heardSlots.add(slot);
    if(trainerState.heardSlots.size === 2 && !trainerState.decisionStartedAt){
      trainerState.decisionStartedAt = performance.now();
      startDecisionTimer();
    }
    updateDecisionStatus();
  }

  function updateDecisionStatus(){
    if(!trainer) return;
    const status = trainer.querySelector("[data-decision-status]");
    if(!status) return;
    if(trainerState.answered){
      const last = trainerState.responseTimes[trainerState.responseTimes.length - 1];
      status.textContent = Number.isFinite(last) ? `Tiempo de decisión: ${last.toFixed(1)} s` : "Respuesta registrada";
      status.className = "sg-decision-status is-complete";
      return;
    }
    if(trainerState.heardSlots.size < 2){
      const missing = ["A","B"].filter(value=>!trainerState.heardSlots.has(value)).join(" y ");
      status.textContent = trainerState.heardSlots.size === 0
        ? "Escucha A y B y elige tu respuesta."
        : `Puedes responder o escuchar ${missing} para comparar.`;
      status.className = "sg-decision-status";
      return;
    }
    const seconds = trainerState.decisionStartedAt ? (performance.now() - trainerState.decisionStartedAt) / 1000 : 0;
    status.textContent = `Decide ahora · ${seconds.toFixed(1)} s`;
    status.className = "sg-decision-status is-timing";
  }

  function startDecisionTimer(){
    stopDecisionTimer();
    updateDecisionStatus();
    decisionTimer = window.setInterval(updateDecisionStatus, 100);
  }

  function stopDecisionTimer(){
    if(decisionTimer) window.clearInterval(decisionTimer);
    decisionTimer = 0;
  }

  function getSpeedPercent(seconds){
    if(seconds <= 2.5) return 1;
    if(seconds <= 5) return .8;
    if(seconds <= 8) return .55;
    if(seconds <= 12) return .25;
    return 0;
  }

  async function getBrightnessBuffer(clip, originalBuffer, target, amount){
    const key = `${clip.id}:${target}:${amount}`;
    if(processedBuffers.has(key)) return processedBuffers.get(key);

    const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if(!OfflineCtor) return {buffer: originalBuffer, compensation: 1};

    const offline = new OfflineCtor(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );
    const source = offline.createBufferSource();
    const shelf = offline.createBiquadFilter();
    source.buffer = originalBuffer;
    shelf.type = "highshelf";
    shelf.frequency.value = 3000;
    shelf.gain.value = target === "bright" ? amount : -amount;
    source.connect(shelf);
    shelf.connect(offline.destination);
    source.start();

    const rendered = await offline.startRendering();
    const dryRms = measureRms(originalBuffer);
    const processedRms = measureRms(rendered);
    const compensation = Math.max(.58, Math.min(1.65, dryRms / Math.max(processedRms, .000001)));
    const result = {buffer: rendered, compensation};
    processedBuffers.set(key, result);
    return result;
  }

  function measureRms(buffer){
    let sum = 0;
    let samples = 0;
    const step = 32;
    for(let channel=0; channel<buffer.numberOfChannels; channel++){
      const data = buffer.getChannelData(channel);
      for(let i=0; i<data.length; i+=step){
        sum += data[i] * data[i];
        samples += 1;
      }
    }
    return Math.sqrt(sum / Math.max(samples, 1));
  }

  function dbToGain(db){
    return Math.pow(10, db / 20);
  }

  function formatDb(value){
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  async function playGameStartSound(){
    try{
      const context = await getAudioContext();
      const now = context.currentTime;
      const master = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3400, now);
      master.gain.setValueAtTime(.0001, now);
      master.gain.exponentialRampToValueAtTime(.045, now + .012);
      master.gain.setValueAtTime(.045, now + .34);
      master.gain.exponentialRampToValueAtTime(.0001, now + .50);
      master.connect(filter);
      filter.connect(context.destination);

      [
        {frequency:587.33, offset:0, duration:.11},
        {frequency:880, offset:.075, duration:.12},
        {frequency:1174.66, offset:.15, duration:.13},
        {frequency:1760, offset:.235, duration:.22}
      ].forEach(note=>{
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const startsAt = now + note.offset;
        const endsAt = startsAt + note.duration;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(note.frequency, startsAt);
        envelope.gain.setValueAtTime(.0001, startsAt);
        envelope.gain.exponentialRampToValueAtTime(1, startsAt + .006);
        envelope.gain.setValueAtTime(.72, Math.max(startsAt + .008, endsAt - .035));
        envelope.gain.exponentialRampToValueAtTime(.0001, endsAt);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(startsAt);
        oscillator.stop(endsAt + .01);
      });
    }catch(_){ }
  }

  async function playCorrectSound(){
    try{
      const context = await getAudioContext();
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(.0001, now);
      master.gain.exponentialRampToValueAtTime(.065, now + .012);
      master.gain.exponentialRampToValueAtTime(.0001, now + .52);
      master.connect(context.destination);

      [
        {frequency:659.25, offset:0, duration:.30, level:.72},
        {frequency:987.77, offset:.075, duration:.38, level:1}
      ].forEach(tone=>{
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const startsAt = now + tone.offset;
        const endsAt = startsAt + tone.duration;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(tone.frequency, startsAt);
        oscillator.frequency.exponentialRampToValueAtTime(tone.frequency * 1.012, endsAt);
        envelope.gain.setValueAtTime(.0001, startsAt);
        envelope.gain.exponentialRampToValueAtTime(tone.level, startsAt + .018);
        envelope.gain.exponentialRampToValueAtTime(.0001, endsAt);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(startsAt);
        oscillator.stop(endsAt + .02);
      });
    }catch(_){ }
  }

  async function playWrongSound(){
    try{
      const context = await getAudioContext();
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(.0001, now);
      master.gain.exponentialRampToValueAtTime(.055, now + .008);
      master.gain.exponentialRampToValueAtTime(.0001, now + .30);
      master.connect(context.destination);

      [
        {frequency:82.41, level:.72},
        {frequency:164.81, level:1},
        {frequency:246.94, level:.42}
      ].forEach(tone=>{
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(tone.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(tone.frequency * .92, now + .27);
        envelope.gain.setValueAtTime(.0001, now);
        envelope.gain.exponentialRampToValueAtTime(tone.level, now + .009);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + .28);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now);
        oscillator.stop(now + .30);
      });
    }catch(_){ }
  }

  function stopActiveSource(){
    playRequestId += 1;
    if(!activeSource) return;
    try{ activeSource.stop(); }catch(_){ }
    activeSource.disconnect?.();
    activeSource = null;
  }

  function answer(slot){
    if(trainerState.answered || trainerState.transitioning) return;
    trainerState.answered = true;
    stopActiveSource();
    stopDecisionTimer();

    const responseTime = trainerState.decisionStartedAt
      ? Math.max(0, (performance.now() - trainerState.decisionStartedAt) / 1000)
      : 0;
    trainerState.responseTimes.push(responseTime);

    const correct = slot === trainerState.correctSlot;
    if(correct){
      trainerState.score += 1;
      trainerState.roundPoints += 70 + Math.round(30 * getSpeedPercent(responseTime));
      playCorrectSound();
    }else{
      playWrongSound();
    }

    trainer.querySelectorAll(".sg-answer").forEach(button=>{
      button.disabled = true;
      if(button.dataset.answerSlot === trainerState.correctSlot) button.classList.add("correct");
      if(button.dataset.answerSlot === slot && !correct) button.classList.add("wrong");
    });

    const config = GAME_CONFIG[trainerState.gameId];
    const targetWord = config.targetWord(trainerState.target);
    const levelDetail = trainerState.gameId === "louder-quieter"
      ? ` La diferencia era de ${formatDb(trainerState.intensity)} dB.`
      : "";
    const feedback = trainer.querySelector("[data-feedback]");
    feedback.classList.add(correct ? "correct" : "wrong");
    feedback.textContent = correct
      ? `Correcto. ${trainerState.correctSlot} era la versión ${targetWord}.${levelDetail}`
      : `Incorrecto. La versión ${targetWord} era ${trainerState.correctSlot}.${levelDetail}`;
    trainer.querySelector("[data-score-label]").textContent = `Aciertos: ${trainerState.score}`;
    updateDecisionStatus();
    trainer.querySelector("[data-action='next-round']").classList.add("show");
  }

  function finishSession(){
    stopDecisionTimer();
    const responseTimes = trainerState.responseTimes.filter(Number.isFinite);
    const averageTime = responseTimes.length
      ? responseTimes.reduce((sum,value)=>sum+value,0) / responseTimes.length
      : Infinity;
    const accuracy = (trainerState.score / ROUND_TOTAL) * 100;
    const stars = trainerState.score >= 9 && averageTime <= 5
      ? 3
      : trainerState.score >= 8 && averageTime <= 8
        ? 2
        : trainerState.score >= 6 ? 1 : 0;
    const progress = readProgress();
    progress[trainerState.gameId] = Math.max(clampStars(progress[trainerState.gameId]), stars);
    writeProgress(progress);
    saveSessionStats(trainerState.gameId, {
      accuracy,
      averageTime,
      score: trainerState.roundPoints
    });
    render();

    const feedback = trainer.querySelector("[data-feedback]");
    feedback.className = "sg-feedback correct";
    feedback.textContent = `Sesión completada · ${getSessionRating(accuracy, averageTime)}`;
    const summary = trainer.querySelector("[data-session-summary]");
    summary.innerHTML = `
      <div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(averageTime) ? averageTime.toFixed(1) : "—"} s</strong></div>
      <div><span>Score</span><strong>${trainerState.roundPoints}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>
    `;
    summary.classList.add("show");
    trainer.querySelector("[data-action='next-round']").textContent = "Repetir";
    trainer.querySelector("[data-action='next-round']").classList.add("show");
    trainerState.round = 0;
    trainerState.score = 0;
    trainerState.clipDeck = buildClipDeck(trainerState.gameId);
    trainerState.responseTimes = [];
    trainerState.roundPoints = 0;
  }

  function getSessionRating(accuracy, averageTime){
    if(accuracy >= 90 && averageTime <= 5) return "Oído preciso y rápido";
    if(accuracy >= 80 && averageTime <= 8) return "Buen control auditivo";
    if(accuracy >= 60) return "Base completada";
    return "Sigue entrenando";
  }

  function saveSessionStats(gameId, session){
    const stats = readStats();
    const previous = stats[gameId] || {};
    const recent = Array.isArray(previous.recent) ? previous.recent.slice(-4) : [];
    recent.push({
      accuracy: Math.round(session.accuracy),
      averageTime: Number.isFinite(session.averageTime) ? Number(session.averageTime.toFixed(2)) : null,
      score: session.score,
      at: Date.now()
    });
    stats[gameId] = {
      bestAccuracy: Math.max(Number(previous.bestAccuracy) || 0, session.accuracy),
      bestAverageTime: Number.isFinite(session.averageTime)
        ? Math.min(Number(previous.bestAverageTime) || Infinity, session.averageTime)
        : previous.bestAverageTime ?? null,
      bestScore: Math.max(Number(previous.bestScore) || 0, session.score),
      sessions: (Number(previous.sessions) || 0) + 1,
      recent
    };
    writeStats(stats);
  }

  cards.forEach(card=>{
    card.addEventListener("click",async()=>{
      const id = card.dataset.game;
      localStorage.setItem(LAST_KEY, id);
      if(ACTIVE_GAMES.has(id)){
        try{
          await startGame(id);
        }catch(error){
          showToast(error.message || "No se pudo iniciar el juego.");
        }
        return;
      }
      render();
      card.animate?.([
        {transform:"scale(1)"},
        {transform:"scale(.985)"},
        {transform:"scale(1)"}
      ],{duration:180,easing:"ease-out"});
      showToast(`${card.dataset.title} seleccionado. Motor de audio pendiente para la próxima fase.`);
    });
  });

  window.SoundGymProgress = {
    get(){ return {...readProgress()}; },
    setStars(gameId, stars){
      const progress = readProgress();
      progress[gameId] = clampStars(stars);
      writeProgress(progress);
      render();
    },
    reset(){
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(LAST_KEY);
      localStorage.removeItem(STATS_KEY);
      render();
    }
  };

  render();
})();
