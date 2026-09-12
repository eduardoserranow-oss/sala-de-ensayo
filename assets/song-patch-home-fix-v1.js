(function(){
  "use strict";

  const STYLE_ID="songPatchHomeFixV1Style";

  function findSongPatch(){
    return document.querySelector('[data-home-module="studypaths"], .feature-studypaths, .study-paths-home-hero') ||
      [...document.querySelectorAll('.hero-stack .routine-hero')].find(hero=>{
        const title=(hero.querySelector('h1')?.textContent||'').trim().toLowerCase();
        const hrefs=[...hero.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'').join(' ');
        return title.includes('song patch') || hrefs.includes('study-projects.html');
      }) || null;
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      [data-home-module="studypaths"] .study-paths-home-kicker,
      .feature-studypaths .study-paths-home-kicker,
      .study-paths-home-hero .study-paths-home-kicker{
        display:none!important;
      }
      [data-home-module="studypaths"],
      .feature-studypaths,
      .study-paths-home-hero{
        background-image:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function apply(){
    installStyle();
    const hero=findSongPatch();
    if(!hero) return;

    hero.querySelector('.study-paths-home-kicker')?.remove();

    // Never override an image the user has chosen in the temporary artwork editor.
    if(hero.dataset.localArtwork === '1') return;

    const media=hero.querySelector(':scope > .media') || hero.querySelector('.media');
    if(!media) return;

    // Replace the old collage default with one continuous cinematic field.
    // The artwork editor can still replace this independently for Mobile/Desktop.
    media.style.setProperty('background-image',
      'radial-gradient(circle at 73% 30%,rgba(255,104,20,.28),transparent 24%), radial-gradient(circle at 29% 76%,rgba(121,55,25,.22),transparent 30%), linear-gradient(128deg,#17110e 0%,#090909 46%,#150a05 100%)',
      'important');
    media.style.setProperty('background-size','cover','important');
    media.style.setProperty('background-repeat','no-repeat','important');
    media.style.setProperty('background-position','center center','important');
    media.style.setProperty('background-color','#090909','important');
  }

  apply();
  requestAnimationFrame(apply);
  [120,360,760,1400,2200].forEach(ms=>setTimeout(apply,ms));
  addEventListener('resize',apply,{passive:true});

  const stack=document.querySelector('.hero-stack');
  if(stack){
    new MutationObserver(()=>requestAnimationFrame(apply)).observe(stack,{childList:true,subtree:true});
  }
})();
