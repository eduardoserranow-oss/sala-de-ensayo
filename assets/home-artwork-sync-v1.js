(function(){
  "use strict";

  const DRAFT_KEY = "fortissimo.homeArtworkDraft.v2";
  const LEGACY_DRAFT_KEY = "fortissimo.homeArtworkDraft.v1";
  const DB_NAME = "fortissimo-home-artwork-v1";
  const STORE_NAME = "artwork";
  const SYNC_STATE_KEY = "fortissimo.homeArtworkRemoteSync.v1";
  const ENDPOINT = "https://sducrbueumvxyfwwlvtf.supabase.co/functions/v1/fortissimo-home-artwork-sync";
  const TOKEN = "fts_home_sync_9jR3mK72xP";
  const INTERVAL_MS = 7000;

  if (new URL(location.href).searchParams.get("homeEdit") !== "1") return;

  let busy = false;
  let timer = 0;

  function readDraftRaw(){
    return localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY) || "";
  }

  function readSyncState(){
    try { return JSON.parse(localStorage.getItem(SYNC_STATE_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function saveSyncState(state){
    try { localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function setStatus(text, ok){
    let el = document.getElementById("homeArtworkRemoteSyncStatus");
    if (!el){
      el = document.createElement("div");
      el.id = "homeArtworkRemoteSyncStatus";
      Object.assign(el.style, {
        position:"fixed", left:"12px", bottom:"12px", zIndex:"2147483647",
        padding:"7px 10px", borderRadius:"999px", font:"600 11px/1.2 system-ui,-apple-system,sans-serif",
        letterSpacing:".02em", background:"rgba(8,8,8,.84)", color:"#fff",
        border:"1px solid rgba(255,255,255,.16)", backdropFilter:"blur(10px)",
        pointerEvents:"none", opacity:".88"
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = ok ? "rgba(80,220,130,.42)" : "rgba(255,160,50,.42)";
  }

  async function postDraft(raw){
    if (!raw) return false;
    let draft;
    try { draft = JSON.parse(raw); } catch (_) { return false; }
    const res = await fetch(ENDPOINT, {
      method:"POST",
      headers:{"content-type":"application/json","x-fortissimo-sync-token":TOKEN},
      body:JSON.stringify({kind:"draft", draft})
    });
    if (!res.ok) throw new Error("draft sync " + res.status);
    return true;
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function readArtworkEntries(){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE_NAME,"readonly");
        const store=tx.objectStore(STORE_NAME);
        const keysReq=store.getAllKeys();
        const valsReq=store.getAll();
        tx.oncomplete=()=>{
          const keys=keysReq.result || [];
          const vals=valsReq.result || [];
          resolve(keys.map((key,i)=>({key:String(key), blob:vals[i]})).filter(x=>x.blob instanceof Blob));
        };
        tx.onerror=()=>reject(tx.error);
      });
    } finally { db.close(); }
  }

  function signature(blob){
    return [blob.size, blob.type || "", blob.name || "", blob.lastModified || 0].join(":");
  }

  async function postImage(key, blob){
    const form=new FormData();
    const ext=(blob.type||"image/jpeg").split("/")[1] || "jpg";
    const name=blob.name || (key.replace(/[^a-z0-9_-]/gi,"_") + "." + ext);
    form.append("key",key);
    form.append("file",blob,name);
    const res=await fetch(ENDPOINT,{
      method:"POST",
      headers:{"x-fortissimo-sync-token":TOKEN},
      body:form
    });
    if(!res.ok) throw new Error("image sync " + key + " " + res.status);
  }

  async function syncNow(force){
    if(busy) return;
    busy=true;
    try{
      const state=readSyncState();
      state.images=state.images || {};
      const raw=readDraftRaw();
      if(raw && (force || state.draftRaw !== raw)){
        setStatus("Guardando ajustes…", true);
        await postDraft(raw);
        state.draftRaw=raw;
        state.draftSyncedAt=new Date().toISOString();
        saveSyncState(state);
      }

      const entries=await readArtworkEntries();
      for(const entry of entries){
        const sig=signature(entry.blob);
        if(!force && state.images[entry.key]===sig) continue;
        setStatus("Guardando foto " + entry.key + "…", true);
        await postImage(entry.key,entry.blob);
        state.images[entry.key]=sig;
        state.imagesSyncedAt=new Date().toISOString();
        saveSyncState(state);
      }
      setStatus("✓ Cambios guardados remotamente", true);
    }catch(err){
      console.warn("Home artwork remote sync failed",err);
      setStatus("No se pudo sincronizar · reintentando", false);
    }finally{
      busy=false;
    }
  }

  function schedule(){
    clearInterval(timer);
    timer=setInterval(()=>syncNow(false),INTERVAL_MS);
  }

  setStatus("Preparando guardado…", true);
  setTimeout(()=>syncNow(true),700);
  setTimeout(()=>syncNow(false),2600);
  schedule();
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") syncNow(false); });
  addEventListener("pagehide",()=>syncNow(false));
  window.__fortissimoHomeArtworkSync={syncNow:()=>syncNow(true)};
})();
