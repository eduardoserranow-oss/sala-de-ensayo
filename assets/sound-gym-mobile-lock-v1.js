(function(){
  "use strict";

  const mobile=window.matchMedia?.("(max-width: 760px)");
  if(!mobile?.matches) return;

  let correcting=false;

  function lockHorizontalOffset(){
    if(correcting) return;
    const root=document.scrollingElement||document.documentElement;
    const x=window.scrollX||root.scrollLeft||document.body.scrollLeft||0;
    if(Math.abs(x)<1) return;
    correcting=true;
    const y=window.scrollY||root.scrollTop||0;
    root.scrollLeft=0;
    document.documentElement.scrollLeft=0;
    document.body.scrollLeft=0;
    window.scrollTo(0,y);
    requestAnimationFrame(()=>{correcting=false;});
  }

  window.addEventListener("scroll",lockHorizontalOffset,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(lockHorizontalOffset,80),{passive:true});
  window.addEventListener("resize",lockHorizontalOffset,{passive:true});
  document.addEventListener("DOMContentLoaded",lockHorizontalOffset,{once:true});
  lockHorizontalOffset();
})();
