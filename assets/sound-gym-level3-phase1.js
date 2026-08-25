(function(){
  "use strict";

  const GAME_ID="eq-match";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL=10;
  const STEP=1.5;
  const REGIONS=[
    {id:"sub",label:"SUB",center:45,type:"lowshelf"},
    {id:"bass",label:"BASS",center:120,type:"peaking"},
    {id:"low-mid",label:"LOW MID",center:350,type:"peaking"},
    {id:"mid",label:"MID",center:1000,type:"peaking"},
    {id:"upper-mid",label:"UPPER MID",center:3000,type:"peaking"},
    {id:"high",label:"HIGH",center:6500,type:"peaking"},
    {id:"air",label:"AIR",center:12000,type:"highshelf"}
  ];
  const COMPATIBLE_IDS=[
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext=null;
  let manifest=null;
  let trainer=null;
  let activeSource=null;
  let requestId=0;
  let decisionTimer=0;
  const decoded=new Map();
  const processed=new Map();
  let state=freshState();

  function freshState(){
    return {
      ready:false,round:0,score:0,answered:false,
      clip:null,clipDeck:[],regionDeck:[],targetRegion:REGIONS[3],targetGain:9,q:.85,
      userRegion:REGIONS[3],userGain:0,
      segmentStart:null,segmentDuration:0,
      heardReference:false,heardCandidate:false,candidateDirty:true,
      decisionStartedAt:0,responseTimes:[],points:0
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
    const card=document.querySelector('[data-game="eq-match"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.eqmLiveObserver==="1") return;
    card.dataset.eqmLiveObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-eqm-trainer";
    trainer.id="sgEqMatchTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head">
        <div>
          <span class="sg-trainer-kicker">Level 3 · Studio</span>
          <h2>EQ Match</h2>
          <p>Escucha una referencia con EQ aplicada y reconstruye el cambio eligiendo la región y la cantidad de ganancia.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-eqm-close aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-trainer-meter">
        <span data-eqm-round>Pregunta 1 de 10</span>
        <span data-eqm-score>Aciertos: 0</span>
      </div>
      <div class="sg-question-stage" data-eqm-question-stage role="status" aria-live="polite">
        <span class="sg-question-alert">Studio challenge</span>
        <div class="sg-question"><span>Reconstruye la</span><strong>EQ DE REFERENCIA</strong></div>
      </div>
      <div class="sg-source-label" data-eqm-source>Fuente: cargando audio...</div>
      <div class="sg-source-label">Escucha dónde cambia el balance tonal y cuánto. El volumen está compensado para que la ganancia no se revele por nivel.</div>
      <div class="sg-decision-status" data-eqm-status>Escucha la referencia y crea tu EQ.</div>

      <div class="sg-eqm-play-grid">
        <button class="sg-eqm-play" type="button" data-eqm-play="reference"><span>A</span><strong>Referencia</strong></button>
        <button class="sg-eqm-play" type="button" data-eqm-play="candidate"><span>B</span><strong>Tu EQ</strong></button>
      </div>

      <div class="sg-eqm-panel">
        <div class="sg-eqm-panel-title"><span>Selecciona la región</span><strong data-eqm-selection>MID · 0.0 dB</strong></div>
        <div class="sg-eqm-region-grid">
          ${REGIONS.map(region=>`<button class="sg-eqm-region" type="button" data-eqm-region="${region.id}">${region.label}</button>`).join("")}
        </div>
        <div class="sg-eqm-gain">
          <button type="button" data-eqm-gain="-${STEP}" aria-label="Bajar ganancia">−</button>
          <div class="sg-eqm-gain-value"><span>Ganancia</span><strong data-eqm-gain-value>0.0 dB</strong></div>
          <button type="button" data-eqm-gain="${STEP}" aria-label="Subir ganancia">+</button>
        </div>
        <button class="sg-eqm-submit" type="button" data-eqm-submit disabled>Comprobar match</button>
        <div class="sg-eqm-note">Rango ±12 dB · pasos de 1.5 dB</div>
      </div>

      <div class="sg-feedback" data-eqm-feedback></div>
      <div class="sg-session-summary" data-eqm-summary></div>
      <button class="sg-next" type="button" data-eqm-next>Siguiente</button>
    `;

    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);

    trainer.querySelector("[data-eqm-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-eqm-play]").forEach(button=>button.addEventListener("click",()=>playVersion(button.dataset.eqmPlay)));
    trainer.querySelectorAll("[data-eqm-region]").forEach(button=>button.addEventListener("click",()=>selectRegion(button.dataset.eqmRegion)));
    trainer.querySelectorAll("[data-eqm-gain]").forEach(button=>button.addEventListener("click",()=>adjustGain(Number(button.dataset.eqmGain))));
    trainer.querySelector("[data-eqm-submit]")?.addEventListener("click",submitMatch);
    trainer.querySelector("[data-eqm-next]")?.addEventListener("click",nextRound);
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
    state.regionDeck=buildRegionDeck();
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

  function buildRegionDeck(){
    return [...shuffle(REGIONS),...shuffle(REGIONS).slice(0,ROUND_TOTAL-REGIONS.length)];
  }

  function pickClip(){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    return state.clipDeck.shift()||manifest?.clips?.[0];
  }

  function pickRegion(){
    if(!state.regionDeck.length) state.regionDeck=buildRegionDeck();
    return state.regionDeck.shift()||REGIONS[Math.floor(Math.random()*REGIONS.length)];
  }

  function targetAmount(round){
    if(round<=3) return 9;
    if(round<=6) return 7.5;
    if(round<=8) return 6;
    return 4.5;
  }

  function targetQ(round){
    if(round<=3) return .78;
    if(round<=6) return .92;
    if(round<=8) return 1.08;
    return 1.28;
  }

  function nextRound(){
    stopSource();
    stopDecisionTimer();
    if(!state.ready) return;
    if(state.round>=ROUND_TOTAL){finishSession();return;}

    state.round+=1;
    state.answered=false;
    state.clip=pickClip();
    state.targetRegion=pickRegion();
    state.targetGain=targetAmount(state.round)*(Math.random()>.5?1:-1);
    state.q=targetQ(state.round);
    state.userRegion=REGIONS[3];
    state.userGain=0;
    state.segmentStart=null;
    state.segmentDuration=0;
    state.heardReference=false;
    state.heardCandidate=false;
    state.candidateDirty=true;
    state.decisionStartedAt=0;
    renderRound();
  }

  function renderRound(){
    trainer.querySelector("[data-eqm-round]").textContent=`Pregunta ${state.round} de ${ROUND_TOTAL}`;
    trainer.querySelector("[data-eqm-score]").textContent=`Aciertos: ${state.score}`;
    trainer.querySelector("[data-eqm-source]").textContent=state.clip?`Fuente: ${state.clip.title}`:"Fuente: cargando audio...";
    const stage=trainer.querySelector("[data-eqm-question-stage]");
    stage.classList.remove("is-entering");void stage.offsetWidth;stage.classList.add("is-entering");
    setTimeout(()=>stage.classList.remove("is-entering"),520);

    trainer.querySelector("[data-eqm-feedback]").className="sg-feedback";
    trainer.querySelector("[data-eqm-feedback]").textContent="";
    trainer.querySelector("[data-eqm-summary]").classList.remove("show");
    trainer.querySelector("[data-eqm-summary]").innerHTML="";
    const next=trainer.querySelector("[data-eqm-next]");
    next.textContent="Siguiente";next.classList.remove("show");
    trainer.querySelectorAll("[data-eqm-region]").forEach(button=>button.classList.remove("is-selected","correct","wrong"));
    trainer.querySelectorAll("[data-eqm-play]").forEach(button=>button.classList.remove("is-heard"));
    updateControls();
    updateStatus();
  }

  function selectRegion(regionId){
    if(state.answered) return;
    const region=REGIONS.find(item=>item.id===regionId);
    if(!region) return;
    state.userRegion=region;
    markCandidateDirty();
    updateControls();
  }

  function adjustGain(delta){
    if(state.answered) return;
    const next=Math.max(-12,Math.min(12,Math.round((state.userGain+delta)/STEP)*STEP));
    if(next===state.userGain) return;
    state.userGain=next;
    markCandidateDirty();
    updateControls();
  }

  function markCandidateDirty(){
    state.candidateDirty=true;
    state.heardCandidate=false;
    trainer?.querySelector('[data-eqm-play="candidate"]')?.classList.remove("is-heard");
    stopDecisionTimer();
    state.decisionStartedAt=0;
  }

  function updateControls(){
    if(!trainer) return;
    trainer.querySelectorAll("[data-eqm-region]").forEach(button=>{
      button.classList.toggle("is-selected",button.dataset.eqmRegion===state.userRegion.id);
      button.disabled=state.answered;
    });
    trainer.querySelectorAll("[data-eqm-gain]").forEach(button=>button.disabled=state.answered);
    const gainText=`${state.userGain>0?"+":""}${state.userGain.toFixed(1)} dB`;
    trainer.querySelector("[data-eqm-gain-value]").textContent=gainText;
    trainer.querySelector("[data-eqm-selection]").textContent=`${state.userRegion.label} · ${gainText}`;
    const canSubmit=!state.answered&&state.heardReference&&state.heardCandidate&&!state.candidateDirty&&Math.abs(state.userGain)>=STEP;
    trainer.querySelector("[data-eqm-submit]").disabled=!canSubmit;
    if(canSubmit&&!state.decisionStartedAt){
      state.decisionStartedAt=performance.now();
      startDecisionTimer();
    }
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
    }else arrayBuffer=await response.arrayBuffer();
    const buffer=await context.decodeAudioData(arrayBuffer);
    decoded.set(clip.id,buffer);
    return buffer;
  }

  async function getEqBuffer(original,region,gainDb){
    if(Math.abs(gainDb)<.001) return {buffer:original,compensation:1};
    const key=`${state.clip.id}:${region.id}:${gainDb}:${state.q}`;
    if(processed.has(key)) return processed.get(key);
    const OfflineCtor=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!OfflineCtor) return {buffer:original,compensation:1};

    const offline=new OfflineCtor(original.numberOfChannels,original.length,original.sampleRate);
    const source=offline.createBufferSource();
    const filter=offline.createBiquadFilter();
    source.buffer=original;
    filter.type=region.type;
    filter.frequency.value=region.center;
    if(region.type==="peaking") filter.Q.value=state.q;
    filter.gain.value=gainDb;
    source.connect(filter);filter.connect(offline.destination);source.start();
    const rendered=await offline.startRendering();
    const dry=measureRms(original),wet=measureRms(rendered);
    const compensation=Math.max(.62,Math.min(1.48,dry/Math.max(wet,.000001)));
    const result={buffer:rendered,compensation};
    processed.set(key,result);
    return result;
  }

  function measureRms(buffer){
    let sum=0,samples=0;
    for(let channel=0;channel<buffer.numberOfChannels;channel++){
      const data=buffer.getChannelData(channel);
      for(let i=0;i<data.length;i+=32){sum+=data[i]*data[i];samples+=1;}
    }
    return Math.sqrt(sum/Math.max(samples,1));
  }

  async function playVersion(version){
    try{
      if(!state.clip||state.answered) return;
      stopSource();
      const id=++requestId;
      const context=await getContext();
      const original=await decodeClip(state.clip);
      if(id!==requestId) return;

      const source=context.createBufferSource();
      const gain=context.createGain();
      const region=version==="reference"?state.targetRegion:state.userRegion;
      const gainDb=version==="reference"?state.targetGain:state.userGain;
      const result=await getEqBuffer(original,region,gainDb);
      if(id!==requestId) return;
      source.buffer=result.buffer;
      gain.gain.value=.68*result.compensation;
      source.connect(gain);gain.connect(context.destination);

      const duration=Math.min(6,original.duration);
      if(state.segmentStart===null){
        const available=Math.max(0,original.duration-duration);
        state.segmentStart=available?Math.random()*available:0;
        state.segmentDuration=duration;
      }
      source.onended=()=>{if(activeSource===source) activeSource=null;};
      source.start(0,state.segmentStart,state.segmentDuration);
      activeSource=source;

      if(version==="reference"){
        state.heardReference=true;
        trainer.querySelector('[data-eqm-play="reference"]')?.classList.add("is-heard");
      }else{
        state.heardCandidate=true;
        state.candidateDirty=false;
        trainer.querySelector('[data-eqm-play="candidate"]')?.classList.add("is-heard");
      }
      updateControls();
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }

  function updateStatus(){
    const status=trainer?.querySelector("[data-eqm-status]");
    if(!status) return;
    if(state.answered){
      const last=state.responseTimes[state.responseTimes.length-1];
      status.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Match registrado";
      status.className="sg-decision-status is-complete";return;
    }
    if(!state.heardReference){
      status.textContent="Escucha primero la referencia.";
      status.className="sg-decision-status";return;
    }
    if(Math.abs(state.userGain)<STEP){
      status.textContent="Elige una región y mueve la ganancia para crear tu EQ.";
      status.className="sg-decision-status";return;
    }
    if(state.candidateDirty||!state.heardCandidate){
      status.textContent="Escucha Tu EQ con el ajuste actual antes de comprobar.";
      status.className="sg-decision-status";return;
    }
    const seconds=state.decisionStartedAt?(performance.now()-state.decisionStartedAt)/1000:0;
    status.textContent=`Compara y decide · ${seconds.toFixed(1)} s`;
    status.className="sg-decision-status is-timing";
  }

  function startDecisionTimer(){
    stopDecisionTimer();
    decisionTimer=setInterval(updateStatus,100);
  }
  function stopDecisionTimer(){if(decisionTimer) clearInterval(decisionTimer);decisionTimer=0;}
  function stopSource(){requestId+=1;if(!activeSource) return;try{activeSource.stop();}catch(_){ }activeSource.disconnect?.();activeSource=null;}
  function speedPercent(seconds){if(seconds<=3)return 1;if(seconds<=6)return .8;if(seconds<=10)return .55;if(seconds<=15)return .25;return 0;}

  function submitMatch(){
    const submit=trainer?.querySelector("[data-eqm-submit]");
    if(state.answered||submit?.disabled) return;
    state.answered=true;
    stopSource();stopDecisionTimer();

    const responseTime=state.decisionStartedAt?Math.max(0,(performance.now()-state.decisionStartedAt)/1000):0;
    state.responseTimes.push(responseTime);
    const regionMatch=state.userRegion.id===state.targetRegion.id;
    const gainError=Math.abs(state.userGain-state.targetGain);
    const correct=regionMatch&&gainError<=STEP+.001;
    if(correct){state.score+=1;playCorrectSound();}else playWrongSound();

    const regionPoints=regionMatch?55:0;
    const gainPoints=Math.max(0,35*(1-Math.min(12,gainError)/12));
    const speedPoints=10*speedPercent(responseTime);
    state.points+=Math.max(0,Math.min(100,Math.round(regionPoints+gainPoints+speedPoints)));

    trainer.querySelectorAll("[data-eqm-region]").forEach(button=>{
      button.disabled=true;
      if(button.dataset.eqmRegion===state.targetRegion.id) button.classList.add("correct");
      if(button.dataset.eqmRegion===state.userRegion.id&&!regionMatch) button.classList.add("wrong");
    });
    trainer.querySelectorAll("[data-eqm-gain]").forEach(button=>button.disabled=true);
    submit.disabled=true;

    const targetGainText=`${state.targetGain>0?"+":""}${state.targetGain.toFixed(1)} dB`;
    const yourGainText=`${state.userGain>0?"+":""}${state.userGain.toFixed(1)} dB`;
    const feedback=trainer.querySelector("[data-eqm-feedback]");
    feedback.classList.add(correct?"correct":"wrong");
    feedback.textContent=correct
      ?`Match correcto. ${state.targetRegion.label} ${targetGainText}.`
      :`Objetivo: ${state.targetRegion.label} ${targetGainText}. Tu EQ: ${state.userRegion.label} ${yourGainText}.`;
    trainer.querySelector("[data-eqm-score]").textContent=`Aciertos: ${state.score}`;
    updateStatus();
    trainer.querySelector("[data-eqm-next]").classList.add("show");
  }

  function finishSession(){
    stopDecisionTimer();
    const times=state.responseTimes.filter(Number.isFinite);
    const average=times.length?times.reduce((a,b)=>a+b,0)/times.length:Infinity;
    const accuracy=(state.score/ROUND_TOTAL)*100;
    const stars=state.score>=9&&average<=6?3:state.score>=8&&average<=10?2:state.score>=6?1:0;
    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0));
    const best=Math.max(previous,stars);
    progress[GAME_ID]=best;
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    saveStats(accuracy,average,state.points);
    if(window.SoundGymProgress?.setStars) window.SoundGymProgress.setStars(GAME_ID,best);
    markCardLive();

    const feedback=trainer.querySelector("[data-eqm-feedback]");
    feedback.className="sg-feedback correct";
    feedback.textContent=`Sesión completada · ${rating(accuracy,average)}`;
    const summary=trainer.querySelector("[data-eqm-summary]");
    summary.innerHTML=`
      <div><span>Precisión</span><strong>${Math.round(accuracy)}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(average)?average.toFixed(1):"—"} s</strong></div>
      <div><span>Score</span><strong>${Math.min(1000,state.points)}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>
    `;
    summary.classList.add("show");
    const next=trainer.querySelector("[data-eqm-next]");
    next.textContent="Repetir";next.classList.add("show");

    state.round=0;state.score=0;state.points=0;state.responseTimes=[];
    state.clipDeck=buildClipDeck();state.regionDeck=buildRegionDeck();
  }

  function readJson(key){
    try{const parsed=JSON.parse(localStorage.getItem(key)||"{}");return parsed&&typeof parsed==="object"?parsed:{};}catch(_){return {};}
  }

  function saveStats(accuracy,average,score){
    const stats=readJson(STATS_KEY),previous=stats[GAME_ID]||{};
    const recent=Array.isArray(previous.recent)?previous.recent.slice(-4):[];
    recent.push({accuracy:Math.round(accuracy),averageTime:Number.isFinite(average)?Number(average.toFixed(2)):null,score,at:Date.now()});
    stats[GAME_ID]={
      bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(average)?Math.min(Number(previous.bestAverageTime)||Infinity,average):(previous.bestAverageTime??null),
      bestScore:Math.max(Number(previous.bestScore)||0,score),
      sessions:(Number(previous.sessions)||0)+1,recent
    };
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
  }

  function rating(accuracy,average){
    if(accuracy>=90&&average<=6) return "Reconstruyes EQ con oído de estudio";
    if(accuracy>=80&&average<=10) return "Muy buen control de frecuencia y ganancia";
    if(accuracy>=60) return "Ya encuentras la forma general de la EQ";
    return "Sigue afinando región y cantidad de ganancia";
  }

  async function playStartSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      [587.33,880,1174.66].forEach((frequency,index)=>{
        const osc=context.createOscillator(),gain=context.createGain(),start=now+index*.075;
        osc.type="square";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
        osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.17);
      });
    }catch(_){ }
  }

  async function playCorrectSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      [659.25,987.77].forEach((frequency,index)=>{
        const osc=context.createOscillator(),gain=context.createGain(),start=now+index*.07;
        osc.type="sine";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.05,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.32);
        osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.34);
      });
    }catch(_){ }
  }

  async function playWrongSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      const osc=context.createOscillator(),gain=context.createGain();
      osc.type="triangle";osc.frequency.setValueAtTime(164.81,now);osc.frequency.exponentialRampToValueAtTime(130,now+.25);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.27);
      osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.28);
    }catch(_){ }
  }

  function showToast(message){
    const toast=document.getElementById("sgToast");
    if(!toast) return;
    toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2300);
  }

  document.addEventListener("click",event=>{
    const card=event.target.closest?.('[data-game="eq-match"]');
    if(!card) return;
    event.preventDefault();event.stopImmediatePropagation();
    startGame().catch(error=>showToast(error.message||"No se pudo iniciar EQ Match."));
  },true);

  markCardLive();
})();
