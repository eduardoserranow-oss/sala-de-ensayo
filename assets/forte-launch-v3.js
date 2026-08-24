(function(){
"use strict";

const FULL_DURATION=1480;
const HANDOFF_DURATION=360;
const VERSION="fortissimo-launch3";
const ICON_ART="assets/fortissimo-launch-isotype.svg?v=fortissimo-launch3";
const LOGO_ART="assets/fortissimo-header-logo-v6.jpg?v=fortissimo-launch3";
let assetsReady=null;

window.ForteLaunch={version:VERSION,mount,playFull,playHandoff,hide,wait};

function mount(target){
  if(!target)return null;
  if(!document.getElementById("forteLaunchV3Styles"))installStyles();
  target.classList.add("forte-launch-v3");
  target.innerHTML=`<div class="fortissimo-launch-stage" role="img" aria-label="FORTISSIMO — Gym for Musician"><img class="fortissimo-launch-piece fortissimo-launch-icon" src="${ICON_ART}" alt="" draggable="false" aria-hidden="true"><div class="fortissimo-launch-piece fortissimo-launch-wordmark" aria-hidden="true"></div></div>`;
  return target;
}

async function playFull(target){
  if(!target)return;
  mount(target);
  target.classList.remove("is-hidden","is-handoff","is-finished","is-icon-in","is-word-in","is-settled");
  target.classList.add("is-active","is-full");
  await preloadAssets();
  await nextPaint();
  setTimeout(()=>target.classList.add("is-icon-in"),40);
  setTimeout(()=>target.classList.add("is-word-in"),310);
  setTimeout(()=>target.classList.add("is-settled"),920);
  await wait(FULL_DURATION);
}

async function playHandoff(target){
  if(!target)return;
  mount(target);
  target.classList.remove("is-hidden","is-full","is-finished");
  target.classList.add("is-active","is-handoff");
  await preloadAssets();
  target.classList.add("is-icon-in","is-word-in","is-settled");
  await nextPaint();
  await wait(HANDOFF_DURATION);
}

function hide(target,duration){
  if(!target)return;
  target.classList.add("is-finished");
  const ms=Number.isFinite(duration)?duration:220;
  setTimeout(()=>{
    target.classList.add("is-hidden");
    target.classList.remove("is-active","is-full","is-handoff","is-icon-in","is-word-in","is-settled","is-finished");
  },ms+30);
}

function preloadAssets(){
  if(assetsReady)return assetsReady;
  assetsReady=Promise.allSettled([preloadImage(ICON_ART),preloadImage(LOGO_ART)]);
  return assetsReady;
}

function preloadImage(src){
  return new Promise(resolve=>{
    const image=new Image();
    image.decoding="async";
    image.onload=async()=>{
      try{if(image.decode)await image.decode();}catch(_){}
      resolve();
    };
    image.onerror=resolve;
    image.src=src;
  });
}

function installStyles(){
  const style=document.createElement("style");
  style.id="forteLaunchV3Styles";
  style.textContent=`
.forte-launch-v3{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:#000;opacity:1;visibility:visible;pointer-events:auto;isolation:isolate;transform:translateZ(0)}
.forte-launch-v3.is-active.is-hidden{display:grid!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
.forte-launch-v3.is-hidden:not(.is-active){display:none!important}
.fortissimo-launch-stage{position:relative;width:min(460px,88vw);min-height:min(470px,70svh);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:42px;transform:translate3d(0,-1.5svh,0);overflow:visible}
.forte-launch-v3 .fortissimo-launch-piece{will-change:transform,opacity;opacity:0}
.forte-launch-v3 .fortissimo-launch-icon{display:block!important;width:min(166px,39vw)!important;max-width:none!important;height:auto!important;object-fit:contain!important;border:0!important;border-radius:0!important;box-shadow:none!important;transform:translateY(18px) scale(.955);filter:drop-shadow(0 0 22px rgba(255,90,0,.18));user-select:none;-webkit-user-drag:none}
.forte-launch-v3 .fortissimo-launch-wordmark{width:min(420px,86vw);aspect-ratio:4.46/1;background-image:url('${LOGO_ART}');background-repeat:no-repeat;background-size:139.2% auto;background-position:right center;transform:translateY(16px) scale(.982)}
.forte-launch-v3.is-icon-in .fortissimo-launch-icon{opacity:1;transform:translateY(0) scale(1);transition:opacity .32s ease,transform .72s cubic-bezier(.22,1,.36,1)}
.forte-launch-v3.is-word-in .fortissimo-launch-wordmark{opacity:1;transform:translateY(0) scale(1);transition:opacity .34s ease,transform .72s cubic-bezier(.22,1,.36,1)}
.forte-launch-v3.is-settled .fortissimo-launch-stage{animation:fortissimoLaunchSettle .38s cubic-bezier(.22,1,.36,1) both}
@keyframes fortissimoLaunchSettle{0%{transform:translate3d(0,-1.5svh,0) scale(.994)}100%{transform:translate3d(0,-1.5svh,0) scale(1)}}
.forte-launch-v3.is-handoff .fortissimo-launch-piece{opacity:1!important;transform:translateY(0) scale(1)!important}
.forte-launch-v3.is-finished{opacity:0!important;pointer-events:none!important;transition:opacity .22s cubic-bezier(.4,0,.2,1)!important}
@media(max-width:760px){.fortissimo-launch-stage{width:min(430px,92vw);min-height:min(430px,66svh);gap:36px}.forte-launch-v3 .fortissimo-launch-icon{width:min(148px,38vw)!important}.forte-launch-v3 .fortissimo-launch-wordmark{width:min(360px,84vw)}}
@media(min-width:761px){.fortissimo-launch-stage{width:min(500px,42vw);min-height:min(500px,72vh)}.forte-launch-v3 .fortissimo-launch-icon{width:min(176px,15vw)!important}.forte-launch-v3 .fortissimo-launch-wordmark{width:min(440px,38vw)}}
@media(prefers-reduced-motion:reduce){.forte-launch-v3 .fortissimo-launch-piece{transition:none!important;opacity:1!important;transform:none!important}.forte-launch-v3.is-finished{transition:opacity .12s linear!important}}
`;
  document.head.appendChild(style);
}

function wait(ms){return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));}
function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
})();
