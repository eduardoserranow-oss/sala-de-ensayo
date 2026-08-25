(function(){
  "use strict";

  const GAME_ID="frequency-hunt";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const STAGE_TOTAL=5;
  const STARTING_LIVES=3;
  const MIN_HZ=40;
  const MAX_HZ=16000;
  const STAGES=[
    {boost:10,q:.82,threshold:67,bandOctaves:.48,label:"Orientation",freqs:[80,140,250,500,1000,2500,6000,10000]},
    {boost:8,q:.95,threshold:72,bandOctaves:.39,label:"Recognition",freqs:[65,110,180,320,650,1300,3000,7200,12000]},
    {boost:6.5,q:1.08,threshold:77,bandOctaves:.31,label:"Focus",freqs:null},
    {boost:5,q:1.28,threshold:82,bandOctaves:.24,label:"Precision",freqs:null},
    {boost:3.8,q:1.52,threshold:86,bandOctaves:.18,label:"Golden Ear",freqs:null}
  ];
  const CLIP_IDS=[
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext=null;
  let manifest=null;
  let trainer=null;
  let source=null;
  let wetFilter=null;
  let dryGain=null;
  let wetGain=null;
  let masterGain=null;
  let sourceToken=0;
  let decisionTimer=0;
  const decoded=new Map();
  let state=freshState();

  function freshState(){
    return {
      ready:false,
      phase:"idle",
      stage:0,
      lives:STARTING_LIVES,
      score:0,
      hits:0,
      clip:null,
      clipDeck:[],
      targetHz:1000,
      guessHz:1000,
      activeSide:"on",
      segmentStart:0,
      segmentDuration:7,
      decisionStartedAt:0,
      responseTimes:[],
      stageScores:[],
      revealed:false
    };
  }

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function shuffle(values){
    const copy=[...values];
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }
  function log10(value){return Math.log(value)/Math.LN10;}
  function hzToPercent(hz){
    const min=log10(MIN_HZ),max=log10(MAX_HZ);
    return ((log10(clamp(hz,MIN_HZ,MAX_HZ))-min)/(max-min))*100;
  }
  function percentToHz(percent){
    const min=Math.log(MIN_HZ),max=Math.log(MAX_HZ);
    return Math.exp(min+(max-min)*clamp(percent,0,1));
  }
  function formatHz(value){
    if(value>=1000){
      const digits=value>=10000?1:2;
      return `${(value/1000).toFixed(digits).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')} kHz`;
    }
    return `${Math.round(value)} Hz`;
  }

  function markCardLive(){
    const card=document.querySelector('[data-game="frequency-hunt"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.fhProObserver==="1") return;
    card.dataset.fhProObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-fhpro-trainer";
    trainer.id="sgFrequencyHuntTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-fhpro-head">
        <div>
          <span class="sg-trainer-kicker">Level 3 · Studio</span>
          <h2>Frequency Hunt</h2>
          <p>Una frecuencia fue realzada con una bell EQ oculta. Alterna EQ Off / EQ On y localízala en el espectro.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-fh-close aria-label="Cerrar Frequency Hunt">×</button>
      </div>

      <div class="sg-fhpro-hud">
        <div class="sg-fhpro-hud-cell"><span>Score</span><strong data-fh-score>0</strong></div>
        <div class="sg-fhpro-stage"><strong data-fh-stage>1 / 5</strong><span data-fh-stage-label>Orientation</span></div>
        <div class="sg-fhpro-lives" data-fh-lives aria-label="3 vidas"></div>
      </div>

      <div class="sg-fhpro-source" data-fh-source>Cargando fuente…</div>

      <div class="sg-fhpro-frequency-readout">
        <span>Tu selección</span>
        <strong data-fh-readout>1.00 kHz</strong>
      </div>

      <div class="sg-fhpro-spectrum" data-fh-spectrum role="slider" tabindex="0" aria-label="Seleccionar frecuencia" aria-valuemin="40" aria-valuemax="16000" aria-valuenow="1000">
        <div class="sg-fhpro-grid" aria-hidden="true"></div>
        <div class="sg-fhpro-band" data-fh-band aria-hidden="true"></div>
        <div class="sg-fhpro-guess-line" data-fh-guess-line aria-hidden="true"><span></span></div>
        <div class="sg-fhpro-target-line" data-fh-target-line aria-hidden="true"><span>Target</span></div>
        <div class="sg-fhpro-labels" aria-hidden="true">
          ${[40,60,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000].map(hz=>`<span style="left:${hzToPercent(hz)}%">${hz>=1000?(hz/1000)+"k":hz}</span>`).join("")}
        </div>
      </div>

      <div class="sg-fhpro-switch" role="group" aria-label="Comparar EQ apagada y encendida">
        <button type="button" data-fh-side="off"><span>EQ OFF</span><small>Original</small></button>
        <button type="button" class="is-active" data-fh-side="on"><span>EQ ON</span><small>Peak oculto</small></button>
      </div>

      <div class="sg-fhpro-coach" data-fh-coach>EQ On está sonando. Alterna con EQ Off y busca qué zona aparece al activar la EQ.</div>
      <div class="sg-fhpro-feedback" data-fh-feedback></div>

      <div class="sg-fhpro-actions">
        <button class="sg-fhpro-confirm" type="button" data-fh-confirm>Confirm Frequency</button>
        <button class="sg-fhpro-continue" type="button" data-fh-continue hidden>Continue</button>
      </div>

      <div class="sg-session-summary" data-fh-summary></div>
      <button class="sg-next" type="button" data-fh-next>Repetir</button>
    `;

    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);

    trainer.querySelector("[data-fh-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-fh-side]").forEach(button=>button.addEventListener("click",()=>switchSide(button.dataset.fhSide)));
    trainer.querySelector("[data-fh-confirm]")?.addEventListener("click",confirmFrequency);
    trainer.querySelector("[data-fh-continue]")?.addEventListener("click",continueStage);
    trainer.querySelector("[data-fh-next]")?.addEventListener("click",restartAfterResults);
    setupSpectrumInput();
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
    }catch(error){showToast(error.message||"No se pudo iniciar Frequency Hunt.");}
  }

  function closeTrainer(){
    stopAudio();
    stopDecisionTimer();
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
    if(hz<220) return !/female-vocal/.test(id);
    if(hz>9500) return !/bass/.test(id);
    return true;
  }

  function chooseClip(hz){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    let index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));
    if(index<0){state.clipDeck=buildClipDeck();index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));}
    if(index<0) index=0;
    return state.clipDeck.splice(index,1)[0]||manifest?.clips?.[0];
  }

  function randomLogFrequency(min=55,max=13500){
    const low=Math.log(min),high=Math.log(max);
    return Math.exp(low+Math.random()*(high-low));
  }

  function stageTarget(stageNumber){
    const config=STAGES[stageNumber-1];
    if(config.freqs){
      const base=config.freqs[Math.floor(Math.random()*config.freqs.length)];
      const jitter=stageNumber===1?1:(.9+Math.random()*.2);
      return clamp(base*jitter,MIN_HZ,MAX_HZ);
    }
    return randomLogFrequency(stageNumber>=5?60:50,stageNumber>=5?14000:13000);
  }

  async function beginStage(number){
    stopAudio();
    stopDecisionTimer();
    state.stage=number;
    state.phase="loading";
    state.revealed=false;
    state.targetHz=stageTarget(number);
    state.guessHz=1000;
    state.clip=chooseClip(state.targetHz);
    state.activeSide="on";
    state.decisionStartedAt=performance.now();
    renderStage();
    const buffer=await decodeClip(state.clip);
    if(state.stage!==number) return;
    prepareSegment(buffer);
    await startAudio(buffer);
    state.phase="editing";
    syncSelector();
    switchSide("on",true);
    updateCoach("EQ On está sonando. Alterna con EQ Off y arrastra el selector hasta la frecuencia que crees que fue realzada.");
    startDecisionTimer();
  }

  function renderStage(){
    const config=STAGES[state.stage-1];
    trainer.classList.remove("is-reveal","is-results","is-loading");
    trainer.classList.add("is-loading");
    trainer.querySelector("[data-fh-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-fh-stage]").textContent=`${state.stage} / ${STAGE_TOTAL}`;
    trainer.querySelector("[data-fh-stage-label]").textContent=config.label;
    trainer.querySelector("[data-fh-source]").textContent=state.clip?`Fuente · ${state.clip.title}`:"Cargando fuente…";
    trainer.querySelector("[data-fh-feedback]").className="sg-fhpro-feedback";
    trainer.querySelector("[data-fh-feedback]").innerHTML="";
    trainer.querySelector("[data-fh-confirm]").hidden=false;
    trainer.querySelector("[data-fh-confirm]").disabled=false;
    trainer.querySelector("[data-fh-continue]").hidden=true;
    trainer.querySelector("[data-fh-summary]").classList.remove("show");
    trainer.querySelector("[data-fh-summary]").innerHTML="";
    trainer.querySelector("[data-fh-next]").classList.remove("show");
    renderLives();
    syncSelector();
  }

  function renderLives(){
    const host=trainer?.querySelector("[data-fh-lives]");
    if(!host) return;
    host.innerHTML=Array.from({length:STARTING_LIVES},(_,index)=>`<span class="sg-fhpro-life${index<state.lives?" is-alive":""}" aria-hidden="true">♥</span>`).join("");
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
    }else arrayBuffer=await response.arrayBuffer();
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

  async function startAudio(buffer){
    stopAudio();
    const context=await getContext();
    const token=++sourceToken;
    source=context.createBufferSource();
    wetFilter=context.createBiquadFilter();
    dryGain=context.createGain();
    wetGain=context.createGain();
    masterGain=context.createGain();

    const config=STAGES[state.stage-1];
    source.buffer=buffer;
    source.loop=true;
    source.loopStart=state.segmentStart;
    source.loopEnd=state.segmentStart+state.segmentDuration;
    wetFilter.type="peaking";
    wetFilter.frequency.value=state.targetHz;
    wetFilter.Q.value=config.q;
    wetFilter.gain.value=config.boost;
    dryGain.gain.value=0;
    wetGain.gain.value=1;
    masterGain.gain.value=.4;

    source.connect(dryGain);dryGain.connect(masterGain);
    source.connect(wetFilter);wetFilter.connect(wetGain);wetGain.connect(masterGain);
    masterGain.connect(context.destination);
    source.onended=()=>{if(token===sourceToken) source=null;};
    source.start(0,state.segmentStart);
    trainer?.classList.remove("is-loading");
  }

  function stopAudio(){
    sourceToken+=1;
    if(source){try{source.stop();}catch(_){ }try{source.disconnect();}catch(_){ }source=null;}
    [wetFilter,dryGain,wetGain,masterGain].forEach(node=>{try{node?.disconnect();}catch(_){ }});
    wetFilter=dryGain=wetGain=masterGain=null;
  }

  function switchSide(side,instant=false){
    if(!["off","on"].includes(side)||!trainer||state.phase==="reveal"||state.phase==="results") return;
    state.activeSide=side;
    trainer.querySelectorAll("[data-fh-side]").forEach(button=>button.classList.toggle("is-active",button.dataset.fhSide===side));
    if(!audioContext||!dryGain||!wetGain) return;
    const now=audioContext.currentTime;
    const duration=instant?.001:.055;
    [dryGain.gain,wetGain.gain].forEach(param=>param.cancelScheduledValues(now));
    dryGain.gain.setValueAtTime(dryGain.gain.value,now);
    wetGain.gain.setValueAtTime(wetGain.gain.value,now);
    dryGain.gain.linearRampToValueAtTime(side==="off"?1:0,now+duration);
    wetGain.gain.linearRampToValueAtTime(side==="on"?1:0,now+duration);
    updateCoach(side==="on"?"EQ On · escucha qué color aparece con el peak oculto.":"EQ Off · memoriza el sonido original y vuelve a EQ On para comparar.");
  }

  function setupSpectrumInput(){
    const spectrum=trainer.querySelector("[data-fh-spectrum]");
    let dragging=false;
    const setFromPointer=event=>{
      if(state.phase!=="editing") return;
      const rect=spectrum.getBoundingClientRect();
      const percent=clamp((event.clientX-rect.left)/rect.width,0,1);
      state.guessHz=percentToHz(percent);
      syncSelector();
    };
    spectrum.addEventListener("pointerdown",event=>{
      if(state.phase!=="editing") return;
      dragging=true;
      spectrum.setPointerCapture?.(event.pointerId);
      setFromPointer(event);
    });
    spectrum.addEventListener("pointermove",event=>{if(dragging) setFromPointer(event);});
    spectrum.addEventListener("pointerup",event=>{dragging=false;spectrum.releasePointerCapture?.(event.pointerId);});
    spectrum.addEventListener("pointercancel",()=>{dragging=false;});
    spectrum.addEventListener("keydown",event=>{
      if(state.phase!=="editing") return;
      let handled=true;
      const factor=event.shiftKey?Math.pow(2,1/24):Math.pow(2,1/48);
      if(event.key==="ArrowLeft") state.guessHz/=factor;
      else if(event.key==="ArrowRight") state.guessHz*=factor;
      else handled=false;
      if(!handled) return;
      event.preventDefault();
      state.guessHz=clamp(state.guessHz,MIN_HZ,MAX_HZ);
      syncSelector();
    });
  }

  function syncSelector(){
    if(!trainer) return;
    const percent=hzToPercent(state.guessHz);
    const config=STAGES[Math.max(0,state.stage-1)]||STAGES[0];
    const low=state.guessHz/Math.pow(2,config.bandOctaves/2);
    const high=state.guessHz*Math.pow(2,config.bandOctaves/2);
    const left=hzToPercent(low);
    const right=hzToPercent(high);
    const band=trainer.querySelector("[data-fh-band]");
    const line=trainer.querySelector("[data-fh-guess-line]");
    const target=trainer.querySelector("[data-fh-target-line]");
    if(band){band.style.left=`${left}%`;band.style.width=`${Math.max(1,right-left)}%`;}
    if(line) line.style.left=`${percent}%`;
    if(target) target.style.left=`${hzToPercent(state.targetHz)}%`;
    trainer.querySelector("[data-fh-readout]").textContent=formatHz(state.guessHz);
    const spectrum=trainer.querySelector("[data-fh-spectrum]");
    spectrum?.setAttribute("aria-valuenow",String(Math.round(state.guessHz)));
    spectrum?.setAttribute("aria-valuetext",formatHz(state.guessHz));
  }

  function evaluateGuess(){
    const octaveError=Math.abs(Math.log2(state.guessHz/state.targetHz));
    const cents=octaveError*1200;
    const score=Math.round(clamp(100-cents/8.5,0,100));
    return {score,octaveError,cents};
  }

  function speedBonus(seconds){
    if(seconds<=12) return 1;
    if(seconds<=22) return .94;
    if(seconds<=35) return .86;
    if(seconds<=55) return .75;
    return .62;
  }

  function confirmFrequency(){
    if(state.phase!=="editing") return;
    stopDecisionTimer();
    stopAudio();
    state.phase="reveal";
    state.revealed=true;
    const elapsed=Math.max(0,(performance.now()-state.decisionStartedAt)/1000);
    state.responseTimes.push(elapsed);
    const evaluation=evaluateGuess();
    const config=STAGES[state.stage-1];
    const passed=evaluation.score>=config.threshold;
    const points=Math.round(200*(evaluation.score/100)*speedBonus(elapsed));
    state.stageScores.push({stage:state.stage,accuracy:evaluation.score,points,passed,seconds:elapsed,targetHz:state.targetHz,guessHz:state.guessHz});

    if(passed){
      state.hits+=1;
      state.score=clamp(state.score+points,0,1000);
      playCorrectSound();
    }else{
      state.lives=Math.max(0,state.lives-1);
      playWrongSound();
    }

    trainer.classList.add("is-reveal");
    renderLives();
    trainer.querySelector("[data-fh-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-fh-confirm]").hidden=true;
    trainer.querySelector("[data-fh-continue]").hidden=false;
    trainer.querySelectorAll("[data-fh-side]").forEach(button=>button.disabled=true);
    syncSelector();

    const cents=Math.round(evaluation.cents);
    const feedback=trainer.querySelector("[data-fh-feedback]");
    feedback.className=`sg-fhpro-feedback ${passed?"is-correct":"is-wrong"}`;
    feedback.innerHTML=`
      <div class="sg-fhpro-accuracy"><strong>${evaluation.score}%</strong><span>${passed?`+${points} pts`:"Accuracy"}</span></div>
      <div class="sg-fhpro-feedback-copy">
        <strong>${passed?"Frecuencia localizada":"Fuera del objetivo"}</strong>
        <span>Target: ${formatHz(state.targetHz)} · Yours: ${formatHz(state.guessHz)}</span>
        <span>Distancia auditiva: ${cents} cents</span>
      </div>`;
    updateCoach(passed?"Buen oído. La línea naranja revela la frecuencia real que encontraste.":"Compara tu línea con el target naranja. Mira si estabas buscando demasiado arriba o demasiado abajo.");
  }

  async function continueStage(){
    if(state.phase!=="reveal") return;
    if(state.lives<=0||state.stage>=STAGE_TOTAL){finishSession();return;}
    trainer.querySelectorAll("[data-fh-side]").forEach(button=>button.disabled=false);
    await beginStage(state.stage+1);
  }

  function updateCoach(text){
    const host=trainer?.querySelector("[data-fh-coach]");
    if(host) host.textContent=text;
  }

  function startDecisionTimer(){
    stopDecisionTimer();
    decisionTimer=setInterval(()=>{},500);
  }
  function stopDecisionTimer(){if(decisionTimer) clearInterval(decisionTimer);decisionTimer=0;}

  function finishSession(){
    stopDecisionTimer();
    stopAudio();
    state.phase="results";
    trainer.classList.remove("is-reveal","is-loading");
    trainer.classList.add("is-results");
    const attempted=Math.max(1,state.stageScores.length);
    const averageAccuracy=state.stageScores.reduce((sum,item)=>sum+item.accuracy,0)/attempted;
    const averageTime=state.responseTimes.length?state.responseTimes.reduce((a,b)=>a+b,0)/state.responseTimes.length:Infinity;
    const completion=state.stage>=STAGE_TOTAL?100:(state.stage/STAGE_TOTAL)*100;
    const accuracy=Math.round(averageAccuracy*.85+completion*.15);
    const normalizedScore=Math.round(clamp(state.score,0,1000));
    const stars=state.hits>=4&&averageAccuracy>=88&&state.lives>=1?3:state.hits>=3&&averageAccuracy>=77?2:state.hits>=2?1:0;

    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0));
    const best=Math.max(previous,stars);
    progress[GAME_ID]=best;
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    saveStats(accuracy,averageTime,normalizedScore,averageAccuracy);
    if(window.SoundGymProgress?.setStars) window.SoundGymProgress.setStars(GAME_ID,best);
    markCardLive();

    const summary=trainer.querySelector("[data-fh-summary]");
    summary.innerHTML=`
      <div><span>Precisión</span><strong>${accuracy}%</strong></div>
      <div><span>Tiempo promedio</span><strong>${Number.isFinite(averageTime)?averageTime.toFixed(1):"—"} s</strong></div>
      <div><span>Score</span><strong>${normalizedScore}/1000</strong></div>
      <div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;
    summary.classList.add("show");
    const next=trainer.querySelector("[data-fh-next]");
    next.textContent="Repetir";
    next.classList.add("show");
    trainer.querySelector("[data-fh-confirm]").hidden=true;
    trainer.querySelector("[data-fh-continue]").hidden=true;
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

  function saveStats(accuracy,averageTime,score,averageFrequencyAccuracy){
    const stats=readJson(STATS_KEY);
    const previous=stats[GAME_ID]||{};
    const recent=Array.isArray(previous.recent)?previous.recent.slice(-4):[];
    recent.push({accuracy,averageTime:Number.isFinite(averageTime)?Number(averageTime.toFixed(2)):null,score,averageFrequencyAccuracy:Number(averageFrequencyAccuracy.toFixed(1)),at:Date.now()});
    stats[GAME_ID]={
      bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(averageTime)?Math.min(Number(previous.bestAverageTime)||Infinity,averageTime):(previous.bestAverageTime??null),
      bestScore:Math.max(Number(previous.bestScore)||0,score),
      bestFrequencyAccuracy:Math.max(Number(previous.bestFrequencyAccuracy)||0,averageFrequencyAccuracy),
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
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.05,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.28);
        osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.3);
      });
    }catch(_){ }
  }

  async function playWrongSound(){
    try{
      const context=await getContext(),now=context.currentTime;
      const osc=context.createOscillator(),gain=context.createGain();
      osc.type="triangle";osc.frequency.setValueAtTime(164.81,now);osc.frequency.exponentialRampToValueAtTime(130,now+.24);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.26);
      osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.27);
    }catch(_){ }
  }

  function showToast(message){
    const toast=document.getElementById("sgToast");if(!toast) return;
    toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2300);
  }

  document.addEventListener("keydown",event=>{
    if(!trainer?.classList.contains("show")) return;
    if(event.key==="1") switchSide("off");
    if(event.key==="2") switchSide("on");
  });

  document.addEventListener("click",event=>{
    const card=event.target.closest?.('[data-game="frequency-hunt"]');
    if(!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startGame();
  },true);

  markCardLive();
})();