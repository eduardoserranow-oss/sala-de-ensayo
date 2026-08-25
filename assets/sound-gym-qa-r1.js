(function(){
  "use strict";

  const PATCHED_GAMES = new Set(["bass-mid-treble","left-center-right","more-less-compressed"]);
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const STATS_KEY = "myLessons.soundGym.stats.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL = 10;
  const COMPATIBLE_IDS = [
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext = null;
  let manifest = null;
  let activeSource = null;
  let activeRequestId = 0;
  const decoded = new Map();
  const monoBuffers = new Map();
  const eqProcessed = new Map();
  const compressedProcessed = new Map();

  const trainers = {};
  const bmt = freshBmt();
  const lcr = freshLcr();
  const mlc = freshMlc();

  function shuffle(values){
    const copy=[...values];
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function readJson(key){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||"{}");
      return parsed&&typeof parsed==="object"?parsed:{};
    }catch(_){return {};}
  }

  function saveGameResult(gameId,accuracy,average,score,stars){
    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[gameId])||0));
    const best=Math.max(previous,stars);
    progress[gameId]=best;
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));

    const stats=readJson(STATS_KEY);
    const previousStats=stats[gameId]||{};
    const recent=Array.isArray(previousStats.recent)?previousStats.recent.slice(-4):[];
    recent.push({
      accuracy:Math.round(accuracy),
      averageTime:Number.isFinite(average)?Number(average.toFixed(2)):null,
      score,
      at:Date.now()
    });
    stats[gameId]={
      bestAccuracy:Math.max(Number(previousStats.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(average)
        ?Math.min(Number(previousStats.bestAverageTime)||Infinity,average)
        :(previousStats.bestAverageTime??null),
      bestScore:Math.max(Number(previousStats.bestScore)||0,score),
      sessions:(Number(previousStats.sessions)||0)+1,
      recent
    };
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
    window.SoundGymProgress?.setStars?.(gameId,best);
    document.querySelector(`[data-game="${gameId}"]`)?.classList.add("is-live");
    return best;
  }

  function starsFor(score,average){
    return score>=9&&average<=5?3:score>=8&&average<=8?2:score>=6?1:0;
  }

  function closeOtherTrainers(current){
    document.querySelectorAll(".sg-trainer.show").forEach(node=>{
      if(node!==current) node.classList.remove("show");
    });
  }

  function clearResultCard(trainer){
    if(!trainer) return;
    trainer.classList.remove("is-session-complete");
    trainer.removeAttribute("data-sg-result-visible");
    trainer.querySelector(":scope > .sg-result-card")?.remove();
  }

  async function getContext(){
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor) throw new Error("Este navegador no soporta Web Audio.");
    if(!audioContext) audioContext=new Ctor();
    if(audioContext.state==="suspended") await audioContext.resume();
    return audioContext;
  }

  async function loadManifest(){
    if(manifest) return manifest;
    const response=await fetch(MANIFEST_URL,{cache:"force-cache"});
    if(!response.ok) throw new Error("No se pudo cargar el audio de Sound Gym.");
    manifest=await response.json();
    return manifest;
  }

  function buildClipDeck(){
    const clips=manifest?.clips||[];
    return shuffle(COMPATIBLE_IDS.map(id=>clips.find(clip=>clip.id===id)).filter(Boolean));
  }

  function pickClip(state){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    return state.clipDeck.shift() || manifest?.clips?.[0];
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

  function stopSource(){
    activeRequestId+=1;
    if(!activeSource) return;
    try{activeSource.stop();}catch(_){ }
    try{activeSource.disconnect();}catch(_){ }
    activeSource=null;
  }

  function showToast(message){
    const toast=document.getElementById("sgToast");
    if(!toast) return;
    toast.textContent=message;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),2300);
  }

  function formatFrequency(hz){
    if(hz>=1000){
      const value=hz/1000;
      return `${Number.isInteger(value)?value:value.toFixed(1)} kHz`;
    }
    return `${hz} Hz`;
  }

  function formatPan(pan){
    const value=Math.max(-1,Math.min(1,Number(pan)||0));
    if(Math.abs(value)<.0005) return "0.000 Center";
    return `${Math.abs(value).toFixed(3)} ${value<0?"Left":"Right"}`;
  }

  function startDecisionTimer(state,update){
    stopDecisionTimer(state);
    state.decisionTimer=setInterval(update,100);
  }

  function stopDecisionTimer(state){
    if(state.decisionTimer) clearInterval(state.decisionTimer);
    state.decisionTimer=0;
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
        osc.type="sine";
        osc.frequency.value=frequency;
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

  function baseTrainerHtml({kicker,title,description,closeAttr,roundAttr,scoreAttr,body,nextAttr}){
    return `
      <div class="sg-trainer-head">
        <div>
          <span class="sg-trainer-kicker">${kicker}</span>
          <h2>${title}</h2>
          <p>${description}</p>
        </div>
        <button class="sg-trainer-close" type="button" ${closeAttr} aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span ${roundAttr}>Pregunta 1 de 10</span>
        <span ${scoreAttr}>Aciertos: 0</span>
      </div>
      ${body}
      <button class="sg-next" type="button" ${nextAttr}>Siguiente</button>
    `;
  }

  function freshBmt(){
    return {
      ready:false,round:0,score:0,points:0,answered:false,
      target:"bass",amount:10,direction:1,center:140,clip:null,clipDeck:[],targetDeck:[],
      segmentStart:null,segmentDuration:0,heard:new Set(),decisionStartedAt:0,responseTimes:[],decisionTimer:0
    };
  }

  function resetBmt(){ Object.assign(bmt,freshBmt()); }

  function ensureBmtTrainer(){
    if(trainers.bmt) return trainers.bmt;
    const trainer=document.createElement("section");
    trainer.className="sg-trainer sg-bmt-trainer sg-qa-trainer";
    trainer.id="sgBassMidTrebleTrainerQa";
    trainer.innerHTML=baseTrainerHtml({
      kicker:"Level 1 · Ear Basics",
      title:"Bass / Mid / Treble",
      description:"Compara la referencia con la versión modificada e identifica en qué zona del espectro ocurrió el cambio.",
      closeAttr:"data-qabmt-close",
      roundAttr:"data-qabmt-round",
      scoreAttr:"data-qabmt-score",
      nextAttr:"data-qabmt-next",
      body:`
        <div class="sg-question-stage" data-qabmt-question-stage role="status" aria-live="polite">
          <span class="sg-question-alert">Nuevo objetivo</span>
          <div class="sg-question"><span>¿Qué zona del espectro</span><strong>FUE MODIFICADA?</strong></div>
        </div>
        <div class="sg-source-label" data-qabmt-source>Fuente: cargando audio...</div>
        <div class="sg-source-label">Haz una predicción completa: región, frecuencia aproximada y si el cambio fue un aumento o una reducción.</div>
        <div class="sg-decision-status" data-qabmt-status>Escucha la referencia y la versión modificada.</div>
        <div class="sg-ab-grid sg-bmt-reference-grid">
          <button class="sg-ab-play" type="button" data-qabmt-play="A"><span>A</span><strong>Referencia</strong></button>
          <button class="sg-ab-play" type="button" data-qabmt-play="B"><span>B</span><strong>Modificada</strong></button>
        </div>
        <div class="sg-answer-grid sg-bmt-answer-grid">
          <button class="sg-answer" type="button" data-qabmt-answer="bass">BASS</button>
          <button class="sg-answer" type="button" data-qabmt-answer="mid">MID</button>
          <button class="sg-answer" type="button" data-qabmt-answer="treble">TREBLE</button>
        </div>
        <div class="sg-bmt-note">BASS = graves · MID = medios · TREBLE = agudos</div>
        <div class="sg-feedback sg-qa-feedback" data-qabmt-feedback></div>
        <div class="sg-session-summary" data-qabmt-summary></div>
      `
    });
    document.querySelector(".sg-shell")?.insertBefore(trainer,document.querySelector(".sg-level-nav")||null);
    trainer.querySelector("[data-qabmt-close]")?.addEventListener("click",()=>{
      stopSource();stopDecisionTimer(bmt);trainer.classList.remove("show");
    });
    trainer.querySelectorAll("[data-qabmt-play]").forEach(button=>button.addEventListener("click",()=>playBmtSlot(button.dataset.qabmtPlay)));
    trainer.querySelectorAll("[data-qabmt-answer]").forEach(button=>button.addEventListener("click",()=>answerBmt(button.dataset.qabmtAnswer)));
    trainer.querySelector("[data-qabmt-next]")?.addEventListener("click",nextBmtRound);
    trainers.bmt=trainer;
    return trainer;
  }

  function bmtAmount(round){
    if(round<=3) return 10;
    if(round<=6) return 8;
    if(round<=8) return 6;
    return 4;
  }

  function bmtCenter(target){
    const choices={bass:[110,150,190],mid:[700,1000,1600],treble:[4200,6000,8000]};
    const list=choices[target];
    return list[Math.floor(Math.random()*list.length)];
  }

  async function startBmt(){
    const trainer=ensureBmtTrainer();
    closeOtherTrainers(trainer);clearResultCard(trainer);playStartSound();
    trainer.classList.add("show");trainer.scrollIntoView({behavior:"smooth",block:"start"});
    await loadManifest();
    resetBmt();bmt.ready=true;bmt.clipDeck=buildClipDeck();
    bmt.targetDeck=shuffle(["bass","mid","treble","bass","mid","treble","bass","mid","treble","mid"]);
    nextBmtRound();
  }

  function nextBmtRound(){
    stopSource();stopDecisionTimer(bmt);
    if(!bmt.ready) return;
    if(bmt.round>=ROUND_TOTAL){finishBmt();return;}
    bmt.round+=1;bmt.answered=false;bmt.clip=pickClip(bmt);
    if(!bmt.targetDeck.length) bmt.targetDeck=shuffle(["bass","mid","treble"]);
    bmt.target=bmt.targetDeck.shift();
    bmt.amount=bmtAmount(bmt.round);bmt.direction=Math.random()>.5?1:-1;bmt.center=bmtCenter(bmt.target);
    bmt.segmentStart=null;bmt.segmentDuration=0;bmt.heard=new Set();bmt.decisionStartedAt=0;
    renderBmt();
  }

  function renderBmt(){
    const trainer=trainers.bmt;
    trainer.querySelector("[data-qabmt-round]").textContent=`Pregunta ${bmt.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-qabmt-score]").textContent=`Aciertos: ${bmt.score}`;
    trainer.querySelector("[data-qabmt-source]").textContent=bmt.clip?`Fuente: ${bmt.clip.title}`:"Fuente: cargando audio...";
    const feedback=trainer.querySelector("[data-qabmt-feedback]");feedback.className="sg-feedback sg-qa-feedback";feedback.innerHTML="";
    const summary=trainer.querySelector("[data-qabmt-summary]");summary.classList.remove("show");summary.innerHTML="";
    const next=trainer.querySelector("[data-qabmt-next]");next.textContent="Siguiente";next.classList.remove("show");
    trainer.querySelectorAll("[data-qabmt-answer]").forEach(button=>{button.disabled=true;button.classList.remove("correct","wrong");});
    updateBmtStatus();
  }

  async function getEqProcessed(original){
    const key=`${bmt.clip.id}:${bmt.target}:${bmt.amount}:${bmt.direction}:${bmt.center}`;
    if(eqProcessed.has(key)) return eqProcessed.get(key);
    const OfflineCtor=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!OfflineCtor) return {buffer:original,compensation:1};
    const offline=new OfflineCtor(original.numberOfChannels,original.length,original.sampleRate);
    const source=offline.createBufferSource();const filter=offline.createBiquadFilter();source.buffer=original;
    if(bmt.target==="bass"){filter.type="lowshelf";filter.frequency.value=bmt.center;}
    else if(bmt.target==="treble"){filter.type="highshelf";filter.frequency.value=bmt.center;}
    else{filter.type="peaking";filter.frequency.value=bmt.center;filter.Q.value=.85;}
    filter.gain.value=bmt.amount*bmt.direction;source.connect(filter);filter.connect(offline.destination);source.start();
    const rendered=await offline.startRendering();
    const compensation=Math.max(.62,Math.min(1.55,measureRms(original)/Math.max(measureRms(rendered),.000001)));
    const result={buffer:rendered,compensation};eqProcessed.set(key,result);return result;
  }

  async function playBmtSlot(slot){
    try{
      if(!bmt.clip||bmt.answered) return;
      stopSource();const id=++activeRequestId;const context=await getContext();const original=await decodeClip(bmt.clip);if(id!==activeRequestId) return;
      const source=context.createBufferSource();const gain=context.createGain();
      if(slot==="B"){
        const result=await getEqProcessed(original);if(id!==activeRequestId) return;source.buffer=result.buffer;gain.gain.value=.68*result.compensation;
      }else{source.buffer=original;gain.gain.value=.68;}
      source.connect(gain);gain.connect(context.destination);
      const duration=Math.min(6,original.duration);
      if(bmt.segmentStart===null){const available=Math.max(0,original.duration-duration);bmt.segmentStart=available?Math.random()*available:0;bmt.segmentDuration=duration;}
      source.onended=()=>{if(activeSource===source) activeSource=null;};
      source.start(0,bmt.segmentStart,bmt.segmentDuration);activeSource=source;
      bmt.heard.add(slot);
      if(bmt.heard.size===2&&!bmt.decisionStartedAt){bmt.decisionStartedAt=performance.now();trainers.bmt.querySelectorAll("[data-qabmt-answer]").forEach(button=>button.disabled=false);startDecisionTimer(bmt,updateBmtStatus);}
      updateBmtStatus();
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }

  function updateBmtStatus(){
    const status=trainers.bmt?.querySelector("[data-qabmt-status]");if(!status) return;
    if(bmt.answered){const last=bmt.responseTimes.at(-1);status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";status.className="sg-decision-status is-complete";return;}
    if(bmt.heard.size<2){status.textContent=bmt.heard.size===0?"Escucha la referencia y la versión modificada.":"Escucha la otra versión para poder responder.";status.className="sg-decision-status";return;}
    const seconds=(performance.now()-bmt.decisionStartedAt)/1000;status.textContent=`Identifica región, frecuencia y dirección · ${seconds.toFixed(1)} s`;status.className="sg-decision-status is-timing";
  }

  function answerBmt(target){
    if(bmt.answered||bmt.heard.size<2) return;bmt.answered=true;stopSource();stopDecisionTimer(bmt);
    const responseTime=bmt.decisionStartedAt?Math.max(0,(performance.now()-bmt.decisionStartedAt)/1000):0;bmt.responseTimes.push(responseTime);
    const correct=target===bmt.target;if(correct){bmt.score+=1;bmt.points+=100;playCorrectSound();}else playWrongSound();
    trainers.bmt.querySelectorAll("[data-qabmt-answer]").forEach(button=>{button.disabled=true;if(button.dataset.qabmtAnswer===bmt.target) button.classList.add("correct");if(button.dataset.qabmtAnswer===target&&!correct) button.classList.add("wrong");});
    const labels={bass:"BASS",mid:"MID",treble:"TREBLE"};const directionWord=bmt.direction>0?"Aumento":"Reducción";const sign=bmt.direction>0?"+":"−";
    const feedback=trainers.bmt.querySelector("[data-qabmt-feedback]");feedback.classList.add(correct?"correct":"wrong");
    feedback.innerHTML=`<strong>${correct?"Correcto":"Incorrecto"}. ${labels[bmt.target]}</strong><span>${formatFrequency(bmt.center)} · ${directionWord}: ${sign}${bmt.amount} dB</span>`;
    trainers.bmt.querySelector("[data-qabmt-score]").textContent=`Aciertos: ${bmt.score}`;updateBmtStatus();trainers.bmt.querySelector("[data-qabmt-next]").classList.add("show");
  }

  function finishBmt(){
    stopDecisionTimer(bmt);const times=bmt.responseTimes.filter(Number.isFinite);const average=times.length?times.reduce((a,c)=>a+c,0)/times.length:Infinity;const accuracy=bmt.score/ROUND_TOTAL*100;const stars=starsFor(bmt.score,average);saveGameResult("bass-mid-treble",accuracy,average,bmt.points,stars);
    const feedback=trainers.bmt.querySelector("[data-qabmt-feedback]");feedback.className="sg-feedback sg-qa-feedback correct";feedback.textContent="Sesión completada · Región, frecuencia y dirección entrenadas.";
    const summary=trainers.bmt.querySelector("[data-qabmt-summary]");summary.innerHTML=`<div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div><div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div><div><span>Score</span><strong>${bmt.points}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");
    const next=trainers.bmt.querySelector("[data-qabmt-next]");next.textContent="Repetir";next.classList.add("show");
    bmt.round=0;bmt.score=0;bmt.points=0;bmt.responseTimes=[];bmt.clipDeck=buildClipDeck();
  }

  function freshMlc(){
    return {ready:false,round:0,score:0,points:0,answered:false,target:"more",correctSlot:"B",slotMode:{A:"less",B:"more"},lessGr:2,moreGr:8,deltaGr:6,clip:null,clipDeck:[],targetDeck:[],segmentStart:null,segmentDuration:0,heard:new Set(),decisionStartedAt:0,responseTimes:[],decisionTimer:0};
  }
  function resetMlc(){Object.assign(mlc,freshMlc());}
  const MLC_DELTAS=[6,5,4,3,2.5,2,1.5,1,.75,.5];

  function ensureMlcTrainer(){
    if(trainers.mlc) return trainers.mlc;
    const trainer=document.createElement("section");trainer.className="sg-trainer sg-mlc-trainer sg-qa-trainer";trainer.id="sgMoreLessCompressedTrainerQa";
    trainer.innerHTML=baseTrainerHtml({
      kicker:"Level 1 · Ear Basics",title:"More or Less Compressed?",description:"Compara A/B e identifica cuál versión tiene más o menos compresión. La diferencia se vuelve más pequeña en cada pregunta.",closeAttr:"data-qamlc-close",roundAttr:"data-qamlc-round",scoreAttr:"data-qamlc-score",nextAttr:"data-qamlc-next",
      body:`
        <div class="sg-question-stage" data-qamlc-stage data-tone="louder" role="status" aria-live="polite"><span class="sg-question-alert">Nuevo objetivo</span><div class="sg-question"><span>¿Cuál versión está</span><strong data-qamlc-target>MÁS COMPRIMIDA?</strong></div></div>
        <div class="sg-source-label" data-qamlc-source>Fuente: cargando audio...</div>
        <div class="sg-source-label">Escucha punch, transientes, sustain y microdinámica. A y B quedan compensadas en nivel para que el volumen no revele la respuesta.</div>
        <div class="sg-decision-status" data-qamlc-status>Escucha A y B para comparar.</div>
        <div class="sg-ab-grid"><button class="sg-ab-play" type="button" data-qamlc-play="A"><span>A</span><strong>Escuchar A</strong></button><button class="sg-ab-play" type="button" data-qamlc-play="B"><span>B</span><strong>Escuchar B</strong></button></div>
        <div class="sg-answer-grid"><button class="sg-answer" type="button" data-qamlc-answer="A">A</button><button class="sg-answer" type="button" data-qamlc-answer="B">B</button></div>
        <div class="sg-feedback sg-qa-feedback" data-qamlc-feedback></div><div class="sg-session-summary" data-qamlc-summary></div>
      `
    });
    document.querySelector(".sg-shell")?.insertBefore(trainer,document.querySelector(".sg-level-nav")||null);
    trainer.querySelector("[data-qamlc-close]")?.addEventListener("click",()=>{stopSource();stopDecisionTimer(mlc);trainer.classList.remove("show");});
    trainer.querySelectorAll("[data-qamlc-play]").forEach(button=>button.addEventListener("click",()=>playMlcSlot(button.dataset.qamlcPlay)));
    trainer.querySelectorAll("[data-qamlc-answer]").forEach(button=>button.addEventListener("click",()=>answerMlc(button.dataset.qamlcAnswer)));
    trainer.querySelector("[data-qamlc-next]")?.addEventListener("click",nextMlcRound);trainers.mlc=trainer;return trainer;
  }

  async function startMlc(){
    const trainer=ensureMlcTrainer();closeOtherTrainers(trainer);clearResultCard(trainer);playStartSound();trainer.classList.add("show");trainer.scrollIntoView({behavior:"smooth",block:"start"});await loadManifest();
    resetMlc();mlc.ready=true;mlc.clipDeck=buildClipDeck();mlc.targetDeck=shuffle(["more","less","more","less","more","less","more","less","more","less"]);nextMlcRound();
  }

  function nextMlcRound(){
    stopSource();stopDecisionTimer(mlc);if(!mlc.ready) return;if(mlc.round>=ROUND_TOTAL){finishMlc();return;}
    mlc.round+=1;mlc.answered=false;mlc.clip=pickClip(mlc);if(!mlc.targetDeck.length) mlc.targetDeck=shuffle(["more","less"]);mlc.target=mlc.targetDeck.shift();
    mlc.deltaGr=MLC_DELTAS[mlc.round-1];mlc.lessGr=2;mlc.moreGr=mlc.lessGr+mlc.deltaGr;
    const moreOnA=Math.random()>.5;mlc.slotMode=moreOnA?{A:"more",B:"less"}:{A:"less",B:"more"};mlc.correctSlot=mlc.target===mlc.slotMode.A?"A":"B";
    mlc.segmentStart=null;mlc.segmentDuration=0;mlc.heard=new Set();mlc.decisionStartedAt=0;renderMlc();
  }

  function renderMlc(){
    const trainer=trainers.mlc;trainer.querySelector("[data-qamlc-round]").textContent=`Pregunta ${mlc.round} de ${ROUND_TOTAL}`;trainer.querySelector("[data-qamlc-score]").textContent=`Aciertos: ${mlc.score}`;trainer.querySelector("[data-qamlc-source]").textContent=mlc.clip?`Fuente: ${mlc.clip.title}`:"Fuente: cargando audio...";
    const stage=trainer.querySelector("[data-qamlc-stage]");stage.dataset.tone=mlc.target==="more"?"louder":"quieter";trainer.querySelector("[data-qamlc-target]").textContent=mlc.target==="more"?"MÁS COMPRIMIDA?":"MENOS COMPRIMIDA?";
    const feedback=trainer.querySelector("[data-qamlc-feedback]");feedback.className="sg-feedback sg-qa-feedback";feedback.innerHTML="";const summary=trainer.querySelector("[data-qamlc-summary]");summary.classList.remove("show");summary.innerHTML="";const next=trainer.querySelector("[data-qamlc-next]");next.textContent="Siguiente";next.classList.remove("show");
    trainer.querySelectorAll("[data-qamlc-answer]").forEach(button=>{button.disabled=true;button.classList.remove("correct","wrong");});updateMlcStatus();
  }

  async function compressBufferToMaxGr(original,targetGrDb,cacheKey){
    if(compressedProcessed.has(cacheKey)) return compressedProcessed.get(cacheKey);
    const context=await getContext();const length=original.length;const channels=[];let peak=0;
    for(let c=0;c<original.numberOfChannels;c++){const data=original.getChannelData(c);channels.push(data);for(let i=0;i<length;i+=16) peak=Math.max(peak,Math.abs(data[i]));}
    peak=Math.max(peak,.0001);const threshold=Math.max(.00001,peak*.18);const envShape=new Float32Array(length);const attack=Math.exp(-1/(original.sampleRate*.004));const release=Math.exp(-1/(original.sampleRate*.14));let env=0,maxShape=0;
    for(let i=0;i<length;i++){
      let amp=0;for(let c=0;c<channels.length;c++) amp=Math.max(amp,Math.abs(channels[c][i]));const coef=amp>env?attack:release;env=coef*env+(1-coef)*amp;
      const over=env>threshold?Math.log10(Math.max(env/threshold,1)):0;const shaped=Math.pow(over,.72);envShape[i]=shaped;if(shaped>maxShape) maxShape=shaped;
    }
    maxShape=Math.max(maxShape,.000001);const output=context.createBuffer(original.numberOfChannels,length,original.sampleRate);
    for(let c=0;c<original.numberOfChannels;c++){
      const input=channels[c];const out=output.getChannelData(c);for(let i=0;i<length;i++){const gr=targetGrDb*(envShape[i]/maxShape);out[i]=input[i]*Math.pow(10,-gr/20);}
    }
    const compensation=Math.max(.55,Math.min(1.9,measureRms(original)/Math.max(measureRms(output),.000001)));const result={buffer:output,compensation,maxGr:targetGrDb};compressedProcessed.set(cacheKey,result);return result;
  }

  async function playMlcSlot(slot){
    try{
      if(!mlc.clip||mlc.answered) return;stopSource();const id=++activeRequestId;const context=await getContext();const original=await decodeClip(mlc.clip);if(id!==activeRequestId) return;
      const mode=mlc.slotMode[slot];const gr=mode==="more"?mlc.moreGr:mlc.lessGr;const result=await compressBufferToMaxGr(original,gr,`${mlc.clip.id}:qa:${gr}`);if(id!==activeRequestId) return;
      const source=context.createBufferSource();const gain=context.createGain();source.buffer=result.buffer;gain.gain.value=.68*result.compensation;source.connect(gain);gain.connect(context.destination);
      const duration=Math.min(6,original.duration);if(mlc.segmentStart===null){const available=Math.max(0,original.duration-duration);mlc.segmentStart=available?Math.random()*available:0;mlc.segmentDuration=duration;}
      source.onended=()=>{if(activeSource===source) activeSource=null;};source.start(0,mlc.segmentStart,mlc.segmentDuration);activeSource=source;mlc.heard.add(slot);
      if(mlc.heard.size===2&&!mlc.decisionStartedAt){mlc.decisionStartedAt=performance.now();trainers.mlc.querySelectorAll("[data-qamlc-answer]").forEach(button=>button.disabled=false);startDecisionTimer(mlc,updateMlcStatus);}updateMlcStatus();
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }

  function updateMlcStatus(){
    const status=trainers.mlc?.querySelector("[data-qamlc-status]");if(!status) return;if(mlc.answered){const last=mlc.responseTimes.at(-1);status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";status.className="sg-decision-status is-complete";return;}
    if(mlc.heard.size<2){const missing=["A","B"].filter(value=>!mlc.heard.has(value)).join(" y ");status.textContent=mlc.heard.size===0?"Escucha A y B para comparar.":`Escucha ${missing} para completar la comparación.`;status.className="sg-decision-status";return;}
    const seconds=(performance.now()-mlc.decisionStartedAt)/1000;status.textContent=`Decide ahora · diferencia de GR cada vez más pequeña · ${seconds.toFixed(1)} s`;status.className="sg-decision-status is-timing";
  }

  function answerMlc(slot){
    if(mlc.answered||mlc.heard.size<2) return;mlc.answered=true;stopSource();stopDecisionTimer(mlc);const responseTime=mlc.decisionStartedAt?Math.max(0,(performance.now()-mlc.decisionStartedAt)/1000):0;mlc.responseTimes.push(responseTime);
    const correct=slot===mlc.correctSlot;if(correct){mlc.score+=1;mlc.points+=100;playCorrectSound();}else playWrongSound();trainers.mlc.querySelectorAll("[data-qamlc-answer]").forEach(button=>{button.disabled=true;if(button.dataset.qamlcAnswer===mlc.correctSlot) button.classList.add("correct");if(button.dataset.qamlcAnswer===slot&&!correct) button.classList.add("wrong");});
    const aGr=mlc.slotMode.A==="more"?mlc.moreGr:mlc.lessGr;const bGr=mlc.slotMode.B==="more"?mlc.moreGr:mlc.lessGr;const feedback=trainers.mlc.querySelector("[data-qamlc-feedback]");feedback.classList.add(correct?"correct":"wrong");
    feedback.innerHTML=`<strong>${correct?"Correcto":"Incorrecto"}. ${mlc.correctSlot} era la versión ${mlc.target==="more"?"más":"menos"} comprimida.</strong><span>A: GR máx. ${aGr.toFixed(2).replace(/\.00$/,'')} dB · B: GR máx. ${bGr.toFixed(2).replace(/\.00$/,'')} dB · Diferencia: ${mlc.deltaGr.toFixed(2).replace(/\.00$/,'')} dB</span>`;
    trainers.mlc.querySelector("[data-qamlc-score]").textContent=`Aciertos: ${mlc.score}`;updateMlcStatus();trainers.mlc.querySelector("[data-qamlc-next]").classList.add("show");
  }

  function finishMlc(){
    stopDecisionTimer(mlc);const times=mlc.responseTimes.filter(Number.isFinite);const average=times.length?times.reduce((a,c)=>a+c,0)/times.length:Infinity;const accuracy=mlc.score/ROUND_TOTAL*100;const stars=starsFor(mlc.score,average);saveGameResult("more-less-compressed",accuracy,average,mlc.points,stars);
    const feedback=trainers.mlc.querySelector("[data-qamlc-feedback]");feedback.className="sg-feedback sg-qa-feedback correct";feedback.textContent="Sesión completada · Llegaste hasta una diferencia de 0.5 dB de GR máxima.";const summary=trainers.mlc.querySelector("[data-qamlc-summary]");summary.innerHTML=`<div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div><div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div><div><span>Score</span><strong>${mlc.points}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");const next=trainers.mlc.querySelector("[data-qamlc-next]");next.textContent="Repetir";next.classList.add("show");mlc.round=0;mlc.score=0;mlc.points=0;mlc.responseTimes=[];mlc.clipDeck=buildClipDeck();
  }

  function freshLcr(){
    return {ready:false,round:0,score:0,points:0,answered:false,clip:null,clipDeck:[],targetPan:0,selectionPan:0,tolerance:.24,segmentStart:null,segmentDuration:0,heard:false,decisionStartedAt:0,responseTimes:[],decisionTimer:0,dragging:false,pointerId:null};
  }
  function resetLcr(){Object.assign(lcr,freshLcr());}
  const LCR_TOLERANCE=[.24,.22,.20,.17,.15,.13,.11,.09,.07,.05];

  function ensureLcrTrainer(){
    if(trainers.lcr) return trainers.lcr;
    const ticks=Array.from({length:21},(_,index)=>`<i style="left:${index*5}%"></i>`).join("");
    const trainer=document.createElement("section");trainer.className="sg-trainer sg-lcr-trainer sg-qa-trainer";trainer.id="sgLeftCenterRightTrainerQa";
    trainer.innerHTML=baseTrainerHtml({
      kicker:"Level 1 · Ear Basics",title:"Left / Center / Right",description:"Escucha la fuente y ubícala con precisión en el panorama estéreo. Arrastra el selector y suéltalo donde creas que está.",closeAttr:"data-qalcr-close",roundAttr:"data-qalcr-round",scoreAttr:"data-qalcr-score",nextAttr:"data-qalcr-next",
      body:`
        <div class="sg-question-stage sg-lcr-question-stage" role="status" aria-live="polite"><span class="sg-question-alert">Ubicación estéreo</span><div class="sg-question"><span>¿Dónde escuchas</span><strong>LA FUENTE?</strong></div></div>
        <div class="sg-source-label" data-qalcr-source>Fuente: cargando audio...</div>
        <div class="sg-source-label">Usa audífonos o monitores bien colocados. Escucha primero y luego marca la posición exacta.</div>
        <div class="sg-decision-status" data-qalcr-status>Escucha la fuente antes de responder.</div>
        <button class="sg-lcr-listen" type="button" data-qalcr-play><span class="sg-lcr-listen-icon">▶</span><strong>Escuchar fuente</strong></button>
        <div class="sg-lcr-precision" data-qalcr-precision>
          <div class="sg-lcr-scale-labels"><span>LEFT</span><span>CENTER</span><span>RIGHT</span></div>
          <div class="sg-lcr-pan-track is-disabled" data-qalcr-track role="slider" tabindex="0" aria-label="Seleccionar posición de paneo" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0">
            <div class="sg-lcr-ticks" aria-hidden="true">${ticks}</div><div class="sg-lcr-center-line" aria-hidden="true"></div><div class="sg-lcr-tolerance-band" data-qalcr-band aria-hidden="true"></div>
            <div class="sg-lcr-marker sg-lcr-marker-user" data-qalcr-user><b></b><span>Tu posición</span></div><div class="sg-lcr-marker sg-lcr-marker-target" data-qalcr-target><b></b><span>Real</span></div>
          </div>
          <div class="sg-lcr-pan-readout" data-qalcr-readout>Escucha y arrastra el selector.</div>
        </div>
        <div class="sg-feedback sg-qa-feedback" data-qalcr-feedback></div><div class="sg-session-summary" data-qalcr-summary></div>
      `
    });
    document.querySelector(".sg-shell")?.insertBefore(trainer,document.querySelector(".sg-level-nav")||null);
    trainer.querySelector("[data-qalcr-close]")?.addEventListener("click",()=>{stopSource();stopDecisionTimer(lcr);trainer.classList.remove("show");});
    trainer.querySelector("[data-qalcr-play]")?.addEventListener("click",playLcrSample);trainer.querySelector("[data-qalcr-next]")?.addEventListener("click",nextLcrRound);
    const track=trainer.querySelector("[data-qalcr-track]");
    track.addEventListener("pointerdown",event=>{
      if(!lcr.heard||lcr.answered) return;event.preventDefault();lcr.dragging=true;lcr.pointerId=event.pointerId;track.setPointerCapture?.(event.pointerId);setLcrSelectionFromPointer(event,track);
    });
    track.addEventListener("pointermove",event=>{if(!lcr.dragging||event.pointerId!==lcr.pointerId||lcr.answered) return;event.preventDefault();setLcrSelectionFromPointer(event,track);});
    const release=event=>{if(!lcr.dragging||event.pointerId!==lcr.pointerId||lcr.answered) return;lcr.dragging=false;try{track.releasePointerCapture?.(event.pointerId);}catch(_){ }setLcrSelectionFromPointer(event,track);submitLcrSelection();};
    track.addEventListener("pointerup",release);track.addEventListener("pointercancel",()=>{lcr.dragging=false;});
    track.addEventListener("keydown",event=>{
      if(!lcr.heard||lcr.answered) return;let handled=true;if(event.key==="ArrowLeft") lcr.selectionPan-=.02;else if(event.key==="ArrowRight") lcr.selectionPan+=.02;else if(event.key==="Home") lcr.selectionPan=-1;else if(event.key==="End") lcr.selectionPan=1;else if(event.key==="Enter"||event.key===" "){submitLcrSelection();return;}else handled=false;if(handled){event.preventDefault();lcr.selectionPan=Math.max(-1,Math.min(1,lcr.selectionPan));renderLcrSelection();}
    });
    trainers.lcr=trainer;return trainer;
  }

  function makeTargetPan(round){
    const ranges=round<=3?[.45,.9]:round<=6?[.22,.75]:round<=8?[.08,.5]:[.025,.30];
    if(round===3||round===7){return Math.random()>.5?0:(Math.random()>.5?.03:-.03);}
    const magnitude=ranges[0]+Math.random()*(ranges[1]-ranges[0]);return (Math.random()>.5?1:-1)*magnitude;
  }

  async function startLcr(){
    const trainer=ensureLcrTrainer();closeOtherTrainers(trainer);clearResultCard(trainer);playStartSound();trainer.classList.add("show");trainer.scrollIntoView({behavior:"smooth",block:"start"});await loadManifest();resetLcr();lcr.ready=true;lcr.clipDeck=buildClipDeck();nextLcrRound();
  }

  function nextLcrRound(){
    stopSource();stopDecisionTimer(lcr);if(!lcr.ready) return;if(lcr.round>=ROUND_TOTAL){finishLcr();return;}lcr.round+=1;lcr.answered=false;lcr.clip=pickClip(lcr);lcr.targetPan=makeTargetPan(lcr.round);lcr.selectionPan=0;lcr.tolerance=LCR_TOLERANCE[lcr.round-1];lcr.segmentStart=null;lcr.segmentDuration=0;lcr.heard=false;lcr.decisionStartedAt=0;lcr.dragging=false;renderLcr();
  }

  function renderLcr(){
    const trainer=trainers.lcr;trainer.querySelector("[data-qalcr-round]").textContent=`Pregunta ${lcr.round} de ${ROUND_TOTAL}`;trainer.querySelector("[data-qalcr-score]").textContent=`Aciertos: ${lcr.score}`;trainer.querySelector("[data-qalcr-source]").textContent=lcr.clip?`Fuente: ${lcr.clip.title}`:"Fuente: cargando audio...";
    trainer.querySelector("[data-qalcr-feedback]").className="sg-feedback sg-qa-feedback";trainer.querySelector("[data-qalcr-feedback]").innerHTML="";const summary=trainer.querySelector("[data-qalcr-summary]");summary.classList.remove("show");summary.innerHTML="";const next=trainer.querySelector("[data-qalcr-next]");next.textContent="Siguiente";next.classList.remove("show");
    const track=trainer.querySelector("[data-qalcr-track]");track.classList.add("is-disabled");track.classList.remove("is-correct","is-wrong");track.setAttribute("aria-valuenow","0");trainer.querySelector("[data-qalcr-user]").style.left="50%";trainer.querySelector("[data-qalcr-user]").classList.remove("show");trainer.querySelector("[data-qalcr-target]").classList.remove("show");trainer.querySelector("[data-qalcr-band]").classList.remove("show");trainer.querySelector("[data-qalcr-readout]").textContent="Escucha y arrastra el selector.";updateLcrStatus();
  }

  async function playLcrSample(){
    try{
      if(!lcr.clip||lcr.answered) return;stopSource();const id=++activeRequestId;const context=await getContext();const buffer=await getMonoBuffer(lcr.clip);if(id!==activeRequestId) return;const source=context.createBufferSource();const gain=context.createGain();const panner=context.createStereoPanner?.();source.buffer=buffer;gain.gain.value=.72;source.connect(gain);if(panner){panner.pan.setValueAtTime(lcr.targetPan,context.currentTime);gain.connect(panner);panner.connect(context.destination);}else gain.connect(context.destination);
      const duration=Math.min(5.5,buffer.duration);if(lcr.segmentStart===null){const available=Math.max(0,buffer.duration-duration);lcr.segmentStart=available?Math.random()*available:0;lcr.segmentDuration=duration;}
      const listen=trainers.lcr.querySelector("[data-qalcr-play]");listen.classList.add("is-playing");source.onended=()=>{if(activeSource===source) activeSource=null;listen.classList.remove("is-playing");};source.start(0,lcr.segmentStart,lcr.segmentDuration);activeSource=source;
      if(!lcr.heard){lcr.heard=true;lcr.decisionStartedAt=performance.now();trainers.lcr.querySelector("[data-qalcr-track]").classList.remove("is-disabled");trainers.lcr.querySelector("[data-qalcr-user]").classList.add("show");trainers.lcr.querySelector("[data-qalcr-readout]").textContent=`Tu selección: ${formatPan(lcr.selectionPan)} · arrastra y suelta para responder`;startDecisionTimer(lcr,updateLcrStatus);}updateLcrStatus();
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }

  function setLcrSelectionFromPointer(event,track){
    const rect=track.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(rect.width,1)));lcr.selectionPan=ratio*2-1;renderLcrSelection();
  }
  function renderLcrSelection(){
    const trainer=trainers.lcr;const left=(lcr.selectionPan+1)*50;const marker=trainer.querySelector("[data-qalcr-user]");marker.style.left=`${left}%`;marker.classList.add("show");const track=trainer.querySelector("[data-qalcr-track]");track.setAttribute("aria-valuenow",lcr.selectionPan.toFixed(3));trainer.querySelector("[data-qalcr-readout]").textContent=`Tu selección: ${formatPan(lcr.selectionPan)} · suelta para responder`;
  }

  function submitLcrSelection(){
    if(lcr.answered||!lcr.heard) return;lcr.answered=true;stopSource();stopDecisionTimer(lcr);const responseTime=lcr.decisionStartedAt?Math.max(0,(performance.now()-lcr.decisionStartedAt)/1000):0;lcr.responseTimes.push(responseTime);const error=Math.abs(lcr.selectionPan-lcr.targetPan);const correct=error<=lcr.tolerance;
    if(correct){lcr.score+=1;lcr.points+=Math.round(70+30*Math.max(0,1-error/Math.max(lcr.tolerance,.0001)));playCorrectSound();}else playWrongSound();
    const trainer=trainers.lcr;const track=trainer.querySelector("[data-qalcr-track]");track.classList.add(correct?"is-correct":"is-wrong");track.classList.add("is-disabled");const targetMarker=trainer.querySelector("[data-qalcr-target]");targetMarker.style.left=`${(lcr.targetPan+1)*50}%`;targetMarker.classList.add("show");const band=trainer.querySelector("[data-qalcr-band]");const min=Math.max(-1,lcr.targetPan-lcr.tolerance);const max=Math.min(1,lcr.targetPan+lcr.tolerance);band.style.left=`${(min+1)*50}%`;band.style.width=`${(max-min)*50}%`;band.classList.add("show");
    const feedback=trainer.querySelector("[data-qalcr-feedback]");feedback.classList.add(correct?"correct":"wrong");feedback.innerHTML=`<strong>${correct?"Correcto":"Fuera del rango"}.</strong><span>Tu posición: ${formatPan(lcr.selectionPan)} · Real: ${formatPan(lcr.targetPan)} · Error: ${error.toFixed(3)} · Margen: ±${lcr.tolerance.toFixed(2)}</span>`;
    trainer.querySelector("[data-qalcr-readout]").textContent=`Tu posición ${formatPan(lcr.selectionPan)} · posición real ${formatPan(lcr.targetPan)}`;trainer.querySelector("[data-qalcr-score]").textContent=`Aciertos: ${lcr.score}`;updateLcrStatus();trainer.querySelector("[data-qalcr-next]").classList.add("show");
  }

  function updateLcrStatus(){
    const status=trainers.lcr?.querySelector("[data-qalcr-status]");if(!status) return;if(lcr.answered){const last=lcr.responseTimes.at(-1);status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";status.className="sg-decision-status is-complete";return;}if(!lcr.heard){status.textContent="Escucha la fuente antes de responder.";status.className="sg-decision-status";return;}const seconds=(performance.now()-lcr.decisionStartedAt)/1000;status.textContent=`Arrastra y suelta · margen de acierto ±${lcr.tolerance.toFixed(2)} · ${seconds.toFixed(1)} s`;status.className="sg-decision-status is-timing";
  }

  function finishLcr(){
    stopDecisionTimer(lcr);const times=lcr.responseTimes.filter(Number.isFinite);const average=times.length?times.reduce((a,c)=>a+c,0)/times.length:Infinity;const accuracy=lcr.score/ROUND_TOTAL*100;const stars=starsFor(lcr.score,average);saveGameResult("left-center-right",accuracy,average,lcr.points,stars);
    const feedback=trainers.lcr.querySelector("[data-qalcr-feedback]");feedback.className="sg-feedback sg-qa-feedback correct";feedback.textContent="Sesión completada · Entrenaste ubicación panorámica de precisión.";const summary=trainers.lcr.querySelector("[data-qalcr-summary]");summary.innerHTML=`<div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div><div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div><div><span>Score</span><strong>${lcr.points}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");const next=trainers.lcr.querySelector("[data-qalcr-next]");next.textContent="Repetir";next.classList.add("show");lcr.round=0;lcr.score=0;lcr.points=0;lcr.responseTimes=[];lcr.clipDeck=buildClipDeck();
  }

  document.addEventListener("click",event=>{
    const card=event.target.closest?.(".sg-game[data-game]");if(!card) return;const gameId=card.dataset.game;if(!PATCHED_GAMES.has(gameId)) return;
    event.preventDefault();event.stopImmediatePropagation();
    const start=gameId==="bass-mid-treble"?startBmt:gameId==="left-center-right"?startLcr:startMlc;
    start().catch(error=>showToast(error.message||"No se pudo iniciar el entrenamiento."));
  },true);

  ["bass-mid-treble","left-center-right","more-less-compressed"].forEach(gameId=>document.querySelector(`[data-game="${gameId}"]`)?.classList.add("is-live"));
})();
