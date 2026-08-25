(function(){
  "use strict";

  const GAME_ID = "left-center-right";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const STATS_KEY = "myLessons.soundGym.stats.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL = 10;
  const TARGETS = ["left","center","right"];
  const TARGET_LABEL = {left:"LEFT",center:"CENTER",right:"RIGHT"};
  const TARGET_WORD = {left:"a la izquierda",center:"en el centro",right:"a la derecha"};
  const COMPATIBLE_IDS = [
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext = null;
  let manifest = null;
  let trainer = null;
  let activeSource = null;
  let requestId = 0;
  let decisionTimer = 0;
  const decoded = new Map();
  const monoBuffers = new Map();
  let state = freshState();

  function freshState(){
    return {
      ready:false,
      round:0,
      score:0,
      answered:false,
      target:"center",
      pan:0,
      clip:null,
      clipDeck:[],
      targetDeck:[],
      segmentStart:null,
      segmentDuration:0,
      heard:false,
      decisionStartedAt:0,
      responseTimes:[],
      points:0
    };
  }

  function shuffle(values){
    const copy=[...values];
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function markCardLive(){
    const card=document.querySelector('[data-game="left-center-right"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.lcrLiveObserver==="1") return;
    card.dataset.lcrLiveObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-lcr-trainer";
    trainer.id="sgLeftCenterRightTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head">
        <div>
          <span class="sg-trainer-kicker">Level 1 · Ear Basics</span>
          <h2>Left / Center / Right</h2>
          <p>Escucha una fuente y ubícala en el campo estéreo. La posición se vuelve más sutil a medida que avanzas.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-lcr-close aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span data-lcr-round>Pregunta 1 de 10</span>
        <span data-lcr-score>Aciertos: 0</span>
      </div>
      <div class="sg-question-stage sg-lcr-question-stage" data-lcr-question-stage role="status" aria-live="polite">
        <span class="sg-question-alert">Ubicación estéreo</span>
        <div class="sg-question">
          <span>¿Dónde escuchas</span>
          <strong>LA FUENTE?</strong>
        </div>
      </div>
      <div class="sg-source-label" data-lcr-source>Fuente: cargando audio...</div>
      <div class="sg-source-label">Usa audífonos o monitores bien colocados. Concéntrate en la imagen estéreo, no en el volumen.</div>
      <div class="sg-lcr-field" aria-hidden="true">
        <span class="sg-lcr-field-label">L</span>
        <span class="sg-lcr-field-line"><i></i><i></i><i></i></span>
        <span class="sg-lcr-field-label">R</span>
      </div>
      <div class="sg-decision-status" data-lcr-status>Escucha la fuente antes de responder.</div>
      <button class="sg-lcr-listen" type="button" data-lcr-play>
        <span class="sg-lcr-listen-icon">▶</span>
        <strong>Escuchar fuente</strong>
      </button>
      <div class="sg-answer-grid sg-lcr-answer-grid">
        <button class="sg-answer" type="button" data-lcr-answer="left">LEFT</button>
        <button class="sg-answer" type="button" data-lcr-answer="center">CENTER</button>
        <button class="sg-answer" type="button" data-lcr-answer="right">RIGHT</button>
      </div>
      <div class="sg-lcr-note">LEFT = izquierda · CENTER = centro · RIGHT = derecha</div>
      <div class="sg-feedback" data-lcr-feedback></div>
      <div class="sg-session-summary" data-lcr-summary></div>
      <button class="sg-next" type="button" data-lcr-next>Siguiente</button>
    `;
    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);

    trainer.querySelector("[data-lcr-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelector("[data-lcr-play]")?.addEventListener("click",playSample);
    trainer.querySelectorAll("[data-lcr-answer]").forEach(button=>{
      button.addEventListener("click",()=>answer(button.dataset.lcrAnswer));
    });
    trainer.querySelector("[data-lcr-next]")?.addEventListener("click",nextRound);
    return trainer;
  }

  function closeTrainer(){
    stopSource();
    stopDecisionTimer();
    trainer?.classList.remove("show");
  }

  function clearOwnResult(){
    if(!trainer) return;
    trainer.classList.remove("is-session-complete");
    trainer.removeAttribute("data-sg-result-visible");
    trainer.querySelector(":scope > .sg-result-card")?.remove();
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(item=>{
      if(item!==trainer) item.classList.remove("show");
    });
    playStartSound();
    ensureTrainer();
    clearOwnResult();
    trainer.classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});
    if(!manifest) await loadManifest();
    state=freshState();
    state.ready=true;
    state.clipDeck=buildClipDeck();
    state.targetDeck=buildTargetDeck();
    nextRound();
  }

  async function loadManifest(){
    const response=await fetch(MANIFEST_URL,{cache:"force-cache"});
    if(!response.ok) throw new Error("No se pudo cargar el audio de Sound Gym.");
    manifest=await response.json();
  }

  function buildClipDeck(){
    const clips=manifest?.clips||[];
    return shuffle(COMPATIBLE_IDS.map(id=>clips.find(clip=>clip.id===id)).filter(Boolean));
  }

  function buildTargetDeck(){
    return shuffle(["left","center","right","left","right","center","left","center","right","center"]);
  }

  function pickClip(){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    return state.clipDeck.shift() || manifest?.clips?.[0];
  }

  function pickTarget(){
    if(!state.targetDeck.length) state.targetDeck=buildTargetDeck();
    return state.targetDeck.shift() || TARGETS[Math.floor(Math.random()*TARGETS.length)];
  }

  function getPan(target,round){
    if(target==="center") return 0;
    const distance=round<=3?.9:round<=6?.65:round<=8?.42:.24;
    return target==="left"?-distance:distance;
  }

  function nextRound(){
    stopSource();
    stopDecisionTimer();
    if(!state.ready) return;
    if(state.round>=ROUND_TOTAL){
      finishSession();
      return;
    }
    state.round+=1;
    state.answered=false;
    state.clip=pickClip();
    state.target=pickTarget();
    state.pan=getPan(state.target,state.round);
    state.segmentStart=null;
    state.segmentDuration=0;
    state.heard=false;
    state.decisionStartedAt=0;
    renderRound();
  }

  function renderRound(){
    trainer.querySelector("[data-lcr-round]").textContent=`Pregunta ${state.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-lcr-score]").textContent=`Aciertos: ${state.score}`;
    trainer.querySelector("[data-lcr-source]").textContent=state.clip?`Fuente: ${state.clip.title}`:"Fuente: cargando audio...";
    const stage=trainer.querySelector("[data-lcr-question-stage]");
    stage.classList.remove("is-entering");
    void stage.offsetWidth;
    stage.classList.add("is-entering");
    setTimeout(()=>stage.classList.remove("is-entering"),520);
    trainer.querySelector("[data-lcr-feedback]").className="sg-feedback";
    trainer.querySelector("[data-lcr-feedback]").textContent="";
    trainer.querySelector("[data-lcr-summary]").classList.remove("show");
    trainer.querySelector("[data-lcr-summary]").innerHTML="";
    const next=trainer.querySelector("[data-lcr-next]");
    next.textContent="Siguiente";
    next.classList.remove("show");
    const listen=trainer.querySelector("[data-lcr-play]");
    listen.classList.remove("is-playing");
    trainer.querySelectorAll("[data-lcr-answer]").forEach(button=>{
      button.disabled=true;
      button.classList.remove("correct","wrong");
    });
    updateStatus();
  }

  async function getContext(){
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor) throw new Error("Este navegador no soporta Web Audio.");
    if(!audioContext) audioContext=new Ctor();
    if(audioContext.state==="suspended") await audioContext.resume();
    return audioContext;
  }

  async function decodeClip(clip){
    if(decoded.has(clip.id)) return decoded.get(clip.id);
    const context=await getContext();
    const response=await fetch(`${manifest.basePath}${clip.file}`);
    if(!response.ok) throw new Error(`No se pudo cargar ${clip.file}.`);
    let arrayBuffer;
    if(clip.file.endsWith(".b64")){
      const binary=atob((await response.text()).trim());
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      arrayBuffer=bytes.buffer;
    }else{
      arrayBuffer=await response.arrayBuffer();
    }
    const buffer=await context.decodeAudioData(arrayBuffer);
    decoded.set(clip.id,buffer);
    return buffer;
  }

  async function getMonoBuffer(clip){
    if(monoBuffers.has(clip.id)) return monoBuffers.get(clip.id);
    const context=await getContext();
    const original=await decodeClip(clip);
    if(original.numberOfChannels===1){
      monoBuffers.set(clip.id,original);
      return original;
    }
    const mono=context.createBuffer(1,original.length,original.sampleRate);
    const output=mono.getChannelData(0);
    const channels=[];
    for(let c=0;c<original.numberOfChannels;c++) channels.push(original.getChannelData(c));
    const scale=1/channels.length;
    for(let i=0;i<original.length;i++){
      let sum=0;
      for(let c=0;c<channels.length;c++) sum+=channels[c][i];
      output[i]=sum*scale;
    }
    monoBuffers.set(clip.id,mono);
    return mono;
  }

  async function playSample(){
    try{
      if(!state.clip||state.answered) return;
      stopSource();
      const id=++requestId;
      const context=await getContext();
      const buffer=await getMonoBuffer(state.clip);
      if(id!==requestId) return;

      const source=context.createBufferSource();
      const gain=context.createGain();
      const panner=context.createStereoPanner?.();
      source.buffer=buffer;
      gain.gain.value=.72;
      source.connect(gain);

      if(panner){
        panner.pan.setValueAtTime(state.pan,context.currentTime);
        gain.connect(panner);
        panner.connect(context.destination);
      }else{
        gain.connect(context.destination);
      }

      const duration=Math.min(5.5,buffer.duration);
      if(state.segmentStart===null){
        const available=Math.max(0,buffer.duration-duration);
        state.segmentStart=available?Math.random()*available:0;
        state.segmentDuration=duration;
      }
      const listen=trainer.querySelector("[data-lcr-play]");
      listen.classList.add("is-playing");
      source.onended=()=>{
        if(activeSource===source) activeSource=null;
        listen.classList.remove("is-playing");
      };
      source.start(0,state.segmentStart,state.segmentDuration);
      activeSource=source;
      markHeard();
    }catch(error){
      showToast(error.message||"No se pudo reproducir el audio.");
    }
  }

  function markHeard(){
    if(!state.heard){
      state.heard=true;
      state.decisionStartedAt=performance.now();
      trainer.querySelectorAll("[data-lcr-answer]").forEach(button=>button.disabled=false);
      startDecisionTimer();
    }
    updateStatus();
  }

  function updateStatus(){
    const status=trainer?.querySelector("[data-lcr-status]");
    if(!status) return;
    if(state.answered){
      const last=state.responseTimes[state.responseTimes.length-1];
      status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";
      status.className="sg-decision-status is-complete";
      return;
    }
    if(!state.heard){
      status.textContent="Escucha la fuente antes de responder.";
      status.className="sg-decision-status";
      return;
    }
    const seconds=state.decisionStartedAt?(performance.now()-state.decisionStartedAt)/1000:0;
    status.textContent=`Ubícala en el estéreo · ${seconds.toFixed(1)} s`;
    status.className="sg-decision-status is-timing";
  }

  function startDecisionTimer(){
    stopDecisionTimer();
    decisionTimer=setInterval(updateStatus,100);
  }

  function stopDecisionTimer(){
    if(decisionTimer) clearInterval(decisionTimer);
    decisionTimer=0;
  }

  function stopSource(){
    requestId+=1;
    trainer?.querySelector("[data-lcr-play]")?.classList.remove("is-playing");
    if(!activeSource) return;
    try{activeSource.stop();}catch(_){ }
    activeSource.disconnect?.();
    activeSource=null;
  }

  function speedPercent(seconds){
    if(seconds<=2.5) return 1;
    if(seconds<=5) return .8;
    if(seconds<=8) return .55;
    if(seconds<=12) return .25;
    return 0;
  }

  function answer(target){
    if(state.answered||!state.heard) return;
    state.answered=true;
    stopSource();
    stopDecisionTimer();
    const responseTime=state.decisionStartedAt?Math.max(0,(performance.now()-state.decisionStartedAt)/1000):0;
    state.responseTimes.push(responseTime);
    const correct=target===state.target;
    if(correct){
      state.score+=1;
      state.points+=70+Math.round(30*speedPercent(responseTime));
      playCorrectSound();
    }else{
      playWrongSound();
    }
    trainer.querySelectorAll("[data-lcr-answer]").forEach(button=>{
      button.disabled=true;
      if(button.dataset.lcrAnswer===state.target) button.classList.add("correct");
      if(button.dataset.lcrAnswer===target&&!correct) button.classList.add("wrong");
    });
    const feedback=trainer.querySelector("[data-lcr-feedback]");
    feedback.classList.add(correct?"correct":"wrong");
    feedback.textContent=correct
      ?`Correcto. La fuente estaba ${TARGET_WORD[state.target]}.`
      :`Incorrecto. La fuente estaba ${TARGET_WORD[state.target]} (${TARGET_LABEL[state.target]}).`;
    trainer.querySelector("[data-lcr-score]").textContent=`Aciertos: ${state.score}`;
    updateStatus();
    trainer.querySelector("[data-lcr-next]").classList.add("show");
  }

  function finishSession(){
    stopDecisionTimer();
    const times=state.responseTimes.filter(Number.isFinite);
    const average=times.length?times.reduce((a,b)=>a+b,0)/times.length:Infinity;
    const accuracy=(state.score/ROUND_TOTAL)*100;
    const stars=state.score>=9&&average<=5?3:state.score>=8&&average<=8?2:state.score>=6?1:0;
    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0));
    const best=Math.max(previous,stars);
    progress[GAME_ID]=best;
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    saveStats(accuracy,average,state.points);
    if(window.SoundGymProgress?.setStars) window.SoundGymProgress.setStars(GAME_ID,best);
    markCardLive();

    const feedback=trainer.querySelector("[data-lcr-feedback]");
    feedback.className="sg-feedback correct";
    feedback.textContent=`Sesión completada · ${rating(accuracy,average)}`;
    const summary=trainer.querySelector("[data-lcr-summary]");
    summary.innerHTML=`
      <div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div>
      <div><span>Score</span><strong>${state.points}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>
    `;
    summary.classList.add("show");
    const next=trainer.querySelector("[data-lcr-next]");
    next.textContent="Repetir";
    next.classList.add("show");
    state.round=0;
    state.score=0;
    state.points=0;
    state.responseTimes=[];
    state.clipDeck=buildClipDeck();
    state.targetDeck=buildTargetDeck();
    state.heard=false;
  }

  function readJson(key){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||"{}");
      return parsed&&typeof parsed==="object"?parsed:{};
    }catch(_){return {};}
  }

  function saveStats(accuracy,average,score){
    const stats=readJson(STATS_KEY);
    const previous=stats[GAME_ID]||{};
    const recent=Array.isArray(previous.recent)?previous.recent.slice(-4):[];
    recent.push({accuracy:Math.round(accuracy),averageTime:Number.isFinite(average)?Number(average.toFixed(2)):null,score,at:Date.now()});
    stats[GAME_ID]={
      bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(average)?Math.min(Number(previous.bestAverageTime)||Infinity,average):(previous.bestAverageTime??null),
      bestScore:Math.max(Number(previous.bestScore)||0,score),
      sessions:(Number(previous.sessions)||0)+1,
      recent
    };
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
  }

  function rating(accuracy,average){
    if(accuracy>=90&&average<=5) return "Imagen estéreo muy precisa";
    if(accuracy>=80&&average<=8) return "Muy buen sentido de ubicación";
    if(accuracy>=60) return "Buena base estéreo";
    return "Sigue afinando tu panorama estéreo";
  }

  async function playStartSound(){
    try{
      const context=await getContext();
      const now=context.currentTime;
      [523.25,659.25,783.99].forEach((frequency,index)=>{
        const osc=context.createOscillator();
        const gain=context.createGain();
        const panner=context.createStereoPanner?.();
        const start=now+index*.075;
        osc.type="sine";
        osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.035,start+.01);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.17);
        osc.connect(gain);
        if(panner){
          panner.pan.value=index===0?-.65:index===1?0:.65;
          gain.connect(panner);panner.connect(context.destination);
        }else gain.connect(context.destination);
        osc.start(start);osc.stop(start+.18);
      });
    }catch(_){ }
  }

  async function playCorrectSound(){
    try{
      const context=await getContext();
      const now=context.currentTime;
      [659.25,987.77].forEach((frequency,index)=>{
        const osc=context.createOscillator();
        const gain=context.createGain();
        const start=now+index*.07;
        osc.type="sine";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.05,start+.015);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.32);
        osc.connect(gain);gain.connect(context.destination);
        osc.start(start);osc.stop(start+.34);
      });
    }catch(_){ }
  }

  async function playWrongSound(){
    try{
      const context=await getContext();
      const now=context.currentTime;
      const osc=context.createOscillator();
      const gain=context.createGain();
      osc.type="triangle";osc.frequency.setValueAtTime(164.81,now);osc.frequency.exponentialRampToValueAtTime(130,now+.25);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.27);
      osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.28);
    }catch(_){ }
  }

  function showToast(message){
    const toast=document.getElementById("sgToast");
    if(!toast) return;
    toast.textContent=message;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),2300);
  }

  document.addEventListener("click",event=>{
    const card=event.target.closest?.('[data-game="left-center-right"]');
    if(!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startGame().catch(error=>showToast(error.message||"No se pudo iniciar Left / Center / Right."));
  },true);

  markCardLive();
})();
