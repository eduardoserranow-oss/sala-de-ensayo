(function(){
  "use strict";

  const GAME_ID = "eq-match";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const STATS_KEY = "myLessons.soundGym.stats.v1";
  const MANIFEST_URL = "assets/sound-gym-audio/manifest.json";
  const STAGE_TOTAL = 5;
  const STARTING_LIVES = 3;
  const GRAPH = {minHz:20,maxHz:20000,minDb:-12,maxDb:12,samples:192};
  const STAGES = [
    {gain:9.0,q:.72,threshold:68,freqs:[90,180,700,2600,7800],types:["peaking"],label:"Warm-up"},
    {gain:7.5,q:.82,threshold:73,freqs:[65,130,320,1100,4200,9800],types:["peaking","lowshelf","highshelf"],label:"Shape"},
    {gain:6.0,q:.95,threshold:77,freqs:[55,110,240,520,1400,3300,7200,12000],types:["peaking","lowshelf","highshelf"],label:"Focus"},
    {gain:4.5,q:1.12,threshold:81,freqs:null,types:["peaking","lowshelf","highshelf"],label:"Precision"},
    {gain:3.5,q:1.35,threshold:84,freqs:null,types:["peaking","lowshelf","highshelf"],label:"Master"}
  ];
  const CLIP_IDS = [
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext = null;
  let manifest = null;
  let trainer = null;
  let source = null;
  let targetFilter = null;
  let userFilter = null;
  let refGain = null;
  let userGain = null;
  let masterGain = null;
  let sourceToken = 0;
  let decisionTimer = 0;
  let frameId = 0;
  const decoded = new Map();
  let state = freshState();

  function freshState(){
    return {
      ready:false,
      phase:"idle",
      stage:0,
      lives:STARTING_LIVES,
      score:0,
      matches:0,
      clip:null,
      clipDeck:[],
      target:{frequency:1000,gain:6,q:.8,type:"peaking"},
      user:{frequency:1000,gain:0,q:.8,type:"peaking"},
      activeSide:"reference",
      segmentStart:0,
      segmentDuration:7,
      startedAt:0,
      decisionStartedAt:0,
      responseTimes:[],
      stageScores:[],
      revealed:false,
      debug:false
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

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function lerp(a,b,t){return a+(b-a)*t;}
  function log10(value){return Math.log(value)/Math.LN10;}
  function hzToX(hz){
    const min=log10(GRAPH.minHz),max=log10(GRAPH.maxHz);
    return ((log10(clamp(hz,GRAPH.minHz,GRAPH.maxHz))-min)/(max-min))*100;
  }
  function xToHz(percent){
    const min=log10(GRAPH.minHz),max=log10(GRAPH.maxHz);
    return Math.pow(10,min+(max-min)*clamp(percent,0,1));
  }
  function dbToY(db){return ((GRAPH.maxDb-clamp(db,GRAPH.minDb,GRAPH.maxDb))/(GRAPH.maxDb-GRAPH.minDb))*100;}
  function yToDb(percent){return GRAPH.maxDb-clamp(percent,0,1)*(GRAPH.maxDb-GRAPH.minDb);}
  function formatHz(value){
    if(value>=1000) return `${(value/1000).toFixed(value>=10000?1:2).replace(/\.00$/,'').replace(/0$/,'')} kHz`;
    return `${Math.round(value)} Hz`;
  }
  function formatDb(value){return `${value>0?'+':''}${value.toFixed(1)} dB`;}

  function markCardLive(){
    const card=document.querySelector('[data-game="eq-match"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.eqmProObserver==="1") return;
    card.dataset.eqmProObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function graphMarkup(){
    const xLabels=[20,50,100,200,500,1000,2000,5000,10000,20000];
    const yLabels=[12,6,0,-6,-12];
    return `
      <div class="sg-eqpro-graph" data-eqpro-graph tabindex="0" aria-label="Editor de EQ. Arrastra el nodo para ajustar frecuencia y ganancia.">
        <svg viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="eqProCurve" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#2dd4bf"/>
              <stop offset=".55" stop-color="#4fd8ff"/>
              <stop offset="1" stop-color="#2dd4bf"/>
            </linearGradient>
            <linearGradient id="eqProTarget" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#ffb05e"/>
              <stop offset=".55" stop-color="#ff6500"/>
              <stop offset="1" stop-color="#ffb05e"/>
            </linearGradient>
            <filter id="eqProGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g class="sg-eqpro-grid-lines">
            ${xLabels.map(hz=>`<line x1="${hzToX(hz)*10}" y1="0" x2="${hzToX(hz)*10}" y2="430"/>`).join("")}
            ${yLabels.map(db=>`<line x1="0" y1="${dbToY(db)*4.3}" x2="1000" y2="${dbToY(db)*4.3}"/>`).join("")}
          </g>
          <line class="sg-eqpro-zero" x1="0" y1="215" x2="1000" y2="215"/>
          <path class="sg-eqpro-curve sg-eqpro-curve-user" data-eqpro-user-curve d="M0 215 L1000 215"/>
          <path class="sg-eqpro-curve sg-eqpro-curve-target" data-eqpro-target-curve d="M0 215 L1000 215"/>
          <g class="sg-eqpro-node-wrap" data-eqpro-node-wrap>
            <circle class="sg-eqpro-node-hit" data-eqpro-node-hit cx="500" cy="215" r="34"/>
            <circle class="sg-eqpro-node" data-eqpro-node cx="500" cy="215" r="10"/>
            <circle class="sg-eqpro-node-core" data-eqpro-node-core cx="500" cy="215" r="3"/>
          </g>
          <g class="sg-eqpro-target-node-wrap" data-eqpro-target-node-wrap>
            <circle class="sg-eqpro-target-node" data-eqpro-target-node cx="500" cy="215" r="9"/>
          </g>
        </svg>
        <div class="sg-eqpro-xlabels">${xLabels.map(hz=>`<span style="left:${hzToX(hz)}%">${hz>=1000?(hz/1000)+"k":hz}</span>`).join("")}</div>
        <div class="sg-eqpro-ylabels">${yLabels.map(db=>`<span style="top:${dbToY(db)}%">${db>0?"+":""}${db}</span>`).join("")}</div>
        <div class="sg-eqpro-node-readout" data-eqpro-readout><strong>1.00 kHz</strong><span>0.0 dB</span></div>
      </div>`;
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-eqpro-trainer";
    trainer.id="sgEqMatchTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-eqpro-head">
        <div>
          <span class="sg-trainer-kicker">Level 3 · Studio</span>
          <h2>EQ Match</h2>
          <p>Escucha la EQ de referencia y recréala con tu curva. Compara Reference y Yours hasta que ambas suenen iguales.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-eqpro-close aria-label="Cerrar EQ Match">×</button>
      </div>

      <div class="sg-eqpro-hud">
        <div class="sg-eqpro-hud-cell"><span>Score</span><strong data-eqpro-score>0</strong></div>
        <div class="sg-eqpro-stage"><strong data-eqpro-stage>1 / 5</strong><span data-eqpro-stage-label>Warm-up</span></div>
        <div class="sg-eqpro-lives" data-eqpro-lives aria-label="3 vidas"></div>
      </div>

      <div class="sg-eqpro-source" data-eqpro-source>Cargando fuente…</div>

      <div class="sg-eqpro-switch" role="group" aria-label="Comparar referencia y tu EQ">
        <button type="button" class="is-active" data-eqpro-side="reference"><span>Reference</span><small>EQ objetivo</small></button>
        <button type="button" data-eqpro-side="yours"><span>Yours</span><small>Tu EQ</small></button>
      </div>

      ${graphMarkup()}

      <div class="sg-eqpro-controls">
        <div class="sg-eqpro-param"><span>Frequency</span><strong data-eqpro-frequency>1.00 kHz</strong></div>
        <div class="sg-eqpro-param"><span>Gain</span><strong data-eqpro-gain>0.0 dB</strong></div>
        <div class="sg-eqpro-param"><span>Shape</span><strong data-eqpro-shape>Bell</strong></div>
      </div>

      <div class="sg-eqpro-coach" data-eqpro-coach>Escucha primero Reference. Después cambia a Yours y mueve el nodo hasta que el color tonal coincida.</div>
      <div class="sg-eqpro-feedback" data-eqpro-feedback></div>
      <div class="sg-eqpro-debug" data-eqpro-debug hidden></div>

      <div class="sg-eqpro-actions">
        <button class="sg-eqpro-confirm" type="button" data-eqpro-confirm>Confirm Match</button>
        <button class="sg-eqpro-continue" type="button" data-eqpro-continue hidden>Continue</button>
      </div>

      <div class="sg-session-summary" data-eqpro-summary></div>
      <button class="sg-next" type="button" data-eqpro-next>Repetir</button>
    `;

    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);

    trainer.querySelector("[data-eqpro-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-eqpro-side]").forEach(button=>button.addEventListener("click",()=>switchSide(button.dataset.eqproSide)));
    trainer.querySelector("[data-eqpro-confirm]")?.addEventListener("click",confirmMatch);
    trainer.querySelector("[data-eqpro-continue]")?.addEventListener("click",continueStage);
    trainer.querySelector("[data-eqpro-next]")?.addEventListener("click",restartAfterResults);
    setupGraphInput();
    return trainer;
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(node=>node.classList.remove("show"));
    ensureTrainer().classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});
    playStartSound();
    try{
      if(!manifest) await loadManifest();
      state=freshState();
      state.ready=true;
      state.clipDeck=buildClipDeck();
      renderLives();
      await beginStage(1);
    }catch(error){
      showToast(error.message||"No se pudo iniciar EQ Match.");
    }
  }

  function closeTrainer(){
    stopAudio();
    stopDecisionTimer();
    cancelAnimationFrame(frameId);
    trainer?.classList.remove("show");
  }

  async function loadManifest(){
    const response=await fetch(MANIFEST_URL,{cache:"force-cache"});
    if(!response.ok) throw new Error("No se pudo cargar el audio de Sound Gym.");
    manifest=await response.json();
  }

  function buildClipDeck(){
    const clips=manifest?.clips||[];
    const chosen=CLIP_IDS.map(id=>clips.find(clip=>clip.id===id)).filter(Boolean);
    return shuffle(chosen.length?chosen:clips);
  }

  function clipSupportsFrequency(clip,hz){
    const id=String(clip?.id||"");
    if(hz<90) return /bass|drums|mix|percussion/.test(id);
    if(hz<350) return !/female-vocal/.test(id);
    if(hz>9000) return !/bass/.test(id);
    return true;
  }

  function chooseClip(hz){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    let index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));
    if(index<0){state.clipDeck=buildClipDeck();index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));}
    if(index<0) index=0;
    return state.clipDeck.splice(index,1)[0]||manifest?.clips?.[0];
  }

  function randomLogFrequency(min=45,max=14500){
    const low=Math.log(min),high=Math.log(max);
    return Math.exp(low+Math.random()*(high-low));
  }

  function stageTarget(stageNumber){
    const config=STAGES[stageNumber-1];
    let frequency=config.freqs?config.freqs[Math.floor(Math.random()*config.freqs.length)]:randomLogFrequency();
    let type=config.types[Math.floor(Math.random()*config.types.length)];
    if(type==="lowshelf") frequency=clamp(frequency,55,280);
    if(type==="highshelf") frequency=clamp(frequency,3500,13000);
    const sign=Math.random()>.5?1:-1;
    const jitter=stageNumber>=4?.78+Math.random()*.44:1;
    const gain=clamp(config.gain*jitter*sign,-11,11);
    return {frequency,gain,q:config.q,type};
  }

  async function beginStage(number){
    stopAudio();
    stopDecisionTimer();
    state.stage=number;
    state.phase="loading";
    state.revealed=false;
    state.target=stageTarget(number);
    state.user={
      frequency:1000,
      gain:0,
      q:state.target.q,
      type:state.target.type
    };
    state.clip=chooseClip(state.target.frequency);
    state.activeSide="reference";
    state.decisionStartedAt=performance.now();
    state.startedAt=performance.now();
    renderStage();
    const buffer=await decodeClip(state.clip);
    if(state.stage!==number) return;
    prepareSegment(buffer);
    await startAudio(buffer);
    state.phase="editing";
    syncUserUI();
    switchSide("reference",true);
    updateCoach("Reference está sonando. Cambia a Yours y mueve el nodo hasta reconstruir el mismo balance tonal.");
    startDecisionTimer();
  }

  function renderStage(){
    const config=STAGES[state.stage-1];
    trainer.classList.remove("is-reveal","is-results","is-loading");
    trainer.classList.add("is-loading");
    trainer.querySelector("[data-eqpro-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-eqpro-stage]").textContent=`${state.stage} / ${STAGE_TOTAL}`;
    trainer.querySelector("[data-eqpro-stage-label]").textContent=config.label;
    trainer.querySelector("[data-eqpro-source]").textContent=state.clip?`Fuente · ${state.clip.title}`:"Cargando fuente…";
    trainer.querySelector("[data-eqpro-feedback]").innerHTML="";
    trainer.querySelector("[data-eqpro-confirm]").hidden=false;
    trainer.querySelector("[data-eqpro-confirm]").disabled=false;
    trainer.querySelector("[data-eqpro-continue]").hidden=true;
    trainer.querySelector("[data-eqpro-summary]").classList.remove("show");
    trainer.querySelector("[data-eqpro-summary]").innerHTML="";
    trainer.querySelector("[data-eqpro-next]").classList.remove("show");
    renderLives();
    syncUserUI();
    drawCurves();
  }

  function renderLives(){
    const host=trainer?.querySelector("[data-eqpro-lives]");
    if(!host) return;
    host.innerHTML=Array.from({length:STARTING_LIVES},(_,index)=>`<span class="sg-eqpro-life${index<state.lives?" is-alive":""}" aria-hidden="true">♥</span>`).join("");
    host.setAttribute("aria-label",`${state.lives} ${state.lives===1?"vida":"vidas"}`);
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

  function prepareSegment(buffer){
    const duration=Math.min(7.5,Math.max(3.5,buffer.duration));
    const maxStart=Math.max(0,buffer.duration-duration);
    state.segmentStart=maxStart?Math.random()*maxStart:0;
    state.segmentDuration=Math.min(duration,buffer.duration-state.segmentStart);
  }

  function configureFilter(node,params,immediate=false){
    if(!node||!audioContext) return;
    node.type=params.type;
    const now=audioContext.currentTime;
    const set=(param,value)=>{
      if(immediate){param.setValueAtTime(value,now);return;}
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value,now,.025);
    };
    set(node.frequency,params.frequency);
    set(node.gain,params.gain);
    if(params.type==="peaking") set(node.Q,params.q);
  }

  async function startAudio(buffer){
    stopAudio();
    const context=await getContext();
    const token=++sourceToken;
    source=context.createBufferSource();
    targetFilter=context.createBiquadFilter();
    userFilter=context.createBiquadFilter();
    refGain=context.createGain();
    userGain=context.createGain();
    masterGain=context.createGain();

    source.buffer=buffer;
    source.loop=true;
    source.loopStart=state.segmentStart;
    source.loopEnd=state.segmentStart+state.segmentDuration;
    configureFilter(targetFilter,state.target,true);
    configureFilter(userFilter,state.user,true);
    refGain.gain.value=1;
    userGain.gain.value=0;
    masterGain.gain.value=.42;

    source.connect(targetFilter);targetFilter.connect(refGain);refGain.connect(masterGain);
    source.connect(userFilter);userFilter.connect(userGain);userGain.connect(masterGain);
    masterGain.connect(context.destination);
    source.onended=()=>{if(token===sourceToken) source=null;};
    source.start(0,state.segmentStart);
    trainer?.classList.remove("is-loading");
  }

  function stopAudio(){
    sourceToken+=1;
    if(source){try{source.stop();}catch(_){ }try{source.disconnect();}catch(_){ }source=null;}
    [targetFilter,userFilter,refGain,userGain,masterGain].forEach(node=>{try{node?.disconnect();}catch(_){ }});
    targetFilter=userFilter=refGain=userGain=masterGain=null;
  }

  function switchSide(side,instant=false){
    if(!["reference","yours"].includes(side)||!trainer) return;
    state.activeSide=side;
    trainer.querySelectorAll("[data-eqpro-side]").forEach(button=>button.classList.toggle("is-active",button.dataset.eqproSide===side));
    if(!audioContext||!refGain||!userGain) return;
    const now=audioContext.currentTime;
    const duration=instant?.001:.055;
    [refGain.gain,userGain.gain].forEach(param=>param.cancelScheduledValues(now));
    refGain.gain.setValueAtTime(refGain.gain.value,now);
    userGain.gain.setValueAtTime(userGain.gain.value,now);
    refGain.gain.linearRampToValueAtTime(side==="reference"?1:0,now+duration);
    userGain.gain.linearRampToValueAtTime(side==="yours"?1:0,now+duration);
    updateCoach(side==="reference"?"Reference · escucha el cambio oculto.":"Yours · mueve el nodo y compara inmediatamente con Reference.");
  }

  function setupGraphInput(){
    const graph=trainer.querySelector("[data-eqpro-graph]");
    let dragging=false;
    const fromPointer=event=>{
      if(state.phase!=="editing") return;
      const rect=graph.getBoundingClientRect();
      const x=clamp((event.clientX-rect.left)/rect.width,0,1);
      const y=clamp((event.clientY-rect.top)/rect.height,0,1);
      state.user.frequency=xToHz(x);
      state.user.gain=Math.round(yToDb(y)*10)/10;
      syncUserFilter();
      syncUserUI();
    };
    graph.addEventListener("pointerdown",event=>{
      if(state.phase!=="editing") return;
      dragging=true;
      graph.setPointerCapture?.(event.pointerId);
      fromPointer(event);
    });
    graph.addEventListener("pointermove",event=>{if(dragging) fromPointer(event);});
    graph.addEventListener("pointerup",event=>{dragging=false;graph.releasePointerCapture?.(event.pointerId);});
    graph.addEventListener("pointercancel",()=>{dragging=false;});
    graph.addEventListener("keydown",event=>{
      if(state.phase!=="editing") return;
      const frequencyStep=event.shiftKey?1.16:1.07;
      let handled=true;
      if(event.key==="ArrowLeft") state.user.frequency/=frequencyStep;
      else if(event.key==="ArrowRight") state.user.frequency*=frequencyStep;
      else if(event.key==="ArrowUp") state.user.gain+=event.shiftKey?1:.5;
      else if(event.key==="ArrowDown") state.user.gain-=event.shiftKey?1:.5;
      else handled=false;
      if(!handled) return;
      event.preventDefault();
      state.user.frequency=clamp(state.user.frequency,GRAPH.minHz,GRAPH.maxHz);
      state.user.gain=clamp(state.user.gain,GRAPH.minDb,GRAPH.maxDb);
      syncUserFilter();syncUserUI();
    });
  }

  function syncUserFilter(){
    if(userFilter) configureFilter(userFilter,state.user,false);
    if(state.activeSide!=="yours") switchSide("yours");
  }

  function syncUserUI(){
    if(!trainer) return;
    trainer.querySelector("[data-eqpro-frequency]").textContent=formatHz(state.user.frequency);
    trainer.querySelector("[data-eqpro-gain]").textContent=formatDb(state.user.gain);
    trainer.querySelector("[data-eqpro-shape]").textContent=state.user.type==="lowshelf"?"Low Shelf":state.user.type==="highshelf"?"High Shelf":"Bell";
    const readout=trainer.querySelector("[data-eqpro-readout]");
    readout.innerHTML=`<strong>${formatHz(state.user.frequency)}</strong><span>${formatDb(state.user.gain)}</span>`;
    positionNode();
    drawCurves();
    renderDebug();
  }

  function positionNode(){
    const x=hzToX(state.user.frequency)*10;
    const y=dbToY(state.user.gain)*4.3;
    ["[data-eqpro-node-hit]","[data-eqpro-node]","[data-eqpro-node-core]"].forEach(selector=>{
      const node=trainer.querySelector(selector);if(node){node.setAttribute("cx",x);node.setAttribute("cy",y);}
    });
    const readout=trainer.querySelector("[data-eqpro-readout]");
    if(readout){
      readout.style.left=`${hzToX(state.user.frequency)}%`;
      readout.style.top=`${dbToY(state.user.gain)}%`;
    }
  }

  function tempResponse(params){
    if(!audioContext) return new Float32Array(GRAPH.samples);
    const filter=audioContext.createBiquadFilter();
    filter.type=params.type;
    filter.frequency.value=params.frequency;
    filter.gain.value=params.gain;
    if(params.type==="peaking") filter.Q.value=params.q;
    const frequencies=new Float32Array(GRAPH.samples);
    const magnitude=new Float32Array(GRAPH.samples);
    const phase=new Float32Array(GRAPH.samples);
    const min=Math.log(GRAPH.minHz),max=Math.log(GRAPH.maxHz);
    for(let i=0;i<GRAPH.samples;i++) frequencies[i]=Math.exp(min+(max-min)*(i/(GRAPH.samples-1)));
    filter.getFrequencyResponse(frequencies,magnitude,phase);
    try{filter.disconnect();}catch(_){ }
    const db=new Float32Array(GRAPH.samples);
    for(let i=0;i<GRAPH.samples;i++) db[i]=20*Math.log10(Math.max(magnitude[i],1e-6));
    return db;
  }

  function curvePath(params){
    const response=tempResponse(params);
    let path="";
    for(let i=0;i<response.length;i++){
      const x=(i/(response.length-1))*1000;
      const y=dbToY(response[i])*4.3;
      path+=`${i?" L":"M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return path||"M0 215 L1000 215";
  }

  function drawCurves(){
    if(!trainer||!audioContext) return;
    const userCurve=trainer.querySelector("[data-eqpro-user-curve]");
    const targetCurve=trainer.querySelector("[data-eqpro-target-curve]");
    userCurve?.setAttribute("d",curvePath(state.user));
    targetCurve?.setAttribute("d",curvePath(state.target));
    const tx=hzToX(state.target.frequency)*10,ty=dbToY(state.target.gain)*4.3;
    const targetNode=trainer.querySelector("[data-eqpro-target-node]");
    if(targetNode){targetNode.setAttribute("cx",tx);targetNode.setAttribute("cy",ty);}
  }

  function evaluateMatch(){
    const targetResponse=tempResponse(state.target);
    const userResponse=tempResponse(state.user);
    let sum=0,weighted=0,weightTotal=0;
    const targetLog=log10(state.target.frequency);
    const minLog=log10(GRAPH.minHz),maxLog=log10(GRAPH.maxHz);
    for(let i=0;i<targetResponse.length;i++){
      const t=i/(targetResponse.length-1);
      const logHz=lerp(minLog,maxLog,t);
      const distance=Math.abs(logHz-targetLog);
      const localWeight=1+3*Math.exp(-Math.pow(distance/.42,2));
      const diff=targetResponse[i]-userResponse[i];
      sum+=diff*diff;
      weighted+=diff*diff*localWeight;
      weightTotal+=localWeight;
    }
    const rms=Math.sqrt(sum/targetResponse.length);
    const weightedRms=Math.sqrt(weighted/weightTotal);
    const octaveError=Math.abs(Math.log2(state.user.frequency/state.target.frequency));
    const gainError=Math.abs(state.user.gain-state.target.gain);
    const shapePenalty=state.user.type===state.target.type?0:12;
    const responseScore=clamp(100-weightedRms*10.5,0,100);
    const parameterScore=clamp(100-octaveError*28-gainError*5-shapePenalty,0,100);
    const match=Math.round(responseScore*.78+parameterScore*.22);
    return {match,rms,weightedRms,octaveError,gainError};
  }

  function speedBonus(seconds){
    if(seconds<=15) return 1;
    if(seconds<=30) return .92;
    if(seconds<=50) return .82;
    if(seconds<=75) return .7;
    return .58;
  }

  function confirmMatch(){
    if(state.phase!=="editing") return;
    stopDecisionTimer();
    state.phase="reveal";
    state.revealed=true;
    const elapsed=Math.max(0,(performance.now()-state.decisionStartedAt)/1000);
    state.responseTimes.push(elapsed);
    const evaluation=evaluateMatch();
    const config=STAGES[state.stage-1];
    const passed=evaluation.match>=config.threshold;
    const stageBase=200*(evaluation.match/100);
    const stagePoints=Math.round(stageBase*speedBonus(elapsed));
    state.stageScores.push({stage:state.stage,match:evaluation.match,points:stagePoints,passed,seconds:elapsed});
    if(passed){
      state.matches+=1;
      state.score=clamp(state.score+stagePoints,0,1000);
      playCorrectSound();
    }else{
      state.lives=Math.max(0,state.lives-1);
      playWrongSound();
    }

    trainer.classList.add("is-reveal");
    renderLives();
    trainer.querySelector("[data-eqpro-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-eqpro-confirm]").hidden=true;
    trainer.querySelector("[data-eqpro-continue]").hidden=false;
    const feedback=trainer.querySelector("[data-eqpro-feedback]");
    feedback.className=`sg-eqpro-feedback ${passed?"is-correct":"is-wrong"}`;
    feedback.innerHTML=`
      <div class="sg-eqpro-match-score"><strong>${evaluation.match}%</strong><span>${passed?`+${stagePoints} pts`:"Match"}</span></div>
      <div class="sg-eqpro-feedback-copy">
        <strong>${passed?"Match conseguido":"Todavía no coincide"}</strong>
        <span>Objetivo: ${formatHz(state.target.frequency)} · ${formatDb(state.target.gain)} · ${shapeName(state.target.type)}</span>
        <span>Tu EQ: ${formatHz(state.user.frequency)} · ${formatDb(state.user.gain)} · ${shapeName(state.user.type)}</span>
      </div>`;
    updateCoach(passed?"Compara ahora Reference y Yours con la curva revelada. Escucha por qué tu ajuste funcionó.":"La curva naranja es la referencia. Compárala con la tuya antes de continuar.");
    drawCurves();
    renderDebug(evaluation);
  }

  function shapeName(type){return type==="lowshelf"?"Low Shelf":type==="highshelf"?"High Shelf":"Bell";}

  async function continueStage(){
    if(state.phase!=="reveal") return;
    if(state.lives<=0||state.stage>=STAGE_TOTAL){
      finishSession();
      return;
    }
    await beginStage(state.stage+1);
  }

  function updateCoach(text){
    const coach=trainer?.querySelector("[data-eqpro-coach]");
    if(coach) coach.textContent=text;
  }

  function startDecisionTimer(){
    stopDecisionTimer();
    decisionTimer=setInterval(()=>{
      if(state.phase!=="editing") return;
      renderDebug();
    },250);
  }
  function stopDecisionTimer(){if(decisionTimer) clearInterval(decisionTimer);decisionTimer=0;}

  function renderDebug(evaluation=null){
    const host=trainer?.querySelector("[data-eqpro-debug]");
    if(!host||!state.debug) return;
    host.hidden=false;
    const live=evaluation||((state.phase==="editing"&&audioContext)?evaluateMatch():null);
    host.textContent=`target ${formatHz(state.target.frequency)} ${formatDb(state.target.gain)} | user ${formatHz(state.user.frequency)} ${formatDb(state.user.gain)} | ${live?`match ${live.match}%`:""}`;
  }

  function finishSession(){
    stopDecisionTimer();
    stopAudio();
    state.phase="results";
    trainer.classList.remove("is-reveal","is-loading");
    trainer.classList.add("is-results");
    const attempted=Math.max(1,state.stageScores.length);
    const averageMatch=state.stageScores.reduce((sum,item)=>sum+item.match,0)/attempted;
    const averageTime=state.responseTimes.length?state.responseTimes.reduce((a,b)=>a+b,0)/state.responseTimes.length:Infinity;
    const completion=state.stage>=STAGE_TOTAL?100:(state.stage/STAGE_TOTAL)*100;
    const accuracy=Math.round(averageMatch*.85+completion*.15);
    const normalizedScore=Math.round(clamp(state.score,0,1000));
    const stars=state.matches>=4&&averageMatch>=86&&state.lives>=1?3:state.matches>=3&&averageMatch>=76?2:state.matches>=2?1:0;

    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0));
    const best=Math.max(previous,stars);
    progress[GAME_ID]=best;
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    saveStats(accuracy,averageTime,normalizedScore,averageMatch);
    if(window.SoundGymProgress?.setStars) window.SoundGymProgress.setStars(GAME_ID,best);
    markCardLive();

    const summary=trainer.querySelector("[data-eqpro-summary]");
    summary.innerHTML=`
      <div><span>Precisión</span><strong>${accuracy}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(averageTime)?averageTime.toFixed(1):"—"} s</strong></div>
      <div><span>Score</span><strong>${normalizedScore}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;
    summary.classList.add("show");
    const next=trainer.querySelector("[data-eqpro-next]");
    next.textContent="Repetir";
    next.classList.add("show");
    trainer.querySelector("[data-eqpro-confirm]").hidden=true;
    trainer.querySelector("[data-eqpro-continue]").hidden=true;
  }

  async function restartAfterResults(){
    if(state.phase!=="results") return;
    trainer.classList.remove("is-results");
    await startGame();
  }

  function readJson(key){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||"{}");
      return parsed&&typeof parsed==="object"?parsed:{};
    }catch(_){return {};}
  }

  function saveStats(accuracy,averageTime,score,averageMatch){
    const stats=readJson(STATS_KEY);
    const previous=stats[GAME_ID]||{};
    const recent=Array.isArray(previous.recent)?previous.recent.slice(-4):[];
    recent.push({accuracy,averageTime:Number.isFinite(averageTime)?Number(averageTime.toFixed(2)):null,score,averageMatch:Number(averageMatch.toFixed(1)),at:Date.now()});
    stats[GAME_ID]={
      bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(averageTime)?Math.min(Number(previous.bestAverageTime)||Infinity,averageTime):(previous.bestAverageTime??null),
      bestScore:Math.max(Number(previous.bestScore)||0,score),
      bestMatch:Math.max(Number(previous.bestMatch)||0,averageMatch),
      sessions:(Number(previous.sessions)||0)+1,
      recent
    };
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
  }

  async function playStartSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      [587.33,880,1174.66].forEach((frequency,index)=>{
        const osc=context.createOscillator(),gain=context.createGain(),start=now+index*.075;
        osc.type="square";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.03,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+.15);
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
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.28);
        osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.3);
      });
    }catch(_){ }
  }

  async function playWrongSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      const osc=context.createOscillator(),gain=context.createGain();
      osc.type="triangle";osc.frequency.setValueAtTime(164.81,now);osc.frequency.exponentialRampToValueAtTime(130,now+.24);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.04,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.26);
      osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.27);
    }catch(_){ }
  }

  function showToast(message){
    const toast=document.getElementById("sgToast");if(!toast) return;
    toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2300);
  }

  document.addEventListener("keydown",event=>{
    if(event.key.toLowerCase()==="d"&&event.altKey&&trainer?.classList.contains("show")){
      state.debug=!state.debug;
      const host=trainer.querySelector("[data-eqpro-debug]");
      if(host) host.hidden=!state.debug;
      renderDebug();
    }
    if(!trainer?.classList.contains("show")) return;
    if(event.key==="1") switchSide("reference");
    if(event.key==="2") switchSide("yours");
  });

  document.addEventListener("click",event=>{
    const card=event.target.closest?.('[data-game="eq-match"]');
    if(!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startGame();
  },true);

  markCardLive();
})();
