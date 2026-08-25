(function(){
  "use strict";

  const GAME_ID="low-end-hunt";
  const PROGRESS_KEY="myLessons.soundGym.progress.v1";
  const STATS_KEY="myLessons.soundGym.stats.v1";
  const MANIFEST_URL="assets/sound-gym-audio/manifest.json";
  const STARTING_LIVES=3;
  const STAGE_TOTAL=3;
  const ROUNDS_PER_STAGE=4;
  const VIS_MIN_HZ=35;
  const VIS_MAX_HZ=566;
  const TARGET_MIN_HZ=50;
  const TARGET_MAX_HZ=400;
  const STAGES=[
    {label:"Stage 1",octaveRange:2.10,bonus:8,boost:9.5,q:.95,perfectOct:.070,accurateOct:.20,bandOct:.42},
    {label:"Stage 2",octaveRange:1.65,bonus:16,boost:8.2,q:1.08,perfectOct:.055,accurateOct:.16,bandOct:.32},
    {label:"Stage 3",octaveRange:1.25,bonus:24,boost:6.8,q:1.22,perfectOct:.042,accurateOct:.12,bandOct:.24}
  ];
  const LOW_END_IDS=[
    "bass-808-banking","bass-808-latch","bass-funky-p","bass-log-drum","bass-main",
    "drums-full-100","drums-funky","drums-flame-117","drums-ibadan-117","drums-selebobo-125","drums-tonight-98",
    "mix-final-5","mix-final-4","mix-merengue-regueton","percussion-dembow-120","percussion-conto-105"
  ];
  const TICKS=[35,50,71,100,141,200,283,400,566];

  let audioContext=null,manifest=null,trainer=null;
  let source=null,wetFilter=null,dryGain=null,wetGain=null,masterGain=null,sourceToken=0;
  const decoded=new Map();
  let state=freshState();

  function freshState(){return{
    phase:"idle",stage:1,round:0,lives:STARTING_LIVES,score:0,hits:0,perfects:0,
    clip:null,clipDeck:[],targetHz:100,guessHz:139,activeSide:"on",segmentStart:0,segmentDuration:7,
    responseTimes:[],roundResults:[],decisionStartedAt:0,pendingStage:null
  };}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function shuffle(a){const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}return c;}
  function hzToPercent(hz){const lo=Math.log(VIS_MIN_HZ),hi=Math.log(VIS_MAX_HZ);return((Math.log(clamp(hz,VIS_MIN_HZ,VIS_MAX_HZ))-lo)/(hi-lo))*100;}
  function percentToHz(p){const lo=Math.log(VIS_MIN_HZ),hi=Math.log(VIS_MAX_HZ);return Math.exp(lo+(hi-lo)*clamp(p,0,1));}
  function randomLog(min,max){return Math.exp(Math.log(min)+Math.random()*(Math.log(max)-Math.log(min)));}
  function formatHz(hz){return `${Math.round(hz)} Hz`;}
  function escapeHtml(v){return String(v??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}

  function markCardLive(){
    const card=document.querySelector('[data-game="low-end-hunt"]');if(!card)return;
    card.classList.add("is-live");
    const p=card.querySelector("p");if(p)p.textContent="Entrena específicamente la zona de 50–400 Hz.";
    if(card.dataset.lehObserver==="1")return;card.dataset.lehObserver="1";
    new MutationObserver(()=>{if(!card.classList.contains("is-live"))card.classList.add("is-live");}).observe(card,{attributes:true,attributeFilter:["class"]});
  }

  function ensureTrainer(){
    if(trainer)return trainer;
    trainer=document.createElement("section");
    trainer.className="sg-trainer sg-leh-trainer";
    trainer.id="sgLowEndHuntTrainer";
    trainer.innerHTML=`
      <div class="sg-trainer-head sg-leh-head">
        <div><span class="sg-trainer-kicker">Level 3 · Studio</span><h2>Low End Hunt</h2>
        <p>Una bell EQ realza una frecuencia oculta entre 50 y 400 Hz. Alterna EQ Off / EQ On y localiza exactamente dónde está el cambio.</p></div>
        <button class="sg-trainer-close" type="button" data-leh-close aria-label="Cerrar Low End Hunt">×</button>
      </div>
      <div class="sg-leh-hud">
        <div class="sg-leh-score"><span>Score</span><strong data-leh-score>0</strong></div>
        <div class="sg-leh-stage"><strong data-leh-stage>1/3</strong><span>Stage</span><small data-leh-round>Round 1/4</small></div>
        <div class="sg-leh-lives" data-leh-lives></div>
      </div>
      <div class="sg-leh-source" data-leh-source>Cargando low-end source…</div>
      <div class="sg-leh-readout"><strong data-leh-readout>139 Hz</strong></div>
      <div class="sg-leh-spectrum" data-leh-spectrum role="slider" tabindex="0" aria-label="Seleccionar frecuencia de low end" aria-valuemin="35" aria-valuemax="566" aria-valuenow="139">
        <div class="sg-leh-grid"></div>
        <div class="sg-leh-band" data-leh-band></div>
        <div class="sg-leh-guess" data-leh-guess><i></i></div>
        <div class="sg-leh-target" data-leh-target><i></i><span>Target</span></div>
        <div class="sg-leh-axis">${TICKS.map(hz=>`<span style="left:${hzToPercent(hz)}%">${hz}</span>`).join("")}</div>
      </div>
      <div class="sg-leh-switch" role="group" aria-label="Comparar EQ apagada y encendida">
        <button type="button" data-leh-side="off"><b>EQ OFF</b><small>Original</small></button>
        <button type="button" class="is-active" data-leh-side="on"><b>EQ ON</b><small><i></i> Peak oculto</small></button>
      </div>
      <div class="sg-leh-coach" data-leh-coach>EQ On está sonando. Alterna con EQ Off y escucha qué zona del grave gana peso.</div>
      <div class="sg-leh-feedback" data-leh-feedback></div>
      <div class="sg-leh-actions"><button data-leh-confirm type="button">Confirm Frequency</button><button data-leh-continue type="button" hidden>Continue</button></div>
      <div class="sg-leh-stage-modal" data-leh-stage-modal hidden>
        <div class="sg-leh-stage-card"><span>Stage</span><strong data-leh-modal-stage>2</strong><div><p>Octave range</p><b data-leh-modal-range>1.65</b></div><div><p>Bonus points</p><b data-leh-modal-bonus>16</b></div><button type="button" data-leh-stage-start>Start Stage</button></div>
      </div>
      <div class="sg-session-summary" data-leh-summary></div><button class="sg-next" data-leh-next type="button">Repetir</button>`;
    const nav=document.querySelector(".sg-level-nav");document.querySelector(".sg-shell")?.insertBefore(trainer,nav||null);
    trainer.querySelector("[data-leh-close]")?.addEventListener("click",closeTrainer);
    trainer.querySelectorAll("[data-leh-side]").forEach(b=>b.addEventListener("click",()=>switchSide(b.dataset.lehSide)));
    trainer.querySelector("[data-leh-confirm]")?.addEventListener("click",confirmGuess);
    trainer.querySelector("[data-leh-continue]")?.addEventListener("click",continueRound);
    trainer.querySelector("[data-leh-stage-start]")?.addEventListener("click",startPendingStage);
    trainer.querySelector("[data-leh-next]")?.addEventListener("click",startGame);
    setupSpectrumInput();return trainer;
  }

  async function startGame(){
    document.querySelectorAll(".sg-trainer.show").forEach(n=>n.classList.remove("show"));ensureTrainer().classList.add("show");
    trainer.scrollIntoView({behavior:"smooth",block:"start"});playStartSound();
    try{if(!manifest)await loadManifest();state=freshState();state.clipDeck=buildDeck();renderLives();await beginRound();}
    catch(error){showToast(error.message||"No se pudo iniciar Low End Hunt.");stopAudio();}
  }
  function closeTrainer(){stopAudio();trainer?.classList.remove("show");}
  async function loadManifest(){const r=await fetch(MANIFEST_URL,{cache:"force-cache"});if(!r.ok)throw new Error("No se pudo cargar el audio de Sound Gym.");manifest=await r.json();}
  function buildDeck(){const clips=manifest?.clips||[];const d=LOW_END_IDS.map(id=>clips.find(c=>c.id===id)).filter(Boolean);return shuffle(d.length?d:clips);}
  function clipSupports(clip,hz){const cat=clip?.category,id=String(clip?.id||"");if(hz<85)return cat==="bass"||cat==="full_mix"||cat==="drums"||/808/.test(id);if(hz<150)return cat!=="vocals"&&cat!=="guitar";return ["bass","full_mix","drums","percussion","keys"].includes(cat);}
  function pickClip(hz){if(!state.clipDeck.length)state.clipDeck=buildDeck();let i=state.clipDeck.findIndex(c=>clipSupports(c,hz));if(i<0){state.clipDeck=buildDeck();i=state.clipDeck.findIndex(c=>clipSupports(c,hz));}return state.clipDeck.splice(Math.max(0,i),1)[0]||manifest.clips[0];}

  function stageTarget(){
    const anchors=state.stage===1?[55,70,90,120,160,220,300,380]:state.stage===2?[52,63,82,105,135,175,230,310,390]:null;
    if(anchors){const base=anchors[Math.floor(Math.random()*anchors.length)];return clamp(base*(.94+Math.random()*.12),TARGET_MIN_HZ,TARGET_MAX_HZ);}
    return randomLog(TARGET_MIN_HZ,TARGET_MAX_HZ);
  }
  async function beginRound(){
    stopAudio();state.phase="loading";state.round+=1;state.targetHz=stageTarget();state.guessHz=clamp(Math.round(randomLog(65,320)),VIS_MIN_HZ,VIS_MAX_HZ);state.clip=pickClip(state.targetHz);state.activeSide="on";renderRound();
    const buffer=await decodeClip(state.clip);prepareSegment(buffer);await startAudio(buffer);state.phase="editing";state.decisionStartedAt=performance.now();syncSelector();switchSide("on",true);updateCoach("EQ On está activo. Compara con EQ Off y coloca el selector donde oyes el boost.");
  }
  function renderRound(){
    const cfg=STAGES[state.stage-1];trainer.classList.remove("is-reveal","is-results");
    trainer.querySelector("[data-leh-score]").textContent=Math.round(state.score).toLocaleString("en-US");trainer.querySelector("[data-leh-stage]").textContent=`${state.stage}/${STAGE_TOTAL}`;trainer.querySelector("[data-leh-round]").textContent=`Round ${state.round}/${ROUNDS_PER_STAGE}`;trainer.querySelector("[data-leh-source]").textContent=`Fuente · ${state.clip?.title||"Low-end material"}`;
    trainer.querySelector("[data-leh-feedback]").className="sg-leh-feedback";trainer.querySelector("[data-leh-feedback]").innerHTML="";trainer.querySelector("[data-leh-confirm]").hidden=false;trainer.querySelector("[data-leh-confirm]").disabled=false;trainer.querySelector("[data-leh-continue]").hidden=true;trainer.querySelector("[data-leh-summary]").classList.remove("show");trainer.querySelector("[data-leh-next]").classList.remove("show");renderLives();syncSelector();
    updateBand(cfg.bandOct);
  }
  function renderLives(){const h=trainer?.querySelector("[data-leh-lives]");if(!h)return;h.innerHTML=Array.from({length:STARTING_LIVES},(_,i)=>`<span class="sg-leh-life${i<state.lives?" is-alive":""}">♥</span>`).join("");}

  async function getContext(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error("Este navegador no soporta Web Audio.");if(!audioContext)audioContext=new C();if(audioContext.state==="suspended")await audioContext.resume();return audioContext;}
  async function decodeClip(clip){if(decoded.has(clip.id))return decoded.get(clip.id);const ctx=await getContext();const r=await fetch(`${manifest.basePath}${clip.file}`);if(!r.ok)throw new Error(`No se pudo cargar ${clip.file}.`);let bytes;if(clip.file.endsWith(".b64")){const bin=atob((await r.text()).trim()),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);bytes=u.buffer;}else bytes=await r.arrayBuffer();const b=await ctx.decodeAudioData(bytes.slice(0));decoded.set(clip.id,b);return b;}
  function prepareSegment(buffer){const duration=Math.min(7.5,Math.max(4,buffer.duration));const max=Math.max(0,buffer.duration-duration);state.segmentStart=max?Math.random()*max:0;state.segmentDuration=Math.min(duration,buffer.duration-state.segmentStart);}
  async function startAudio(buffer){
    stopAudio();const ctx=await getContext();const token=++sourceToken,cfg=STAGES[state.stage-1];source=ctx.createBufferSource();wetFilter=ctx.createBiquadFilter();dryGain=ctx.createGain();wetGain=ctx.createGain();masterGain=ctx.createGain();
    source.buffer=buffer;source.loop=true;source.loopStart=state.segmentStart;source.loopEnd=Math.max(state.segmentStart+.4,state.segmentStart+state.segmentDuration);wetFilter.type="peaking";wetFilter.frequency.value=state.targetHz;wetFilter.Q.value=cfg.q;wetFilter.gain.value=cfg.boost;dryGain.gain.value=.0001;wetGain.gain.value=1;masterGain.gain.value=.72;
    source.connect(dryGain);dryGain.connect(masterGain);source.connect(wetFilter);wetFilter.connect(wetGain);wetGain.connect(masterGain);masterGain.connect(ctx.destination);source.onended=()=>{if(token!==sourceToken)return;};source.start(ctx.currentTime+.04,state.segmentStart);
  }
  function stopAudio(){sourceToken++;try{source?.stop();}catch(_){ }[source,wetFilter,dryGain,wetGain,masterGain].forEach(n=>{try{n?.disconnect();}catch(_){ }});source=wetFilter=dryGain=wetGain=masterGain=null;}
  function switchSide(side,instant=false){if(!dryGain||!wetGain||state.phase==="results")return;state.activeSide=side;const ctx=audioContext,now=ctx.currentTime,d=instant?.005:.045;[dryGain.gain,wetGain.gain].forEach(p=>{p.cancelScheduledValues(now);p.setValueAtTime(Math.max(.0001,p.value),now);});if(side==="on"){dryGain.gain.exponentialRampToValueAtTime(.0001,now+d);wetGain.gain.exponentialRampToValueAtTime(1,now+d);}else{wetGain.gain.exponentialRampToValueAtTime(.0001,now+d);dryGain.gain.exponentialRampToValueAtTime(1,now+d);}trainer?.querySelectorAll("[data-leh-side]").forEach(b=>b.classList.toggle("is-active",b.dataset.lehSide===side));}

  function setupSpectrumInput(){const s=trainer.querySelector("[data-leh-spectrum]");let drag=false;const from=e=>{if(state.phase!=="editing")return;const r=s.getBoundingClientRect();setGuess(percentToHz((e.clientX-r.left)/r.width));};s.addEventListener("pointerdown",e=>{if(state.phase!=="editing")return;drag=true;s.setPointerCapture?.(e.pointerId);from(e);});s.addEventListener("pointermove",e=>{if(drag)from(e);});const end=e=>{drag=false;try{s.releasePointerCapture?.(e.pointerId);}catch(_){ }};s.addEventListener("pointerup",end);s.addEventListener("pointercancel",end);s.addEventListener("keydown",e=>{if(state.phase!=="editing")return;const step=e.shiftKey?1.015:1.035;if(e.key==="ArrowRight"||e.key==="ArrowUp"){e.preventDefault();setGuess(state.guessHz*step);}if(e.key==="ArrowLeft"||e.key==="ArrowDown"){e.preventDefault();setGuess(state.guessHz/step);}});}
  function setGuess(hz){state.guessHz=clamp(hz,VIS_MIN_HZ,VIS_MAX_HZ);syncSelector();}
  function syncSelector(){if(!trainer)return;const p=hzToPercent(state.guessHz);trainer.querySelector("[data-leh-readout]").textContent=formatHz(state.guessHz);const s=trainer.querySelector("[data-leh-spectrum]");s?.setAttribute("aria-valuenow",String(Math.round(state.guessHz)));const g=trainer.querySelector("[data-leh-guess]");if(g)g.style.left=`${p}%`;const t=trainer.querySelector("[data-leh-target]");if(t)t.style.left=`${hzToPercent(state.targetHz)}%`;updateBand(STAGES[state.stage-1].bandOct);}
  function updateBand(oct){const center=hzToPercent(state.guessHz),lo=hzToPercent(state.guessHz/Math.pow(2,oct/2)),hi=hzToPercent(state.guessHz*Math.pow(2,oct/2)),b=trainer?.querySelector("[data-leh-band]");if(b){b.style.left=`${clamp(lo,0,100)}%`;b.style.width=`${clamp(hi-lo,2,100)}%`;}}

  function grade(){const cfg=STAGES[state.stage-1],oct=Math.abs(Math.log2(state.guessHz/state.targetHz));if(oct<=cfg.perfectOct)return{tier:"perfect",label:"Perfect!",base:160,passed:true,oct};if(oct<=cfg.accurateOct){const proximity=1-oct/cfg.accurateOct;return{tier:"accurate",label:"Accurate",base:Math.round(40+proximity*62),passed:true,oct};}return{tier:"miss",label:"Miss",base:0,passed:false,oct};}
  function confirmGuess(){
    if(state.phase!=="editing")return;const elapsed=Math.max(0,(performance.now()-state.decisionStartedAt)/1000),g=grade(),cfg=STAGES[state.stage-1],bonus=g.passed?cfg.bonus:0,points=g.base+bonus;state.responseTimes.push(elapsed);state.score+=points;if(g.passed)state.hits++;else state.lives=Math.max(0,state.lives-1);if(g.tier==="perfect")state.perfects++;state.roundResults.push({stage:state.stage,round:state.round,targetHz:state.targetHz,guessHz:state.guessHz,tier:g.tier,points,seconds:elapsed,octaves:g.oct});
    stopAudio();g.passed?playCorrectSound():playWrongSound();state.phase="reveal";trainer.classList.add("is-reveal");renderLives();trainer.querySelector("[data-leh-score]").textContent=Math.round(state.score).toLocaleString("en-US");trainer.querySelector("[data-leh-confirm]").hidden=true;trainer.querySelector("[data-leh-continue]").hidden=false;
    const cents=Math.round(g.oct*1200),feedback=trainer.querySelector("[data-leh-feedback]");feedback.className=`sg-leh-feedback show ${g.passed?"is-correct":"is-wrong"}`;feedback.innerHTML=`<div class="sg-leh-grade"><strong>${escapeHtml(g.label)}</strong><span>+${points}</span></div><div class="sg-leh-feedback-copy"><b>${formatHz(state.guessHz)} → ${formatHz(state.targetHz)}</b><span>${cents} cents de distancia${g.passed?` · Bonus +${bonus}`:" · Pierdes una vida"}</span></div>`;updateCoach(g.tier==="perfect"?"Localización prácticamente exacta.":g.passed?"Buena lectura. Observa la distancia entre tu marcador y el target.":"Escucha la zona: sub, peso, cuerpo o low-mid. El target queda revelado para aprender.");
  }

  async function continueRound(){
    if(state.phase!=="reveal")return;if(state.lives<=0){finishSession();return;}
    if(state.round<ROUNDS_PER_STAGE){await beginRound();return;}
    if(state.stage>=STAGE_TOTAL){finishSession();return;}
    showStageTransition(state.stage+1);
  }
  function showStageTransition(next){state.phase="stage-transition";state.pendingStage=next;const cfg=STAGES[next-1],m=trainer.querySelector("[data-leh-stage-modal]");trainer.querySelector("[data-leh-modal-stage]").textContent=next;trainer.querySelector("[data-leh-modal-range]").textContent=cfg.octaveRange.toFixed(2);trainer.querySelector("[data-leh-modal-bonus]").textContent=cfg.bonus;m.hidden=false;}
  async function startPendingStage(){const next=state.pendingStage;if(!next)return;trainer.querySelector("[data-leh-stage-modal]").hidden=true;state.stage=next;state.round=0;state.pendingStage=null;await beginRound();}

  function finishSession(){
    stopAudio();state.phase="results";trainer.classList.add("is-results");const attempts=Math.max(1,state.roundResults.length),acc=Math.round(state.roundResults.reduce((s,r)=>s+(r.tier==="perfect"?100:r.tier==="accurate"?78:0),0)/attempts),avg=state.responseTimes.length?state.responseTimes.reduce((a,b)=>a+b,0)/state.responseTimes.length:0,theoretical=STAGE_TOTAL*ROUNDS_PER_STAGE*160+ROUNDS_PER_STAGE*STAGES.reduce((s,c)=>s+c.bonus,0),normalized=Math.round(clamp(state.score/theoretical*1000,0,1000)),stars=acc>=90&&state.lives>0?3:acc>=75?2:acc>=55?1:0;
    const progress=readJson(PROGRESS_KEY),prev=Math.max(0,Math.min(3,Number(progress[GAME_ID])||0)),best=Math.max(prev,stars);progress[GAME_ID]=best;localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));saveStats(acc,avg,normalized);if(window.SoundGymProgress?.setStars)window.SoundGymProgress.setStars(GAME_ID,best);markCardLive();
    const summary=trainer.querySelector("[data-leh-summary]");summary.innerHTML=`<div><span>Precisión</span><strong>${acc}%</strong></div><div><span>Tiempo promedio</span><strong>${avg?avg.toFixed(1):"—"} s</strong></div><div><span>Score</span><strong>${normalized}/1000</strong></div><div><span>Dominio</span><strong>${"★".repeat(stars)}${"☆".repeat(3-stars)}</strong></div>`;summary.classList.add("show");trainer.querySelector("[data-leh-confirm]").hidden=true;trainer.querySelector("[data-leh-continue]").hidden=true;trainer.querySelector("[data-leh-feedback]").className="sg-leh-feedback";const n=trainer.querySelector("[data-leh-next]");n.textContent="Repetir";n.classList.add("show");
  }
  function readJson(k){try{const p=JSON.parse(localStorage.getItem(k)||"{}");return p&&typeof p==="object"?p:{};}catch(_){return{};}}
  function saveStats(accuracy,averageTime,score){const all=readJson(STATS_KEY),old=all[GAME_ID]||{},recent=Array.isArray(old.recent)?old.recent.slice(-4):[];recent.push({accuracy,averageTime:Number(averageTime.toFixed(2)),score,rawScore:state.score,perfects:state.perfects,at:Date.now()});all[GAME_ID]={bestAccuracy:Math.max(Number(old.bestAccuracy)||0,accuracy),bestAverageTime:old.bestAverageTime?Math.min(Number(old.bestAverageTime),averageTime):averageTime,bestScore:Math.max(Number(old.bestScore)||0,score),bestRawScore:Math.max(Number(old.bestRawScore)||0,state.score),sessions:(Number(old.sessions)||0)+1,recent};localStorage.setItem(STATS_KEY,JSON.stringify(all));}
  function updateCoach(t){const h=trainer?.querySelector("[data-leh-coach]");if(h)h.textContent=t;}
  function showToast(t){const h=document.getElementById("sgToast");if(!h)return;h.textContent=t;h.classList.add("show");setTimeout(()=>h.classList.remove("show"),2300);}

  async function playStartSound(){try{const c=await getContext(),now=c.currentTime;[392,587.33,783.99].forEach((f,i)=>tone(c,f,now+i*.07,.028,.16,"square"));}catch(_){ }}
  async function playCorrectSound(){try{const c=await getContext(),now=c.currentTime;tone(c,659.25,now,.045,.25,"sine");tone(c,987.77,now+.07,.04,.28,"sine");}catch(_){ }}
  async function playWrongSound(){try{const c=await getContext(),now=c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.setValueAtTime(165,now);o.frequency.exponentialRampToValueAtTime(118,now+.24);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+.27);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+.28);}catch(_){ }}
  function tone(c,f,at,amp,dur,type){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(amp,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+dur+.02);}

  document.addEventListener("click",e=>{const card=e.target.closest?.('[data-game="low-end-hunt"]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();startGame();},true);
  markCardLive();
})();