(function(){
  "use strict";

  const modal=document.getElementById("tabEditor");
  const panel=modal?.querySelector(".editor-panel");
  const toolbar=modal?.querySelector(".editor-toolbar");
  const header=document.querySelector(".routine-header,.fortissimo-app-header,.topbar");
  if(!modal||!panel||!toolbar) return;

  const instrument=document.body.dataset.instrument==="bass"?"bass":"guitar";
  const BPM_MIN=40,BPM_MAX=220,BPM_DEFAULT=85;
  const STORE_KEY=`fortissimo.tabEditorBpm.v1:${instrument}`;
  const DEFAULT_STEP_MS=60000/BPM_DEFAULT/2;
  const NativeSetTimeout=window.setTimeout.bind(window);
  const NativeClearTimeout=window.clearTimeout.bind(window);
  const NativeRAF=window.requestAnimationFrame.bind(window);
  const NativeCAF=window.cancelAnimationFrame.bind(window);
  let bpm=loadBpm();
  let nextAdaptiveId=900000;
  let rafId=0;
  let lastTime=0;
  let transportProgress=0;
  const adaptive=new Map();
  const tailTimers=new Map();

  installTempoControl();
  measureHeader();
  addEventListener("resize",measureHeader,{passive:true});
  addEventListener("orientationchange",()=>NativeSetTimeout(measureHeader,80),{passive:true});
  window.visualViewport?.addEventListener("resize",measureHeader,{passive:true});

  const closeObserver=new MutationObserver(()=>{
    if(modal.classList.contains("is-open")) measureHeader();
    else resetTransport(true);
  });
  closeObserver.observe(modal,{attributes:true,attributeFilter:["class"]});

  function clampBpm(value){return Math.max(BPM_MIN,Math.min(BPM_MAX,Math.round(Number(value)||BPM_DEFAULT)));}
  function loadBpm(){try{return clampBpm(localStorage.getItem(STORE_KEY)||BPM_DEFAULT);}catch(_){return BPM_DEFAULT;}}
  function saveBpm(){try{localStorage.setItem(STORE_KEY,String(bpm));}catch(_){} }
  function stepMs(){return 60000/bpm/2;}

  function installTempoControl(){
    if(document.getElementById("tabTempoControl")) return;
    const section=document.createElement("section");
    section.id="tabTempoControl";
    section.className="tab-tempo-control";
    section.setAttribute("aria-label","Velocidad de reproducción de la tablatura");
    section.innerHTML=`
      <button class="tab-tempo-step" id="tabTempoDown" type="button" aria-label="Bajar BPM">−</button>
      <div class="tab-tempo-readout" aria-live="polite"><strong id="tabTempoValue">${bpm}</strong><span>BPM</span></div>
      <input class="tab-tempo-slider" id="tabTempoSlider" type="range" min="${BPM_MIN}" max="${BPM_MAX}" step="1" value="${bpm}" aria-label="BPM de reproducción" />
      <button class="tab-tempo-step" id="tabTempoUp" type="button" aria-label="Subir BPM">+</button>
    `;
    toolbar.before(section);

    const slider=section.querySelector("#tabTempoSlider");
    const down=section.querySelector("#tabTempoDown");
    const up=section.querySelector("#tabTempoUp");
    slider.addEventListener("input",()=>setBpm(slider.value));
    down.addEventListener("click",()=>setBpm(bpm-1));
    up.addEventListener("click",()=>setBpm(bpm+1));
  }

  function setBpm(value){
    const next=clampBpm(value);
    if(next===bpm) return;
    bpm=next;
    saveBpm();
    const valueEl=document.getElementById("tabTempoValue");
    const slider=document.getElementById("tabTempoSlider");
    if(valueEl) valueEl.textContent=String(bpm);
    if(slider&&Number(slider.value)!==bpm) slider.value=String(bpm);
    window.dispatchEvent(new CustomEvent("fortissimo:tab-bpm",{detail:{bpm,instrument}}));
  }

  function measureHeader(){
    const activeHeader=header&&getComputedStyle(header).display!=="none"?header:document.querySelector(".routine-header,.fortissimo-app-header,.topbar");
    let bottom=0;
    if(activeHeader){
      const r=activeHeader.getBoundingClientRect();
      bottom=Math.max(0,r.bottom);
    }
    if(!bottom){
      const safe=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fortissimo-header-h"))||0;
      bottom=safe||104;
    }
    document.documentElement.style.setProperty("--tab-editor-header-offset",`${Math.ceil(bottom)}px`);
  }

  function stackAllowsAdaptive(){
    if(!modal.classList.contains("is-arrangement-playing")) return false;
    let stack="";
    try{stack=String(new Error().stack||"");}catch(_){}
    if(!stack) return true;
    return /playArrangement|tab-editor-v4\.js/i.test(stack);
  }

  function classifyDelay(delay){
    const d=Number(delay);
    if(!Number.isFinite(d)||d<0||!stackAllowsAdaptive()) return null;
    let steps=Math.round(d/DEFAULT_STEP_MS);
    if(Math.abs(d-steps*DEFAULT_STEP_MS)<=2.5) return {steps:Math.max(0,steps),tail:0};
    steps=Math.round((d-180)/DEFAULT_STEP_MS);
    if(steps>=1&&Math.abs(d-(steps*DEFAULT_STEP_MS+180))<=2.5) return {steps,tail:180};
    return null;
  }

  function resetTransport(cancelTasks){
    transportProgress=0;
    lastTime=0;
    if(rafId){NativeCAF(rafId);rafId=0;}
    if(cancelTasks){
      for(const [id] of adaptive) adaptive.delete(id);
      for(const [id,nativeId] of tailTimers){NativeClearTimeout(nativeId);tailTimers.delete(id);}
    }
  }

  function ensureClock(){if(!rafId) rafId=NativeRAF(tick);}
  function tick(now){
    rafId=0;
    if(!lastTime) lastTime=now;
    const dt=Math.max(0,Math.min(80,now-lastTime));
    lastTime=now;
    transportProgress+=dt/stepMs();
    const due=[];
    for(const [id,task] of adaptive){
      if(task.target<=transportProgress+0.001){adaptive.delete(id);due.push([id,task]);}
    }
    for(const [id,task] of due){
      if(task.tail){
        const nativeId=NativeSetTimeout(()=>{tailTimers.delete(id);task.fn(...task.args);},task.tail);
        tailTimers.set(id,nativeId);
      }else{
        Promise.resolve().then(()=>task.fn(...task.args));
      }
    }
    if(adaptive.size) ensureClock(); else lastTime=0;
  }

  window.setTimeout=function(fn,delay,...args){
    const match=typeof fn==="function"?classifyDelay(delay):null;
    if(!match) return NativeSetTimeout(fn,delay,...args);
    if(match.steps===0) resetTransport(true);
    const id=++nextAdaptiveId;
    adaptive.set(id,{fn,args,target:match.steps,tail:match.tail});
    ensureClock();
    return id;
  };

  window.clearTimeout=function(id){
    if(adaptive.has(id)){adaptive.delete(id);if(!adaptive.size&&rafId){NativeCAF(rafId);rafId=0;lastTime=0;}return;}
    if(tailTimers.has(id)){NativeClearTimeout(tailTimers.get(id));tailTimers.delete(id);return;}
    return NativeClearTimeout(id);
  };
})();