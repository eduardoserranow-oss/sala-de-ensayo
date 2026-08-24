(function () {
  "use strict";

  window.__FORTE_LAUNCH_V3__ = true;
  try { sessionStorage.setItem("myLessons.splashSeen.v2", "true"); } catch (_) {}

  const headerFix = document.createElement("script");
  headerFix.src = "assets/fortissimo-header-fix.js?v=fortissimo-icon7";
  headerFix.async = false;
  document.head.appendChild(headerFix);

  const splash = document.getElementById("appSplash");
  const launchUrl = new URL(window.location.href);
  const isHandoff = launchUrl.searchParams.get("handoff") === "1";
  const criticalHomeReady = preloadCriticalHome();
  let launchReady = Promise.resolve();

  if (splash) {
    splash.classList.remove("is-hidden","is-launching","is-expanding","is-revealing");
    launchReady = loadLaunchModule().then(async () => {
      if (!window.ForteLaunch) return;
      if (isHandoff) await window.ForteLaunch.playHandoff(splash);
      else await window.ForteLaunch.playFull(splash);
    });
  }

  const core = document.createElement("script");
  core.src = "assets/home-auth-core.js?v=forteflex1-homeui5";
  core.onload = async function () {
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

    await Promise.allSettled([
      launchReady,
      Promise.race([criticalHomeReady, delay(900)]),
      document.fonts?.ready ? Promise.race([document.fonts.ready,delay(180)]) : Promise.resolve()
    ]);

    await nextPaint();
    window.ForteLaunch?.hide(splash, 220);
    cleanLaunchUrl();
  };
  core.onerror = async function () {
    await launchReady;
    window.ForteLaunch?.hide(splash, 160);
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
      script.src = "assets/forte-launch-v3.js?v=fortissimo-launch3";
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
      history.replaceState(null, "", clean.href);
    } catch (_) {}
  }

  function preloadCriticalHome() {
    const soundGymHero = innerWidth <= 760
      ? "assets/soundgym-hero-mobile.webp?v=sghero1"
      : "assets/soundgym-hero-desktop.webp?v=sghero1";
    return Promise.allSettled([
      preloadImage("assets/foto-guitar-routine.jpg"),
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
