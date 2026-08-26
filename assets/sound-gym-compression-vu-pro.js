(function(){
  "use strict";

  const C=window.FortissimoCompressionCore;
  if(!C) return;

  const PARAMS={
    ratio:{values:C.RATIOS,label:"Ratio"},
    attack:{values:C.ATTACKS,label:"Attack"},
    release:{values:C.RELEASES,label:"Release"}
  };
  let trainer=null,vuNeedle=null,vuReadout=null,vuFrame=0,displayedReduction=0,lastFrame=0;

  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

  function educationalCopy(name,value){
    if(name==="ratio"){
      if(value<=3) return `<strong>Ratio ${value}:1</strong> · compresión suave: controla menos la señal después del threshold.`;
      if(value<=6) return `<strong>Ratio ${value}:1</strong> · control medio: el envelope se vuelve más evidente.`;
      return `<strong>Ratio ${value}:1</strong> · control fuerte: escucha cuánto más se contiene el golpe y observa el GR.`;
    }
    if(name==="attack"){
      if(value<=3) return `<strong>Attack ${value} ms</strong> · muy rápido: captura gran parte del transient; escucha menos golpe inicial.`;
      if(value<=10) return `<strong>Attack ${value} ms</strong> · rápido: controla el transient temprano y endurece el envelope.`;
      if(value<=30) return `<strong>Attack ${value} ms</strong> · medio: deja pasar parte del golpe antes de comprimir.`;
      return `<strong>Attack ${value} ms</strong> · lento: deja pasar más transient; escucha más punch antes de que llegue el GR.`;
    }
    if(name==="release"){
      if(value<=80) return `<strong>Release ${value} ms</strong> · rápido: la reducción vuelve pronto a 0; escucha movimiento o pumping.`;
      if(value<=200) return `<strong>Release ${value} ms</strong> · medio: la aguja recupera con el groove y suele sentirse natural en drums.`;
      return `<strong>Release ${value} ms</strong> · lento: el compresor permanece trabajando entre golpes; observa cómo tarda en volver la aguja.`;
    }
    return "";
  }

  function updateCoach(name,value){
    const coach=trainer?.querySelector("[data-cm-coach]");
    if(coach) coach.innerHTML=educationalCopy(name,value);
  }

  function syncSwitch(){
    trainer?.querySelectorAll("[data-cm-side]").forEach(btn=>{
      btn.classList.toggle("is-active",btn.dataset.cmSide===C.state.activeSide);
    });
  }

  function syncParamUI(name){
    const value=C.state.user[name];
    trainer?.querySelectorAll(`[data-cm-option="${name}"]`).forEach(btn=>{
      const match=Number(btn.dataset.value)===Number(value);
      btn.classList.toggle("is-selected",match);
      if(C.state.phase==="editing") btn.disabled=false;
    });
    const readout=trainer?.querySelector(`[data-cm-value="${name}"]`);
    if(readout) readout.textContent=C.formatParam(name,value);
  }

  function setParam(name,value){
    if(C.state.phase!=="editing") return;
    C.setUserParam(name,value);
    if(C.state.activeSide!=="user") C.switchSide("user");
    syncSwitch();
    syncParamUI(name);
    updateCoach(name,value);
  }

  function valueFromPointer(name,host,clientY){
    const values=PARAMS[name].values;
    const rect=host.getBoundingClientRect();
    const ratio=clamp((clientY-rect.top)/Math.max(1,rect.height),0,.999999);
    const index=Math.round(ratio*(values.length-1));
    return values[clamp(index,0,values.length-1)];
  }

  function installDrag(name){
    const host=trainer?.querySelector(`.sg-cm-param [data-cm-option="${name}"]`)?.closest(".sg-cm-options");
    if(!host||host.dataset.cmProDrag==="1") return;
    host.dataset.cmProDrag="1";
    host.setAttribute("role","slider");
    host.setAttribute("tabindex","0");
    host.setAttribute("aria-label",`${PARAMS[name].label} control`);
    let dragging=false,pointerId=null;

    const apply=e=>{
      const value=valueFromPointer(name,host,e.clientY);
      setParam(name,value);
      host.setAttribute("aria-valuenow",String(value));
      host.setAttribute("aria-valuetext",C.formatParam(name,value));
    };

    host.addEventListener("pointerdown",e=>{
      if(C.state.phase!=="editing") return;
      e.preventDefault();
      dragging=true;pointerId=e.pointerId;host.classList.add("is-dragging");
      try{host.setPointerCapture?.(pointerId);}catch(_){ }
      apply(e);
    });
    host.addEventListener("pointermove",e=>{
      if(!dragging||e.pointerId!==pointerId||C.state.phase!=="editing") return;
      e.preventDefault();apply(e);
    });
    const end=e=>{
      if(!dragging) return;
      dragging=false;host.classList.remove("is-dragging");
      try{host.releasePointerCapture?.(pointerId);}catch(_){ }
      pointerId=null;
    };
    host.addEventListener("pointerup",end);
    host.addEventListener("pointercancel",end);
    host.addEventListener("keydown",e=>{
      if(C.state.phase!=="editing") return;
      const values=PARAMS[name].values,current=C.state.user[name];
      let index=Math.max(0,values.indexOf(current));
      if(e.key==="ArrowUp"||e.key==="ArrowLeft") index=Math.max(0,index-1);
      else if(e.key==="ArrowDown"||e.key==="ArrowRight") index=Math.min(values.length-1,index+1);
      else if(e.key==="Home") index=0;
      else if(e.key==="End") index=values.length-1;
      else return;
      e.preventDefault();setParam(name,values[index]);
    });
  }

  function vuMarkup(){
    return `<header><span>Gain Reduction</span><strong data-cm-gr-value>0.0 dB</strong></header>
      <div class="sg-cm-vu" role="meter" aria-label="Gain Reduction VU meter" aria-valuemin="0" aria-valuemax="20" aria-valuenow="0">
        <div class="sg-cm-vu-face">
          <div class="sg-cm-vu-arc"></div>
          <span class="vu-num n0">0</span><span class="vu-num n4">4</span><span class="vu-num n8">8</span><span class="vu-num n12">12</span><span class="vu-num n16">16</span><span class="vu-num n20">20</span>
          <i class="vu-tick t0"></i><i class="vu-tick t4"></i><i class="vu-tick t8"></i><i class="vu-tick t12"></i><i class="vu-tick t16"></i><i class="vu-tick t20"></i>
          <div class="sg-cm-vu-db">dB</div><div class="sg-cm-vu-title">GAIN REDUCTION</div>
          <div class="sg-cm-vu-needle" data-cm-vu-needle></div><div class="sg-cm-vu-pivot"></div><div class="sg-cm-vu-glow"></div>
        </div>
      </div><small>0–20 dB · real compressor reduction</small>`;
  }

  function installVU(){
    const gr=trainer?.querySelector(".sg-cm-gr");
    if(!gr||gr.dataset.cmProVu==="1") return;
    gr.dataset.cmProVu="1";
    gr.innerHTML=vuMarkup();
    vuNeedle=gr.querySelector("[data-cm-vu-needle]");
    vuReadout=gr.querySelector("[data-cm-gr-value]");
    startVuLoop();
  }

  function startVuLoop(){
    cancelAnimationFrame(vuFrame);lastFrame=performance.now();displayedReduction=0;
    const tick=now=>{
      const dt=Math.min(.08,Math.max(.001,(now-lastFrame)/1000));lastFrame=now;
      const target=clamp(Math.abs(C.getReduction?.()||0),0,20);
      const tau=target>displayedReduction?.045:.17;
      const alpha=1-Math.exp(-dt/tau);
      displayedReduction+=(target-displayedReduction)*alpha;
      const angle=-55+(displayedReduction/20)*110;
      if(vuNeedle) vuNeedle.style.transform=`translateX(-50%) rotate(${angle.toFixed(2)}deg)`;
      if(vuReadout) vuReadout.textContent=`${displayedReduction.toFixed(1)} dB`;
      const meter=trainer?.querySelector(".sg-cm-vu");
      if(meter) meter.setAttribute("aria-valuenow",displayedReduction.toFixed(1));
      vuFrame=requestAnimationFrame(tick);
    };
    vuFrame=requestAnimationFrame(tick);
  }

  function install(){
    trainer=document.getElementById("sgCompressionMatchTrainer");
    if(!trainer) return false;
    if(trainer.dataset.cmProEnhanced==="1") return true;
    trainer.dataset.cmProEnhanced="1";
    Object.keys(PARAMS).forEach(installDrag);
    installVU();
    [50,180,450,900].forEach(delay=>setTimeout(()=>Object.keys(PARAMS).forEach(syncParamUI),delay));
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{if(install()) observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
