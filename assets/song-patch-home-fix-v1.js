(function(){
  "use strict";

  const STYLE_ID="songPatchHomeCleanupV2";

  function findSongPatch(){
    return document.querySelector(
      '.hero-stack [data-home-module="studypaths"],'+
      '.hero-stack .feature-studypaths,'+
      '.hero-stack .study-paths-home-hero'
    ) || [...document.querySelectorAll('.hero-stack .routine-hero')].find(hero=>{
      const title=(hero.querySelector('h1')?.textContent||'').trim().toLowerCase();
      const hrefs=[...hero.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'').join(' ');
      return title.includes('song patch') || hrefs.includes('study-projects.html');
    }) || null;
  }

  function installStyle(){
    let style=document.getElementById(STYLE_ID);
    if(style) return;
    document.getElementById('songPatchHomeFixV1Style')?.remove();
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Song Patch has one artwork layer only: the shared direct .media layer. */
      .hero-stack [data-home-module="studypaths"],
      .hero-stack .feature-studypaths,
      .hero-stack .study-paths-home-hero{
        background:none!important;
        background-image:none!important;
        background-color:#050505!important;
      }

      /* Remove all legacy Song Patch labels/decorations that visually split the artwork. */
      .hero-stack [data-home-module="studypaths"] .study-paths-kicker,
      .hero-stack .feature-studypaths .study-paths-kicker,
      .hero-stack .study-paths-home-hero .study-paths-kicker{
        display:none!important;
      }

      .hero-stack [data-home-module="studypaths"]::before,
      .hero-stack .feature-studypaths::before,
      .hero-stack .study-paths-home-hero::before{
        content:none!important;
        display:none!important;
        background:none!important;
        border:0!important;
      }

      .hero-stack [data-home-module="studypaths"] .routine-content::before,
      .hero-stack .feature-studypaths .routine-content::before,
      .hero-stack .study-paths-home-hero .routine-content::before{
        content:none!important;
        display:none!important;
        background:none!important;
        border:0!important;
      }

      /* Keep one smooth full-height readability veil; no hard divider or second image. */
      .hero-stack [data-home-module="studypaths"]::after,
      .hero-stack .feature-studypaths::after,
      .hero-stack .study-paths-home-hero::after{
        content:""!important;
        display:block!important;
        position:absolute!important;
        inset:0!important;
        background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.16) 42%,rgba(0,0,0,.46) 100%)!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function apply(){
    installStyle();
    const hero=findSongPatch();
    if(!hero) return false;

    hero.classList.add('feature','feature-studypaths','home-standard-module');
    hero.dataset.homeModule='studypaths';
    hero.querySelectorAll('.study-paths-kicker').forEach(node=>node.remove());

    // The hero itself must never paint a second image behind the editor/parallax .media layer.
    hero.style.removeProperty('--image');
    hero.style.removeProperty('--pos');
    hero.style.removeProperty('--mpos');
    hero.style.setProperty('background','none','important');
    hero.style.setProperty('background-image','none','important');
    hero.style.setProperty('background-color','#050505','important');

    // Do not modify .media.backgroundImage here. That is owned by the Home artwork editor
    // (separate Mobile/Desktop images) and the shared Home parallax system.
    return true;
  }

  const run=()=>apply();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();

  requestAnimationFrame(run);
  [40,120,260,520,900,1500,2400].forEach(ms=>setTimeout(run,ms));
  addEventListener('resize',run,{passive:true});

  function observe(){
    const stack=document.querySelector('.hero-stack');
    if(!stack) return;
    const observer=new MutationObserver(()=>requestAnimationFrame(run));
    observer.observe(stack,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','data-home-module']});
    setTimeout(()=>observer.disconnect(),6000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observe,{once:true});
  else observe();
})();
