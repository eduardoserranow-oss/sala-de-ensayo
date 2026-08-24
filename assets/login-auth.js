(function () {
  "use strict";

  const REMEMBER_KEY = "myLessons.rememberLogin";
  const LOCAL_USERS_KEY = "myLessons.localPinUsers";
  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const OWNER_EMAIL = "eduardoserranow@gmail.com";
  const OWNER_USERNAME = "serra";
  const OWNER_PIN = "4120";
  const LAUNCH_VERSION = "launch7";

  const form = document.getElementById("loginForm");
  const userInput = document.getElementById("loginUser");
  const pinInput = document.getElementById("loginPin");
  const rememberInput = document.getElementById("rememberLogin");
  const submitButton = document.getElementById("loginSubmit");
  const createButton = document.getElementById("createAccount");
  const backButton = document.getElementById("backToLogin");
  const forgotButton = document.getElementById("forgotPin");
  const messageEl = document.getElementById("loginMessage");

  let mode = "login";

  if (rememberInput) {
    rememberInput.checked = window.localStorage.getItem(REMEMBER_KEY) !== "false";
  }

  form?.addEventListener("submit", handleSubmit);
  createButton?.addEventListener("click", handleCreateAccount);
  backButton?.addEventListener("click", handleBackToLogin);
  forgotButton?.addEventListener("click", handleForgotPin);
  pinInput?.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
  });

  purgeBrowserCaches();
  bootAuth();

  function seedOwnerUser() {
    const users = getUsers();
    const current = users[OWNER_USERNAME] || users[OWNER_EMAIL] || {};
    users[OWNER_USERNAME] = {
      id: current.id || makeUserId(OWNER_EMAIL),
      username: OWNER_USERNAME,
      email: OWNER_EMAIL,
      pin: OWNER_PIN,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: "owner"
    };
    delete users[OWNER_EMAIL];
    saveUsers(users);
  }

  function bootAuth() {
    seedOwnerUser();
    if (userInput) userInput.value = "";
    const session = getLocalSession();
    if (session?.user?.email) {
      document.documentElement.classList.add("has-saved-session");
      redirectAfterLogin();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const username = normalizeUsername(userInput.value);
    const pin = pinInput.value.trim();

    if (!username) return;
    if (!/^\d{4}$/.test(pin)) {
      setMessage("El PIN debe tener 4 numeros.");
      return;
    }

    const remember = rememberInput?.checked !== false;
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");

    const users = getUsers();
    const existingUser = users[username];

    if (mode === "create") {
      if (existingUser) {
        setMessage("Ese usuario ya existe. Entra con tu PIN.");
        setMode("login");
        return;
      }
      const user = createLocalUser(username, pin, null);
      users[username] = user;
      saveUsers(users);
      saveSession(user, remember);
      setMessage("Cuenta creada. Entrando...");
      redirectAfterLogin();
      return;
    }

    if (mode === "reset") {
      const user = createLocalUser(username, pin, existingUser);
      users[username] = user;
      saveUsers(users);
      saveSession(user, remember);
      setMessage("PIN actualizado. Entrando...");
      redirectAfterLogin();
      return;
    }

    if (!existingUser) {
      setMessage("Ese usuario no existe. Toca Crear cuenta.");
      return;
    }

    if (existingUser.pin !== pin) {
      setMessage("Usuario o PIN incorrecto.");
      return;
    }

    saveSession(existingUser, remember);
    setMessage("Listo. Entrando...");
    redirectAfterLogin();
  }

  function handleCreateAccount() {
    setMode("create");
    setMessage("Escribe un usuario y un PIN de 4 numeros.");
  }

  function handleBackToLogin() {
    setMode("login");
    setMessage("");
  }

  function handleForgotPin() {
    setMode("reset");
    setMessage("Escribe tu usuario y un PIN nuevo de 4 numeros.");
  }

  function setMode(nextMode) {
    mode = nextMode;
    const isLogin = mode === "login";
    submitButton.textContent = mode === "create" ? "Crear cuenta" : mode === "reset" ? "Guardar PIN" : "Entrar";
    createButton.hidden = !isLogin;
    backButton.hidden = isLogin;
    forgotButton.hidden = mode === "create";
  }

  function createLocalUser(username, pin, existingUser) {
    return {
      id: existingUser?.id || makeUserId(username),
      username,
      email: username === OWNER_USERNAME ? OWNER_EMAIL : username,
      pin,
      createdAt: existingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function getUsers() {
    try {
      const users = JSON.parse(window.localStorage.getItem(LOCAL_USERS_KEY));
      if (users && typeof users === "object") return users;
    } catch (error) {
      console.warn("No se pudo leer usuarios locales", error);
    }
    return {};
  }

  function saveUsers(users) {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  function getLocalSession() {
    try {
      return JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY)) ||
        JSON.parse(window.sessionStorage.getItem(LOCAL_SESSION_KEY));
    } catch (error) {
      return null;
    }
  }

  function saveSession(user, remember) {
    const session = {
      user: {
        id: user.id,
        username: user.username || user.email,
        email: user.email
      },
      createdAt: new Date().toISOString(),
      mode: "local-pin"
    };
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    target.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    other.removeItem(LOCAL_SESSION_KEY);
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function makeUserId(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return "local-" + Math.abs(hash).toString(36);
  }

  function redirectAfterLogin() {
    try {
      sessionStorage.removeItem("myLessons.smoothSplashSeen.v1");
      sessionStorage.removeItem("myLessons.smoothSplashSeen.v2");
    } catch (_) {}

    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get("returnTo") || "./";
    const nextUrl = new URL(returnTo, window.location.href);
    nextUrl.searchParams.set("v", LAUNCH_VERSION);
    nextUrl.searchParams.set("handoff", "1");
    nextUrl.searchParams.set("cb", Date.now().toString(36));
    window.location.replace(nextUrl.href);
  }

  async function purgeBrowserCaches() {
    try {
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.warn("No se pudo purgar cache de arranque", error);
    }
  }

  function setMessage(message) {
    if (messageEl) messageEl.textContent = message;
  }
})();
