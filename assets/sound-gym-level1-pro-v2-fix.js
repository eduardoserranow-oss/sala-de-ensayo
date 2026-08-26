(function(){
"use strict";
const IDS=["brighter-darker","louder-quieter","bass-mid-treble","left-center-right","clean-distorted","more-less-compressed"];
function keepCardsLive(){IDS.forEach(id=>document.querySelector(`[data-game="${id}"]`)?.classList.add("is-live"));}
function syncTutorialAliases(){const t=document.getElementById("sgLevel1ProTrainer");if(!t)return;const title=(t.querySelector("h2")?.textContent||"").trim();const play=t.querySelector('[data-l1-play="A"]'),track=t.querySelector("[data-l1-pan]");if(title==="Left / Center / Right"){play?.setAttribute("data-lcr-play","");track?.setAttribute("data-lcr-track","");}else{play?.removeAttribute("data-lcr-play");track?.removeAttribute("data-lcr-track");}}
keepCardsLive();syncTutorialAliases();
const observer=new MutationObserver(()=>{keepCardsLive();syncTutorialAliases();});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
})();