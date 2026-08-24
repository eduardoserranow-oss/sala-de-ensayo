(function(){
  "use strict";
  if(window.__MY_LESSONS_TUNER_AUDIO_FIX__) return;
  window.__MY_LESSONS_TUNER_AUDIO_FIX__=true;

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;

  let referenceCtx=null;
  const CONFIG={
    guitar:{style:"acoustic",midis:[40,45,50,55,59,64]},
    bass:{style:"bass1",midis:[28,33,38,43]},
    ukulele:{style:"bright",midis:[67,60,64,69]}
  };

  const PARAMS={
    acoustic:{feedback:.935,cutoff:3800,q:.5,body:210,bodyGain:3,gain:.18,decay:1.25},
    bass1:{feedback:.965,cutoff:1450,q:.7,body:105,bodyGain:5,gain:.24,decay:1.6},
    bright:{feedback:.93,cutoff:5000,q:.55,body:450,bodyGain:2,gain:.15,decay:1}
  };

  document.addEventListener("pointerdown",handleReference,{capture:true});
  document.addEventListener("click",handleReference,{capture:true});

  function handleReference(event){
    const button=event.target.closest?.(".ml-string-btn");
    if(!button) return;
    if(event.type==="pointerdown"){
      // iOS unlock: create/resume the audio context directly from the gesture.
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
    // home-tuner v4 still calls its old oscillator cue synchronously.
    // Replace createOscillator only until that click finishes so we keep its
    // AUTO/reference-gate state changes without hearing the synthetic tone.
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
