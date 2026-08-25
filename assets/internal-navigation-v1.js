(function(){
  "use strict";

  const RETURN_TARGET_KEY="fortissimo.home.returnTarget.v1";
  const RETURN_SCROLL_KEY="fortissimo.home.returnScrollY.v1";
  const SG_LAST_GAME_KEY="fortissimo.soundgym.lastGame.v1";
  const SG_MENU_SCROLL_KEY="fortissimo.soundgym.menuScrollY.v1";

  function setHomeReturnTarget(target){
    try{
      sessionStorage.setItem(RETURN_TARGET_KEY,target);
      sessionStorage.setItem(RETURN_SCROLL_KEY,String(window.scrollY||0));
    }catch(_){ }
  }

  function homeUrl(target){
    return `./?return=${encodeURIComponent(target)}&internal=1`;
  }

  const routineInstrument=document.body?.dataset?.instrument;
  if(routineInstrument==="guitar"||routineInstrument==="bass"){
    const target=routineInstrument;
    document.querySelectorAll(".home-link,.routine-logo-link").forEach(link=>{
      link.href=homeUrl(target);
      link.addEventListener("click",()=>setHomeReturnTarget(target));
    });
    return;
  }

  const sgBack=document.querySelector(".sg-back");
  if(!sgBack) return;

  sgBack.href=homeUrl("soundgym");

  function getLastGame(){
    try{return sessionStorage.getItem(SG_LAST_GAME_KEY)||"";}catch(_){return "";}
  }

  function saveGameOrigin(gameId){
    if(!gameId) return;
    try{
      sessionStorage.setItem(SG_LAST_GAME_KEY,gameId);
      sessionStorage.setItem(SG_MENU_SCROLL_KEY,String(window.scrollY||0));
    }catch(_){ }
  }

  function activeTrainer(){
    return document.querySelector(".sg-trainer.show");
  }

  function scrollBackToGame(){
    const gameId=getLastGame();
    const card=gameId?document.querySelector(`.sg-game[data-game="${CSS.escape(gameId)}"]`):null;
    if(card){
      requestAnimationFrame(()=>card.scrollIntoView({behavior:"smooth",block:"center"}));
      return;
    }
    let y=0;
    try{y=Number(sessionStorage.getItem(SG_MENU_SCROLL_KEY))||0;}catch(_){ }
    requestAnimationFrame(()=>window.scrollTo({top:y,behavior:"smooth"}));
  }

  function closeCurrentGame(){
    const trainer=activeTrainer();
    if(!trainer) return false;
    const close=trainer.querySelector(".sg-trainer-close");
    if(close) close.click();
    else trainer.classList.remove("show");
    scrollBackToGame();
    return true;
  }

  // Register the origin before any individual game handler can stop propagation.
  window.addEventListener("click",event=>{
    const card=event.target.closest?.(".sg-game[data-game]");
    if(!card) return;
    saveGameOrigin(card.dataset.game);
    try{
      const hash=`#game=${encodeURIComponent(card.dataset.game)}`;
      if(!history.state?.fortissimoSoundGymGame){
        history.pushState({fortissimoSoundGymGame:card.dataset.game},"",hash);
      }else{
        history.replaceState({fortissimoSoundGymGame:card.dataset.game},"",hash);
      }
    }catch(_){ }
  },true);

  sgBack.addEventListener("click",event=>{
    if(activeTrainer()){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(history.state?.fortissimoSoundGymGame){
        history.back();
      }else{
        closeCurrentGame();
      }
      return;
    }
    setHomeReturnTarget("soundgym");
  },true);

  window.addEventListener("popstate",()=>{
    if(activeTrainer()) closeCurrentGame();
  });

  // If a game is closed with its X button, normalize the URL so the next Back exits SoundGym.
  window.addEventListener("click",event=>{
    const close=event.target.closest?.(".sg-trainer-close");
    if(!close) return;
    requestAnimationFrame(()=>{
      if(!activeTrainer()){
        try{history.replaceState(null,"",location.pathname+location.search);}catch(_){ }
        scrollBackToGame();
      }
    });
  },true);
})();
