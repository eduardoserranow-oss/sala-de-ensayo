(function(){
  "use strict";
  const ENDPOINT="https://sducrbueumvxyfwwlvtf.supabase.co/functions/v1/fortissimo-study-path-cover-sync";
  const BASE="https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/fortissimo-home-artwork-drafts/";
  let images={};
  let readyPromise=null;

  function refresh(){
    readyPromise=fetch(ENDPOINT,{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(p=>{images=p?.images&&typeof p.images==="object"?p.images:{};return images})
      .catch(()=>images);
    return readyPromise;
  }

  function installSyncEntry(){
    if(!/\/study-projects\.html$/i.test(location.pathname)) return;
    if(document.getElementById("fortissimoStudyPathSyncButton")) return;
    const btn=document.createElement("button");
    btn.id="fortissimoStudyPathSyncButton";
    btn.type="button";
    btn.textContent="Sincronizar portadas";
    btn.style.cssText="position:fixed;right:14px;bottom:max(18px,env(safe-area-inset-bottom));z-index:2147482000;padding:12px 15px;border:0;border-radius:999px;background:#ff5a00;color:#fff;font:900 12px/1 Inter,system-ui,sans-serif;box-shadow:0 10px 30px #0009";
    btn.addEventListener("click",()=>{
      btn.disabled=true;
      btn.textContent="Buscando portadas…";
      const url=new URL(location.href);
      url.searchParams.set("coverSync","1");
      history.replaceState(history.state,"",url.pathname+url.search+url.hash);
      const s=document.createElement("script");
      s.src="assets/study-path-cover-sync-v1.js?v=sync3";
      s.onload=()=>{btn.style.display="none";};
      s.onerror=()=>{btn.disabled=false;btn.textContent="Reintentar sincronización";};
      document.head.appendChild(s);
    });
    document.body.appendChild(btn);
  }

  async function install(){
    installSyncEntry();
    for(let i=0;i<80&&!window.FortissimoPathCovers;i++) await new Promise(r=>setTimeout(r,25));
    const api=window.FortissimoPathCovers;
    if(!api||api.__globalCoversInstalled)return;
    api.__globalCoversInstalled=true;
    const localResolve=api.resolve.bind(api);
    refresh();
    api.resolve=async function(id){
      const local=await localResolve(id);
      if(local?.source&&local.source!=="default"&&local.url) return local;
      await (readyPromise||refresh());
      const item=images[String(id)];
      if(item?.path) return {source:"global",url:BASE+item.path,aiCoverUrl:""};
      return local;
    };
    window.addEventListener("fortissimo:path-cover-global-sync",async()=>{
      await refresh();
      window.dispatchEvent(new CustomEvent("fortissimo:path-cover",{detail:{global:true}}));
    });
  }
  install();
})();