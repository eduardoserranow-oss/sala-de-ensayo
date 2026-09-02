(function(){"use strict";
const KEY="fortissimo.studyPaths.releaseMeta.v2",LEGACY_KEY="fortissimo.studyPaths.releaseMeta.v1",CHECKPOINT_KEY="fortissimo.studyPaths.ai.stageCheckpoint.v1",FRESH_MS=1000*60*60*24*30;
function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return{}}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}}
function key(a,t){return`${String(a||"").trim().toLowerCase()}::${String(t||"").trim().toLowerCase()}`}
function get(a,t){return read()[key(a,t)]||null}
function isMusicVideo(v){return /\b(official\s+)?(music\s+)?video\b|\bofficial\s+4k\s+video\b/i.test(String(v?.videoTitle||''))||Boolean(v?.officialSignals?.vevo)}
function catalogVideo(v){return Boolean(v?.officialSignals?.topic||v?.officialSignals?.providedBy||v?.officialSignals?.officialAudio||v?.officialSignals?.catalogTrack)}
function complete(v){return!!(v?.verified&&(v.artwork||v.thumbnail)&&v.videoId&&!isMusicVideo(v)&&catalogVideo(v))}
function fresh(v){return!!(v?.verifiedAt&&Date.now()-Number(v.verifiedAt)<FRESH_MS)}
async function call(path,a,t){const r=await fetch(`${path}?artist=${encodeURIComponent(a)}&title=${encodeURIComponent(t)}`,{headers:{Accept:"application/json"}});const p=await r.json().catch(()=>({ok:false,error:"Respuesta inválida."}));return{r,p}}
async function resolve(a,t,force=false){const k=key(a,t),all=read(),cached=all[k]||null;if(!force&&complete(cached)&&fresh(cached))return cached;const [ytResult,catResult]=await Promise.allSettled([call("/api/study-paths/youtube-release",a,t),call("/api/study-paths/apple-release",a,t)]);const yt=ytResult.status==='fulfilled'?ytResult.value:null,cat=catResult.status==='fulfilled'?catResult.value:null;let value=null;if(yt?.r?.ok&&yt.p?.verified&&yt.p?.track){const y=yt.p.track,c=cat?.r?.ok&&cat.p?.verified?cat.p.track:null;value={...y,artwork:c?.artwork||y.artwork||y.thumbnail||cached?.artwork||cached?.thumbnail||'',release:c?.release||y.release||cached?.release||null,catalogUrl:c?.catalogUrl||y.catalogUrl||cached?.catalogUrl||"",verified:true,verifiedAt:Date.now(),source:"youtube",catalogSource:c?"apple":yt.p.source||"youtube",matchScore:yt.p.matchScore||0}}else if(cat?.r?.ok&&cat.p?.verified&&cat.p?.track){const c=cat.p.track;value={...c,artwork:c.artwork||cached?.artwork||cached?.thumbnail||'',verified:true,verifiedAt:Date.now(),source:"apple",catalogSource:"apple",matchScore:0}}if(value?.artwork||value?.thumbnail){all[k]=value;write(all);return value}const last=cat&&cat.r?.status!==404?cat:yt;throw Object.assign(new Error(last?.p?.error||"No se pudo verificar el lanzamiento."),{status:last?.r?.status||500,code:last?.p?.code||null})}
function clear(a,t){const all=read();delete all[key(a,t)];write(all)}
try{localStorage.removeItem(LEGACY_KEY)}catch(_){}
window.FortissimoSongRelease={get,resolve,key,clear,complete};
})();