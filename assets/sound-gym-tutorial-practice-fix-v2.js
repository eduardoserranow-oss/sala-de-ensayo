(function(){
  "use strict";

  let active=false;
  let target=null;
  let bar=null;
  let practiced=false;

  const style=document.createElement("style");
  style.textContent=`
    .sg-tutorial-practice-bar{position:fixed;z-index:2147483646;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(680px,calc(100vw - 16px));display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 11px;border:1px solid #35424e;border-radius:14px;background:rgba(8,13,17,.96);box-shadow:0 18px 55px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(14px);color:#f5f7f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .sg-tutorial-practice-copy{min-width:0}.sg-tutorial-practice-copy b{display:block;color:#ff7a22;font-size:8px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.sg-tutorial-practice-copy strong{display:block;margin-top:3px;font-size:12px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg-tutorial-practice-copy span{display:block;margin-top:2px;color:#85919b;font-size:8px;font-weight:700}.sg-tutorial-practice-actions{display:flex;gap:7px}.sg-tutorial-practice-actions button{height:38px;padding:0 12px;border-radius:9px;font-size:9px;font-weight:900;cursor:pointer}.sg-tutorial-practice-back{border:1px solid #34414c;background:#0d141a;color:#b8c2ca}.sg-tutorial-practice-done{border:1px solid rgba(45,212,191,.55);background:rgba(45,212,191,.09);color:#7cecdf}.sg-tutorial-practice-done.is-practiced{background:linear-gradient(145deg,#25cdbc,#159e93);border-color:#42e4d3;color:#041413}.sg-tutorial-practice-target{position:relative!important;z-index:2147482000!important;outline:2px solid rgba(255,122,34,.95)!important;outline-offset:5px!important;box-shadow:0 0 0 7px rgba(255,101,0,.09),0 0 26px rgba(255,101,0,.2)!important;border-radius:10px}.sg-tutorial-overlay.sg-practice-v2{display:none!important}
    @media(max-width:600px){.sg-tutorial-practice-bar{grid-template-columns:1fr;padding:9px;border-radius:13px}.sg-tutorial-practice-actions{display:grid;grid-template-columns:1fr 1.25fr}.sg-tutorial-practice-actions button{width:100%;height:40px}.sg-tutorial-practice-copy strong{font-size:11px}.sg-tutorial-practice-copy span{font-size:7.5px}}
  `;
  document.head.appendChild(style);

  function overlay(){return document.querySelector(".sg-tutorial-overlay");}
  function tryButton(){return document.querySelector("[data-sgt-try]");}
  function nextButton(){return document.querySelector("[data-sgt-next]");}
  function countText(){return document.querySelector("[data-sgt-count]")?.textContent||"";}
  function titleText(){return document.querySelector("[data-sgt-title]")?.textContent||"Prueba el control";}

  function findTarget(){
    return document.querySelector(".sg-tutorial-target") || null;
  }

  function markPracticed(){
    if(!active||practiced)return;
    practiced=true;
    const done=bar?.querySelector(".sg-tutorial-practice-done");
    const hint=bar?.querySelector(".sg-tutorial-practice-copy span");
    if(done){done.classList.add("is-practiced");done.textContent="Listo, seguir →";}
    if(hint)hint.textContent="Perfecto. Ya puedes volver y seguir con la explicación.";
  }

  function targetInteracted(event){
    if(!active||!target)return;
    const path=event.composedPath?.()||[];
    if(path.includes(target)||target.contains(event.target))markPracticed();
  }

  function leavePractice(mode){
    if(!active)return;
    active=false;
    document.removeEventListener("pointerup",targetInteracted,true);
    document.removeEventListener("change",targetInteracted,true);
    document.removeEventListener("input",targetInteracted,true);
    target?.classList.remove("sg-tutorial-practice-target");
    target=null;
    bar?.remove();bar=null;
    const ov=overlay();
    ov?.classList.remove("sg-practice-v2");
    if(mode==="next"){
      requestAnimationFrame(()=>nextButton()?.click());
    }
  }

  function enterPractice(event){
    const btn=event.target.closest?.("[data-sgt-try]");
    if(!btn||btn.hidden||active)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const ov=overlay();
    if(!ov||ov.hidden)return;
    active=true;practiced=false;
    target=findTarget();
    if(target){
      target.classList.add("sg-tutorial-practice-target");
      try{target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});}catch(_){ }
    }
    ov.classList.add("sg-practice-v2");

    bar=document.createElement("div");
    bar.className="sg-tutorial-practice-bar";
    bar.setAttribute("role","region");
    bar.setAttribute("aria-label","Modo de práctica del tutorial");
    bar.innerHTML=`<div class="sg-tutorial-practice-copy"><b>FORTISSIMO · PRÁCTICA ${countText()}</b><strong>${escapeHtml(titleText())}</strong><span>${target?"Prueba el control iluminado. Cuando termines, toca Listo, seguir.":"Prueba lo que acabamos de explicar. Puedes volver cuando quieras."}</span></div><div class="sg-tutorial-practice-actions"><button type="button" class="sg-tutorial-practice-back">← Volver</button><button type="button" class="sg-tutorial-practice-done">Listo, seguir →</button></div>`;
    document.body.appendChild(bar);
    bar.querySelector(".sg-tutorial-practice-back").addEventListener("click",()=>leavePractice("same"));
    bar.querySelector(".sg-tutorial-practice-done").addEventListener("click",()=>leavePractice("next"));
    document.addEventListener("pointerup",targetInteracted,true);
    document.addEventListener("change",targetInteracted,true);
    document.addEventListener("input",targetInteracted,true);
  }

  function escapeHtml(value){return String(value??"").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));}

  document.addEventListener("click",enterPractice,true);
  document.addEventListener("keydown",event=>{
    if(!active)return;
    if(event.key==="Escape"){event.preventDefault();leavePractice("same");}
  },true);
})();
