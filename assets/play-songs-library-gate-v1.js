(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";
  const REFRESH_MS=3500;
  const STEM_KEYS=["drums","bass","guitars","other"];

  const songsEl=document.getElementById("songs");
  const library=document.getElementById("library");
  const player=document.getElementById("player");
  const backLibrary=document.getElementById("backLibrary");
  const statusText=document.getElementById("songStatusText");
  const chordLane=document.getElementById("chordLane");

  if(!songsEl||!library||!player)return;

  let refreshTimer=0;
  let refreshBusy=false;
  const verifiedReady=new Map();

  installPolishStyles();

  function installPolishStyles(){
    if(document.getElementById("playSongsGatePolishStyles"))return;
    const style=document.createElement("style");
    style.id="playSongsGatePolishStyles";
    style.textContent=`
      :root{--sidebar:198px !important;--track-h:84px !important}
      .stem-control{padding-left:13px !important;padding-right:13px !important}
      .stem-name{font-size:12px !important}
      .stem-actions{gap:6px !important}
      .stem-actions button{width:34px !important;height:30px !important;font-size:10px !important}
      .stem-slider{height:32px !important;margin-top:8px !important}
      .song-card.is-loading{opacity:.64}
      .song-card.is-loading .song-art{filter:saturate(.65)}
      .song-card:disabled{pointer-events:none}
      @media(max-width:700px){:root{--sidebar:182px !important;--track-h:82px !important}}
      @media(max-width:420px){:root{--sidebar:174px !important;--track-h:80px !important}.stem-actions button{width:31px !important}}
    `;
    document.head.appendChild(style);
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }

  function cloudAccountId(session){return String(session?.cloudAccountId||"").trim();}

  async function callApi(action,payload){
    const session=getSession();
    if(!cloudAccountId(session)||!session?.cloudToken)throw new Error("unauthorized");
    const response=await fetch(FUNCTION_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":API_KEY},
      body:JSON.stringify({action,accountId:cloudAccountId(session),token:session.cloudToken,...(payload||{})})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||`${action}_failed`);
    return data;
  }

  async function listSongs(){
    const data=await callApi("list");
    return Array.isArray(data.songs)?data.songs:[];
  }

  async function verifySongReady(song){
    if(!song?.id||song.status!=="ready")return false;
    if(verifiedReady.get(song.id)===true)return true;
    try{
      const detail=await callApi("detail",{songId:song.id});
      const complete=STEM_KEYS.every(key=>Boolean(detail?.stems?.[key]?.url));
      if(complete)verifiedReady.set(song.id,true);
      return complete;
    }catch(error){
      console.warn("Play Songs readiness verification failed",error);
      return false;
    }
  }

  function makeSpinner(){
    const spinner=document.createElement("span");
    spinner.className="song-spinner";
    spinner.setAttribute("aria-label","Cargando");
    return spinner;
  }

  function setCardState(card,song,complete){
    if(!card||!song)return;
    const failed=song.status==="failed";
    const ready=song.status==="ready"&&complete;
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

  async function applyLibraryState(songs){
    const cards=[...songsEl.querySelectorAll(".song-card")];
    await Promise.all(cards.map(async(card,index)=>{
      const song=songs[index];
      if(!song)return;
      const complete=await verifySongReady(song);
      setCardState(card,song,complete);
    }));
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
      await applyLibraryState(songs);
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

  function guardIncompletePlayer(){
    if(!player.classList.contains("is-open"))return;
    const label=String(statusText?.textContent||"").trim().toLowerCase();
    if(label&&label!=="ready")backLibrary?.click();
  }

  function polishChordStatus(){
    if(!player.classList.contains("is-open")||!chordLane)return;
    const empty=chordLane.querySelector(".chord-empty");
    if(!empty)return;
    const label=String(statusText?.textContent||"").trim().toLowerCase();
    if(label==="ready")empty.textContent="Chord analysis unavailable";
    else empty.textContent="Analyzing chords…";
  }

  // Incomplete songs never enter the arrangement view. Capture-phase blocking
  // runs before the original song-card handler, including immediately after a render.
  document.addEventListener("click",event=>{
    const card=event.target.closest?.(".song-card");
    if(!card)return;
    if(card.dataset.playSongsReady==="true")return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  },true);

  // The core uploader historically opened a queued song right after upload.
  // Mutation observers run before paint, so return it to My Songs without flashing
  // an incomplete arrangement view to the user.
  const playerGuard=new MutationObserver(()=>{
    guardIncompletePlayer();
    polishChordStatus();
  });
  playerGuard.observe(player,{attributes:true,subtree:true,childList:true,characterData:true});

  // Whenever the core renderer rebuilds My Songs, immediately turn every
  // non-ready row into the disabled loading state and keep checking in the background.
  const libraryObserver=new MutationObserver(()=>scheduleRefresh(30));
  libraryObserver.observe(songsEl,{childList:true,subtree:true});

  document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleRefresh(40);});

  scheduleRefresh(40);
})();
