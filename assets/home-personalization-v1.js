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
    mountMenus();
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
    return { version: 1, pinned: null, modules: {}, updatedAt: null };
  }

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey()));
      if (value && value.version === 1 && value.modules) return value;
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
    const pinned = available.includes(state.pinned) ? state.pinned : null;
    return available.sort((a, b) => {
      if (a === pinned) return -1;
      if (b === pinned) return 1;
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

  function mountMenus() {
    modules.forEach((element, key) => {
      if (element.querySelector(".home-module-menu")) return;
      const menu = document.createElement("div");
      menu.className = "home-module-menu";
      menu.innerHTML = `
        <button class="home-module-menu-trigger" type="button" aria-label="Opciones de ${LABELS[key]}" aria-expanded="false">•••</button>
        <div class="home-module-menu-panel" hidden>
          <button class="home-module-pin" type="button"></button>
        </div>
        <span class="home-module-pin-badge" hidden>⌖ Fijada</span>
      `;
      element.appendChild(menu);

      const trigger = menu.querySelector(".home-module-menu-trigger");
      const panel = menu.querySelector(".home-module-menu-panel");
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        closeAllMenus(menu);
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
      });
      menu.querySelector(".home-module-pin").addEventListener("click", () => togglePin(key));
    });

    document.addEventListener("click", () => closeAllMenus());
    updatePinnedUI();
  }

  function closeAllMenus(except) {
    document.querySelectorAll(".home-module-menu").forEach((menu) => {
      if (menu === except) return;
      menu.querySelector(".home-module-menu-panel").hidden = true;
      menu.querySelector(".home-module-menu-trigger").setAttribute("aria-expanded", "false");
    });
  }

  function togglePin(key) {
    state.pinned = state.pinned === key ? null : key;
    saveState();
    closeAllMenus();
    renderOrder(true);
    showToast(state.pinned === key ? `${LABELS[key]} fijada arriba` : "Sección desfijada");
    document.querySelector(".hero-stack")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updatePinnedUI() {
    modules.forEach((element, key) => {
      const pinned = state.pinned === key;
      element.classList.toggle("home-module-pinned", pinned);
      const button = element.querySelector(".home-module-pin");
      const badge = element.querySelector(".home-module-pin-badge");
      if (button) button.textContent = pinned ? "Desfijar" : "Fijar arriba";
      if (badge) badge.hidden = !pinned;
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
      .home-module-menu{position:absolute;z-index:18;top:max(104px,calc(env(safe-area-inset-top) + 84px));right:max(18px,env(safe-area-inset-right));text-transform:none}
      .home-module-menu-trigger{display:grid;place-items:center;width:42px;height:42px;padding:0 0 6px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(5,5,5,.48);backdrop-filter:blur(12px);color:#fff;font-size:17px;font-weight:950;letter-spacing:2px;cursor:pointer}
      .home-module-menu-trigger:hover,.home-module-menu-trigger[aria-expanded="true"],.home-module-pinned .home-module-menu-trigger{border-color:rgba(255,101,0,.9);color:#ff6500}
      .home-module-menu-panel{position:absolute;top:50px;right:0;width:154px;padding:6px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(12,12,12,.94);box-shadow:0 18px 48px rgba(0,0,0,.42);backdrop-filter:blur(18px)}
      .home-module-menu-panel[hidden]{display:none}
      .home-module-pin{width:100%;min-height:42px;padding:0 12px;border:0;border-radius:9px;background:transparent;color:#fff;text-align:left;font-size:13px;font-weight:800;cursor:pointer}
      .home-module-pin:hover{background:rgba(255,101,0,.13);color:#ff8b43}
      .home-module-pin-badge{position:absolute;right:48px;top:8px;white-space:nowrap;padding:6px 9px;border:1px solid rgba(255,101,0,.5);border-radius:999px;background:rgba(5,5,5,.55);color:#ff8b43;font-size:10px;font-weight:900;letter-spacing:.04em;backdrop-filter:blur(10px)}
      .home-module-pin-badge[hidden]{display:none}
      .home-footer{gap:10px;flex-wrap:wrap;align-items:center}
      .home-order-reset{border:1px solid rgba(255,255,255,.2);border-radius:999px;background:transparent;color:rgba(255,255,255,.7);min-height:44px;padding:0 18px;font-size:13px;font-weight:850;cursor:pointer}
      .home-order-reset:hover{border-color:rgba(255,101,0,.7);color:#ff8b43}
      .home-order-toast{position:fixed;z-index:290;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translate(-50%,18px);max-width:calc(100vw - 32px);padding:11px 16px;border:1px solid rgba(255,101,0,.55);border-radius:999px;background:rgba(10,10,10,.92);color:#fff;font-size:13px;font-weight:850;opacity:0;pointer-events:none;transition:.25s ease;backdrop-filter:blur(16px)}
      .home-order-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:760px){
        .home-module-menu{top:max(94px,calc(env(safe-area-inset-top) + 70px));right:max(14px,env(safe-area-inset-right))}
        .home-module-menu-trigger{width:38px;height:38px;font-size:15px}
        .home-module-menu-panel{top:45px}
      }
    `;
    document.head.appendChild(style);
  }
})();
