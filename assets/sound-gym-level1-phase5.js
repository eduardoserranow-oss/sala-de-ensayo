(function(){
  "use strict";

  const GAME_ID = "more-less-compressed";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const STATS_KEY = "myLessons.soundGym.stats.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL = 10;
  const TARGETS = ["more","less"];
  const TARGET_WORD = {more:"más comprimida",less:"menos comprimida"};
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
  const processed = new Map();
  let state = freshState();

  function freshState(){
    return {
      ready:false,
      round:0,
      score:0,
      answered:false,
      target:"more",
      correctSlot:"B",
      difficulty:0,
      clip:null,
      clipDeck:[],
      targetDeck:[],
      segmentStart:null,
      segmentDuration:0,
      heard:new Set(),
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
    const card=document.querySelector('[data-game="more-less-compressed"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.mlcLiveObserver==="1") return;
    card.dataset.mlcLiveObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-mlc-trainer";
    trainer.id="sgMoreLessCompressedTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head">
        <div>
          <span class="sg-trainer-kicker">Level 1 · Ear Basics</span>
          <h2>More or Less Compressed?</h2>
          <p>Compara A/B e identifica cuál versión tiene más o menos compresión.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-mlc-close aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span data-mlc-round>Pregunta 1 de 10</span>
        <span data-mlc-score>Aciertos: 0</span>
      </div>
      <div class="sg-question-stage" data-mlc-question-stage data-tone="louder" role="status" aria-live="polite">
        <span class="sg-question-alert">Nuevo objetivo</span>
        <div class="sg-question">
          <span>¿Cuál versión está</span>
          <strong data-mlc-target>MÁS COMPRIMIDA?</strong>
        </div>
      </div>
      <div class="sg-source-label" data-mlc-source>Fuente: cargando audio...</div>
      <div class="sg-source-label">Escucha el punch, los transientes, el sustain y la microdinámica. El nivel está compensado para que el volumen no revele la respuesta.</div>
      <div class="sg-decision-status" data-mlc-status>Escucha A y B para comparar.</div>
      <div class="sg-ab-grid">
        <button class="sg-ab-play" type="button" data-mlc-play="A"><span>A</span><strong>Escuchar A</strong></button>
        <button class="sg-ab-play" type="button" data-mlc-play="B"><span>B</span><strong>Escuchar B</strong></button>
      </div>
      <div class="sg-answer-grid">
        <button class="sg-answer" type="button" data-mlc-answer="A">A</button>
        <button class="sg-answer" type="button" data-mlc-answer="B">B</button>
      </div>
      <div class="sg-feedback" data-mlc-feedback></div>
      <div class="sg-session-summary" data-mlc-summary></div>
      <button class="sg-next" type="button" data-mlc-next>Siguiente</button>
    `;
    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);

    trainer.querySelector("[data-mlc-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-mlc-play]").forEach(button=>{
      button.addEventListener("click",()=>playSlot(button.dataset.mlcPlay));
    });
    trainer.querySelectorAll("[data-mlc-answer]").forEach(button=>{
      button.addEventListener("click",()=>answer(button.dataset.mlcAnswer));
    });
    trainer.querySelector("[data-mlc-next]")?.addEventListener("click",nextRound);
    return trainer;
  }

  function closeTrainer(){
    stopSource();
    stopDecisionTimer();
    trainer?.classList.remove("show");
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(node=>node.classList.remove("show"));
    playStartSound();
    ensureTrainer().classList.add("show");
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
    return shuffle(["more","less","more","less","more","less","more","less","more","less"]);
  }

  function pickClip(){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    return state.clipDeck.shift() || manifest?.clips?.[0];
  }

  function pickTarget(){
    if(!state.targetDeck.length) state.targetDeck=buildTargetDeck();
    return state.targetDeck.shift() || TARGETS[Math.floor(Math.random()*TARGETS.length)];
  }

  function difficultyForRound(round){
    if(round<=3) return 0;
    if(round<=6) return 1;
    if(round<=8) return 2;
    return 3;
  }

  function compressorPair(level){
    if(level===0){
      return {
        more:{threshold:-30,knee:4,ratio:10,attack:.003,release:.16},
        less:{threshold:-5,knee:28,ratio:1.15,attack:.035,release:.32}
      };
    }
    if(level===1){
      return {
        more:{threshold:-25,knee:6,ratio:7,attack:.004,release:.17},
        less:{threshold:-9,knee:24,ratio:1.45,attack:.028,release:.30}
      };
    }
    if(level===2){
      return {
        more:{threshold:-20,knee:8,ratio:4.5,attack:.006,release:.18},
        less:{threshold:-12,knee:20,ratio:1.8,attack:.020,release:.27}
      };
    }
    return {
      more:{threshold:-17,knee:10,ratio:3.2,attack:.008,release:.19},
      less:{threshold:-13,knee:16,ratio:2.15,attack:.014,release:.23}
    };
  }

  function difficultyLabel(level){
    return ["muy evidente","evidente","moderada","sutil"][level] || "sutil";
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
    state.correctSlot=Math.random()>.5?"A":"B";
    state.difficulty=difficultyForRound(state.round);
    state.segmentStart=null;
    state.segmentDuration=0;
    state.heard=new Set();
    state.decisionStartedAt=0;
    renderRound();
  }

  function renderRound(){
    trainer.querySelector("[data-mlc-round]").textContent=`Pregunta ${state.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-mlc-score]").textContent=`Aciertos: ${state.score}`;
    trainer.querySelector("[data-mlc-source]").textContent=state.clip?`Fuente: ${state.clip.title}`:"Fuente: cargando audio...";
    const stage=trainer.querySelector("[data-mlc-question-stage]");
    stage.dataset.tone=state.target==="more"?"louder":"quieter";
    trainer.querySelector("[data-mlc-target]").textContent=state.target==="more"?"MÁS COMPRIMIDA?":"MENOS COMPRIMIDA?";
    stage.classList.remove("is-entering");
    void stage.offsetWidth;
    stage.classList.add("is-entering");
    setTimeout(()=>stage.classList.remove("is-entering"),520);
    trainer.querySelector("[data-mlc-feedback]").className="sg-feedback";
    trainer.querySelector("[data-mlc-feedback]").textContent="";
    trainer.querySelector("[data-mlc-summary]").classList.remove("show");
    trainer.querySelector("[data-mlc-summary]").innerHTML="";
    const next=trainer.querySelector("[data-mlc-next]");
    next.textContent="Siguiente";
    next.classList.remove("show");
    trainer.querySelectorAll("[data-mlc-answer]").forEach(button=>{
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

  async function getCompressedBuffer(original,mode){
    const pair=compressorPair(state.difficulty);
    const settings=pair[mode];
    const key=`${state.clip.id}:${state.difficulty}:${mode}`;
    if(processed.has(key)) return processed.get(key);

    const OfflineCtor=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!OfflineCtor) return {buffer:original,compensation:1};

    const offline=new OfflineCtor(original.numberOfChannels,original.length,original.sampleRate);
    const source=offline.createBufferSource();
    const compressor=offline.createDynamicsCompressor();
    source.buffer=original;
    compressor.threshold.value=settings.threshold;
    compressor.knee.value=settings.knee;
    compressor.ratio.value=settings.ratio;
    compressor.attack.value=settings.attack;
    compressor.release.value=settings.release;
    source.connect(compressor);
    compressor.connect(offline.destination);
    source.start();

    const rendered=await offline.startRendering();
    const dry=measureRms(original);
    const wet=measureRms(rendered);
    const compensation=Math.max(.55,Math.min(1.75,dry/Math.max(wet,.000001)));
    const result={buffer:rendered,compensation};
    processed.set(key,result);
    return result;
  }

  function measureRms(buffer){
    let sum=0,samples=0;
    for(let channel=0;channel<buffer.numberOfChannels;channel++){
      const data=buffer.getChannelData(channel);
      for(let i=0;i<data.length;i+=32){
        sum+=data[i]*data[i];
        samples+=1;
      }
    }
    return Math.sqrt(sum/Math.max(samples,1));
  }

  async function playSlot(slot){
    try{
      if(!state.clip||state.answered) return;
      stopSource();
      const id=++requestId;
      const context=await getContext();
      const original=await decodeClip(state.clip);
      if(id!==requestId) return;

      const thisSlotIsCorrect=slot===state.correctSlot;
      const mode=thisSlotIsCorrect
        ? state.target
        : (state.target==="more"?"less":"more");
      const result=await getCompressedBuffer(original,mode);
      if(id!==requestId) return;

      const source=context.createBufferSource();
      const gain=context.createGain();
      source.buffer=result.buffer;
      gain.gain.value=.68*result.compensation;
      source.connect(gain);
      gain.connect(context.destination);

      const duration=Math.min(6,original.duration);
      if(state.segmentStart===null){
        const available=Math.max(0,original.duration-duration);
        state.segmentStart=available?Math.random()*available:0;
        state.segmentDuration=duration;
      }
      source.onended=()=>{if(activeSource===source) activeSource=null;};
      source.start(0,state.segmentStart,state.segmentDuration);
      activeSource=source;
      markHeard(slot);
    }catch(error){
      showToast(error.message||"No se pudo reproducir el audio.");
    }
  }

  function markHeard(slot){
    state.heard.add(slot);
    if(state.heard.size===2&&!state.decisionStartedAt){
      state.decisionStartedAt=performance.now();
      trainer.querySelectorAll("[data-mlc-answer]").forEach(button=>button.disabled=false);
      startDecisionTimer();
    }
    updateStatus();
  }

  function updateStatus(){
    const status=trainer?.querySelector("[data-mlc-status]");
    if(!status) return;
    if(state.answered){
      const last=state.responseTimes[state.responseTimes.length-1];
      status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";
      status.className="sg-decision-status is-complete";
      return;
    }
    if(state.heard.size<2){
      const missing=["A","B"].filter(value=>!state.heard.has(value)).join(" y ");
      status.textContent=state.heard.size===0?"Escucha A y B para comparar.":`Escucha ${missing} para completar la comparación.`;
      status.className="sg-decision-status";
      return;
    }
    const seconds=state.decisionStartedAt?(performance.now()-state.decisionStartedAt)/1000:0;
    status.textContent=`Decide ahora · ${seconds.toFixed(1)} s`;
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

  function answer(slot){
    if(state.answered||state.heard.size<2) return;
    state.answered=true;
    stopSource();
    stopDecisionTimer();
    const responseTime=state.decisionStartedAt?Math.max(0,(performance.now()-state.decisionStartedAt)/1000):0;
    state.responseTimes.push(responseTime);
    const correct=slot===state.correctSlot;
    if(correct){
      state.score+=1;
      state.points+=70+Math.round(30*speedPercent(responseTime));
      playCorrectSound();
    }else{
      playWrongSound();
    }

    trainer.querySelectorAll("[data-mlc-answer]").forEach(button=>{
      button.disabled=true;
      if(button.dataset.mlcAnswer===state.correctSlot) button.classList.add("correct");
      if(button.dataset.mlcAnswer===slot&&!correct) button.classList.add("wrong");
    });

    const feedback=trainer.querySelector("[data-mlc-feedback]");
    const difficulty=difficultyLabel(state.difficulty);
    feedback.classList.add(correct?"correct":"wrong");
    feedback.textContent=correct
      ?`Correcto. ${state.correctSlot} era la versión ${TARGET_WORD[state.target]}. La diferencia era ${difficulty}.`
      :`Incorrecto. La versión ${TARGET_WORD[state.target]} era ${state.correctSlot}. La diferencia era ${difficulty}.`;
    trainer.querySelector("[data-mlc-score]").textContent=`Aciertos: ${state.score}`;
    updateStatus();
    trainer.querySelector("[data-mlc-next]").classList.add("show");
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

    const feedback=trainer.querySelector("[data-mlc-feedback]");
    feedback.className="sg-feedback correct";
    feedback.textContent=`Sesión completada · ${rating(accuracy,average)}`;
    const summary=trainer.querySelector("[data-mlc-summary]");
    summary.innerHTML=`
      <div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div>
      <div><span>Score</span><strong>${state.points}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>
    `;
    summary.classList.add("show");
    const next=trainer.querySelector("[data-mlc-next]");
    next.textContent="Repetir";
    next.classList.add("show");

    state.round=0;
    state.score=0;
    state.points=0;
    state.responseTimes=[];
    state.clipDeck=buildClipDeck();
    state.targetDeck=buildTargetDeck();
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
    if(accuracy>=90&&average<=5) return "Oyes la dinámica como un ingeniero";
    if(accuracy>=80&&average<=8) return "Muy buen control de punch y compresión";
    if(accuracy>=60) return "Ya reconoces cambios claros de dinámica";
    return "Sigue entrenando transientes, sustain y microdinámica";
  }

  async function playStartSound(){
    try{
      const context=await getContext();
      const now=context.currentTime;
      [587.33,880,1174.66].forEach((frequency,index)=>{
        const osc=context.createOscillator();
        const gain=context.createGain();
        const start=now+index*.075;
        osc.type="square";
        osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.035,start+.01);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
        osc.connect(gain);gain.connect(context.destination);
        osc.start(start);osc.stop(start+.17);
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
      osc.type="triangle";
      osc.frequency.setValueAtTime(164.81,now);
      osc.frequency.exponentialRampToValueAtTime(130,now+.25);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.045,now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.27);
      osc.connect(gain);gain.connect(context.destination);
      osc.start(now);osc.stop(now+.28);
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
    const card=event.target.closest?.('[data-game="more-less-compressed"]');
    if(!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startGame().catch(error=>showToast(error.message||"No se pudo iniciar More or Less Compressed?."));
  },true);

  markCardLive();
})();