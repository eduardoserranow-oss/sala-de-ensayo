(function(){
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const PROGRESS_KEY = "myLessons.soundGym.progress.v1";
  const LAST_KEY = "myLessons.soundGym.lastGame.v1";

  guardSession();

  const cards = [...document.querySelectorAll("[data-game]")];
  const progressFill = document.getElementById("sgProgressFill");
  const progressScore = document.getElementById("sgProgressScore");
  const continueButton = document.getElementById("sgContinue");
  const toast = document.getElementById("sgToast");
  let toastTimer = 0;

  const levelMax = {
    ear: 18,
    engineer: 6,
    studio: 18
  };

  function guardSession(){
    try{
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      if(session?.user?.email) return;
    }catch(_){ }
    const u = new URL("login.html", location.href);
    u.searchParams.set("v", "soundgym1");
    u.searchParams.set("returnTo", "sound-gym.html?v=soundgym1");
    location.replace(u.href);
  }

  function readProgress(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    }catch(_){ return {}; }
  }

  function writeProgress(data){
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  }

  function clampStars(value){
    const n = Number(value) || 0;
    return Math.max(0, Math.min(3, Math.round(n)));
  }

  function renderStars(card, count){
    const holder = card.querySelector("[data-stars]");
    if(!holder) return;
    holder.innerHTML = "";
    for(let i=1;i<=3;i++){
      const star = document.createElement("span");
      star.className = "sg-star " + (i <= count ? "on" : "off");
      star.textContent = i <= count ? "★" : "☆";
      holder.appendChild(star);
    }
  }

  function render(){
    const progress = readProgress();
    let total = 0;
    const levelTotals = {ear:0, engineer:0, studio:0};

    cards.forEach(card=>{
      const id = card.dataset.game;
      const level = card.dataset.level;
      const stars = clampStars(progress[id]);
      total += stars;
      if(levelTotals[level] !== undefined) levelTotals[level] += stars;
      renderStars(card, stars);
      card.dataset.starsValue = String(stars);
    });

    if(progressScore) progressScore.innerHTML = `<b>${total}</b> / 42 ★`;
    if(progressFill) progressFill.style.width = `${(total/42)*100}%`;

    Object.entries(levelTotals).forEach(([level,value])=>{
      const el = document.querySelector(`[data-level-score="${level}"]`);
      if(el) el.innerHTML = `<strong>${value}</strong> / ${levelMax[level]} ★`;
    });

    const last = localStorage.getItem(LAST_KEY);
    const lastCard = cards.find(card=>card.dataset.game === last);
    if(continueButton){
      if(lastCard){
        continueButton.textContent = `Continuar · ${lastCard.dataset.title}`;
        continueButton.dataset.target = last;
      }else{
        continueButton.textContent = "Empezar Ear Basics";
        continueButton.dataset.target = "";
      }
    }
  }

  function showToast(message){
    if(!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(()=>toast.classList.remove("show"), 2300);
  }

  cards.forEach(card=>{
    card.addEventListener("click",()=>{
      localStorage.setItem(LAST_KEY, card.dataset.game);
      render();
      card.animate?.([
        {transform:"scale(1)"},
        {transform:"scale(.985)"},
        {transform:"scale(1)"}
      ],{duration:180,easing:"ease-out"});
      showToast(`${card.dataset.title} seleccionado · conectaremos el motor de audio en la próxima fase.`);
    });
  });

  continueButton?.addEventListener("click",()=>{
    const id = continueButton.dataset.target;
    if(id){
      const card = cards.find(item=>item.dataset.game === id);
      card?.scrollIntoView({behavior:"smooth",block:"center"});
      setTimeout(()=>card?.focus({preventScroll:true}),360);
      return;
    }
    document.getElementById("level-ear")?.scrollIntoView({behavior:"smooth",block:"start"});
  });

  window.SoundGymProgress = {
    get(){ return {...readProgress()}; },
    setStars(gameId, stars){
      const progress = readProgress();
      progress[gameId] = clampStars(stars);
      writeProgress(progress);
      render();
    },
    reset(){
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(LAST_KEY);
      render();
    }
  };

  render();
})();
