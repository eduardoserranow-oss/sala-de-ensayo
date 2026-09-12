(function(){
  "use strict";
  if(new URL(location.href).searchParams.get("coverEdit")!=="1")return;

  const FRAME_KEY="fortissimo.soundGym.coverFrames.v1";
  const DB_NAME="fortissimo-soundgym-covers-v1";
  const STORE="covers";
  const SYNC_STATE_KEY="fortissimo.soundGym.coverRemoteSync.v1";
  const ENDPOINT="https://sducrbueumvxyfwwlvtf.supabase.co/functions/v1/fortissimo-soundgym-cover-sync";
  const TOKEN="fts_soundgym_sync_7M4qK1vP";
  const INTERVAL_MS=7000;
  let busy=false,timer=0;

  function status(text,ok){
    let el=document.getElementById("soundGymCoverRemoteSyncStatus");
    if(!el){el=document.createElement("div");el.id="soundGymCoverRemoteSyncStatus";Object.assign(el.style,{position:"fixed",left:"12px",bottom:"12px",zIndex:"2147483647",padding:"7px 10px",borderRadius:"999px",font:"600 11px/1.2 system-ui,-apple-system,sans-serif",letterSpacing:".02em",background:"rgba(8,8,8,.84)",color:"#fff",border:"1px solid rgba(255,255,255,.16)",backdropFilter:"blur(10px)",pointerEvents:"none",opacity:".9"});document.body.appendChild(el);}el.textContent=text;el.style.borderColor=ok?"rgba(80,220,130,.42)":"rgba(255,160,50,.42)";
  }
  function readState(){try{return JSON.parse(localStorage.getItem(SYNC_STATE_KEY)||"{}")||{};}catch(_){return{};}}
  function saveState(v){try{localStorage.setItem(SYNC_STATE_KEY,JSON.stringify(v));}catch(_){}}
  async function api(payload){const res=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"application/json","x-fortissimo-sync-token":TOKEN},body:JSON.stringify(payload)});const text=await res.text();let data=null;try{data=text?JSON.parse(text):null;}catch(_){}if(!res.ok||!data?.ok)throw new Error((data&&data.error)||("sync "+res.status));return data;}
  function readFramesRaw(){return localStorage.getItem(FRAME_KEY)||"{}";}
  async function openDb(){return await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function entries(){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),s=tx.objectStore(STORE),kr=s.getAllKeys(),vr=s.getAll();tx.oncomplete=()=>{const ks=kr.result||[],vs=vr.result||[];resolve(ks.map((k,i)=>({key:String(k),blob:vs[i]})).filter(x=>x.blob instanceof Blob));};tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
  function signature(blob){return [blob.size,blob.type||"",blob.name||"",blob.lastModified||0].join(":");}
  async function upload(key,blob){const prep=await api({kind:"prepare-image",key,type:blob.type||"image/jpeg",name:blob.name||"",size:blob.size});if(!prep.signedUrl)throw new Error("No signed upload URL");const r=await fetch(prep.signedUrl,{method:"PUT",headers:{"content-type":blob.type||"application/octet-stream","x-upsert":"true"},body:blob});if(!r.ok)throw new Error("image upload "+r.status);await api({kind:"finalize-image",key,path:prep.path,type:blob.type||"",name:blob.name||"",size:blob.size});}
  async function syncNow(force){if(busy)return;busy=true;try{const state=readState();state.images=state.images||{};const raw=readFramesRaw();if(force||state.framesRaw!==raw){status("Guardando encuadres…",true);let draft={};try{draft=JSON.parse(raw)||{};}catch(_){}await api({kind:"draft",draft:{frames:draft,version:1,updatedAt:new Date().toISOString()}});state.framesRaw=raw;saveState(state);}for(const e of await entries()){const sig=signature(e.blob);if(!force&&state.images[e.key]===sig)continue;status("Guardando portada "+e.key+"…",true);await upload(e.key,e.blob);state.images[e.key]=sig;saveState(state);}status("✓ Portadas guardadas remotamente",true);}catch(err){console.warn("Sound Gym cover sync failed",err);status("No se pudo sincronizar · reintentando",false);}finally{busy=false;}}
  status("Preparando guardado…",true);setTimeout(()=>syncNow(true),700);setTimeout(()=>syncNow(false),2600);timer=setInterval(()=>syncNow(false),INTERVAL_MS);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")syncNow(false);});addEventListener("pagehide",()=>syncNow(false));window.__fortissimoSoundGymCoverSync={syncNow:()=>syncNow(true)};
})();