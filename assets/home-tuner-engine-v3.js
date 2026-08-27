(function(){
  "use strict";
  if(window.__FORTISSIMO_TUNER_ENGINE_V3__) return;
  window.__FORTISSIMO_TUNER_ENGINE_V3__=true;

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx || !navigator.mediaDevices?.getUserMedia) return;

  const A4=440;
  const NOTE_NAMES=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
  const hz=midi=>A4*Math.pow(2,(midi-69)/12);
  const makeStrings=(midis,names)=>midis.map((midi,index)=>({midi,freq:hz(midi),...names[index]}));
  const CONFIG={
    guitar:{minFreq:68,maxFreq:720,windowSize:4096,hopSize:1536,decimation:2,threshold:.115,rmsGate:.0032,strings:makeStrings([40,45,50,55,59,64],[
      {short:"E",note:"E2",string:"6th"},{short:"A",note:"A2",string:"5th"},{short:"D",note:"D3",string:"4th"},{short:"G",note:"G3",string:"3rd"},{short:"B",note:"B3",string:"2nd"},{short:"E",note:"E4",string:"1st"}
    ])},
    bass:{minFreq:32,maxFreq:300,windowSize:8192,hopSize:2048,decimation:4,threshold:.145,rmsGate:.0038,strings:makeStrings([28,33,38,43],[
      {short:"E",note:"E1",string:"4th"},{short:"A",note:"A1",string:"3rd"},{short:"D",note:"D2",string:"2nd"},{short:"G",note:"G2",string:"1st"}
    ])},
    ukulele:{minFreq:220,maxFreq:760,windowSize:4096,hopSize:1536,decimation:2,threshold:.105,rmsGate:.0030,strings:makeStrings([67,60,64,69],[
      {short:"G",note:"G4",string:"4th"},{short:"C",note:"C4",string:"3rd"},{short:"E",note:"E4",string:"2nd"},{short:"A",note:"A4",string:"1st"}
    ])}
  };

  const originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  let engineOpen=false;
  let capturedStream=null;
  let legacyClone=null;
  let ctx=null;
  let source=null;
  let node=null;
  let mute=null;
  let starting=null;
  let instrumentKey=currentInstrumentKey();
  let selectedIndex=0;
  let trackedIndex=null;
  let trackedVotes=0;
  let filteredCents=null;
  let lastRawCents=null;
  let lastPitchAt=0;
  let noteStartedAt=0;
  let gateUntil=0;
  let inTune=false;
  let stable=[];
  let lastView=null;
  let lastMeasurement=null;
  let selfTestResult=null;
  let debugEnabled=readDebugPreference();
  let referenceCtx=null;
  let sampleBank={};
  const decodedSamples=new Map();

  installStyles();
  installCaptureBridge();
  installLifecycle();
  installInteractionHooks();
  installLegacyDomGuard();
  exposeAPI();

  function installStyles(){
    if(document.getElementById("fortissimoTunerV3Styles")) return;
    const style=document.createElement("style");
    style.id="fortissimoTunerV3Styles";
    style.textContent=`
      .ml-needle{transition:left .026s linear,border-color .10s ease,box-shadow .10s ease!important;will-change:left}
      .ml-cents{font-variant-numeric:tabular-nums}
      .ml-tuner-diagnostic{display:none;margin:-10px 20px 18px;padding:10px 12px;border:1px solid rgba(0,205,255,.24);border-radius:12px;background:rgba(0,205,255,.055);color:rgba(210,245,255,.78);font:700 10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.01em;white-space:pre-wrap}
      .ml-tuner-diagnostic.is-visible{display:block}
    `;
    document.head.appendChild(style);
  }

  function installCaptureBridge(){
    if(navigator.mediaDevices.__fortissimoTunerV3Wrapped) return;
    const wrapped=async function(constraints){
      if(!constraints?.audio || !document.querySelector(".ml-tuner-backdrop")) return originalGetUserMedia(constraints);
      const stream=await originalGetUserMedia(constraints);
      capturedStream=stream;
      const started=await startEngine(stream).catch(()=>false);
      if(!started){
        capturedStream=null;
        return stream;
      }
      try{
        legacyClone=stream.clone();
        legacyClone.getAudioTracks().forEach(track=>{ track.enabled=false; });
        return legacyClone;
      }catch(_){
        return stream;
      }
    };
    try{
      navigator.mediaDevices.getUserMedia=wrapped;
      navigator.mediaDevices.__fortissimoTunerV3Wrapped=true;
    }catch(_){ }
  }

  function installLifecycle(){
    const watch=()=>{
      const backdrop=document.querySelector(".ml-tuner-backdrop");
      if(!backdrop){ requestAnimationFrame(watch); return; }
      const sync=()=>{
        const open=backdrop.classList.contains("is-open");
        if(open&&!engineOpen){
          engineOpen=true;
          instrumentKey=currentInstrumentKey();
          syncSelectedIndex();
          resetTracking(true);
          ensureDiagnostic();
        }else if(!open&&engineOpen){
          engineOpen=false;
          stopEngine();
        }
      };
      new MutationObserver(sync).observe(backdrop,{attributes:true,attributeFilter:["class"]});
      sync();
    };
    watch();
  }

  function installInteractionHooks(){
    document.addEventListener("pointerdown",event=>{
      const button=event.target.closest?.(".ml-string-btn");
      if(button) getReferenceContext()?.resume?.().catch(()=>{});
    },true);

    document.addEventListener("click",event=>{
      const button=event.target.closest?.(".ml-string-btn");
      if(button){
        const buttons=[...document.querySelectorAll(".ml-string-btn")];
        const index=buttons.indexOf(button);
        if(index>=0){
          selectedIndex=index;
          trackedIndex=index;
          trackedVotes=0;
          gateUntil=performance.now()+1050;
          resetTracking(false);
          const sample=getRegisteredSample(instrumentKey,index);
          if(sample){
            event.preventDefault();
            event.stopImmediatePropagation();
            highlightString(index);
            playRegisteredSample(sample,CONFIG[instrumentKey].strings[index]).catch(()=>{});
          }
        }
        return;
      }
      if(event.target.closest?.(".ml-switch")) queueMicrotask(()=>resetTracking(true));
    },true);

    document.addEventListener("change",event=>{
      if(!event.target.matches?.(".ml-tuner-select")) return;
      instrumentKey=currentInstrumentKey();
      selectedIndex=0;
      trackedIndex=null;
      trackedVotes=0;
      resetTracking(true);
      sendConfig();
    },true);
  }

  function installLegacyDomGuard(){
    const watch=()=>{
      const modal=document.querySelector(".ml-tuner-modal");
      if(!modal){ requestAnimationFrame(watch); return; }
      const observer=new MutationObserver(()=>{
        if(!engineOpen||!lastView) return;
        queueMicrotask(()=>render(lastView));
      });
      observer.observe(modal,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","style"]});
    };
    watch();
  }

  async function startEngine(stream){
    if(!stream) return false;
    if(starting) return starting;
    starting=(async()=>{
      stopAudioGraph(false);
      try{
        ctx=new AudioCtx({latencyHint:"interactive"});
        if(!ctx.audioWorklet?.addModule) throw new Error("AudioWorklet unavailable");
        if(ctx.state==="suspended") await ctx.resume();
        await ctx.audioWorklet.addModule("assets/tuner-pitch-worklet-v3.js?v=tuner-worklet3");
        source=ctx.createMediaStreamSource(stream);
        node=new AudioWorkletNode(ctx,"fortissimo-tuner-pitch-v3",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
        mute=ctx.createGain();
        mute.gain.value=0;
        source.connect(node);
        node.connect(mute);
        mute.connect(ctx.destination);
        node.port.onmessage=handleWorkletMessage;
        sendConfig();
        node.port.postMessage({type:"self-test",id:"startup"});
        return true;
      }catch(error){
        console.warn("FORTISSIMO Tuner V3 fallback:",error);
        stopAudioGraph(false);
        return false;
      }
    })();
    const result=await starting;
    starting=null;
    return result;
  }

  function stopEngine(){
    stopAudioGraph(true);
    try{ legacyClone?.getTracks().forEach(track=>track.stop()); }catch(_){ }
    legacyClone=null;
    try{ capturedStream?.getTracks().forEach(track=>track.stop()); }catch(_){ }
    capturedStream=null;
    resetTracking(true);
  }

  function stopAudioGraph(closeContext){
    try{source?.disconnect();}catch(_){ }
    try{node?.disconnect();}catch(_){ }
    try{mute?.disconnect();}catch(_){ }
    source=null; node=null; mute=null;
    if(ctx&&closeContext){
      const closing=ctx;
      ctx=null;
      try{closing.close();}catch(_){ }
    }else if(ctx&&!closeContext){
      const closing=ctx;
      ctx=null;
      try{closing.close();}catch(_){ }
    }
  }

  function sendConfig(){
    if(!node) return;
    instrumentKey=currentInstrumentKey();
    const cfg=CONFIG[instrumentKey]||CONFIG.guitar;
    node.port.postMessage({type:"config",config:{minFreq:cfg.minFreq,maxFreq:cfg.maxFreq,windowSize:cfg.windowSize,hopSize:cfg.hopSize,decimation:cfg.decimation,threshold:cfg.threshold,rmsGate:cfg.rmsGate}});
  }

  function handleWorkletMessage(event){
    const data=event.data||{};
    if(data.type==="self-test-result"){
      selfTestResult=data;
      window.__FORTISSIMO_TUNER_SELF_TEST_V3__=data;
      updateDiagnostic();
      return;
    }
    if(!engineOpen) return;
    if(data.type==="silence"){
      if(performance.now()-lastPitchAt>240){
        lastView=null;
        renderListening();
      }
      return;
    }
    if(data.type!=="pitch" || performance.now()<gateUntil) return;
    if(!Number.isFinite(data.frequency)||data.confidence<.56) return;
    updateFromMeasurement(data);
  }

  function updateFromMeasurement(measurement){
    const now=performance.now();
    if(now-lastPitchAt>190){
      noteStartedAt=now;
      stable=[];
      filteredCents=null;
      lastRawCents=null;
      inTune=false;
    }
    lastPitchAt=now;
    const cfg=CONFIG[instrumentKey]||CONFIG.guitar;
    const autoMode=isAutoMode();
    const targetIndex=autoMode?chooseAutoTarget(measurement.frequency,cfg):Math.max(0,Math.min(selectedIndex,cfg.strings.length-1));
    if(lastView&&lastView.targetIndex!==targetIndex){
      filteredCents=null;
      lastRawCents=null;
      stable=[];
      inTune=false;
    }
    selectedIndex=targetIndex;
    const target=cfg.strings[targetIndex];
    const rawCents=1200*Math.log2(measurement.frequency/target.freq);
    if(!Number.isFinite(rawCents)) return;

    const filtered=filterCents(rawCents,measurement.confidence);
    stable.push({time:now,cents:rawCents,confidence:measurement.confidence});
    stable=stable.filter(item=>now-item.time<=260);
    updateLock(now,filtered);

    const chromatic=chromaticInfo(measurement.frequency);
    lastMeasurement={...measurement,rawCents,filteredCents:filtered,targetIndex,targetFrequency:target.freq,targetNote:target.note,chromatic,time:Date.now()};
    lastView={targetIndex,target,cents:filtered,rawCents,displayCents:Math.max(-50,Math.min(50,filtered)),inTune,frequency:measurement.frequency,confidence:measurement.confidence,chromatic,rms:measurement.rms};
    render(lastView);
  }

  function chooseAutoTarget(frequency,cfg){
    let bestIndex=0;
    let bestDistance=Infinity;
    cfg.strings.forEach((item,index)=>{
      const distance=Math.abs(1200*Math.log2(frequency/item.freq));
      if(distance<bestDistance){ bestDistance=distance; bestIndex=index; }
    });
    if(trackedIndex===bestIndex) trackedVotes++;
    else{ trackedIndex=bestIndex; trackedVotes=1; }

    const current=Math.max(0,Math.min(selectedIndex,cfg.strings.length-1));
    const currentDistance=Math.abs(1200*Math.log2(frequency/cfg.strings[current].freq));
    if(bestIndex===current) return current;
    if(bestDistance+90<currentDistance) return bestIndex;
    if(trackedVotes>=2&&bestDistance+45<currentDistance) return bestIndex;
    return current;
  }

  function filterCents(raw,confidence){
    if(filteredCents===null||!Number.isFinite(filteredCents)){
      filteredCents=raw;
      lastRawCents=raw;
      return raw;
    }
    const delta=Math.abs(raw-filteredCents);
    let alpha;
    if(delta>=7) alpha=.94;
    else if(delta>=3.5) alpha=.82;
    else if(delta>=1.4) alpha=.64;
    else alpha=.42;
    if(confidence<.72&&delta<4) alpha*=.72;
    const directional=lastRawCents!==null?Math.abs(raw-lastRawCents):0;
    if(directional>5) alpha=Math.max(alpha,.90);
    filteredCents+=(raw-filteredCents)*Math.max(.28,Math.min(.96,alpha));
    lastRawCents=raw;
    return filteredCents;
  }

  function updateLock(now,filtered){
    if(stable.length<4){ inTune=false; return; }
    const values=stable.map(item=>item.cents);
    const medianValue=median(values);
    const mad=median(values.map(value=>Math.abs(value-medianValue)));
    const meanConfidence=stable.reduce((sum,item)=>sum+item.confidence,0)/stable.length;
    const sustainAge=now-noteStartedAt;
    if(!inTune){
      if(sustainAge>=170&&Math.abs(medianValue)<=.90&&mad<=.70&&meanConfidence>=.76&&Math.abs(filtered)<=1.15) inTune=true;
    }else if(Math.abs(filtered)>1.8||Math.abs(medianValue)>1.5||mad>1.25||meanConfidence<.62){
      inTune=false;
    }
  }

  function render(view){
    if(!engineOpen||!view) return;
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

    const rounded=Math.round(view.displayCents*10)/10;
    setText(noteEl,view.target.short);
    setText(detailEl,`${view.target.note} · ${view.target.string} string · A4 ${A4} Hz`);
    setText(centsEl,`${rounded>0?"+":""}${rounded.toFixed(1)} cents`);
    setStyle(needle,"left",`${50+view.displayCents*.82}%`);
    toggleClass(needle,"in-tune",view.inTune);
    highlightString(view.targetIndex);

    if(view.inTune){
      setText(message,"In tune");
      setText(statusTitle,"In tune!");
      setText(statusCopy,`${view.target.note} · ${view.frequency.toFixed(2)} Hz · stable`);
      toggleClass(status,"is-good",true);
      setText(statusDot,"✓");
    }else if(view.cents<0){
      setText(message,"Tune up ↑");
      setText(statusTitle,"A little flat");
      setText(statusCopy,`${view.target.note}: raise the pitch.`);
      toggleClass(status,"is-good",false);
      setText(statusDot,"•");
    }else{
      setText(message,"Tune down ↓");
      setText(statusTitle,"A little sharp");
      setText(statusCopy,`${view.target.note}: lower the pitch.`);
      toggleClass(status,"is-good",false);
      setText(statusDot,"•");
    }
    updateDiagnostic();
  }

  function renderListening(){
    if(!engineOpen) return;
    const status=document.querySelector(".ml-tuner-status");
    setText(document.querySelector(".ml-status-copy strong"),"Listening…");
    setText(document.querySelector(".ml-status-copy span"),"Play one clear string and let it ring.");
    setText(document.querySelector(".ml-status-dot"),"•");
    toggleClass(status,"is-good",false);
    updateDiagnostic();
  }

  function highlightString(index){
    [...document.querySelectorAll(".ml-string-btn")].forEach((button,i)=>toggleClass(button,"is-selected",i===index));
  }

  function chromaticInfo(frequency){
    const midiFloat=69+12*Math.log2(frequency/A4);
    const midi=Math.round(midiFloat);
    const cents=(midiFloat-midi)*100;
    const noteName=NOTE_NAMES[((midi%12)+12)%12];
    const octave=Math.floor(midi/12)-1;
    return {midiFloat,midi,cents,note:`${noteName}${octave}`,frequency:hz(midi)};
  }

  function resetTracking(hard){
    filteredCents=null;
    lastRawCents=null;
    stable=[];
    inTune=false;
    lastView=null;
    lastMeasurement=null;
    lastPitchAt=0;
    noteStartedAt=0;
    if(hard){ trackedIndex=null; trackedVotes=0; }
    node?.port.postMessage({type:"reset"});
  }

  function syncSelectedIndex(){
    const buttons=[...document.querySelectorAll(".ml-string-btn")];
    const active=buttons.findIndex(button=>button.classList.contains("is-selected"));
    selectedIndex=active>=0?active:0;
  }

  function currentInstrumentKey(){
    const value=document.querySelector(".ml-tuner-select")?.value||localStorage.getItem("myLessons.tuner.instrument")||"guitar";
    return CONFIG[value]?value:"guitar";
  }

  function isAutoMode(){ return document.querySelector(".ml-switch")?.getAttribute("aria-checked")!=="false"; }

  function median(values){
    if(!values.length) return 0;
    const sorted=[...values].sort((a,b)=>a-b);
    const middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }

  function setText(element,value){ if(element&&element.textContent!==value) element.textContent=value; }
  function setStyle(element,property,value){ if(element&&element.style[property]!==value) element.style[property]=value; }
  function toggleClass(element,name,on){ if(element&&element.classList.contains(name)!==Boolean(on)) element.classList.toggle(name,Boolean(on)); }

  function ensureDiagnostic(){
    const modal=document.querySelector(".ml-tuner-modal");
    if(!modal) return null;
    let diagnostic=modal.querySelector(".ml-tuner-diagnostic");
    if(!diagnostic){
      diagnostic=document.createElement("div");
      diagnostic.className="ml-tuner-diagnostic";
      diagnostic.setAttribute("aria-hidden","true");
      const status=modal.querySelector(".ml-tuner-status");
      status?.insertAdjacentElement("afterend",diagnostic);
    }
    toggleClass(diagnostic,"is-visible",debugEnabled);
    return diagnostic;
  }

  function updateDiagnostic(){
    const diagnostic=ensureDiagnostic();
    if(!diagnostic||!debugEnabled) return;
    const m=lastMeasurement;
    const test=selfTestResult?`${selfTestResult.passed?"PASS":"CHECK"} max ${Number(selfTestResult.maxErrorCents).toFixed(3)}¢`:"pending";
    const text=m
      ? `ENGINE V3 · ${m.frequency.toFixed(3)} Hz · raw ${signed(m.rawCents,2)}¢ · filtered ${signed(m.filteredCents,2)}¢\nchromatic ${m.chromatic.note} ${signed(m.chromatic.cents,2)}¢ · confidence ${(m.confidence*100).toFixed(1)}% · self-test ${test}`
      : `ENGINE V3 · waiting for signal · self-test ${test}`;
    setText(diagnostic,text);
  }

  function signed(value,digits){ return `${value>=0?"+":""}${Number(value).toFixed(digits)}`; }

  function readDebugPreference(){
    try{
      const url=new URL(location.href);
      if(url.searchParams.get("tunerDebug")==="1") return true;
      return localStorage.getItem("fortissimo.tuner.debug.v3")==="1";
    }catch(_){ return false; }
  }

  function exposeAPI(){
    window.FortissimoTunerV3={
      version:"3.0.0",
      getLastMeasurement:()=>lastMeasurement?{...lastMeasurement}:null,
      getSelfTest:()=>selfTestResult,
      runSelfTest(){ node?.port.postMessage({type:"self-test",id:`manual-${Date.now()}`}); },
      setDebug(enabled){
        debugEnabled=Boolean(enabled);
        try{localStorage.setItem("fortissimo.tuner.debug.v3",debugEnabled?"1":"0");}catch(_){ }
        updateDiagnostic();
      },
      registerReferenceSamples(bank){ sampleBank=bank&&typeof bank==="object"?bank:{}; },
      calibrationHz:A4
    };
  }

  function getReferenceContext(){
    if(!referenceCtx||referenceCtx.state==="closed") referenceCtx=new AudioCtx({latencyHint:"interactive"});
    return referenceCtx;
  }

  function getRegisteredSample(key,index){
    const group=sampleBank?.[key];
    if(!group) return null;
    return Array.isArray(group)?group[index]:group[index]||group[String(index)]||null;
  }

  async function playRegisteredSample(entry,target){
    const sample=typeof entry==="string"?{url:entry}:entry;
    if(!sample?.url) return;
    const audioCtx=getReferenceContext();
    if(audioCtx.state==="suspended") await audioCtx.resume();
    let buffer=decodedSamples.get(sample.url);
    if(!buffer){
      const response=await fetch(sample.url,{cache:"force-cache"});
      if(!response.ok) throw new Error(`Sample ${response.status}`);
      buffer=await audioCtx.decodeAudioData(await response.arrayBuffer());
      decodedSamples.set(sample.url,buffer);
    }
    const player=audioCtx.createBufferSource();
    const gain=audioCtx.createGain();
    player.buffer=buffer;
    const measured=Number(sample.measuredFrequency)||target.freq;
    player.playbackRate.value=target.freq/measured;
    gain.gain.value=Math.max(.02,Math.min(1,Number(sample.gain)||.72));
    player.connect(gain); gain.connect(audioCtx.destination);
    gateUntil=performance.now()+Math.min(1800,Math.max(900,buffer.duration*1000));
    player.start();
  }
})();
