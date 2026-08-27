(function(){
  "use strict";
  if(window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__) return;
  window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__=true;

  const script=document.createElement("script");
  script.src="assets/home-tuner-engine-v3.js?v=tuner-engine3";
  script.async=false;
  script.dataset.fortissimoTunerEngine="v3";
  script.onload=function(){
    let taps=0;
    let timer=0;
    document.addEventListener("click",event=>{
      if(!event.target.closest?.(".ml-tuner-title")) return;
      clearTimeout(timer);
      taps++;
      timer=setTimeout(()=>{taps=0;},1300);
      if(taps<5) return;
      taps=0;
      let enabled=false;
      try{enabled=localStorage.getItem("fortissimo.tuner.debug.v3")==="1";}catch(_){ }
      window.FortissimoTunerV3?.setDebug?.(!enabled);
    },true);
  };
  document.head.appendChild(script);
})();
