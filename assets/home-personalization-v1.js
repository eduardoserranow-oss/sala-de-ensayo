(function(){
  "use strict";

  const SESSION_KEY="myLessons.localSession";
  const ACTIVE_KEY="myLessons.homePersonalization.active.v1";
  const STORAGE_PREFIX="myLessons.homePersonalization.v1:";
  const ORDER=["guitar","bass","vocal","soundgym","referencefinder","vibe","wheel"];
  const LABELS={
    guitar:"Guitar Routine",bass:"Bass Routine",vocal:"Estudio Vocal",soundgym:"Sound Gym",
    referencefinder:"Reference Finder",vibe:"Vibe Roulette",wheel:"Ruleta de Acordes"
  };
  const MAX_PINNED=3,VALID_MS=15000,MAX_MS=2*60*60*1000;
  const modules=new Map();
  let userId="guest",state=null,revealObserver=null,stackObserver=null,wheelCounted=false;

  boot();

  function boot(){
    const session=getSession();
    userId=String(session?.user?.id||session?.user?.email||"guest");
    collect();
    state=readState();
    finalizePending();
    installStyles();
    normalize();
    moveWheel();
    render(false);
    mountPins();
    mountReset();
    bindUsage();
    observeReveals();
    watch();
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }
  function key(){return STORAGE_PREFIX+userId;}
  function fresh(){return{version:1,pinned:[],modules:{},updatedAt:null};}
  function validKeys(){return [...new Set(ORDER.concat([...modules.keys()]))];}
  function readState(){
    try{
      const v=JSON.parse(localStorage.getItem(key()));
      if(v&&v.version===1&&v.modules){
        const pins=Array.isArray(v.pinned)?v.pinned:(v.pinned?[v.pinned]:[]);
        v.pinned=pins.filter((x,i,a)=>validKeys().includes(x)&&a.indexOf(x)===i).slice(0,MAX_PINNED);
        return v;
      }
    }catch(_){}
    return fresh();
  }
  function save(){state.updatedAt=new Date().toISOString();localStorage.setItem(key(),JSON.stringify(state));}

  function collect(){
    const stack=document.querySelector(".hero-stack");
    if(!stack)return;
    [...stack.querySelectorAll(":scope > .routine-hero")].forEach(el=>{const k=infer(el);if(k)register(k,el);});
    const wheel=document.querySelector(".wheel-section");if(wheel)register("wheel",wheel);
  }
  function infer(el){
    const explicit=String(el.dataset.homeModule||"").trim().toLowerCase();if(explicit)return explicit;
    const title=(el.querySelector("h1")?.textContent||"").trim().toLowerCase();
    if(el.classList.contains("feature-guitar")||title.includes("guitar"))return"guitar";
    if(el.classList.contains("feature-bass")||title.includes("bass"))return"bass";
    if(el.classList.contains("feature-vocal")||title.includes("vocal"))return"vocal";
    if(el.classList.contains("feature-soundgym")||title.replace(/\s+/g,"").includes("soundgym"))return"soundgym";
    if(el.classList.contains("feature-referencefinder")||title.includes("reference finder"))return"referencefinder";
    if(el.classList.contains("feature-vibe")||el.classList.contains("vibe-home-hero")||title.includes("vibe roulette"))return"vibe";
    if(!title)return null;
    return title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
  }
  function register(k,el){
    if(!k||!el)return;
    if(!ORDER.includes(k))ORDER.push(k);
    if(!LABELS[k])LABELS[k]=el.querySelector("h1")?.textContent?.trim()||k;
    el.dataset.homeModule=k;el.setAttribute("aria-label",LABELS[k]);modules.set(k,el);
  }

  function normalize(){
    const vibe=modules.get("vibe");
    if(vibe){
      vibe.classList.add("feature","feature-vibe","home-standard-module");
      const media=ensureMedia(vibe);media.style.backgroundImage="url('assets/vibe-roulette-home-hero-20260827.webp?v=2')";media.style.backgroundPosition="center";
      ensureVibe(vibe);ensureCue(vibe);
    }
    const ref=modules.get("referencefinder");
    if(ref){
      ref.classList.add("feature","feature-referencefinder","home-standard-module");
      const media=ensureMedia(ref);media.style.backgroundPosition="center";loadReferenceArtwork(media);
      ensureReference(ref);ensureCue(ref);
      ref.querySelector(".rf-lines")?.setAttribute("aria-hidden","true");
      ref.querySelector(".rf-orbit")?.setAttribute("aria-hidden","true");
    }
  }
  function ensureMedia(hero){
    let m=hero.querySelector(":scope > .media");
    if(!m){m=document.createElement("div");m.className="media";m.setAttribute("aria-hidden","true");hero.prepend(m);}return m;
  }
  function loadReferenceArtwork(media){
    if(media.dataset.refArtworkLoading==="1"||media.dataset.refArtworkReady==="1")return;
    media.dataset.refArtworkLoading="1";
    media.style.backgroundImage="linear-gradient(135deg,#111,#050505 58%,#17100c)";
    fetch("assets/reference-finder-home-hero-20260827.b64?v=1",{cache:"force-cache"})
      .then(r=>{if(!r.ok)throw new Error("artwork "+r.status);return r.text();})
      .then(encoded=>{
        const data=encoded.trim();if(!data.startsWith("UklG"))throw new Error("invalid artwork");
        media.style.backgroundImage=`url("data:image/webp;base64,${data}")`;
        media.dataset.refArtworkReady="1";
      })
      .catch(()=>{media.style.backgroundImage="linear-gradient(135deg,#111,#050505 58%,#17100c)";})
      .finally(()=>{delete media.dataset.refArtworkLoading;});
  }
  function ensureCue(hero){if(hero.querySelector(":scope > .scroll-cue"))return;const q=document.createElement("span");q.className="scroll-cue";q.setAttribute("aria-hidden","true");hero.appendChild(q);}
  function ensureVibe(hero){
    const c=ensureContent(hero,"Vibe Roulette");let row=c.querySelector(".cta-row");if(!row){row=document.createElement("div");row.className="cta-row";c.appendChild(row);}
    if(!row.querySelector(".practice-btn")){const a=document.createElement("a");a.className="practice-btn";a.href="vibe-roulette.html?v=product-v1";a.innerHTML='Componer <span class="practice-arrow" aria-hidden="true">→</span>';row.appendChild(a);}
  }
  function ensureReference(hero){
    const c=ensureContent(hero,"Reference Finder");
    let d=c.querySelector(".feature-description");if(!d){d=document.createElement("p");d.className="feature-description";d.textContent="Encuentra referencias comerciales cercanas a tu producción para tomar decisiones de mezcla y mastering.";c.appendChild(d);}
    let row=c.querySelector(".cta-row");if(!row){row=document.createElement("div");row.className="cta-row";c.appendChild(row);}
    if(!row.querySelector(".practice-btn")){const a=document.createElement("a");a.className="practice-btn";a.href="reference-finder.html?v=rf-preview1";a.innerHTML='Buscar referencias <span class="practice-arrow" aria-hidden="true">→</span>';row.appendChild(a);}
  }
  function ensureContent(hero,title){let c=hero.querySelector(".routine-content");if(!c){c=document.createElement("div");c.className="routine-content";hero.appendChild(c);}if(!c.querySelector("h1")){const h=document.createElement("h1");h.textContent=title;c.prepend(h);}return c;}

  function observeReveals(){
    if(!("IntersectionObserver" in window)){modules.forEach(el=>el.classList.add("in"));return;}
    if(!revealObserver)revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.target.classList.contains("feature")||e.target.classList.contains("wheel-section"))e.target.classList.toggle("in",e.isIntersecting&&e.intersectionRatio>.24);
    }),{threshold:[0,.12,.24,.42,.65]});
    modules.forEach(el=>{if(el.dataset.homeRevealObserved==="1")return;el.dataset.homeRevealObserved="1";revealObserver.observe(el);});
  }

  function moveWheel(){const stack=document.querySelector(".hero-stack"),wheel=modules.get("wheel");if(stack&&wheel&&wheel.parentElement!==stack)stack.appendChild(wheel);}
  function score(k){const s=state.modules[k];if(!s||Number(s.sessions||0)<2)return 0;const age=Math.max(0,(Date.now()-Number(s.lastUsed||0))/86400000);return Math.log2(Number(s.sessions||0)+1)*Math.exp(-age/21)+Math.min(Number(s.totalSeconds||0)/3600,2)*.22;}
  function ordered(){const available=ORDER.filter(k=>modules.has(k)),pins=state.pinned.filter(k=>available.includes(k));return available.sort((a,b)=>{const pa=pins.indexOf(a),pb=pins.indexOf(b);if(pa!==-1||pb!==-1){if(pa===-1)return 1;if(pb===-1)return-1;return pa-pb;}const d=score(b)-score(a);return Math.abs(d)>.015?d:ORDER.indexOf(a)-ORDER.indexOf(b);});}
  function render(animate){const stack=document.querySelector(".hero-stack");if(!stack)return;const before=animate?rects():null;ordered().forEach(k=>stack.appendChild(modules.get(k)));updatePins();if(before)flip(before);}
  function rects(){const m=new Map();modules.forEach((el,k)=>m.set(k,el.getBoundingClientRect()));return m;}
  function flip(before){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;modules.forEach((el,k)=>{const a=before.get(k),b=el.getBoundingClientRect();if(!a||Math.abs(a.top-b.top)<1)return;el.animate([{transform:`translateY(${a.top-b.top}px)`},{transform:"translateY(0)"}],{duration:520,easing:"cubic-bezier(.22,1,.36,1)"});});}

  function mountPins(){modules.forEach((el,k)=>{if(el.querySelector(":scope > .home-module-pin"))return;const b=document.createElement("button");b.className="home-module-pin";b.type="button";b.dataset.pinKey=k;b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 3.5h7.6l-1.15 5.15 2.6 2.6v1.5H12.8V20l-.8 1-.8-1v-7.25H6.75v-1.5l2.6-2.6L8.2 3.5Z"/></svg>';b.addEventListener("click",()=>togglePin(k));el.appendChild(b);});updatePins();}
  function togglePin(k){const i=state.pinned.indexOf(k);if(i!==-1)state.pinned.splice(i,1);else{if(state.pinned.length>=MAX_PINNED){toast(`Máximo ${MAX_PINNED} secciones fijadas`);return;}state.pinned.push(k);}save();render(true);toast(state.pinned.includes(k)?`${LABELS[k]} fijada · ${state.pinned.length}/${MAX_PINNED}`:"Sección desfijada");document.querySelector(".hero-stack")?.scrollIntoView({behavior:"smooth",block:"start"});}
  function updatePins(){const full=state.pinned.length>=MAX_PINNED;modules.forEach((el,k)=>{const pinned=state.pinned.includes(k),b=el.querySelector(":scope > .home-module-pin");el.classList.toggle("home-module-pinned",pinned);if(!b)return;b.hidden=full&&!pinned;b.setAttribute("aria-pressed",String(pinned));b.setAttribute("aria-label",pinned?`Desfijar ${LABELS[k]}`:`Fijar ${LABELS[k]}`);b.title=pinned?"Desfijar":"Fijar arriba";});}

  function mountReset(){const footer=document.querySelector(".home-footer");if(!footer||document.getElementById("resetHomeOrder"))return;const b=document.createElement("button");b.id="resetHomeOrder";b.className="home-order-reset";b.type="button";b.textContent="Restablecer orden";b.addEventListener("click",()=>{state=fresh();save();render(true);toast("Orden original restaurado");document.querySelector(".hero-stack")?.scrollIntoView({behavior:"smooth",block:"start"});});footer.prepend(b);}
  function toast(msg){let t=document.getElementById("homeOrderToast");if(!t){t=document.createElement("div");t.id="homeOrderToast";t.className="home-order-toast";t.setAttribute("role","status");document.body.appendChild(t);}t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800);}

  function bindUsage(){
    modules.forEach((el,k)=>{if(k==="wheel"||k==="vocal"||el.dataset.homeUsageBound==="1")return;const a=el.querySelector(".practice-btn");if(!a)return;el.dataset.homeUsageBound="1";a.addEventListener("click",()=>start(k));});
    const open=document.getElementById("openVocal"),close=document.getElementById("closeVocal");
    if(open&&open.dataset.homeUsageBound!=="1"){open.dataset.homeUsageBound="1";open.addEventListener("click",()=>start("vocal"));}
    if(close&&close.dataset.homeUsageBound!=="1"){close.dataset.homeUsageBound="1";close.addEventListener("click",()=>finish("vocal"));}
    const spin=document.getElementById("spinButton");if(spin&&spin.dataset.homeUsageBound!=="1"){spin.dataset.homeUsageBound="1";spin.addEventListener("click",()=>{if(wheelCounted)return;wheelCounted=true;record("wheel",45);});}
  }
  function start(k){sessionStorage.setItem(ACTIVE_KEY,JSON.stringify({key:k,userId,startedAt:Date.now()}));}
  function finish(expected){const a=active();if(!a||a.userId!==userId||a.key!==expected)return;sessionStorage.removeItem(ACTIVE_KEY);const e=Date.now()-Number(a.startedAt||0);if(e>=VALID_MS)record(a.key,Math.min(e,MAX_MS)/1000);}
  function finalizePending(){const a=active();if(!a)return;sessionStorage.removeItem(ACTIVE_KEY);if(a.userId!==userId||!validKeys().includes(a.key))return;const e=Date.now()-Number(a.startedAt||0);if(e<VALID_MS)return;record(a.key,(e>6*60*60*1000?60000:Math.min(e,MAX_MS))/1000);}
  function active(){try{return JSON.parse(sessionStorage.getItem(ACTIVE_KEY));}catch(_){return null;}}
  function record(k,seconds){if(!validKeys().includes(k))return;const s=state.modules[k]||{sessions:0,totalSeconds:0,lastUsed:0};s.sessions=Number(s.sessions||0)+1;s.totalSeconds=Math.round(Number(s.totalSeconds||0)+Math.max(0,Number(seconds||0)));s.lastUsed=Date.now();state.modules[k]=s;save();}

  function watch(){const stack=document.querySelector(".hero-stack");if(!stack||stackObserver)return;stackObserver=new MutationObserver(()=>{const n=modules.size;collect();normalize();moveWheel();if(modules.size!==n)render(false);mountPins();bindUsage();observeReveals();});stackObserver.observe(stack,{childList:true});}

  function installStyles(){
    if(document.getElementById("homePersonalizationStyles"))return;
    const s=document.createElement("style");s.id="homePersonalizationStyles";s.textContent=`
      [data-home-module]{position:relative}
      .feature-vibe .media,.feature-referencefinder .media{background-size:cover!important;background-repeat:no-repeat!important;filter:saturate(.96) contrast(1.08) brightness(.82)}
      .feature-vibe:before,.feature-referencefinder:before{background:linear-gradient(90deg,rgba(0,0,0,.90),rgba(0,0,0,.62) 38%,rgba(0,0,0,.14) 72%,rgba(0,0,0,.24))!important}
      .feature-vibe:after,.feature-referencefinder:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.27),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.38))!important}
      .feature-referencefinder .rf-lines,.feature-referencefinder .rf-orbit{display:none!important}
      .feature-vibe.in .routine-content,.feature-referencefinder.in .routine-content{opacity:1!important;transform:none!important;filter:blur(0)!important}
      .feature-vibe.in .practice-btn,.feature-referencefinder.in .practice-btn{opacity:1!important;transform:none!important}
      .home-module-pin{position:absolute;z-index:18;top:max(110px,calc(env(safe-area-inset-top) + 88px));right:max(20px,env(safe-area-inset-right));display:grid;place-items:center;width:30px;height:30px;padding:6px;border:0;border-radius:8px;background:rgba(5,5,5,.28);color:rgba(255,255,255,.74);cursor:pointer;filter:drop-shadow(0 2px 8px rgba(0,0,0,.62));backdrop-filter:blur(6px);transition:.18s ease}
      .home-module-pin[hidden]{display:none}.home-module-pin svg{display:block;width:15px;height:15px;fill:currentColor;transform:rotate(38deg);transition:transform .18s ease}.home-module-pin:active{transform:scale(.92)}.home-module-pin[aria-pressed="true"]{color:#ff6500;background:rgba(5,5,5,.38)}.home-module-pin[aria-pressed="true"] svg{transform:rotate(0)}
      .home-footer{gap:10px;flex-wrap:wrap;align-items:center}.home-order-reset{border:1px solid rgba(255,255,255,.2);border-radius:999px;background:transparent;color:rgba(255,255,255,.7);min-height:44px;padding:0 18px;font-size:13px;font-weight:850;cursor:pointer}
      .home-order-toast{position:fixed;z-index:290;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translate(-50%,18px);max-width:calc(100vw - 32px);padding:11px 16px;border:1px solid rgba(255,101,0,.55);border-radius:999px;background:rgba(10,10,10,.92);color:#fff;font-size:13px;font-weight:850;opacity:0;pointer-events:none;transition:.25s ease;backdrop-filter:blur(16px)}.home-order-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:760px){.feature-vibe .media,.feature-referencefinder .media{background-position:center!important}.feature-vibe:before,.feature-referencefinder:before{background:linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.12) 38%,rgba(0,0,0,.88) 78%,rgba(0,0,0,.96))!important}.home-module-pin{top:max(104px,calc(env(safe-area-inset-top) + 78px));right:max(16px,env(safe-area-inset-right));width:28px;height:28px;padding:6px}}
    `;document.head.appendChild(s);
  }
})();
