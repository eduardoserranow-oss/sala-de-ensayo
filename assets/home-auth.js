(function(){
  "use strict";

  const VERSION = "homeui4";
  const SPLASH_KEY = "myLessons.splashSeen.v2";
  const SESSION_KEY = "myLessons.localSession";
  const splash = document.getElementById("appSplash");

  installSplashStyles();
  installAudioCredits();
  installHomeDesign();
  runLaunch();

  function getSession(){
    try{
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || JSON.parse(sessionStorage.getItem(SESSION_KEY));
    }catch(_){ return null; }
  }

  function runLaunch(){
    const hasSession = Boolean(getSession()?.user?.email);
    if(!splash){ route(hasSession); return; }
    if(sessionStorage.getItem(SPLASH_KEY)==="true"){
      splash.classList.add("is-hidden");
      route(hasSession);
      return;
    }

    splash.innerHTML = '<div class="launch-logo-stage" aria-hidden="true"><img class="launch-logo-full" src="assets/logo-my-guitar-lessons.svg?v=logo3" alt=""><img class="launch-logo-mark" src="assets/logo-mark-orange.svg?v=launch4" alt=""><span class="launch-orange-fill"></span></div>';
    splash.classList.add("is-launching");
    setTimeout(()=>splash.classList.add("is-expanding"),980);

    if(hasSession){
      setTimeout(()=>splash.classList.add("is-revealing"),1460);
      setTimeout(()=>{
        sessionStorage.setItem(SPLASH_KEY,"true");
        splash.classList.add("is-hidden");
      },1680);
    }else{
      setTimeout(()=>{
        sessionStorage.setItem(SPLASH_KEY,"true");
        route(false);
      },1510);
    }
  }

  function route(hasSession){
    if(hasSession) return;
    const u = new URL("login.html",location.href);
    u.searchParams.set("v",VERSION);
    u.searchParams.set("returnTo",`./?v=${VERSION}`);
    location.replace(u.href);
  }

  function installSplashStyles(){
    const s=document.createElement("style");
    s.textContent=`
      #appSplash.app-splash{overflow:hidden!important;background:#050505!important;opacity:1!important;visibility:visible!important;transition:opacity .18s ease,visibility .18s ease!important}
      #appSplash .launch-logo-stage{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;isolation:isolate}
      #appSplash .launch-logo-full,#appSplash .launch-logo-mark{position:absolute;width:min(310px,68vw)!important;height:auto!important;border-radius:0!important;box-shadow:none!important;will-change:transform,opacity;transform:scale(.965);opacity:0}
      #appSplash.is-launching .launch-logo-full{animation:homeLogoIn .28s cubic-bezier(.22,1,.36,1) forwards}
      #appSplash .launch-logo-mark{z-index:3;transform-origin:24% 51%}
      #appSplash .launch-orange-fill{position:absolute;z-index:2;left:calc(50% - min(310px,68vw)*.365);top:50%;width:34px;height:34px;border-radius:999px;background:#ff6f0b;transform:translate(-50%,-50%) scale(.1);opacity:0;will-change:transform,opacity}
      #appSplash.is-expanding .launch-logo-full{opacity:0!important;transform:scale(1.01);transition:opacity .12s ease,transform .12s ease}
      #appSplash.is-expanding .launch-logo-mark{opacity:1;transform:scale(12);transition:transform .48s cubic-bezier(.22,1,.36,1),opacity .05s linear}
      #appSplash.is-expanding .launch-orange-fill{opacity:1;transform:translate(-50%,-50%) scale(90);transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .03s linear}
      #appSplash.is-revealing,#appSplash.is-hidden{opacity:0!important;pointer-events:none}
      #appSplash.is-hidden{visibility:hidden!important}
      @keyframes homeLogoIn{to{opacity:1;transform:scale(1)}}
      .audio-credits-link{border:0;background:transparent;color:rgba(255,255,255,.46);font-size:10px;font-weight:700;padding:5px 7px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
      .audio-credits-backdrop{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}
      .audio-credits-backdrop[hidden]{display:none}
      .audio-credits-card{position:relative;width:min(440px,100%);padding:25px 22px 22px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:#111;color:#fff}
      .audio-credits-card p{color:rgba(255,255,255,.72);font-size:12px;line-height:1.5}.audio-credits-card a{color:#ff7a18}
      .audio-credits-close{position:absolute;right:12px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:20px}
    `;
    document.head.appendChild(s);
  }

  function installHomeDesign(){
    const stack=document.querySelector(".hero-stack");
    const wheel=document.querySelector(".wheel-section");
    if(!stack||!wheel) return;

    const heroes=[...stack.querySelectorAll(":scope > .routine-hero")];
    const guitar=heroes[0], bass=heroes[1], vocal=heroes[2];
    if(!guitar||!bass||!vocal) return;

    const oldStyles=document.querySelector(".styles-section");
    const footer=oldStyles?.querySelector(".home-footer") || document.querySelector(".home-footer");
    if(oldStyles) oldStyles.hidden=true;
    if(footer) wheel.appendChild(footer);

    const css=document.createElement("style");
    css.id="homeDesignV4";
    css.textContent=`
      html{scroll-snap-type:y mandatory!important;overflow-x:hidden!important;background:#050505}
      body{overflow-x:hidden!important;background:#050505!important}
      .home-shell{overflow-x:hidden!important}
      .home-shell .topbar{height:88px;justify-content:center;background:linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.12) 72%,transparent);pointer-events:none}
      .home-shell .brand-link{pointer-events:auto;opacity:0;filter:blur(11px);transform:translateY(-5px) scale(.985)}
      .home-shell .brand-link.ready{animation:brandIn .72s cubic-bezier(.22,1,.36,1) forwards}
      .home-shell .brand-logo{height:46px;max-width:162px}
      @keyframes brandIn{to{opacity:1;filter:blur(0);transform:none}}

      .hero-stack .routine-hero.feature{height:100svh;min-height:100svh;scroll-snap-align:start;scroll-snap-stop:always;position:relative;display:flex;align-items:center;padding:112px clamp(28px,8vw,118px) 72px;background:#050505!important;isolation:isolate;overflow:hidden}
      .feature .media{position:absolute;inset:-22%;z-index:-4;background-size:cover;background-repeat:no-repeat;transform:translate3d(0,var(--p,0px),0) scale(1.22);will-change:transform;filter:saturate(.92) contrast(1.06) brightness(.82)}
      .feature-guitar .media{background-image:url('assets/foto-guitar-routine.jpg');background-position:center 20%}
      .feature-bass .media{background-image:url('assets/foto-bass-routine.jpg');background-position:center 48%}
      .feature-vocal .media{background-image:url('assets/vocal-hero-approved.webp');background-size:auto 118%;background-position:72% center;background-color:#050505}
      .feature:before{content:"";position:absolute;inset:0;z-index:-3;background:linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.67) 35%,rgba(0,0,0,.17) 70%,rgba(0,0,0,.25));pointer-events:none}
      .feature-bass:before{background:linear-gradient(270deg,rgba(0,0,0,.92),rgba(0,0,0,.68) 34%,rgba(0,0,0,.18) 69%,rgba(0,0,0,.28))}
      .feature-vocal:before{background:linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.67) 35%,rgba(0,0,0,.16) 70%,rgba(0,0,0,.26))}
      .feature:after{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.3),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.34));pointer-events:none}
      .feature-bass:after{background:radial-gradient(circle at 83% 80%,rgba(255,92,0,.28),transparent 28%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.34))}
      .feature-vocal:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.28),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.36))}
      .feature .routine-content{position:relative;z-index:2;width:min(440px,42vw);text-transform:none;opacity:0;transform:translateY(24px);filter:blur(5px);transition:opacity .62s ease,transform .72s cubic-bezier(.22,1,.36,1),filter .62s ease}
      .feature-bass .routine-content{margin-left:auto}
      .feature.in .routine-content{opacity:1;transform:none;filter:blur(0)}
      .feature .routine-content:before{content:"";display:block;width:44px;height:2px;margin:0 0 16px;background:#ff6500;box-shadow:0 0 18px rgba(255,101,0,.55)}
      .feature .routine-content h1{margin:0 0 20px;font-size:clamp(34px,4.4vw,66px);line-height:.94;letter-spacing:-.04em;font-weight:300;text-shadow:0 8px 34px rgba(0,0,0,.55)}
      .feature .routine-content h1 strong{display:block;margin-top:5px;color:#fff;font-weight:860}
      .feature .feature-description{margin:0 0 24px;max-width:355px;color:rgba(255,255,255,.66);font-size:clamp(14px,1.1vw,17px);line-height:1.48}
      .feature .practice-btn{min-width:176px;min-height:50px;padding:0 20px 0 23px;justify-content:space-between;gap:28px;border:1px solid rgba(255,101,0,.9);border-radius:8px;background:rgba(15,8,3,.48);backdrop-filter:blur(10px);color:#fff;font-size:16px;font-weight:720;opacity:0;transform:translateY(15px)}
      .feature.in .practice-btn{animation:btnIn .62s cubic-bezier(.22,1,.36,1) .28s forwards,glow 1.1s ease .72s 1}
      @keyframes btnIn{to{opacity:1;transform:none}}@keyframes glow{42%{box-shadow:0 0 28px rgba(255,92,0,.34)}}
      .scroll-cue{position:absolute;left:50%;bottom:22px;width:18px;height:18px;border-right:1.5px solid rgba(255,255,255,.8);border-bottom:1.5px solid rgba(255,255,255,.8);transform:translateX(-50%) rotate(45deg);animation:cue 1.7s ease-in-out infinite}
      @keyframes cue{50%{transform:translate(-50%,5px) rotate(45deg)}}

      .wheel-section{--wp:0px;box-sizing:border-box!important;width:100%!important;max-width:100vw!important;height:100svh!important;min-height:100svh!important;scroll-snap-align:start;scroll-snap-stop:always;position:relative;overflow:hidden!important;background:#050505!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:86px 12px 54px!important;isolation:isolate}
      .wheel-section:before{content:"";position:absolute;inset:-22%;z-index:-2;background:radial-gradient(circle at 17% 72%,rgba(255,90,0,.20),transparent 25%),radial-gradient(circle at 82% 38%,rgba(255,90,0,.11),transparent 23%),radial-gradient(circle at 50% 90%,rgba(255,106,0,.13),transparent 28%);transform:translate3d(0,var(--wp),0) scale(1.18);will-change:transform}
      .wheel-section .wheel-app{box-sizing:border-box!important;width:100%!important;max-width:720px!important;margin:0 auto!important;padding:0!important;display:grid!important;grid-template-rows:auto auto auto auto!important;justify-items:center!important;align-content:center!important;gap:10px!important;opacity:0;transform:translateY(24px);filter:blur(4px);transition:.7s cubic-bezier(.22,1,.36,1)}
      .wheel-section.in .wheel-app{opacity:1;transform:none;filter:blur(0)}
      .wheel-section .note-icon{margin:0!important;color:#ff6500!important;font-size:28px!important;line-height:1!important}
      .wheel-section .wheel-app h2{box-sizing:border-box!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0 8px!important;white-space:normal!important;overflow-wrap:anywhere!important;text-align:center!important;font-size:clamp(38px,5.3vw,66px)!important;line-height:.95!important;letter-spacing:-.05em!important;font-weight:950!important}
      .wheel-section .wheel-wrap{box-sizing:border-box!important;width:min(520px,62vh,72vw)!important;max-width:calc(100vw - 28px)!important;margin:4px auto 2px!important;aspect-ratio:1/1!important}
      .wheel-section .wheel{background:radial-gradient(circle at 50% 46%,#242424,#151515 62%,#0b0b0b)!important;border:2px solid #ff6500!important;box-shadow:0 0 0 1px rgba(255,101,0,.20),0 0 30px rgba(255,92,0,.14),0 20px 48px rgba(0,0,0,.55)!important}
      .wheel-section .ring-divider.outer{border-color:rgba(255,255,255,.42)!important}.wheel-section .ring-divider.inner{border-color:rgba(255,101,0,.34)!important}
      .wheel-section .spin-button{width:28%!important;border:2px solid #111!important;background:#ff6500!important;color:#fff!important;font-size:clamp(16px,3.7vw,28px)!important;font-weight:900!important;box-shadow:0 9px 28px rgba(255,92,0,.28)!important}
      .wheel-section .results{box-sizing:border-box!important;width:min(690px,calc(100vw - 24px))!important;max-width:100%!important;margin:2px auto 0!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
      .wheel-section .result-card{box-sizing:border-box!important;min-width:0!important;min-height:92px!important;padding:10px 5px!important;border-radius:14px!important;border:1px solid rgba(255,101,0,.42)!important;background:rgba(10,10,10,.72)!important;box-shadow:none!important;overflow:hidden!important}
      .wheel-section .result-title{margin:0 0 6px!important;color:#ff6500!important;font-size:9px!important;line-height:1.05!important;white-space:nowrap!important}
      .wheel-section .result-chord{font-size:clamp(22px,4vw,40px)!important;font-weight:900!important;line-height:1!important}
      .wheel-section .home-footer{position:absolute!important;left:0!important;right:0!important;bottom:max(4px,env(safe-area-inset-bottom))!important;width:100%!important;margin:0!important;padding:0 10px!important;background:transparent!important;display:flex!important;justify-content:center!important;align-items:center!important;gap:8px!important;z-index:4!important}
      .wheel-section .logout-button{min-height:28px!important;padding:0 10px!important;font-size:9px!important;opacity:.52!important}
      .wheel-section .audio-credits-link{font-size:9px!important;opacity:.62!important}

      @media(max-width:760px){
        .home-shell .topbar{height:90px;padding-top:max(12px,env(safe-area-inset-top))}
        .home-shell .brand-logo{height:44px;max-width:150px}
        .hero-stack .routine-hero.feature{height:100svh;min-height:100svh;padding:max(104px,calc(env(safe-area-inset-top) + 82px)) 26px max(76px,calc(env(safe-area-inset-bottom) + 52px));align-items:flex-end}
        .feature .media{inset:-24% -22%;transform:translate3d(0,var(--p,0px),0) scale(1.27)}
        .feature-vocal .media{inset:-16% -10%;background-size:auto 106%;background-position:54% 42%;transform:translate3d(0,var(--p,0px),0) scale(1.18)}
        .feature:before,.feature-bass:before,.feature-vocal:before{background:linear-gradient(180deg,rgba(0,0,0,.07),rgba(0,0,0,.11) 37%,rgba(0,0,0,.86) 80%,rgba(0,0,0,.96))}
        .feature .routine-content,.feature-bass .routine-content,.feature-vocal .routine-content{width:min(330px,88vw);margin:0}
        .feature .routine-content h1{font-size:clamp(32px,9.4vw,43px)}

        .wheel-section{padding:max(82px,calc(env(safe-area-inset-top) + 66px)) 12px max(42px,calc(env(safe-area-inset-bottom) + 26px))!important;align-items:center!important}
        .wheel-section .wheel-app{max-width:100%!important;gap:8px!important;align-content:center!important}
        .wheel-section .note-icon{font-size:22px!important}
        .wheel-section .wheel-app h2{padding:0 4px!important;font-size:clamp(32px,9.2vw,42px)!important;line-height:.93!important;letter-spacing:-.045em!important}
        .wheel-section .wheel-wrap{width:min(82vw,42svh,360px)!important;max-width:calc(100vw - 28px)!important;margin:2px auto 2px!important}
        .wheel-section .chord-label.major{font-size:clamp(12px,3.7vw,17px)!important}.wheel-section .chord-label.minor{font-size:clamp(10px,3.15vw,14px)!important}
        .wheel-section .spin-button{font-size:clamp(15px,4.1vw,20px)!important}
        .wheel-section .results{width:calc(100vw - 24px)!important;gap:6px!important;margin-top:2px!important}
        .wheel-section .result-card{min-height:78px!important;padding:8px 3px!important;border-radius:12px!important}
        .wheel-section .result-title{font-size:clamp(7px,2.25vw,9px)!important;letter-spacing:.02em!important}
        .wheel-section .result-chord{font-size:clamp(22px,6.2vw,30px)!important}
        .wheel-section .home-footer{bottom:max(2px,env(safe-area-inset-bottom))!important;gap:5px!important}
        .wheel-section .logout-button{min-height:25px!important;padding:0 8px!important;font-size:8px!important}.wheel-section .audio-credits-link{font-size:8px!important;padding:4px 5px!important}
      }

      @media(max-width:390px), (max-height:720px){
        .wheel-section{padding-top:max(74px,calc(env(safe-area-inset-top) + 58px))!important;padding-bottom:max(38px,calc(env(safe-area-inset-bottom) + 22px))!important}
        .wheel-section .wheel-app{gap:6px!important}
        .wheel-section .note-icon{font-size:19px!important}
        .wheel-section .wheel-app h2{font-size:clamp(29px,8.7vw,37px)!important}
        .wheel-section .wheel-wrap{width:min(78vw,39svh,320px)!important}
        .wheel-section .result-card{min-height:69px!important}
        .wheel-section .result-title{margin-bottom:4px!important}
      }

      @media(prefers-reduced-motion:reduce){.home-shell .brand-link,.feature .routine-content,.feature .practice-btn,.wheel-section .wheel-app{opacity:1!important;filter:none!important;transform:none!important;animation:none!important}.feature .media{transform:scale(1.12)!important}}
    `;
    document.head.appendChild(css);

    prepareHero(guitar,"guitar","Rutina de","Guitarra","Ejercicios para técnica, ritmo, escalas y creatividad.","guitar-practice.html?v=factory1");
    prepareHero(bass,"bass","Rutina de","Bajo","Groove, precisión y control para tu práctica.","bass-practice.html?v=factory1");
    prepareHero(vocal,"vocal","Estudio","Vocal","Afinación, respiración y control para tu práctica vocal.","#estudio-vocal");

    const brand=document.querySelector(".brand-link");
    requestAnimationFrame(()=>brand?.classList.add("ready"));

    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>e.target.classList.toggle("in",e.isIntersecting&&e.intersectionRatio>.42));
    },{threshold:[0,.42,.65]});
    [guitar,bass,vocal,wheel].forEach(el=>io.observe(el));

    let raf=0;
    function updateParallax(){
      raf=0;
      const vh=Math.max(innerHeight,1);
      [guitar,bass,vocal].forEach(hero=>{
        const media=hero.querySelector(".media");
        if(!media) return;
        const r=hero.getBoundingClientRect();
        const d=(r.top+r.height/2)-vh/2;
        const amount=Math.max(-190,Math.min(190,-d*.34));
        media.style.setProperty("--p",amount+"px");
      });
      const wr=wheel.getBoundingClientRect();
      const wd=(wr.top+wr.height/2)-vh/2;
      wheel.style.setProperty("--wp",Math.max(-130,Math.min(130,-wd*.2))+"px");
    }
    function req(){ if(raf) return; raf=requestAnimationFrame(updateParallax); }
    addEventListener("scroll",req,{passive:true});
    addEventListener("resize",req,{passive:true});
    req();
  }

  function prepareHero(hero,kind,first,strong,desc,href){
    hero.classList.add("feature","feature-"+kind);
    if(!hero.querySelector(".media")){
      const m=document.createElement("div");
      m.className="media";
      hero.prepend(m);
    }
    const content=hero.querySelector(".routine-content");
    const title=content?.querySelector("h1");
    const button=content?.querySelector(".practice-btn");
    if(title) title.innerHTML=`${first}<strong>${strong}</strong>`;
    if(content&&desc&&!content.querySelector(".feature-description")){
      const p=document.createElement("p"); p.className="feature-description"; p.textContent=desc;
      content.insertBefore(p,content.querySelector(".cta-row"));
    }
    if(button){
      if(button.tagName==="A") button.href=href;
      button.innerHTML='Practicar <span class="practice-arrow" aria-hidden="true">→</span>';
    }
    if(!hero.querySelector(".scroll-cue")){
      const q=document.createElement("span"); q.className="scroll-cue"; q.setAttribute("aria-hidden","true"); hero.appendChild(q);
    }
  }

  function installAudioCredits(){
    const footer=document.querySelector(".home-footer");
    const logout=document.getElementById("logoutButton");
    logout?.addEventListener("click",()=>{
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SPLASH_KEY);
      const u=new URL("login.html",location.href);
      u.searchParams.set("v",VERSION);
      u.searchParams.set("returnTo",`./?v=${VERSION}`);
      location.replace(u.href);
    });
    if(!footer||document.getElementById("audioCreditsButton")) return;

    const b=document.createElement("button");
    b.id="audioCreditsButton"; b.type="button"; b.className="audio-credits-link"; b.textContent="Audio Credits";
    footer.appendChild(b);

    const d=document.createElement("div");
    d.className="audio-credits-backdrop"; d.id="audioCreditsBackdrop"; d.hidden=true;
    d.innerHTML='<section class="audio-credits-card" role="dialog" aria-modal="true" aria-label="Audio Credits"><button class="audio-credits-close" type="button" aria-label="Cerrar">×</button><h2>Audio Credits</h2><p>Instrument samples powered by <strong>tonejs-instruments</strong>. Samples licensed under <strong>CC BY 3.0</strong>.</p><p>Acoustic Guitar: University of Iowa · Electric Guitar & Electric Bass: Karoryfer · Nylon Guitar: Freesound / quartertone.</p><p><a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noopener">Source & license</a></p></section>';
    document.body.appendChild(d);
    b.addEventListener("click",()=>d.hidden=false);
    d.addEventListener("click",e=>{ if(e.target===d||e.target.closest(".audio-credits-close")) d.hidden=true; });
  }
})();
