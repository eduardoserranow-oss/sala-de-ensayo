(function(){
  "use strict";

  const FULL_DURATION = 1480;
  const HANDOFF_DURATION = 360;
  const VERSION = "forte-launch3";

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
    const paths=[...target.querySelectorAll(".forte-launch-logo path")];
    paths.forEach((path,index)=>{
      let length=1000;
      try{ length=Math.max(1,path.getTotalLength()); }catch(_){ }
      path.style.setProperty("--path-length",String(length));
      path.style.setProperty("--path-delay",`${index < 5 ? index*55 : 250+(index-5)*48}ms`);
    });
  }

  function officialLogoSvg(){
    // Exact geometry from assets/forte-logo-white.svg. It is inlined only so
    // the official paths can be animated; no geometry is redrawn or altered.
    return `<svg class="forte-launch-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 240" role="img" aria-label="FORTE">
      <g transform="translate(12 10) scale(.86)">
        <path class="forte-path forte-path-orange" fill="#FF5A00" d="M8 220v-20l26-12v32z"/>
        <path class="forte-path forte-path-white" fill="#FFFFFF" d="M46 220v-42l28-15v57zM86 220v-75l28-15v90zM126 220V106l28-16v130zM162 220V105h-16V80h16V66c0-31 19-48 52-48h26v29h-24c-18 0-26 8-26 22v11h42v25h-42v115z"/>
      </g>
      <g fill="#FFFFFF">
        <path class="forte-path forte-path-white" fill-rule="evenodd" d="M290 40h130l28 28v104l-28 28H290l-28-28V68zm30 38-12 12v60l12 12h70l12-12V90l-12-12z"/>
        <path class="forte-path forte-path-white" fill-rule="evenodd" d="M475 40h128c36 0 57 20 57 51 0 25-13 42-37 49l47 60h-55l-41-55h-52v55h-47zm47 38v31h73c12 0 18-5 18-16 0-10-6-15-18-15z"/>
        <path class="forte-path forte-path-white" d="M680 40h190v40h-71v120h-48V80h-71z"/>
        <path class="forte-path forte-path-white" d="M894 40h194v38H942v24h124v36H942v24h146v38H894z"/>
      </g>
    </svg>`;
  }

  function installStyles(){
    const style=document.createElement("style");
    style.id="forteLaunchV3Styles";
    style.textContent=`
      .forte-launch-v3{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:#050505;opacity:1;visibility:visible;pointer-events:auto;isolation:isolate;-webkit-transform:translateZ(0);transform:translateZ(0)}
      .forte-launch-v3.is-hidden{display:none!important}
      .forte-launch-logo-stage{position:relative;z-index:4;width:min(560px,78vw);max-width:calc(100vw - 44px);display:grid;place-items:center;transform:translateZ(0)}
      .forte-launch-logo{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 0 0 rgba(255,255,255,0));transform:translateZ(0)}
      .forte-launch-logo .forte-path{stroke-linecap:round;stroke-linejoin:round;paint-order:stroke fill;stroke-width:2.1;stroke-dasharray:var(--path-length);stroke-dashoffset:var(--path-length);fill-opacity:0;transition:stroke-dashoffset .48s cubic-bezier(.22,1,.36,1) var(--path-delay),fill-opacity .28s ease calc(var(--path-delay) + .25s),stroke-opacity .25s ease calc(var(--path-delay) + .35s)}
      .forte-launch-logo .forte-path-white{stroke:#fff;fill:#fff}
      .forte-launch-logo .forte-path-orange{stroke:#ff5a00;fill:#ff5a00}
      .forte-launch-v3.is-drawing .forte-path{stroke-dashoffset:0}
      .forte-launch-v3.is-filled .forte-path{stroke-dashoffset:0;fill-opacity:1;stroke-opacity:.30}
      .forte-launch-v3.is-settled .forte-path{fill-opacity:1;stroke-opacity:0;transition:stroke-opacity .18s ease,fill-opacity .18s ease}
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
      .forte-launch-v3.is-finished{opacity:0;pointer-events:none;transition:opacity .22s cubic-bezier(.4,0,.2,1)}

      @media(max-width:760px){
        .forte-launch-logo-stage{width:min(360px,76vw);max-width:calc(100vw - 48px)}
        .forte-launch-glow-white{width:76vw;height:28vw;max-height:150px}
        .forte-launch-glow-orange{width:88vw;height:38vw;max-height:210px}
        .forte-launch-floor-glow{top:64%;width:58vw}
      }
      @media(prefers-reduced-motion:reduce){
        .forte-launch-logo .forte-path{transition:none!important;stroke-dashoffset:0!important;fill-opacity:1!important;stroke-opacity:0!important}
        .forte-launch-glow-white{opacity:.08!important;transform:translate(-50%,-50%) scale(1)!important}
        .forte-launch-glow-orange{opacity:.12!important;transform:translate(-50%,-50%) scale(1)!important}
        .forte-launch-floor-glow{opacity:.08!important;transform:translateX(-50%) scaleX(.8)!important}
        .forte-launch-v3.is-finished{transition:opacity .12s linear!important}
      }
    `;
    document.head.appendChild(style);
  }

  function wait(ms){ return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms))); }
  function nextPaint(){ return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); }
})();
