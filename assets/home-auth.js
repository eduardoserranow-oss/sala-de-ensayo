(function () {
  "use strict";

  window.__FORTE_LAUNCH_V3__ = true;

  const RETURN_TARGET_KEY = "fortissimo.home.returnTarget.v1";
  const RETURN_SCROLL_KEY = "fortissimo.home.returnScrollY.v1";
  const SPLASH_SEEN_KEY = "myLessons.splashSeen.v2";

  const headerFix = document.createElement("script");
  headerFix.src = "assets/fortissimo-header-fix.js?v=fortissimo-icon7";
  headerFix.async = false;
  document.head.appendChild(headerFix);

  const splash = document.getElementById("appSplash");
  const launchUrl = new URL(window.location.href);
  const isHandoff = launchUrl.searchParams.get("handoff") === "1";
  const queryReturnTarget = (launchUrl.searchParams.get("return") || "").toLowerCase();
  let storedReturnTarget = "";
  let splashSeen = false;
  try {
    storedReturnTarget = (sessionStorage.getItem(RETURN_TARGET_KEY) || "").toLowerCase();
    splashSeen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "true";
  } catch (_) {}
  const returnTarget = queryReturnTarget || storedReturnTarget;
  const isInternalReturn = launchUrl.searchParams.get("internal") === "1" || Boolean(returnTarget);
  const shouldPlayLaunch = !isInternalReturn && !splashSeen;

  if (returnTarget) {
    try { history.scrollRestoration = "manual"; } catch (_) {}
  }

  captureHomeDepartures();

  const criticalHomeReady = preloadCriticalHome();
  mountRoutineHeroImages();
  let launchReady = Promise.resolve();

  if (splash) {
    if (shouldPlayLaunch) {
      splash.replaceChildren();
      splash.style.background = "#000";
      splash.classList.remove("is-hidden","is-launching","is-expanding","is-revealing");
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, "true"); } catch (_) {}
      launchReady = loadLaunchModule().then(async () => {
        if (!window.ForteLaunch) return;
        if (isHandoff) await window.ForteLaunch.playHandoff(splash);
        else await window.ForteLaunch.playFull(splash);
      });
    } else {
      splash.replaceChildren();
      splash.classList.add("is-hidden");
      splash.style.pointerEvents = "none";
    }
  }

  // Never allow the launch screen to survive as an invisible touch layer.
  // The timeout also covers iOS suspending timers while Password AutoFill is open.
  const splashFailsafe = setTimeout(releaseSplash, 4200);
  window.addEventListener("pageshow", event => {
    if (event.persisted || !shouldPlayLaunch) releaseSplash();
  });

  const core = document.createElement("script");
  core.src = "assets/home-auth-core.js?v=homeui6-freezefix";
  core.onload = async function () {
    mountRoutineHeroImages();
    mountSoundGym();
    restoreHomePosition(returnTarget);

    const tuner = document.createElement("script");
    tuner.src = "assets/home-tuner.js?v=tuner4";
    tuner.onload = function () {
      const tunerAudio = document.createElement("script");
      tunerAudio.src = "assets/home-tuner-audio-fix.js?v=audiofix3";
      document.head.appendChild(tunerAudio);
    };
    document.head.appendChild(tuner);

    const personalization = document.createElement("script");
    personalization.src = "assets/home-personalization-v1.js?v=personalize2";
    personalization.onload = function(){ restoreHomePosition(returnTarget, true); };
    document.head.appendChild(personalization);

    const hd = document.createElement("script");
    hd.src = "assets/vocal-hero-hd-loader.js?v=vocalhd1";
    document.head.appendChild(hd);

    if (shouldPlayLaunch) {
      await Promise.allSettled([
        launchReady,
        Promise.race([criticalHomeReady, delay(900)]),
        document.fonts?.ready ? Promise.race([document.fonts.ready,delay(180)]) : Promise.resolve()
      ]);
      await nextPaint();
      window.ForteLaunch?.hide(splash, 520);
      clearTimeout(splashFailsafe);
    } else {
      await nextPaint();
      restoreHomePosition(returnTarget, true);
    }
    cleanLaunchUrl();
  };
  core.onerror = async function () {
    if (shouldPlayLaunch) {
      await launchReady;
      window.ForteLaunch?.hide(splash, 480);
    } else {
      splash?.classList.add("is-hidden");
    }
    restoreHomePosition(returnTarget, true);
    cleanLaunchUrl();
  };
  document.head.appendChild(core);

  function loadLaunchModule(){
    if (window.ForteLaunch) return Promise.resolve();
    return new Promise(resolve => {
      const existing = document.querySelector('script[data-forte-launch="v3"]');
      if (existing) {
        existing.addEventListener("load", resolve, {once:true});
        existing.addEventListener("error", resolve, {once:true});
        return;
      }
      const script = document.createElement("script");
      script.src = "assets/forte-launch-v3.js?v=fortissimo-launch4";
      script.dataset.forteLaunch = "v3";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  function cleanLaunchUrl() {
    try {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("handoff");
      clean.searchParams.delete("return");
      clean.searchParams.delete("internal");
      history.replaceState(null, "", clean.href);
    } catch (_) {}
  }

  function releaseSplash(){
    if(!splash) return;
    splash.classList.remove("is-active","is-launching","is-expanding","is-revealing");
    splash.classList.add("is-finished","is-hidden");
    splash.style.pointerEvents = "none";
    splash.setAttribute("aria-hidden","true");
  }

  function captureHomeDepartures(){
    document.addEventListener("click", event => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      let target = "";
      const href = link.getAttribute("href") || "";
      if (/guitar-practice\.html/i.test(href)) target = "guitar";
      else if (/bass-practice\.html/i.test(href)) target = "bass";
      else if (/sound-gym\.html/i.test(href)) target = "soundgym";
      if (!target) return;
      try {
        sessionStorage.setItem(RETURN_TARGET_KEY, target);
        sessionStorage.setItem(RETURN_SCROLL_KEY, String(window.scrollY || 0));
      } catch (_) {}
    }, true);
  }

  function findRoutineHero(name){
    const normalized = String(name || "").toLowerCase();
    return [...document.querySelectorAll(".hero-stack .routine-hero")].find(hero => {
      const title = hero.querySelector("h1")?.textContent?.trim().toLowerCase() || "";
      if (normalized === "guitar") return title.includes("guitar");
      if (normalized === "bass") return title.includes("bass");
      if (normalized === "vocal") return title.includes("vocal");
      return false;
    }) || null;
  }

  function getReturnElement(target){
    if (!target) return null;
    if (target === "soundgym") return document.querySelector(".feature-soundgym");
    return findRoutineHero(target);
  }

  function restoreHomePosition(target, singlePass){
    if (!target) return;
    let fallbackY = 0;
    try { fallbackY = Number(sessionStorage.getItem(RETURN_SCROLL_KEY)) || 0; } catch (_) {}

    const restore = () => {
      const element = getReturnElement(target);
      if (element) {
        element.scrollIntoView({behavior:"auto",block:"start"});
        return true;
      }
      if (fallbackY > 0) {
        window.scrollTo({top:fallbackY,behavior:"auto"});
      }
      return false;
    };

    restore();
    if (!singlePass) {
      [80,220,520,950].forEach(ms => setTimeout(restore, ms));
      setTimeout(clearReturnState, 1150);
    }
  }

  function clearReturnState(){
    try {
      sessionStorage.removeItem(RETURN_TARGET_KEY);
      sessionStorage.removeItem(RETURN_SCROLL_KEY);
    } catch (_) {}
  }

  function mountRoutineHeroImages() {
    const heroes = document.querySelectorAll(".hero-stack .routine-hero");
    const guitar = heroes[0];
    const bass = heroes[1];
    const guitarMedia = guitar?.querySelector(".media");
    const bassMedia = bass?.querySelector(".media");

    if (guitar) {
      guitar.style.setProperty("--image", "url('assets/foto-guitar-routine.PNG?v=userupload1')");
      guitar.style.setProperty("--pos", "center center");
      guitar.style.setProperty("--mpos", "62% center");
      if (guitarMedia) {
        guitarMedia.style.backgroundImage = "url('assets/foto-guitar-routine.PNG?v=userupload1')";
        guitarMedia.style.backgroundPosition = innerWidth <= 760 ? "62% center" : "center 20%";
      }
    }
    if (bass) {
      bass.style.setProperty("--image", "url('assets/foto-bass-routine.PNG?v=userupload1')");
      bass.style.setProperty("--pos", "center center");
      bass.style.setProperty("--mpos", "center center");
      if (bassMedia) {
        bassMedia.style.backgroundImage = "url('assets/foto-bass-routine.PNG?v=userupload1')";
        bassMedia.style.backgroundPosition = innerWidth <= 760 ? "center center" : "center 48%";
      }
    }
  }

  function preloadCriticalHome() {
    const soundGymHero = innerWidth <= 760
      ? "assets/soundgym-hero-mobile.webp?v=sghero1"
      : "assets/soundgym-hero-desktop.webp?v=sghero1";
    return Promise.allSettled([
      preloadImage("assets/foto-guitar-routine.PNG?v=userupload1"),
      preloadImage("assets/foto-bass-routine.PNG?v=userupload1"),
      preloadImage("assets/forte-flex-logo.svg?v=forteflex1"),
      preloadImage(soundGymHero)
    ]);
  }

  function preloadImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      try { image.fetchPriority = "high"; } catch (_) {}
      image.onload = async () => {
        try { if (image.decode) await image.decode(); } catch (_) {}
        resolve();
      };
      image.onerror = resolve;
      image.src = src;
    });
  }

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, Math.max(0, ms))); }
  function nextPaint() { return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }

  function mountSoundGym(){
    const stack = document.querySelector(".hero-stack");
    if(!stack || stack.querySelector(".feature-soundgym")) return;
    const css = document.createElement("style");
    css.id = "soundGymHomeFeatureV3";
    css.textContent = `
      .feature-soundgym .media{background-image:url('assets/soundgym-hero-desktop.webp?v=sghero1')!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;inset:-12% -8%!important;transform:translate3d(0,var(--p,0px),0) scale(1.04)!important}
      .feature-soundgym:before{background:linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.25) 42%,rgba(0,0,0,.04) 72%,rgba(0,0,0,.18))!important}
      .feature-soundgym:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.22),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.30))!important}
      @media(max-width:760px){.feature-soundgym .media{background-image:url('assets/soundgym-hero-mobile.webp?v=sghero1')!important;background-position:center top!important;inset:-12% -8%!important;transform:translate3d(0,var(--p,0px),0) scale(1.05)!important}.feature-soundgym:before{background:linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.04) 43%,rgba(0,0,0,.66) 69%,rgba(0,0,0,.96))!important}.feature-soundgym:after{background:radial-gradient(circle at 18% 80%,rgba(255,92,0,.18),transparent 31%),linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.18))!important}}
    `;
    document.head.appendChild(css);
    const hero = document.createElement("article");
    hero.className = "routine-hero feature feature-soundgym";
    hero.innerHTML = `<div class="media" aria-hidden="true"></div><div class="routine-content"><h1>Sound<strong>Gym</strong></h1><p class="feature-description">Gaming room para entrenar EQ, dinámica, frecuencias y oído de estudio.</p><div class="cta-row"><a class="practice-btn" href="sound-gym.html?v=sg1">Practicar <span class="practice-arrow" aria-hidden="true">→</span></a></div></div><span class="scroll-cue" aria-hidden="true"></span>`;
    stack.appendChild(hero);
    const io = new IntersectionObserver(entries=>{ entries.forEach(entry=>hero.classList.toggle("in",entry.isIntersecting && entry.intersectionRatio > .42)); },{threshold:[0,.42,.65]});
    io.observe(hero);
    let parallaxFrame=0;
    function updateSoundGymParallax(){
      parallaxFrame=0;
      const rect=hero.getBoundingClientRect();
      const viewportHeight=Math.max(innerHeight,1);
      const distance=(rect.top+rect.height/2)-viewportHeight/2;
      hero.querySelector(".media")?.style.setProperty("--p",Math.max(-110,Math.min(110,-distance*.28))+"px");
    }
    function requestSoundGymParallax(){
      if(parallaxFrame) return;
      parallaxFrame=requestAnimationFrame(updateSoundGymParallax);
    }
    addEventListener("scroll",requestSoundGymParallax,{passive:true});
    addEventListener("resize",requestSoundGymParallax,{passive:true});
    new MutationObserver(requestSoundGymParallax).observe(stack,{childList:true});
    requestAnimationFrame(requestSoundGymParallax);
    setTimeout(requestSoundGymParallax,240);
  }
})();
