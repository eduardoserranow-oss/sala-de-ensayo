(function(){
  "use strict";

  const LIMIT=200;
  const ZOOM_RATIO=2.5;
  const STORAGE_BASE="https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/fortissimo-home-artwork-drafts/";

  // Approved Home artwork state captured from the temporary editor on 2026-09-12.
  const FRAMES={
    guitar:{
      mobile:{x:58,y:62,zoom:110}
    },
    bass:{
      mobile:{x:50,y:50,panX:-3.5431467692057232,panY:-62.20926094959131,zoom:122,zoomFine:-133.01015971283653},
      desktop:{x:0,y:0,panX:-16.79488288031684,panY:-8,zoom:102,zoomFine:-146}
    },
    vocal:{
      desktop:{x:79,y:41,zoom:102}
    },
    studypaths:{
      mobile:{x:50,y:50,panX:104,panY:119,zoom:118,zoomFine:39}
    },
    soundgym:{
      mobile:{x:50,y:50,panX:5,panY:4,zoom:122,zoomFine:-190},
      desktop:{x:50,y:50,panX:0,panY:0,zoom:122,zoomFine:-154}
    },
    referencefinder:{
      mobile:{x:50,y:50,panX:-3,panY:-27,zoom:122,zoomFine:-144},
      desktop:{x:50,y:50,panX:9,panY:-33.23077392578125,zoom:122,zoomFine:-135}
    },
    vibe:{
      mobile:{x:50,y:50,panX:1,panY:-34,zoom:122,zoomFine:-184}
    }
  };

  const IMAGES={
    bass:{mobile:"current/bass:mobile.jpeg"},
    studypaths:{mobile:"current/studypaths:mobile.png",desktop:"current/studypaths.jpeg"},
    referencefinder:{mobile:"current/referencefinder:mobile.png",desktop:"current/referencefinder:desktop.png"},
    vibe:{mobile:"current/vibe:mobile.png"}
  };

  function removeLegacyVibeCircle(){
    if(document.getElementById("vibeLegacyCircleRemoval")) return;
    const style=document.createElement("style");
    style.id="vibeLegacyCircleRemoval";
    style.textContent=`
      .hero-stack .vibe-home-hero::before,
      .hero-stack .feature-vibe::before,
      .hero-stack [data-home-module="vibe"]::before{
        content:none!important;
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(v,min=-LIMIT,max=LIMIT){return Math.max(min,Math.min(max,Number(v)||0));}
  function mode(){return innerWidth<=760?"mobile":"desktop";}
  function scaleFor(frame){
    if(Number.isFinite(Number(frame?.zoomFine))){
      return 1.22*Math.pow(ZOOM_RATIO,clamp(frame.zoomFine)/LIMIT);
    }
    if(Number.isFinite(Number(frame?.zoom))) return Math.max(.05,Number(frame.zoom)/100);
    return 1.22;
  }

  function resolveHero(key){
    let hero=document.querySelector(`[data-home-module="${key}"]`);
    if(hero) return hero;
    if(key==="vocal") return document.querySelector("#openVocal")?.closest(".routine-hero")||null;
    const needles={
      guitar:"guitar-practice.html",bass:"bass-practice.html",studypaths:"study-projects.html",
      soundgym:"sound-gym.html",referencefinder:"reference-finder.html",vibe:"vibe-roulette.html"
    };
    const needle=needles[key];
    if(!needle) return null;
    return [...document.querySelectorAll(".hero-stack .routine-hero")].find(el=>
      [...el.querySelectorAll("a[href]")].some(a=>(a.getAttribute("href")||"").includes(needle))
    )||null;
  }

  function ensureMedia(hero){
    let media=hero?.querySelector(":scope > .media");
    if(!media&&hero){media=document.createElement("div");media.className="media";media.setAttribute("aria-hidden","true");hero.prepend(media);}
    return media;
  }

  function applyOne(key){
    const hero=resolveHero(key);
    if(!hero) return false;
    const media=ensureMedia(hero);
    if(!media) return false;
    const currentMode=mode();
    const frame=FRAMES[key]?.[currentMode];
    if(frame){
      const panX=clamp(frame.panX)*.35;
      const panY=clamp(frame.panY)*.35;
      media.style.setProperty("--art-base-x","50%","important");
      media.style.setProperty("--art-base-y","50%","important");
      media.style.setProperty("--art-x","50%","important");
      media.style.setProperty("--art-y","50%","important");
      media.style.setProperty("--art-pan-x",`${panX}%`,"important");
      media.style.setProperty("--art-pan-y",`${panY}%`,"important");
      media.style.setProperty("--art-scale",String(scaleFor(frame)),"important");
    }
    const imagePath=IMAGES[key]?.[currentMode];
    if(imagePath){
      const url=STORAGE_BASE+imagePath;
      media.style.setProperty("background-image",`url("${url}")`,"important");
      media.style.setProperty("background-size","cover","important");
      media.style.setProperty("background-repeat","no-repeat","important");
      hero.dataset.globalArtwork="1";
    }
    return true;
  }

  function applyAll(){removeLegacyVibeCircle();Object.keys(FRAMES).forEach(applyOne);Object.keys(IMAGES).forEach(k=>{if(!FRAMES[k])applyOne(k);});}

  removeLegacyVibeCircle();
  applyAll();
  requestAnimationFrame(applyAll);
  [80,220,500,900,1600,2600].forEach(ms=>setTimeout(applyAll,ms));
  addEventListener("resize",applyAll,{passive:true});
  addEventListener("orientationchange",()=>setTimeout(applyAll,120),{passive:true});

  const stack=document.querySelector(".hero-stack");
  if(stack){
    const observer=new MutationObserver(()=>requestAnimationFrame(applyAll));
    observer.observe(stack,{childList:true,subtree:true});
  }
})();
