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

  async function install(){
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