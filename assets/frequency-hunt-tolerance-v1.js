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
})();
