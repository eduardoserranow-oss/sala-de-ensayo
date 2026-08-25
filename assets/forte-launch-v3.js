(function(){
"use strict";

const FULL_DURATION=3600;
const HANDOFF_DURATION=900;
const VERSION="fortissimo-launch4";
const ICON_ART="assets/fortissimo-launch-isotype.svg?v=fortissimo-launch4";
const LOGO_ART="assets/fortissimo-header-logo-v6.jpg?v=fortissimo-launch4";
let assetsReady=null;

window.ForteLaunch={version:VERSION,mount,playFull,playHandoff,hide,wait};

function mount(target){
  if(!target)return null;
  if(!document.getElementById("forteLaunchV3Styles"))installStyles();
  target.classList.add("forte-launch-v3");
  target.innerHTML=`<div class="fortissimo-launch-stage" role="img" aria-label="FORTISSIMO — Gym for Musician"><div class="fortissimo-launch-glow" aria-hidden="true"></div><div class="fortissimo-launch-haze" aria-hidden="true"></div><img class="fortissimo-launch-piece fortissimo-launch-icon" src="${ICON_ART}" alt="" draggable="false" aria-hidden="true"><div class="fortissimo-launch-piece fortissimo-launch-wordmark" aria-hidden="true"></div></div>`;
  return target;
}

async function playFull(target){
  if(!target)return;
  mount(target);
  target.classList.remove("is-hidden","is-handoff","is-finished","is-glow-in","is-icon-in","is-word-in","is-settled","is-revealing");
  target.classList.add("is-active","is-full");
  await preloadAssets();
  await nextPaint();
  setTimeout(()=>target.classList.add("is-glow-in"),120);
  setTimeout(()=>target.classList.add("is-icon-in"),360);
  setTimeout(()=>target.classList.add("is-word-in"),1120);
  setTimeout(()=>target.classList.add("is-settled"),1740);
  setTimeout(()=>target.classList.add("is-revealing"),2520);
  await wait(FULL_DURATION);
}

async function playHandoff(target){
  if(!target)return;
  mount(target);
  target.classList.remove("is-hidden","is-full","is-finished","is-revealing");
  target.classList.add("is-active","is-handoff","is-glow-in","is-icon-in","is-word-in","is-settled");
  await preloadAssets();
  await nextPaint();
  setTimeout(()=>target.classList.add("is-revealing"),320);
  await wait(HANDOFF_DURATION);
}

function hide(target,duration){
  if(!target)return;
  target.classList.add("is-finished");
  const requested=Number.isFinite(duration)?duration:520;
  const ms=Math.max(480,requested);
  setTimeout(()=>{
    target.classList.add("is-hidden");
    target.classList.remove("is-active","is-full","is-handoff","is-glow-in","is-icon-in","is-word-in","is-settled","is-revealing","is-finished");
  },ms+40);
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
.forte-launch-v3{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:rgba(0,0,0,1);opacity:1;visibility:visible;pointer-events:auto;isolation:isolate;transform:translateZ(0);backdrop-filter:blur(0) brightness(1);-webkit-backdrop-filter:blur(0) brightness(1);transition:background .9s cubic-bezier(.22,1,.36,1),backdrop-filter .9s ease,-webkit-backdrop-filter .9s ease}
.forte-launch-v3.is-active.is-hidden{display:grid!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
.forte-launch-v3.is-hidden:not(.is-active){display:none!important}
.fortissimo-launch-stage{position:relative;width:min(470px,90vw);min-height:min(500px,72svh);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;transform:translate3d(0,-1.5svh,0) scale(1);overflow:visible;transition:transform 1s cubic-bezier(.22,1,.36,1),opacity .8s ease}
.fortissimo-launch-glow{position:absolute;z-index:-2;left:50%;top:45%;width:min(350px,72vw);aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle at 30% 34%,rgba(38,246,220,.92) 0,rgba(38,246,220,.38) 17%,transparent 42%),radial-gradient(circle at 68% 34%,rgba(58,108,255,.90) 0,rgba(58,108,255,.36) 20%,transparent 48%),radial-gradient(circle at 58% 72%,rgba(168,72,255,.84) 0,rgba(168,72,255,.34) 20%,transparent 48%),radial-gradient(circle at 35% 72%,rgba(255,92,29,.55) 0,rgba(255,92,29,.20) 18%,transparent 46%);filter:blur(34px) saturate(1.35);mix-blend-mode:screen;opacity:0;transform:translate(-50%,-50%) scale(.52) rotate(-12deg);will-change:transform,opacity,filter}
.fortissimo-launch-haze{position:absolute;z-index:-1;left:50%;top:46%;width:min(410px,82vw);aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.07),rgba(68,98,255,.035) 38%,transparent 69%);filter:blur(22px);opacity:0;transform:translate(-50%,-50%) scale(.75)}
.forte-launch-v3.is-glow-in .fortissimo-launch-glow{opacity:.70;transform:translate(-50%,-50%) scale(1) rotate(0deg);transition:opacity 1.05s ease,transform 1.6s cubic-bezier(.22,1,.36,1)}
.forte-launch-v3.is-glow-in .fortissimo-launch-haze{opacity:1;transform:translate(-50%,-50%) scale(1);transition:opacity 1s ease,transform 1.5s cubic-bezier(.22,1,.36,1)}
.forte-launch-v3 .fortissimo-launch-piece{will-change:transform,opacity,filter,clip-path;opacity:0}
.forte-launch-v3 .fortissimo-launch-icon{display:block!important;width:min(158px,38vw)!important;max-width:none!important;height:auto!important;object-fit:contain!important;border:0!important;border-radius:0!important;box-shadow:none!important;clip-path:circle(2% at 50% 54%);transform:translate3d(-11px,17px,0) rotate(-7deg) scale(.76);filter:blur(7px) brightness(1.16) drop-shadow(0 12px 34px rgba(0,0,0,.46));user-select:none;-webkit-user-drag:none}
.forte-launch-v3 .fortissimo-launch-wordmark{width:min(410px,85vw);aspect-ratio:4.46/1;background-image:url('${LOGO_ART}');background-repeat:no-repeat;background-size:139.2% auto;background-position:right center;clip-path:inset(0 49% 0 49% round 8px);transform:translate3d(0,13px,0) scale(.965);filter:blur(8px)}
.forte-launch-v3.is-icon-in .fortissimo-launch-icon{opacity:1;clip-path:circle(76% at 50% 50%);transform:translate3d(0,0,0) rotate(0deg) scale(1);filter:blur(0) brightness(1) drop-shadow(0 16px 38px rgba(0,0,0,.44));transition:opacity .36s ease,clip-path 1.05s cubic-bezier(.22,1,.36,1),transform 1.2s cubic-bezier(.18,.9,.2,1.08),filter .8s ease}
.forte-launch-v3.is-word-in .fortissimo-launch-wordmark{opacity:1;clip-path:inset(0 0 0 0 round 0);transform:translate3d(0,0,0) scale(1);filter:blur(0);transition:opacity .46s ease,clip-path .95s cubic-bezier(.22,1,.36,1),transform .9s cubic-bezier(.22,1,.36,1),filter .7s ease}
.forte-launch-v3.is-settled .fortissimo-launch-glow{animation:fortissimoAuraBreathe 3.2s ease-in-out infinite alternate}
.forte-launch-v3.is-settled .fortissimo-launch-icon{animation:fortissimoIconFloat 2.7s ease-in-out infinite alternate}
.forte-launch-v3.is-settled .fortissimo-launch-stage{transform:translate3d(0,-1.8svh,0) scale(1.006)}
@keyframes fortissimoAuraBreathe{0%{filter:blur(34px) saturate(1.25);transform:translate(-50%,-50%) scale(.98) rotate(-2deg)}100%{filter:blur(39px) saturate(1.52);transform:translate(-50%,-50%) scale(1.09) rotate(5deg)}}
@keyframes fortissimoIconFloat{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(0,-4px,0) scale(1.012)}}
.forte-launch-v3.is-revealing{background:rgba(0,0,0,.48);backdrop-filter:blur(1.5px) brightness(.82);-webkit-backdrop-filter:blur(1.5px) brightness(.82)}
.forte-launch-v3.is-revealing .fortissimo-launch-stage{transform:translate3d(0,-2.8svh,0) scale(.975);opacity:.88}
.forte-launch-v3.is-revealing .fortissimo-launch-glow{opacity:.40!important}
.forte-launch-v3.is-revealing .fortissimo-launch-wordmark{opacity:.72!important}
.forte-launch-v3.is-finished{opacity:0!important;background:rgba(0,0,0,0)!important;pointer-events:none!important;backdrop-filter:blur(0) brightness(1)!important;-webkit-backdrop-filter:blur(0) brightness(1)!important;transition:opacity .52s cubic-bezier(.4,0,.2,1),background .52s ease!important}
.forte-launch-v3.is-handoff .fortissimo-launch-piece{opacity:1;clip-path:none;filter:none;transform:none}
@media(max-width:760px){.fortissimo-launch-stage{width:min(430px,92vw);min-height:min(455px,68svh);gap:27px}.fortissimo-launch-glow{width:min(320px,76vw);top:44%}.fortissimo-launch-haze{width:min(370px,88vw);top:45%}.forte-launch-v3 .fortissimo-launch-icon{width:min(146px,37vw)!important}.forte-launch-v3 .fortissimo-launch-wordmark{width:min(350px,82vw)}}
@media(min-width:761px){.fortissimo-launch-stage{width:min(510px,43vw);min-height:min(520px,72vh)}.fortissimo-launch-glow{width:min(390px,32vw)}.forte-launch-v3 .fortissimo-launch-icon{width:min(170px,14vw)!important}.forte-launch-v3 .fortissimo-launch-wordmark{width:min(430px,37vw)}}
@media(prefers-reduced-motion:reduce){.forte-launch-v3 .fortissimo-launch-glow,.forte-launch-v3 .fortissimo-launch-haze,.forte-launch-v3 .fortissimo-launch-piece,.forte-launch-v3 .fortissimo-launch-stage{animation:none!important;transition:none!important}.forte-launch-v3 .fortissimo-launch-glow{opacity:.42!important;transform:translate(-50%,-50%) scale(1)!important}.forte-launch-v3 .fortissimo-launch-haze{opacity:1!important}.forte-launch-v3 .fortissimo-launch-piece{opacity:1!important;clip-path:none!important;filter:none!important;transform:none!important}.forte-launch-v3.is-finished{transition:opacity .12s linear!important}}
`;
  document.head.appendChild(style);
}

function wait(ms){return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));}
function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
})();
