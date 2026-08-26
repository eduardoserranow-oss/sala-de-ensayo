(function(){
  "use strict";
  if(window.__FORTISSIMO_FH_V3_HOTFIX__) return;
  window.__FORTISSIMO_FH_V3_HOTFIX__=true;

  function sync(){
    const trainer=document.getElementById("sgFrequencyHuntTrainer");
    if(!trainer) return;
    const confirm=trainer.querySelector("[data-fh-confirm]");
    if(!confirm) return;
    const ready=trainer.classList.contains("show")&&!trainer.classList.contains("is-loading")&&!trainer.classList.contains("is-reveal")&&!trainer.classList.contains("is-results");
    if(ready) confirm.disabled=false;
  }

  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","disabled"]});
  document.addEventListener("click",()=>requestAnimationFrame(sync),true);
  sync();
})();
