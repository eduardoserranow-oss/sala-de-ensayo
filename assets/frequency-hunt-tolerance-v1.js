(function(){
  "use strict";

  // Frequency Hunt should grade the listener's ear, not pixel-perfect finger placement.
  // Round 2: widen the accepted logarithmic window by roughly 65% over the
  // previous tolerance while preserving the progressive Stage 1 -> Stage 5 curve.
  const ERROR_FACTORS=[0.38,0.39,0.40,0.42,0.44];
  const MIN_HZ=40;
  const MAX_HZ=16000;
  const nativeAddEventListener=EventTarget.prototype.addEventListener;
  let confirmListenerWrapped=false;

  installVisualToleranceCue();
  loadLowEndHunt();
  loadCompressionMatch();

  EventTarget.prototype.addEventListener=function(type,listener,options){
    const isFrequencyConfirm=
      !confirmListenerWrapped &&
      type==="click" &&
      typeof listener==="function" &&
      this instanceof Element &&
      this.matches?.("[data-fh-confirm]");

    if(!isFrequencyConfirm){
      return nativeAddEventListener.call(this,type,listener,options);
    }

    confirmListenerWrapped=true;
    const wrapped=function(event){
      const stage=getStage();
      const factor=ERROR_FACTORS[stage-1]||ERROR_FACTORS[0];
      const actualCents=readActualCentsFromMarkers();
      const originalLog2=Math.log2;

      // The original game evaluates in cents/log-frequency. Scaling only the
      // grading error expands the accepted zone without changing the audio,
      // target frequency, score flow, lives or interaction mechanics.
      Math.log2=function(value){
        return originalLog2(value)*factor;
      };

      try{
        return listener.call(this,event);
      }finally{
        Math.log2=originalLog2;
        queueMicrotask(()=>restoreTrueDistanceLabel(actualCents));
      }
    };

    // Intercept only Frequency Hunt's confirm listener, then restore the native
    // browser method immediately for the rest of FORTISSIMO.
    EventTarget.prototype.addEventListener=nativeAddEventListener;
    return nativeAddEventListener.call(this,type,wrapped,options);
  };

  function getStage(){
    const text=document.querySelector("[data-fh-stage]")?.textContent||"1";
    const number=parseInt(text,10)||1;
    return Math.max(1,Math.min(5,number));
  }

  function readActualCentsFromMarkers(){
    const guess=document.querySelector("[data-fh-guess-line]");
    const target=document.querySelector("[data-fh-target-line]");
    const guessPercent=parseFloat(guess?.style.left||"");
    const targetPercent=parseFloat(target?.style.left||"");
    if(!Number.isFinite(guessPercent)||!Number.isFinite(targetPercent)) return null;
    const octaveSpan=Math.log2(MAX_HZ/MIN_HZ);
    return Math.round(Math.abs(guessPercent-targetPercent)/100*octaveSpan*1200);
  }

  function restoreTrueDistanceLabel(cents){
    if(!Number.isFinite(cents)) return;
    const spans=document.querySelectorAll(".sg-fhpro-feedback-copy span");
    spans.forEach(span=>{
      if(/^Distancia auditiva:/i.test(span.textContent||"")){
        span.textContent=`Distancia auditiva: ${cents} cents`;
      }
    });
  }

  function installVisualToleranceCue(){
    const style=document.createElement("style");
    style.id="frequencyHuntToleranceV2";
    style.textContent=`
      .sg-fhpro-band{
        transform:scaleX(2.45);
        transform-origin:center center;
      }
      .sg-fhpro-trainer.is-reveal .sg-fhpro-band{
        opacity:.68;
      }
    `;
    document.head.appendChild(style);
  }

  function loadLowEndHunt(){
    if(!document.querySelector('link[data-low-end-hunt-style]')){
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href="assets/sound-gym-level3-phase4.css?v=sg-leh1";
      link.dataset.lowEndHuntStyle="1";
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-low-end-hunt-script]')){
      const script=document.createElement("script");
      script.src="assets/sound-gym-level3-phase4.js?v=sg-leh1";
      script.defer=true;
      script.dataset.lowEndHuntScript="1";
      document.head.appendChild(script);
    }
  }

  function loadCompressionMatch(){
    if(!document.querySelector('link[data-compression-match-style]')){
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href="assets/sound-gym-level3-phase5.css?v=sg-cm2";
      link.dataset.compressionMatchStyle="1";
      document.head.appendChild(link);
    }
    const loadApp=()=>{
      if(document.querySelector('script[data-compression-match-app]')) return;
      const app=document.createElement("script");
      app.src="assets/sound-gym-level3-phase5.js?v=sg-cm2";
      app.dataset.compressionMatchApp="1";
      document.head.appendChild(app);
    };
    if(window.FortissimoCompressionCore){loadApp();return;}
    if(document.querySelector('script[data-compression-match-core]')) return;
    const core=document.createElement("script");
    core.src="assets/sound-gym-level3-phase5-core.js?v=sg-cm2";
    core.dataset.compressionMatchCore="1";
    core.addEventListener("load",loadApp,{once:true});
    document.head.appendChild(core);
  }
})();

// SoundGym full audio-library bridge. Legacy game pools keep their game logic,
// but draw from the complete normal library instead of the original fixed IDs.
(function(){
  "use strict";

  const nativeFetch=window.fetch.bind(window);
  const nativeMap=Array.prototype.map;
  const MANIFEST_RE=/(?:^|\/)assets\/sound-gym-audio\/manifest\.json(?:[?#].*)?$/;
  let fullManifest=null;

  function isClip(value){
    return !!value && typeof value==="object" && typeof value.id==="string" && typeof value.file==="string";
  }

  function classifyPool(value){
    if(!Array.isArray(value) || !value.length || !value.every(item=>typeof item==="string")) return "";

    // Compression Match: all available drum sources.
    if(value.length>=3 && value.every(id=>id.startsWith("drums-"))) return "drums";

    // Low End Hunt: bass, drums, percussion and full mixes only.
    if(value.includes("bass-808-banking") && value.includes("drums-full-100") && value.includes("mix-final-5") && !value.includes("guitar-clean")){
      return "low-end";
    }

    // Main SoundGym pools used by A/B, EQ, panning, compression and frequency games.
    if(value.length>=8 && value.includes("drums-full-100") && value.includes("guitar-clean")){
      return value.includes("mix-final-5") || value.includes("mix-final-4") ? "all" : "non-mix";
    }
    return "";
  }

  function clipsForPool(kind){
    const clips=fullManifest?.clips||[];
    if(kind==="drums") return clips.filter(clip=>clip.category==="drums");
    if(kind==="low-end") return clips.filter(clip=>["bass","drums","percussion","full_mix"].includes(clip.category));
    if(kind==="non-mix") return clips.filter(clip=>clip.category!=="full_mix");
    return clips;
  }

  function publishManifest(data){
    if(!data || !Array.isArray(data.clips) || !data.clips.length) return;
    fullManifest=data;
    window.SoundGymAudioLibrary={
      version:"50-clips-v2",
      manifest:data,
      getClips(){return data.clips.slice();},
      getByCategories(categories){
        const wanted=new Set(categories||[]);
        return data.clips.filter(clip=>wanted.has(clip.category));
      }
    };
  }

  window.fetch=async function(input,init){
    const url=typeof input==="string"?input:(input?.url||"");
    const isManifest=MANIFEST_RE.test(url);
    const options=isManifest?Object.assign({},init||{},{cache:"no-store"}):init;
    const response=await nativeFetch(input,options);
    if(!isManifest) return response;

    const nativeJson=response.json.bind(response);
    response.json=async function(){
      const data=await nativeJson();
      publishManifest(data);
      return data;
    };
    return response;
  };

  Array.prototype.map=function(callback,thisArg){
    const mapped=nativeMap.call(this,callback,thisArg);
    try{
      if(!fullManifest) return mapped;
      const kind=classifyPool(this);
      if(!kind) return mapped;
      const mappedClips=mapped.filter(isClip);
      if(!mappedClips.length || mappedClips.length!==mapped.filter(Boolean).length) return mapped;
      return clipsForPool(kind).slice();
    }catch(_){
      return mapped;
    }
  };
})();
