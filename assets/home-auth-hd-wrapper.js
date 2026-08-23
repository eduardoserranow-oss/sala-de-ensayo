(function () {
  "use strict";
  const core = document.createElement("script");
  core.src = "assets/home-auth-core.js?v=homeui4";
  core.onload = function () {
    const hd = document.createElement("script");
    hd.src = "assets/vocal-hero-hd-loader.js?v=vocalhd1";
    document.head.appendChild(hd);
  };
  document.head.appendChild(core);
})();
