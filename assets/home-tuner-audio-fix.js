(function(){
  "use strict";
  if(window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__) return;
  window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__=true;

  const script=document.createElement("script");
  script.src="assets/home-tuner-engine-v3.js?v=tuner-engine3c";
  script.async=false;
  script.dataset.fortissimoTunerEngine="v3";
  script.onload=function(){
    const guitarBase="https://raw.githubusercontent.com/sfzinstruments/Discord-SFZ-GM-Bank/master/Discord%20GM/Melodic/026-Acoustic%20Guitar%20(steel)/";
    const bassBase="https://media.githubusercontent.com/media/cluesurf/wavebase/make/base/bass/";

    // FORTISSIMO Tuner Reference Bank v1
    // These values were re-measured from the exact user-supplied WAV archives,
    // using the stable sustain region rather than the pick transient.
    // Engine V3 compensates playbackRate against the mathematical A4=440 target.
    const bank={
      guitar:[
        {url:guitarBase+"MartinGM2_040__E2_1.wav",measuredFrequency:81.95421336,gain:.78},
        {url:guitarBase+"MartinGM2_046_Bb2_1.wav",measuredFrequency:116.17833474,gain:.78},
        {url:guitarBase+"MartinGM2_049_Db3_1.wav",measuredFrequency:137.89750221,gain:.78},
        {url:guitarBase+"MartinGM2_055__G3_1.wav",measuredFrequency:195.35596792,gain:.78},
        {url:guitarBase+"MartinGM2_058_Bb3_1.wav",measuredFrequency:231.66184421,gain:.78},
        {url:guitarBase+"MartinGM2_064__E4_1.wav",measuredFrequency:327.20373382,gain:.78}
      ],
      bass:[
        {url:bassBase+"string-4-E-as-E1.wav",measuredFrequency:41.72938974,gain:.68},
        {url:bassBase+"string-3-A-as-A1.wav",measuredFrequency:54.55011094,gain:.68},
        {url:bassBase+"string-2-D-as-D2.wav",measuredFrequency:73.15114147,gain:.68},
        {url:bassBase+"string-1-G-as-G2.wav",measuredFrequency:98.23102717,gain:.68}
      ]
    };

    window.FortissimoTunerV3?.registerReferenceSamples?.(bank);
    window.__FORTISSIMO_TUNER_SAMPLE_AUDIT_V1__={
      version:"1.0.0",
      calibrationHz:440,
      guitar:{source:"Martin HD28 steel-string",license:"CC0",targets:["E2","A2","D3","G3","B3","E4"]},
      bass:{source:"ClueSurf Wavebase electric bass",license:"Public Domain",targets:["E1","A1","D2","G2"],futureExtended:["B0","C3"]},
      note:"Two uploaded Martin ZIPs were byte-for-byte identical; one copy was analyzed."
    };

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
