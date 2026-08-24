(function () {
  "use strict";

  const LEGACY_SPLASH_KEY = "myLessons.splashSeen.v2";
  const SMOOTH_SPLASH_KEY = "myLessons.smoothSplashSeen.v2";
  const splash = document.getElementById("appSplash");
  const launchStartedAt = performance.now();
  const launchUrl = new URL(window.location.href);
  const isHandoff = launchUrl.searchParams.get("handoff") === "1";
  const shouldAnimateSplash = Boolean(splash && (isHandoff || sessionStorage.getItem(SMOOTH_SPLASH_KEY) !== "true"));
  try {
    sessionStorage.setItem(LEGACY_SPLASH_KEY, "true");
    if (shouldAnimateSplash) sessionStorage.setItem(SMOOTH_SPLASH_KEY, "true");
  } catch (_) {}
  const criticalHomeReady = preloadCriticalHome();
  if (shouldAnimateSplash) prepareSmoothSplash(); else if (splash) splash.classList.add("is-hidden");

  const core = document.createElement("script");
  core.src = "assets/home-auth-core.js?v=launch7-homeui4";
  core.onload = function () {
    mountSoundGym();
    const tuner = document.createElement("script");
    tuner.src = "assets/home-tuner.js?v=tuner4";
    tuner.onload = function () {
      const tunerAudio = document.createElement("script");
      tunerAudio.src = "assets/home-tuner-audio-fix.js?v=audiofix1";
      document.head.appendChild(tunerAudio);
    };
    document.head.appendChild(tuner);
    const personalization = document.createElement("script");
    personalization.src = "assets/home-personalization-v1.js?v=personalize2";
    document.head.appendChild(personalization);
    const hd = document.createElement("script");
    hd.src = "assets/vocal-hero-hd-loader.js?v=vocalhd1";
    document.head.appendChild(hd);
    if (shouldAnimateSplash) revealHomeWhenReady();
  };
  core.onerror = function () { if (shouldAnimateSplash) revealHomeWhenReady(true); };
  document.head.appendChild(core);

  function prepareSmoothSplash() {
    const style = document.createElement("style");
    style.id = "spotifyLikeLaunchStyles";
    style.textContent = `
      #appSplash.app-splash.smooth-launch,#appSplash.app-splash.smooth-launch.is-hidden{background:#050505!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transition:none!important}
      #appSplash.app-splash.smooth-launch .smooth-launch-stage{position:absolute;inset:0;display:grid;place-items:center;background:#050505}
      #appSplash.app-splash.smooth-launch .smooth-launch-logo{display:block;width:min(300px,66vw)!important;max-width:calc(100vw - 56px)!important;height:auto!important;border-radius:0!important;box-shadow:none!important;opacity:1!important;transform:none!important;animation:none!important}
      #appSplash.app-splash.smooth-launch.is-exiting,#appSplash.app-splash.smooth-launch.is-hidden.is-exiting{opacity:0!important;visibility:visible!important;pointer-events:none!important;transition:opacity .22s cubic-bezier(.4,0,.2,1)!important}
      @media (prefers-reduced-motion:reduce){#appSplash.app-splash.smooth-launch.is-exiting,#appSplash.app-splash.smooth-launch.is-hidden.is-exiting{transition:opacity .12s linear!important}}
    `;
    document.head.appendChild(style);
    splash.innerHTML = `<div class="smooth-launch-stage" aria-hidden="true"><img class="smooth-launch-logo" src="assets/logo-my-guitar-lessons.svg?v=logo3" alt=""></div>`;
    splash.classList.remove("is-launching", "is-expanding", "is-revealing");
    splash.classList.add("smooth-launch");
  }

  async function revealHomeWhenReady(force) {
    if (!force) {
      await Promise.race([criticalHomeReady, delay(900)]);
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, delay(180)]);
    }
    const minimumLogoTime = 780;
    const elapsed = performance.now() - launchStartedAt;
    if (elapsed < minimumLogoTime) await delay(minimumLogoTime - elapsed);
    await nextPaint();
    splash.classList.add("is-exiting");
    setTimeout(() => {
      splash.classList.add("is-hidden");
      splash.classList.remove("smooth-launch", "is-exiting");
      document.getElementById("spotifyLikeLaunchStyles")?.remove();
      cleanLaunchUrl();
    }, 235);
  }

  function cleanLaunchUrl() {
    try {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("handoff");
      clean.searchParams.delete("cb");
      history.replaceState(null, "", clean.href);
    } catch (_) {}
  }

  function preloadCriticalHome() { const soundGymHero=innerWidth<=760?"assets/soundgym-hero-mobile.webp?v=sghero1":"assets/soundgym-hero-desktop.webp?v=sghero1"; return Promise.allSettled([preloadImage("assets/foto-guitar-routine.jpg"),preloadImage("assets/logo-my-guitar-lessons.svg?v=logo3"),preloadImage(soundGymHero)]); }
  function preloadImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      try { image.fetchPriority = "high"; } catch (_) {}
      image.onload = async () => { try { if (image.decode) await image.decode(); } catch (_) {} resolve(); };
      image.onerror = resolve;
      image.src = src;
    });
  }
  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms))); }
  function nextPaint() { return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); }

  function mountSoundGym(){
    const stack = document.querySelector(".hero-stack");
    if(!stack || stack.querySelector(".feature-soundgym")) return;
    const css = document.createElement("style");
    css.id = "soundGymHomeFeatureV3";
    css.textContent = `
      .feature-soundgym .media{background-image:url('assets/soundgym-hero-desktop.webp?v=sghero1')!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;transform:translate3d(0,var(--p,0px),0) scale(1.10)!important}
      .feature-soundgym:before{background:linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.25) 42%,rgba(0,0,0,.04) 72%,rgba(0,0,0,.18))!important}
      .feature-soundgym:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.22),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.30))!important}
      @media(max-width:760px){.feature-soundgym .media{background-image:url('assets/soundgym-hero-mobile.webp?v=sghero1')!important;background-position:center top!important;transform:translate3d(0,var(--p,0px),0) scale(1.12)!important}.feature-soundgym:before{background:linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.04) 43%,rgba(0,0,0,.66) 69%,rgba(0,0,0,.96))!important}.feature-soundgym:after{background:radial-gradient(circle at 18% 80%,rgba(255,92,0,.18),transparent 31%),linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.18))!important}}
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
      hero.querySelector(".media")?.style.setProperty("--p",Math.max(-190,Math.min(190,-distance*.34))+"px");
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
