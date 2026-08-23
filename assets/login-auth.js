(function () {
  "use strict";

  const SUPABASE_URL = "https://sducrbueumvxyfwwlvtf.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const REMEMBER_KEY = "myLessons.rememberLogin";

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const codeInput = document.getElementById("loginCode");
  const codeBlock = document.getElementById("codeBlock");
  const rememberInput = document.getElementById("rememberLogin");
  const submitButton = document.getElementById("loginSubmit");
  const messageEl = document.getElementById("loginMessage");

  const supabaseClient = createSupabaseClient();
  let codeSent = false;
  let pendingEmail = "";

  if (rememberInput) {
    rememberInput.checked = window.localStorage.getItem(REMEMBER_KEY) !== "false";
  }

  form?.addEventListener("submit", handleSubmit);
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
    if (!email) return;

    const remember = rememberInput?.checked !== false;
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");

    if (!codeSent || email !== pendingEmail) {
      await sendCode(email);
      return;
    }

    await verifyCode(email);
  }

  async function sendCode(email) {
    setBusy(true);
    setMessage("Enviando codigo...");

    const redirectTo = new URL("login.html", window.location.href).href;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true
      }
    });

    setBusy(false);

    if (error) {
      console.error("No se pudo enviar codigo", error);
      setMessage("No pude enviar el codigo. Revisa el email.");
      return;
    }

    codeSent = true;
    pendingEmail = email;
    codeBlock.classList.add("is-visible");
    codeInput.required = true;
    submitButton.textContent = "Entrar";
    setMessage("Escribe el codigo que llego a tu email.");
  }

  async function verifyCode(email) {
    const token = codeInput.value.trim().replace(/\s/g, "");
    if (!token) {
      setMessage("Escribe el codigo.");
      return;
    }

    setBusy(true);
    setMessage("Validando codigo...");

    const { error } = await supabaseClient.auth.verifyOtp({
      email,
      token,
      type: "email"
    });

    setBusy(false);

    if (error) {
      console.error("No se pudo validar codigo", error);
      setMessage("Ese codigo no funciono. Revisalo e intenta otra vez.");
      return;
    }

    setMessage("Listo. Entrando...");
    redirectAfterLogin();
  }

  function redirectAfterLogin() {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get("returnTo") || "./";
    window.location.replace(new URL(returnTo, window.location.href).href);
  }

  function setBusy(isBusy) {
    if (submitButton) submitButton.disabled = isBusy;
    if (emailInput) emailInput.disabled = isBusy;
    if (codeInput) codeInput.disabled = isBusy;
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
        detectSessionInUrl: true,
        storage
      }
    });
  }
})();
