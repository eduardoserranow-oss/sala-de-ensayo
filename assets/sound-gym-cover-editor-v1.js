(function(){
  "use strict";
  if(new URL(location.href).searchParams.get("coverEdit")!=="1")return;

  const FRAME_KEY="fortissimo.soundGym.coverFrames.v1";
  const DB_NAME="fortissimo-soundgym-covers-v1";
  const STORE="covers";
  const LIMIT=200;
  const ZOOM_RATIO=2.5;
  let current="ear",objectUrls=new Map(),frames=readFrames();

  const labels={ear:"Ear Gym",vocal:"Vocal Studio","guitar-notes":"Guitar Notes"};

  function readFrames(){try{return JSON.parse(localStorage.getItem(FRAME_KEY)||"{}")||{};}catch(_){return{};}}
  function saveFrames(){try{localStorage.setItem(FRAME_KEY,JSON.stringify(frames));}catch(_){}}
  function clamp(v,min=-LIMIT,max=LIMIT){return Math.max(min,Math.min(max,Number(v)||0));}
  function frame(id){frames[id]=Object.assign({panX:0,panY:0,zoom:0},frames[id]||{});return frames[id];}
  function scaleFor(f){return 1.01*Math.pow(ZOOM_RATIO,clamp(f.zoom)/LIMIT);}
  function card(id){return document.querySelector(`.world[data-world="${CSS.escape(id)}"]`);}
  function cover(id){return card(id)?.querySelector(".cover")||null;}
  function applyFrame(id){const c=cover(id),f=frame(id);if(!c)return;c.style.setProperty("background-position","50% 50%","important");c.style.setProperty("transform",`translate3d(${clamp(f.panX)*.22}%,${clamp(f.panY)*.22}%,0) scale(${scaleFor(f)})`,`important`);c.style.setProperty("transform-origin","50% 50%","important");}

  function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function putImage(id,file){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  async function getImage(id){const db=await openDb();const blob=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});db.close();return blob;}
  function showImage(id,blob){const c=cover(id);if(!c||!blob)return;if(objectUrls.has(id))URL.revokeObjectURL(objectUrls.get(id));const url=URL.createObjectURL(blob);objectUrls.set(id,url);c.style.setProperty("background-image",`url("${url}")`,`important`);c.style.setProperty("background-size","cover","important");c.style.setProperty("background-repeat","no-repeat","important");applyFrame(id);}
  async function loadAll(){for(const id of Object.keys(labels)){try{const blob=await getImage(id);if(blob)showImage(id,blob);else applyFrame(id);}catch(_){applyFrame(id);}}}

  function installStyle(){const s=document.createElement("style");s.id="soundGymCoverEditorStyle";s.textContent=`
    .sg-cover-edit-btn{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:90;border:1px solid rgba(255,255,255,.18);background:#111;color:#fff;border-radius:999px;padding:12px 17px;font-weight:900;box-shadow:0 12px 36px rgba(0,0,0,.42)}
    .sg-cover-panel{position:fixed;inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;z-index:100;background:rgba(9,9,9,.97);border:1px solid rgba(255,255,255,.18);border-radius:24px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.7);backdrop-filter:blur(20px);max-height:min(78svh,720px);overflow:auto}
    .sg-cover-panel[hidden]{display:none}.sg-cover-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.sg-cover-title{font-weight:950;letter-spacing:.08em;color:#ff7a45;font-size:14px}.sg-cover-sub{color:rgba(255,255,255,.55);font-size:12px;margin-top:3px}.sg-cover-x{width:42px;height:42px;border:0;border-radius:50%;background:#222;color:#fff;font-size:26px}.sg-cover-select{width:100%;height:46px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:#151515;color:#fff;padding:0 12px;font-size:16px}.sg-cover-upload{display:flex;align-items:center;justify-content:center;width:100%;height:50px;margin:12px 0 14px;border-radius:999px;background:#ff5a00;color:white;font-weight:950;border:0}.sg-cover-file{display:none}.sg-cover-field{display:grid;grid-template-columns:86px 1fr 48px;gap:10px;align-items:center;margin:10px 0}.sg-cover-field span{font-size:12px;font-weight:900;color:rgba(255,255,255,.72)}.sg-cover-field b{font-size:12px;text-align:right;color:#ff8b45;font-variant-numeric:tabular-nums}.sg-cover-field input{width:100%}.sg-cover-help{font-size:11px;line-height:1.45;color:rgba(255,255,255,.48);margin-top:12px}.sg-cover-active{outline:2px solid #ff5a00!important;outline-offset:2px}.world .cover{will-change:transform;touch-action:none}
  `;document.head.appendChild(s);}

  function mount(){installStyle();
    const btn=document.createElement("button");btn.className="sg-cover-edit-btn";btn.type="button";btn.textContent="Editar portadas";
    const panel=document.createElement("section");panel.className="sg-cover-panel";panel.hidden=true;panel.innerHTML=`
      <div class="sg-cover-head"><div><div class="sg-cover-title">SOUND GYM · PORTADAS</div><div class="sg-cover-sub">Encuadre real de las tarjetas</div></div><button class="sg-cover-x" type="button" aria-label="Cerrar">×</button></div>
      <select class="sg-cover-select"></select>
      <button class="sg-cover-upload" type="button">Subir portada</button><input class="sg-cover-file" type="file" accept="image/*">
      <label class="sg-cover-field"><span>Zoom</span><input data-field="zoom" type="range" min="-200" max="200" step="1"><b></b></label>
      <label class="sg-cover-field"><span>Horizontal</span><input data-field="panX" type="range" min="-200" max="200" step="1"><b></b></label>
      <label class="sg-cover-field"><span>Vertical</span><input data-field="panY" type="range" min="-200" max="200" step="1"><b></b></label>
      <div class="sg-cover-help">Puedes usar los controles o mover la portada directamente sobre la tarjeta. Un dedo mueve; dos dedos hacen zoom.</div>`;
    document.body.append(btn,panel);
    const sel=panel.querySelector("select"),file=panel.querySelector(".sg-cover-file");
    Object.entries(labels).forEach(([id,label])=>{const o=document.createElement("option");o.value=id;o.textContent=label;sel.appendChild(o);});
    function sync(){document.querySelectorAll(".world").forEach(el=>el.classList.toggle("sg-cover-active",el.dataset.world===current&&!panel.hidden));const f=frame(current);panel.querySelectorAll("input[type=range]").forEach(i=>{i.value=String(clamp(f[i.dataset.field]));i.closest("label").querySelector("b").textContent=(Math.round(i.value)>0?"+":"")+Math.round(i.value);});applyFrame(current);}
    btn.onclick=()=>{panel.hidden=false;btn.hidden=true;sync();card(current)?.scrollIntoView({block:"center",behavior:"smooth"});};
    panel.querySelector(".sg-cover-x").onclick=()=>{panel.hidden=true;btn.hidden=false;sync();};
    sel.onchange=()=>{current=sel.value;sync();card(current)?.scrollIntoView({block:"center",behavior:"smooth"});};
    panel.querySelector(".sg-cover-upload").onclick=()=>file.click();
    file.onchange=async()=>{const f=file.files?.[0];if(!f)return;await putImage(current,f);showImage(current,f);file.value="";};
    panel.querySelectorAll("input[type=range]").forEach(i=>i.addEventListener("input",()=>{frame(current)[i.dataset.field]=clamp(i.value);saveFrames();sync();}));

    document.querySelectorAll(".world").forEach(el=>{
      const id=el.dataset.world,c=el.querySelector(".cover");let drag=null,pinch=null;
      c.addEventListener("touchstart",e=>{if(panel.hidden||id!==current)return;const f=frame(id);if(e.touches.length===1){drag={x:e.touches[0].clientX,y:e.touches[0].clientY,px:f.panX,py:f.panY};pinch=null;}else if(e.touches.length>=2){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);pinch={d,zoom:f.zoom};drag=null;}},{passive:true});
      c.addEventListener("touchmove",e=>{if(panel.hidden||id!==current)return;if(e.touches.length===1&&drag){e.preventDefault();const t=e.touches[0],r=el.getBoundingClientRect();frame(id).panX=clamp(drag.px+(t.clientX-drag.x)/Math.max(1,r.width)*260);frame(id).panY=clamp(drag.py+(t.clientY-drag.y)/Math.max(1,r.height)*260);saveFrames();sync();}else if(e.touches.length>=2&&pinch){e.preventDefault();const a=e.touches[0],b=e.touches[1],d=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));frame(id).zoom=clamp(pinch.zoom+Math.log(d/Math.max(1,pinch.d))/Math.log(ZOOM_RATIO)*LIMIT);saveFrames();sync();}},{passive:false});
      c.addEventListener("touchend",()=>{drag=null;pinch=null;},{passive:true});
    });
    sync();
  }

  loadAll().finally(mount);
})();