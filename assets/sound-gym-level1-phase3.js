(function(){
  "use strict";

  const GAME_ID="left-center-right";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL=10;
  const TOLERANCES=[.24,.22,.20,.18,.16,.14,.12,.10,.08,.06];
  const SOURCE_IDS=["female-vocal","male-vocal","guitar-afrobeat","guitar-clean","keys-2","keys-rhodes","percussion-dembow-120","percussion-conto-105","bass-funky-p","drums-funky"];

  let audioContext=null,manifest=null,trainer=null,activeNodes=[],requestId=0,decisionTimer=0;
  const decoded=new Map(),monoBuffers=new Map();
  let state=freshState();

  function freshState(){return{ready:false,round:0,hits:0,points:0,answered:false,targetPan:0,userPan:0,tolerance:TOLERANCES[0],clip:null,deck:[],segmentStart:null,segmentDuration:0,heard:false,decisionStartedAt:0,responseTimes:[],results:[],dragging:false,pointerId:null};}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function readJson(key){try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value&&typeof value==="object"?value:{};}catch(_){return{};}}
  function panPercent(pan){return (clamp(pan,-1,1)+1)*50;}
  function formatPanHuman(pan){const v=clamp(Number(pan)||0,-1,1),pct=Math.round(Math.abs(v)*100);if(Math.abs(v)<.025)return "Center";return `${pct}${v<0?"L":"R"}`;}
  function zoneName(round){if(round<=3)return"Wide Field";if(round<=6)return"Focus";if(round<=8)return"Fine Position";return"Near Center";}
  function targetPanFor(round){
    if(round===4)return 0;
    if(round===8)return (Math.random()>.5?1:-1)*(.08+Math.random()*.08);
    const ranges=round<=3?[.55,.92]:round<=6?[.30,.74]:round<=8?[.16,.52]:[.035,.30];
    const magnitude=ranges[0]+Math.random()*(ranges[1]-ranges[0]);
    return (Math.random()>.5?1:-1)*magnitude;
  }
  function gradeFor(error,tolerance){
    if(error<=tolerance*.28)return{tier:"perfect",label:"Perfect",passed:true};
    if(error<=tolerance)return{tier:"accurate",label:"Accurate",passed:true};
    return{tier:"miss",label:"Miss",passed:false};
  }
  function accuracyFor(error,tolerance){return Math.round(clamp(100*(1-error/Math.max(.16,tolerance*2.4)),0,100));}
  function pointsFor(error,tolerance,tier){
    if(tier==="perfect")return 100;
    if(tier==="accurate")return Math.round(65+35*(1-error/Math.max(tolerance,.001)));
    return Math.round(40*clamp(1-error/Math.max(tolerance*2.5,.001),0,1));
  }

  function ensureTrainer(){
    if(trainer)return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-lcr-trainer";
    trainer.id="sgLeftCenterRightTrainer";
    const ticks=Array.from({length:19},(_,i)=>`<i style="left:${(i+1)*5}%"></i>`).join("");
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-lcr-head"><div><span class="sg-trainer-kicker">Level 1 · Ear Basics</span><h2>Left / Center / Right</h2><p>Localiza una fuente en un campo estéreo continuo. Escucha, arrastra el marcador y suéltalo donde creas que está.</p></div><button class="sg-trainer-close" type="button" data-lcr-close aria-label="Cerrar entrenamiento">×</button></div>
      <div class="sg-lcr-hud">
        <div><span>Score</span><strong data-lcr-points>0</strong></div>
        <div class="sg-lcr-hud-center"><strong data-lcr-round>1 / 10</strong><span>Round</span><small data-lcr-zone>Wide Field</small></div>
        <div class="sg-lcr-hud-right"><span>Hits</span><strong data-lcr-hits>0</strong></div>
      </div>
      <div class="sg-lcr-source-row"><span data-lcr-source>Cargando fuente…</span><b data-lcr-tolerance>Precision ±24%</b></div>
      <div class="sg-lcr-stage">
        <div class="sg-lcr-stage-title"><span>Stereo Field</span><strong data-lcr-status>Escucha antes de responder.</strong></div>
        <button class="sg-lcr-listen" type="button" data-lcr-play><span class="sg-lcr-listen-icon">▶</span><span><b>PLAY SOURCE</b><small>Replay allowed before answering</small></span></button>
        <div class="sg-lcr-field-shell">
          <div class="sg-lcr-scale-labels"><span>LEFT</span><span>CENTER</span><span>RIGHT</span></div>
          <div class="sg-lcr-pan-track is-disabled" data-lcr-track role="slider" tabindex="0" aria-label="Posición estéreo" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0">
            <div class="sg-lcr-field-glow" aria-hidden="true"></div>
            <div class="sg-lcr-ticks" aria-hidden="true">${ticks}</div>
            <div class="sg-lcr-center-line" aria-hidden="true"><i></i></div>
            <div class="sg-lcr-tolerance-band" data-lcr-band aria-hidden="true"></div>
            <div class="sg-lcr-distance" data-lcr-distance aria-hidden="true"></div>
            <div class="sg-lcr-marker sg-lcr-marker-user" data-lcr-user><b></b><span>YOURS</span></div>
            <div class="sg-lcr-marker sg-lcr-marker-target" data-lcr-target><b></b><span>TARGET</span></div>
          </div>
          <div class="sg-lcr-readout" data-lcr-readout>Play the source, then drag anywhere across the stereo field.</div>
        </div>
      </div>
      <div class="sg-lcr-feedback" data-lcr-feedback></div>
      <div class="sg-session-summary" data-lcr-summary></div>
      <button class="sg-next" type="button" data-lcr-next>Repetir</button>`;

    document.querySelector(".sg-shell")?.insertBefore(trainer,document.querySelector(".sg-level-nav")||null);
    trainer.querySelector("[data-lcr-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelector("[data-lcr-play]")?.addEventListener("click",playSample);
    trainer.querySelector("[data-lcr-next]")?.addEventListener("click",nextRound);
    const track=trainer.querySelector("[data-lcr-track]");
    track.addEventListener("pointerdown",event=>{
      if(!state.heard||state.answered)return;
      event.preventDefault();state.dragging=true;state.pointerId=event.pointerId;track.setPointerCapture?.(event.pointerId);setFromPointer(event,track);
    });
    track.addEventListener("pointermove",event=>{
      if(!state.dragging||event.pointerId!==state.pointerId||state.answered)return;
      event.preventDefault();setFromPointer(event,track);
    });
    const release=event=>{
      if(!state.dragging||event.pointerId!==state.pointerId||state.answered)return;
      state.dragging=false;try{track.releasePointerCapture?.(event.pointerId);}catch(_){ }
      setFromPointer(event,track);submitSelection();
    };
    track.addEventListener("pointerup",release);
    track.addEventListener("pointercancel",()=>{state.dragging=false;});
    track.addEventListener("keydown",event=>{
      if(!state.heard||state.answered)return;
      const fine=event.shiftKey?.01:.025;
      if(event.key==="ArrowLeft"){event.preventDefault();state.userPan=clamp(state.userPan-fine,-1,1);renderUser();}
      else if(event.key==="ArrowRight"){event.preventDefault();state.userPan=clamp(state.userPan+fine,-1,1);renderUser();}
      else if(event.key==="Home"){event.preventDefault();state.userPan=-1;renderUser();}
      else if(event.key==="End"){event.preventDefault();state.userPan=1;renderUser();}
      else if(event.key==="Enter"||event.key===" "){event.preventDefault();submitSelection();}
    });
    return trainer;
  }

  async function getContext(){
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor)throw new Error("Este navegador no soporta Web Audio.");
    if(!audioContext)audioContext=new Ctor();
    if(audioContext.state==="suspended")await audioContext.resume();
    return audioContext;
  }
  async function loadManifest(){if(manifest)return manifest;const response=await fetch(MANIFEST_URL,{cache:"force-cache"});if(!response.ok)throw new Error("No se pudo cargar el audio de Sound Gym.");manifest=await response.json();return manifest;}
  function buildDeck(){const clips=manifest?.clips||[];const preferred=SOURCE_IDS.map(id=>clips.find(c=>c.id===id)).filter(Boolean);return shuffle(preferred.length?preferred:clips.filter(c=>["vocals","guitar","keys","percussion","bass"].includes(c.category)));}
  function pickClip(){if(!state.deck.length)state.deck=buildDeck();return state.deck.shift()||manifest?.clips?.[0];}
  async function decodeClip(clip){
    if(decoded.has(clip.id))return decoded.get(clip.id);
    const context=await getContext(),response=await fetch(`${manifest.basePath}${clip.file}`);
    if(!response.ok)throw new Error(`No se pudo cargar ${clip.file}.`);
    let arrayBuffer;
    if(clip.file.endsWith(".b64")){
      const binary=atob((await response.text()).trim()),bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      arrayBuffer=bytes.buffer;
    }else arrayBuffer=await response.arrayBuffer();
    const buffer=await context.decodeAudioData(arrayBuffer.slice(0));decoded.set(clip.id,buffer);return buffer;
  }
  async function monoBufferFor(clip){
    if(monoBuffers.has(clip.id))return monoBuffers.get(clip.id);
    const context=await getContext(),original=await decodeClip(clip);
    if(original.numberOfChannels===1){monoBuffers.set(clip.id,original);return original;}
    const mono=context.createBuffer(1,original.length,original.sampleRate),out=mono.getChannelData(0),channels=[];
    for(let c=0;c<original.numberOfChannels;c++)channels.push(original.getChannelData(c));
    for(let i=0;i<original.length;i++){let sum=0;for(const channel of channels)sum+=channel[i];out[i]=sum/channels.length;}
    monoBuffers.set(clip.id,mono);return mono;
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(node=>node.classList.remove("show"));
    ensureTrainer().classList.add("show");trainer.scrollIntoView({behavior:"smooth",block:"start"});
    await playStartSound();
    try{await loadManifest();state=freshState();state.ready=true;state.deck=buildDeck();nextRound();}
    catch(error){showToast(error.message||"No se pudo iniciar Left / Center / Right.");}
  }
  function closeTrainer(){stopAudio();stopDecisionTimer();trainer?.classList.remove("show");}
  function nextRound(){
    stopAudio();stopDecisionTimer();if(!state.ready)return;
    if(state.round>=ROUND_TOTAL){finishSession();return;}
    state.round++;state.answered=false;state.heard=false;state.dragging=false;state.pointerId=null;state.userPan=0;state.targetPan=targetPanFor(state.round);state.tolerance=TOLERANCES[state.round-1];state.clip=pickClip();state.segmentStart=null;state.segmentDuration=0;state.decisionStartedAt=0;renderRound();
  }
  function renderRound(){
    trainer.classList.remove("is-reveal","is-results");
    trainer.querySelector("[data-lcr-points]").textContent=Math.round(state.points);
    trainer.querySelector("[data-lcr-round]").textContent=`${state.round} / ${ROUND_TOTAL}`;
    trainer.querySelector("[data-lcr-hits]").textContent=state.hits;
    trainer.querySelector("[data-lcr-zone]").textContent=zoneName(state.round);
    trainer.querySelector("[data-lcr-source]").textContent=state.clip?.title||"Stereo source";
    trainer.querySelector("[data-lcr-tolerance]").textContent=`Precision ±${Math.round(state.tolerance*100)}%`;
    trainer.querySelector("[data-lcr-status]").textContent="Escucha antes de responder.";
    trainer.querySelector("[data-lcr-status]").className="";
    const track=trainer.querySelector("[data-lcr-track]");track.className="sg-lcr-pan-track is-disabled";track.setAttribute("aria-valuenow","0");
    const user=trainer.querySelector("[data-lcr-user]");user.style.left="50%";user.classList.remove("show");
    const target=trainer.querySelector("[data-lcr-target]");target.classList.remove("show");
    trainer.querySelector("[data-lcr-band]").classList.remove("show");
    trainer.querySelector("[data-lcr-distance]").classList.remove("show");
    trainer.querySelector("[data-lcr-readout]").textContent="Play the source, then drag anywhere across the stereo field.";
    const feedback=trainer.querySelector("[data-lcr-feedback]");feedback.className="sg-lcr-feedback";feedback.innerHTML="";
    const summary=trainer.querySelector("[data-lcr-summary]");summary.classList.remove("show");summary.innerHTML="";
    const next=trainer.querySelector("[data-lcr-next]");next.classList.remove("show");next.textContent="Siguiente";
  }

  async function playSample(){
    try{
      if(!state.clip||state.answered)return;
      stopAudio();const id=++requestId,context=await getContext(),buffer=await monoBufferFor(state.clip);if(id!==requestId)return;
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.72;source.connect(gain);
      const panner=context.createStereoPanner?.();
      if(panner){panner.pan.setValueAtTime(state.targetPan,context.currentTime);gain.connect(panner);panner.connect(context.destination);activeNodes=[source,gain,panner];}
      else{
        const left=context.createGain(),right=context.createGain(),merger=context.createChannelMerger(2),angle=(state.targetPan+1)*Math.PI/4;
        left.gain.value=Math.cos(angle);right.gain.value=Math.sin(angle);gain.connect(left);gain.connect(right);left.connect(merger,0,0);right.connect(merger,0,1);merger.connect(context.destination);activeNodes=[source,gain,left,right,merger];
      }
      const duration=Math.min(5.2,buffer.duration);
      if(state.segmentStart===null){const available=Math.max(0,buffer.duration-duration);state.segmentStart=available?Math.random()*available:0;state.segmentDuration=duration;}
      const play=trainer.querySelector("[data-lcr-play]");play.classList.add("is-playing");
      source.onended=()=>play.classList.remove("is-playing");
      source.start(0,state.segmentStart,state.segmentDuration);
      if(!state.heard){state.heard=true;state.decisionStartedAt=performance.now();trainer.querySelector("[data-lcr-track]").classList.remove("is-disabled");trainer.querySelector("[data-lcr-user]").classList.add("show");trainer.querySelector("[data-lcr-readout]").textContent="Drag the cyan marker and release to lock your answer.";startDecisionTimer();}
      updateStatus();
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }
  function stopAudio(){requestId++;const play=trainer?.querySelector("[data-lcr-play]");play?.classList.remove("is-playing");for(const node of activeNodes){try{if(typeof node.stop==="function")node.stop();}catch(_){ }try{node.disconnect();}catch(_){ }}activeNodes=[];}
  function setFromPointer(event,track){const rect=track.getBoundingClientRect(),ratio=clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1);state.userPan=ratio*2-1;renderUser();}
  function renderUser(){const user=trainer.querySelector("[data-lcr-user]");user.style.left=`${panPercent(state.userPan)}%`;user.classList.add("show");const track=trainer.querySelector("[data-lcr-track]");track.setAttribute("aria-valuenow",state.userPan.toFixed(3));trainer.querySelector("[data-lcr-readout]").textContent=`Your position · ${formatPanHuman(state.userPan)} · release to answer`;}

  function submitSelection(){
    if(state.answered||!state.heard)return;
    state.answered=true;stopAudio();stopDecisionTimer();
    const seconds=state.decisionStartedAt?Math.max(0,(performance.now()-state.decisionStartedAt)/1000):0,error=Math.abs(state.userPan-state.targetPan),grade=gradeFor(error,state.tolerance),accuracy=accuracyFor(error,state.tolerance),points=pointsFor(error,state.tolerance,grade.tier);
    state.responseTimes.push(seconds);state.points=clamp(state.points+points,0,1000);if(grade.passed)state.hits++;
    state.results.push({round:state.round,target:state.targetPan,user:state.userPan,error,tolerance:state.tolerance,tier:grade.tier,accuracy,points,seconds});
    grade.passed?playCorrectSound():playWrongSound();
    trainer.classList.add("is-reveal");
    const track=trainer.querySelector("[data-lcr-track]");track.classList.add(grade.passed?"is-correct":"is-wrong","is-disabled");
    const target=trainer.querySelector("[data-lcr-target]");target.style.left=`${panPercent(state.targetPan)}%`;target.classList.add("show");
    const min=clamp(state.targetPan-state.tolerance,-1,1),max=clamp(state.targetPan+state.tolerance,-1,1),band=trainer.querySelector("[data-lcr-band]");band.style.left=`${panPercent(min)}%`;band.style.width=`${(max-min)*50}%`;band.classList.add("show");
    const distance=trainer.querySelector("[data-lcr-distance]"),a=panPercent(state.userPan),b=panPercent(state.targetPan);distance.style.left=`${Math.min(a,b)}%`;distance.style.width=`${Math.max(1,Math.abs(a-b))}%`;distance.classList.add("show");
    trainer.querySelector("[data-lcr-points]").textContent=Math.round(state.points);trainer.querySelector("[data-lcr-hits]").textContent=state.hits;
    trainer.querySelector("[data-lcr-status]").textContent=`${grade.label} · ${accuracy}% localization`;trainer.querySelector("[data-lcr-status]").className=grade.passed?"is-good":"is-bad";
    trainer.querySelector("[data-lcr-readout]").textContent=`Yours ${formatPanHuman(state.userPan)} · Target ${formatPanHuman(state.targetPan)} · Δ ${Math.round(error*100)}%`;
    const feedback=trainer.querySelector("[data-lcr-feedback]");feedback.className=`sg-lcr-feedback show ${grade.passed?"is-correct":"is-wrong"}`;feedback.innerHTML=`<div class="sg-lcr-grade"><strong>${grade.label}</strong><span>+${points}</span></div><div><b>${accuracy}% localization</b><p>Yours ${formatPanHuman(state.userPan)} · Target ${formatPanHuman(state.targetPan)} · accepted zone ±${Math.round(state.tolerance*100)}%</p></div>`;
    const next=trainer.querySelector("[data-lcr-next]");next.textContent=state.round>=ROUND_TOTAL?"Ver resultado":"Continue";next.classList.add("show");
  }

  function updateStatus(){
    const el=trainer?.querySelector("[data-lcr-status]");if(!el||state.answered)return;
    if(!state.heard){el.textContent="Escucha antes de responder.";return;}
    const seconds=(performance.now()-state.decisionStartedAt)/1000;el.textContent=`Listening · drag & release · ${seconds.toFixed(1)} s`;
  }
  function startDecisionTimer(){stopDecisionTimer();decisionTimer=setInterval(updateStatus,120);}
  function stopDecisionTimer(){if(decisionTimer)clearInterval(decisionTimer);decisionTimer=0;}

  function finishSession(){
    stopAudio();stopDecisionTimer();state.ready=false;trainer.classList.add("is-results");
    const attempts=Math.max(1,state.results.length),avgAccuracy=Math.round(state.results.reduce((sum,r)=>sum+r.accuracy,0)/attempts),avgTime=state.responseTimes.length?state.responseTimes.reduce((a,b)=>a+b,0)/state.responseTimes.length:0,score=Math.round(clamp(state.points,0,1000));
    const stars=score>=870&&state.hits>=8?3:score>=700&&state.hits>=7?2:score>=500&&state.hits>=5?1:0;
    const progress=readJson(PROGRESS_KEY),previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0)),best=Math.max(previous,stars);progress[GAME_ID]=best;localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    const stats=readJson(STATS_KEY),prev=stats[GAME_ID]||{},recent=Array.isArray(prev.recent)?prev.recent.slice(-4):[];recent.push({accuracy:avgAccuracy,averageTime:Number(avgTime.toFixed(2)),score,hits:state.hits,at:Date.now()});stats[GAME_ID]={bestAccuracy:Math.max(Number(prev.bestAccuracy)||0,avgAccuracy),bestAverageTime:avgTime?Math.min(Number(prev.bestAverageTime)||Infinity,avgTime):(prev.bestAverageTime??null),bestScore:Math.max(Number(prev.bestScore)||0,score),recent};localStorage.setItem(STATS_KEY,JSON.stringify(stats));
    if(window.SoundGymProgress?.setStars)window.SoundGymProgress.setStars(GAME_ID,best);
    trainer.querySelector("[data-lcr-feedback]").className="sg-lcr-feedback";
    const summary=trainer.querySelector("[data-lcr-summary]");summary.innerHTML=`<div><span>Localización</span><strong>${avgAccuracy}%</strong></div><div><span>Aciertos</span><strong>${state.hits}/${ROUND_TOTAL}</strong></div><div><span>Score</span><strong>${score}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");
    const next=trainer.querySelector("[data-lcr-next]");next.textContent="Repetir";next.classList.add("show");
  }

  async function playTone(kind){
    try{const context=await getContext(),now=context.currentTime,notes=kind==="good"?[659.25,987.77]:kind==="start"?[587.33,880,1174.66]:[164.81,130];notes.forEach((freq,index)=>{const osc=context.createOscillator(),gain=context.createGain(),start=now+index*(kind==="start"?.07:.06);osc.type=kind==="bad"?"triangle":kind==="start"?"square":"sine";osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==="start"?.03:.045,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+(kind==="bad"?.24:.27));osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.3);});}catch(_){ }
  }
  function playStartSound(){return playTone("start");}
  function playCorrectSound(){return playTone("good");}
  function playWrongSound(){return playTone("bad");}
  function showToast(message){const toast=document.getElementById("sgToast");if(!toast)return;toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200);}

  document.addEventListener("click",event=>{const card=event.target.closest?.('[data-game="left-center-right"]');if(!card)return;event.preventDefault();event.stopImmediatePropagation();startGame();},true);
})();