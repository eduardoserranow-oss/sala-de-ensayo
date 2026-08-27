(function(){
  "use strict";
  if(window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__) return;
  window.__FORTISSIMO_TUNER_ENGINE_LOADER_V3__=true;

  const script=document.createElement("script");
  script.src="assets/home-tuner-engine-v3.js?v=tuner-engine3";
  script.async=false;
  script.dataset.fortissimoTunerEngine="v3";
  script.onload=function(){
    const guitarBase="https://raw.githubusercontent.com/sfzinstruments/Discord-SFZ-GM-Bank/master/Discord%20GM/Melodic/026-Acoustic%20Guitar%20(steel)/";
    const bassBase="https://raw.githubusercontent.com/cluesurf/wavebase/make/base/bass/";

    // Frequencies below were measured from the exact WAV files supplied for FORTISSIMO.
    // Engine V3 compensates playbackRate against the mathematical A4=440 target,
    // so the audible reference lands on the exact open-string pitch rather than
    // assuming the source sample itself was perfectly tuned.
    window.FortissimoTunerV3?.registerReferenceSamples?.({
      guitar:[
        {url:guitarBase+"MartinGM2_040__E2_1.wav",measuredFrequency:81.83108456,gain:.72},
        {url:guitarBase+"MartinGM2_046_Bb2_1.wav",measuredFrequency:115.97201010,gain:.72},
        {url:guitarBase+"MartinGM2_049_Db3_1.wav",measuredFrequency:137.71873724,gain:.72},
        {url:guitarBase+"MartinGM2_055__G3_1.wav",measuredFrequency:195.20261434,gain:.72},
        {url:guitarBase+"MartinGM2_058_Bb3_1.wav",measuredFrequency:231.46597623,gain:.72},
        {url:guitarBase+"MartinGM2_064__E4_1.wav",measuredFrequency:326.91132905,gain:.72}
      ],
      bass:[
        {url:bassBase+"string-4-E-as-E1.wav",measuredFrequency:41.65126643,gain:.62},
        {url:bassBase+"string-3-A-as-A1.wav",measuredFrequency:54.52168464,gain:.62},
        {url:bassBase+"string-2-D-as-D2.wav",measuredFrequency:73.11708213,gain:.62},
        {url:bassBase+"string-1-G-as-G2.wav",measuredFrequency:98.16961570,gain:.62}
      ]
    });

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
