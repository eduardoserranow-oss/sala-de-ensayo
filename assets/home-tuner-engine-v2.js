(function(){
  "use strict";
  if(window.__MY_LESSONS_TUNER_AUDIO_FIX_V2__) return;
  window.__MY_LESSONS_TUNER_AUDIO_FIX_V2__=true;
  window.__MY_LESSONS_TUNER_AUDIO_FIX__=true;

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;

  let referenceCtx=null;
  const CONFIG={
    guitar:{style:"acoustic",minFreq:70,maxFreq:700,midis:[40,45,50,55,59,64],freqs:[82.4069,110,146.8324,195.9977,246.9417,329.6276]},
    bass:{style:"bass1",minFreq:35,maxFreq:280,midis:[28,33,38,43],freqs:[41.2034,55,73.4162,97.9989]},
    ukulele:{style:"bright",minFreq:220,maxFreq:750,midis:[67,60,64,69],freqs:[391.9954,261.6256,329.6276,440]}
  };

  const PARAMS={
    acoustic:{feedback:.935,cutoff:3800,q:.5,body:210,bodyGain:3,gain:.18,decay:1.25},
    bass1:{feedback:.965,cutoff:1450,q:.7,body:105,bodyGain:5,gain:.24,decay:1.6},
    bright:{feedback:.93,cutoff:5000,q:.55,body:450,bodyGain:2,gain:.15,decay:1}
  };

  const originalGetUserMedia=navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  let capturedStream=null;
  let engineCtx=null;
  let engineSource=null;
  let engineAnalyser=null;
  let engineRaf=0;
  let lastAnalysis=0;
  let lastPitchAt=0;
  let engineGateUntil=0;
  let engineOpen=false;
  let selectedIndex=0;
  let trackedIndex=null;
  let trackedVotes=0;
  let filteredCents=null;
  let lastRawCents=null;
  let fastUntil=0;
  let inTuneLatched=false;
  let lastView=null;

  installNeedleStyle();
  installCaptureBridge();
  installEngineLifecycle();

  document.addEventListener("pointerdown",handleReference,{capture:true});
  document.addEventListener("click",handleReference,{capture:true});
  document.addEventListener("click",handleTunerInteraction,{capture:true});
  document.addEventListener("change",handleTunerInteraction,{capture:true});

  function installNeedleStyle(){
    if(document.getElementById("fortissimoTunerEngineV2Styles")) return;
    const style=document.createElement("style");
    style.id="fortissimoTunerEngineV2Styles";
    style.textContent=`
      .ml-needle{transition:left .035s linear,border-color .12s ease,box-shadow .12s ease!important;will-change:left}
      .ml-cents{font-variant-numeric:tabular-nums}
    `;
    document.head.appendChild(style);
  }

  function installCaptureBridge(){
    if(!originalGetUserMedia || !navigator.mediaDevices) return;
    if(navigator.mediaDevices.__fortissimoTunerWrapped) return;
    const wrapped=async function(constraints){
      const stream=await originalGetUserMedia(constraints);
      if(constraints?.audio && document.querySelector(".ml-tuner-backdrop")){
        capturedStream=stream;
        queueMicrotask(()=>{
          if(document.querySelector(".ml-tuner-backdrop.is-open")) startPrecisionEngine(stream);
        });
      }
      return stream;
    };
    try{
      navigator.mediaDevices.getUserMedia=wrapped;
      navigator.mediaDevices.__fortissimoTunerWrapped=true;
    }catch(_){ }
  }

  function installEngineLifecycle(){
    const watch=()=>{
      const backdrop=document.querySelector(".ml-tuner-backdrop");
      if(!backdrop){ requestAnimationFrame(watch); return; }
      const sync=()=>{
        const open=backdrop.classList.contains("is-open");
        if(open && !engineOpen){
          engineOpen=true;
          resetEngineTracking();
          syncSelectedIndex();
          if(capturedStream) startPrecisionEngine(capturedStream);
          else if(originalGetUserMedia){
            // The legacy tuner requests the microphone immediately after opening.
            // Give that request time to pass through our capture bridge so both
            // engines share one stream instead of opening the iPhone mic twice.
            setTimeout(()=>{
              if(!engineOpen || capturedStream) return;
              originalGetUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false})
                .then(stream=>{ capturedStream=stream; if(engineOpen) startPrecisionEngine(stream); })
                .catch(()=>{});
            },700);
          }
        }else if(!open && engineOpen){
          engineOpen=false;
          stopPrecisionEngine();
        }
      };
      new MutationObserver(sync).observe(backdrop,{attributes:true,attributeFilter:["class"]});
      sync();
    };
    watch();
  }

  function handleTunerInteraction(event){
    const stringButton=event.target.closest?.(".ml-string-btn");
    if(stringButton){
      const buttons=[...document.querySelectorAll(".ml-string-btn")];
      const index=buttons.indexOf(stringButton);
      if(index>=0){ selectedIndex=index; trackedIndex=index; trackedVotes=0; resetFilterOnly(); }
      engineGateUntil=performance.now()+860;
      return;
    }
    if(event.target.closest?.(".ml-switch") || event.target.matches?.(".ml-tuner-select")){
      selectedIndex=0;
      trackedIndex=null;
      trackedVotes=0;
      resetFilterOnly();
      configureAnalyser();
    }
  }

  async function startPrecisionEngine(stream){
    if(!stream || !engineOpen) return;
    stopPrecisionEngine(false);
    try{
      engineCtx=new AudioCtx({latencyHint:"interactive"});
      if(engineCtx.state==="suspended") await engineCtx.resume();
      engineSource=engineCtx.createMediaStreamSource(stream);
      engineAnalyser=engineCtx.createAnalyser();
      engineAnalyser.smoothingTimeConstant=0;
      configureAnalyser();
      engineSource.connect(engineAnalyser);
      lastAnalysis=0;
      lastPitchAt=0;
      engineRaf=requestAnimationFrame(engineLoop);
    }catch(_){ stopPrecisionEngine(false); }
  }

  function stopPrecisionEngine(clearStream=true){
    if(engineRaf) cancelAnimationFrame(engineRaf);
    engineRaf=0;
    try{engineSource?.disconnect();}catch(_){ }
    engineSource=null;
    engineAnalyser=null;
    if(engineCtx){ const ctx=engineCtx; engineCtx=null; try{ctx.close();}catch(_){ } }
    if(clearStream) capturedStream=null;
    resetEngineTracking();
  }

  function configureAnalyser(){
    if(!engineAnalyser) return;
    const key=currentInstrumentKey();
    const desired=key==="bass"?4096:2048;
    if(engineAnalyser.fftSize!==desired) engineAnalyser.fftSize=desired;
  }

  function engineLoop(timestamp){
    if(!engineOpen || !engineAnalyser || !engineCtx) return;
    engineRaf=requestAnimationFrame(engineLoop);
    renderLastView();
    if(performance.now()<engineGateUntil) return;

    const key=currentInstrumentKey();
    const interval=key==="bass"?46:32;
    if(timestamp-lastAnalysis<interval) return;
    lastAnalysis=timestamp;
    configureAnalyser();

    const raw=new Float32Array(engineAnalyser.fftSize);
    engineAnalyser.getFloatTimeDomainData(raw);
    const cfg=CONFIG[key]||CONFIG.guitar;
    const prepared=prepareBuffer(raw,engineCtx.sampleRate,key==="bass"?2:1);
    const result=detectPitchYinV2(prepared.buffer,prepared.sampleRate,cfg.minFreq,cfg.maxFreq,key);
    if(!result){
      if(performance.now()-lastPitchAt>230) lastView=null;
      return;
    }

    let frequency=resolveKnownStringHarmonic(result.frequency,cfg);
    if(!Number.isFinite(frequency)) return;
    lastPitchAt=performance.now();
    updatePrecisionView(frequency,result.quality,cfg,key);
  }

  function prepareBuffer(buffer,sampleRate,decimation){
    if(decimation<=1) return {buffer,sampleRate};
    const length=Math.floor(buffer.length/decimation);
    const result=new Float32Array(length);
    for(let i=0;i<length;i++){
      let sum=0;
      for(let j=0;j<decimation;j++) sum+=buffer[i*decimation+j]||0;
      result[i]=sum/decimation;
    }
    return {buffer:result,sampleRate:sampleRate/decimation};
  }

  function detectPitchYinV2(buffer,sampleRate,minFreq,maxFreq,key){
    let mean=0;
    for(let i=0;i<buffer.length;i++) mean+=buffer[i];
    mean/=buffer.length;
    let rms=0;
    for(let i=0;i<buffer.length;i++){ const v=buffer[i]-mean; rms+=v*v; }
    rms=Math.sqrt(rms/buffer.length);
    const gate=key==="bass"?.0055:.0045;
    if(rms<gate) return null;

    const minTau=Math.max(2,Math.floor(sampleRate/maxFreq));
    const maxTau=Math.min(Math.floor(sampleRate/minFreq),Math.floor(buffer.length*.48));
    if(maxTau<=minTau+2) return null;
    const yin=new Float32Array(maxTau+1);
    const limit=buffer.length-maxTau;
    const stride=2;
    for(let tau=1;tau<=maxTau;tau++){
      let sum=0;
      for(let i=0;i<limit;i+=stride){
        const d=(buffer[i]-mean)-(buffer[i+tau]-mean);
        sum+=d*d;
      }
      yin[tau]=sum;
    }
    let running=0;
    yin[0]=1;
    for(let tau=1;tau<=maxTau;tau++){
      running+=yin[tau];
      yin[tau]=running?yin[tau]*tau/running:1;
    }

    const threshold=key==="bass"?.145:.105;
    let tauEstimate=-1;
    for(let tau=minTau;tau<maxTau;tau++){
      if(yin[tau]<threshold){
        while(tau+1<maxTau && yin[tau+1]<yin[tau]) tau++;
        tauEstimate=tau;
        break;
      }
    }
    if(tauEstimate<0){
      let best=Infinity;
      for(let tau=minTau;tau<=maxTau;tau++){
        if(yin[tau]<best){ best=yin[tau]; tauEstimate=tau; }
      }
      if(best>(key==="bass"?.25:.215)) return null;
    }

    const x0=tauEstimate>1?tauEstimate-1:tauEstimate;
    const x2=tauEstimate+1<=maxTau?tauEstimate+1:tauEstimate;
    const s0=yin[x0],s1=yin[tauEstimate],s2=yin[x2];
    const denom=2*(2*s1-s2-s0);
    let betterTau=tauEstimate;
    if(Math.abs(denom)>1e-9) betterTau+=(s2-s0)/denom;
    const frequency=sampleRate/betterTau;
    if(!Number.isFinite(frequency)||frequency<minFreq*.82||frequency>maxFreq*1.18) return null;
    return {frequency,quality:Math.max(0,Math.min(1,1-s1)),rms};
  }

  function resolveKnownStringHarmonic(frequency,cfg){
    const direct=nearestKnown(frequency,cfg.freqs);
    if(direct.distance<=78) return frequency;
    let bestFreq=frequency;
    let bestDistance=direct.distance;
    for(let divisor=2;divisor<=4;divisor++){
      const candidate=frequency/divisor;
      if(candidate<cfg.minFreq*.88 || candidate>cfg.maxFreq*1.08) continue;
      const match=nearestKnown(candidate,cfg.freqs);
      if(match.distance<=44 && match.distance+55<bestDistance){
        bestDistance=match.distance;
        bestFreq=candidate;
      }
    }
    return bestFreq;
  }

  function nearestKnown(frequency,freqs){
    let index=0,distance=Infinity;
    freqs.forEach((target,i)=>{
      const d=Math.abs(1200*Math.log2(frequency/target));
      if(d<distance){ distance=d; index=i; }
    });
    return {index,distance};
  }

  function updatePrecisionView(frequency,quality,cfg,key){
    const autoMode=document.querySelector(".ml-switch")?.getAttribute("aria-checked")!=="false";
    let targetIndex=Math.max(0,Math.min(selectedIndex,cfg.freqs.length-1));
    if(autoMode){
      const candidate=nearestKnown(frequency,cfg.freqs);
      if(trackedIndex===candidate.index) trackedVotes++;
      else{ trackedIndex=candidate.index; trackedVotes=1; }
      const currentDistance=Math.abs(1200*Math.log2(frequency/cfg.freqs[targetIndex]));
      if(candidate.index===targetIndex || trackedVotes>=2 || (candidate.distance<150 && currentDistance>330)){
        targetIndex=candidate.index;
        selectedIndex=candidate.index;
      }
    }

    const targetFreq=cfg.freqs[targetIndex];
    const rawCents=1200*Math.log2(frequency/targetFreq);
    if(!Number.isFinite(rawCents)) return;

    if(lastView && lastView.targetIndex!==targetIndex) resetFilterOnly();
    let filtered=adaptiveFilter(rawCents,quality);
    const abs=Math.abs(filtered);
    if(!inTuneLatched && abs<=2.0) inTuneLatched=true;
    else if(inTuneLatched && abs>3.5) inTuneLatched=false;

    const displayCents=Math.max(-50,Math.min(50,filtered));
    const noteInfo=noteInfoFor(key,targetIndex);
    lastView={targetIndex,cents:filtered,displayCents,inTune:inTuneLatched,noteInfo};
    renderLastView();
  }

  function adaptiveFilter(rawCents,quality){
    const now=performance.now();
    if(filteredCents===null || !Number.isFinite(filteredCents)){
      filteredCents=rawCents;
      lastRawCents=rawCents;
      return filteredCents;
    }

    const delta=Math.abs(rawCents-filteredCents);
    const descending=lastRawCents!==null && rawCents<lastRawCents-2.8;
    const ascending=lastRawCents!==null && rawCents>lastRawCents+2.8;
    let alpha;
    if(delta>=7){
      alpha=.90;
      fastUntil=now+170;
    }else if(now<fastUntil){
      alpha=.82;
    }else if(Math.abs(rawCents)<=10){
      alpha=.36;
    }else if(Math.abs(rawCents)<=20){
      alpha=.56;
    }else{
      alpha=.72;
    }
    if(descending && delta>=3.5) alpha=Math.max(alpha,.90);
    else if(ascending && delta>=4.5) alpha=Math.max(alpha,.78);
    if(quality<.72 && delta<16) alpha*=.72;

    filteredCents+=(rawCents-filteredCents)*Math.max(.22,Math.min(.94,alpha));
    lastRawCents=rawCents;
    return filteredCents;
  }

  function noteInfoFor(key,index){
    const table={
      guitar:[{short:"E",note:"E2",string:"6th"},{short:"A",note:"A2",string:"5th"},{short:"D",note:"D3",string:"4th"},{short:"G",note:"G3",string:"3rd"},{short:"B",note:"B3",string:"2nd"},{short:"E",note:"E4",string:"1st"}],
      bass:[{short:"E",note:"E1",string:"4th"},{short:"A",note:"A1",string:"3rd"},{short:"D",note:"D2",string:"2nd"},{short:"G",note:"G2",string:"1st"}],
      ukulele:[{short:"G",note:"G4",string:"4th"},{short:"C",note:"C4",string:"3rd"},{short:"E",note:"E4",string:"2nd"},{short:"A",note:"A4",string:"1st"}]
    };
    return (table[key]||table.guitar)[index]||(table[key]||table.guitar)[0];
  }

  function renderLastView(){
    if(!engineOpen) return;
    const noteEl=document.querySelector(".ml-note");
    const detailEl=document.querySelector(".ml-note-detail");
    const centsEl=document.querySelector(".ml-cents");
    const needle=document.querySelector(".ml-needle");
    const message=document.querySelector(".ml-tuner-message");
    const status=document.querySelector(".ml-tuner-status");
    const statusDot=document.querySelector(".ml-status-dot");
    const statusTitle=document.querySelector(".ml-status-copy strong");
    const statusCopy=document.querySelector(".ml-status-copy span");
    if(!noteEl||!detailEl||!centsEl||!needle||!message) return;

    if(!lastView){
      if(performance.now()-lastPitchAt>230){
        statusTitle && (statusTitle.textContent="Listening…");
        statusCopy && (statusCopy.textContent="Play one clear string.");
        status?.classList.remove("is-good");
        if(statusDot) statusDot.textContent="•";
      }
      return;
    }

    const v=lastView;
    const rounded=Math.round(v.displayCents);
    noteEl.textContent=v.noteInfo.short;
    detailEl.textContent=`${v.noteInfo.note} · ${v.noteInfo.string} string`;
    centsEl.textContent=`${rounded>0?"+":""}${rounded} cents`;
    needle.style.left=`${50+v.displayCents*.82}%`;
    needle.classList.toggle("in-tune",v.inTune);
    highlightString(v.targetIndex);
    if(v.inTune){
      message.textContent="In tune";
      statusTitle && (statusTitle.textContent="In tune!");
      statusCopy && (statusCopy.textContent=`${v.noteInfo.note} is centered.`);
      status?.classList.add("is-good");
      if(statusDot) statusDot.textContent="✓";
    }else if(v.cents<0){
      message.textContent="Tune up ↑";
      statusTitle && (statusTitle.textContent="A little flat");
      statusCopy && (statusCopy.textContent=`${v.noteInfo.note}: raise the pitch.`);
      status?.classList.remove("is-good");
      if(statusDot) statusDot.textContent="•";
    }else{
      message.textContent="Tune down ↓";
      statusTitle && (statusTitle.textContent="A little sharp");
      statusCopy && (statusCopy.textContent=`${v.noteInfo.note}: lower the pitch.`);
      status?.classList.remove("is-good");
      if(statusDot) statusDot.textContent="•";
    }
  }

  function highlightString(index){
    [...document.querySelectorAll(".ml-string-btn")].forEach((button,i)=>button.classList.toggle("is-selected",i===index));
  }

  function currentInstrumentKey(){
    const value=document.querySelector(".ml-tuner-select")?.value;
    return CONFIG[value]?value:"guitar";
  }

  function syncSelectedIndex(){
    const buttons=[...document.querySelectorAll(".ml-string-btn")];
    const current=buttons.findIndex(button=>button.classList.contains("is-selected"));
    if(current>=0){ selectedIndex=current; trackedIndex=current; trackedVotes=0; }
  }

  function resetFilterOnly(){
    filteredCents=null;
    lastRawCents=null;
    fastUntil=0;
    inTuneLatched=false;
    lastView=null;
  }

  function resetEngineTracking(){
    selectedIndex=0;
    trackedIndex=null;
    trackedVotes=0;
    lastPitchAt=0;
    resetFilterOnly();
  }

  function handleReference(event){
    const button=event.target.closest?.(".ml-string-btn");
    if(!button) return;
    if(event.type==="pointerdown"){
      getContext().resume?.().catch(()=>{});
      return;
    }
    if(button.dataset.realCuePlayed==="1"){
      button.dataset.realCuePlayed="0";
      return;
    }
    button.dataset.realCuePlayed="1";
    queueMicrotask(()=>{button.dataset.realCuePlayed="0";});

    const select=document.querySelector(".ml-tuner-select");
    const key=CONFIG[select?.value]?select.value:"guitar";
    const buttons=[...document.querySelectorAll(".ml-string-btn")];
    const index=buttons.indexOf(button);
    const cfg=CONFIG[key];
    const midi=cfg.midis[index];
    if(!Number.isFinite(midi)) return;

    suppressLegacyOscillatorForThisClick();
    playPluckedMidi(midi,cfg.style);
  }

  function getContext(){
    if(!referenceCtx || referenceCtx.state==="closed") referenceCtx=new AudioCtx({latencyHint:"interactive"});
    return referenceCtx;
  }

  function playPluckedMidi(midi,style){
    const ctx=getContext();
    const start=()=>{
      const now=ctx.currentTime;
      const frequency=440*Math.pow(2,(midi-69)/12);
      const p=PARAMS[style]||PARAMS.acoustic;
      const burstLength=Math.max(.02,Math.min(.08,4/frequency));
      const frameCount=Math.max(64,Math.floor(ctx.sampleRate*burstLength));
      const buffer=ctx.createBuffer(1,frameCount,ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);

      const source=ctx.createBufferSource();
      source.buffer=buffer;
      const delay=ctx.createDelay(1);
      delay.delayTime.setValueAtTime(1/Math.max(35,frequency),now);
      const feedback=ctx.createGain();
      feedback.gain.setValueAtTime(p.feedback,now);
      const tone=ctx.createBiquadFilter();
      tone.type="lowpass";
      tone.frequency.setValueAtTime(p.cutoff,now);
      tone.Q.setValueAtTime(p.q,now);
      const body=ctx.createBiquadFilter();
      body.type="peaking";
      body.frequency.setValueAtTime(p.body,now);
      body.Q.setValueAtTime(.75,now);
      body.gain.setValueAtTime(p.bodyGain,now);
      const gain=ctx.createGain();
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(p.gain,now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,now+p.decay);

      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(tone);
      tone.connect(body);
      body.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now+burstLength+.01);

      window.setTimeout(()=>{
        for(const node of [source,delay,feedback,tone,body,gain]){try{node.disconnect();}catch(_){}}
      },Math.ceil((p.decay+.55)*1000));
    };
    if(ctx.state==="suspended") ctx.resume().then(start).catch(()=>{}); else start();
  }

  function suppressLegacyOscillatorForThisClick(){
    const protos=[];
    const constructors=[window.AudioContext,window.webkitAudioContext].filter(Boolean);
    for(const Ctor of constructors){
      const proto=Ctor.prototype;
      if(!proto || protos.some(x=>x.proto===proto)) continue;
      const original=proto.createOscillator;
      if(typeof original!=="function") continue;
      const silent=function(){
        const osc=original.call(this);
        try{
          const silentGain=this.createGain();
          silentGain.gain.value=0;
          const realConnect=osc.connect.bind(osc);
          osc.connect=function(){return realConnect(silentGain);};
          silentGain.connect(this.destination);
        }catch(_){ }
        return osc;
      };
      try{proto.createOscillator=silent;protos.push({proto,original});}catch(_){ }
    }
    setTimeout(()=>{
      for(const item of protos){try{item.proto.createOscillator=item.original;}catch(_){}}
    },0);
  }
})();
