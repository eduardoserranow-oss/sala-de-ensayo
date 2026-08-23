(function () {
  "use strict";

  const SUPABASE_URL = "https://sducrbueumvxyfwwlvtf.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const REMEMBER_KEY = "myLessons.rememberLogin";
  const SPLASH_SEEN_KEY = "myLessons.splashSeen";

  const splash = document.getElementById("appSplash");
  let splashDone = false;
  let sessionChecked = false;
  let currentSession = null;
  let splashTimerStarted = false;

  const supabaseClient = createSupabaseClient();

  startSplashTimer();
  bootAuth();

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

  async function bootAuth() {
    if (!supabaseClient) {
      sessionChecked = true;
      renderAuthState();
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      currentSession = data.session || null;
      sessionChecked = true;
      renderAuthState();

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        currentSession = session || null;
        sessionChecked = true;
        renderAuthState();
      });
    } catch (error) {
      console.error("No se pudo revisar la sesion", error);
      currentSession = null;
      sessionChecked = true;
      renderAuthState();
    }
  }

  function renderAuthState() {
    if (!sessionChecked || !splashDone) return;
    if (currentSession?.user) return;

    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("returnTo", "./");
    window.location.replace(loginUrl.href);
  }

  function createSupabaseClient() {
    if (!window.supabase?.createClient) return null;

    const storage = {
      getItem(key) {
        return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
      },
      setItem(key, value) {
        const remember = window.localStorage.getItem(REMEMBER_KEY) !== "false";
        const target = remember ? window.localStorage : window.sessionStorage;
        const other = remember ? window.sessionStorage : window.localStorage;
        target.setItem(key, value);
        other.removeItem(key);
      },
      removeItem(key) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      }
    };

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage
      }
    });
  }
})();
