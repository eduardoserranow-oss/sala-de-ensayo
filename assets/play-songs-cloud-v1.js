(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";
  const STEM_KEYS=["drums","bass","guitars","other"];
  const LIBRARY_REFRESH_MS=3500;
  const PX_PER_SECOND=7.5;

  const songsEl=document.getElementById("songs");
  const library=document.getElementById("library");
  const player=document.getElementById("player");
  const modal=document.getElementById("addModal");
  const fileInput=document.getElementById("audioFile");
  const message=document.getElementById("modalMessage");
  const progress=document.getElementById("progress");
  const playPause=document.getElementById("playPause");
  const statusText=document.getElementById("songStatusText");
  const originalNote=document.getElementById("originalNote");
  const chordLane=document.getElementById("chordLane");
  const timelineViewport=document.getElementById("timelineViewport");
  const timelineContent=document.getElementById("timelineContent");
  const timeRuler=document.getElementById("timeRuler");
  const playhead=document.getElementById("playhead");
  const songOptions=document.getElementById("songOptions");

  let currentSong=null;
  let currentDetail=null;
  let storageClient=null;
  let stemTransport=null;
  let openRequestId=0;
  let arrangementWidth=0;
  let lastManualScrollAt=0;
  let timelinePointerStart=null;
  let resizeTimer=0;
  let libraryRefreshTimer=0;
  let libraryRefreshBusy=false;

  init();

  class StemTransport{
    constructor(stems,onTick,onEnded){
      this.onTick=onTick;
      this.onEnded=onEnded;
      this.tracks=new Map();
      this.states=new Map();
      this.raf=0;
      this.destroyed=false;
      this.playing=false;
      this.ready=false;
      this.masterKey="drums";
      this.handleMasterEnded=()=>{
        if(this.destroyed)return;
        this.pause();
        this.seek(0);
        this.onTick?.(0,this.duration());
        this.onEnded?.();
      };
      STEM_KEYS.forEach(key=>{
        const track=new Audio();
        track.preload="auto";
        track.playsInline=true;
        track.src=String(stems?.[key]?.url||"");
        this.tracks.set(key,track);
        this.states.set(key,{volume:1,muted:false,solo:false});
      });
      this.master()?.addEventListener("ended",this.handleMasterEnded);
    }

    master(){return this.tracks.get(this.masterKey)||this.tracks.values().next().value||null;}

    async load(){
      await Promise.all([...this.tracks.values()].map(waitForMetadata));
      if(this.destroyed)throw new Error("transport_destroyed");
      this.ready=true;
      this.applyMix();
      return this;
    }

    currentTime(){
      const value=Number(this.master()?.currentTime||0);
      return Number.isFinite(value)&&value>=0?value:0;
    }

    duration(){
      const values=[...this.tracks.values()].map(track=>Number(track.duration)).filter(value=>Number.isFinite(value)&&value>0);
      return values.length?Math.min(...values):0;
    }

    isPaused(){return !this.playing;}

    async play(){
      if(this.destroyed||!this.ready)return;
      const at=this.currentTime();
      this.align(at,true);
      try{
        await Promise.all([...this.tracks.values()].map(track=>track.play()));
        this.playing=true;
        this.startClock();
      }catch(error){
        this.pause();
        throw error;
      }
    }

    pause(){
      this.playing=false;
      if(this.raf){cancelAnimationFrame(this.raf);this.raf=0;}
      this.tracks.forEach(track=>track.pause());
    }

    seek(seconds){
      const duration=this.duration();
      const next=Math.max(0,Math.min(Number(seconds)||0,duration||Infinity));
      this.align(next,true);
      this.onTick?.(next,duration);
    }

    align(time,force){
      this.tracks.forEach(track=>{
        if(!Number.isFinite(track.duration))return;
        const target=Math.max(0,Math.min(time,Math.max(0,track.duration-.005)));
        if(force||Math.abs(track.currentTime-target)>.035){
          try{track.currentTime=target;}catch(_){}
        }
      });
    }

    setVolume(key,value){
      const state=this.states.get(key);if(!state)return;
      state.volume=Math.max(0,Math.min(1,Number(value)||0));
      this.applyMix();
    }

    toggleMute(key){
      const state=this.states.get(key);if(!state)return false;
      state.muted=!state.muted;
      this.applyMix();
      return state.muted;
    }

    toggleSolo(key){
      const state=this.states.get(key);if(!state)return false;
      state.solo=!state.solo;
      this.applyMix();
      return state.solo;
    }

    state(key){return this.states.get(key)||null;}

    applyMix(){
      const anySolo=[...this.states.values()].some(state=>state.solo);
      this.tracks.forEach((track,key)=>{
        const state=this.states.get(key);
        const audible=!state.muted&&(!anySolo||state.solo);
        track.volume=state.volume;
        track.muted=!audible;
      });
    }

    startClock(){
      if(this.raf)cancelAnimationFrame(this.raf);
      const tick=()=>{
        if(this.destroyed||!this.playing){this.raf=0;return;}
        const time=this.currentTime(),duration=this.duration();
        this.tracks.forEach((track,key)=>{
          if(key===this.masterKey||track.paused)return;
          if(Math.abs(track.currentTime-time)>.045){
            try{track.currentTime=time;}catch(_){}
          }
        });
        this.onTick?.(time,duration);
        this.raf=requestAnimationFrame(tick);
      };
      this.raf=requestAnimationFrame(tick);
    }

    destroy(){
      if(this.destroyed)return;
      this.destroyed=true;
      this.pause();
      this.master()?.removeEventListener("ended",this.handleMasterEnded);
      this.tracks.forEach(track=>{track.removeAttribute("src");track.load();});
      this.tracks.clear();
      this.states.clear();
    }
  }

  async function init(){
    const session=getSession();
    if(!validSession(session)){
      const u=new URL("login.html",location.href);
      u.searchParams.set("returnTo","play-songs.html");
      location.replace(u.href);
      return;
    }
    bindEvents();
    storageClient=makeStorageClient();
    resetArrangement();
    await renderLibrary();
    scheduleLibraryRefresh();
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }

  function cloudAccountId(session){return String(session?.cloudAccountId||"").trim();}
  function validSession(session){return Boolean(cloudAccountId(session)&&session?.cloudToken);}

  function makeStorageClient(){
    if(!window.supabase?.createClient)return null;
    return window.supabase.createClient(API_URL,API_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }

  async function callApi(action,payload){
    const session=getSession();
    if(!validSession(session))throw new Error("unauthorized");
    const response=await fetch(FUNCTION_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":API_KEY},
      body:JSON.stringify({action,accountId:cloudAccountId(session),token:session.cloudToken,...(payload||{})})
    });
    const data=await response.json().catch(()=>({ok:false,error:"invalid_response"}));
    if(!response.ok||!data?.ok){
      const error=new Error(data?.error||`request_${response.status}`);
      error.code=data?.error||"request_failed";
      throw error;
    }
    return data;
  }

  function bindEvents(){
    document.getElementById("addSong")?.addEventListener("click",openModal);
    document.getElementById("addTop")?.addEventListener("click",openModal);
    document.getElementById("closeModal")?.addEventListener("click",closeModal);
    modal?.addEventListener("click",event=>{if(event.target===modal)closeModal();});
    fileInput?.addEventListener("change",async()=>{
      const file=fileInput.files?.[0];
      fileInput.value="";
      if(file)await importFile(file);
    });

    document.getElementById("backLibrary")?.addEventListener("click",closeSong);
    document.getElementById("moreSong")?.addEventListener("click",event=>{
      event.stopPropagation();
      if(songOptions)songOptions.hidden=!songOptions.hidden;
    });
    document.getElementById("deleteSong")?.addEventListener("click",deleteCurrentSong);
    document.addEventListener("click",()=>{if(songOptions)songOptions.hidden=true;});
    playPause?.addEventListener("click",togglePlay);
    document.getElementById("back10")?.addEventListener("click",()=>seekBy(-10));
    document.getElementById("forward10")?.addEventListener("click",()=>seekBy(10));
    progress?.addEventListener("input",()=>{
      const duration=activeDuration();
      if(duration>0)seekActive((Number(progress.value)/1000)*duration);
    });

    timelineViewport?.addEventListener("scroll",()=>{lastManualScrollAt=Date.now();},{passive:true});
    timelineViewport?.addEventListener("pointerdown",event=>{
      timelinePointerStart={x:event.clientX,y:event.clientY};
    });
    timelineViewport?.addEventListener("pointerup",event=>{
      if(!timelinePointerStart)return;
      const moved=Math.hypot(event.clientX-timelinePointerStart.x,event.clientY-timelinePointerStart.y);
      if(moved<9)seekFromTimelineEvent(event);
      timelinePointerStart=null;
    });
    timelineViewport?.addEventListener("pointercancel",()=>{timelinePointerStart=null;});

    window.addEventListener("resize",()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>renderArrangement(currentDetail),120);
    });
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden)scheduleLibraryRefresh(80);
    });
  }

  function openModal(){modal.hidden=false;setMessage("");}
  function closeModal(){modal.hidden=true;setMessage("");}
  function setMessage(text){if(message)message.textContent=text||"";}

  function hasAllStems(detail){
    return STEM_KEYS.every(key=>Boolean(detail?.stems?.[key]?.url));
  }

  async function verifySongReady(song){
    if(!song?.id||song.status!=="ready")return {ready:false,detail:null};
    try{
      const detail=await callApi("detail",{songId:song.id});
      return {ready:hasAllStems(detail),detail};
    }catch(error){
      console.warn("Play Songs readiness check failed",error);
      return {ready:false,detail:null};
    }
  }

  function loadingIcon(){
    return '<span class="song-spinner" aria-hidden="true"></span>';
  }

  function setSongCardState(button,song,ready){
    const failed=song.status==="failed";
    button.disabled=!ready;
    button.dataset.playSongsReady=ready?"true":"false";
    button.classList.toggle("is-loading",!ready&&!failed);
    button.classList.toggle("is-failed",failed);
    const meta=button.querySelector(".song-meta");
    if(meta){
      const state=ready?"Ready":failed?"Processing failed":"Cargando…";
      meta.textContent=[song.artist,state].filter(Boolean).join(" · ");
    }
    const chev=button.querySelector(".chev");
    if(chev){
      if(ready)chev.textContent="›";
      else if(failed)chev.textContent="!";
      else chev.innerHTML=loadingIcon();
    }
  }

  async function renderLibrary(){
    songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>Loading…</h2></div>';
    try{
      const data=await callApi("list");
      const songs=Array.isArray(data.songs)?data.songs:[];
      songsEl.replaceChildren();
      if(!songs.length){
        songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>No songs yet</h2><p>Add a song to start practicing.</p><button class="primary" type="button" data-empty-add>+ Add Song</button></div>';
        songsEl.querySelector("[data-empty-add]")?.addEventListener("click",openModal);
        return;
      }

      for(const song of songs){
        const button=document.createElement("button");
        button.className="song-card";
        button.type="button";
        button.dataset.songId=String(song.id||"");
        button.innerHTML=`<span class="song-art">${escapeHtml(String(song.title||"S").slice(0,1).toUpperCase())}</span><span class="song-info"><span class="song-title">${escapeHtml(song.title||"Untitled")}</span><span class="song-meta"></span></span><span class="chev"></span>`;
        setSongCardState(button,song,false);
        button.addEventListener("click",()=>{
          if(button.dataset.playSongsReady!=="true")return;
          openSong(song,button);
        });
        songsEl.appendChild(button);

        if(song.status==="ready"){
          verifySongReady(song).then(result=>{
            if(!button.isConnected)return;
            setSongCardState(button,song,result.ready);
          });
        }
      }
    }catch(error){
      songsEl.innerHTML='<div class="empty"><div class="empty-mark">!</div><h2>Could not load songs</h2><p>Try again without leaving this screen.</p><button class="primary" type="button" data-retry>Retry</button></div>';
      songsEl.querySelector("[data-retry]")?.addEventListener("click",renderLibrary);
      console.warn("Play Songs list failed",error);
    }
  }

  function scheduleLibraryRefresh(delay=LIBRARY_REFRESH_MS){
    clearTimeout(libraryRefreshTimer);
    libraryRefreshTimer=setTimeout(refreshLibraryState,delay);
  }

  async function refreshLibraryState(){
    clearTimeout(libraryRefreshTimer);
    if(libraryRefreshBusy||document.hidden||library.classList.contains("is-hidden")){
      scheduleLibraryRefresh();
      return;
    }
    libraryRefreshBusy=true;
    try{
      const data=await callApi("list");
      const songs=Array.isArray(data.songs)?data.songs:[];
      const cards=[...songsEl.querySelectorAll(".song-card")];
      if(cards.length!==songs.length){
        await renderLibrary();
      }else{
        await Promise.all(songs.map(async(song,index)=>{
          const card=cards[index];
          if(!card||card.dataset.songId!==String(song.id||""))return;
          if(song.status!=="ready"){
            setSongCardState(card,song,false);
            return;
          }
          const result=await verifySongReady(song);
          setSongCardState(card,song,result.ready);
        }));
      }
    }catch(error){
      console.warn("Play Songs library refresh failed",error);
    }finally{
      libraryRefreshBusy=false;
      scheduleLibraryRefresh();
    }
  }

  async function importFile(file){
    const looksAudio=String(file.type||"").startsWith("audio/")||/\.(mp3|wav|m4a|flac)$/i.test(file.name||"");
    if(!looksAudio){setMessage("Choose an audio file: MP3, WAV, M4A or FLAC.");return;}
    if(file.size>262144000){setMessage("This build accepts songs up to 250 MB.");return;}
    if(!storageClient){setMessage("The upload engine could not start. Reload Play Songs and try again.");return;}

    const title=String(file.name||"Song").replace(/\.[^.]+$/,"")||"Song";
    setMessage("Preparing upload…");
    try{
      const durationSeconds=await probeDuration(file).catch(()=>null);
      const created=await callApi("create-upload",{
        title,
        artist:null,
        fileName:file.name,
        mimeType:file.type||"application/octet-stream",
        fileSizeBytes:file.size,
        sourceReference:null
      });
      setMessage("Uploading…");
      const upload=created.upload;
      const {error:uploadError}=await storageClient.storage.from(upload.bucket).uploadToSignedUrl(
        upload.path,
        upload.token,
        file,
        {contentType:file.type||"application/octet-stream",cacheControl:"3600"}
      );
      if(uploadError)throw uploadError;

      setMessage("Preparing stems…");
      await callApi("mark-uploaded",{songId:created.song.id,originalPath:upload.path,durationSeconds});
      closeModal();
      await renderLibrary();
      scheduleLibraryRefresh(500);
    }catch(error){
      console.warn("Play Songs upload failed",error);
      if(error?.code==="file_too_large")setMessage("This file is too large.");
      else if(error?.code==="unauthorized")setMessage("Your session expired. Sign in again.");
      else setMessage("The upload could not finish. Your existing songs were not affected.");
    }
  }

  function probeDuration(file){
    return new Promise((resolve,reject)=>{
      const probe=document.createElement("audio");
      const url=URL.createObjectURL(file);
      const cleanup=()=>{URL.revokeObjectURL(url);probe.removeAttribute("src");};
      const timer=setTimeout(()=>{cleanup();reject(new Error("metadata_timeout"));},8000);
      probe.preload="metadata";
      probe.onloadedmetadata=()=>{
        clearTimeout(timer);
        const value=Number.isFinite(probe.duration)?probe.duration:null;
        cleanup();
        resolve(value);
      };
      probe.onerror=()=>{clearTimeout(timer);cleanup();reject(new Error("metadata_failed"));};
      probe.src=url;
    });
  }

  async function openSong(song,card){
    if(!song?.id||song.status!=="ready")return;
    const requestId=++openRequestId;
    if(card){
      card.disabled=true;
      card.classList.add("is-loading");
      const chev=card.querySelector(".chev");
      if(chev)chev.innerHTML=loadingIcon();
    }

    try{
      const detail=await callApi("detail",{songId:song.id});
      if(requestId!==openRequestId)return;
      if(!hasAllStems(detail)){
        if(card)setSongCardState(card,song,false);
        scheduleLibraryRefresh(300);
        return;
      }

      const transport=new StemTransport(detail.stems,updatePlaybackUI,()=>{playPause.textContent="▶";});
      await transport.load();
      if(requestId!==openRequestId){transport.destroy();return;}

      destroyTransports();
      stemTransport=transport;
      currentSong={...song,...detail.song,status:"ready"};
      currentDetail=detail;

      document.getElementById("playerSongTitle").textContent=currentSong.title||"Song";
      document.getElementById("playerSongMeta").textContent=currentSong.artist||"";
      setSongStatus("ready");
      stemTransport.seek(0);
      progress.value=0;
      playPause.textContent="▶";

      // Only reveal the player after the four remote stems are loaded.
      // Rendering happens in the same task, so the user never sees a half-ready arrangement.
      library.classList.add("is-hidden");
      player.classList.add("is-open");
      renderArrangement(detail);
      resetStemControls();
      setMixerReadyUI(stemTransport);
      scrollTo({top:0,behavior:"auto"});
      updatePlaybackUI(0,stemTransport.duration());
    }catch(error){
      if(requestId!==openRequestId)return;
      console.warn("Play Songs open failed",error);
      if(card)setSongCardState(card,song,false);
      scheduleLibraryRefresh(300);
    }
  }

  function closeSong(){
    ++openRequestId;
    stemTransport?.pause();
    playPause.textContent="▶";
    player.classList.remove("is-open");
    library.classList.remove("is-hidden");
    currentSong=null;
    currentDetail=null;
    destroyTransports();
    resetStemControls();
    resetArrangement();
    scrollTo({top:0,behavior:"auto"});
    scheduleLibraryRefresh(80);
  }

  function destroyTransports(){
    stemTransport?.destroy();
    stemTransport=null;
  }

  async function deleteCurrentSong(){
    if(!currentSong)return;
    if(songOptions)songOptions.hidden=true;
    if(!confirm(`Delete “${currentSong.title}” from Play Songs?`))return;
    try{
      await callApi("delete",{songId:currentSong.id});
      closeSong();
      await renderLibrary();
    }catch(error){
      console.warn("Play Songs delete failed",error);
      alert("The song could not be deleted right now.");
    }
  }

  async function togglePlay(){
    if(!stemTransport)return;
    if(stemTransport.isPaused()){
      try{
        await stemTransport.play();
        playPause.textContent="❚❚";
      }catch(error){
        console.warn("Stem playback could not start",error);
        playPause.textContent="▶";
      }
    }else{
      stemTransport.pause();
      playPause.textContent="▶";
    }
  }

  function activeTime(){return stemTransport?stemTransport.currentTime():0;}
  function activeDuration(){return stemTransport?stemTransport.duration():Number(currentSong?.durationSeconds||0);}
  function isPlaying(){return Boolean(stemTransport&&!stemTransport.isPaused());}
  function seekBy(delta){seekActive(activeTime()+Number(delta||0));}

  function seekActive(seconds){
    const duration=activeDuration();
    const next=Math.max(0,Math.min(Number(seconds)||0,duration||Infinity));
    if(stemTransport)stemTransport.seek(next);
    else updatePlaybackUI(next,duration);
  }

  function seekFromTimelineEvent(event){
    const duration=activeDuration();
    if(!duration||!timelineViewport||!timelineContent)return;
    const rect=timelineViewport.getBoundingClientRect();
    const x=event.clientX-rect.left+timelineViewport.scrollLeft;
    seekActive(Math.max(0,Math.min(duration,(x/Math.max(1,arrangementWidth))*duration)));
  }

  function updatePlaybackUI(time,duration){
    const safeTime=Number.isFinite(time)&&time>=0?time:0;
    const safeDuration=Number.isFinite(duration)&&duration>0?duration:Number(currentSong?.durationSeconds||0);
    document.getElementById("currentTime").textContent=formatTime(safeTime);
    document.getElementById("duration").textContent=formatTime(safeDuration);
    if(safeDuration>0){
      progress.value=Math.max(0,Math.min(1000,Math.round(safeTime/safeDuration*1000)));
      if(arrangementWidth>0&&playhead){
        const x=(safeTime/safeDuration)*arrangementWidth;
        playhead.style.left=`${x}px`;
        updateActiveChord(safeTime);
        if(isPlaying()&&Date.now()-lastManualScrollAt>1400)followPlayhead(x);
      }
    }
  }

  function followPlayhead(x){
    if(!timelineViewport)return;
    const left=timelineViewport.scrollLeft;
    const right=left+timelineViewport.clientWidth;
    if(x>right-timelineViewport.clientWidth*.12||x<left+timelineViewport.clientWidth*.12){
      timelineViewport.scrollLeft=Math.max(0,x-timelineViewport.clientWidth*.42);
    }
  }

  function setSongStatus(status){
    if(statusText){
      statusText.textContent=status==="ready"?"":"Cargando…";
      statusText.hidden=status==="ready";
    }
    if(originalNote){
      originalNote.textContent=status==="ready"?"":"Preparing song…";
      originalNote.hidden=status==="ready";
    }
  }

  function renderArrangement(detail){
    if(!detail&&!currentSong){resetArrangement();return;}
    const duration=Number(detail?.song?.durationSeconds||currentSong?.durationSeconds||activeDuration()||0);
    setArrangementWidth(duration);
    renderTimeRuler(duration);
    renderChordTimeline(Array.isArray(detail?.chords)?detail.chords:[],duration);
    renderWaveforms(detail?.stems||{});
    updatePlaybackUI(activeTime(),duration);
  }

  function resetArrangement(duration=0){
    setArrangementWidth(duration);
    renderTimeRuler(duration);
    renderChordTimeline([],duration);
    renderWaveforms({});
    if(timelineViewport)timelineViewport.scrollLeft=0;
    if(playhead)playhead.style.left="0px";
  }

  function setArrangementWidth(duration){
    if(!timelineViewport||!timelineContent)return;
    const viewportWidth=Math.max(220,timelineViewport.clientWidth||220);
    const raw=duration>0?duration*PX_PER_SECOND:viewportWidth;
    arrangementWidth=Math.max(viewportWidth,Math.min(9000,Math.round(raw)));
    timelineContent.style.width=`${arrangementWidth}px`;
  }

  function renderTimeRuler(duration){
    if(!timeRuler)return;
    timeRuler.replaceChildren();
    if(!(duration>0))return;
    const step=duration>600?60:duration>300?30:15;
    for(let time=0;time<=duration;time+=step){
      const mark=document.createElement("span");
      mark.className="time-mark";
      mark.style.left=`${(time/duration)*arrangementWidth}px`;
      mark.textContent=formatTime(time);
      timeRuler.appendChild(mark);
    }
  }

  function renderChordTimeline(chords,duration){
    if(!chordLane)return;
    chordLane.replaceChildren();
    if(!Array.isArray(chords)||!chords.length||!(duration>0)){
      const empty=document.createElement("span");
      empty.className="chord-empty";
      empty.textContent=currentSong?"Chord analysis unavailable":"";
      chordLane.appendChild(empty);
      return;
    }
    chords.forEach((entry,index)=>{
      const start=Math.max(0,Number(entry.start||0));
      const next=Number(entry.end??chords[index+1]?.start??duration);
      const end=Math.max(start,Math.min(duration,Number.isFinite(next)?next:duration));
      const block=document.createElement("div");
      block.className="chord-block";
      block.dataset.chordIndex=String(index);
      block.dataset.start=String(start);
      block.dataset.end=String(end);
      block.style.left=`${(start/duration)*arrangementWidth}px`;
      block.style.width=`${Math.max(34,((end-start)/duration)*arrangementWidth)}px`;
      block.textContent=entry.chord||"—";
      chordLane.appendChild(block);
    });
  }

  function updateActiveChord(time){
    if(!chordLane)return;
    chordLane.querySelectorAll(".chord-block").forEach(block=>{
      const start=Number(block.dataset.start||0);
      const end=Number(block.dataset.end||Infinity);
      block.classList.toggle("active",time>=start&&time<end);
    });
  }

  function renderWaveforms(stems){
    STEM_KEYS.forEach(key=>{
      const canvas=document.getElementById(`wave-${key}`);
      const label=document.getElementById(`wave-status-${key}`);
      const peaks=stems?.[key]?.waveformPeaks;
      clearCanvas(canvas);
      if(Array.isArray(peaks)&&peaks.length){
        drawWaveform(canvas,peaks);
        if(label)label.hidden=true;
      }else if(label){
        label.hidden=false;
        label.textContent=currentSong?"Waveform unavailable":"";
      }
    });
  }

  function clearCanvas(canvas){
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function drawWaveform(canvas,peaks){
    if(!canvas||!peaks?.length)return;
    const track=canvas.parentElement;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const cssWidth=Math.max(1,arrangementWidth);
    const cssHeight=Math.max(40,track?.clientHeight||70);
    canvas.width=Math.min(9000,Math.round(cssWidth*dpr));
    canvas.height=Math.round(cssHeight*dpr);
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssWidth,cssHeight);
    ctx.strokeStyle="rgba(255,255,255,.68)";
    ctx.lineWidth=1;
    ctx.beginPath();
    const mid=cssHeight/2,scale=cssHeight*.43;
    for(let x=0;x<cssWidth;x++){
      const index=Math.min(peaks.length-1,Math.floor((x/cssWidth)*peaks.length));
      const amp=Math.max(0,Math.min(1,Number(peaks[index])||0))*scale;
      ctx.moveTo(x+.5,mid-amp);
      ctx.lineTo(x+.5,mid+amp);
    }
    ctx.stroke();
  }

  function setMixerReadyUI(transport){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;
      const [muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      const slider=row.querySelector('input[type="range"]');
      if(muteButton){
        muteButton.disabled=false;
        muteButton.onclick=()=>{transport.toggleMute(key);refreshMixerButtons(transport);};
      }
      if(soloButton){
        soloButton.disabled=false;
        soloButton.onclick=()=>{transport.toggleSolo(key);refreshMixerButtons(transport);};
      }
      if(slider){
        slider.disabled=false;
        slider.value=String(Math.round((transport.state(key)?.volume??1)*100));
        slider.oninput=()=>transport.setVolume(key,Number(slider.value)/100);
      }
    });
    refreshMixerButtons(transport);
  }

  function refreshMixerButtons(transport){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;
      const state=transport.state(key);
      const [muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      muteButton?.classList.toggle("is-active",Boolean(state?.muted));
      soloButton?.classList.toggle("is-active",Boolean(state?.solo));
      row.classList.toggle("is-muted",Boolean(state?.muted));
    });
  }

  function resetStemControls(){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      row.classList.remove("has-stem","is-muted");
      const [muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      [muteButton,soloButton].forEach(button=>{
        if(!button)return;
        button.disabled=true;
        button.onclick=null;
        button.classList.remove("is-active");
      });
      const slider=row.querySelector('input[type="range"]');
      if(slider){slider.disabled=true;slider.value="100";slider.oninput=null;}
    });
  }

  function waitForMetadata(track){
    return new Promise((resolve,reject)=>{
      if(Number.isFinite(track.duration)&&track.duration>0){resolve();return;}
      const timeout=setTimeout(()=>finish(false,new Error("stem_metadata_timeout")),20000);
      const onReady=()=>finish(true);
      const onError=()=>finish(false,new Error("stem_load_failed"));
      function finish(ok,error){
        clearTimeout(timeout);
        track.removeEventListener("loadedmetadata",onReady);
        track.removeEventListener("canplay",onReady);
        track.removeEventListener("error",onError);
        ok?resolve():reject(error);
      }
      track.addEventListener("loadedmetadata",onReady,{once:true});
      track.addEventListener("canplay",onReady,{once:true});
      track.addEventListener("error",onError,{once:true});
      track.load();
    });
  }

  function formatTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return"0:00";
    const m=Math.floor(seconds/60),s=Math.floor(seconds%60);
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function escapeHtml(text){
    return String(text).replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
})();