(function () {
  "use strict";

  const OWNER_EMAIL = "eduardoserranow@gmail.com";
  const SESSION_KEY = "myLessons.localSession";
  const VERSION = "factory1";
  const instrument = document.body.dataset.instrument === "bass" ? "bass" : "guitar";
  const baseKey = instrument === "bass" ? "myLessons.bassRoutine.v2" : "myLessons.guitarRoutine.v2";
  const session = readSession();
  const user = session?.user || null;
  const userId = user?.id || "guest";
  const userKey = `${baseKey}.${userId}`;
  const markerKey = `myLessons.factorySeed.v1.${userId}.${instrument}`;
  const tutorialSeenKey = `myLessons.routineTutorialSeen.v1.${userId}.${instrument}`;
  const isOwner = String(user?.email || "").toLowerCase() === OWNER_EMAIL;

  let seededNow = false;

  if (user && !isOwner && !hasValidRoutine(userKey)) {
    const seed = buildFactoryState();
    try {
      localStorage.setItem(userKey, JSON.stringify(seed));
      localStorage.setItem(markerKey, "1");
      seededNow = true;
    } catch (error) {
      console.warn("No se pudo crear la rutina de fabrica", error);
    }
  }

  installResetOverride();
  window.MyLessonsFactory = {
    instrument,
    userId,
    userKey,
    markerKey,
    tutorialSeenKey,
    isOwner,
    seededNow,
    buildFactoryState
  };

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ||
        JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (error) {
      return null;
    }
  }

  function hasValidRoutine(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && Array.isArray(parsed.exercises));
    } catch (error) {
      return false;
    }
  }

  function buildFactoryState() {
    const isBass = instrument === "bass";
    const labels = isBass ? ["G", "D", "A", "E"] : ["e", "B", "G", "D", "A", "E"];
    const profile = isBass ? "bass4" : "guitar6";
    const playback = isBass ? "bass-electric" : "acoustic";

    return {
      factoryVersion: 1,
      exercises: [
        {
          id: "factory-patch-1",
          type: "tab",
          title: "Patch 1",
          desc: "",
          enabled: false,
          instrumentProfile: profile,
          playbackInstrument: playback,
          tab: labels.map((label) => ({ label, body: "-".repeat(32) }))
        },
        {
          id: "factory-fifths",
          type: "wheel-fourths",
          title: "Ruleta De 5tas",
          desc: "Toca en secuencia de arriba a bajo la misma nota en todas las cuerdas y luego ve a su cuarta",
          enabled: false
        },
        {
          id: "factory-scales",
          type: "wheel-chords",
          title: "Escalas",
          desc: "Elige 4 acordes random y toca en secuencia su escala mayor o menor en el mastil. Usa: Escala Pentatonica Mayor y Menor - Escala CAGED Mayor y Menor",
          enabled: false
        }
      ]
    };
  }

  function installResetOverride() {
    if (!user || isOwner) return;
    const button = document.getElementById("resetRoutine");
    if (!button) return;

    const forceLabel = () => {
      if (button.textContent !== "Restaurar base") button.textContent = "Restaurar base";
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const ok = window.confirm(
        "Esto restaura Patch 1, Ruleta De 5tas y Escalas. Se reemplazaran los ejercicios guardados de esta rutina. Continuar?"
      );
      if (!ok) return;

      try {
        localStorage.setItem(userKey, JSON.stringify(buildFactoryState()));
      } catch (error) {
        console.warn("No se pudo restaurar la rutina de fabrica", error);
      }

      const url = new URL(window.location.href);
      url.searchParams.set("v", VERSION);
      window.location.replace(url.href);
    }, true);

    window.setTimeout(forceLabel, 0);
    const observer = new MutationObserver(forceLabel);
    observer.observe(button, { childList: true, characterData: true, subtree: true });
  }
})();
