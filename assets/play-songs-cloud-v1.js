(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";
  const STEM_KEYS=["drums","bass","guitars","other"];
  const DETAIL_POLL_MS=5000;
  const PX_PER_SECOND=7.5;

  const songsEl=document.getElementById("songs");
  const library=document.getElementById("library");
  const player=document.getElementById("player");
  const modal=document.getElementById("addModal");
  const fileInput=document.getElementById("audioFile");
  const youtubeUrl=document.getElementById("youtubeUrl");
  const message=document.getElementById("modalMessage");
  const audio=document.getElementById("audio");
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
  let pendingYoutube="";
  let storageClient=null;
  let stemTransport=null;
  let pendingStemTransport=null;
  let activeMode="original";
  let detailPollTimer=0;
  let detailPollBusy=false;
  let openRequestId=0;
  let arrangementWidth=0;
  let lastManualScrollAt=0;
  let timelinePointerStart=null;
  let resizeTimer=0;

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
    currentTime(){const value=Number(this.master()?.currentTime||0);return Number.isFinite(value)&&value>=0?value:0;}
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
      }catch(error){this.pause();throw error;}
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
        if(force||Math.abs(track.currentTime-target)>.035){try{track.currentTime=target;}catch(_){}}
      });
    }
    setVolume(key,value){
      const state=this.states.get(key);if(!state)return;
      state.volume=Math.max(0,Math.min(1,Number(value)||0));
      this.applyMix();
    }
    toggleMute(key){const state=this.states.get(key);if(!state)return false;state.muted=!state.muted;this.applyMix();return state.muted;}
    toggleSolo(key){const state=this.states.get(key);if(!state)return false;state.solo=!state.solo;this.applyMix();return state.solo;}
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
          if(Math.abs(track.currentTime-time)>.045){try{track.currentTime=time;}catch(_){}}
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
      this.tracks.clear();this.states.clear();
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
    fileInput?.addEventListener("change",async()=>{const file=fileInput.files?.[0];fileInput.value="";if(file)await importFile(file);});

    document.getElementById("saveYoutube")?.addEventListener("click",()=>{
      const value=String(youtubeUrl?.value||"").trim();
      if(!value){setMessage("Paste a YouTube link first.");return;}
      try{
        const url=new URL(value),host=url.hostname.replace(/^www\./,"");
        if(host!=="youtube.com"&&host!=="m.youtube.com"&&host!=="youtu.be"){setMessage("That does not look like a YouTube link.");return;}
        pendingYoutube=value;
        setMessage("Link saved as reference. Now choose the authorized audio file.");
      }catch(_){setMessage("Paste a valid YouTube URL.");}
    });

    document.getElementById("backLibrary")?.addEventListener("click",closeSong);
    document.getElementById("moreSong")?.addEventListener("click",event=>{event.stopPropagation();songOptions.hidden=!songOptions.hidden;});
    document.getElementById("deleteSong")?.addEventListener("click",deleteCurrentSong);
    document.addEventListener("click",()=>{if(songOptions)songOptions.hidden=true;});
    playPause?.addEventListener("click",togglePlay);
    document.getElementById("back10")?.addEventListener("click",()=>seekBy(-10));
    document.getElementById("forward10")?.addEventListener("click",()=>seekBy(10));

    audio?.addEventListener("loadedmetadata",()=>{if(activeMode==="original")updatePlaybackUI(audio.currentTime,audio.duration);});
    audio?.addEventListener("timeupdate",()=>{if(activeMode==="original")updatePlaybackUI(audio.currentTime,audio.duration);});
    audio?.addEventListener("ended",()=>{
      if(activeMode!=="original")return;
      playPause.textContent="▶";
      if(pendingStemTransport)activatePendingStemTransport(0);
    });
    progress?.addEventListener("input",()=>{const duration=activeDuration();if(duration>0)seekActive((Number(progress.value)/1000)*duration);});

    timelineViewport?.addEventListener("scroll",()=>{lastManualScrollAt=Date.now();},{passive:true});
    timelineViewport?.addEventListener("pointerdown",event=>{
      timelinePointerStart={x:event.clientX,y:event.clientY,scrollLeft:timelineViewport.scrollLeft};
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
  }

  function openModal(){modal.hidden=false;setMessage("");pendingYoutube=String(youtubeUrl?.value||"").trim();}
  function closeModal(){modal.hidden=true;setMessage("");}
  function setMessage(text){if(message)message.textContent=text||"";}

  async function renderLibrary(){
    songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>Loading…</h2></div>';
    try{
      const data=await callApi("list"),songs=Array.isArray(data.songs)?data.songs:[];
      songsEl.replaceChildren();
      if(!songs.length){
        songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>No songs yet</h2><p>Add a song to start practicing.</p><button class="primary" type="button" data-empty-add>+ Add Song</button></div>';
        songsEl.querySelector("[data-empty-add]")?.addEventListener("click",openModal);
        return;
      }
      songs.forEach(song=>{
        const button=document.createElement("button");
        button.className="song-card";button.type="button";
        const meta=[song.artist,statusLabel(song.status)].filter(Boolean).join(" · ");
        button.innerHTML=`<span class="song-art">${escapeHtml(String(song.title||"S").slice(0,1).toUpperCase())}</span><span class="song-info"><span class="song-title">${escapeHtml(song.title||"Untitled")}</span><span class="song-meta">${escapeHtml(meta||"Play Songs")}</span></span><span class="chev">›</span>`;
        button.addEventListener("click",()=>openSong(song));songsEl.appendChild(button);
      });
    }catch(error){
      songsEl.innerHTML='<div class="empty"><div class="empty-mark">!</div><h2>Could not load songs</h2><p>Try again without leaving this screen.</p><button class="primary" type="button" data-retry>Retry</button></div>';
      songsEl.querySelector("[data-retry]")?.addEventListener("click",renderLibrary);
      console.warn("Play Songs list failed",error);
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
      const created=await callApi("create-upload",{title,artist:null,fileName:file.name,mimeType:file.type||"application/octet-stream",fileSizeBytes:file.size,sourceReference:pendingYoutube||null});
      setMessage("Uploading…");
      const upload=created.upload;
      const {error:uploadError}=await storageClient.storage.from(upload.bucket).uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type||"application/octet-stream",cacheControl:"3600"});
      if(uploadError)throw uploadError;
      setMessage("Preparing stems…");
      await callApi("mark-uploaded",{songId:created.song.id,originalPath:upload.path,durationSeconds});
      pendingYoutube="";if(youtubeUrl)youtubeUrl.value="";closeModal();
      await renderLibrary();
      await openSong({...created.song,status:"queued",durationSeconds});
    }catch(error){
      console.warn("Play Songs upload failed",error);
      if(error?.code==="file_too_large")setMessage("This file is too large.");
      else if(error?.code==="unauthorized")setMessage("Your session expired. Sign in again.");
      else setMessage("The upload could not finish. Your existing songs were not affected.");
    }
  }

  function probeDuration(file){
    return new Promise((resolve,reject)=>{
      const probe=document.createElement("audio"),url=URL.createObjectURL(file);
      const cleanup=()=>{URL.revokeObjectURL(url);probe.removeAttribute("src");};
      const timer=setTimeout(()=>{cleanup();reject(new Error("metadata_timeout"));},8000);
      probe.preload="metadata";
      probe.onloadedmetadata=()=>{clearTimeout(timer);const value=Number.isFinite(probe.duration)?probe.duration:null;cleanup();resolve(value);};
      probe.onerror=()=>{clearTimeout(timer);cleanup();reject(new Error("metadata_failed"));};
      probe.src=url;
    });
  }

  async function openSong(song){
    const requestId=++openRequestId;
    stopDetailPolling();destroyTransports();
    currentSong=song;currentDetail=null;activeMode="original";
    library.classList.add("is-hidden");player.classList.add("is-open");
    document.getElementById("playerSongTitle").textContent=song.title||"Song";
    document.getElementById("playerSongMeta").textContent=song.artist||"";
    setSongStatus(song.status||"uploaded");resetStemControls();resetArrangement(Number(song.durationSeconds||0));
    audio.pause();audio.removeAttribute("src");audio.load();progress.value=0;playPause.textContent="▶";
    updatePlaybackUI(0,Number(song.durationSeconds||0));scrollTo({top:0,behavior:"auto"});
    try{
      const detail=await callApi("detail",{songId:song.id});
      if(requestId!==openRequestId||currentSong?.id!==song.id)return;
      await applyDetail(detail,false);
      if(["uploaded","queued","processing"].includes(currentSong?.status))startDetailPolling(song.id);
    }catch(error){if(requestId!==openRequestId)return;console.warn("Play Songs detail failed",error);setSongStatus("failed_to_load");}
  }

  async function applyDetail(detail,fromPoll){
    if(!detail?.song||!currentSong)return;
    currentDetail=detail;currentSong={...currentSong,...detail.song};
    document.getElementById("playerSongTitle").textContent=currentSong.title||"Song";
    document.getElementById("playerSongMeta").textContent=currentSong.artist||"";
    setSongStatus(currentSong.status);renderArrangement(detail);
    if(detail.song.originalUrl&&!audio.src){audio.src=detail.song.originalUrl;audio.load();}
    const hasAllStems=STEM_KEYS.every(key=>detail.stems?.[key]?.url);
    if(hasAllStems){stopDetailPolling();await prepareStemTransport(detail.stems,fromPoll);}
    else{updateStemAvailability(detail.stems||{});if(currentSong.status==="failed")stopDetailPolling();}
  }

  async function prepareStemTransport(stems,fromPoll){
    if(stemTransport||pendingStemTransport)return;
    const transport=new StemTransport(stems,updatePlaybackUI,()=>{playPause.textContent="▶";});
    pendingStemTransport=transport;updateStemAvailability(stems,true);
    try{
      await transport.load();
      if(pendingStemTransport!==transport){transport.destroy();return;}
      const currentTime=activeMode==="original"?Number(audio.currentTime||0):0;
      transport.seek(currentTime);
      if(activeMode==="original"&&!audio.paused&&fromPoll){setMixerReadyUI(transport,true);if(originalNote)originalNote.textContent="Stems ready · pause once to switch to the mixer.";}
      else activatePendingStemTransport(currentTime);
    }catch(error){
      console.warn("Could not prepare stem mixer",error);
      if(pendingStemTransport===transport)pendingStemTransport=null;
      transport.destroy();resetStemControls();
    }
  }

  function activatePendingStemTransport(atTime){
    if(!pendingStemTransport)return false;
    audio.pause();const previous=stemTransport;stemTransport=pendingStemTransport;pendingStemTransport=null;activeMode="stems";previous?.destroy();
    stemTransport.seek(Number.isFinite(atTime)?atTime:Number(audio.currentTime||0));
    setMixerReadyUI(stemTransport,false);setSongStatus("ready");updatePlaybackUI(stemTransport.currentTime(),stemTransport.duration());return true;
  }

  function startDetailPolling(songId){
    stopDetailPolling();
    const tick=async()=>{
      if(detailPollBusy||currentSong?.id!==songId)return;
      detailPollBusy=true;
      try{const detail=await callApi("detail",{songId});if(currentSong?.id===songId)await applyDetail(detail,true);}
      catch(error){console.warn("Play Songs status refresh failed",error);}finally{detailPollBusy=false;}
    };
    detailPollTimer=setInterval(tick,DETAIL_POLL_MS);
  }
  function stopDetailPolling(){if(detailPollTimer){clearInterval(detailPollTimer);detailPollTimer=0;}detailPollBusy=false;}

  function closeSong(){
    ++openRequestId;stopDetailPolling();audio.pause();playPause.textContent="▶";player.classList.remove("is-open");library.classList.remove("is-hidden");
    currentSong=null;currentDetail=null;audio.removeAttribute("src");audio.load();destroyTransports();resetStemControls();resetArrangement();activeMode="original";scrollTo({top:0,behavior:"auto"});
  }
  function destroyTransports(){stemTransport?.destroy();pendingStemTransport?.destroy();stemTransport=null;pendingStemTransport=null;}

  async function deleteCurrentSong(){
    if(!currentSong)return;
    if(songOptions)songOptions.hidden=true;
    if(!confirm(`Delete “${currentSong.title}” from Play Songs?`))return;
    try{await callApi("delete",{songId:currentSong.id});closeSong();await renderLibrary();}
    catch(error){console.warn("Play Songs delete failed",error);alert("The song could not be deleted right now.");}
  }

  async function togglePlay(){
    if(activeMode==="original"&&pendingStemTransport&&audio.paused)activatePendingStemTransport(Number(audio.currentTime||0));
    if(activeMode==="stems"&&stemTransport){
      if(stemTransport.isPaused()){
        try{await stemTransport.play();playPause.textContent="❚❚";}catch(error){console.warn("Stem playback could not start",error);playPause.textContent="▶";}
      }else{stemTransport.pause();playPause.textContent="▶";}
      return;
    }
    if(!audio.src)return;
    if(audio.paused){try{await audio.play();playPause.textContent="❚❚";}catch(_){}}
    else{audio.pause();playPause.textContent="▶";if(pendingStemTransport)activatePendingStemTransport(Number(audio.currentTime||0));}
  }

  function activeTime(){return activeMode==="stems"&&stemTransport?stemTransport.currentTime():Number(audio.currentTime||0);}
  function activeDuration(){return activeMode==="stems"&&stemTransport?stemTransport.duration():Number(audio.duration||currentSong?.durationSeconds||0);}
  function isPlaying(){return activeMode==="stems"&&stemTransport?!stemTransport.isPaused():Boolean(audio.src&&!audio.paused);}
  function seekBy(delta){seekActive(activeTime()+Number(delta||0));}
  function seekActive(seconds){
    const duration=activeDuration(),next=Math.max(0,Math.min(Number(seconds)||0,duration||Infinity));
    if(activeMode==="stems"&&stemTransport)stemTransport.seek(next);
    else if(audio.src){try{audio.currentTime=next;}catch(_){}updatePlaybackUI(next,duration);}
    else updatePlaybackUI(next,duration);
  }

  function seekFromTimelineEvent(event){
    const duration=activeDuration();if(!duration||!timelineViewport||!timelineContent)return;
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
    const left=timelineViewport.scrollLeft,right=left+timelineViewport.clientWidth;
    if(x>right*0.88||x<left+timelineViewport.clientWidth*.12){
      const target=Math.max(0,x-timelineViewport.clientWidth*.42);
      timelineViewport.scrollLeft=target;
    }
  }

  function setSongStatus(status){
    if(statusText)statusText.textContent=statusLabel(status);
    if(!originalNote)return;
    originalNote.textContent=status==="ready"
      ? activeMode==="stems"?"Four stems active":"Stems ready"
      : status==="processing"?"Separating Drums, Bass, Guitars and Other…"
      : status==="queued"||status==="uploaded"?"Queued for separation…"
      : status==="failed"?"Stem processing failed":"Preparing song…";
  }
  function statusLabel(status){
    return ({awaiting_upload:"Uploading",uploaded:"Uploaded",queued:"Queued",processing:"Separating",ready:"Ready",failed:"Failed",failed_to_load:"Unavailable"})[status]||"Private";
  }

  function renderArrangement(detail){
    const duration=Number(detail?.song?.durationSeconds||currentSong?.durationSeconds||activeDuration()||0);
    setArrangementWidth(duration);
    renderTimeRuler(duration);
    renderChordTimeline(Array.isArray(detail?.chords)?detail.chords:[],duration,currentSong?.status);
    renderWaveforms(detail?.stems||{},currentSong?.status);
    updatePlaybackUI(activeTime(),duration);
  }

  function resetArrangement(duration=0){
    setArrangementWidth(duration);
    renderTimeRuler(duration);
    renderChordTimeline([],duration,currentSong?.status);
    renderWaveforms({},currentSong?.status);
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
    if(!timeRuler)return;timeRuler.replaceChildren();
    if(!(duration>0))return;
    const step=duration>600?60:duration>300?30:15;
    for(let time=0;time<=duration;time+=step){
      const mark=document.createElement("span");mark.className="time-mark";mark.style.left=`${(time/duration)*arrangementWidth}px`;mark.textContent=formatTime(time);timeRuler.appendChild(mark);
    }
  }

  function renderChordTimeline(chords,duration,status){
    if(!chordLane)return;chordLane.replaceChildren();
    if(!Array.isArray(chords)||!chords.length||!(duration>0)){
      const empty=document.createElement("span");empty.className="chord-empty";
      empty.textContent=status==="ready"?"Chord analysis pending":"Analyzing chords…";
      chordLane.appendChild(empty);return;
    }
    chords.forEach((entry,index)=>{
      const start=Math.max(0,Number(entry.start||0));
      const next=Number(entry.end??chords[index+1]?.start??duration);
      const end=Math.max(start,Math.min(duration,Number.isFinite(next)?next:duration));
      const block=document.createElement("div");block.className="chord-block";block.dataset.chordIndex=String(index);block.dataset.start=String(start);block.dataset.end=String(end);
      block.style.left=`${(start/duration)*arrangementWidth}px`;block.style.width=`${Math.max(34,((end-start)/duration)*arrangementWidth)}px`;block.textContent=entry.chord||"—";chordLane.appendChild(block);
    });
  }

  function updateActiveChord(time){
    if(!chordLane)return;
    chordLane.querySelectorAll(".chord-block").forEach(block=>{
      const start=Number(block.dataset.start||0),end=Number(block.dataset.end||Infinity);
      block.classList.toggle("active",time>=start&&time<end);
    });
  }

  function renderWaveforms(stems,status){
    STEM_KEYS.forEach(key=>{
      const canvas=document.getElementById(`wave-${key}`),label=document.getElementById(`wave-status-${key}`),peaks=stems?.[key]?.waveformPeaks;
      clearCanvas(canvas);
      if(Array.isArray(peaks)&&peaks.length){drawWaveform(canvas,peaks);if(label)label.hidden=true;}
      else if(label){label.hidden=false;label.textContent=status==="ready"?"Waveform unavailable":"Separating…";}
    });
  }

  function clearCanvas(canvas){if(!canvas)return;const ctx=canvas.getContext("2d");if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
  function drawWaveform(canvas,peaks){
    if(!canvas||!peaks?.length)return;
    const track=canvas.parentElement,dpr=Math.min(2,window.devicePixelRatio||1);
    const cssWidth=Math.max(1,arrangementWidth),cssHeight=Math.max(40,track?.clientHeight||70);
    canvas.width=Math.min(9000,Math.round(cssWidth*dpr));canvas.height=Math.round(cssHeight*dpr);
    const ctx=canvas.getContext("2d");if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssWidth,cssHeight);
    ctx.strokeStyle="rgba(255,255,255,.68)";ctx.lineWidth=1;ctx.beginPath();
    const mid=cssHeight/2,scale=cssHeight*.43;
    for(let x=0;x<cssWidth;x++){
      const index=Math.min(peaks.length-1,Math.floor((x/cssWidth)*peaks.length));
      const amp=Math.max(0,Math.min(1,Number(peaks[index])||0))*scale;
      ctx.moveTo(x+.5,mid-amp);ctx.lineTo(x+.5,mid+amp);
    }
    ctx.stroke();
  }

  function updateStemAvailability(stems,loading){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;row.classList.toggle("has-stem",Boolean(stems?.[key]?.url));
      const status=document.getElementById(`wave-status-${key}`);
      if(status&&!stems?.[key]?.waveformPeaks?.length){status.hidden=false;status.textContent=stems?.[key]?.url?(loading?"Loading stem…":"Stem ready"):"Separating…";}
    });
  }

  function setMixerReadyUI(transport,waitingForSwitch){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem,[muteButton,soloButton]=row.querySelectorAll(".stem-actions button"),slider=row.querySelector('input[type="range"]');
      if(muteButton){muteButton.disabled=false;muteButton.onclick=()=>{transport.toggleMute(key);refreshMixerButtons(transport);};}
      if(soloButton){soloButton.disabled=false;soloButton.onclick=()=>{transport.toggleSolo(key);refreshMixerButtons(transport);};}
      if(slider){slider.disabled=false;slider.value=String(Math.round((transport.state(key)?.volume??1)*100));slider.oninput=()=>transport.setVolume(key,Number(slider.value)/100);}
    });
    refreshMixerButtons(transport);
    if(waitingForSwitch&&originalNote)originalNote.textContent="Stems ready · pause once to switch to the mixer.";
  }

  function refreshMixerButtons(transport){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem,state=transport.state(key),[muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      muteButton?.classList.toggle("is-active",Boolean(state?.muted));soloButton?.classList.toggle("is-active",Boolean(state?.solo));row.classList.toggle("is-muted",Boolean(state?.muted));
    });
  }

  function resetStemControls(){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      row.classList.remove("has-stem","is-muted");
      const [muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      [muteButton,soloButton].forEach(button=>{if(!button)return;button.disabled=true;button.onclick=null;button.classList.remove("is-active");});
      const slider=row.querySelector('input[type="range"]');if(slider){slider.disabled=true;slider.value="100";slider.oninput=null;}
    });
  }

  function waitForMetadata(track){
    return new Promise((resolve,reject)=>{
      if(Number.isFinite(track.duration)&&track.duration>0){resolve();return;}
      const timeout=setTimeout(()=>finish(false,new Error("stem_metadata_timeout")),20000);
      const onReady=()=>finish(true),onError=()=>finish(false,new Error("stem_load_failed"));
      function finish(ok,error){clearTimeout(timeout);track.removeEventListener("loadedmetadata",onReady);track.removeEventListener("canplay",onReady);track.removeEventListener("error",onError);ok?resolve():reject(error);}
      track.addEventListener("loadedmetadata",onReady,{once:true});track.addEventListener("canplay",onReady,{once:true});track.addEventListener("error",onError,{once:true});track.load();
    });
  }

  function formatTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return"0:00";const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return `${m}:${String(s).padStart(2,"0")}`;}
  function escapeHtml(text){return String(text).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
})();
