(function(){
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const LAST_KEY = "myLessons.soundGym.lastGame.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const ACTIVE_GAME = "brighter-darker";
  const ROUND_TOTAL = 10;

  guardSession();

  const cards = [...document.querySelectorAll("[data-game]")];
  const progressFill = document.getElementById("sgProgressFill");
  const progressScore = document.getElementById("sgProgressScore");
  const toast = document.getElementById("sgToast");
  const shell = document.querySelector(".sg-shell");
  let toastTimer = 0;
  let audioContext = null;
  let activeSource = null;
  let audioManifest = null;
  let trainer = null;
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
      ready: false,
      round: 0,
      score: 0,
      answered: false,
      correctSlot: "A",
      target: "bright",
      clip: null,
      buffers: new Map()
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
    let total = 0;
    const levelTotals = {ear:0, engineer:0, studio:0};

    cards.forEach(card=>{
      const id = card.dataset.game;
      const level = card.dataset.level;
      const stars = clampStars(progress[id]);
      total += stars;
      if(levelTotals[level] !== undefined) levelTotals[level] += stars;
      renderStars(card, stars);
      card.dataset.starsValue = String(stars);
      card.classList.toggle("is-live", id === ACTIVE_GAME);
    });

    if(progressScore) progressScore.innerHTML = `<b>${total}</b> / 42 ★`;
    if(progressFill) progressFill.style.width = `${(total/42)*100}%`;

    Object.entries(levelTotals).forEach(([level,value])=>{
      const el = document.querySelector(`[data-level-score="${level}"]`);
      if(el) el.innerHTML = `<strong>${value}</strong> / ${levelMax[level]} ★`;
    });
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
          <h2>Brighter or Darker?</h2>
          <p>Compara A/B y decide cuál versión tiene más agudos o más graves.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-action="close-trainer" aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span data-round-label>Pregunta 1 de 10</span>
        <span data-score-label>Aciertos: 0</span>
      </div>
      <div class="sg-question" data-question>¿Cuál versión suena más brillante?</div>
      <div class="sg-source-label" data-source-label>Fuente: cargando audio...</div>
      <div class="sg-ab-grid">
        <button class="sg-ab-play" type="button" data-play-slot="A"><span>A</span><strong>Escuchar A</strong></button>
        <button class="sg-ab-play" type="button" data-play-slot="B"><span>B</span><strong>Escuchar B</strong></button>
      </div>
      <div class="sg-answer-grid">
        <button class="sg-answer" type="button" data-answer-slot="A">A</button>
        <button class="sg-answer" type="button" data-answer-slot="B">B</button>
      </div>
      <div class="sg-feedback" data-feedback></div>
      <button class="sg-next" type="button" data-action="next-round">Siguiente</button>
    `;
    const nav = document.querySelector(".sg-level-nav");
    shell.insertBefore(trainer, nav || shell.firstChild);

    trainer.querySelector("[data-action='close-trainer']")?.addEventListener("click",()=>{
      stopActiveSource();
      trainer.classList.remove("show");
    });
    trainer.querySelectorAll("[data-play-slot]").forEach(button=>{
      button.addEventListener("click",()=>playSlot(button.dataset.playSlot));
    });
    trainer.querySelectorAll("[data-answer-slot]").forEach(button=>{
      button.addEventListener("click",()=>answer(button.dataset.answerSlot));
    });
    trainer.querySelector("[data-action='next-round']")?.addEventListener("click",nextRound);
    return trainer;
  }

  async function startBrighterDarker(){
    localStorage.setItem(LAST_KEY, ACTIVE_GAME);
    ensureTrainer().classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});
    if(!audioManifest) await loadManifest();
    trainerState = createInitialTrainerState();
    trainerState.ready = true;
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

  function pickClip(){
    const clips = audioManifest?.clips || [];
    const preferred = clips.filter(clip=>["vocals","drums","percussion","bass","guitar","keys","full_mix"].includes(clip.category));
    return preferred[Math.floor(Math.random() * preferred.length)] || clips[0];
  }

  function pickTarget(){
    return Math.random() > .5 ? "bright" : "dark";
  }

  function nextRound(){
    stopActiveSource();
    if(!trainerState.ready) return;

    if(trainerState.round >= ROUND_TOTAL){
      finishSession();
      return;
    }

    trainerState.round += 1;
    trainerState.answered = false;
    trainerState.clip = pickClip();
    trainerState.target = pickTarget();
    trainerState.correctSlot = Math.random() > .5 ? "A" : "B";
    renderTrainer();
  }

  function renderTrainer(){
    if(!trainer) return;
    const targetWord = trainerState.target === "bright" ? "brillante" : "oscura";
    trainer.querySelector("[data-round-label]").textContent = `Pregunta ${trainerState.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-score-label]").textContent = `Aciertos: ${trainerState.score}`;
    trainer.querySelector("[data-question]").textContent = `¿Cuál versión suena más ${targetWord}?`;
    trainer.querySelector("[data-source-label]").textContent = trainerState.clip ? `Fuente: ${trainerState.clip.title}` : "Fuente: cargando audio...";
    trainer.querySelector("[data-feedback]").textContent = "";
    trainer.querySelector("[data-feedback]").className = "sg-feedback";
    trainer.querySelector("[data-action='next-round']").textContent = "Siguiente";
    trainer.querySelector("[data-action='next-round']").classList.remove("show");
    trainer.querySelectorAll(".sg-answer").forEach(button=>{
      button.disabled = false;
      button.classList.remove("correct","wrong");
    });
  }

  async function decodeClip(clip){
    if(trainerState.buffers.has(clip.id)) return trainerState.buffers.get(clip.id);
    const context = await getAudioContext();
    const url = `${audioManifest.basePath}${clip.file}`;
    const response = await fetch(url);
    if(!response.ok) throw new Error(`No se pudo cargar ${clip.file}.`);
    const arrayBuffer = clip.file.endsWith(".b64")
      ? base64ToArrayBuffer(await response.text())
      : await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    trainerState.buffers.set(clip.id, audioBuffer);
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
      if(!trainerState.clip || trainerState.answered && trainerState.round > ROUND_TOTAL) return;
      const context = await getAudioContext();
      const buffer = await decodeClip(trainerState.clip);
      stopActiveSource();

      const source = context.createBufferSource();
      source.buffer = buffer;

      const gain = context.createGain();
      gain.gain.value = .92;

      const isProcessed = slot === trainerState.correctSlot;
      if(isProcessed){
        connectProcessedChain(context, source, gain, trainerState.target);
      }else{
        source.connect(gain);
      }
      gain.connect(context.destination);
      source.start();
      activeSource = source;
    }catch(error){
      showToast(error.message || "No se pudo reproducir el audio.");
    }
  }

  function connectProcessedChain(context, source, destination, target){
    const low = context.createBiquadFilter();
    const high = context.createBiquadFilter();
    low.type = "lowshelf";
    high.type = "highshelf";

    if(target === "bright"){
      low.frequency.value = 220;
      low.gain.value = -3;
      high.frequency.value = 3600;
      high.gain.value = 8;
    }else{
      low.frequency.value = 180;
      low.gain.value = 6;
      high.frequency.value = 3200;
      high.gain.value = -7;
    }

    source.connect(low);
    low.connect(high);
    high.connect(destination);
  }

  function stopActiveSource(){
    if(!activeSource) return;
    try{ activeSource.stop(); }catch(_){ }
    activeSource.disconnect?.();
    activeSource = null;
  }

  function answer(slot){
    if(trainerState.answered) return;
    trainerState.answered = true;
    stopActiveSource();

    const correct = slot === trainerState.correctSlot;
    if(correct) trainerState.score += 1;

    trainer.querySelectorAll(".sg-answer").forEach(button=>{
      button.disabled = true;
      if(button.dataset.answerSlot === trainerState.correctSlot) button.classList.add("correct");
      if(button.dataset.answerSlot === slot && !correct) button.classList.add("wrong");
    });

    const targetWord = trainerState.target === "bright" ? "más brillante" : "más oscura";
    const feedback = trainer.querySelector("[data-feedback]");
    feedback.classList.add(correct ? "correct" : "wrong");
    feedback.textContent = correct
      ? `Correcto. ${trainerState.correctSlot} era la versión ${targetWord}.`
      : `Incorrecto. La versión ${targetWord} era ${trainerState.correctSlot}.`;
    trainer.querySelector("[data-score-label]").textContent = `Aciertos: ${trainerState.score}`;
    trainer.querySelector("[data-action='next-round']").classList.add("show");
  }

  function finishSession(){
    const stars = trainerState.score >= 9 ? 3 : trainerState.score >= 7 ? 2 : trainerState.score >= 5 ? 1 : 0;
    const progress = readProgress();
    progress[ACTIVE_GAME] = Math.max(clampStars(progress[ACTIVE_GAME]), stars);
    writeProgress(progress);
    render();

    const feedback = trainer.querySelector("[data-feedback]");
    feedback.className = "sg-feedback correct";
    feedback.textContent = `Sesión terminada: ${trainerState.score}/${ROUND_TOTAL}. Dominio ganado: ${stars}/3 estrellas.`;
    trainer.querySelector("[data-action='next-round']").textContent = "Repetir";
    trainer.querySelector("[data-action='next-round']").classList.add("show");
    trainerState.round = 0;
    trainerState.score = 0;
  }

  cards.forEach(card=>{
    card.addEventListener("click",async()=>{
      const id = card.dataset.game;
      localStorage.setItem(LAST_KEY, id);
      if(id === ACTIVE_GAME){
        try{
          await startBrighterDarker();
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
      render();
    }
  };

  render();
})();
