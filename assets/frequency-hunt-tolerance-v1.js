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
// but draw from the complete normal library instead of the original 12–15 IDs.
(function(){
  "use strict";

  const nativeFetch=window.fetch.bind(window);
  const nativeMap=Array.prototype.map;
  const MANIFEST_RE=/(?:^|\/)assets\/sound-gym-audio\/manifest\.json(?:[?#].*)?$/;
  let fullManifest=null;

  function isClip(value){
    return !!value && typeof value==="object" && typeof value.id==="string" && typeof value.file==="string";
  }

  function isLegacySoundGymPool(value){
    return Array.isArray(value) &&
      value.length>=8 &&
      value.every(item=>typeof item==="string") &&
      value.includes("drums-full-100") &&
      value.includes("guitar-clean");
  }

  function publishManifest(data){
    if(!data || !Array.isArray(data.clips) || !data.clips.length) return;
    fullManifest=data;
    window.SoundGymAudioLibrary={
      version:"50-clips-v1",
      manifest:data,
      getClips(){return data.clips.slice();},
      getNonMixClips(){return data.clips.filter(clip=>clip.category!=="full_mix");}
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
      if(!fullManifest || !isLegacySoundGymPool(this)) return mapped;
      const mappedClips=mapped.filter(isClip);
      if(!mappedClips.length || mappedClips.length!==mapped.filter(Boolean).length) return mapped;

      // Clean/Distorted historically excluded mastered full mixes; keep that
      // distinction while still adding every new drum, bass, guitar, key,
      // vocal, percussion and brass source. Other legacy pools use all 50.
      const includesFullMix=this.includes("mix-final-5") || this.includes("mix-final-4");
      return (includesFullMix
        ? fullManifest.clips
        : fullManifest.clips.filter(clip=>clip.category!=="full_mix")
      ).slice();
    }catch(_){
      return mapped;
    }
  };
})();
