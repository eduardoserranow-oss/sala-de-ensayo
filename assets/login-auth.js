(function () {
  "use strict";

  const SUPABASE_URL = "https://sducrbueumvxyfwwlvtf.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const REMEMBER_KEY = "myLessons.rememberLogin";

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const pinInput = document.getElementById("loginPin");
  const rememberInput = document.getElementById("rememberLogin");
  const submitButton = document.getElementById("loginSubmit");
  const forgotButton = document.getElementById("forgotPin");
  const messageEl = document.getElementById("loginMessage");

  const supabaseClient = createSupabaseClient();

  if (rememberInput) {
    rememberInput.checked = window.localStorage.getItem(REMEMBER_KEY) !== "false";
  }

  form?.addEventListener("submit", handleSubmit);
  forgotButton?.addEventListener("click", handleForgotPin);
  pinInput?.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
  });
  bootAuth();

  async function bootAuth() {
    if (!supabaseClient) {
      setMessage("No pude cargar el login. Revisa la conexion y recarga.");
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      if (data.session?.user) redirectAfterLogin();

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        if (session?.user) redirectAfterLogin();
      });
    } catch (error) {
      console.error("No se pudo revisar la sesion", error);
      setMessage("No pude validar tu sesion. Intenta otra vez.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = emailInput.value.trim().toLowerCase();
    const pin = pinInput.value.trim();

    if (!email) return;
    if (!/^\d{4}$/.test(pin)) {
      setMessage("El PIN debe tener 4 numeros.");
      return;
    }

    const remember = rememberInput?.checked !== false;
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");

    setBusy(true);
    setMessage("Entrando...");

    const password = makePasswordFromPin(pin);
    let result = await supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error && shouldTryCreateAccount(result.error)) {
      result = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { pin_login: true }
        }
      });
    }

    setBusy(false);

    if (result.error) {
      console.error("No se pudo entrar con PIN", result.error);
      setMessage("Email o PIN incorrecto.");
      return;
    }

    if (!result.data?.session) {
      setMessage("Cuenta creada. Si Supabase pide confirmar email, apaga Confirm email.");
      return;
    }

    setMessage("Listo. Entrando...");
    redirectAfterLogin();
  }

  function shouldTryCreateAccount(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("invalid login credentials") || message.includes("invalid credentials");
  }

  function makePasswordFromPin(pin) {
    return `MyLessons-PIN-${pin}-SERRA`;
  }

  function handleForgotPin() {
    setMessage("Para cambiar el PIN, dime el email y lo reiniciamos sin usar enlaces.");
  }

  function redirectAfterLogin() {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get("returnTo") || "./";
    window.location.replace(new URL(returnTo, window.location.href).href);
  }

  function setBusy(isBusy) {
    if (submitButton) submitButton.disabled = isBusy;
    if (emailInput) emailInput.disabled = isBusy;
    if (pinInput) pinInput.disabled = isBusy;
  }

  function setMessage(message) {
    if (messageEl) messageEl.textContent = message;
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
        detectSessionInUrl: false,
        storage
      }
    });
  }
})();
