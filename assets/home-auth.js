(function () {
  "use strict";

  const SPLASH_SEEN_KEY = "myLessons.splashSeen.v2";
  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const splash = document.getElementById("appSplash");
  const logoutButton = document.getElementById("logoutButton");

  logoutButton?.addEventListener("click", logout);
  installSplashStyles();
  installAudioCredits();
  installHomeHeroDesign();
  runLaunchSequence();

  function runLaunchSequence() {
    const session = getLocalSession();
    const hasSession = Boolean(session?.user?.email);

    if (!splash) {
      routeAfterSplash(hasSession);
      return;
    }

    if (window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "true") {
      splash.classList.add("is-hidden");
      routeAfterSplash(hasSession);
      return;
    }

    splash.innerHTML = `
      <div class="launch-logo-stage" aria-hidden="true">
        <img class="launch-logo-full" src="assets/logo-my-guitar-lessons.svg?v=logo3" alt="" />
        <img class="launch-logo-mark" src="assets/logo-mark-orange.svg?v=launch4" alt="" />
        <span class="launch-orange-fill"></span>
      </div>`;
    splash.classList.add("is-launching");

    window.setTimeout(() => splash.classList.add("is-expanding"), 980);

    if (hasSession) {
      window.setTimeout(() => splash.classList.add("is-revealing"), 1460);
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        splash.classList.add("is-hidden");
      }, 1680);
    } else {
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        routeAfterSplash(false);
      }, 1510);
    }
  }

  function routeAfterSplash(hasSession) {
    if (hasSession) return;
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "homeui1");
    loginUrl.searchParams.set("returnTo", "./?v=homeui1");
    window.location.replace(loginUrl.href);
  }

  function installSplashStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #appSplash.app-splash{overflow:hidden!important;background:#050505!important;opacity:1!important;visibility:visible!important;transition:opacity .18s ease,visibility .18s ease!important}
      #appSplash .launch-logo-stage{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;isolation:isolate}
      #appSplash .launch-logo-full,#appSplash .launch-logo-mark{position:absolute;width:min(310px,68vw)!important;height:auto!important;border-radius:0!important;box-shadow:none!important;will-change:transform,opacity;transform:scale(.965);opacity:0}
      #appSplash.is-launching .launch-logo-full{animation:myLessonsLogoIn .28s cubic-bezier(.22,1,.36,1) forwards}
      #appSplash .launch-logo-mark{z-index:3;transform-origin:24% 51%;pointer-events:none}
      #appSplash .launch-orange-fill{position:absolute;z-index:2;left:calc(50% - min(310px,68vw)*.365);top:50%;width:34px;height:34px;border-radius:999px;background:#ff6f0b;transform:translate(-50%,-50%) scale(.1);opacity:0;will-change:transform,opacity}
      #appSplash.is-expanding .launch-logo-full{opacity:0!important;transform:scale(1.01);transition:opacity .12s ease,transform .12s ease}
      #appSplash.is-expanding .launch-logo-mark{opacity:1;transform:scale(12);transition:transform .48s cubic-bezier(.22,1,.36,1),opacity .05s linear}
      #appSplash.is-expanding .launch-orange-fill{opacity:1;transform:translate(-50%,-50%) scale(90);transition:transform .50s cubic-bezier(.22,1,.36,1),opacity .03s linear}
      #appSplash.is-revealing{opacity:0!important;pointer-events:none}
      #appSplash.is-hidden{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
      @keyframes myLessonsLogoIn{0%{opacity:0;transform:scale(.965)}100%{opacity:1;transform:scale(1)}}
      @media (prefers-reduced-motion:reduce){#appSplash .launch-logo-full{animation:none!important;opacity:1!important;transform:none!important}#appSplash.is-expanding .launch-logo-mark{transform:scale(1)!important}#appSplash.is-expanding .launch-orange-fill{transform:translate(-50%,-50%) scale(90)!important;transition-duration:.12s!important}}
      .home-footer{gap:10px;flex-wrap:wrap;align-items:center}
      .audio-credits-link{border:0;background:transparent;color:rgba(255,255,255,.48);font-size:11px;font-weight:750;padding:8px 10px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
      .audio-credits-backdrop{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}
      .audio-credits-backdrop[hidden]{display:none}
      .audio-credits-card{position:relative;width:min(440px,100%);padding:25px 22px 22px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:#111;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.55)}
      .audio-credits-card h2{margin:0 38px 12px 0;font-size:20px}.audio-credits-card p{margin:8px 0;color:rgba(255,255,255,.72);font-size:12px;line-height:1.5}.audio-credits-card a{color:#ff7a18}.audio-credits-close{position:absolute;right:12px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:20px}
    `;
    document.head.appendChild(style);
  }

  function installHomeHeroDesign() {
    const heroStack = document.querySelector(".hero-stack");
    if (!heroStack) return;
    const heroes = [...heroStack.querySelectorAll(":scope > .routine-hero")];
    const guitar = heroes[0];
    const bass = heroes[1];
    if (!guitar || !bass) return;

    const style = document.createElement("style");
    style.id = "homeHeroDesignV1";
    style.textContent = `
      .home-shell .topbar{height:86px;justify-content:center;background:linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.16) 66%,transparent);pointer-events:none}
      .home-shell .brand-link{pointer-events:auto;opacity:0;filter:blur(12px);transform:translateY(-5px) scale(.985)}
      .home-shell .brand-link.is-brand-ready{animation:homeBrandIn .72s cubic-bezier(.22,1,.36,1) .08s forwards}
      .home-shell .brand-logo{height:48px;max-width:174px}
      @keyframes homeBrandIn{0%{opacity:0;filter:blur(12px);transform:translateY(-5px) scale(.985)}100%{opacity:1;filter:blur(0);transform:translateY(0) scale(1)}}

      .hero-stack .routine-hero.home-feature{min-height:100svh;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;position:relative;display:flex;align-items:center;padding:112px clamp(28px,8vw,118px) 72px;background:#050505!important;isolation:isolate;overflow:hidden}
      .hero-stack .routine-hero.home-feature .routine-media{position:absolute;inset:-18%;z-index:-4;background-size:cover;background-repeat:no-repeat;will-change:transform;transform:translate3d(0,var(--parallax-y,0px),0) scale(1.16);transition:filter .45s ease;filter:saturate(.9) contrast(1.04) brightness(.83)}
      .hero-stack .routine-hero.home-feature-guitar .routine-media{background-image:url('assets/foto-guitar-routine.jpg');background-position:center 20%}
      .hero-stack .routine-hero.home-feature-bass .routine-media{background-image:url('assets/foto-bass-routine.jpg');background-position:center 48%}
      .hero-stack .routine-hero.home-feature::before{content:"";position:absolute;inset:0;z-index:-3;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.91) 0%,rgba(0,0,0,.65) 34%,rgba(0,0,0,.18) 68%,rgba(0,0,0,.25) 100%)}
      .hero-stack .routine-hero.home-feature-bass::before{background:linear-gradient(270deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.68) 33%,rgba(0,0,0,.18) 69%,rgba(0,0,0,.28) 100%)}
      .hero-stack .routine-hero.home-feature::after{content:"";position:absolute;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.30),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.34))}
      .hero-stack .routine-hero.home-feature-bass::after{background:radial-gradient(circle at 83% 80%,rgba(255,92,0,.28),transparent 28%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.34))}

      .hero-stack .home-feature .routine-content{position:relative;z-index:2;width:min(440px,42vw);text-transform:none;opacity:0;transform:translateY(24px);filter:blur(5px);transition:opacity .62s ease,transform .72s cubic-bezier(.22,1,.36,1),filter .62s ease}
      .hero-stack .home-feature-bass .routine-content{margin-left:auto}
      .hero-stack .home-feature.is-in-view .routine-content{opacity:1;transform:translateY(0);filter:blur(0)}
      .hero-stack .home-feature .routine-content::before{content:"";display:block;width:46px;height:2px;margin:0 0 18px;background:#ff6500;box-shadow:0 0 18px rgba(255,101,0,.55)}
      .hero-stack .home-feature .routine-content h1{margin:0 0 24px;font-size:clamp(34px,4.4vw,66px);line-height:.94;letter-spacing:-.04em;font-weight:300;text-shadow:0 8px 34px rgba(0,0,0,.55)}
      .hero-stack .home-feature .routine-content h1 strong{display:block;margin-top:5px;color:#fff;font-weight:860;letter-spacing:-.045em}
      .hero-stack .home-feature .feature-description{margin:0 0 28px;max-width:355px;color:rgba(255,255,255,.66);font-size:clamp(14px,1.1vw,17px);line-height:1.48;font-weight:500}
      .hero-stack .home-feature .cta-row{display:flex;align-items:center;gap:12px}
      .hero-stack .home-feature .practice-btn{position:relative;min-width:176px;min-height:50px;padding:0 20px 0 23px;justify-content:space-between;gap:28px;border:1px solid rgba(255,101,0,.9);border-radius:8px;background:rgba(15,8,3,.48);backdrop-filter:blur(10px);color:#fff;font-size:16px;font-weight:720;box-shadow:0 0 0 rgba(255,92,0,0);opacity:0;transform:translateY(15px);transition:background .22s ease,border-color .22s ease,transform .24s ease,box-shadow .24s ease,opacity .4s ease}
      .hero-stack .home-feature.is-in-view .practice-btn{animation:practiceReveal .62s cubic-bezier(.22,1,.36,1) .28s forwards,practiceGlow 1.1s ease .72s 1}
      .hero-stack .home-feature .practice-btn:hover{background:rgba(255,92,0,.16);border-color:#ff7a18;transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,92,0,.20)}
      .hero-stack .home-feature .practice-btn .practice-arrow{font-size:24px;font-weight:300;line-height:1;transform:translateY(-1px);transition:transform .2s ease}
      .hero-stack .home-feature .practice-btn:hover .practice-arrow{transform:translate(3px,-1px)}
      @keyframes practiceReveal{0%{opacity:0;transform:translateY(15px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes practiceGlow{0%,100%{box-shadow:0 0 0 rgba(255,92,0,0)}42%{box-shadow:0 0 28px rgba(255,92,0,.34)}}

      .hero-stack .home-feature .scroll-cue{position:absolute;z-index:3;left:50%;bottom:22px;width:18px;height:18px;border-right:1.5px solid rgba(255,255,255,.8);border-bottom:1.5px solid rgba(255,255,255,.8);transform:translateX(-50%) rotate(45deg);opacity:.66;animation:scrollCue 1.7s ease-in-out infinite}
      @keyframes scrollCue{0%,100%{transform:translate(-50%,-4px) rotate(45deg);opacity:.36}50%{transform:translate(-50%,5px) rotate(45deg);opacity:.9}}

      @media (max-width:760px){
        .home-shell .topbar{height:90px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(0,0,0,.76),rgba(0,0,0,.08) 75%,transparent)}
        .home-shell .brand-logo{height:44px;max-width:150px}
        .hero-stack .routine-hero.home-feature{height:100svh;min-height:100svh;padding:max(104px,calc(env(safe-area-inset-top) + 82px)) 26px max(76px,calc(env(safe-area-inset-bottom) + 52px));align-items:flex-end}
        .hero-stack .routine-hero.home-feature .routine-media{inset:-22% -20%;transform:translate3d(0,var(--parallax-y,0px),0) scale(1.24)}
        .hero-stack .routine-hero.home-feature-guitar .routine-media{background-position:54% 18%}
        .hero-stack .routine-hero.home-feature-bass .routine-media{background-position:56% center}
        .hero-stack .routine-hero.home-feature::before,.hero-stack .routine-hero.home-feature-bass::before{background:linear-gradient(180deg,rgba(0,0,0,.10) 0%,rgba(0,0,0,.12) 37%,rgba(0,0,0,.88) 82%,rgba(0,0,0,.96) 100%)}
        .hero-stack .routine-hero.home-feature::after,.hero-stack .routine-hero.home-feature-bass::after{background:radial-gradient(circle at 14% 83%,rgba(255,92,0,.28),transparent 30%)}
        .hero-stack .home-feature .routine-content,.hero-stack .home-feature-bass .routine-content{width:min(330px,88vw);margin:0}
        .hero-stack .home-feature .routine-content::before{width:38px;margin-bottom:13px}
        .hero-stack .home-feature .routine-content h1{margin-bottom:15px;font-size:clamp(32px,9.4vw,43px);line-height:.95}
        .hero-stack .home-feature .feature-description{max-width:285px;margin-bottom:19px;font-size:13px;line-height:1.42}
        .hero-stack .home-feature .practice-btn{min-width:162px;min-height:48px;border-radius:7px;font-size:15px;padding:0 17px 0 20px}
        .hero-stack .home-feature .scroll-cue{bottom:max(18px,env(safe-area-inset-bottom))}
      }

      @media (prefers-reduced-motion:reduce){
        .home-shell .brand-link,.hero-stack .home-feature .routine-content,.hero-stack .home-feature .practice-btn{opacity:1!important;filter:none!important;transform:none!important;animation:none!important}
        .hero-stack .routine-hero.home-feature .routine-media{transform:scale(1.1)!important}
        .hero-stack .home-feature .scroll-cue{animation:none!important}
      }
    `;
    document.head.appendChild(style);

    prepareFeature(guitar, "guitar", "Rutina de", "Guitarra", "Ejercicios para técnica, ritmo, escalas y creatividad.", "guitar-practice.html?v=factory1");
    prepareFeature(bass, "bass", "Rutina de", "Bajo", "Groove, precisión y control para tu práctica.", "bass-practice.html?v=factory1");

    const brand = document.querySelector(".brand-link");
    if (brand) requestAnimationFrame(() => brand.classList.add("is-brand-ready"));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-in-view", entry.isIntersecting && entry.intersectionRatio > .48);
      });
    }, { threshold: [0, .48, .72] });
    [guitar, bass].forEach((hero) => observer.observe(hero));

    let raf = 0;
    const updateParallax = () => {
      raf = 0;
      const vh = Math.max(window.innerHeight, 1);
      [guitar, bass].forEach((hero) => {
        const rect = hero.getBoundingClientRect();
        const media = hero.querySelector(".routine-media");
        if (!media) return;
        const centerDelta = (rect.top + rect.height / 2) - vh / 2;
        const amount = Math.max(-175, Math.min(175, -centerDelta * .31));
        media.style.setProperty("--parallax-y", `${amount}px`);
      });
    };
    const requestParallax = () => {
      if (raf) return;
      raf = requestAnimationFrame(updateParallax);
    };
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax, { passive: true });
    requestParallax();
  }

  function prepareFeature(hero, kind, firstLine, strongLine, description, href) {
    hero.classList.add("home-feature", `home-feature-${kind}`);
    const media = document.createElement("div");
    media.className = "routine-media";
    hero.prepend(media);

    const content = hero.querySelector(".routine-content");
    const title = content?.querySelector("h1");
    const button = content?.querySelector(".practice-btn");
    if (title) title.innerHTML = `${firstLine}<strong>${strongLine}</strong>`;
    if (content && !content.querySelector(".feature-description")) {
      const desc = document.createElement("p");
      desc.className = "feature-description";
      desc.textContent = description;
      content.insertBefore(desc, content.querySelector(".cta-row"));
    }
    if (button) {
      if (button.tagName === "A") button.href = href;
      button.innerHTML = `Practicar <span class="practice-arrow" aria-hidden="true">→</span>`;
    }
    if (!hero.querySelector(".scroll-cue")) {
      const cue = document.createElement("span");
      cue.className = "scroll-cue";
      cue.setAttribute("aria-hidden", "true");
      hero.appendChild(cue);
    }
  }

  function installAudioCredits() {
    const footer = document.querySelector(".home-footer");
    if (!footer || document.getElementById("audioCreditsButton")) return;
    const button = document.createElement("button");
    button.id = "audioCreditsButton";
    button.type = "button";
    button.className = "audio-credits-link";
    button.textContent = "Audio Credits";
    footer.appendChild(button);

    const backdrop = document.createElement("div");
    backdrop.className = "audio-credits-backdrop";
    backdrop.id = "audioCreditsBackdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="audio-credits-card" role="dialog" aria-modal="true" aria-label="Audio Credits">
        <button class="audio-credits-close" type="button" aria-label="Cerrar">×</button>
        <h2>Audio Credits</h2>
        <p>Instrument samples powered by <strong>tonejs-instruments</strong>. Samples released under <strong>CC BY 3.0</strong>.</p>
        <p>Acoustic Guitar: University of Iowa · Electric Guitar & Electric Bass: Karoryfer · Nylon Guitar: Freesound / quartertone.</p>
        <p><a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noopener">Source & license</a></p>
      </section>`;
    document.body.appendChild(backdrop);

    button.addEventListener("click", () => { backdrop.hidden = false; });
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest(".audio-credits-close")) backdrop.hidden = true;
    });
  }

  function logout() {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(SPLASH_SEEN_KEY);
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "homeui1");
    loginUrl.searchParams.set("returnTo", "./?v=homeui1");
    window.location.replace(loginUrl.href);
  }

  function getLocalSession() {
    try {
      return JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY)) ||
        JSON.parse(window.sessionStorage.getItem(LOCAL_SESSION_KEY));
    } catch (error) {
      return null;
    }
  }
})();
