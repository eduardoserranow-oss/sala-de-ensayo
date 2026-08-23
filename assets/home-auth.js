(function () {
  "use strict";

  const SUPABASE_URL = "https://sducrbueumvxyfwwlvtf.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const REMEMBER_KEY = "myLessons.rememberLogin";
  const SPLASH_SEEN_KEY = "myLessons.splashSeen";

  const splash = document.getElementById("appSplash");
  const gate = document.getElementById("homeAuthGate");
  const form = document.getElementById("homeAuthForm");
  const emailInput = document.getElementById("homeAuthEmail");
  const rememberInput = document.getElementById("homeRememberLogin");
  const messageEl = document.getElementById("homeAuthMessage");

  let splashDone = false;
  let sessionChecked = false;
  let currentSession = null;
  let splashTimerStarted = false;

  const supabaseClient = createSupabaseClient();

  if (rememberInput) {
    rememberInput.checked = window.localStorage.getItem(REMEMBER_KEY) !== "false";
  }

  form?.addEventListener("submit", handleLogin);
  startSplashTimer();
  bootAuth();

  function startSplashTimer() {
    if (splashTimerStarted) return;
    splashTimerStarted = true;

    if (window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "true") {
      splash?.classList.add("is-hidden");
      splashDone = true;
      renderGate();
      return;
    }

    const hide = () => {
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        splash?.classList.add("is-hidden");
        splashDone = true;
        renderGate();
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
      setMessage("No pude cargar el login. Revisa la conexion y recarga.");
      renderGate();
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      currentSession = data.session || null;
      sessionChecked = true;
      renderGate();

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        currentSession = session || null;
        sessionChecked = true;
        renderGate();
        if (currentSession) cleanLoginQuery();
      });
    } catch (error) {
      console.error("No se pudo revisar la sesion", error);
      currentSession = null;
      sessionChecked = true;
      setMessage("No pude validar tu sesion. Intenta enviar el enlace otra vez.");
      renderGate();
    }
  }

  function renderGate() {
    if (!gate || !sessionChecked || !splashDone) return;

    if (currentSession?.user) {
      gate.hidden = true;
      document.body.classList.remove("is-auth-gated");
      cleanLoginQuery();
      return;
    }

    gate.hidden = false;
    document.body.classList.add("is-auth-gated");
    window.setTimeout(() => emailInput?.focus(), 40);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = emailInput.value.trim().toLowerCase();
    const remember = rememberInput?.checked !== false;
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
    setMessage("Enviando enlace...");

    const redirectTo = new URL("./", window.location.href).href;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      console.error("No se pudo enviar magic link", error);
      setMessage("No pude enviar el enlace. Revisa el email o la configuracion.");
      return;
    }

    setMessage("Listo. Abre el enlace que llego a tu email.");
  }

  function setMessage(message) {
    if (messageEl) messageEl.textContent = message;
  }

  function cleanLoginQuery() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("login")) return;
    url.searchParams.delete("login");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
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
