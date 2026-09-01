(function(){
  "use strict";
  if(window.__FORTISSIMO_STUDY_PATHS_POLISH_V1__)return;
  window.__FORTISSIMO_STUDY_PATHS_POLISH_V1__=true;
  const page=(location.pathname.split("/").pop()||"").toLowerCase();
  if(!page.startsWith("study-"))return;
  document.documentElement.classList.add("study-paths-polished");

  let toastTimer=null,undoBar=null,errorBanner=null,offlineBar=null;
  function setVisualHeight(){
    const height=Math.round(window.visualViewport?.height||window.innerHeight||0);
    if(height)document.documentElement.style.setProperty("--sp-visual-height",`${height}px`);
  }
  setVisualHeight();
  window.visualViewport?.addEventListener("resize",setVisualHeight,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(setVisualHeight,120),{passive:true});

  function toast(message){
    let el=document.querySelector(".sp-polish-toast");
    if(!el){el=document.createElement("div");el.className="sp-polish-toast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");document.body.appendChild(el)}
    el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2200);
  }
  function updateUndo(){
    const api=window.FortissimoProjects;
    const eligible=["study-projects.html","study-project.html","study-path-adapt.html"].includes(page);
    if(!eligible||!api?.canUndo?.()){
      undoBar?.remove();undoBar=null;return;
    }
    if(!undoBar){
      undoBar=document.createElement("div");undoBar.className="sp-undo";
      const label=document.createElement("span"),button=document.createElement("button");
      button.type="button";button.textContent="Deshacer";
      button.addEventListener("click",()=>{
        button.disabled=true;
        if(api.undo()){
          toast("Último cambio restaurado");
          setTimeout(()=>location.reload(),320);
        }else{button.disabled=false;toast("No había cambios para restaurar")}
      });
      undoBar.append(label,button);document.body.appendChild(undoBar);
    }
    undoBar.querySelector("span").textContent=api.undoLabel?.()||"Último cambio";
  }

  function showStorageError(){
    if(errorBanner)return;
    errorBanner=document.createElement("div");errorBanner.className="sp-error-banner";errorBanner.setAttribute("role","alert");
    errorBanner.innerHTML="<strong>No pudimos guardar este cambio.</strong>Tu información anterior sigue intacta. Libera espacio del navegador o recarga FORTISSIMO antes de seguir editando.";
    document.body.appendChild(errorBanner);
  }
  window.addEventListener("fortissimo:storage-error",showStorageError);
  window.addEventListener("fortissimo:projects",updateUndo);

  function updateOnline(){
    const offline=navigator.onLine===false;
    if(offline&&!offlineBar){
      offlineBar=document.createElement("div");offlineBar.className="sp-offline";offlineBar.textContent="Sin conexión · puedes consultar y editar lo guardado, pero la IA necesita internet.";
      const header=document.querySelector(".topbar,.top");header?.insertAdjacentElement("afterend",offlineBar);
    }else if(!offline&&offlineBar){offlineBar.remove();offlineBar=null;toast("Conexión restaurada")}
  }
  window.addEventListener("online",updateOnline);
  window.addEventListener("offline",updateOnline);
  updateOnline();

  const nativeFetch=window.fetch?.bind(window);
  if(nativeFetch&&!window.__FORTISSIMO_STUDY_FETCH_GUARD__){
    window.__FORTISSIMO_STUDY_FETCH_GUARD__=true;
    window.fetch=function(resource,options={}){
      const url=typeof resource==="string"?resource:String(resource?.url||"");
      if(!url.includes("/api/study-paths/"))return nativeFetch(resource,options);
      if(navigator.onLine===false)return Promise.reject(new Error("Estás sin conexión. Conéctate a internet para usar la IA."));
      if(options.signal)return nativeFetch(resource,options);
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
      return nativeFetch(resource,{...options,signal:controller.signal})
        .catch(error=>{if(error?.name==="AbortError")throw new Error("La IA tardó demasiado en responder. Inténtalo otra vez.");throw error})
        .finally(()=>clearTimeout(timer));
    };
  }

  document.addEventListener("invalid",event=>{
    const target=event.target;
    if(!(target instanceof HTMLElement))return;
    requestAnimationFrame(()=>target.scrollIntoView({behavior:"smooth",block:"center"}));
  },true);

  document.querySelectorAll("dialog").forEach(dialog=>{
    dialog.addEventListener("close",()=>document.documentElement.classList.remove("sp-dialog-open"));
    dialog.addEventListener("cancel",()=>document.documentElement.classList.remove("sp-dialog-open"));
    const observer=new MutationObserver(()=>document.documentElement.classList.toggle("sp-dialog-open",dialog.open));
    observer.observe(dialog,{attributes:true,attributeFilter:["open"]});
  });

  function enhanceUnavailable(){
    if(page!=="study-project.html")return;
    const root=document.getElementById("root");
    if(!root)return;
    const apply=()=>{
      const title=root.querySelector("h1");
      if(!title||!title.textContent.includes("Proyecto no disponible")||root.querySelector(".sp-unavailable-actions"))return;
      const wrap=document.createElement("div");wrap.className="sp-unavailable-actions";
      wrap.innerHTML='<a href="study-projects.html">Volver a mis proyectos</a><a href="study-path-ai.html">Crear una ruta nueva</a>';
      root.appendChild(wrap);
    };
    apply();new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  }
  enhanceUnavailable();
  updateUndo();
})();
