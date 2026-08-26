(function(){
  "use strict";

  installAccountScopedSoundGymStorage();
  loadCloudSync();
  loadProductChrome();

  const RETURN_TARGET_KEY="fortissimo.home.returnTarget.v1";
  const RETURN_SCROLL_KEY="fortissimo.home.returnScrollY.v1";
  const SG_LAST_GAME_KEY="fortissimo.soundgym.lastGame.v1";
  const SG_MENU_SCROLL_KEY="fortissimo.soundgym.menuScrollY.v1";

  function loadCloudSync(){
    if(window.FortissimoCloud || document.querySelector('script[data-fortissimo-cloud="v1"]')) return;
    const script=document.createElement("script");
    script.src="assets/fortissimo-cloud-v1.js?v=cloud2";
    script.dataset.fortissimoCloud="v1";
    document.head.appendChild(script);
  }

  function loadProductChrome(){
    const header=document.querySelector(".routine-header,.sg-header,.home-shell .topbar");
    if(header){
      header.classList.add("fortissimo-app-header");
      header.classList.add("topbar");
    }

    const finish=()=>loadInternalTuner();
    if(window.__FORTISSIMO_GLOBAL_HEADER_V1__){
      finish();
      return;
    }

    const existing=document.querySelector('script[data-fortissimo-global-header="v1"]');
    if(existing){
      existing.addEventListener("load",finish,{once:true});
      existing.addEventListener("error",finish,{once:true});
      return;
    }

    const script=document.createElement("script");
    script.src="assets/fortissimo-header-fix.js?v=globalheader1";
    script.dataset.fortissimoGlobalHeader="v1";
    script.async=false;
    script.onload=finish;
    script.onerror=finish;
    document.head.appendChild(script);
  }

  function loadInternalTuner(){
    if(window.__MY_LESSONS_TUNER_MOUNTED__ || document.querySelector('script[data-fortissimo-global-tuner="v1"]')) return;
    const script=document.createElement("script");
    script.src="assets/home-tuner.js?v=tuner4-global1";
    script.dataset.fortissimoGlobalTuner="v1";
    script.onload=()=>{
      if(document.querySelector('script[data-fortissimo-tuner-audio-fix="v1"]')) return;
      const audio=document.createElement("script");
      audio.src="assets/home-tuner-audio-fix.js?v=audiofix1";
      audio.dataset.fortissimoTunerAudioFix="v1";
      document.head.appendChild(audio);
    };
    document.head.appendChild(script);
  }

  function loadRoutineUxPolish(){
    if(window.__FORTISSIMO_ROUTINE_UX_POLISH_V1__ || document.querySelector('script[data-fortissimo-routine-ux="v1"]')) return;
    const script=document.createElement("script");
    script.src="assets/routine-ux-polish-v1.js?v=routineux1";
    script.dataset.fortissimoRoutineUx="v1";
    script.defer=true;
    document.head.appendChild(script);
  }

  function installAccountScopedSoundGymStorage(){
    if(window.__FORTISSIMO_ACCOUNT_SOUNDGYM_STORAGE__) return;
    window.__FORTISSIMO_ACCOUNT_SOUNDGYM_STORAGE__=true;

    const SESSION_KEY="myLessons.localSession";
    const SOUNDGYM_PREFIX="myLessons.soundGym.";
    const ACCOUNT_PREFIX="fortissimo.accountStorage.v1:";
    const OWNER_EMAIL="eduardoserranow@gmail.com";
    const OWNER_USERNAME="serra";
    const proto=Storage.prototype;
    const nativeGet=proto.getItem;
    const nativeSet=proto.setItem;
    const nativeRemove=proto.removeItem;
    const nativeKey=proto.key;

    function readSession(){
      try{
        const raw=nativeGet.call(localStorage,SESSION_KEY)||nativeGet.call(sessionStorage,SESSION_KEY);
        return raw?JSON.parse(raw):null;
      }catch(_){return null;}
    }

    function currentUser(){
      const user=readSession()?.user||{};
      const id=String(user.id||user.email||user.username||"guest").trim().toLowerCase()||"guest";
      return {
        id,
        username:String(user.username||"").trim().toLowerCase(),
        email:String(user.email||"").trim().toLowerCase()
      };
    }

    function isOwner(user){
      return user.email===OWNER_EMAIL||user.username===OWNER_USERNAME;
    }

    function scopedKey(key,userId){
      return `${ACCOUNT_PREFIX}${encodeURIComponent(userId)}:${key}`;
    }

    function shouldScope(storage,key){
      return storage===localStorage&&typeof key==="string"&&key.startsWith(SOUNDGYM_PREFIX);
    }

    function migrateLegacy(){
      const user=currentUser();
      if(user.id==="guest") return;
      const marker=`${ACCOUNT_PREFIX}${encodeURIComponent(user.id)}:soundgym-migrated`;
      if(nativeGet.call(localStorage,marker)==="1") return;

      if(isOwner(user)){
        const legacyKeys=[];
        for(let i=0;i<localStorage.length;i+=1){
          const key=nativeKey.call(localStorage,i);
          if(typeof key==="string"&&key.startsWith(SOUNDGYM_PREFIX)) legacyKeys.push(key);
        }
        legacyKeys.forEach(key=>{
          const target=scopedKey(key,user.id);
          if(nativeGet.call(localStorage,target)!==null) return;
          const value=nativeGet.call(localStorage,key);
          if(value!==null) nativeSet.call(localStorage,target,value);
        });
      }
      nativeSet.call(localStorage,marker,"1");
    }

    migrateLegacy();

    proto.getItem=function(key){
      if(!shouldScope(this,key)) return nativeGet.call(this,key);
      const user=currentUser();
      if(user.id==="guest") return null;
      const target=scopedKey(key,user.id);
      let value=nativeGet.call(this,target);
      if(value===null&&isOwner(user)){
        const legacy=nativeGet.call(this,key);
        if(legacy!==null){
          nativeSet.call(this,target,legacy);
          value=legacy;
        }
      }
      return value;
    };

    proto.setItem=function(key,value){
      if(!shouldScope(this,key)) return nativeSet.call(this,key,value);
      const user=currentUser();
      if(user.id==="guest") return;
      return nativeSet.call(this,scopedKey(key,user.id),String(value));
    };

    proto.removeItem=function(key){
      if(!shouldScope(this,key)) return nativeRemove.call(this,key);
      const user=currentUser();
      if(user.id==="guest") return;
      return nativeRemove.call(this,scopedKey(key,user.id));
    };

    window.FortissimoAccountStorage={
      version:1,
      currentUser,
      scopedKey(key){return scopedKey(key,currentUser().id);}
    };
  }

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
    loadRoutineUxPolish();
    document.querySelectorAll(".home-link,.routine-logo-link").forEach(link=>{
      link.href=homeUrl(target);
      link.addEventListener("click",()=>setHomeReturnTarget(target));
    });
    return;
  }

  const sgBack=document.querySelector(".sg-back");
  if(!sgBack) return;

  loadSoundGymViewportLock();
  sgBack.href=homeUrl("soundgym");

  function loadSoundGymViewportLock(){
    if(!document.querySelector('link[data-sg-mobile-lock="v1"]')){
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href="assets/sound-gym-mobile-lock-v1.css?v=mobilelock1";
      link.dataset.sgMobileLock="v1";
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-sg-mobile-lock="v1"]')){
      const script=document.createElement("script");
      script.src="assets/sound-gym-mobile-lock-v1.js?v=mobilelock1";
      script.dataset.sgMobileLock="v1";
      document.head.appendChild(script);
    }
  }

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