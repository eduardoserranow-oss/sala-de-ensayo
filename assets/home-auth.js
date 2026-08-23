(function () {
  "use strict";

  const SPLASH_SEEN_KEY = "myLessons.splashSeen";
  const LOCAL_SESSION_KEY = "myLessons.localSession";

  const splash = document.getElementById("appSplash");
  const logoutButton = document.getElementById("logoutButton");
  let splashDone = false;
  let splashTimerStarted = false;

  logoutButton?.addEventListener("click", logout);

  startSplashTimer();

  function startSplashTimer() {
    if (splashTimerStarted) return;
    splashTimerStarted = true;

    if (window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "true") {
      splash?.classList.add("is-hidden");
      splashDone = true;
      renderAuthState();
      return;
    }

    const hide = () => {
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        splash?.classList.add("is-hidden");
        splashDone = true;
        renderAuthState();
      }, 500);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }
  }

  function renderAuthState() {
    if (!splashDone) return;
    if (getLocalSession()?.user?.email) return;

    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "cachefix3");
    loginUrl.searchParams.set("returnTo", "./");
    window.location.replace(loginUrl.href);
  }

  function logout() {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("v", "cachefix3");
    loginUrl.searchParams.set("returnTo", "./");
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
