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
    css.id = "soundGymHomeFeatureV3";
    css.textContent = `
      .feature-soundgym .media{
        background-image:url('assets/foto-sound-gym.jpg?v=sgcover2')!important;
        background-size:cover!important;
        background-position:center center!important;
        background-repeat:no-repeat!important;
      }
      .feature-soundgym:before{background:linear-gradient(90deg,rgba(0,0,0,.91),rgba(0,0,0,.58) 38%,rgba(0,0,0,.12) 73%,rgba(0,0,0,.28))!important}
      .feature-soundgym:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.25),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.34))!important}
      @media(max-width:760px){
        .feature-soundgym .media{background-position:center center!important}
        .feature-soundgym:before{background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.08) 38%,rgba(0,0,0,.70) 70%,rgba(0,0,0,.95))!important}
        .feature-soundgym:after{background:radial-gradient(circle at 18% 80%,rgba(255,92,0,.22),transparent 31%),linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.22))!important}
      }
    `;
    document.head.appendChild(css);

    const hero = document.createElement("article");
    hero.className = "routine-hero feature feature-soundgym";
    hero.innerHTML = `
      <div class="media" aria-hidden="true"></div>
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
