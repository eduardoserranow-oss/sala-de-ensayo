(function () {
  "use strict";

  const REMEMBER_KEY = "myLessons.rememberLogin";
  const LOCAL_USERS_KEY = "myLessons.localPinUsers";
  const LOCAL_SESSION_KEY = "myLessons.localSession";
  const OWNER_EMAIL = "eduardoserranow@gmail.com";
  const OWNER_PIN = "4120";

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const pinInput = document.getElementById("loginPin");
  const rememberInput = document.getElementById("rememberLogin");
  const submitButton = document.getElementById("loginSubmit");
  const forgotButton = document.getElementById("forgotPin");
  const messageEl = document.getElementById("loginMessage");

  let resetMode = false;

  if (rememberInput) {
    rememberInput.checked = window.localStorage.getItem(REMEMBER_KEY) !== "false";
  }

  form?.addEventListener("submit", handleSubmit);
  forgotButton?.addEventListener("click", handleForgotPin);
  pinInput?.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
  });
  bootAuth();

  function seedOwnerUser() {
    const users = getUsers();
    const current = users[OWNER_EMAIL] || {};
    users[OWNER_EMAIL] = {
      id: current.id || makeUserId(OWNER_EMAIL),
      email: OWNER_EMAIL,
      pin: OWNER_PIN,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: "owner"
    };
    saveUsers(users);
  }

  function bootAuth() {
    seedOwnerUser();
    const session = getLocalSession();
    if (session?.user?.email) redirectAfterLogin();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const pin = pinInput.value.trim();

    if (!email) return;
    if (!/^\d{4}$/.test(pin)) {
      setMessage("El PIN debe tener 4 numeros.");
      return;
    }

    const remember = rememberInput?.checked !== false;
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");

    const users = getUsers();
    const existingUser = users[email];

    if (resetMode || !existingUser) {
      const user = {
        id: existingUser?.id || makeUserId(email),
        email,
        pin,
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users[email] = user;
      saveUsers(users);
      saveSession(user, remember);
      setMessage(resetMode ? "PIN actualizado. Entrando..." : "Cuenta creada. Entrando...");
      redirectAfterLogin();
      return;
    }

    if (existingUser.pin !== pin) {
      setMessage("Email o PIN incorrecto.");
      return;
    }

    saveSession(existingUser, remember);
    setMessage("Listo. Entrando...");
    redirectAfterLogin();
  }

  function handleForgotPin() {
    resetMode = true;
    submitButton.textContent = "Guardar PIN";
    setMessage("Escribe tu email y un PIN nuevo de 4 numeros.");
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

  function makeUserId(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i += 1) {
      hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
    }
    return "local-" + Math.abs(hash).toString(36);
  }

  function redirectAfterLogin() {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get("returnTo") || "./";
    window.location.replace(new URL(returnTo, window.location.href).href);
  }

  function setMessage(message) {
    if (messageEl) messageEl.textContent = message;
  }
})();
