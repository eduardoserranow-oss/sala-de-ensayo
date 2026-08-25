(function(){
  "use strict";

  const HEADER_LOGO = "assets/fortissimo-header-logo-v6.jpg?v=fortissimo-header6";
  const STYLE_ID = "fortissimo-header-clean-v6";
  const ICON_VERSION = "fortissimo-icon7";
  const ICON_SVG = "assets/fortissimo-icon-20260824.svg?v=" + ICON_VERSION;
  const ICON_PNG = "assets/fortissimo-icon-192-20260824.png?v=" + ICON_VERSION;
  const APPLE_ICON = "assets/fortissimo-ios-icon-20260824.png?v=" + ICON_VERSION;
  const MANIFEST = "manifest.webmanifest?v=" + ICON_VERSION;

  function loadCloudSync(){
    if(window.FortissimoCloud || document.querySelector('script[data-fortissimo-cloud="v1"]')) return;
    const script=document.createElement("script");
    script.src="assets/fortissimo-cloud-v1.js?v=cloud1";
    script.dataset.fortissimoCloud="v1";
    document.head.appendChild(script);
  }

  function ensureMeta(selector, attrs){
    let node = document.head.querySelector(selector);
    if(!node){ node = document.createElement("meta"); document.head.appendChild(node); }
    Object.keys(attrs).forEach(function(key){ node.setAttribute(key, attrs[key]); });
    return node;
  }

  function applyBrandMetadata(){
    document.title = "FORTISSIMO | Gym for Musician";
    ensureMeta('meta[name="description"]',{name:"description",content:"FORTISSIMO es tu gimnasio musical para entrenar guitarra, bajo, voz y oído."});
    ensureMeta('meta[name="apple-mobile-web-app-title"]',{name:"apple-mobile-web-app-title",content:"FORTISSIMO"});
    ensureMeta('meta[property="og:title"]',{property:"og:title",content:"FORTISSIMO | Gym for Musician"});
    ensureMeta('meta[property="og:site_name"]',{property:"og:site_name",content:"FORTISSIMO"});
    ensureMeta('meta[property="og:image"]',{property:"og:image",content:new URL(ICON_PNG,window.location.href).href});

    document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').forEach(function(node){ node.remove(); });

    const svgIcon=document.createElement("link");
    svgIcon.rel="icon"; svgIcon.type="image/svg+xml"; svgIcon.href=ICON_SVG; document.head.appendChild(svgIcon);
    const pngIcon=document.createElement("link");
    pngIcon.rel="icon"; pngIcon.type="image/png"; pngIcon.sizes="192x192"; pngIcon.href=ICON_PNG; document.head.appendChild(pngIcon);
    const appleIcon=document.createElement("link");
    appleIcon.rel="apple-touch-icon"; appleIcon.type="image/png"; appleIcon.sizes="180x180"; appleIcon.href=APPLE_ICON; document.head.appendChild(appleIcon);

    let manifest=document.head.querySelector('link[rel="manifest"]');
    if(!manifest){ manifest=document.createElement("link"); manifest.rel="manifest"; document.head.appendChild(manifest); }
    manifest.href=MANIFEST;
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .topbar .brand-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:0!important}
      .topbar .brand-logo{display:block!important;width:196px!important;max-width:50vw!important;height:auto!important;object-fit:contain!important;border:0!important;box-shadow:none!important;background:transparent!important;visibility:hidden!important}
      .topbar .brand-logo.is-fortissimo-ready{visibility:visible!important}
      @media(max-width:760px){.topbar .brand-logo{width:164px!important;max-width:46vw!important}}
    `;
    document.head.appendChild(style);
  }

  function applyHeader(){
    installStyle();
    const logo=document.querySelector(".topbar .brand-logo");
    if(!logo){ requestAnimationFrame(applyHeader); return; }
    logo.classList.remove("is-fortissimo-ready");
    logo.alt="FORTISSIMO";
    logo.decoding="async";
    logo.removeAttribute("srcset");
    const reveal=function(){ if(logo.naturalWidth>0) logo.classList.add("is-fortissimo-ready"); };
    logo.onload=function(){ if(typeof logo.decode==="function"){ logo.decode().catch(function(){}).finally(reveal); } else { reveal(); } };
    logo.onerror=function(){ logo.classList.remove("is-fortissimo-ready"); };
    logo.src=HEADER_LOGO;
    if(logo.complete&&logo.naturalWidth>0) reveal();
  }

  loadCloudSync();
  applyBrandMetadata();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",applyHeader,{once:true});
  else applyHeader();
})();
