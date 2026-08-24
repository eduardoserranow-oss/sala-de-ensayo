(function () {
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const ACTIVE_KEY = "myLessons.homePersonalization.active.v1";
  const STORAGE_PREFIX = "myLessons.homePersonalization.v1:";
  const DEFAULT_ORDER = ["guitar", "bass", "vocal", "soundgym", "wheel"];
  const LABELS = {
    guitar: "Guitar Routine",
    bass: "Bass Routine",
    vocal: "Estudio Vocal",
    soundgym: "Sound Gym",
    wheel: "Ruleta de Acordes"
  };
  const VALID_SESSION_MS = 15000;
  const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
  const MIN_SESSIONS_TO_REORDER = 2;
  const MAX_PINNED = 3;

  let userId = "guest";
  let state = null;
  let modules = new Map();

  boot();

  function boot() {
    const session = getSession();
    userId = String(session?.user?.id || session?.user?.email || "guest");
    state = readState();
    finalizePendingSession();
    collectModules();
    if (modules.size < 4) return;

    installStyles();
    moveWheelIntoStack();
    renderOrder(false);
    mountPinButtons();
    mountResetControl();
    bindUsageTracking();
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ||
        JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (_) {
      return null;
    }
  }

  function storageKey() {
    return STORAGE_PREFIX + userId;
  }

  function freshState() {
    return { version: 1, pinned: [], modules: {}, updatedAt: null };
  }

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey()));
      if (value && value.version === 1 && value.modules) {
        const previousPins = Array.isArray(value.pinned)
          ? value.pinned
          : value.pinned ? [value.pinned] : [];
        value.pinned = previousPins
          .filter((key, index, list) => DEFAULT_ORDER.includes(key) && list.indexOf(key) === index)
          .slice(0, MAX_PINNED);
        return value;
      }
    } catch (_) {}
    return freshState();
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(storageKey(), JSON.stringify(state));
  }

  function collectModules() {
    const stack = document.querySelector(".hero-stack");
    if (!stack) return;

    const candidates = [...stack.querySelectorAll(":scope > .routine-hero")];
    for (const element of candidates) {
      const title = element.querySelector("h1")?.textContent?.toLowerCase() || "";
      let key = null;
      if (element.classList.contains("feature-guitar") || title.includes("guitar")) key = "guitar";
      else if (element.classList.contains("feature-bass") || title.includes("bass")) key = "bass";
      else if (element.classList.contains("feature-vocal") || title.includes("vocal")) key = "vocal";
      else if (element.classList.contains("feature-soundgym") || title.includes("sound")) key = "soundgym";
      if (key) registerModule(key, element);
    }

    const wheel = document.querySelector(".wheel-section");
    if (wheel) registerModule("wheel", wheel);
  }

  function registerModule(key, element) {
    element.dataset.homeModule = key;
    element.setAttribute("aria-label", LABELS[key]);
    modules.set(key, element);
  }

  function moveWheelIntoStack() {
    const stack = document.querySelector(".hero-stack");
    const wheel = modules.get("wheel");
    if (stack && wheel && wheel.parentElement !== stack) stack.appendChild(wheel);
  }

  function moduleScore(key) {
    const stats = state.modules[key];
    if (!stats || Number(stats.sessions || 0) < MIN_SESSIONS_TO_REORDER) return 0;

    const now = Date.now();
    const lastUsed = Number(stats.lastUsed || 0);
    const ageDays = Math.max(0, (now - lastUsed) / 86400000);
    const recency = Math.exp(-ageDays / 21);
    const frequency = Math.log2(Number(stats.sessions || 0) + 1);
    const duration = Math.min(Number(stats.totalSeconds || 0) / 3600, 2) * 0.22;
    return frequency * recency + duration;
  }

  function orderedKeys() {
    const available = DEFAULT_ORDER.filter((key) => modules.has(key));
    const pinned = state.pinned.filter((key) => available.includes(key));
    return available.sort((a, b) => {
      const pinA = pinned.indexOf(a);
      const pinB = pinned.indexOf(b);
      if (pinA !== -1 || pinB !== -1) {
        if (pinA === -1) return 1;
        if (pinB === -1) return -1;
        return pinA - pinB;
      }
      const difference = moduleScore(b) - moduleScore(a);
      return Math.abs(difference) > 0.015 ? difference : DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b);
    });
  }

  function renderOrder(animate) {
    const stack = document.querySelector(".hero-stack");
    if (!stack) return;
    const firstRects = animate ? captureRects() : null;
    for (const key of orderedKeys()) stack.appendChild(modules.get(key));
    updatePinnedUI();
    if (firstRects) animateFromRects(firstRects);
  }

  function captureRects() {
    const rects = new Map();
    modules.forEach((element, key) => rects.set(key, element.getBoundingClientRect()));
    return rects;
  }

  function animateFromRects(firstRects) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    modules.forEach((element, key) => {
      const first = firstRects.get(key);
      const last = element.getBoundingClientRect();
      if (!first || Math.abs(first.top - last.top) < 1) return;
      element.animate(
        [{ transform: `translateY(${first.top - last.top}px)` }, { transform: "translateY(0)" }],
        { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" }
      );
    });
  }

  function mountPinButtons() {
    modules.forEach((element, key) => {
      if (element.querySelector(".home-module-pin")) return;
      const button = document.createElement("button");
      button.className = "home-module-pin";
      button.type = "button";
      button.dataset.pinKey = key;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.2 3.5h7.6l-1.15 5.15 2.6 2.6v1.5H12.8V20l-.8 1-.8-1v-7.25H6.75v-1.5l2.6-2.6L8.2 3.5Z"/>
        </svg>
      `;
      button.addEventListener("click", () => togglePin(key));
      element.appendChild(button);
    });
    updatePinnedUI();
  }

  function togglePin(key) {
    const pinnedIndex = state.pinned.indexOf(key);
    if (pinnedIndex !== -1) {
      state.pinned.splice(pinnedIndex, 1);
    } else {
      if (state.pinned.length >= MAX_PINNED) return;
      state.pinned.push(key);
    }
    saveState();
    renderOrder(true);
    const isPinned = state.pinned.includes(key);
    showToast(isPinned ? `${LABELS[key]} fijada · ${state.pinned.length}/${MAX_PINNED}` : "Sección desfijada");
    document.querySelector(".hero-stack")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updatePinnedUI() {
    const limitReached = state.pinned.length >= MAX_PINNED;
    modules.forEach((element, key) => {
      const pinned = state.pinned.includes(key);
      element.classList.toggle("home-module-pinned", pinned);
      const button = element.querySelector(".home-module-pin");
      if (!button) return;
      button.hidden = limitReached && !pinned;
      button.setAttribute("aria-pressed", String(pinned));
      button.setAttribute("aria-label", pinned ? `Desfijar ${LABELS[key]}` : `Fijar ${LABELS[key]}`);
      button.title = pinned ? "Desfijar" : "Fijar arriba";
    });
  }

  function mountResetControl() {
    const footer = document.querySelector(".home-footer");
    if (!footer || document.getElementById("resetHomeOrder")) return;
    const button = document.createElement("button");
    button.id = "resetHomeOrder";
    button.className = "home-order-reset";
    button.type = "button";
    button.textContent = "Restablecer orden";
    button.addEventListener("click", () => {
      state = freshState();
      saveState();
      renderOrder(true);
      showToast("Orden original restaurado");
      document.querySelector(".hero-stack")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    footer.prepend(button);
  }

  function bindUsageTracking() {
    modules.forEach((element, key) => {
      if (key === "wheel" || key === "vocal") return;
      const action = element.querySelector(".practice-btn");
      action?.addEventListener("click", () => startSession(key));
    });

    const openVocal = document.getElementById("openVocal");
    const closeVocal = document.getElementById("closeVocal");
    openVocal?.addEventListener("click", () => startSession("vocal"));
    closeVocal?.addEventListener("click", () => finishSession("vocal"));

    let wheelCounted = false;
    document.getElementById("spinButton")?.addEventListener("click", () => {
      if (wheelCounted) return;
      wheelCounted = true;
      recordSession("wheel", 45);
    });
  }

  function startSession(key) {
    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({
      key,
      userId,
      startedAt: Date.now()
    }));
  }

  function finishSession(expectedKey) {
    const active = readActiveSession();
    if (!active || active.userId !== userId || active.key !== expectedKey) return;
    sessionStorage.removeItem(ACTIVE_KEY);
    const elapsed = Date.now() - Number(active.startedAt || 0);
    if (elapsed < VALID_SESSION_MS) return;
    recordSession(active.key, Math.min(elapsed, MAX_SESSION_MS) / 1000);
  }

  function finalizePendingSession() {
    const active = readActiveSession();
    if (!active) return;
    sessionStorage.removeItem(ACTIVE_KEY);
    if (active.userId !== userId || !DEFAULT_ORDER.includes(active.key)) return;
    const elapsed = Date.now() - Number(active.startedAt || 0);
    if (elapsed < VALID_SESSION_MS) return;
    const safeElapsed = elapsed > 6 * 60 * 60 * 1000 ? 60 : Math.min(elapsed, MAX_SESSION_MS) / 1000;
    recordSession(active.key, safeElapsed);
  }

  function readActiveSession() {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVE_KEY));
    } catch (_) {
      return null;
    }
  }

  function recordSession(key, seconds) {
    if (!DEFAULT_ORDER.includes(key)) return;
    const current = state.modules[key] || { sessions: 0, totalSeconds: 0, lastUsed: 0 };
    current.sessions = Number(current.sessions || 0) + 1;
    current.totalSeconds = Math.round(Number(current.totalSeconds || 0) + Math.max(0, Number(seconds || 0)));
    current.lastUsed = Date.now();
    state.modules[key] = current;
    saveState();
  }

  function showToast(message) {
    let toast = document.getElementById("homeOrderToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "homeOrderToast";
      toast.className = "home-order-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function installStyles() {
    if (document.getElementById("homePersonalizationStyles")) return;
    const style = document.createElement("style");
    style.id = "homePersonalizationStyles";
    style.textContent = `
      [data-home-module]{position:relative}
      .home-module-pin{position:absolute;z-index:18;top:max(110px,calc(env(safe-area-inset-top) + 88px));right:max(20px,env(safe-area-inset-right));display:grid;place-items:center;width:30px;height:30px;padding:6px;border:0;border-radius:8px;background:rgba(5,5,5,.28);color:rgba(255,255,255,.74);cursor:pointer;filter:drop-shadow(0 2px 8px rgba(0,0,0,.62));backdrop-filter:blur(6px);transition:opacity .18s ease,color .18s ease,background .18s ease,transform .18s ease}
      .home-module-pin[hidden]{display:none}
      .home-module-pin svg{display:block;width:15px;height:15px;fill:currentColor;transform:rotate(38deg);transition:transform .18s ease}
      .home-module-pin:hover{color:#fff;background:rgba(5,5,5,.48)}
      .home-module-pin:active{transform:scale(.92)}
      .home-module-pin[aria-pressed="true"]{color:#ff6500;background:rgba(5,5,5,.38)}
      .home-module-pin[aria-pressed="true"] svg{transform:rotate(0deg)}
      .home-footer{gap:10px;flex-wrap:wrap;align-items:center}
      .home-order-reset{border:1px solid rgba(255,255,255,.2);border-radius:999px;background:transparent;color:rgba(255,255,255,.7);min-height:44px;padding:0 18px;font-size:13px;font-weight:850;cursor:pointer}
      .home-order-reset:hover{border-color:rgba(255,101,0,.7);color:#ff8b43}
      .home-order-toast{position:fixed;z-index:290;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translate(-50%,18px);max-width:calc(100vw - 32px);padding:11px 16px;border:1px solid rgba(255,101,0,.55);border-radius:999px;background:rgba(10,10,10,.92);color:#fff;font-size:13px;font-weight:850;opacity:0;pointer-events:none;transition:.25s ease;backdrop-filter:blur(16px)}
      .home-order-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:760px){
        .home-module-pin{top:max(104px,calc(env(safe-area-inset-top) + 78px));right:max(16px,env(safe-area-inset-right));width:28px;height:28px;padding:6px;background:rgba(5,5,5,.22)}
        .home-module-pin svg{width:14px;height:14px}
      }
    `;
    document.head.appendChild(style);
  }
})();
