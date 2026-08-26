(function(){
  "use strict";

  const GAME_ID="frequency-hunt";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const STAGE_TOTAL=15;
  const QUESTIONS_PER_LEVEL=5;
  const STARTING_LIVES=5;
  const MIN_HZ=40;
  const MAX_HZ=16000;
  const MAX_GATE_ATTEMPTS=16;

  const LEVELS=[
    {name:"Level 1 · Learn",short:"Learn",boost:12,q:.78,passCents:650,bandOctaves:.55,minAudibilityDb:-21,master:.20,freqs:[80,125,250,500,1000,2000,4000,8000]},
    {name:"Level 2 · Train",short:"Train",boost:9,q:.96,passCents:500,bandOctaves:.42,minAudibilityDb:-23,master:.27,freqs:[63,100,160,315,630,1250,2500,5000,10000]},
    {name:"Level 3 · Pro",short:"Pro",boost:7,q:1.18,passCents:360,bandOctaves:.30,minAudibilityDb:-25.5,master:.34,freqs:null}
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
    return {ready:false,phase:"idle",stage:0,lives:STARTING_LIVES,score:0,hits:0,clip:null,clipDeck:[],targetHz:1000,guessHz:1000,activeSide:"on",segmentStart:0,segmentDuration:6.5,decisionStartedAt:0,responseTimes:[],stageScores:[],revealed:false,audibilityDb:null};
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
  function log2(value){return Math.log(value)/Math.LN2;}
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
  function levelIndexForStage(stage){return clamp(Math.floor((Math.max(1,stage)-1)/QUESTIONS_PER_LEVEL),0,LEVELS.length-1);}
  function levelConfig(stage){return LEVELS[levelIndexForStage(stage)];}

  function installV3Style(){
    if(document.getElementById("frequencyHuntV3Style")) return;
    const style=document.createElement("style");
    style.id="frequencyHuntV3Style";
    style.textContent=`
      .sg-fhpro-stage span[data-fh-stage-label]{letter-spacing:.08em;text-transform:uppercase}
      .sg-fhpro-source[data-audibility="verified"]::after{content:" · audible ✓";color:#62df85;font-weight:900}
      .sg-fhpro-feedback-copy .fh-eq-detail{color:#ff9a52!important;font-weight:850}
    `;
    document.head.appendChild(style);
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
    installV3Style();
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-fhpro-trainer";
    trainer.id="sgFrequencyHuntTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-fhpro-head">
        <div>
          <span class="sg-trainer-kicker">Level 3 · Studio</span>
          <h2>Frequency Hunt</h2>
          <p>15 rondas en 3 niveles. Una bell EQ oculta siempre se valida para que el cambio tenga energía audible en la fuente.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-fh-close aria-label="Cerrar Frequency Hunt">×</button>
      </div>
      <div class="sg-fhpro-hud">
        <div class="sg-fhpro-hud-cell"><span>Score</span><strong data-fh-score>0</strong></div>
        <div class="sg-fhpro-stage"><strong data-fh-stage>1 / 15</strong><span data-fh-stage-label>Level 1 · Learn</span></div>
        <div class="sg-fhpro-lives" data-fh-lives aria-label="5 vidas"></div>
      </div>
      <div class="sg-fhpro-source" data-fh-source>Cargando fuente…</div>
      <div class="sg-fhpro-frequency-readout"><span>Tu selección</span><strong data-fh-readout>1.00 kHz</strong></div>
      <div class="sg-fhpro-spectrum" data-fh-spectrum role="slider" tabindex="0" aria-label="Seleccionar frecuencia" aria-valuemin="40" aria-valuemax="16000" aria-valuenow="1000">
        <div class="sg-fhpro-grid" aria-hidden="true"></div>
        <div class="sg-fhpro-band" data-fh-band aria-hidden="true"></div>
        <div class="sg-fhpro-guess-line" data-fh-guess-line aria-hidden="true"><span></span></div>
        <div class="sg-fhpro-target-line" data-fh-target-line aria-hidden="true"><span>Target</span></div>
        <div class="sg-fhpro-labels" aria-hidden="true">${[40,60,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000].map(hz=>`<span style="left:${hzToPercent(hz)}%">${hz>=1000?(hz/1000)+"k":hz}</span>`).join("")}</div>
      </div>
      <div class="sg-fhpro-switch" role="group" aria-label="Comparar EQ apagada y encendida">
        <button type="button" data-fh-side="off"><span>EQ OFF</span><small>Original</small></button>
        <button type="button" class="is-active" data-fh-side="on"><span>EQ ON</span><small>Peak oculto</small></button>
      </div>
      <div class="sg-fhpro-coach" data-fh-coach>Preparando una combinación con energía suficiente en la frecuencia objetivo…</div>
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
    }catch(error){
      console.warn("Frequency Hunt v3 start error",error);
      showToast(error.message||"No se pudo iniciar Frequency Hunt.");
    }
  }

  function closeTrainer(){
    stopAudio();
    stopDecisionTimer();
    trainer?.classList.remove("show");
  }

  async function loadManifest(){
    const response=await fetch(MANIFEST_URL,{cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar el audio de Sound Gym.");
    manifest=await response.json();
  }

  function buildClipDeck(){
    const clips=(manifest?.clips||[]).filter(clip=>clip?.id&&clip?.file);
    return shuffle(clips);
  }

  function clipSupportsFrequency(clip,hz){
    const category=String(clip?.category||"");
    if(hz<90) return ["bass","drums","percussion","full_mix"].includes(category);
    if(hz<180) return !["vocals","brass"].includes(category);
    if(hz>12000) return ["drums","percussion","full_mix"].includes(category);
    if(hz>8500) return category!=="bass";
    return true;
  }

  function takeCompatibleClip(hz){
    if(!state.clipDeck.length) state.clipDeck=buildClipDeck();
    let index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));
    if(index<0){
      state.clipDeck=buildClipDeck();
      index=state.clipDeck.findIndex(clip=>clipSupportsFrequency(clip,hz));
    }
    if(index<0) index=0;
    return state.clipDeck.splice(index,1)[0]||manifest?.clips?.[0];
  }

  function randomLogFrequency(min=65,max=12000){
    const low=Math.log(min),high=Math.log(max);
    return Math.exp(low+Math.random()*(high-low));
  }

  function stageTarget(stageNumber,attempt=0){
    const config=levelConfig(stageNumber);
    if(config.freqs){
      const base=config.freqs[Math.floor(Math.random()*config.freqs.length)];
      const jitter=levelIndexForStage(stageNumber)===0?1:(.94+Math.random()*.12);
      return clamp(base*jitter,MIN_HZ,MAX_HZ);
    }
    const raw=randomLogFrequency(70,12000);
    const jitter=attempt%3===0?1:(.97+Math.random()*.06);
    return clamp(raw*jitter,MIN_HZ,MAX_HZ);
  }

  async function beginStage(number){
    stopAudio();
    stopDecisionTimer();
    state.stage=number;
    state.phase="loading";
    state.revealed=false;
    state.guessHz=1000;
    state.activeSide="on";
    state.audibilityDb=null;
    renderStage();
    updateCoach("Analizando la fuente para garantizar que el cambio de EQ sea realmente audible…");

    const candidate=await chooseAudibleCandidate(number);
    if(state.stage!==number) return;
    state.targetHz=candidate.targetHz;
    state.clip=candidate.clip;
    state.segmentStart=candidate.segmentStart;
    state.segmentDuration=candidate.segmentDuration;
    state.audibilityDb=candidate.audibilityDb;
    state.decisionStartedAt=performance.now();
    renderStage();
    await startAudio(candidate.buffer);
    if(state.stage!==number) return;
    state.phase="editing";
    syncSelector();
    switchSide("on",true);
    updateCoach(`${levelConfig(number).name} · EQ On está sonando. Alterna con EQ Off y localiza el cambio.`);
    startDecisionTimer();
  }

  async function chooseAudibleCandidate(stageNumber){
    const config=levelConfig(stageNumber);
    let best=null;

    for(let attempt=0;attempt<MAX_GATE_ATTEMPTS;attempt++){
      const targetHz=stageTarget(stageNumber,attempt);
      const clip=takeCompatibleClip(targetHz);
      if(!clip) continue;
      let buffer;
      try{buffer=await decodeClip(clip);}catch(_){continue;}
      const segment=findAudibleSegment(buffer,targetHz,config);
      const candidate={clip,buffer,targetHz,...segment};
      if(!best||candidate.audibilityDb>best.audibilityDb) best=candidate;
      if(candidate.audibilityDb>=config.minAudibilityDb) return candidate;
    }

    console.warn("Frequency Hunt audibility gate rejected all candidates",{stage:stageNumber,bestDb:best?.audibilityDb,requiredDb:config.minAudibilityDb});
    throw new Error("No encontramos una combinación suficientemente audible. Intenta nuevamente.");
  }

  function findAudibleSegment(buffer,targetHz,config){
    const segmentDuration=Math.min(6.5,Math.max(3.8,buffer.duration));
    const maxStart=Math.max(0,buffer.duration-segmentDuration);
    const starts=maxStart>0?[Math.random()*maxStart,Math.random()*maxStart,Math.random()*maxStart]:[0];
    let best={segmentStart:starts[0]||0,segmentDuration:Math.min(segmentDuration,buffer.duration),audibilityDb:-120};
    for(const segmentStart of starts){
      const audibilityDb=estimateEqAudibility(buffer,segmentStart,Math.min(1.6,segmentDuration),targetHz,config.q,config.boost);
      if(audibilityDb>best.audibilityDb){
        best={segmentStart,segmentDuration:Math.min(segmentDuration,buffer.duration-segmentStart),audibilityDb};
      }
    }
    return best;
  }

  function estimateEqAudibility(buffer,startSeconds,durationSeconds,targetHz,q,gainDb){
    const sampleRate=buffer.sampleRate;
    const startFrame=Math.max(0,Math.floor(startSeconds*sampleRate));
    const available=Math.max(0,buffer.length-startFrame);
    const frameCount=Math.min(available,Math.floor(durationSeconds*sampleRate));
    if(frameCount<1024) return -120;

    let stride=Math.max(1,Math.floor(frameCount/36000));
    while(stride>1&&sampleRate/stride<targetHz*3.2) stride--;
    const fs=sampleRate/stride;
    if(targetHz>=fs*.46) return -120;

    const coeff=peakingCoefficients(targetHz,q,gainDb,fs);
    let x1=0,x2=0,y1=0,y2=0;
    let drySq=0,diffSq=0,count=0;
    const channels=buffer.numberOfChannels;
    const channelData=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));

    for(let frame=startFrame;frame<startFrame+frameCount;frame+=stride){
      let x=0;
      for(let c=0;c<channels;c++) x+=channelData[c][frame]||0;
      x/=Math.max(1,channels);
      const y=coeff.b0*x+coeff.b1*x1+coeff.b2*x2-coeff.a1*y1-coeff.a2*y2;
      x2=x1;x1=x;y2=y1;y1=y;
      if(count>48){
        const diff=y-x;
        drySq+=x*x;
        diffSq+=diff*diff;
      }
      count++;
    }

    const useful=Math.max(1,count-48);
    const dryRms=Math.sqrt(drySq/useful);
    const diffRms=Math.sqrt(diffSq/useful);
    if(!Number.isFinite(dryRms)||dryRms<.0025||!Number.isFinite(diffRms)) return -120;
    return 20*Math.log10(Math.max(1e-9,diffRms/dryRms));
  }

  function peakingCoefficients(frequency,q,gainDb,sampleRate){
    const A=Math.pow(10,gainDb/40);
    const w0=2*Math.PI*clamp(frequency,20,sampleRate*.45)/sampleRate;
    const alpha=Math.sin(w0)/(2*Math.max(.1,q));
    const cos=Math.cos(w0);
    const b0=1+alpha*A;
    const b1=-2*cos;
    const b2=1-alpha*A;
    const a0=1+alpha/A;
    const a1=-2*cos;
    const a2=1-alpha/A;
    return {b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0};
  }

  function renderStage(){
    if(!trainer) return;
    const config=levelConfig(state.stage||1);
    trainer.classList.remove("is-reveal","is-results");
    trainer.classList.toggle("is-loading",state.phase==="loading");
    trainer.querySelector("[data-fh-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-fh-stage]").textContent=`${Math.max(1,state.stage)} / ${STAGE_TOTAL}`;
    trainer.querySelector("[data-fh-stage-label]").textContent=config.name;
    const sourceLabel=trainer.querySelector("[data-fh-source]");
    sourceLabel.textContent=state.clip?`Fuente · ${state.clip.title}`:"Buscando fuente audible…";
    sourceLabel.dataset.audibility=state.clip?"verified":"pending";
    trainer.querySelector("[data-fh-feedback]").className="sg-fhpro-feedback";
    trainer.querySelector("[data-fh-feedback]").innerHTML="";
    trainer.querySelector("[data-fh-confirm]").hidden=false;
    trainer.querySelector("[data-fh-confirm]").disabled=state.phase==="loading";
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
    if(!audioContext) audioContext=new Ctor({latencyHint:"interactive"});
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
    const buffer=await context.decodeAudioData(arrayBuffer.slice(0));
    decoded.set(clip.id,buffer);
    return buffer;
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

    const config=levelConfig(state.stage);
    source.buffer=buffer;
    source.loop=true;
    source.loopStart=state.segmentStart;
    source.loopEnd=Math.min(buffer.duration,state.segmentStart+state.segmentDuration);
    wetFilter.type="peaking";
    wetFilter.frequency.value=state.targetHz;
    wetFilter.Q.value=config.q;
    wetFilter.gain.value=config.boost;
    dryGain.gain.value=0;
    wetGain.gain.value=1;
    masterGain.gain.value=config.master;

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
    if(!["off","on"].includes(side)||!trainer||state.phase==="reveal"||state.phase==="results"||state.phase==="loading") return;
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
    updateCoach(side==="on"?`${levelConfig(state.stage).name} · EQ On: escucha qué color aparece.`:"EQ Off · memoriza el original y vuelve a EQ On para comparar.");
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
    const config=levelConfig(state.stage||1);
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
    const octaveError=Math.abs(log2(state.guessHz/state.targetHz));
    const cents=octaveError*1200;
    const config=levelConfig(state.stage);
    const passed=cents<=config.passCents;
    const score=Math.round(clamp(100-cents/12,0,100));
    return {score,octaveError,cents,passed};
  }

  function speedBonus(seconds){
    if(seconds<=12) return 1;
    if(seconds<=22) return .95;
    if(seconds<=35) return .88;
    if(seconds<=55) return .78;
    return .68;
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
    const config=levelConfig(state.stage);
    const passed=evaluation.passed;
    const maxRoundPoints=1000/STAGE_TOTAL;
    const points=Math.round(maxRoundPoints*(Math.max(35,evaluation.score)/100)*speedBonus(elapsed));
    state.stageScores.push({stage:state.stage,level:levelIndexForStage(state.stage)+1,accuracy:evaluation.score,points,passed,seconds:elapsed,targetHz:state.targetHz,guessHz:state.guessHz,boost:config.boost,q:config.q,audibilityDb:state.audibilityDb});

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
        <strong>${passed?"Frecuencia localizada":"Fuera del rango de acierto"}</strong>
        <span>Target: ${formatHz(state.targetHz)} · Yours: ${formatHz(state.guessHz)}</span>
        <span>Distancia auditiva: ${cents} cents</span>
        <span class="fh-eq-detail">${config.name} · Bell EQ +${config.boost} dB · Q ${config.q.toFixed(2)}</span>
      </div>`;
    updateCoach(passed?"Bien. El target naranja revela la frecuencia real.":"Compara tu línea con el target naranja. El cambio sí fue validado como audible antes de presentarse.");
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
    const completion=state.stageScores.length/STAGE_TOTAL*100;
    const accuracy=Math.round(averageAccuracy*.82+completion*.18);
    const normalizedScore=Math.round(clamp(state.score,0,1000));
    const stars=state.hits>=13&&averageAccuracy>=82&&completion>=99?3:state.hits>=10&&averageAccuracy>=70?2:state.hits>=7?1:0;

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
    recent.push({accuracy,averageTime:Number.isFinite(averageTime)?Number(averageTime.toFixed(2)):null,score,averageFrequencyAccuracy:Number(averageFrequencyAccuracy.toFixed(1)),rounds:state.stageScores.length,version:3,at:Date.now()});
    stats[GAME_ID]={
      bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),
      bestAverageTime:Number.isFinite(averageTime)?Math.min(Number(previous.bestAverageTime)||Infinity,averageTime):(previous.bestAverageTime??null),
      bestScore:Math.max(Number(previous.bestScore)||0,score),
      bestFrequencyAccuracy:Math.max(Number(previous.bestFrequencyAccuracy)||0,averageFrequencyAccuracy),
      sessions:(Number(previous.sessions)||0)+1,
      version:3,
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
    const toast=document.getElementById("sgToast");
    if(!toast) return;
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

  window.FortissimoFrequencyHuntV3={version:3,levels:LEVELS.map(level=>({name:level.name,boost:level.boost,q:level.q})),stageTotal:STAGE_TOTAL};
  markCardLive();
})();
