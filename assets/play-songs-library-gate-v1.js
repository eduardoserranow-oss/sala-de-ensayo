(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";
  const REFRESH_MS=4000;

  const songsEl=document.getElementById("songs");
  const library=document.getElementById("library");
  const player=document.getElementById("player");
  const backLibrary=document.getElementById("backLibrary");
  const statusText=document.getElementById("songStatusText");

  if(!songsEl||!library||!player)return;

  let refreshTimer=0;
  let refreshBusy=false;

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }

  function cloudAccountId(session){return String(session?.cloudAccountId||"").trim();}

  async function listSongs(){
    const session=getSession();
    if(!cloudAccountId(session)||!session?.cloudToken)return [];
    const response=await fetch(FUNCTION_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":API_KEY},
      body:JSON.stringify({action:"list",accountId:cloudAccountId(session),token:session.cloudToken})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||"list_failed");
    return Array.isArray(data.songs)?data.songs:[];
  }

  function makeSpinner(){
    const spinner=document.createElement("span");
    spinner.className="song-spinner";
    spinner.setAttribute("aria-label","Loading");
    return spinner;
  }

  function setCardState(card,song){
    if(!card||!song)return;
    const ready=song.status==="ready";
    const failed=song.status==="failed";
    card.dataset.playSongsReady=ready?"true":"false";
    card.disabled=!ready;
    card.setAttribute("aria-disabled",ready?"false":"true");
    card.classList.toggle("is-loading",!ready&&!failed);
    card.classList.toggle("is-failed",failed);

    const meta=card.querySelector(".song-meta");
    if(meta){
      const artist=String(song.artist||"").trim();
      const state=ready?"Ready":failed?"Processing failed":"Cargando…";
      meta.textContent=[artist,state].filter(Boolean).join(" · ");
    }

    const chev=card.querySelector(".chev");
    if(chev){
      chev.replaceChildren();
      if(ready)chev.textContent="›";
      else if(failed)chev.textContent="!";
      else chev.appendChild(makeSpinner());
    }
  }

  function applyLibraryState(songs){
    const cards=[...songsEl.querySelectorAll(".song-card")];
    cards.forEach((card,index)=>setCardState(card,songs[index]));
  }

  async function refreshLibraryState(){
    clearTimeout(refreshTimer);
    if(refreshBusy||document.hidden||library.classList.contains("is-hidden")){
      scheduleRefresh();
      return;
    }
    refreshBusy=true;
    try{
      const songs=await listSongs();
      applyLibraryState(songs);
    }catch(error){
      console.warn("Play Songs readiness refresh failed",error);
    }finally{
      refreshBusy=false;
      scheduleRefresh();
    }
  }

  function scheduleRefresh(delay=REFRESH_MS){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshLibraryState,delay);
  }

  // Block the original song click handler before it fires unless the backend
  // has marked the entire processing job ready (4 stems + analysis complete).
  document.addEventListener("click",event=>{
    const card=event.target.closest?.(".song-card");
    if(!card)return;
    const meta=String(card.querySelector(".song-meta")?.textContent||"");
    const ready=card.dataset.playSongsReady==="true"||/\bReady\b/i.test(meta);
    if(ready)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  },true);

  // The existing uploader used to open a queued song immediately after upload.
  // If that happens, return to My Songs before the incomplete arrangement is shown.
  const playerGuard=new MutationObserver(()=>{
    if(!player.classList.contains("is-open"))return;
    const label=String(statusText?.textContent||"").trim().toLowerCase();
    if(label&&label!=="ready")backLibrary?.click();
  });
  playerGuard.observe(player,{attributes:true,subtree:true,childList:true,characterData:true});

  // The core renderer owns the DOM. Whenever it rebuilds the library, re-apply
  // the readiness gate and then continue polling until processing finishes.
  const libraryObserver=new MutationObserver(()=>scheduleRefresh(60));
  libraryObserver.observe(songsEl,{childList:true,subtree:true});

  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)scheduleRefresh(50);
  });

  scheduleRefresh(100);
})();
