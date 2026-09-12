(function(){
  "use strict";

  const SESSION_KEY="myLessons.localSession";
  const STORAGE_PREFIX="myLessons.homePersonalization.v1:";
  const ART_DRAFT_KEY="fortissimo.homeArtworkDraft.v1";
  const ART_DB="fortissimo-home-artwork-v1";
  const ART_STORE="artwork";
  const ORDER=["guitar","bass","vocal","studypaths","soundgym","referencefinder","vibe","wheel"];
  const LABELS={
    guitar:"Guitar Routine",
    bass:"Bass Routine",
    vocal:"Estudio Vocal",
    studypaths:"Song Patch",
    soundgym:"Sound Gym",
    referencefinder:"Reference Finder",
    vibe:"Vibe Roulette",
    wheel:"Ruleta de Acordes"
  };
  const MAX_PINNED=3;
  const modules=new Map();
  let userId="guest";
  let state=null;
  let stackObserver=null;
  let revealObserver=null;
  let parallaxRaf=0;
  let artDraft=readArtDraft();
  const artObjectUrls=new Map();
  const editMode=new URL(location.href).searchParams.get("homeEdit")==="1";
  let editorApi=null;

  boot();

  function boot(){
    const session=getSession();
    userId=String(session?.user?.id||session?.user?.email||"guest");
    collect();
    state=readState();
    installStyles();
    normalize();
    moveWheel();
    render(false);
    mountPins();
    mountReset();
    observeReveals();
    installSharedParallax();
    watch();
    applyArtworkDrafts();
    if(editMode) mountArtworkEditor();

    // Home is assembled by several scripts. Re-scan after those scripts settle so
    // Guitar/Bass can never fall out of the shared module registry.
    [40,140,360,900,1800].forEach(ms=>setTimeout(()=>{
      const before=modules.size;
      collect();
      normalize();
      moveWheel();
      mountPins();
      if(modules.size!==before) render(false);
      applyArtworkDrafts();
      requestParallax();
      editorApi?.refreshOptions?.();
    },ms));
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }
  function key(){return STORAGE_PREFIX+userId;}
  function fresh(){return{version:1,pinned:[],modules:{},updatedAt:null};}
  function readState(){
    try{
      const v=JSON.parse(localStorage.getItem(key()));
      if(v&&v.version===1){
        v.modules=v.modules||{};
        const pins=Array.isArray(v.pinned)?v.pinned:(v.pinned?[v.pinned]:[]);
        v.pinned=pins.filter((x,i,a)=>ORDER.includes(x)&&a.indexOf(x)===i).slice(0,MAX_PINNED);
        return v;
      }
    }catch(_){}
    return fresh();
  }
  function save(){
    state.updatedAt=new Date().toISOString();
    try{localStorage.setItem(key(),JSON.stringify(state));}catch(_){}
  }

  function collect(){
    const stack=document.querySelector(".hero-stack");
    if(!stack)return;

    // First: stable explicit IDs, when present.
    stack.querySelectorAll("[data-home-module]").forEach(el=>{
      const k=String(el.dataset.homeModule||"").trim().toLowerCase();
      if(k&&ORDER.includes(k)) register(k,el);
    });

    // Second: every Home hero by title / links.
    stack.querySelectorAll(":scope > .routine-hero").forEach(el=>{
      const k=infer(el);
      if(k)register(k,el);
    });

    // Third: mandatory recovery by destination. This is the important fallback:
    // a module is still identified even if a title changes or another script moves it.
    recoverByHref(stack,"guitar","guitar-practice.html");
    recoverByHref(stack,"bass","bass-practice.html");
    recoverByHref(stack,"soundgym","sound-gym.html");
    recoverByHref(stack,"studypaths","study-projects.html");
    recoverByHref(stack,"referencefinder","reference-finder.html");
    recoverByHref(stack,"vibe","vibe-roulette.html");

    const vocalButton=stack.querySelector("#openVocal");
    if(vocalButton){const hero=vocalButton.closest(".routine-hero");if(hero)register("vocal",hero);}

    const wheel=document.querySelector(".wheel-section");
    if(wheel)register("wheel",wheel);
  }

  function recoverByHref(stack,k,needle){
    if(modules.has(k))return;
    const link=[...stack.querySelectorAll("a[href]")].find(a=>(a.getAttribute("href")||"").toLowerCase().includes(needle.toLowerCase()));
    const hero=link?.closest(".routine-hero");
    if(hero)register(k,hero);
  }

  function infer(el){
    const explicit=String(el.dataset.homeModule||"").trim().toLowerCase();
    if(explicit&&ORDER.includes(explicit))return explicit;
    const hrefs=[...el.querySelectorAll("a[href]")].map(a=>(a.getAttribute("href")||"").toLowerCase()).join(" ");
    if(hrefs.includes("guitar-practice.html"))return"guitar";
    if(hrefs.includes("bass-practice.html"))return"bass";
    if(hrefs.includes("sound-gym.html"))return"soundgym";
    if(hrefs.includes("study-projects.html"))return"studypaths";
    if(hrefs.includes("reference-finder.html"))return"referencefinder";
    if(hrefs.includes("vibe-roulette.html"))return"vibe";
    if(el.querySelector("#openVocal"))return"vocal";
    const title=(el.querySelector("h1")?.textContent||"").trim().toLowerCase();
    if(title.includes("guitar"))return"guitar";
    if(title.includes("bass"))return"bass";
    if(title.includes("vocal"))return"vocal";
    if(title.includes("song patch")||title.includes("study paths"))return"studypaths";
    if(title.replace(/\s+/g,"").includes("soundgym"))return"soundgym";
    if(title.includes("reference finder"))return"referencefinder";
    if(title.includes("vibe roulette"))return"vibe";
    return null;
  }

  function register(k,el){
    if(!k||!el||!ORDER.includes(k))return;
    el.dataset.homeModule=k;
    el.setAttribute("aria-label",LABELS[k]||k);
    modules.set(k,el);
  }

  function ensureMedia(hero){
    let media=hero.querySelector(":scope > .media");
    if(!media){
      media=document.createElement("div");
      media.className="media";
      media.setAttribute("aria-hidden","true");
      hero.prepend(media);
    }
    // If the old hero used --image directly, copy that image into the shared media layer.
    if(!media.style.backgroundImage){
      const cssImage=getComputedStyle(hero).getPropertyValue("--image").trim();
      if(cssImage&&cssImage!=="none") media.style.backgroundImage=cssImage;
    }
    return media;
  }

  function ensureCue(hero){
    if(hero.querySelector(":scope > .scroll-cue"))return;
    const cue=document.createElement("span");
    cue.className="scroll-cue";
    cue.setAttribute("aria-hidden","true");
    hero.appendChild(cue);
  }

  function normalize(){
    ["guitar","bass","vocal","studypaths","soundgym","referencefinder","vibe"].forEach(k=>{
      const hero=modules.get(k);if(!hero)return;
      hero.classList.add("feature","feature-"+k,"home-standard-module");
      ensureMedia(hero);
      ensureCue(hero);
    });

    const study=modules.get("studypaths");
    if(study){
      const media=ensureMedia(study);
      if(!study.dataset.localArtwork) media.style.backgroundImage="url('assets/study-paths-exact-bg-20260902.jpg?v=2')";
      ensureSimpleAction(study,"Song Patch","Mis proyectos","study-projects.html?v=study-rebuild1");
    }
    const vibe=modules.get("vibe");
    if(vibe){
      const media=ensureMedia(vibe);
      if(!vibe.dataset.localArtwork) media.style.backgroundImage="url('assets/vibe-roulette-home-hero-20260827.webp?v=2')";
      ensureSimpleAction(vibe,"Vibe Roulette","Componer","vibe-roulette.html?v=product-v1");
    }
    const ref=modules.get("referencefinder");
    if(ref)ensureSimpleAction(ref,"Reference Finder","Buscar referencias","reference-finder.html?v=rf-preview1");
  }

  function ensureSimpleAction(hero,title,label,href){
    let content=hero.querySelector(".routine-content");
    if(!content){content=document.createElement("div");content.className="routine-content";hero.appendChild(content);}
    let h=content.querySelector("h1");
    if(!h){h=document.createElement("h1");h.textContent=title;content.prepend(h);}
    let row=content.querySelector(".cta-row");
    if(!row){row=document.createElement("div");row.className="cta-row";content.appendChild(row);}
    let a=row.querySelector(".practice-btn");
    if(!a){a=document.createElement("a");a.className="practice-btn";row.appendChild(a);}
    if(a.tagName==="A")a.href=href;
    if(!a.textContent.trim())a.textContent=label;
  }

  function moveWheel(){
    const stack=document.querySelector(".hero-stack"),wheel=modules.get("wheel");
    if(stack&&wheel&&wheel.parentElement!==stack)stack.appendChild(wheel);
  }

  function ordered(){
    const available=ORDER.filter(k=>modules.has(k));
    const pins=state.pinned.filter(k=>available.includes(k));
    return available.sort((a,b)=>{
      const pa=pins.indexOf(a),pb=pins.indexOf(b);
      if(pa!==-1||pb!==-1){
        if(pa===-1)return 1;
        if(pb===-1)return-1;
        return pa-pb;
      }
      return ORDER.indexOf(a)-ORDER.indexOf(b);
    });
  }

  function render(animate){
    const stack=document.querySelector(".hero-stack");if(!stack)return;
    const before=animate?rects():null;
    ordered().forEach(k=>stack.appendChild(modules.get(k)));
    updatePins();
    requestParallax();
    if(before)flip(before);
  }
  function rects(){const m=new Map();modules.forEach((el,k)=>m.set(k,el.getBoundingClientRect()));return m;}
  function flip(before){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    modules.forEach((el,k)=>{
      const a=before.get(k),b=el.getBoundingClientRect();
      if(!a||Math.abs(a.top-b.top)<1)return;
      el.animate([{transform:`translateY(${a.top-b.top}px)`},{transform:"translateY(0)"}],{duration:500,easing:"cubic-bezier(.22,1,.36,1)"});
    });
  }

  function mountPins(){
    modules.forEach((el,k)=>{
      if(k==="wheel")return;
      let b=el.querySelector(":scope > .home-module-pin");
      if(!b){
        b=document.createElement("button");
        b.className="home-module-pin";
        b.type="button";
        b.dataset.pinKey=k;
        b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 3.5h7.6l-1.15 5.15 2.6 2.6v1.5H12.8V20l-.8 1-.8-1v-7.25H6.75v-1.5l2.6-2.6L8.2 3.5Z"/></svg>';
        b.addEventListener("click",()=>togglePin(k));
        el.appendChild(b);
      }
      b.hidden=false;
    });
    updatePins();
  }

  function togglePin(k){
    const i=state.pinned.indexOf(k);
    if(i!==-1){
      state.pinned.splice(i,1);
    }else{
      if(state.pinned.length>=MAX_PINNED){toast(`Tu Top ${MAX_PINNED} ya está completo · desfija una sección primero`);return;}
      state.pinned.push(k);
    }
    save();
    render(true);
    toast(state.pinned.includes(k)?`${LABELS[k]} fijada · ${state.pinned.length}/${MAX_PINNED}`:"Sección desfijada");
  }

  function updatePins(){
    const full=state.pinned.length>=MAX_PINNED;
    modules.forEach((el,k)=>{
      const b=el.querySelector(":scope > .home-module-pin");
      if(!b)return;
      const pinned=state.pinned.includes(k);
      el.classList.toggle("home-module-pinned",pinned);
      b.hidden=false;
      b.style.display="grid";
      b.classList.toggle("home-pin-limit",full&&!pinned);
      b.setAttribute("aria-pressed",String(pinned));
      b.setAttribute("aria-label",pinned?`Desfijar ${LABELS[k]}`:`Fijar ${LABELS[k]} en tu Top ${MAX_PINNED}`);
    });
  }

  function mountReset(){
    const footer=document.querySelector(".home-footer");
    if(!footer||document.getElementById("resetHomeOrder"))return;
    const b=document.createElement("button");
    b.id="resetHomeOrder";b.className="home-order-reset";b.type="button";b.textContent="Restablecer orden";
    b.onclick=()=>{state=fresh();save();render(true);toast("Orden original restaurado");};
    footer.prepend(b);
  }

  function toast(msg){
    let t=document.getElementById("homeOrderToast");
    if(!t){t=document.createElement("div");t.id="homeOrderToast";t.className="home-order-toast";t.setAttribute("role","status");document.body.appendChild(t);}
    t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1900);
  }

  function observeReveals(){
    if(!("IntersectionObserver" in window)){modules.forEach(el=>el.classList.add("in"));return;}
    if(!revealObserver)revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle("in",e.isIntersecting&&e.intersectionRatio>.22)),{threshold:[0,.12,.22,.42,.65]});
    modules.forEach((el,k)=>{
      if(k==="wheel"||el.dataset.homeRevealObserved==="1")return;
      el.dataset.homeRevealObserved="1";
      revealObserver.observe(el);
    });
  }

  function installSharedParallax(){
    addEventListener("scroll",requestParallax,{passive:true});
    addEventListener("resize",requestParallax,{passive:true});
    addEventListener("orientationchange",requestParallax,{passive:true});
    requestParallax();
  }
  function requestParallax(){if(parallaxRaf)return;parallaxRaf=requestAnimationFrame(updateSharedParallax);}
  function updateSharedParallax(){
    parallaxRaf=0;
    const vh=Math.max(innerHeight,1);
    modules.forEach((hero,k)=>{
      if(k==="wheel")return;
      const media=hero.querySelector(":scope > .media");if(!media)return;
      const r=hero.getBoundingClientRect();
      const distance=(r.top+r.height/2)-vh/2;
      const amount=Math.max(-170,Math.min(170,-distance*.32));
      media.style.setProperty("--p",amount+"px");
    });
  }

  function watch(){
    const stack=document.querySelector(".hero-stack");if(!stack||stackObserver)return;
    stackObserver=new MutationObserver(()=>{
      const before=[...modules.keys()].join("|");
      collect();normalize();moveWheel();mountPins();observeReveals();applyArtworkDrafts();requestParallax();
      const after=[...modules.keys()].join("|");
      if(before!==after)render(false);
      editorApi?.refreshOptions?.();
    });
    stackObserver.observe(stack,{childList:true,subtree:true});
  }

  function readArtDraft(){
    try{return JSON.parse(localStorage.getItem(ART_DRAFT_KEY))||{version:1,modules:{}};}
    catch(_){return{version:1,modules:{}};}
  }
  function saveArtDraft(){artDraft.updatedAt=new Date().toISOString();try{localStorage.setItem(ART_DRAFT_KEY,JSON.stringify(artDraft));}catch(_){} }
  function deviceMode(){return innerWidth<=760?"mobile":"desktop";}
  function defaultFrame(){return{x:50,y:50,zoom:122};}
  function getFrame(k,mode){const m=artDraft.modules?.[k]||{};return Object.assign(defaultFrame(),m[mode]||{});}
  function setFrame(k,mode,next){artDraft.modules=artDraft.modules||{};artDraft.modules[k]=artDraft.modules[k]||{};artDraft.modules[k][mode]=Object.assign(getFrame(k,mode),next);saveArtDraft();applyFrame(k);}
  function applyFrame(k){
    const hero=modules.get(k);if(!hero||k==="wheel")return;
    const media=ensureMedia(hero);const f=getFrame(k,deviceMode());
    media.style.setProperty("--art-x",f.x+"%");
    media.style.setProperty("--art-y",f.y+"%");
    media.style.setProperty("--art-scale",String(Math.max(1.02,Number(f.zoom||122)/100)));
  }
  function applyArtworkDrafts(){modules.forEach((_,k)=>applyFrame(k));if(editMode)loadStoredArtworkImages();}

  function openArtDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(ART_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(ART_STORE))db.createObjectStore(ART_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function putArtwork(k,file){const db=await openArtDb();await new Promise((resolve,reject)=>{const tx=db.transaction(ART_STORE,"readwrite");tx.objectStore(ART_STORE).put(file,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  async function getArtwork(k){const db=await openArtDb();const blob=await new Promise((resolve,reject)=>{const tx=db.transaction(ART_STORE,"readonly");const req=tx.objectStore(ART_STORE).get(k);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});db.close();return blob;}
  async function deleteArtwork(k){const db=await openArtDb();await new Promise((resolve,reject)=>{const tx=db.transaction(ART_STORE,"readwrite");tx.objectStore(ART_STORE).delete(k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  function applyArtworkBlob(k,blob){
    const hero=modules.get(k);if(!hero||!blob)return;
    const media=ensureMedia(hero);const old=artObjectUrls.get(k);if(old)URL.revokeObjectURL(old);
    const url=URL.createObjectURL(blob);artObjectUrls.set(k,url);media.style.backgroundImage=`url("${url}")`;hero.dataset.localArtwork="1";
  }
  async function loadStoredArtworkImages(){
    for(const k of modules.keys()){
      if(k==="wheel")continue;
      try{const blob=await getArtwork(k);if(blob)applyArtworkBlob(k,blob);}catch(_){}
    }
  }

  function mountArtworkEditor(){
    document.documentElement.classList.add("home-art-edit-mode");
    const launcher=document.createElement("button");
    launcher.type="button";launcher.className="home-art-launcher";launcher.textContent="Editar fondos";document.body.appendChild(launcher);

    const panel=document.createElement("section");panel.className="home-art-panel";panel.hidden=true;
    panel.innerHTML=`
      <div class="home-art-head"><div><strong>HOME ARTWORK</strong><span>Modo temporal de diseño</span></div><button type="button" data-close aria-label="Cerrar">×</button></div>
      <label class="home-art-field"><span>Sección</span><select data-module></select></label>
      <div class="home-art-tabs"><button type="button" data-mode="mobile">Móvil</button><button type="button" data-mode="desktop">Desktop</button></div>
      <div class="home-art-preview" data-preview><div class="home-art-preview-img" data-preview-img></div><div class="home-art-preview-label" data-preview-label></div></div>
      <label class="home-art-upload"><input type="file" accept="image/*" data-upload><span>Subir / cambiar imagen</span></label>
      <label class="home-art-field"><span>Zoom</span><input type="range" min="102" max="190" step="1" data-zoom></label>
      <label class="home-art-field"><span>Horizontal</span><input type="range" min="0" max="100" step="1" data-x></label>
      <label class="home-art-field"><span>Vertical</span><input type="range" min="0" max="100" step="1" data-y></label>
      <p class="home-art-help">Arrastra directamente la imagen para reencuadrarla. Móvil y Desktop guardan encuadres independientes.</p>
      <div class="home-art-actions"><button type="button" data-jump>Ver sección</button><button type="button" data-reset>Restablecer</button><button type="button" data-copy>Copiar ajustes</button></div>
      <div class="home-art-status" data-status>Los cambios son borradores locales hasta convertirlos en el diseño oficial.</div>`;
    document.body.appendChild(panel);

    const q=s=>panel.querySelector(s);
    const select=q("[data-module]"),zoom=q("[data-zoom]"),x=q("[data-x]"),y=q("[data-y]");
    const preview=q("[data-preview]"),previewImg=q("[data-preview-img]"),previewLabel=q("[data-preview-label]"),status=q("[data-status]");
    const modeButtons=[...panel.querySelectorAll("[data-mode]")];
    let selected="guitar",previewMode=deviceMode(),dragging=false,lastX=0,lastY=0;

    function available(){return ORDER.filter(k=>k!=="wheel"&&modules.has(k));}
    function refreshOptions(){
      const list=available();
      if(!list.length)return;
      const old=selected;
      select.innerHTML=list.map(k=>`<option value="${k}">${LABELS[k]||k}</option>`).join("");
      selected=list.includes(old)?old:list[0];
      select.value=selected;
      paint();
    }
    editorApi={refreshOptions};

    function currentFrame(){return getFrame(selected,previewMode);}
    async function previewImage(){
      const hero=modules.get(selected),media=hero?.querySelector(":scope > .media");
      let bg=media?getComputedStyle(media).backgroundImage:"none";
      try{
        const blob=await getArtwork(selected);
        if(blob){
          const id="preview:"+selected;let u=artObjectUrls.get(id);if(u)URL.revokeObjectURL(u);
          u=URL.createObjectURL(blob);artObjectUrls.set(id,u);bg=`url("${u}")`;
        }
      }catch(_){}
      previewImg.style.backgroundImage=bg;
    }
    function paint(){
      if(!modules.has(selected))return;
      const f=currentFrame();zoom.value=f.zoom;x.value=f.x;y.value=f.y;
      preview.classList.toggle("is-mobile",previewMode==="mobile");preview.classList.toggle("is-desktop",previewMode==="desktop");
      previewImg.style.backgroundPosition=`${f.x}% ${f.y}%`;
      previewImg.style.backgroundSize=`${f.zoom}% auto`;
      previewLabel.textContent=`${LABELS[selected]} · ${previewMode==="mobile"?"Móvil":"Desktop"}`;
      modeButtons.forEach(b=>b.classList.toggle("active",b.dataset.mode===previewMode));
      modules.forEach((el,k)=>el.classList.toggle("home-art-selected",k===selected));
      previewImage();
    }
    function updateFromInputs(){setFrame(selected,previewMode,{zoom:Number(zoom.value),x:Number(x.value),y:Number(y.value)});paint();}

    launcher.onclick=()=>{collect();normalize();mountPins();refreshOptions();panel.hidden=false;launcher.hidden=true;};
    q("[data-close]").onclick=()=>{panel.hidden=true;launcher.hidden=false;modules.forEach(el=>el.classList.remove("home-art-selected"));};
    select.onchange=()=>{selected=select.value;paint();};
    modeButtons.forEach(b=>b.onclick=()=>{previewMode=b.dataset.mode;paint();});
    [zoom,x,y].forEach(el=>el.addEventListener("input",updateFromInputs));
    q("[data-upload]").addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{await putArtwork(selected,file);applyArtworkBlob(selected,file);await previewImage();status.textContent=`Imagen de ${LABELS[selected]} cargada como borrador.`;}
      catch(_){status.textContent="No pude guardar esa imagen. Prueba con un archivo más ligero.";}
    });
    q("[data-jump]").onclick=()=>{panel.hidden=true;launcher.hidden=false;modules.get(selected)?.scrollIntoView({behavior:"smooth",block:"start"});};
    q("[data-reset]").onclick=async()=>{
      if(artDraft.modules)delete artDraft.modules[selected];saveArtDraft();try{await deleteArtwork(selected);}catch(_){}
      status.textContent=`Borrador de ${LABELS[selected]} eliminado. Recarga para volver al arte original.`;paint();
    };
    q("[data-copy]").onclick=async()=>{
      const payload={fortissimoHomeArtworkDraft:1,updatedAt:artDraft.updatedAt||new Date().toISOString(),modules:artDraft.modules||{}};
      const text=JSON.stringify(payload,null,2);
      try{await navigator.clipboard.writeText(text);status.textContent="Ajustes copiados. Pégalos en el chat cuando quieras convertirlos en el diseño oficial.";}
      catch(_){status.textContent=text;}
    };

    preview.addEventListener("pointerdown",e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;preview.setPointerCapture?.(e.pointerId);e.preventDefault();});
    preview.addEventListener("pointermove",e=>{
      if(!dragging)return;
      const rect=preview.getBoundingClientRect(),f=currentFrame();
      const nx=Math.max(0,Math.min(100,f.x-(e.clientX-lastX)/Math.max(rect.width,1)*100));
      const ny=Math.max(0,Math.min(100,f.y-(e.clientY-lastY)/Math.max(rect.height,1)*100));
      lastX=e.clientX;lastY=e.clientY;setFrame(selected,previewMode,{x:nx,y:ny});paint();e.preventDefault();
    });
    preview.addEventListener("pointerup",()=>dragging=false);preview.addEventListener("pointercancel",()=>dragging=false);

    refreshOptions();
  }

  function installStyles(){
    if(document.getElementById("homePersonalizationStyles"))return;
    const s=document.createElement("style");s.id="homePersonalizationStyles";
    s.textContent=`
      [data-home-module]{position:relative!important}
      .hero-stack .routine-hero.feature{isolation:isolate!important;overflow:hidden!important}
      .hero-stack .routine-hero.feature>.media{position:absolute!important;inset:-22% -18%!important;z-index:-4!important;background-size:cover!important;background-repeat:no-repeat!important;background-position:var(--art-x,50%) var(--art-y,50%)!important;transform:translate3d(0,var(--p,0px),0) scale(var(--art-scale,1.22))!important;transform-origin:center center!important;will-change:transform!important;filter:saturate(.94) contrast(1.05) brightness(.82)}
      .feature-guitar>.media,.feature-bass>.media{inset:-22% -18%!important;transform:translate3d(0,var(--p,0px),0) scale(var(--art-scale,1.22))!important}
      .home-module-pin{position:absolute!important;z-index:90!important;top:max(110px,calc(env(safe-area-inset-top) + 88px))!important;right:max(20px,env(safe-area-inset-right))!important;display:grid!important;visibility:visible!important;place-items:center!important;width:36px!important;height:36px!important;padding:7px!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:10px!important;background:rgba(5,5,5,.58)!important;color:#fff!important;cursor:pointer!important;opacity:1!important;filter:drop-shadow(0 3px 12px rgba(0,0,0,.72))!important;backdrop-filter:blur(9px)!important;pointer-events:auto!important}
      .home-module-pin[hidden]{display:grid!important;visibility:visible!important;opacity:1!important}
      .home-module-pin svg{display:block;width:18px;height:18px;fill:currentColor;transform:rotate(38deg)}
      .home-module-pin[aria-pressed="true"]{color:#ff6500!important;border-color:rgba(255,101,0,.62)!important;background:rgba(24,9,2,.78)!important}.home-module-pin[aria-pressed="true"] svg{transform:rotate(0)}
      .home-module-pin.home-pin-limit:not([aria-pressed="true"]){opacity:.55!important}
      .home-footer{gap:10px;flex-wrap:wrap;align-items:center}.home-order-reset{border:1px solid rgba(255,255,255,.2);border-radius:999px;background:transparent;color:rgba(255,255,255,.72);min-height:44px;padding:0 18px;font-size:13px;font-weight:850;cursor:pointer}
      .home-order-toast{position:fixed;z-index:500;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translate(-50%,18px);padding:11px 16px;border:1px solid rgba(255,101,0,.55);border-radius:999px;background:rgba(10,10,10,.95);color:#fff;font-size:13px;font-weight:850;opacity:0;pointer-events:none;transition:.25s ease}.home-order-toast.show{opacity:1;transform:translate(-50%,0)}
      .home-art-launcher{position:fixed;z-index:450;right:16px;bottom:max(18px,env(safe-area-inset-bottom));min-height:46px;padding:0 18px;border:1px solid #ff6500;border-radius:999px;background:#101010;color:#fff;font-weight:900;box-shadow:0 10px 35px rgba(0,0,0,.45)}
      .home-art-panel{position:fixed;z-index:460;right:14px;bottom:max(14px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 28px));max-height:min(88svh,760px);overflow:auto;padding:18px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:rgba(10,10,10,.97);color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.62);backdrop-filter:blur(18px)}.home-art-panel[hidden]{display:none!important}
      .home-art-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.home-art-head div{display:grid;gap:3px}.home-art-head strong{font-size:14px;letter-spacing:.12em;color:#ff7a18}.home-art-head span{font-size:12px;color:rgba(255,255,255,.58)}.home-art-head button{width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.09);color:#fff;font-size:23px}
      .home-art-field{display:grid;gap:7px;margin:12px 0}.home-art-field>span{font-size:11px;font-weight:900;letter-spacing:.06em;color:rgba(255,255,255,.72);text-transform:uppercase}.home-art-field select{min-height:42px;width:100%;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:#171717;color:#fff;padding:0 10px}.home-art-field input[type=range]{width:100%;accent-color:#ff6500}
      .home-art-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.home-art-tabs button{min-height:38px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#151515;color:#fff;font-weight:800}.home-art-tabs button.active{border-color:#ff6500;color:#ff8b45;background:#211006}
      .home-art-preview{position:relative;margin:12px auto;overflow:hidden;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:#050505;touch-action:none;user-select:none}.home-art-preview.is-mobile{width:min(220px,62vw);aspect-ratio:9/16}.home-art-preview.is-desktop{width:100%;aspect-ratio:16/9}.home-art-preview-img{position:absolute;inset:0;background-color:#090909;background-repeat:no-repeat;background-position:center;background-size:122% auto}.home-art-preview:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.34));pointer-events:none}.home-art-preview-label{position:absolute;z-index:2;left:10px;bottom:9px;padding:5px 7px;border-radius:7px;background:rgba(0,0,0,.62);font-size:10px;font-weight:850}
      .home-art-upload{display:flex;align-items:center;justify-content:center;min-height:44px;border:1px dashed rgba(255,101,0,.72);border-radius:11px;color:#ff995c;font-size:13px;font-weight:900;cursor:pointer}.home-art-upload input{display:none}.home-art-help{margin:10px 0;color:rgba(255,255,255,.55);font-size:11px;line-height:1.45}.home-art-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.home-art-actions button{min-height:40px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#171717;color:#fff;font-size:12px;font-weight:850}.home-art-actions button[data-copy]{grid-column:1/-1;border-color:rgba(255,101,0,.56);color:#ff9654}.home-art-status{margin-top:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.64);font-size:10px;line-height:1.4}.home-art-selected{outline:2px solid rgba(255,101,0,.8)!important;outline-offset:-2px!important}
      @media(max-width:760px){
        .hero-stack .routine-hero.feature>.media,.feature-guitar>.media,.feature-bass>.media{inset:-24% -22%!important;transform:translate3d(0,var(--p,0px),0) scale(var(--art-scale,1.27))!important}
        .home-module-pin{top:max(104px,calc(env(safe-area-inset-top) + 78px))!important;right:max(16px,env(safe-area-inset-right))!important;width:36px!important;height:36px!important}
        .home-art-panel{left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));width:auto;max-height:84svh;padding:15px}.home-art-launcher{right:12px}
      }
    `;
    document.head.appendChild(s);
  }
})();