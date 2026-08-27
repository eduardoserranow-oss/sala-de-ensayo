(function () {
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const ACTIVE_KEY = "myLessons.homePersonalization.active.v1";
  const STORAGE_PREFIX = "myLessons.homePersonalization.v1:";
  const KNOWN_ORDER = ["guitar", "bass", "vocal", "soundgym", "referencefinder", "vibe", "wheel"];
  const LABELS = {
    guitar: "Guitar Routine",
    bass: "Bass Routine",
    vocal: "Estudio Vocal",
    soundgym: "Sound Gym",
    referencefinder: "Reference Finder",
    vibe: "Vibe Roulette",
    wheel: "Ruleta de Acordes"
  };
  const VALID_SESSION_MS = 15000;
  const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
  const MIN_SESSIONS_TO_REORDER = 2;
  const MAX_PINNED = 3;

  let userId = "guest";
  let state = null;
  const modules = new Map();
  const moduleOrder = [...KNOWN_ORDER];
  let wheelCounted = false;
  let stackObserver = null;
  let revealObserver = null;

  boot();

  function boot() {
    const session = getSession();
    userId = String(session?.user?.id || session?.user?.email || "guest");
    collectModules();
    state = readState();
    finalizePendingSession();

    installStyles();
    normalizeModuleSurfaces();
    moveWheelIntoStack();
    renderOrder(false);
    mountPinButtons();
    mountResetControl();
    bindUsageTracking();
    observeModuleReveals();
    watchForNewModules();
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

  function validKeys() {
    return moduleOrder.filter((key, index, list) => list.indexOf(key) === index);
  }

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey()));
      if (value && value.version === 1 && value.modules) {
        const previousPins = Array.isArray(value.pinned)
          ? value.pinned
          : value.pinned ? [value.pinned] : [];
        value.pinned = previousPins
          .filter((key, index, list) => validKeys().includes(key) && list.indexOf(key) === index)
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
      const key = inferModuleKey(element);
      if (key) registerModule(key, element);
    }

    const wheel = document.querySelector(".wheel-section");
    if (wheel) registerModule("wheel", wheel);
  }

  function inferModuleKey(element) {
    const explicit = String(element.dataset.homeModule || "").trim().toLowerCase();
    if (explicit) return explicit;

    const title = element.querySelector("h1")?.textContent?.trim().toLowerCase() || "";
    if (element.classList.contains("feature-guitar") || title.includes("guitar")) return "guitar";
    if (element.classList.contains("feature-bass") || title.includes("bass")) return "bass";
    if (element.classList.contains("feature-vocal") || title.includes("vocal")) return "vocal";
    if (element.classList.contains("feature-soundgym") || title.includes("sound gym") || title.replace(/\s+/g, "").includes("soundgym")) return "soundgym";
    if (element.classList.contains("feature-referencefinder") || title.includes("reference finder")) return "referencefinder";
    if (element.classList.contains("feature-vibe") || element.classList.contains("vibe-home-hero") || title.includes("vibe roulette")) return "vibe";

    if (!title) return null;
    return slugify(title);
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function registerModule(key, element) {
    if (!key || !element) return;
    if (!moduleOrder.includes(key)) moduleOrder.push(key);
    if (!LABELS[key]) LABELS[key] = element.querySelector("h1")?.textContent?.trim() || key;
    element.dataset.homeModule = key;
    element.setAttribute("aria-label", LABELS[key]);
    modules.set(key, element);
  }

  function normalizeModuleSurfaces() {
    const vibe = modules.get("vibe");
    if (vibe) {
      vibe.classList.add("feature", "feature-vibe", "home-standard-module");
      const media = ensureMedia(vibe);
      media.style.backgroundImage = "url('assets/vibe-roulette-home-hero-20260827.webp?v=2')";
      media.style.backgroundPosition = "center center";
      ensureVibeContent(vibe);
      ensureScrollCue(vibe);
    }

    const reference = modules.get("referencefinder");
    if (reference) {
      reference.classList.add("feature", "feature-referencefinder", "home-standard-module");
      const media = ensureMedia(reference);
      media.style.backgroundImage = "url('assets/reference-finder-home-hero-20260827.webp?v=1')";
      media.style.backgroundPosition = "center center";
      ensureReferenceContent(reference);
      ensureScrollCue(reference);
      reference.querySelector(".rf-lines")?.setAttribute("aria-hidden", "true");
      reference.querySelector(".rf-orbit")?.setAttribute("aria-hidden", "true");
    }
  }

  function ensureMedia(hero) {
    let media = hero.querySelector(":scope > .media");
    if (!media) {
      media = document.createElement("div");
      media.className = "media";
      media.setAttribute("aria-hidden", "true");
      hero.prepend(media);
    }
    return media;
  }

  function ensureScrollCue(hero) {
    if (hero.querySelector(":scope > .scroll-cue")) return;
    const cue = document.createElement("span");
    cue.className = "scroll-cue";
    cue.setAttribute("aria-hidden", "true");
    hero.appendChild(cue);
  }

  function ensureVibeContent(hero) {
    let content = hero.querySelector(".routine-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "routine-content";
      hero.appendChild(content);
    }
    if (!content.querySelector("h1")) {
      const title = document.createElement("h1");
      title.textContent = "Vibe Roulette";
      content.appendChild(title);
    }
    let row = content.querySelector(".cta-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "cta-row";
      content.appendChild(row);
    }
    if (!row.querySelector(".practice-btn")) {
      const link = document.createElement("a");
      link.className = "practice-btn";
      link.href = "vibe-roulette.html?v=product-v1";
      link.innerHTML = 'Componer <span class="practice-arrow" aria-hidden="true">→</span>';
      row.appendChild(link);
    }
  }

  function ensureReferenceContent(hero) {
    let content = hero.querySelector(".routine-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "routine-content";
      hero.appendChild(content);
    }
    if (!content.querySelector("h1")) {
      const title = document.createElement("h1");
      title.textContent = "Reference Finder";
      content.appendChild(title);
    }
    let description = content.querySelector(".feature-description");
    if (!description) {
      description = document.createElement("p");
      description.className = "feature-description";
      description.textContent = "Encuentra referencias comerciales cercanas a tu producción para tomar decisiones de mezcla y mastering.";
      const row = content.querySelector(".cta-row");
      row ? content.insertBefore(description, row) : content.appendChild(description);
    }
    let row = content.querySelector(".cta-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "cta-row";
      content.appendChild(row);
    }
    if (!row.querySelector(".practice-btn")) {
      const link = document.createElement("a");
      link.className = "practice-btn";
      link.href = "reference-finder.html?v=rf-preview1";
      link.innerHTML = 'Buscar referencias <span class="practice-arrow" aria-hidden="true">→</span>';
      row.appendChild(link);
    }
  }

  function observeModuleReveals() {
    if (!("IntersectionObserver" in window)) {
      modules.forEach(element => element.classList.add("in"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.target.classList.contains("feature") && !entry.target.classList.contains("wheel-section")) return;
          entry.target.classList.toggle("in", entry.isIntersecting && entry.intersectionRatio > .32);
        });
      }, { threshold: [0, .18, .32, .5, .68] });
    }
    modules.forEach(element => {
      if (element.dataset.homeRevealObserved === "1") return;
      element.dataset.homeRevealObserved = "1";
      revealObserver.observe(element);
    });
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
    const available = moduleOrder.filter(key => modules.has(key));
    const pinned = state.pinned.filter(key => available.includes(key));
    return available.sort((a, b) => {
      const pinA = pinned.indexOf(a);
      const pinB = pinned.indexOf(b);
      if (pinA !== -1 || pinB !== -1) {
        if (pinA === -1) return 1;
        if (pinB === -1) return -1;
        return pinA - pinB;
      }
      const difference = moduleScore(b) - moduleScore(a);
      return Math.abs(difference) > 0.015 ? difference : moduleOrder.indexOf(a) - moduleOrder.indexOf(b);
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
      if (element.querySelector(":scope > .home-module-pin")) return;
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
      if (state.pinned.length >= MAX_PINNED) {
        showToast(`Máximo ${MAX_PINNED} secciones fijadas`);
        return;
      }
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
      const button = element.querySelector(":scope > .home-module-pin");
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
      if (key === "wheel" || key === "vocal" || element.dataset.homeUsageBound === "1") return;
      const action = element.querySelector(".practice-btn");
      if (!action) return;
      element.dataset.homeUsageBound = "1";
      action.addEventListener("click", () => startSession(key));
    });

    const openVocal = document.getElementById("openVocal");
    const closeVocal = document.getElementById("closeVocal");
    if (openVocal && openVocal.dataset.homeUsageBound !== "1") {
      openVocal.dataset.homeUsageBound = "1";
      openVocal.addEventListener("click", () => startSession("vocal"));
    }
    if (closeVocal && closeVocal.dataset.homeUsageBound !== "1") {
      closeVocal.dataset.homeUsageBound = "1";
      closeVocal.addEventListener("click", () => finishSession("vocal"));
    }

    const spin = document.getElementById("spinButton");
    if (spin && spin.dataset.homeUsageBound !== "1") {
      spin.dataset.homeUsageBound = "1";
      spin.addEventListener("click", () => {
        if (wheelCounted) return;
        wheelCounted = true;
        recordSession("wheel", 45);
      });
    }
  }

  function watchForNewModules() {
    const stack = document.querySelector(".hero-stack");
    if (!stack || stackObserver) return;
    stackObserver = new MutationObserver(() => {
      const before = modules.size;
      collectModules();
      if (modules.size === before) {
        observeModuleReveals();
        return;
      }
      normalizeModuleSurfaces();
      moveWheelIntoStack();
      renderOrder(false);
      mountPinButtons();
      bindUsageTracking();
      observeModuleReveals();
    });
    stackObserver.observe(stack, { childList: true });
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
    if (active.userId !== userId || !validKeys().includes(active.key)) return;
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
    if (!validKeys().includes(key)) return;
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
      .feature-vibe .media,.feature-referencefinder .media{background-size:cover!important;background-repeat:no-repeat!important;filter:saturate(.96) contrast(1.08) brightness(.82)}
      .feature-vibe:before,.feature-referencefinder:before{background:linear-gradient(90deg,rgba(0,0,0,.90),rgba(0,0,0,.62) 38%,rgba(0,0,0,.14) 72%,rgba(0,0,0,.24))!important}
      .feature-vibe:after,.feature-referencefinder:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.27),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.38))!important}
      .feature-referencefinder .rf-lines,.feature-referencefinder .rf-orbit{display:none!important}
      .feature-vibe.in .routine-content,.feature-referencefinder.in .routine-content{opacity:1!important;transform:none!important;filter:blur(0)!important}
      .feature-vibe.in .practice-btn,.feature-referencefinder.in .practice-btn{opacity:1!important;transform:none!important}
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
        .feature-vibe .media,.feature-referencefinder .media{background-position:center center!important}
        .feature-vibe:before,.feature-referencefinder:before{background:linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.12) 38%,rgba(0,0,0,.88) 78%,rgba(0,0,0,.96))!important}
        .home-module-pin{top:max(104px,calc(env(safe-area-inset-top) + 78px));right:max(16px,env(safe-area-inset-right));width:28px;height:28px;padding:6px;background:rgba(5,5,5,.22)}
        .home-module-pin svg{width:14px;height:14px}
      }
    `;
    document.head.appendChild(style);
  }
})();
