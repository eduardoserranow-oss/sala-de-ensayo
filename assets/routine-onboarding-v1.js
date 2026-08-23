(function () {
  "use strict";

  const factory = window.MyLessonsFactory;
  const SESSION_KEY = "myLessons.localSession";
  const instrument = document.body.dataset.instrument === "bass" ? "bass" : "guitar";
  const session = readSession();
  const userId = session?.user?.id || "guest";
  const markerKey = factory?.markerKey || `myLessons.factorySeed.v1.${userId}.${instrument}`;
  const seenKey = factory?.tutorialSeenKey || `myLessons.routineTutorialSeen.v1.${userId}.${instrument}`;

  let stepIndex = 0;
  let active = false;
  let root = null;
  let highlight = null;
  let card = null;
  let titleEl = null;
  let bodyEl = null;
  let progressEl = null;
  let backBtn = null;
  let nextBtn = null;

  const steps = [
    {
      title: "Tu rutina ya viene lista",
      body: "Empezamos con 3 ejercicios de fabrica: Patch 1, Ruleta De 5tas y Escalas. Puedes editarlos, moverlos o eliminarlos cuando quieras.",
      target: () => document.querySelector("[data-routine-title]")
    },
    {
      title: "1. Patch 1",
      body: "Este es tu espacio para componer una tablatura. Entra a Editar Tab y toca el diapason: cada nota se escribe y suena.",
      target: () => findExercise("factory-patch-1", "Patch 1")
    },
    {
      title: "Editar y escuchar",
      body: "Dentro del editor usa ▶ para escuchar el arreglo, ⌫ para borrar, ↶ para deshacer y ✓ para guardar.",
      target: () => findExercise("factory-patch-1", "Patch 1")?.querySelector("[data-edit-tab]") ||
        findExercise("factory-patch-1", "Patch 1")
    },
    {
      title: "2. Ruleta De 5tas",
      body: "Pulsa GIRAR y practica la tonalidad que salga. Este ejercicio te ayuda a moverte por relaciones tonales sin elegir siempre lo mismo.",
      target: () => findExercise("factory-fifths", "Ruleta De 5tas")
    },
    {
      title: "3. Escalas",
      body: "Gira para obtener 4 acordes y practica sus escalas mayores o menores en secuencia.",
      target: () => findExercise("factory-scales", "Escalas")
    },
    {
      title: "Activa y reordena",
      body: "El switch activa cada ejercicio. Mantén presionada una tarjeta o el icono ☰ y arrástrala para cambiar el orden.",
      target: () => findExercise("factory-patch-1", "Patch 1")?.querySelector("[data-reorder-handle]") ||
        findExercise("factory-patch-1", "Patch 1")
    },
    {
      title: "Hazla tuya",
      body: "Usa Agregar ejercicio para crear más tabs. Restaurar base vuelve a estos 3 ejercicios de fabrica.",
      target: () => document.getElementById("addExercise")
    }
  ];

  installStyles();
  installTutorialButton();

  window.addEventListener("resize", updateHighlight, { passive: true });
  window.addEventListener("scroll", updateHighlight, { passive: true });

  const shouldAutoStart =
    localStorage.getItem(markerKey) === "1" &&
    localStorage.getItem(seenKey) !== "1";

  if (shouldAutoStart) {
    window.setTimeout(() => startTutorial(true), 520);
  }

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ||
        JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (error) {
      return null;
    }
  }

  function installTutorialButton() {
    const actions = document.querySelector(".routine-actions");
    if (!actions || document.getElementById("routineTutorialButton")) return;

    const button = document.createElement("button");
    button.id = "routineTutorialButton";
    button.type = "button";
    button.className = "pill-button routine-tutorial-button";
    button.textContent = "Tutorial";
    button.addEventListener("click", () => startTutorial(false));
    actions.appendChild(button);
  }

  function startTutorial(auto) {
    if (active) return;
    active = true;
    stepIndex = 0;
    createUI();
    document.body.classList.add("routine-tour-open");
    renderStep();

    if (!auto) {
      try { localStorage.removeItem(seenKey); } catch (error) {}
    }
  }

  function createUI() {
    if (root) root.remove();

    root = document.createElement("div");
    root.className = "routine-tour";
    root.innerHTML = `
      <div class="routine-tour-shade"></div>
      <div class="routine-tour-highlight" aria-hidden="true"></div>
      <section class="routine-tour-card" role="dialog" aria-modal="true" aria-label="Tutorial de My Lessons">
        <div class="routine-tour-progress"></div>
        <h2 class="routine-tour-title"></h2>
        <p class="routine-tour-body"></p>
        <div class="routine-tour-actions">
          <button type="button" class="routine-tour-skip">Saltar</button>
          <div class="routine-tour-nav">
            <button type="button" class="routine-tour-back">Atrás</button>
            <button type="button" class="routine-tour-next">Siguiente</button>
          </div>
        </div>
      </section>`;

    document.body.appendChild(root);
    highlight = root.querySelector(".routine-tour-highlight");
    card = root.querySelector(".routine-tour-card");
    titleEl = root.querySelector(".routine-tour-title");
    bodyEl = root.querySelector(".routine-tour-body");
    progressEl = root.querySelector(".routine-tour-progress");
    backBtn = root.querySelector(".routine-tour-back");
    nextBtn = root.querySelector(".routine-tour-next");

    root.querySelector(".routine-tour-skip").addEventListener("click", finishTutorial);
    backBtn.addEventListener("click", () => {
      if (stepIndex <= 0) return;
      stepIndex -= 1;
      renderStep();
    });
    nextBtn.addEventListener("click", () => {
      if (stepIndex >= steps.length - 1) {
        finishTutorial();
        return;
      }
      stepIndex += 1;
      renderStep();
    });
  }

  function renderStep() {
    const step = steps[stepIndex];
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    progressEl.textContent = `${stepIndex + 1} / ${steps.length}`;
    backBtn.disabled = stepIndex === 0;
    nextBtn.textContent = stepIndex === steps.length - 1 ? "Terminar" : "Siguiente";

    const target = step.target?.();
    if (!target) {
      clearHighlight();
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.setTimeout(() => positionHighlight(target), 260);
  }

  function findExercise(id, title) {
    const byId = document.querySelector(`[data-exercise-id="${id}"]`);
    if (byId) return byId;

    return [...document.querySelectorAll("#exerciseList .exercise-row")]
      .find((row) => row.querySelector(".exercise-title")?.textContent?.trim().toLowerCase() === title.toLowerCase()) || null;
  }

  function positionHighlight(target) {
    if (!active || !highlight || !target?.isConnected) return;
    const rect = target.getBoundingClientRect();
    const pad = rect.width < 80 || rect.height < 55 ? 10 : 7;

    highlight.style.display = "block";
    highlight.style.left = `${Math.max(8, rect.left - pad)}px`;
    highlight.style.top = `${Math.max(8, rect.top - pad)}px`;
    highlight.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
    highlight.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;

    const targetMid = rect.top + rect.height / 2;
    card.classList.toggle("is-top", targetMid > window.innerHeight * 0.58);
  }

  function updateHighlight() {
    if (!active) return;
    const target = steps[stepIndex]?.target?.();
    if (target) positionHighlight(target);
  }

  function clearHighlight() {
    if (highlight) highlight.style.display = "none";
  }

  function finishTutorial() {
    try { localStorage.setItem(seenKey, "1"); } catch (error) {}
    active = false;
    document.body.classList.remove("routine-tour-open");
    root?.remove();
    root = null;
    highlight = null;
    card = null;
  }

  function installStyles() {
    if (document.getElementById("routineTourStyles")) return;
    const style = document.createElement("style");
    style.id = "routineTourStyles";
    style.textContent = `
      .routine-tutorial-button{
        border-color:rgba(255,101,0,.55)!important;
        color:#ff6500!important;
        background:transparent!important;
      }
      .routine-tour{position:fixed;inset:0;z-index:500;pointer-events:auto;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .routine-tour-shade{position:absolute;inset:0;background:rgba(3,7,12,.76);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      .routine-tour-highlight{position:fixed;z-index:502;border:3px solid #ff6500;border-radius:20px;box-shadow:0 0 0 5px rgba(255,101,0,.16),0 18px 50px rgba(0,0,0,.38);pointer-events:none;transition:left .22s ease,top .22s ease,width .22s ease,height .22s ease}
      .routine-tour-card{position:fixed;z-index:503;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,calc(100vw - 28px));padding:20px 18px 16px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:#101720;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.52);transition:top .18s ease,bottom .18s ease}
      .routine-tour-card.is-top{top:max(18px,env(safe-area-inset-top));bottom:auto}
      .routine-tour-progress{color:#ff6500;font-size:12px;font-weight:900;letter-spacing:.08em;margin-bottom:8px}
      .routine-tour-title{margin:0 0 8px;font-size:24px;line-height:1.05;letter-spacing:-.035em}
      .routine-tour-body{margin:0;color:rgba(255,255,255,.78);font-size:14px;line-height:1.45;font-weight:650}
      .routine-tour-actions{margin-top:17px;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .routine-tour-actions button{min-height:42px;border-radius:999px;padding:0 16px;font-weight:900;border:1px solid rgba(255,255,255,.14);background:#222c39;color:#fff}
      .routine-tour-actions .routine-tour-skip{background:transparent;color:rgba(255,255,255,.65);border-color:transparent;padding-left:4px}
      .routine-tour-nav{display:flex;gap:8px}
      .routine-tour-actions .routine-tour-next{background:#ff6500;border-color:#ff6500}
      .routine-tour-actions button:disabled{opacity:.35}
      @media(max-width:480px){
        .routine-tour-card{padding:18px 16px 15px;border-radius:20px}
        .routine-tour-title{font-size:22px}
        .routine-tour-body{font-size:13px}
        .routine-tour-actions button{min-height:40px;padding:0 14px}
      }`;
    document.head.appendChild(style);
  }
})();
