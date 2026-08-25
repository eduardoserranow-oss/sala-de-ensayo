(function(){
  "use strict";

  // Frequency Hunt should grade the listener's ear, not pixel-perfect finger placement.
  // These factors widen the accepted logarithmic frequency window while keeping
  // a progressive difficulty curve from Stage 1 to Stage 5.
  const ERROR_FACTORS=[0.62,0.64,0.66,0.69,0.72];
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

      // The original game already evaluates in cents/log-frequency. Scaling the
      // octave error here expands only Frequency Hunt's acceptance window while
      // preserving its existing mechanics, score flow, lives and UI.
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

    // We only need to intercept this one listener. Restore the native method so
    // the rest of the app continues using the browser implementation directly.
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
    style.id="frequencyHuntToleranceV1";
    style.textContent=`
      .sg-fhpro-band{
        transform:scaleX(1.5);
        transform-origin:center center;
      }
      .sg-fhpro-trainer.is-reveal .sg-fhpro-band{
        opacity:.62;
      }
    `;
    document.head.appendChild(style);
  }
})();
