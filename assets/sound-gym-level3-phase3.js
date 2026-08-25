(function(){
  "use strict";

  const GAME_ID="balance-memory";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const STEM_MANIFEST_URL="assets/stem-sets.json";
  const STAGE_TOTAL=6;
  const STARTING_LIVES=3;
  const MIN_DB=-18;
  const MAX_DB=6;
  const MEMORY_MS=3600;
  const ROLES=["drums","bass","music","vocals"];
  const ROLE_LABELS={drums:"Drums",bass:"Bass",music:"Music",vocals:"Vocals"};
  const STAGES=[
    {template:[0,-3,-6,-9],threshold:70,label:"Memory",jitter:.25},
    {template:[0,-2.5,-5,-7.5],threshold:74,label:"Balance",jitter:.35},
    {template:[0,-2,-4,-6],threshold:78,label:"Focus",jitter:.4},
    {template:[0,-1.7,-3.4,-5.1],threshold:81,label:"Detail",jitter:.35},
    {template:[0,-1.3,-2.6,-3.9],threshold:84,label:"Precision",jitter:.3},
    {template:[0,-1,-2,-3],threshold:87,label:"Mix Memory",jitter:.22}
  ];

  let audioContext=null;
  let stemManifest=null;
  let trainer=null;
  let sourceToken=0;
  let sources=new Map();
  let gains=new Map();
  let analysers=new Map();
  let masterGain=null;
  let meterFrame=0;
  let memoryTimer=0;
  let memoryProgressTimer=0;
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
      set:null,
      setDeck:[],
      targetDb:flatLevels(0),
      userDb:flatLevels(-6),
      responseTimes:[],
      stageScores:[],
      decisionStartedAt:0,
      memoryStartedAt:0,
      revealed:false
    };
  }

  function flatLevels(value){return Object.fromEntries(ROLES.map(role=>[role,value]));}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function shuffle(values){
    const copy=[...values];
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }
  function dbToGain(db){return Math.pow(10,db/20);}
  function dbToPercent(db){return ((MAX_DB-clamp(db,MIN_DB,MAX_DB))/(MAX_DB-MIN_DB))*100;}
  function percentToDb(percent){return MAX_DB-clamp(percent,0,1)*(MAX_DB-MIN_DB);}
  function formatDb(value){return `${value>0?"+":""}${value.toFixed(1)} dB`;}

  function markCardLive(){
    const card=document.querySelector('[data-game="balance-memory"]');
    if(!card) return;
    card.classList.add("is-live");
    if(card.dataset.bmLiveObserver==="1") return;
    card.dataset.bmLiveObserver="1";
    const observer=new MutationObserver(()=>{
      if(!card.classList.contains("is-live")) card.classList.add("is-live");
    });
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer) return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-bm-trainer";
    trainer.id="sgBalanceMemoryTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-bm-head">
        <div>
          <span class="sg-trainer-kicker">Level 3 · Studio</span>
          <h2>Balance Memory</h2>
          <p>Escucha y memoriza el balance. Después reconstruye de oído la relación entre los stems usando un mixer real.</p>
        </div>
        <button class="sg-trainer-close" type="button" data-bm-close aria-label="Cerrar Balance Memory">×</button>
      </div>

      <div class="sg-bm-hud">
        <div class="sg-bm-hud-cell"><span>Score</span><strong data-bm-score>0</strong></div>
        <div class="sg-bm-stage"><strong data-bm-stage>1 / 6</strong><span data-bm-stage-label>Memory</span></div>
        <div class="sg-bm-lives" data-bm-lives aria-label="3 vidas"></div>
      </div>

      <div class="sg-bm-songbar"><strong data-bm-song>Cargando stems…</strong><span data-bm-meta>— BPM · 4 stems</span></div>

      <div class="sg-bm-console" data-bm-console>
        <div class="sg-bm-memory" data-bm-memory>
          <div class="sg-bm-memory-card">
            <div class="sg-bm-memory-icon">◉</div>
            <strong>Listen, memorize and set the balance</strong>
            <p>Escucha la mezcla objetivo. Cuando estés listo, pasa al mixer y reconstruye de memoria los niveles relativos.</p>
            <div class="sg-bm-memory-progress"><i data-bm-memory-progress></i></div>
            <button type="button" data-bm-start disabled>Escuchando referencia…</button>
          </div>
        </div>

        <div class="sg-bm-mixer" data-bm-mixer>
          ${ROLES.map(role=>channelMarkup(role)).join("")}
        </div>
      </div>

      <div class="sg-bm-coach" data-bm-coach>La referencia va a sonar primero. Memoriza qué tan adelante o atrás está cada elemento.</div>
      <div class="sg-bm-feedback" data-bm-feedback></div>

      <div class="sg-bm-actions">
        <button class="sg-bm-confirm" type="button" data-bm-confirm disabled>Confirm Balance</button>
        <button class="sg-bm-continue" type="button" data-bm-continue hidden>Continue</button>
      </div>

      <div class="sg-session-summary" data-bm-summary></div>
      <button class="sg-next" type="button" data-bm-next>Repetir</button>
    `;

    const nav=document.querySelector(".sg-level-nav");
    document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);
    trainer.querySelector("[data-bm-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelector("[data-bm-start]")?.addEventListener("click",enterEditing);
    trainer.querySelector("[data-bm-confirm]")?.addEventListener("click",confirmBalance);
    trainer.querySelector("[data-bm-continue]")?.addEventListener("click",continueStage);
    trainer.querySelector("[data-bm-next]")?.addEventListener("click",restartAfterResults);
    setupFaders();
    return trainer;
  }

  function channelMarkup(role){
    const ticks=[6,0,-6,-12,-18];
    return `<div class="sg-bm-channel" data-bm-channel="${role}">
      <div class="sg-bm-channel-name" data-bm-label="${role}">${ROLE_LABELS[role]}<span class="sg-bm-channel-sub">STEM</span></div>
      <div class="sg-bm-fader-wrap">
        <div class="sg-bm-scale">${ticks.map(db=>`<span style="top:${dbToPercent(db)}%">${db>0?"+":""}${db}</span>`).join("")}</div>
        <div class="sg-bm-fader" data-bm-fader="${role}" role="slider" tabindex="0" aria-label="${ROLE_LABELS[role]} level" aria-valuemin="${MIN_DB}" aria-valuemax="${MAX_DB}" aria-valuenow="-6">
          <div class="sg-bm-target" data-bm-target="${role}"></div>
          <div class="sg-bm-fader-knob"></div>
        </div>
        <div class="sg-bm-meter"><i data-bm-meter="${role}"></i></div>
      </div>
      <div><div class="sg-bm-db" data-bm-db="${role}">−6.0 dB</div><div class="sg-bm-accuracy" data-bm-accuracy="${role}"></div></div>
    </div>`;
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(node=>node.classList.remove("show"));
    ensureTrainer().classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});
    playStartSound();
    try{
      if(!stemManifest) await loadStemManifest();
      state=freshState();
      state.ready=true;
      state.setDeck=buildSetDeck();
      renderLives();
      await beginStage(1);
    }catch(error){
      showToast(error.message||"No se pudo iniciar Balance Memory.");
      stopAudio();
    }
  }

  function closeTrainer(){
    stopAudio();
    clearMemoryTimers();
    trainer?.classList.remove("show");
  }

  async function loadStemManifest(){
    const response=await fetch(STEM_MANIFEST_URL,{cache:"force-cache"});
    if(!response.ok) throw new Error("No se pudo cargar la librería de stems.");
    stemManifest=await response.json();
    if(!Array.isArray(stemManifest?.sets)||!stemManifest.sets.length) throw new Error("No hay stem sets disponibles.");
  }

  function buildSetDeck(){
    const sets=stemManifest.sets||[];
    return [...shuffle(sets),...shuffle(sets)].slice(0,STAGE_TOTAL);
  }

  function pickSet(){
    if(!state.setDeck.length) state.setDeck=buildSetDeck();
    return state.setDeck.shift()||stemManifest.sets[0];
  }

  function generateTarget(stageNumber){
    const config=STAGES[stageNumber-1];
    const template=shuffle(config.template);
    const levels={};
    ROLES.forEach((role,index)=>{
      const base=template[index];
      const jitter=base===0?0:(Math.random()*2-1)*config.jitter;
      levels[role]=Math.round(clamp(base+jitter,-12,1)*10)/10;
    });
    return levels;
  }

  async function beginStage(number){
    stopAudio();
    clearMemoryTimers();
    state.stage=number;
    state.phase="loading";
    state.revealed=false;
    state.set=pickSet();
    state.targetDb=generateTarget(number);
    state.userDb=flatLevels(-6);
    renderStage();
    const buffers=await loadSetBuffers(state.set);
    if(state.stage!==number) return;
    await startStemAudio(buffers,state.targetDb);
    state.phase="memory";
    state.memoryStartedAt=performance.now();
    renderStagePhase();
    beginMemoryWindow();
  }

  function renderStage(){
    const config=STAGES[state.stage-1];
    const consoleEl=trainer.querySelector("[data-bm-console]");
    consoleEl.className="sg-bm-console";
    trainer.querySelector("[data-bm-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-bm-stage]").textContent=`${state.stage} / ${STAGE_TOTAL}`;
    trainer.querySelector("[data-bm-stage-label]").textContent=config.label;
    trainer.querySelector("[data-bm-song]").textContent=state.set?.title||"Stem set";
    trainer.querySelector("[data-bm-meta]").textContent=`${state.set?.bpm||"—"} BPM · 4 stems`;
    trainer.querySelector("[data-bm-feedback]").className="sg-bm-feedback";
    trainer.querySelector("[data-bm-feedback]").innerHTML="";
    trainer.querySelector("[data-bm-confirm]").disabled=true;
    trainer.querySelector("[data-bm-confirm]").hidden=false;
    trainer.querySelector("[data-bm-continue]").hidden=true;
    trainer.querySelector("[data-bm-summary]").classList.remove("show");
    trainer.querySelector("[data-bm-summary]").innerHTML="";
    trainer.querySelector("[data-bm-next]").classList.remove("show");
    renderLives();
    updateMusicLabel();
    ROLES.forEach(role=>{
      trainer.querySelector(`[data-bm-channel="${role}"]`)?.classList.remove("is-good","is-off");
      trainer.querySelector(`[data-bm-accuracy="${role}"]`).textContent="";
      setFaderUI(role,state.userDb[role]);
      setTargetUI(role,state.targetDb[role]);
    });
    updateCoach("Escucha la referencia y memoriza las relaciones. Los faders estarán disponibles cuando termine la ventana de memoria.");
  }

  function renderStagePhase(){
    const consoleEl=trainer.querySelector("[data-bm-console]");
    if(state.phase==="memory") consoleEl.classList.add("is-memory");
    if(state.phase==="editing") consoleEl.classList.add("is-editing");
    if(state.phase==="reveal") consoleEl.classList.add("is-reveal");
  }

  function updateMusicLabel(){
    const label=state.set?.musicStemLabel;
    const display=label?label.charAt(0).toUpperCase()+label.slice(1):"Music";
    const host=trainer.querySelector('[data-bm-label="music"]');
    if(host) host.innerHTML=`${escapeHtml(display)}<span class="sg-bm-channel-sub">STEM</span>`;
  }

  function beginMemoryWindow(){
    const progress=trainer.querySelector("[data-bm-memory-progress]");
    const startButton=trainer.querySelector("[data-bm-start]");
    progress.style.width="0%";
    startButton.disabled=true;
    startButton.textContent="Escuchando referencia…";
    const started=performance.now();
    memoryProgressTimer=setInterval(()=>{
      const pct=clamp((performance.now()-started)/MEMORY_MS,0,1)*100;
      progress.style.width=`${pct}%`;
    },70);
    memoryTimer=setTimeout(()=>{
      clearInterval(memoryProgressTimer);memoryProgressTimer=0;
      progress.style.width="100%";
      startButton.disabled=false;
      startButton.textContent="Start mixing";
      updateCoach("Ya memorizaste la referencia. Entra al mixer y reconstruye el balance sin volver a verla.");
    },MEMORY_MS);
  }

  function clearMemoryTimers(){
    if(memoryTimer) clearTimeout(memoryTimer);
    if(memoryProgressTimer) clearInterval(memoryProgressTimer);
    memoryTimer=memoryProgressTimer=0;
  }

  function enterEditing(){
    if(state.phase!=="memory") return;
    clearMemoryTimers();
    state.phase="editing";
    state.decisionStartedAt=performance.now();
    rampLevels(state.userDb,.12);
    renderStagePhase();
    trainer.querySelector("[data-bm-confirm]").disabled=false;
    updateCoach("Reconstruye de memoria el balance. Ajusta Drums, Bass, Music y Vocals; luego confirma.");
  }

  async function getContext(){
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor) throw new Error("Este navegador no soporta Web Audio.");
    if(!audioContext) audioContext=new Ctor();
    if(audioContext.state==="suspended") await audioContext.resume();
    return audioContext;
  }

  async function fetchStemBytes(file){
    const candidates=[];
    const base=String(stemManifest?.basePath||"");
    if(base) candidates.push(`${base}${file}`);
    candidates.push(`assets/${file}`);
    let lastError=null;
    for(const url of [...new Set(candidates)]){
      try{
        const response=await fetch(url,{cache:"force-cache"});
        if(!response.ok) throw new Error(`${response.status}`);
        if(file.endsWith(".b64")){
          const binary=atob((await response.text()).trim());
          const bytes=new Uint8Array(binary.length);
          for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
          return bytes.buffer;
        }
        return await response.arrayBuffer();
      }catch(error){lastError=error;}
    }
    throw new Error(`No se pudo cargar ${file}${lastError?".":""}`);
  }

  async function decodeStem(set,role){
    const file=set.stems?.[role];
    if(!file) throw new Error(`Falta el stem ${role}.`);
    const key=`${set.id}:${role}`;
    if(decoded.has(key)) return decoded.get(key);
    const context=await getContext();
    const bytes=await fetchStemBytes(file);
    const buffer=await context.decodeAudioData(bytes.slice(0));
    decoded.set(key,buffer);
    return buffer;
  }

  async function loadSetBuffers(set){
    const pairs=await Promise.all(ROLES.map(async role=>[role,await decodeStem(set,role)]));
    return Object.fromEntries(pairs);
  }

  async function startStemAudio(buffers,levels){
    stopAudio();
    const context=await getContext();
    const token=++sourceToken;
    masterGain=context.createGain();
    masterGain.gain.value=.58;
    masterGain.connect(context.destination);
    const duration=Math.min(...ROLES.map(role=>buffers[role]?.duration||24),state.set?.durationSeconds||24);
    const when=context.currentTime+.06;
    ROLES.forEach(role=>{
      const src=context.createBufferSource();
      const gain=context.createGain();
      const analyser=context.createAnalyser();
      analyser.fftSize=256;
      analyser.smoothingTimeConstant=.72;
      src.buffer=buffers[role];
      src.loop=true;
      src.loopStart=0;
      src.loopEnd=Math.max(.5,duration);
      gain.gain.value=dbToGain(levels[role]);
      src.connect(gain);gain.connect(analyser);analyser.connect(masterGain);
      src.onended=()=>{if(token!==sourceToken)return;sources.delete(role);};
      src.start(when,0);
      sources.set(role,src);gains.set(role,gain);analysers.set(role,analyser);
    });
    animateMeters();
  }

  function stopAudio(){
    sourceToken+=1;
    cancelAnimationFrame(meterFrame);meterFrame=0;
    sources.forEach(src=>{try{src.stop();}catch(_){ }try{src.disconnect();}catch(_){ }});
    gains.forEach(node=>{try{node.disconnect();}catch(_){ }});
    analysers.forEach(node=>{try{node.disconnect();}catch(_){ }});
    try{masterGain?.disconnect();}catch(_){ }
    sources=new Map();gains=new Map();analysers=new Map();masterGain=null;
    ROLES.forEach(role=>{const meter=trainer?.querySelector(`[data-bm-meter="${role}"]`);if(meter)meter.style.height="0%";});
  }

  function rampLevels(levels,duration=.06){
    if(!audioContext) return;
    const now=audioContext.currentTime;
    ROLES.forEach(role=>{
      const param=gains.get(role)?.gain;if(!param)return;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value,now);
      param.linearRampToValueAtTime(dbToGain(levels[role]),now+duration);
    });
  }

  function animateMeters(){
    cancelAnimationFrame(meterFrame);
    const tick=()=>{
      analysers.forEach((analyser,role)=>{
        const data=new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum=0;
        for(const sample of data){const v=(sample-128)/128;sum+=v*v;}
        const rms=Math.sqrt(sum/data.length);
        const db=20*Math.log10(Math.max(rms,1e-5));
        const percent=clamp((db+54)/54,0,1)*100;
        const meter=trainer?.querySelector(`[data-bm-meter="${role}"]`);
        if(meter) meter.style.height=`${percent.toFixed(1)}%`;
      });
      meterFrame=requestAnimationFrame(tick);
    };
    meterFrame=requestAnimationFrame(tick);
  }

  function setupFaders(){
    trainer.querySelectorAll("[data-bm-fader]").forEach(fader=>{
      const role=fader.dataset.bmFader;
      let dragging=false;
      const fromPointer=event=>{
        if(state.phase!=="editing") return;
        const rect=fader.getBoundingClientRect();
        const y=clamp((event.clientY-rect.top)/rect.height,0,1);
        setUserLevel(role,Math.round(percentToDb(y)*10)/10);
      };
      fader.addEventListener("pointerdown",event=>{
        if(state.phase!=="editing") return;
        dragging=true;fader.classList.add("is-dragging");
        fader.setPointerCapture?.(event.pointerId);fromPointer(event);
      });
      fader.addEventListener("pointermove",event=>{if(dragging)fromPointer(event);});
      const end=event=>{dragging=false;fader.classList.remove("is-dragging");try{fader.releasePointerCapture?.(event.pointerId);}catch(_){ }};
      fader.addEventListener("pointerup",end);fader.addEventListener("pointercancel",end);
      fader.addEventListener("keydown",event=>{
        if(state.phase!=="editing") return;
        const step=event.shiftKey?1:.5;
        if(event.key==="ArrowUp"){event.preventDefault();setUserLevel(role,state.userDb[role]+step);}
        else if(event.key==="ArrowDown"){event.preventDefault();setUserLevel(role,state.userDb[role]-step);}
      });
    });
  }

  function setUserLevel(role,value){
    if(state.phase!=="editing") return;
    const db=Math.round(clamp(value,MIN_DB,MAX_DB)*10)/10;
    state.userDb[role]=db;
    setFaderUI(role,db);
    if(audioContext){
      const param=gains.get(role)?.gain;
      if(param){const now=audioContext.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(dbToGain(db),now,.018);}
    }
  }

  function setFaderUI(role,db){
    const fader=trainer?.querySelector(`[data-bm-fader="${role}"]`);
    if(fader){fader.style.setProperty("--bm-pos",`${dbToPercent(db)}%`);fader.setAttribute("aria-valuenow",db.toFixed(1));}
    const readout=trainer?.querySelector(`[data-bm-db="${role}"]`);
    if(readout) readout.textContent=formatDb(db).replace("-","−");
  }

  function setTargetUI(role,db){
    const target=trainer?.querySelector(`[data-bm-target="${role}"]`);
    if(target) target.style.setProperty("--bm-target",`${dbToPercent(db)}%`);
  }

  function normalizedLevels(levels){
    const mean=ROLES.reduce((sum,role)=>sum+levels[role],0)/ROLES.length;
    return Object.fromEntries(ROLES.map(role=>[role,levels[role]-mean]));
  }

  function evaluateBalance(){
    const target=normalizedLevels(state.targetDb);
    const user=normalizedLevels(state.userDb);
    let sum=0;
    const perRole={};
    ROLES.forEach(role=>{
      const diff=user[role]-target[role];
      sum+=diff*diff;
      perRole[role]={diff,accuracy:Math.round(clamp(100-Math.abs(diff)*20,0,100))};
    });
    const rmse=Math.sqrt(sum/ROLES.length);
    const match=Math.round(clamp(100-rmse*20,0,100));
    return {match,rmse,perRole,target,user};
  }

  function speedFactor(seconds){
    if(seconds<=18) return 1;
    if(seconds<=30) return .97;
    if(seconds<=45) return .93;
    if(seconds<=65) return .89;
    return .84;
  }

  function confirmBalance(){
    if(state.phase!=="editing") return;
    const elapsed=Math.max(0,(performance.now()-state.decisionStartedAt)/1000);
    state.responseTimes.push(elapsed);
    const evaluation=evaluateBalance();
    const config=STAGES[state.stage-1];
    const passed=evaluation.match>=config.threshold;
    const maxStagePoints=1000/STAGE_TOTAL;
    const stagePoints=Math.round(maxStagePoints*(evaluation.match/100)*speedFactor(elapsed));
    state.score=clamp(state.score+stagePoints,0,1000);
    state.stageScores.push({stage:state.stage,match:evaluation.match,points:stagePoints,passed,seconds:elapsed,rmse:evaluation.rmse});
    if(passed){state.hits+=1;}else{state.lives=Math.max(0,state.lives-1);}

    stopAudio();
    passed?playCorrectSound():playWrongSound();
    state.phase="reveal";state.revealed=true;
    renderStagePhase();renderLives();
    trainer.querySelector("[data-bm-score]").textContent=Math.round(state.score).toLocaleString("en-US");
    trainer.querySelector("[data-bm-confirm]").hidden=true;
    trainer.querySelector("[data-bm-continue]").hidden=false;

    ROLES.forEach(role=>{
      const channel=trainer.querySelector(`[data-bm-channel="${role}"]`);
      const accuracy=evaluation.perRole[role].accuracy;
      channel?.classList.add(accuracy>=80?"is-good":"is-off");
      trainer.querySelector(`[data-bm-accuracy="${role}"]`).textContent=`${accuracy}% · target ${formatDb(state.targetDb[role])}`;
      setTargetUI(role,state.targetDb[role]);
    });

    const feedback=trainer.querySelector("[data-bm-feedback]");
    feedback.className=`sg-bm-feedback show ${passed?"is-correct":"is-wrong"}`;
    const weakest=ROLES.slice().sort((a,b)=>evaluation.perRole[a].accuracy-evaluation.perRole[b].accuracy)[0];
    feedback.innerHTML=`<div class="sg-bm-match"><strong>${evaluation.match}%</strong><span>Balance match</span></div><div class="sg-bm-feedback-copy"><strong>${passed?"Balance reconstruido":"El balance todavía se aleja de la referencia"}</strong><span>+${stagePoints} pts · error relativo ${evaluation.rmse.toFixed(2)} dB RMS · área a pulir: ${escapeHtml(roleDisplayName(weakest))}.</span><span>Las líneas turquesa muestran los niveles objetivo. Tu posición se mantiene para comparar visualmente.</span></div>`;
    updateCoach(passed?"Buen trabajo. Observa cuánto te acercaste por stem antes de continuar.":"Compara tus faders con los targets. El objetivo es memorizar relaciones, no el volumen master absoluto.");
  }

  function roleDisplayName(role){
    if(role==="music"&&state.set?.musicStemLabel) return state.set.musicStemLabel;
    return ROLE_LABELS[role];
  }

  async function continueStage(){
    if(state.phase!=="reveal") return;
    if(state.lives<=0||state.stage>=STAGE_TOTAL){finishSession();return;}
    await beginStage(state.stage+1);
  }

  function renderLives(){
    const host=trainer?.querySelector("[data-bm-lives]");if(!host)return;
    host.innerHTML=Array.from({length:STARTING_LIVES},(_,index)=>`<span class="sg-bm-life${index<state.lives?" is-alive":""}">♥</span>`).join("");
    host.setAttribute("aria-label",`${state.lives} ${state.lives===1?"vida":"vidas"}`);
  }

  function updateCoach(text){const host=trainer?.querySelector("[data-bm-coach]");if(host)host.textContent=text;}

  function finishSession(){
    clearMemoryTimers();stopAudio();state.phase="results";
    const attempted=Math.max(1,state.stageScores.length);
    const averageMatch=state.stageScores.reduce((sum,item)=>sum+item.match,0)/attempted;
    const averageTime=state.responseTimes.length?state.responseTimes.reduce((a,b)=>a+b,0)/state.responseTimes.length:Infinity;
    const completion=state.stageScores.length/STAGE_TOTAL;
    const accuracy=Math.round(clamp(averageMatch*.88+completion*12,0,100));
    const normalizedScore=Math.round(clamp(state.score,0,1000));
    const stars=state.hits>=5&&averageMatch>=88&&state.lives>=1?3:state.hits>=4&&averageMatch>=80?2:state.hits>=3?1:0;

    const progress=readJson(PROGRESS_KEY);
    const previous=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0));
    const best=Math.max(previous,stars);
    progress[GAME_ID]=best;localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    saveStats(accuracy,averageTime,normalizedScore,averageMatch);
    if(window.SoundGymProgress?.setStars) window.SoundGymProgress.setStars(GAME_ID,best);
    markCardLive();

    const summary=trainer.querySelector("[data-bm-summary]");
    summary.innerHTML=`<div><span>Precisión</span><strong>${accuracy}%</strong></div><div><span>Tiempo promedio</span><strong>${Number.isFinite(averageTime)?averageTime.toFixed(1):"—"} s</strong></div><div><span>Score</span><strong>${normalizedScore}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;
    summary.classList.add("show");
    trainer.querySelector("[data-bm-confirm]").hidden=true;
    trainer.querySelector("[data-bm-continue]").hidden=true;
    const next=trainer.querySelector("[data-bm-next]");next.textContent="Repetir";next.classList.add("show");
  }

  async function restartAfterResults(){if(state.phase!=="results")return;await startGame();}

  function readJson(key){try{const parsed=JSON.parse(localStorage.getItem(key)||"{}");return parsed&&typeof parsed==="object"?parsed:{};}catch(_){return {};}}
  function saveStats(accuracy,averageTime,score,averageMatch){
    const stats=readJson(STATS_KEY),previous=stats[GAME_ID]||{},recent=Array.isArray(previous.recent)?previous.recent.slice(-4):[];
    recent.push({accuracy,averageTime:Number.isFinite(averageTime)?Number(averageTime.toFixed(2)):null,score,averageMatch:Number(averageMatch.toFixed(1)),at:Date.now()});
    stats[GAME_ID]={bestAccuracy:Math.max(Number(previous.bestAccuracy)||0,accuracy),bestAverageTime:Number.isFinite(averageTime)?Math.min(Number(previous.bestAverageTime)||Infinity,averageTime):(previous.bestAverageTime??null),bestScore:Math.max(Number(previous.bestScore)||0,score),bestMatch:Math.max(Number(previous.bestMatch)||0,averageMatch),sessions:(Number(previous.sessions)||0)+1,recent};
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
  }

  async function playStartSound(){
    try{const context=await getContext(),now=context.currentTime;[587.33,880,1174.66].forEach((frequency,index)=>{const osc=context.createOscillator(),gain=context.createGain(),start=now+index*.075;osc.type="square";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.03,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+.15);osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.17);});}catch(_){ }
  }
  async function playCorrectSound(){
    try{const context=await getContext(),now=context.currentTime;[659.25,987.77].forEach((frequency,index)=>{const osc=context.createOscillator(),gain=context.createGain(),start=now+index*.07;osc.type="sine";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.28);osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.3);});}catch(_){ }
  }
  async function playWrongSound(){
    try{const context=await getContext(),now=context.currentTime;const osc=context.createOscillator(),gain=context.createGain();osc.type="triangle";osc.frequency.setValueAtTime(164.81,now);osc.frequency.exponentialRampToValueAtTime(130,now+.24);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.04,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.26);osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.27);}catch(_){ }
  }

  function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));}
  function showToast(message){const toast=document.getElementById("sgToast");if(!toast)return;toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2300);}

  document.addEventListener("click",event=>{
    const card=event.target.closest?.('[data-game="balance-memory"]');
    if(!card)return;
    event.preventDefault();event.stopImmediatePropagation();startGame();
  },true);

  markCardLive();
})();