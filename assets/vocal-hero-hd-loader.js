(function () {
  "use strict";

  const VERSION = "vocalhd1";

  if (!document.querySelector('script[data-fortissimo-cinematic-launch="v1"]')) {
    const cinematicLaunch = document.createElement("script");
    cinematicLaunch.src = "assets/fortissimo-cinematic-launch-v1.js?v=cinematic1";
    cinematicLaunch.dataset.fortissimoCinematicLaunch = "v1";
    document.head.appendChild(cinematicLaunch);
  }

  const PARTS = [
    "assets/vocal-hero-hd.b64",
    "assets/vocal-hero-hd-2.b64",
    "assets/vocal-hero-hd-3.b64",
    "assets/vocal-hero-hd-4.b64",
    "assets/vocal-hero-hd-5.b64",
    "assets/vocal-hero-hd-6.b64"
  ];

  function removeLegacyVocalEntry() {
    if (location.hash === "#estudio-vocal") {
      location.replace("vocal-studio.html?v=worlds2");
      return true;
    }

    const heroes = [...document.querySelectorAll(".hero-stack .routine-hero")];
    const legacyVocal = heroes.find((hero) => {
      const title = hero.querySelector("h1")?.textContent?.trim().toLowerCase() || "";
      return title.includes("estudio vocal") || title.includes("vocal studio");
    });
    legacyVocal?.remove();

    const legacyScreen = document.querySelector(".vocal-screen");
    legacyScreen?.remove();
    document.body.classList.remove("is-vocal");
    return false;
  }

  if (removeLegacyVocalEntry()) return;

  function installSharedHomeLayerFix() {
    if (document.getElementById("sharedHomeMediaLayerFix")) return;
    const style = document.createElement("style");
    style.id = "sharedHomeMediaLayerFix";
    style.textContent = `
      .hero-stack .routine-hero.home-standard-module{
        background-image:none!important;
        background-color:#050505!important;
        isolation:isolate!important;
      }
      .hero-stack .routine-hero.home-standard-module>.media{
        z-index:0!important;
      }
      .hero-stack .routine-hero.home-standard-module::before,
      .hero-stack .routine-hero.home-standard-module::after{
        z-index:1!important;
        pointer-events:none!important;
      }
      .hero-stack .routine-hero.home-standard-module>.routine-content{
        position:relative!important;
        z-index:2!important;
      }
      .hero-stack .routine-hero.home-standard-module>.scroll-cue{
        z-index:3!important;
      }
      .hero-stack .routine-hero.home-standard-module>.home-module-pin{
        z-index:90!important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyBassHeroFix() {
    const bassMedia = document.querySelector(".feature-bass .media");
    if (!bassMedia) return;

    bassMedia.style.setProperty("background-repeat", "no-repeat", "important");
    bassMedia.style.setProperty("background-color", "#050505", "important");
    bassMedia.style.setProperty("background-size", "cover", "important");
    bassMedia.style.setProperty("background-position", "var(--art-base-x,var(--art-x,50%)) var(--art-base-y,var(--art-y,50%))", "important");

    if (window.innerWidth <= 760) {
      bassMedia.style.setProperty("inset", "-24% -22%", "important");
      bassMedia.style.setProperty("transform", "translate3d(var(--art-pan-x,0%),calc(var(--p,0px) + var(--art-pan-y,0%)),0) scale(var(--art-scale,1.27))", "important");
      bassMedia.style.setProperty("filter", "saturate(.94) contrast(1.05) brightness(.82)", "important");
    } else {
      bassMedia.style.setProperty("inset", "-22% -18%", "important");
      bassMedia.style.setProperty("transform", "translate3d(var(--art-pan-x,0%),calc(var(--p,0px) + var(--art-pan-y,0%)),0) scale(var(--art-scale,1.22))", "important");
      bassMedia.style.setProperty("filter", "saturate(.94) contrast(1.05) brightness(.82)", "important");
    }
  }

  installSharedHomeLayerFix();
  applyBassHeroFix();
  addEventListener("resize", applyBassHeroFix, { passive: true });
  requestAnimationFrame(() => {
    installSharedHomeLayerFix();
    applyBassHeroFix();
  });
  setTimeout(() => {
    installSharedHomeLayerFix();
    applyBassHeroFix();
  }, 180);
  setTimeout(() => {
    installSharedHomeLayerFix();
    applyBassHeroFix();
  }, 700);

  const homeEditMode = new URL(location.href).searchParams.get("homeEdit") === "1";

  if (!document.querySelector('script[data-home-art-global="v1"]')) {
    const globalArtwork = document.createElement("script");
    globalArtwork.src = "assets/home-artwork-global-v1.js?v=approved2";
    globalArtwork.dataset.homeArtGlobal = "v1";
    document.head.appendChild(globalArtwork);
  }

  if (homeEditMode && !document.querySelector('script[data-home-art-controls="v2"]')) {
    const artControls = document.createElement("script");
    artControls.src = "assets/home-artwork-editor-controls-v2.js?v=artcontrols2";
    artControls.dataset.homeArtControls = "v2";
    document.head.appendChild(artControls);
  }

  if (homeEditMode && !document.querySelector('script[data-home-art-sync="v1"]')) {
    const artSync = document.createElement("script");
    artSync.src = "assets/home-artwork-sync-v1.js?v=artsync2";
    artSync.dataset.homeArtSync = "v1";
    document.head.appendChild(artSync);
  }

  if (!document.querySelector('script[data-song-patch-home-fix="v1"]')) {
    const songPatchFix = document.createElement("script");
    songPatchFix.src = "assets/song-patch-home-fix-v1.js?v=songpatchclean2";
    songPatchFix.dataset.songPatchHomeFix = "v1";
    document.head.appendChild(songPatchFix);
  }

  if (!document.querySelector('script[data-play-songs-home="v1"]')) {
    const playSongsHome = document.createElement("script");
    playSongsHome.src = "assets/play-songs-home.js?v=playsongs1";
    playSongsHome.dataset.playSongsHome = "v1";
    document.head.appendChild(playSongsHome);
  }

  import("./home-roulette-spin-audio-sync-v1.js").catch((error) => {
    console.warn("No se pudo cargar la sincronización de audio de la ruleta del Home", error);
  });

  const media = document.querySelector(".feature-vocal .media");
  if (!media) return;

  Promise.all(
    PARTS.map((path) => fetch(`${path}?v=${VERSION}`, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
      return response.text();
    }))
  )
    .then((parts) => {
      const base64 = parts.map((part) => part.trim()).join("");
      const src = `data:image/webp;base64,${base64}`;
      const preload = new Image();
      preload.decoding = "async";
      preload.onload = function () {
        media.style.backgroundImage = `url("${src}")`;
        media.style.backgroundSize = "auto 118%";
        media.style.backgroundPosition = "72% center";
        media.style.backgroundColor = "#050505";
        media.classList.add("is-hd-ready");
      };
      preload.src = src;
    })
    .catch((error) => console.warn("No se pudo cargar el fondo HD de Estudio Vocal", error));
})();