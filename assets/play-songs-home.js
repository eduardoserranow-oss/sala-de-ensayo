(function(){
  "use strict";

  const RETURN_TARGET_KEY="fortissimo.home.returnTarget.v1";
  const RETURN_SCROLL_KEY="fortissimo.home.returnScrollY.v1";
  let attempts=0;

  function mount(){
    const stack=document.querySelector(".hero-stack");
    if(!stack || stack.querySelector(".feature-playsongs")) return;

    // Home personalization moves the existing modules during boot. Wait until
    // it has settled so Play Songs stays at the end of the current home order.
    if(!document.getElementById("resetHomeOrder") && attempts<12){
      attempts++;
      setTimeout(mount,120);
      return;
    }

    const style=document.createElement("style");
    style.id="playSongsHomeStylesV1";
    style.textContent=`
      .feature-playsongs .media{inset:0!important;transform:none!important;filter:none!important;background:
        radial-gradient(circle at 76% 28%,rgba(255,101,0,.18),transparent 26%),
        radial-gradient(circle at 86% 76%,rgba(255,101,0,.11),transparent 30%),
        linear-gradient(135deg,#111 0%,#090909 48%,#050505 100%)!important}
      .feature-playsongs:before{background:linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.18) 52%,rgba(0,0,0,.08))!important}
      .feature-playsongs:after{background:radial-gradient(circle at 14% 82%,rgba(255,92,0,.22),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.32))!important}
      .ps-home-visual{position:absolute;z-index:0;right:clamp(32px,8vw,120px);top:50%;width:min(480px,42vw);transform:translateY(-50%);display:grid;gap:12px;opacity:.92;pointer-events:none}
      .ps-chords{display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px}.ps-chord{min-width:62px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.64);text-align:center;font-weight:900}.ps-chord.active{border-color:rgba(255,101,0,.56);background:rgba(255,101,0,.10);color:#ff9a5c}
      .ps-row{display:grid;grid-template-columns:82px 1fr 30px;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(12,12,12,.72);backdrop-filter:blur(9px);color:#fff;font-size:12px;font-weight:850}.ps-line{height:4px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.ps-line:after{content:"";display:block;height:100%;width:var(--level,72%);border-radius:inherit;background:#ff6500}.ps-mute{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:rgba(255,101,0,.13);color:#ff9c61;font-size:9px;font-weight:950}
      @media(max-width:760px){.feature-playsongs .routine-content{width:min(100%,420px)!important;margin-top:auto}.ps-home-visual{right:16px;left:16px;top:25%;width:auto;transform:none;gap:8px;opacity:.76}.ps-chords{justify-content:flex-start}.ps-chord{min-width:52px;padding:8px 9px;font-size:12px}.ps-row{grid-template-columns:68px 1fr 28px;padding:9px 10px;background:rgba(8,8,8,.62)}.feature-playsongs:before{background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.12) 48%,rgba(0,0,0,.94) 78%)!important}}
    `;
    document.head.appendChild(style);

    const hero=document.createElement("article");
    hero.className="routine-hero feature feature-playsongs";
    hero.innerHTML=`
      <div class="media" aria-hidden="true"></div>
      <div class="ps-home-visual" aria-hidden="true">
        <div class="ps-chords"><span class="ps-chord active">Am7</span><span class="ps-chord">D9</span><span class="ps-chord">Gmaj7</span></div>
        <div class="ps-row"><span>Drums</span><span class="ps-line" style="--level:86%"></span><span class="ps-mute">M</span></div>
        <div class="ps-row"><span>Bass</span><span class="ps-line" style="--level:72%"></span><span class="ps-mute">M</span></div>
        <div class="ps-row"><span>Guitars</span><span class="ps-line" style="--level:64%"></span><span class="ps-mute">M</span></div>
        <div class="ps-row"><span>Other</span><span class="ps-line" style="--level:92%"></span><span class="ps-mute">M</span></div>
      </div>
      <div class="routine-content"><h1>Play<strong>Songs</strong></h1><p class="feature-description">Separa batería, bajo y guitarras en Hi‑Fi, mutea tu instrumento y practica con la banda original.</p><div class="cta-row"><a class="practice-btn" href="play-songs.html?v=playsongs1">Abrir <span class="practice-arrow" aria-hidden="true">→</span></a></div></div><span class="scroll-cue" aria-hidden="true"></span>`;
    stack.appendChild(hero);

    const link=hero.querySelector("a[href]");
    link?.addEventListener("click",()=>{
      try{
        sessionStorage.setItem(RETURN_TARGET_KEY,"playsongs");
        sessionStorage.setItem(RETURN_SCROLL_KEY,String(window.scrollY||0));
      }catch(_){}
    },true);

    const io=new IntersectionObserver(entries=>{entries.forEach(entry=>hero.classList.toggle("in",entry.isIntersecting&&entry.intersectionRatio>.42));},{threshold:[0,.42,.65]});
    io.observe(hero);
  }

  mount();
})();