(function () {
  "use strict";

  const core = document.createElement("script");
  core.src = "assets/home-auth-core.js?v=homeui4";
  core.onload = function () {
    mountSoundGym();

    const hd = document.createElement("script");
    hd.src = "assets/vocal-hero-hd-loader.js?v=vocalhd1";
    document.head.appendChild(hd);
  };
  document.head.appendChild(core);

  function mountSoundGym(){
    const stack = document.querySelector(".hero-stack");
    if(!stack || stack.querySelector(".feature-soundgym")) return;

    const css = document.createElement("style");
    css.id = "soundGymHomeFeatureV1";
    css.textContent = `
      .feature-soundgym .media{
        background:
          radial-gradient(circle at 72% 34%,rgba(255,101,0,.42),transparent 16%),
          radial-gradient(circle at 72% 34%,transparent 0 20%,rgba(255,101,0,.12) 20.5% 21%,transparent 21.5% 29%,rgba(255,101,0,.08) 29.5% 30%,transparent 30.5%),
          repeating-linear-gradient(90deg,transparent 0 44px,rgba(255,255,255,.025) 45px),
          repeating-linear-gradient(0deg,transparent 0 44px,rgba(255,255,255,.018) 45px),
          linear-gradient(135deg,#171719 0%,#080808 58%,#030303 100%)!important;
        background-size:cover!important;
        background-position:center!important;
      }
      .feature-soundgym:before{background:linear-gradient(90deg,rgba(0,0,0,.94),rgba(0,0,0,.70) 38%,rgba(0,0,0,.18) 73%,rgba(0,0,0,.36))!important}
      .feature-soundgym:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.31),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.38))!important}
      .feature-soundgym .sound-gym-mark{position:absolute;right:clamp(7vw,10vw,150px);top:50%;transform:translateY(-50%);width:min(31vw,390px);aspect-ratio:1;border-radius:50%;border:1px solid rgba(255,101,0,.38);box-shadow:0 0 0 32px rgba(255,101,0,.035),0 0 0 64px rgba(255,101,0,.022),0 0 90px rgba(255,101,0,.13);display:grid;place-items:center;color:#ff6500;font-size:clamp(48px,7vw,92px);font-weight:950;letter-spacing:-.08em;opacity:.72;pointer-events:none}
      .feature-soundgym .sound-gym-mark:before,.feature-soundgym .sound-gym-mark:after{content:"";position:absolute;width:15%;height:38%;border:5px solid rgba(255,101,0,.8);top:29%}
      .feature-soundgym .sound-gym-mark:before{left:18%;border-right:0;border-radius:18px 0 0 18px}.feature-soundgym .sound-gym-mark:after{right:18%;border-left:0;border-radius:0 18px 18px 0}
      @media(max-width:760px){
        .feature-soundgym:before{background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.16) 39%,rgba(0,0,0,.86) 79%,rgba(0,0,0,.97))!important}
        .feature-soundgym .sound-gym-mark{right:-7vw;top:35%;width:58vw;opacity:.52}
      }
    `;
    document.head.appendChild(css);

    const hero = document.createElement("article");
    hero.className = "routine-hero feature feature-soundgym";
    hero.innerHTML = `
      <div class="media" aria-hidden="true"></div>
      <div class="sound-gym-mark" aria-hidden="true">SG</div>
      <div class="routine-content">
        <h1>Sound<strong>Gym</strong></h1>
        <p class="feature-description">Gaming room para entrenar EQ, dinámica, frecuencias y oído de estudio.</p>
        <div class="cta-row"><a class="practice-btn" href="sound-gym.html?v=sg1">Practicar <span class="practice-arrow" aria-hidden="true">→</span></a></div>
      </div>
      <span class="scroll-cue" aria-hidden="true"></span>
    `;
    stack.appendChild(hero);

    const io = new IntersectionObserver(entries=>{
      entries.forEach(entry=>hero.classList.toggle("in",entry.isIntersecting && entry.intersectionRatio > .42));
    },{threshold:[0,.42,.65]});
    io.observe(hero);
  }
})();
