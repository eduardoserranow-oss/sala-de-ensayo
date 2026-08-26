(function(){
  "use strict";

  if(window.__FORTISSIMO_GLOBAL_HEADER_V1__) return;
  window.__FORTISSIMO_GLOBAL_HEADER_V1__=true;

  const HEADER_LOGO="assets/fortissimo-header-logo-v6.jpg?v=fortissimo-header-global1";
  const STYLE_ID="fortissimo-global-header-v1";
  const ICON_VERSION="fortissimo-icon8";
  const ICON_SVG="assets/fortissimo-icon-20260824.svg?v="+ICON_VERSION;
  const ICON_PNG="assets/fortissimo-icon-192-20260824.png?v="+ICON_VERSION;
  const APPLE_ICON="assets/fortissimo-ios-icon-20260824.png?v="+ICON_VERSION;
  const MANIFEST="manifest.webmanifest?v="+ICON_VERSION;

  loadCloudSync();
  applyBrandMetadata();
  installStyle();

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  function boot(){
    normalizeProductHeader();
    installHomeHeroNavigation();
    installVocalHeaderBridge();

    const observer=new MutationObserver(()=>{
      normalizeProductHeader();
      enhanceHomeHeroes();
      syncVocalHeaderState();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  function loadCloudSync(){
    if(window.FortissimoCloud || document.querySelector('script[data-fortissimo-cloud="v1"]')) return;
    const script=document.createElement("script");
    script.src="assets/fortissimo-cloud-v1.js?v=cloud2";
    script.dataset.fortissimoCloud="v1";
    document.head.appendChild(script);
  }

  function ensureMeta(selector,attrs){
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement("meta");document.head.appendChild(node);}
    Object.keys(attrs).forEach(key=>node.setAttribute(key,attrs[key]));
    return node;
  }

  function applyBrandMetadata(){
    const title=document.title || "";
    if(/\bFORTE\b|My Lessons/i.test(title) && !/FORTISSIMO/i.test(title)){
      document.title=title.replace(/My Lessons/gi,"FORTISSIMO").replace(/\bFORTE\b/gi,"FORTISSIMO");
    }
    ensureMeta('meta[name="description"]',{name:"description",content:"FORTISSIMO es tu gimnasio musical para entrenar guitarra, bajo, voz y oído."});
    ensureMeta('meta[name="apple-mobile-web-app-title"]',{name:"apple-mobile-web-app-title",content:"FORTISSIMO"});
    ensureMeta('meta[property="og:site_name"]',{property:"og:site_name",content:"FORTISSIMO"});
    ensureMeta('meta[property="og:image"]',{property:"og:image",content:new URL(ICON_PNG,window.location.href).href});

    document.head.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]').forEach(node=>node.remove());
    const svgIcon=document.createElement("link");
    svgIcon.rel="icon";svgIcon.type="image/svg+xml";svgIcon.href=ICON_SVG;document.head.appendChild(svgIcon);
    const pngIcon=document.createElement("link");
    pngIcon.rel="icon";pngIcon.type="image/png";pngIcon.sizes="192x192";pngIcon.href=ICON_PNG;document.head.appendChild(pngIcon);
    const appleIcon=document.createElement("link");
    appleIcon.rel="apple-touch-icon";appleIcon.type="image/png";appleIcon.sizes="180x180";appleIcon.href=APPLE_ICON;document.head.appendChild(appleIcon);
    let manifest=document.head.querySelector('link[rel="manifest"]');
    if(!manifest){manifest=document.createElement("link");manifest.rel="manifest";document.head.appendChild(manifest);}
    manifest.href=MANIFEST;
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      :root{
        --fortissimo-header-body:82px;
        --fortissimo-header-height:calc(var(--fortissimo-header-body) + env(safe-area-inset-top));
        --fortissimo-header-logo-h:50px;
      }
      .fortissimo-app-header,
      .home-shell .topbar.fortissimo-app-header,
      .routine-header.fortissimo-app-header,
      .sg-header.fortissimo-app-header{
        box-sizing:border-box!important;
        z-index:150!important;
        width:100%!important;
        height:var(--fortissimo-header-height)!important;
        min-height:var(--fortissimo-header-height)!important;
        display:grid!important;
        grid-template-columns:56px minmax(0,1fr) 56px!important;
        align-items:center!important;
        justify-items:stretch!important;
        gap:0!important;
        padding:env(safe-area-inset-top) max(18px,env(safe-area-inset-right)) 0 max(18px,env(safe-area-inset-left))!important;
        background:#050505!important;
        background-image:none!important;
        border:0!important;
        border-bottom:1px solid rgba(255,255,255,.065)!important;
        box-shadow:0 10px 30px rgba(0,0,0,.26)!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        pointer-events:auto!important;
      }
      .home-shell .topbar.fortissimo-app-header{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
      }
      .routine-header.fortissimo-app-header,.sg-header.fortissimo-app-header{
        position:sticky!important;
        top:0!important;
      }
      .fortissimo-app-header .brand-link,
      .fortissimo-app-header .routine-logo-link,
      .fortissimo-app-header .fortissimo-global-logo-link{
        grid-column:2!important;
        grid-row:1!important;
        justify-self:center!important;
        align-self:center!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:auto!important;
        height:var(--fortissimo-header-logo-h)!important;
        max-width:58vw!important;
        padding:0!important;
        margin:0!important;
        line-height:0!important;
        text-decoration:none!important;
        pointer-events:auto!important;
      }
      .fortissimo-app-header .brand-logo.fortissimo-global-logo,
      .fortissimo-app-header .routine-header-logo.fortissimo-global-logo,
      .fortissimo-app-header .sg-logo.fortissimo-global-logo,
      .fortissimo-app-header .fortissimo-global-logo{
        grid-column:2!important;
        grid-row:1!important;
        justify-self:center!important;
        align-self:center!important;
        display:block!important;
        width:auto!important;
        height:var(--fortissimo-header-logo-h)!important;
        max-width:52vw!important;
        max-height:var(--fortissimo-header-logo-h)!important;
        object-fit:contain!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        visibility:visible!important;
      }
      .fortissimo-app-header .home-link,
      .fortissimo-app-header .sg-back,
      .fortissimo-app-header .fortissimo-context-back{
        grid-column:1!important;
        grid-row:1!important;
        justify-self:start!important;
        align-self:center!important;
        width:42px!important;
        height:42px!important;
        min-width:42px!important;
        min-height:42px!important;
        display:grid!important;
        place-items:center!important;
        margin:0!important;
        padding:0 0 2px!important;
        border:1px solid rgba(120,138,158,.30)!important;
        border-radius:50%!important;
        background:#090c10!important;
        color:#fff!important;
        text-decoration:none!important;
        font:300 30px/1 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 6px 18px rgba(0,0,0,.22)!important;
        cursor:pointer!important;
        pointer-events:auto!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .fortissimo-app-header .home-link:active,
      .fortissimo-app-header .sg-back:active,
      .fortissimo-app-header .fortissimo-context-back:active{transform:scale(.95)!important}
      .fortissimo-app-header .ml-tuner-launch{
        position:static!important;
        inset:auto!important;
        grid-column:3!important;
        grid-row:1!important;
        justify-self:end!important;
        align-self:center!important;
        width:36px!important;
        height:36px!important;
        min-width:36px!important;
        min-height:36px!important;
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(255,90,0,.58)!important;
        border-radius:50%!important;
        background:#090909!important;
        color:#ff5a00!important;
        box-shadow:0 6px 18px rgba(0,0,0,.22)!important;
        pointer-events:auto!important;
      }
      .fortissimo-app-header .ml-tuner-launch svg{width:19px!important;height:19px!important}
      .fortissimo-app-header .ml-tuner-launch:hover{background:rgba(255,90,0,.10)!important;box-shadow:0 0 0 1px rgba(255,90,0,.10),0 8px 24px rgba(0,0,0,.25)!important}
      .sg-level-nav{top:var(--fortissimo-header-height)!important}

      body.is-vocal .home-shell{display:block!important;min-height:0!important}
      body.is-vocal .home-shell>main{display:none!important}
      body.is-vocal .vocal-screen{
        display:block!important;
        position:fixed!important;
        z-index:100!important;
        top:var(--fortissimo-header-height)!important;
        right:0!important;
        bottom:0!important;
        left:0!important;
        width:100%!important;
        height:auto!important;
      }
      body.is-vocal .vocal-back{display:none!important}
      body.is-vocal .vocal-frame{width:100%!important;height:100%!important}

      .hero-stack .routine-hero[data-fortissimo-hero-link]{cursor:pointer}
      .hero-stack .routine-hero[data-fortissimo-hero-link]:focus-visible{
        outline:2px solid rgba(255,90,0,.82)!important;
        outline-offset:-4px!important;
      }

      @media(max-width:760px){
        :root{
          --fortissimo-header-body:84px;
          --fortissimo-header-logo-h:48px;
        }
        .fortissimo-app-header,
        .home-shell .topbar.fortissimo-app-header,
        .routine-header.fortissimo-app-header,
        .sg-header.fortissimo-app-header{
          grid-template-columns:50px minmax(0,1fr) 50px!important;
          padding-left:max(17px,env(safe-area-inset-left))!important;
          padding-right:max(17px,env(safe-area-inset-right))!important;
        }
        .fortissimo-app-header .brand-logo.fortissimo-global-logo,
        .fortissimo-app-header .routine-header-logo.fortissimo-global-logo,
        .fortissimo-app-header .sg-logo.fortissimo-global-logo,
        .fortissimo-app-header .fortissimo-global-logo{
          height:48px!important;
          max-height:48px!important;
          max-width:52vw!important;
        }
        .fortissimo-app-header .brand-link,
        .fortissimo-app-header .routine-logo-link,
        .fortissimo-app-header .fortissimo-global-logo-link{height:48px!important;max-width:56vw!important}
        .fortissimo-app-header .home-link,
        .fortissimo-app-header .sg-back,
        .fortissimo-app-header .fortissimo-context-back{
          width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;font-size:28px!important;
        }
        .fortissimo-app-header .ml-tuner-launch{
          width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;
        }
        .fortissimo-app-header .ml-tuner-launch svg{width:18px!important;height:18px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeProductHeader(){
    const header=document.querySelector(".home-shell .topbar,.routine-header,.sg-header,.site-return-header.fortissimo-product-header");
    if(!header) return null;

    header.classList.add("fortissimo-app-header");
    // home-tuner.js looks for .topbar. Giving every product header this class
    // lets the exact same tuner mount without duplicating its audio engine.
    header.classList.add("topbar");

    let logo=header.querySelector(".brand-logo,.routine-header-logo,.sg-logo,.fortissimo-global-logo");
    if(!logo){
      const candidate=header.querySelector("img");
      if(candidate) logo=candidate;
    }
    if(logo){
      logo.classList.add("fortissimo-global-logo");
      logo.alt="FORTISSIMO";
      logo.decoding="async";
      logo.removeAttribute("srcset");
      if(!String(logo.src||"").includes("fortissimo-header-logo-v6.jpg")) logo.src=HEADER_LOGO;
      const link=logo.closest("a");
      if(link) link.classList.add("fortissimo-global-logo-link");
    }

    header.querySelectorAll(".home-link,.sg-back,.fortissimo-context-back").forEach(back=>back.classList.add("fortissimo-global-back"));
    return header;
  }

  function installHomeHeroNavigation(){
    if(window.__FORTISSIMO_HOME_HERO_NAV__) return;
    window.__FORTISSIMO_HOME_HERO_NAV__=true;
    enhanceHomeHeroes();

    document.addEventListener("click",event=>{
      const hero=event.target?.closest?.(".hero-stack .routine-hero[data-fortissimo-hero-link]");
      if(!hero) return;
      if(isHeroInteractiveTarget(event.target)) return;
      activateHero(hero);
    });

    document.addEventListener("keydown",event=>{
      const hero=event.target?.closest?.(".hero-stack .routine-hero[data-fortissimo-hero-link]");
      if(!hero || event.target!==hero) return;
      if(event.key!=="Enter" && event.key!==" ") return;
      event.preventDefault();
      activateHero(hero);
    });
  }

  function enhanceHomeHeroes(){
    document.querySelectorAll(".hero-stack .routine-hero").forEach(hero=>{
      const action=hero.querySelector(".practice-btn");
      if(!action) return;
      hero.dataset.fortissimoHeroLink="true";
      hero.tabIndex=0;
      hero.setAttribute("role","link");
      const title=hero.querySelector("h1")?.textContent?.replace(/\s+/g," ").trim() || "sección";
      hero.setAttribute("aria-label",`Abrir ${title}`);
    });
  }

  function isHeroInteractiveTarget(target){
    if(!target?.closest) return false;
    return Boolean(target.closest([
      "a","button","input","textarea","select","label",
      ".ml-tuner-launch","[data-pin]","[data-pinned]",".pin-button",".home-pin","[role='button']"
    ].join(",")));
  }

  function activateHero(hero){
    const action=hero.querySelector(".practice-btn");
    if(!action) return;
    if(action.tagName==="A") action.click();
    else if(typeof action.click==="function") action.click();
  }

  function installVocalHeaderBridge(){
    const frame=document.getElementById("vocalFrame");
    if(frame && !frame.dataset.fortissimoHeaderBridge){
      frame.dataset.fortissimoHeaderBridge="true";
      frame.addEventListener("load",()=>{
        hideInnerVocalProductHeader(frame);
        syncVocalHeaderState();
      });
      if(frame.contentDocument?.readyState==="complete") hideInnerVocalProductHeader(frame);
    }
    syncVocalHeaderState();
  }

  function hideInnerVocalProductHeader(frame){
    try{
      const doc=frame.contentDocument;
      if(!doc) return;
      const legacy=doc.querySelector(".site-return-header");
      if(legacy) legacy.style.setProperty("display","none","important");
      doc.documentElement.style.scrollPaddingTop="0px";
    }catch(_){ }
  }

  function syncVocalHeaderState(){
    const homeHeader=document.querySelector(".home-shell .topbar.fortissimo-app-header,.home-shell .fortissimo-app-header");
    if(!homeHeader) return;
    const active=document.body.classList.contains("is-vocal");
    let back=homeHeader.querySelector(".fortissimo-context-back");

    if(active){
      if(!back){
        back=document.createElement("button");
        back.type="button";
        back.className="fortissimo-context-back";
        back.setAttribute("aria-label","Volver al Home");
        back.textContent="‹";
        back.addEventListener("click",()=>document.getElementById("closeVocal")?.click());
        homeHeader.appendChild(back);
      }
      back.hidden=false;
      const frame=document.getElementById("vocalFrame");
      if(frame) hideInnerVocalProductHeader(frame);
    }else if(back){
      back.hidden=true;
    }
  }
})();