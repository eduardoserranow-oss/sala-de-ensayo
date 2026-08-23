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
