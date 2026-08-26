(function(){
  "use strict";

  const script=document.createElement("script");
  script.src="assets/sound-gym-level2-frequency-regions-v2.js?v=fr2-spectrum2";
  script.dataset.frequencyRegionsV2="1";
  document.head.appendChild(script);

  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-fr2-next]");
    if(!button||!/repetir/i.test(button.textContent||"")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelector('[data-game="frequency-regions"]')?.click();
  },true);
})();
