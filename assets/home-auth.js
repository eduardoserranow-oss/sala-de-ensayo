(function () {
  "use strict";

  const SPLASH_SEEN_KEY = "myLessons.splashSeen.v2";
  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const splash = document.getElementById("appSplash");
  const logoutButton = document.getElementById("logoutButton");

  logoutButton?.addEventListener("click", logout);
  installSplashStyles();
  installAudioCredits();
  runLaunchSequence();

  function runLaunchSequence() {
    const session = getLocalSession();
    const hasSession = Boolean(session?.user?.email);

    if (!splash) {
      routeAfterSplash(hasSession);
      return;
    }

    // Do not replay the full brand intro repeatedly while navigating inside the same app session.
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

    // Logo presence: ~1 second. Orange brand mark then expands to become the transition.
    window.setTimeout(() => splash.classList.add("is-expanding"), 980);

    if (hasSession) {
      window.setTimeout(() => splash.classList.add("is-revealing"), 1460);
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        splash.classList.add("is-hidden");
      }, 1680);
    } else {
      // Keep the orange transition over the page while routing so the Home never flashes behind Login.
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        routeAfterSplash(false);
      }, 1510);
    }
  }

  function routeAfterSplash(hasSession) {
    if (hasSession) return;
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "launch4");
    loginUrl.searchParams.set("returnTo", "./?v=launch4");
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
    loginUrl.searchParams.set("v", "launch4");
    loginUrl.searchParams.set("returnTo", "./?v=launch4");
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
