(function(){
  "use strict";

  const isMobile = matchMedia("(max-width: 820px)").matches || matchMedia("(pointer: coarse)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const legacy = document.querySelector(".app-splash");
  const params = new URL(location.href).searchParams;
  let cameFromLogin = params.get("handoff") === "1";
  try { cameFromLogin = cameFromLogin || sessionStorage.getItem("forte.launchHandoff.v3") === "true"; } catch (_) {}

  // Desktop already has its native launcher. Never show a second web splash.
  if (!isMobile) {
    if (legacy) legacy.style.setProperty("display","none","important");
    document.documentElement.classList.add("fortissimo-launch-ready");
    return;
  }

  // The PWA start page already showed the cinematic icon. Do not play a second splash on Home.
  if (cameFromLogin) {
    if (legacy) legacy.style.setProperty("display","none","important");
    document.documentElement.classList.add("fortissimo-launch-ready");
    try { sessionStorage.removeItem("forte.launchHandoff.v3"); } catch (_) {}
    return;
  }

  // Disable the old web splash completely; mobile gets one clean native-like intro.
  if (legacy) legacy.style.setProperty("display","none","important");

  const style = document.createElement("style");
  style.id = "fortissimoCinematicLaunchStyle";
  style.textContent = `
    #fortissimoCinematicSplash{
      position:fixed;inset:0;z-index:2147483000;background:#050505;
      display:grid;place-items:center;overflow:hidden;
      opacity:1;visibility:visible;
      clip-path:circle(150vmax at 50% 50%);
      -webkit-clip-path:circle(150vmax at 50% 50%);
      will-change:clip-path,opacity;
    }
    #fortissimoCinematicSplash img{
      width:clamp(76px,22vw,116px);height:auto;display:block;
      transform:scale(.92);opacity:0;
      animation:fortissimoIconIn .42s cubic-bezier(.2,.8,.2,1) .08s forwards;
      filter:drop-shadow(0 10px 28px rgba(0,0,0,.3));
    }
    body.fortissimo-cinematic-enter .home-shell,
    body.fortissimo-cinematic-enter .home-auth-gate{
      opacity:.58;filter:blur(10px);transform:scale(.985);
      transform-origin:50% 50%;
      transition:opacity .64s cubic-bezier(.2,.8,.2,1),filter .64s cubic-bezier(.2,.8,.2,1),transform .64s cubic-bezier(.2,.8,.2,1);
      will-change:opacity,filter,transform;
    }
    body.fortissimo-cinematic-enter.fortissimo-home-revealed .home-shell,
    body.fortissimo-cinematic-enter.fortissimo-home-revealed .home-auth-gate{
      opacity:1;filter:blur(0);transform:scale(1);
    }
    #fortissimoCinematicSplash.fortissimo-iris-out{
      animation:fortissimoIrisOut .66s cubic-bezier(.7,0,.2,1) forwards;
    }
    @keyframes fortissimoIconIn{
      from{opacity:0;transform:scale(.92)}
      to{opacity:1;transform:scale(1)}
    }
    @keyframes fortissimoIrisOut{
      0%{clip-path:circle(150vmax at 50% 50%);-webkit-clip-path:circle(150vmax at 50% 50%);opacity:1}
      100%{clip-path:circle(0 at 50% 50%);-webkit-clip-path:circle(0 at 50% 50%);opacity:0}
    }
    @media (prefers-reduced-motion: reduce){
      #fortissimoCinematicSplash img{animation:none;opacity:1;transform:none}
      #fortissimoCinematicSplash.fortissimo-iris-out{animation:none;opacity:0;visibility:hidden}
      body.fortissimo-cinematic-enter .home-shell,
      body.fortissimo-cinematic-enter .home-auth-gate{transition:none;opacity:1;filter:none;transform:none}
    }
  `;
  document.head.appendChild(style);

  document.body.classList.add("fortissimo-cinematic-enter");
  const splash = document.createElement("div");
  splash.id = "fortissimoCinematicSplash";
  splash.setAttribute("aria-hidden","true");
  const icon = document.createElement("img");
  icon.src = "assets/fortissimo-icon-20260824.svg?v=cinematic2";
  icon.alt = "";
  splash.appendChild(icon);
  document.body.appendChild(splash);

  const startReveal = () => {
    document.body.classList.add("fortissimo-home-revealed");
    if (reduced) {
      splash.remove();
      return;
    }
    splash.classList.add("fortissimo-iris-out");
    setTimeout(()=>splash.remove(),720);
  };

  const delay = reduced ? 80 : 820;
  setTimeout(startReveal, delay);
})();