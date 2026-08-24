(function(){
  "use strict";

  const HEADER_LOGO = "assets/fortissimo-header-logo-v6.jpg?v=fortissimo-header6";
  const STYLE_ID = "fortissimo-header-clean-v6";

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .topbar .brand-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:0!important}
      .topbar .brand-logo{display:block!important;width:196px!important;max-width:50vw!important;height:auto!important;object-fit:contain!important;border:0!important;box-shadow:none!important;background:transparent!important;visibility:hidden!important}
      .topbar .brand-logo.is-fortissimo-ready{visibility:visible!important}
      @media(max-width:760px){.topbar .brand-logo{width:164px!important;max-width:46vw!important}}
    `;
    document.head.appendChild(style);
  }

  function applyHeader(){
    installStyle();
    const logo = document.querySelector(".topbar .brand-logo");
    if(!logo){
      requestAnimationFrame(applyHeader);
      return;
    }

    logo.classList.remove("is-fortissimo-ready");
    logo.alt = "FORTISSIMO";
    logo.decoding = "async";
    logo.removeAttribute("srcset");

    const reveal = function(){
      if(logo.naturalWidth > 0) logo.classList.add("is-fortissimo-ready");
    };

    logo.onload = function(){
      if(typeof logo.decode === "function"){
        logo.decode().catch(function(){}).finally(reveal);
      }else{
        reveal();
      }
    };
    logo.onerror = function(){
      logo.classList.remove("is-fortissimo-ready");
    };

    logo.src = HEADER_LOGO;
    if(logo.complete && logo.naturalWidth > 0) reveal();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", applyHeader, {once:true});
  }else{
    applyHeader();
  }
})();
