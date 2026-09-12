(function(){
  "use strict";
  const BASE="https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/fortissimo-home-artwork-drafts/";
  const COVERS={
    ear:{path:"soundgym/current/ear.png",panX:0,panY:0,zoom:0},
    vocal:{path:"soundgym/current/vocal.png",panX:0,panY:0,zoom:0},
    "guitar-notes":{path:"soundgym/current/guitar-notes.png",panX:0,panY:0,zoom:0}
  };
  const LIMIT=200,ZOOM_RATIO=2.5;
  const clamp=(v,min=-LIMIT,max=LIMIT)=>Math.max(min,Math.min(max,Number(v)||0));
  const scaleFor=f=>1.01*Math.pow(ZOOM_RATIO,clamp(f.zoom)/LIMIT);
  function apply(){
    Object.entries(COVERS).forEach(([id,f])=>{
      const card=document.querySelector(`.world[data-world="${CSS.escape(id)}"]`);
      const cover=card?.querySelector(".cover");
      if(!cover)return;
      cover.style.setProperty("background-image",`url("${BASE+f.path}")`,`important`);
      cover.style.setProperty("background-size","cover","important");
      cover.style.setProperty("background-repeat","no-repeat","important");
      cover.style.setProperty("background-position","50% 50%","important");
      cover.style.setProperty("transform",`translate3d(${clamp(f.panX)*.22}%,${clamp(f.panY)*.22}%,0) scale(${scaleFor(f)})`,`important`);
      cover.style.setProperty("transform-origin","50% 50%","important");
      card.dataset.globalCover="1";
    });
  }
  apply();
  requestAnimationFrame(apply);
  [80,220,500,1000].forEach(ms=>setTimeout(apply,ms));
})();
