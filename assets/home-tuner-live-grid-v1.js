(function(){
  "use strict";
  if(window.__FORTISSIMO_TUNER_LIVE_GRID_V1__) return;
  window.__FORTISSIMO_TUNER_LIVE_GRID_V1__=true;

  const LIFE_MS=3400;
  const RANGE_CENTS=50;
  const STALE_MS=360;
  const particles=[];
  const trace=[];
  let lastMeasurementTime=0;
  let lastTargetIndex=null;
  let raf=0;
  let lastCanvasSize="";

  installStyles();
  watchForTuner();

  function installStyles(){
    if(document.getElementById("fortissimoTunerLiveGridStyles")) return;
    const style=document.createElement("style");
    style.id="fortissimoTunerLiveGridStyles";
    style.textContent=`
      .ml-scale{display:none!important}
      .ml-tuner-status{display:none!important}
      .ml-tuner-meter{padding-bottom:22px!important}
      .ml-pitch-grid{position:relative;width:min(620px,100%);height:224px;margin:22px auto 0;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.004));overflow:hidden;isolation:isolate}
      .ml-pitch-grid canvas{display:block;width:100%;height:100%;touch-action:none}
      .ml-pitch-grid-labels{position:absolute;left:10px;right:10px;top:8px;z-index:2;display:flex;align-items:center;justify-content:space-between;pointer-events:none;color:rgba(255,255,255,.38);font:800 10px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.07em;text-transform:uppercase}
      .ml-pitch-grid-labels span:nth-child(2){color:rgba(115,255,170,.72);letter-spacing:.12em}
      .ml-pitch-grid-live{position:absolute;right:10px;bottom:8px;z-index:2;display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.38);font:800 9px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;pointer-events:none}
      .ml-pitch-grid-live:before{content:"";width:5px;height:5px;border-radius:50%;background:#ff5a00;box-shadow:0 0 10px rgba(255,90,0,.7);animation:fortissimoLivePulse 1.35s ease-in-out infinite}
      .ml-pitch-grid.is-idle .ml-pitch-grid-live:before{background:rgba(255,255,255,.3);box-shadow:none;animation:none}
      .ml-pitch-grid.is-idle .ml-pitch-grid-live{color:rgba(255,255,255,.24)}
      .ml-cents{min-height:28px;font-variant-numeric:tabular-nums}
      .ml-cents.is-listening{color:rgba(255,255,255,.44)!important;font-size:12px!important;letter-spacing:.08em;text-transform:uppercase}
      @keyframes fortissimoLivePulse{0%,100%{opacity:.38;transform:scale(.82)}50%{opacity:1;transform:scale(1.25)}}
      @media(max-width:760px){.ml-pitch-grid{height:198px;margin-top:18px}.ml-tuner-meter{padding-left:18px!important;padding-right:18px!important;padding-bottom:18px!important}}
      @media(prefers-reduced-motion:reduce){.ml-pitch-grid-live:before{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function watchForTuner(){
    const tick=()=>{
      const meter=document.querySelector(".ml-tuner-meter");
      if(meter){
        ensureGrid(meter);
        startLoop();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  function ensureGrid(meter){
    let grid=meter.querySelector(".ml-pitch-grid");
    if(!grid){
      grid=document.createElement("div");
      grid.className="ml-pitch-grid is-idle";
      grid.setAttribute("aria-label","Live pitch history");
      grid.innerHTML=`<canvas class="ml-pitch-grid-canvas" aria-hidden="true"></canvas><div class="ml-pitch-grid-labels" aria-hidden="true"><span>♭ flat</span><span>in tune</span><span>sharp ♯</span></div><div class="ml-pitch-grid-live" aria-hidden="true">live pitch</div>`;
      const message=meter.querySelector(".ml-tuner-message");
      if(message) message.insertAdjacentElement("beforebegin",grid);
      else meter.appendChild(grid);
    }
    return grid;
  }

  function startLoop(){
    if(raf) return;
    const frame=()=>{
      raf=requestAnimationFrame(frame);
      const backdrop=document.querySelector(".ml-tuner-backdrop");
      const open=Boolean(backdrop?.classList.contains("is-open"));
      const grid=document.querySelector(".ml-pitch-grid");
      const canvas=grid?.querySelector("canvas");
      if(!open||!grid||!canvas){
        if(!open) clearHistory();
        return;
      }

      const api=window.FortissimoTunerV3;
      const measurement=api?.getLastMeasurement?.();
      if(measurement&&Number.isFinite(measurement.filteredCents)&&measurement.time&&measurement.time!==lastMeasurementTime){
        lastMeasurementTime=measurement.time;
        addMeasurement(measurement);
      }

      const age=measurement?.time?Date.now()-measurement.time:Infinity;
      const idle=age>STALE_MS;
      grid.classList.toggle("is-idle",idle);
      if(idle) renderIdleCopy();
      else clearIdleCopyState();
      prune();
      draw(canvas,grid,measurement,idle);
    };
    raf=requestAnimationFrame(frame);
  }

  function addMeasurement(m){
    const now=performance.now();
    const cents=clamp(Number(m.filteredCents),-RANGE_CENTS,RANGE_CENTS);
    const confidence=clamp(Number(m.confidence)||0,0,1);
    const targetIndex=Number.isFinite(m.targetIndex)?m.targetIndex:-1;
    const newSegment=lastTargetIndex!==null&&targetIndex!==lastTargetIndex;
    trace.push({born:now,cents,confidence,targetIndex,breakBefore:newSegment});
    lastTargetIndex=targetIndex;

    const seed=(Number(m.time)||Date.now())*.001;
    const spread=(1-confidence)*2.2+.18;
    const count=confidence>.86?4:confidence>.7?3:2;
    for(let i=0;i<count;i++){
      const phase=seed*(1.73+i*.61)+i*2.17;
      const offset=Math.sin(phase*7.1)*spread*(.45+i*.18);
      const drift=Math.cos(phase*3.7)*1.4;
      particles.push({born:now,cents:clamp(cents+offset,-RANGE_CENTS,RANGE_CENTS),confidence,size:1.05+i*.28,drift,targetIndex});
    }
  }

  function draw(canvas,grid,measurement,idle){
    const rect=grid.getBoundingClientRect();
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const width=Math.max(1,Math.round(rect.width));
    const height=Math.max(1,Math.round(rect.height));
    const sizeKey=`${width}x${height}@${dpr}`;
    if(lastCanvasSize!==sizeKey){
      lastCanvasSize=sizeKey;
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
    }
    const ctx=canvas.getContext("2d");
    if(!ctx) return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);

    drawGrid(ctx,width,height);
    const now=performance.now();
    drawTrace(ctx,width,height,now);
    drawParticles(ctx,width,height,now);
    if(!idle&&measurement&&Number.isFinite(measurement.filteredCents)) drawHead(ctx,width,measurement);
  }

  function drawGrid(ctx,width,height){
    ctx.save();
    ctx.lineWidth=1;

    const centerX=width/2;
    const tuneHalf=Math.max(2.5,width*(1.8/(RANGE_CENTS*2)));
    const grad=ctx.createLinearGradient(centerX-tuneHalf,0,centerX+tuneHalf,0);
    grad.addColorStop(0,"rgba(71,220,139,0)");
    grad.addColorStop(.5,"rgba(71,220,139,.105)");
    grad.addColorStop(1,"rgba(71,220,139,0)");
    ctx.fillStyle=grad;
    ctx.fillRect(centerX-tuneHalf*3,0,tuneHalf*6,height);

    [-50,-25,0,25,50].forEach(cents=>{
      const x=xForCents(cents,width);
      ctx.beginPath();
      ctx.strokeStyle=cents===0?"rgba(112,255,172,.34)":"rgba(255,255,255,.075)";
      ctx.moveTo(x,0);
      ctx.lineTo(x,height);
      ctx.stroke();
    });

    for(let i=1;i<=5;i++){
      const y=(height/6)*i;
      ctx.beginPath();
      ctx.strokeStyle="rgba(255,255,255,.055)";
      ctx.moveTo(0,y);
      ctx.lineTo(width,y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle="rgba(255,90,0,.30)";
    ctx.moveTo(0,24.5);
    ctx.lineTo(width,24.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrace(ctx,width,height,now){
    let previous=null;
    for(const point of trace){
      const age=now-point.born;
      if(age<0||age>LIFE_MS) continue;
      const y=yForAge(age,height);
      const x=xForCents(point.cents,width);
      const alpha=Math.pow(1-age/LIFE_MS,1.35)*(.18+.56*point.confidence);
      if(previous&&!point.breakBefore&&point.targetIndex===previous.targetIndex&&point.born-previous.born<150){
        const prevAge=now-previous.born;
        const px=xForCents(previous.cents,width);
        const py=yForAge(prevAge,height);
        ctx.beginPath();
        ctx.moveTo(px,py);
        ctx.lineTo(x,y);
        ctx.lineWidth=1.15;
        ctx.strokeStyle=isCentered(point.cents,point.confidence)?`rgba(97,255,163,${alpha*.9})`:`rgba(255,119,45,${alpha*.72})`;
        ctx.stroke();
      }
      previous=point;
    }
  }

  function drawParticles(ctx,width,height,now){
    for(const p of particles){
      const age=now-p.born;
      if(age<0||age>LIFE_MS) continue;
      const life=1-age/LIFE_MS;
      const y=yForAge(age,height)+p.drift*(1-life);
      const x=xForCents(p.cents,width);
      const alpha=Math.pow(life,1.2)*(.18+.72*p.confidence);
      const good=isCentered(p.cents,p.confidence);
      ctx.beginPath();
      ctx.arc(x,y,p.size*(.72+.38*life),0,Math.PI*2);
      ctx.fillStyle=good?`rgba(105,255,169,${alpha})`:`rgba(255,112,38,${alpha})`;
      ctx.fill();
    }
  }

  function drawHead(ctx,width,m){
    const cents=clamp(Number(m.filteredCents),-RANGE_CENTS,RANGE_CENTS);
    const confidence=clamp(Number(m.confidence)||0,0,1);
    const x=xForCents(cents,width);
    const y=24.5;
    const good=isCentered(cents,confidence);
    ctx.save();
    ctx.shadowBlur=good?15:13;
    ctx.shadowColor=good?"rgba(84,255,151,.8)":"rgba(255,90,0,.8)";
    ctx.beginPath();
    ctx.arc(x,y,good?3.7:3.2,0,Math.PI*2);
    ctx.fillStyle=good?"rgba(121,255,177,.98)":"rgba(255,118,45,.98)";
    ctx.fill();
    ctx.restore();
  }

  function renderIdleCopy(){
    const cents=document.querySelector(".ml-cents");
    if(cents){
      cents.classList.add("is-listening");
      if(cents.textContent!=="Listening…") cents.textContent="Listening…";
    }
    const message=document.querySelector(".ml-tuner-message");
    if(message&&message.textContent!=="Play a string") message.textContent="Play a string";
  }

  function clearIdleCopyState(){
    document.querySelector(".ml-cents")?.classList.remove("is-listening");
  }

  function prune(){
    const cutoff=performance.now()-LIFE_MS-120;
    while(trace.length&&trace[0].born<cutoff) trace.shift();
    while(particles.length&&particles[0].born<cutoff) particles.shift();
  }

  function clearHistory(){
    if(!particles.length&&!trace.length&&!lastMeasurementTime) return;
    particles.length=0;
    trace.length=0;
    lastMeasurementTime=0;
    lastTargetIndex=null;
    lastCanvasSize="";
    document.querySelector(".ml-cents")?.classList.remove("is-listening");
  }

  function xForCents(cents,width){
    const pad=14;
    return pad+((clamp(cents,-RANGE_CENTS,RANGE_CENTS)+RANGE_CENTS)/(RANGE_CENTS*2))*(width-pad*2);
  }

  function yForAge(age,height){
    const top=24.5;
    const bottom=height-10;
    return top+clamp(age/LIFE_MS,0,1)*(bottom-top);
  }

  function isCentered(cents,confidence){
    return Math.abs(cents)<=1.5&&confidence>=.72;
  }

  function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
})();
