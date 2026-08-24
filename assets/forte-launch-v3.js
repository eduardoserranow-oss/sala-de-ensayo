(function(){
  "use strict";

  const FULL_DURATION = 1480;
  const HANDOFF_DURATION = 360;
  const VERSION = "forte-flex1";

  window.ForteLaunch = {
    version: VERSION,
    mount,
    playFull,
    playHandoff,
    hide,
    wait
  };

  function mount(target){
    if(!target) return null;
    if(!document.getElementById("forteLaunchV3Styles")) installStyles();
    target.classList.add("forte-launch-v3");
    target.innerHTML = `
      <div class="forte-launch-glow forte-launch-glow-white" aria-hidden="true"></div>
      <div class="forte-launch-glow forte-launch-glow-orange" aria-hidden="true"></div>
      <div class="forte-launch-floor-glow" aria-hidden="true"></div>
      <div class="forte-launch-logo-stage" aria-hidden="true">
        ${officialLogoSvg()}
      </div>
    `;
    preparePaths(target);
    return target;
  }

  async function playFull(target){
    if(!target) return;
    mount(target);
    target.classList.remove("is-hidden","is-handoff","is-finished");
    target.classList.add("is-active","is-full");
    await nextPaint();
    target.classList.add("is-drawing");
    setTimeout(()=>target.classList.add("is-glowing"),260);
    setTimeout(()=>target.classList.add("is-filled"),690);
    setTimeout(()=>target.classList.add("is-settled"),1020);
    await wait(FULL_DURATION);
  }

  async function playHandoff(target){
    if(!target) return;
    mount(target);
    target.classList.remove("is-hidden","is-full","is-finished");
    target.classList.add("is-active","is-handoff","is-filled","is-settled");
    await nextPaint();
    await wait(HANDOFF_DURATION);
  }

  function hide(target, duration){
    if(!target) return;
    target.classList.add("is-finished");
    const ms = Number.isFinite(duration) ? duration : 220;
    setTimeout(()=>{
      target.classList.add("is-hidden");
      target.classList.remove("is-active","is-full","is-handoff","is-drawing","is-glowing","is-filled","is-settled","is-finished");
    },ms+30);
  }

  function preparePaths(target){
    const paths=[...target.querySelectorAll(".forte-launch-logo .forte-path")];
    paths.forEach((path,index)=>{
      let length=1000;
      try{ length=Math.max(1,path.getTotalLength()); }catch(_){ }
      path.style.setProperty("--path-length",String(length));
      path.style.setProperty("--path-delay",`${index < 5 ? index*55 : 250+(index-5)*48}ms`);
    });
  }

  function officialLogoSvg(){
    return `<svg class="forte-launch-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 220" role="img" aria-label="FORTE">
      <g class="forte-launch-mark" transform="translate(8 0) scale(.39)">
        <path class="forte-path forte-path-orange forte-line" d="M247 294c-38 1-67-4-91-18-24-14-38-33-40-56" fill="none" stroke="#ff5a00" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="forte-path forte-path-orange forte-line" d="M273 294c38 1 67-4 91-18 24-14 38-33 40-56" fill="none" stroke="#ff5a00" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="forte-path forte-path-orange" fill="#ff5a00" d="M88 221c-7-14-4-32 8-43l10-9-7-8c-7-8-6-21 2-28 8-7 20-6 27 2l8 9 5-4c8-7 21-6 28 2 7 9 6 21-2 28l-9 8c13 9 21 22 23 37l-31 18-34 1z"/>
        <path class="forte-path forte-path-orange" fill="#ff5a00" d="M432 221c7-14 4-32-8-43l-10-9 7-8c7-8 6-21-2-28-8-7-20-6-27 2l-8 9-5-4c-8-7-21-6-28 2-7 9-6 21 2 28l9 8c-13 9-21 22-23 37l31 18 34 1z"/>
        <ellipse class="forte-path forte-path-orange" fill="#ff5a00" cx="159" cy="270" rx="43" ry="34"/><ellipse class="forte-path forte-path-orange" fill="#ff5a00" cx="361" cy="270" rx="43" ry="34"/>
        <path class="forte-path forte-path-white forte-line" d="M354 60c-29-24-78-17-101 26-20 38-28 92-40 150l-49 226c-9 43-27 70-53 76-22 5-39-7-38-27" fill="none" stroke="#fff" stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <path class="forte-path forte-path-orange" fill="#ff5a00" d="M232 28h4v164h-4z"/>
      <g fill="#fff" transform="translate(275 30) skewX(-10) scale(.9 1)">
        <path class="forte-path forte-path-white" d="M0 0h152v34H42v30h95v34H42v62H0z"/>
        <path class="forte-path forte-path-white" fill-rule="evenodd" d="M175 0h118l30 30v100l-30 30H175l-30-30V30zm42 36-12 12v64l12 12h35l12-12V48l-12-12z"/>
        <path class="forte-path forte-path-white" fill-rule="evenodd" d="M343 0h129c34 0 54 19 54 49 0 23-12 40-35 47l45 64h-51l-39-57h-61v57h-42zm42 35v34h78c13 0 19-6 19-17s-6-17-19-17z"/>
        <path class="forte-path forte-path-white" d="M541 0h171v37h-64v123h-43V37h-64zM730 0h164v35H772v27h105v34H772v29h126v35H730z"/>
      </g>
    </svg>`;
  }

  function installStyles(){
    const style=document.createElement("style");
    style.id="forteLaunchV3Styles";
    style.textContent=`
      .forte-launch-v3{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:#050505;opacity:1;visibility:visible;pointer-events:auto;isolation:isolate;-webkit-transform:translateZ(0);transform:translateZ(0)}
      .forte-launch-v3.is-active.is-hidden{display:grid!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
      .forte-launch-v3.is-hidden:not(.is-active){display:none!important}
      .forte-launch-logo-stage{position:relative;z-index:4;width:min(560px,78vw);max-width:calc(100vw - 44px);display:grid;place-items:center;transform:translateZ(0)}
      .forte-launch-logo{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 0 0 rgba(255,255,255,0));transform:translateZ(0)}
      .forte-launch-logo .forte-path{stroke-linecap:round;stroke-linejoin:round;paint-order:stroke fill;stroke-width:2.1;stroke-dasharray:var(--path-length);stroke-dashoffset:var(--path-length);fill-opacity:0;transition:stroke-dashoffset .48s cubic-bezier(.22,1,.36,1) var(--path-delay),fill-opacity .28s ease calc(var(--path-delay) + .25s),stroke-opacity .25s ease calc(var(--path-delay) + .35s)}
      .forte-launch-logo .forte-path-white{stroke:#fff;fill:#fff}
      .forte-launch-logo .forte-path-orange{stroke:#ff5a00;fill:#ff5a00}
      .forte-launch-logo .forte-line{fill:none!important}
      .forte-launch-v3.is-drawing .forte-path{stroke-dashoffset:0}
      .forte-launch-v3.is-filled .forte-path{stroke-dashoffset:0;fill-opacity:1;stroke-opacity:.30}
      .forte-launch-v3.is-settled .forte-path{fill-opacity:1;stroke-opacity:0;transition:stroke-opacity .18s ease,fill-opacity .18s ease}
      .forte-launch-v3.is-filled .forte-line,.forte-launch-v3.is-settled .forte-line,.forte-launch-v3.is-handoff .forte-line{stroke-opacity:1}
      .forte-launch-v3.is-settled .forte-launch-logo{animation:forteLogoSettle .38s cubic-bezier(.22,1,.36,1) both}
      @keyframes forteLogoSettle{0%{transform:scale(.992)}100%{transform:scale(1)}}
      .forte-launch-glow{position:absolute;z-index:1;left:50%;top:54%;border-radius:50%;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.55);will-change:transform,opacity,filter}
      .forte-launch-glow-white{width:min(430px,72vw);height:min(170px,26vw);background:radial-gradient(ellipse at center,rgba(255,255,255,.18) 0%,rgba(255,255,255,.07) 32%,rgba(255,255,255,0) 72%);filter:blur(24px)}
      .forte-launch-glow-orange{width:min(520px,82vw);height:min(230px,34vw);top:62%;background:radial-gradient(ellipse at center,rgba(255,90,0,.30) 0%,rgba(255,90,0,.12) 30%,rgba(255,90,0,0) 72%);filter:blur(30px)}
      .forte-launch-floor-glow{position:absolute;z-index:2;left:50%;top:67%;width:min(360px,62vw);height:2px;transform:translateX(-50%) scaleX(.08);transform-origin:center;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(255,117,35,.95),rgba(255,255,255,.88),rgba(255,117,35,.95),transparent);box-shadow:0 0 8px rgba(255,255,255,.42),0 0 22px rgba(255,90,0,.62),0 0 54px rgba(255,90,0,.28);opacity:0;will-change:transform,opacity}
      .forte-launch-v3.is-glowing .forte-launch-glow-white{animation:forteGlowWhite .62s cubic-bezier(.22,1,.36,1) both}
      .forte-launch-v3.is-glowing .forte-launch-glow-orange{animation:forteGlowOrange .78s cubic-bezier(.22,1,.36,1) .08s both}
      .forte-launch-v3.is-glowing .forte-launch-floor-glow{animation:forteFloorFlash .62s cubic-bezier(.22,1,.36,1) .12s both}
      @keyframes forteGlowWhite{0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}45%{opacity:.74}100%{opacity:.16;transform:translate(-50%,-50%) scale(1.08)}}
      @keyframes forteGlowOrange{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}48%{opacity:.88}100%{opacity:.22;transform:translate(-50%,-50%) scale(1.18)}}
      @keyframes forteFloorFlash{0%{opacity:0;transform:translateX(-50%) scaleX(.08)}42%{opacity:1;transform:translateX(-50%) scaleX(1)}100%{opacity:.18;transform:translateX(-50%) scaleX(1.2)}}
      .forte-launch-v3.is-handoff .forte-path{stroke-dashoffset:0;fill-opacity:1;stroke-opacity:0}
      .forte-launch-v3.is-handoff .forte-launch-glow-orange{opacity:.16;transform:translate(-50%,-50%) scale(1.08)}
      .forte-launch-v3.is-handoff .forte-launch-glow-white{opacity:.08;transform:translate(-50%,-50%) scale(1)}
      .forte-launch-v3.is-handoff .forte-launch-floor-glow{opacity:.10;transform:translateX(-50%) scaleX(.9)}
      .forte-launch-v3.is-finished{opacity:0!important;pointer-events:none!important;transition:opacity .22s cubic-bezier(.4,0,.2,1)!important}
      @media(max-width:760px){.forte-launch-logo-stage{width:min(360px,76vw);max-width:calc(100vw - 48px)}.forte-launch-glow-white{width:76vw;height:28vw;max-height:150px}.forte-launch-glow-orange{width:88vw;height:38vw;max-height:210px}.forte-launch-floor-glow{top:64%;width:58vw}}
      @media(prefers-reduced-motion:reduce){.forte-launch-logo .forte-path{transition:none!important;stroke-dashoffset:0!important;fill-opacity:1!important;stroke-opacity:0!important}.forte-launch-glow-white{opacity:.08!important;transform:translate(-50%,-50%) scale(1)!important}.forte-launch-glow-orange{opacity:.12!important;transform:translate(-50%,-50%) scale(1)!important}.forte-launch-floor-glow{opacity:.08!important;transform:translateX(-50%) scaleX(.8)!important}.forte-launch-v3.is-finished{transition:opacity .12s linear!important}}
    `;
    document.head.appendChild(style);
  }

  function wait(ms){ return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms))); }
  function nextPaint(){ return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); }
})();
