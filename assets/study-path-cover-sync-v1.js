(function(){
  "use strict";
  if(new URL(location.href).searchParams.get("coverSync")!=="1") return;

  const ENDPOINT="https://sducrbueumvxyfwwlvtf.supabase.co/functions/v1/fortissimo-study-path-cover-sync";
  const TOKEN="fts_studypaths_sync_4Q9mV2kL";
  const META_KEY="fortissimo.studyPaths.covers.v1";
  const DB_NAME="fortissimo-study-path-covers";
  const STORE="custom-covers";

  const badge=document.createElement("div");
  badge.style.cssText="position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;padding:10px 13px;border-radius:999px;background:#111;color:#fff;border:1px solid #ffffff24;font:800 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 12px 36px #0008;max-width:calc(100vw - 28px);text-align:center";
  badge.textContent="Buscando portadas de este iPhone…";
  document.body.appendChild(badge);

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const safeMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||"{}")}catch(_){return{}}};
  function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function getBlob(k){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(k);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
  async function keys(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).getAllKeys();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
  function extFor(blob){const t=String(blob?.type||"").toLowerCase();if(t.includes("jpeg"))return"jpg";if(t.includes("webp"))return"webp";if(t.includes("heic"))return"heic";if(t.includes("heif"))return"heif";if(t.includes("avif"))return"avif";return"png"}
  async function api(body){const r=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","x-fortissimo-sync-token":TOKEN},body:JSON.stringify(body),cache:"no-store"});const p=await r.json().catch(()=>null);if(!r.ok||!p?.ok)throw new Error(p?.error||`HTTP ${r.status}`);return p}
  async function selectedBlob(id,m){
    if(m?.coverSource==="custom") return (await getBlob(`${id}:custom`).catch(()=>null)) || (await getBlob(id).catch(()=>null));
    if(m?.coverSource==="ai") return (await getBlob(`${id}:ai-current`).catch(()=>null)) || (await getBlob(`${id}:ai-original`).catch(()=>null));
    return (await getBlob(`${id}:custom`).catch(()=>null)) || (await getBlob(id).catch(()=>null)) || (await getBlob(`${id}:ai-current`).catch(()=>null));
  }
  async function upload(id,blob){
    const ext=extFor(blob);
    const prep=await api({kind:"prepare-image",id,ext});
    const up=await fetch(prep.signedUrl,{method:"PUT",headers:{"Content-Type":blob.type||"image/png"},body:blob});
    if(!up.ok)throw new Error(`No pude subir ${id} (${up.status})`);
    await api({kind:"finalize-image",id,path:prep.path,name:`${id}.${ext}`,type:blob.type||"image/png",size:blob.size||0});
  }
  async function run(){
    try{
      const meta=safeMeta();
      const k=await keys().catch(()=>[]);
      const ids=new Set(Object.keys(meta));
      (window.FortissimoProjects?.all?.(true)||[]).forEach(p=>ids.add(String(p.id)));
      k.forEach(raw=>{const s=String(raw);ids.add(s.split(":")[0])});
      const found=[];
      for(const id of ids){
        const blob=await selectedBlob(id,meta[id]);
        if(blob instanceof Blob && String(blob.type||"").startsWith("image/")) found.push([id,blob]);
      }
      if(!found.length){badge.textContent="No encontré portadas locales para subir";return;}
      let done=0;
      for(const [id,blob] of found){
        badge.textContent=`Subiendo portadas… ${done+1}/${found.length}`;
        await upload(id,blob);
        done++;
      }
      await api({kind:"snapshot",draft:{version:1,ids:found.map(([id])=>id),uploadedAt:new Date().toISOString()}});
      badge.textContent=`✓ ${done} portadas guardadas y compartidas`;
      badge.style.borderColor="#35d07f88";
      window.dispatchEvent(new CustomEvent("fortissimo:path-cover-global-sync",{detail:{count:done}}));
      await sleep(500);
    }catch(error){
      console.warn("Study Path cover sync failed",error);
      badge.textContent="No se pudieron guardar. Reintentando…";
      badge.style.borderColor="#ff5a0066";
      setTimeout(run,5000);
    }
  }
  setTimeout(run,350);
})();