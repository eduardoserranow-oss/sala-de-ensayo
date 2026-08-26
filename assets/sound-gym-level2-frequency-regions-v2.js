(function(){
  "use strict";

  const GAME_ID="frequency-regions";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const ROUND_TOTAL=10;
  const MIN_HZ=40;
  const MAX_HZ=16000;
  const REGIONS=[
    {id:"sub",label:"SUB",min:40,max:60},
    {id:"bass",label:"BASS",min:60,max:250},
    {id:"low-mid",label:"LOW MID",min:250,max:500},
    {id:"mid",label:"MID",min:500,max:2000},
    {id:"upper-mid",label:"UPPER MID",min:2000,max:4000},
    {id:"high",label:"HIGH",min:4000,max:8000},
    {id:"air",label:"AIR",min:8000,max:16000}
  ];
  const TICKS=[40,80,160,320,640,1250,2500,5000,10000,16000];
  const COMPATIBLE_IDS=[
    "drums-full-100","drums-funky","drums-flame-117",
    "mix-final-5","mix-final-4","mix-merengue-regueton",
    "guitar-afrobeat","guitar-clean","bass-funky-p",
    "female-vocal","male-vocal","keys-2","keys-rhodes",
    "percussion-dembow-120","percussion-conto-105"
  ];

  let audioContext=null,manifest=null,trainer=null,activeSource=null,requestId=0,decisionTimer=0;
  const decoded=new Map(),processed=new Map();
  let state=freshState();

  function freshState(){return{
    ready:false,round:0,hits:0,points:0,answered:false,
    clip:null,clipDeck:[],regionDeck:[],region:null,targetHz:1000,userHz:1000,
    selected:false,amountDb:9,direction:1,q:0.8,toleranceOct:.62,perfectOct:.16,
    segmentStart:null,segmentDuration:0,heard:new Set(),decisionStartedAt:0,responseTimes:[],results:[],dragging:false,pointerId:null
  };}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function readJson(key){try{const v=JSON.parse(localStorage.getItem(key)||"{}");return v&&typeof v==="object"?v:{};}catch(_){return{};}}
  function log2(v){return Math.log(v)/Math.LN2;}
  function hzToPct(hz){return clamp(log2(hz/MIN_HZ)/log2(MAX_HZ/MIN_HZ)*100,0,100);}
  function pctToHz(pct){return MIN_HZ*Math.pow(MAX_HZ/MIN_HZ,clamp(pct,0,100)/100);}
  function formatHz(hz){if(hz>=1000){const k=hz/1000;return `${k>=10?k.toFixed(1):k.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} kHz`;}return `${Math.round(hz)} Hz`;}
  function regionForHz(hz){return REGIONS.find((r,i)=>hz>=r.min&&(i===REGIONS.length-1?hz<=r.max:hz<r.max))||REGIONS[REGIONS.length-1];}
  function octaveDistance(a,b){return Math.abs(log2(Math.max(1,a)/Math.max(1,b)));}
  function centsDistance(a,b){return Math.round(octaveDistance(a,b)*1200);}
  function octBand(hz,oct){return [clamp(hz/Math.pow(2,oct),MIN_HZ,MAX_HZ),clamp(hz*Math.pow(2,oct),MIN_HZ,MAX_HZ)];}
  function randomLog(min,max){return min*Math.pow(max/min,Math.random());}
  function pickTargetHz(region){
    const margin=.07;
    const min=region.min*Math.pow(region.max/region.min,margin);
    const max=region.max/Math.pow(region.max/region.min,margin);
    return randomLog(min,max);
  }
  function difficulty(round){
    if(round<=2)return{amount:10,tol:.68,perfect:.18,q:.72,label:"Wide"};
    if(round<=4)return{amount:8.5,tol:.58,perfect:.16,q:.82,label:"Focus"};
    if(round<=6)return{amount:7,tol:.48,perfect:.14,q:.92,label:"Closer"};
    if(round<=8)return{amount:5.8,tol:.39,perfect:.12,q:1.02,label:"Fine"};
    return{amount:4.8,tol:.31,perfect:.10,q:1.12,label:"Precision"};
  }
  function grade(errorOct){
    if(errorOct<=state.perfectOct)return{tier:"perfect",label:"PERFECT",passed:true,points:100};
    if(errorOct<=state.toleranceOct)return{tier:"accurate",label:"ACCURATE",passed:true,points:75};
    if(errorOct<=state.toleranceOct*1.55)return{tier:"close",label:"CLOSE",passed:false,points:35};
    return{tier:"miss",label:"MISS",passed:false,points:0};
  }

  function markCardLive(){
    const card=document.querySelector('[data-game="frequency-regions"]');if(!card)return;card.classList.add("is-live");
    if(card.dataset.frV2Observer==="1")return;card.dataset.frV2Observer="1";
    new MutationObserver(()=>{if(!card.classList.contains("is-live"))card.classList.add("is-live");}).observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer)return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-fr2-trainer";
    trainer.id="sgFrequencyRegionsTrainer";
    const ticks=TICKS.map(hz=>`<span style="left:${hzToPct(hz)}%">${formatHz(hz)}</span>`).join("");
    const regions=REGIONS.map(r=>{const left=hzToPct(r.min),right=hzToPct(r.max);return `<span style="left:${left}%;width:${right-left}%">${r.label}</span>`;}).join("");
    trainer.innerHTML=`
      <div class="sg-trainer-head">
        <div><span class="sg-trainer-kicker">Level 2 · Engineer Basics</span><h2>Frequency Regions</h2><p>Compara A/B y ubica en el espectro dónde cambió la EQ. No necesitas caer en una línea exacta: tienes una zona de tolerancia alrededor de tu selección.</p></div>
        <button class="sg-trainer-close" type="button" data-fr2-close aria-label="Cerrar entrenamiento">×</button>
      </div>
      <div class="sg-fr2-hud">
        <div><span>Score</span><strong data-fr2-score>0</strong></div>
        <div class="sg-fr2-stage"><strong data-fr2-round>1 / 10</strong><span>Stage</span><small data-fr2-difficulty>Wide</small></div>
        <div><span>Hits</span><strong data-fr2-hits>0</strong></div>
      </div>
      <div class="sg-question-stage sg-fr2-question" role="status" aria-live="polite"><span class="sg-question-alert">Engineer Challenge</span><div class="sg-question"><span>¿Dónde</span><strong>CAMBIÓ LA EQ?</strong></div></div>
      <div class="sg-source-label" data-fr2-source>Fuente: cargando audio...</div>
      <div class="sg-decision-status" data-fr2-status>Escucha A y B antes de seleccionar.</div>
      <div class="sg-ab-grid sg-fr2-ab">
        <button class="sg-ab-play" type="button" data-fr2-play="A"><span>A</span><strong>Referencia</strong></button>
        <button class="sg-ab-play" type="button" data-fr2-play="B"><span>B</span><strong>Modificada</strong></button>
      </div>
      <div class="sg-fr2-spectrum-shell">
        <div class="sg-fr2-readout"><span>Tu selección</span><strong data-fr2-readout>—</strong><small data-fr2-region>Toca el espectro</small></div>
        <div class="sg-fr2-spectrum is-disabled" data-fr2-spectrum role="slider" tabindex="0" aria-label="Frecuencia seleccionada" aria-valuemin="40" aria-valuemax="16000" aria-valuenow="1000">
          <div class="sg-fr2-grid" aria-hidden="true"></div>
          <div class="sg-fr2-user-band" data-fr2-user-band aria-hidden="true"></div>
          <div class="sg-fr2-target-band" data-fr2-target-band aria-hidden="true"></div>
          <div class="sg-fr2-user-marker" data-fr2-user><i></i><b>YOURS</b></div>
          <div class="sg-fr2-target-marker" data-fr2-target><i></i><b>TARGET</b></div>
          <div class="sg-fr2-ticks" aria-hidden="true">${ticks}</div>
        </div>
        <div class="sg-fr2-regions" aria-hidden="true">${regions}</div>
        <div class="sg-fr2-help">Arrastra por el espectro. La franja alrededor de tu marcador representa tu “perdón” de esta ronda.</div>
      </div>
      <button class="sg-fr2-confirm" type="button" data-fr2-confirm disabled>CONFIRMAR</button>
      <div class="sg-fr2-feedback" data-fr2-feedback></div>
      <div class="sg-session-summary" data-fr2-summary></div>
      <button class="sg-next" type="button" data-fr2-next>Siguiente</button>`;
    document.querySelector(".sg-shell")?.insertBefore(trainer,document.querySelector(".sg-level-nav")||null);
    trainer.querySelector("[data-fr2-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-fr2-play]").forEach(b=>b.addEventListener("click",()=>playSlot(b.dataset.fr2Play)));
    trainer.querySelector("[data-fr2-confirm]")?.addEventListener("click",submitAnswer);
    trainer.querySelector("[data-fr2-next]")?.addEventListener("click",nextRound);
    setupSpectrum();
    return trainer;
  }

  function setupSpectrum(){
    const track=trainer.querySelector("[data-fr2-spectrum]");
    const setFromPointer=e=>{
      const r=track.getBoundingClientRect();
      const pct=(e.clientX-r.left)/Math.max(1,r.width)*100;
      state.userHz=pctToHz(pct);state.selected=true;renderSelection();
    };
    track.addEventListener("pointerdown",e=>{
      if(state.answered||state.heard.size<2)return;e.preventDefault();state.dragging=true;state.pointerId=e.pointerId;track.setPointerCapture?.(e.pointerId);setFromPointer(e);
    });
    track.addEventListener("pointermove",e=>{if(state.dragging&&e.pointerId===state.pointerId&&!state.answered){e.preventDefault();setFromPointer(e);}});
    const release=e=>{if(!state.dragging||e.pointerId!==state.pointerId)return;state.dragging=false;setFromPointer(e);try{track.releasePointerCapture?.(e.pointerId);}catch(_){}};
    track.addEventListener("pointerup",release);track.addEventListener("pointercancel",()=>state.dragging=false);
    track.addEventListener("keydown",e=>{
      if(state.answered||state.heard.size<2)return;
      let factor=e.shiftKey?Math.pow(2,1/24):Math.pow(2,1/12);
      if(e.key==="ArrowLeft"){e.preventDefault();state.userHz=clamp(state.userHz/factor,MIN_HZ,MAX_HZ);state.selected=true;renderSelection();}
      else if(e.key==="ArrowRight"){e.preventDefault();state.userHz=clamp(state.userHz*factor,MIN_HZ,MAX_HZ);state.selected=true;renderSelection();}
      else if(e.key==="Home"){e.preventDefault();state.userHz=MIN_HZ;state.selected=true;renderSelection();}
      else if(e.key==="End"){e.preventDefault();state.userHz=MAX_HZ;state.selected=true;renderSelection();}
      else if((e.key==="Enter"||e.key===" ")&&state.selected){e.preventDefault();submitAnswer();}
    });
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(n=>n.classList.remove("show"));
    ensureTrainer().classList.add("show");trainer.scrollIntoView({behavior:"smooth",block:"start"});
    await playStartSound();
    try{await loadManifest();state=freshState();state.ready=true;state.clipDeck=buildClipDeck();state.regionDeck=buildRegionDeck();nextRound();}
    catch(error){showToast(error.message||"No se pudo iniciar Frequency Regions.");}
  }
  function closeTrainer(){stopSource();stopDecisionTimer();trainer?.classList.remove("show");}
  async function loadManifest(){if(manifest)return manifest;const r=await fetch(MANIFEST_URL,{cache:"force-cache"});if(!r.ok)throw new Error("No se pudo cargar el audio de Sound Gym.");manifest=await r.json();return manifest;}
  function buildClipDeck(){const clips=manifest?.clips||[];const preferred=COMPATIBLE_IDS.map(id=>clips.find(c=>c.id===id)).filter(Boolean);return shuffle(preferred.length?preferred:clips);}
  function buildRegionDeck(){return [...shuffle(REGIONS),...shuffle(REGIONS).slice(0,ROUND_TOTAL-REGIONS.length)];}
  function pickClip(){if(!state.clipDeck.length)state.clipDeck=buildClipDeck();return state.clipDeck.shift()||manifest?.clips?.[0];}
  function pickRegion(){if(!state.regionDeck.length)state.regionDeck=buildRegionDeck();return state.regionDeck.shift()||REGIONS[Math.floor(Math.random()*REGIONS.length)];}

  function nextRound(){
    stopSource();stopDecisionTimer();if(!state.ready)return;if(state.round>=ROUND_TOTAL){finishSession();return;}
    state.round++;state.answered=false;state.clip=pickClip();state.region=pickRegion();state.targetHz=pickTargetHz(state.region);state.userHz=1000;state.selected=false;state.direction=Math.random()>.5?1:-1;
    const d=difficulty(state.round);state.amountDb=d.amount;state.toleranceOct=d.tol;state.perfectOct=d.perfect;state.q=d.q;state.heard=new Set();state.segmentStart=null;state.segmentDuration=0;state.decisionStartedAt=0;state.dragging=false;renderRound(d.label);
  }
  function renderRound(label){
    trainer.classList.remove("is-reveal","is-results");
    trainer.querySelector("[data-fr2-score]").textContent=Math.round(state.points);
    trainer.querySelector("[data-fr2-round]").textContent=`${state.round} / ${ROUND_TOTAL}`;
    trainer.querySelector("[data-fr2-hits]").textContent=state.hits;
    trainer.querySelector("[data-fr2-difficulty]").textContent=label;
    trainer.querySelector("[data-fr2-source]").textContent=state.clip?`Fuente: ${state.clip.title}`:"Fuente: cargando audio...";
    const status=trainer.querySelector("[data-fr2-status]");status.textContent="Escucha A y B antes de seleccionar.";status.className="sg-decision-status";
    const spectrum=trainer.querySelector("[data-fr2-spectrum]");spectrum.classList.add("is-disabled");spectrum.classList.remove("is-reveal");spectrum.setAttribute("aria-valuenow","1000");
    trainer.querySelector("[data-fr2-user]").classList.remove("show");trainer.querySelector("[data-fr2-target]").classList.remove("show");
    trainer.querySelector("[data-fr2-user-band]").classList.remove("show");trainer.querySelector("[data-fr2-target-band]").classList.remove("show");
    trainer.querySelector("[data-fr2-readout]").textContent="—";trainer.querySelector("[data-fr2-region]").textContent="Toca el espectro";
    const confirm=trainer.querySelector("[data-fr2-confirm]");confirm.disabled=true;confirm.classList.remove("show-ready");
    const feedback=trainer.querySelector("[data-fr2-feedback]");feedback.className="sg-fr2-feedback";feedback.innerHTML="";
    const summary=trainer.querySelector("[data-fr2-summary]");summary.classList.remove("show");summary.innerHTML="";
    const next=trainer.querySelector("[data-fr2-next]");next.classList.remove("show");next.textContent="Siguiente";
  }

  async function getContext(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error("Este navegador no soporta Web Audio.");if(!audioContext)audioContext=new C();if(audioContext.state==="suspended")await audioContext.resume();return audioContext;}
  async function decodeClip(clip){if(decoded.has(clip.id))return decoded.get(clip.id);const ctx=await getContext(),r=await fetch(`${manifest.basePath}${clip.file}`);if(!r.ok)throw new Error(`No se pudo cargar ${clip.file}.`);let ab;if(clip.file.endsWith(".b64")){const binary=atob((await r.text()).trim()),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);ab=bytes.buffer;}else ab=await r.arrayBuffer();const buffer=await ctx.decodeAudioData(ab.slice(0));decoded.set(clip.id,buffer);return buffer;}
  function measureRms(buffer){let sum=0,n=0;for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i+=32){sum+=d[i]*d[i];n++;}}return Math.sqrt(sum/Math.max(n,1));}
  async function getProcessedBuffer(original){
    const key=`fr2:${state.clip.id}:${Math.round(state.targetHz)}:${state.amountDb}:${state.direction}:${state.q}`;if(processed.has(key))return processed.get(key);
    const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)return{buffer:original,compensation:1};
    const off=new Offline(original.numberOfChannels,original.length,original.sampleRate),src=off.createBufferSource(),filter=off.createBiquadFilter();src.buffer=original;filter.type="peaking";filter.frequency.value=state.targetHz;filter.Q.value=state.q;filter.gain.value=state.amountDb*state.direction;src.connect(filter);filter.connect(off.destination);src.start();const rendered=await off.startRendering();const compensation=clamp(measureRms(original)/Math.max(measureRms(rendered),1e-6),.62,1.5);const result={buffer:rendered,compensation};processed.set(key,result);return result;
  }
  async function playSlot(slot){
    try{
      if(!state.clip||state.answered)return;stopSource();const id=++requestId,ctx=await getContext(),original=await decodeClip(state.clip);if(id!==requestId)return;
      const source=ctx.createBufferSource(),gain=ctx.createGain();if(slot==="B"){const result=await getProcessedBuffer(original);if(id!==requestId)return;source.buffer=result.buffer;gain.gain.value=.68*result.compensation;}else{source.buffer=original;gain.gain.value=.68;}
      source.connect(gain);gain.connect(ctx.destination);const duration=Math.min(6,original.duration);if(state.segmentStart===null){const available=Math.max(0,original.duration-duration);state.segmentStart=available?Math.random()*available:0;state.segmentDuration=duration;}
      const button=trainer.querySelector(`[data-fr2-play="${slot}"]`);button?.classList.add("is-playing");source.onended=()=>{button?.classList.remove("is-playing");if(activeSource===source)activeSource=null;};source.start(0,state.segmentStart,state.segmentDuration);activeSource=source;markHeard(slot);
    }catch(error){showToast(error.message||"No se pudo reproducir el audio.");}
  }
  function markHeard(slot){state.heard.add(slot);if(state.heard.size===2&&!state.decisionStartedAt){state.decisionStartedAt=performance.now();trainer.querySelector("[data-fr2-spectrum]").classList.remove("is-disabled");startDecisionTimer();}updateStatus();}
  function updateStatus(){
    const el=trainer?.querySelector("[data-fr2-status]");if(!el)return;
    if(state.answered){const last=state.responseTimes.at(-1);el.textContent=Number.isFinite(last)?`Tiempo de decisión: ${last.toFixed(1)} s`:"Respuesta registrada";el.className="sg-decision-status is-complete";return;}
    if(state.heard.size<2){el.textContent=state.heard.size===0?"Escucha A y B antes de seleccionar.":"Escucha la otra versión para comparar.";el.className="sg-decision-status";return;}
    const seconds=state.decisionStartedAt?(performance.now()-state.decisionStartedAt)/1000:0;el.textContent=state.selected?`Ajusta tu zona · ${seconds.toFixed(1)} s`:`Ahora toca o arrastra sobre el espectro · ${seconds.toFixed(1)} s`;el.className="sg-decision-status is-timing";
  }
  function startDecisionTimer(){stopDecisionTimer();decisionTimer=setInterval(updateStatus,100);}function stopDecisionTimer(){if(decisionTimer)clearInterval(decisionTimer);decisionTimer=0;}
  function stopSource(){requestId++;trainer?.querySelectorAll("[data-fr2-play]").forEach(b=>b.classList.remove("is-playing"));if(!activeSource)return;try{activeSource.stop();}catch(_){ }try{activeSource.disconnect();}catch(_){ }activeSource=null;}

  function renderSelection(){
    const pct=hzToPct(state.userHz),marker=trainer.querySelector("[data-fr2-user]");marker.style.left=`${pct}%`;marker.classList.add("show");
    const [lo,hi]=octBand(state.userHz,state.toleranceOct),left=hzToPct(lo),right=hzToPct(hi),band=trainer.querySelector("[data-fr2-user-band]");band.style.left=`${left}%`;band.style.width=`${Math.max(0,right-left)}%`;band.classList.add("show");
    trainer.querySelector("[data-fr2-readout]").textContent=formatHz(state.userHz);trainer.querySelector("[data-fr2-region]").textContent=regionForHz(state.userHz).label;
    trainer.querySelector("[data-fr2-spectrum]").setAttribute("aria-valuenow",String(Math.round(state.userHz)));
    const confirm=trainer.querySelector("[data-fr2-confirm]");confirm.disabled=false;confirm.classList.add("show-ready");updateStatus();
  }

  function submitAnswer(){
    if(state.answered||state.heard.size<2||!state.selected)return;state.answered=true;stopSource();stopDecisionTimer();
    const responseTime=state.decisionStartedAt?Math.max(0,(performance.now()-state.decisionStartedAt)/1000):0;state.responseTimes.push(responseTime);
    const errorOct=octaveDistance(state.userHz,state.targetHz),errorCents=centsDistance(state.userHz,state.targetHz),g=grade(errorOct);if(g.passed){state.hits++;playCorrectSound();}else playWrongSound();state.points+=g.points;
    state.results.push({targetHz:state.targetHz,userHz:state.userHz,errorOct,errorCents,tier:g.tier,points:g.points,region:state.region.id});
    trainer.querySelector("[data-fr2-score]").textContent=Math.round(state.points);trainer.querySelector("[data-fr2-hits]").textContent=state.hits;
    revealAnswer(g,errorCents);trainer.querySelector("[data-fr2-confirm]").disabled=true;trainer.querySelector("[data-fr2-next]").classList.add("show");updateStatus();
  }
  function revealAnswer(g,errorCents){
    trainer.classList.add("is-reveal");const spectrum=trainer.querySelector("[data-fr2-spectrum]");spectrum.classList.add("is-reveal");
    const target=trainer.querySelector("[data-fr2-target]");target.style.left=`${hzToPct(state.targetHz)}%`;target.classList.add("show");
    const [lo,hi]=octBand(state.targetHz,state.toleranceOct),left=hzToPct(lo),right=hzToPct(hi),band=trainer.querySelector("[data-fr2-target-band]");band.style.left=`${left}%`;band.style.width=`${right-left}%`;band.classList.add("show");
    const feedback=trainer.querySelector("[data-fr2-feedback]");feedback.className=`sg-fr2-feedback show is-${g.tier}`;feedback.innerHTML=`<div><strong>${g.label}</strong><span>${g.points} pts</span></div><p><b>Yours:</b> ${formatHz(state.userHz)} · <b>Target:</b> ${formatHz(state.targetHz)} · ${errorCents} cents de distancia</p><small>${state.region.label} · ${state.direction>0?"boost":"cut"} ${state.amountDb.toFixed(1)} dB · la franja dorada muestra la zona válida.</small>`;
  }

  function nextRound(){
    stopSource();stopDecisionTimer();if(!state.ready)return;if(state.round>=ROUND_TOTAL){finishSession();return;}
    state.round++;state.answered=false;state.clip=pickClip();state.region=pickRegion();state.targetHz=pickTargetHz(state.region);state.userHz=1000;state.selected=false;state.direction=Math.random()>.5?1:-1;
    const d=difficulty(state.round);state.amountDb=d.amount;state.toleranceOct=d.tol;state.perfectOct=d.perfect;state.q=d.q;state.heard=new Set();state.segmentStart=null;state.segmentDuration=0;state.decisionStartedAt=0;state.dragging=false;renderRound(d.label);
  }

  function finishSession(){
    stopSource();stopDecisionTimer();const attempts=Math.max(1,state.results.length),accuracy=Math.round(state.hits/attempts*100),errors=state.results.map(r=>r.errorCents),avgError=errors.length?Math.round(errors.reduce((a,b)=>a+b,0)/errors.length):0,times=state.responseTimes.filter(Number.isFinite),avgTime=times.length?times.reduce((a,b)=>a+b,0)/times.length:0,perfects=state.results.filter(r=>r.tier==="perfect").length,stars=accuracy>=85&&avgError<=300?3:accuracy>=70?2:accuracy>=50?1:0;
    saveResult(accuracy,avgError,avgTime,stars);trainer.classList.add("is-results");
    const feedback=trainer.querySelector("[data-fr2-feedback]");feedback.className="sg-fr2-feedback show is-perfect";feedback.innerHTML=`<div><strong>SESSION COMPLETE</strong><span>${state.points}/1000</span></div><p>Ya no estás adivinando una categoría: estás ubicando el cambio dentro del espectro.</p>`;
    const summary=trainer.querySelector("[data-fr2-summary]");summary.innerHTML=`<div><span>Precisión</span><strong>${accuracy}%</strong></div><div><span>Error medio</span><strong>${avgError} cents</strong></div><div><span>Perfect</span><strong>${perfects}</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");
    const next=trainer.querySelector("[data-fr2-next]");next.textContent="Repetir";next.classList.add("show");state.round=0;
  }
  function saveResult(accuracy,avgError,avgTime,stars){
    const progress=readJson(PROGRESS_KEY),prev=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0)),best=Math.max(prev,stars);progress[GAME_ID]=best;localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));
    const stats=readJson(STATS_KEY),p=stats[GAME_ID]||{},recent=Array.isArray(p.recent)?p.recent.slice(-4):[];recent.push({accuracy,averageErrorCents:avgError,averageTime:Number(avgTime.toFixed(2)),score:state.points,at:Date.now()});stats[GAME_ID]={...p,bestAccuracy:Math.max(Number(p.bestAccuracy)||0,accuracy),bestAverageErrorCents:p.bestAverageErrorCents==null?avgError:Math.min(Number(p.bestAverageErrorCents),avgError),bestScore:Math.max(Number(p.bestScore)||0,state.points),sessions:(Number(p.sessions)||0)+1,recent};localStorage.setItem(STATS_KEY,JSON.stringify(stats));window.SoundGymProgress?.setStars?.(GAME_ID,best);markCardLive();
  }

  async function playStartSound(){try{const c=await getContext(),now=c.currentTime;[587.33,880,1174.66].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=now+i*.07;o.type="square";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.03,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.15);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.17);});}catch(_){}}
  async function playCorrectSound(){try{const c=await getContext(),now=c.currentTime;[659.25,987.77].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=now+i*.07;o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.04,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.27);});}catch(_){}}
  async function playWrongSound(){try{const c=await getContext(),now=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.setValueAtTime(165,now);o.frequency.exponentialRampToValueAtTime(125,now+.24);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+.25);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+.27);}catch(_){}}
  function showToast(message){const t=document.getElementById("sgToast");if(!t)return;t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300);}

  document.addEventListener("click",event=>{const card=event.target.closest?.('[data-game="frequency-regions"]');if(!card)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();startGame();},true);
  markCardLive();
})();