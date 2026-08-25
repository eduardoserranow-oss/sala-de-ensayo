(function () {
  "use strict";

  const VERSION = "vocalhd1";
  const PARTS = [
    "assets/vocal-hero-hd.b64",
    "assets/vocal-hero-hd-2.b64",
    "assets/vocal-hero-hd-3.b64",
    "assets/vocal-hero-hd-4.b64",
    "assets/vocal-hero-hd-5.b64",
    "assets/vocal-hero-hd-6.b64"
  ];

  function applyBassHeroFix() {
    const bassMedia = document.querySelector(".feature-bass .media");
    if (!bassMedia) return;

    bassMedia.style.setProperty("background-image", "url('assets/foto-bass-routine.PNG?v=userupload2')", "important");
    bassMedia.style.setProperty("background-repeat", "no-repeat", "important");
    bassMedia.style.setProperty("background-color", "#050505", "important");

    if (window.innerWidth <= 760) {
      bassMedia.style.setProperty("inset", "0", "important");
      bassMedia.style.setProperty("background-size", "contain", "important");
      bassMedia.style.setProperty("background-position", "center 38%", "important");
      bassMedia.style.setProperty("transform", "none", "important");
      bassMedia.style.setProperty("filter", "saturate(.98) contrast(1.05) brightness(1.04)", "important");
    } else {
      bassMedia.style.setProperty("inset", "-22%", "important");
      bassMedia.style.setProperty("background-size", "cover", "important");
      bassMedia.style.setProperty("background-position", "center 48%", "important");
      bassMedia.style.setProperty("transform", "translate3d(0,var(--p,0px),0) scale(1.14)", "important");
      bassMedia.style.setProperty("filter", "saturate(.95) contrast(1.05) brightness(.92)", "important");
    }
  }

  applyBassHeroFix();
  addEventListener("resize", applyBassHeroFix, { passive: true });
  requestAnimationFrame(applyBassHeroFix);
  setTimeout(applyBassHeroFix, 180);

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
