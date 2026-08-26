(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";
  const STEM_KEYS=["drums","bass","guitars","other"];
  const DETAIL_POLL_MS=5000;

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
  let lastChordIndex=-1;
  let lastChordWindow=-1;

  installMixerStyles();
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
      await Promise.all([...this.tracks.values()].map(track=>waitForMetadata(track)));
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
        const time=this.currentTime();
        const duration=this.duration();
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
    buildWave();
    const session=getSession();
    if(!validSession(session)){
      const u=new URL("login.html",location.href);
      u.searchParams.set("returnTo","play-songs.html");
      location.replace(u.href);
      return;
    }
    bindEvents();
    storageClient=makeStorageClient();
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

    fileInput?.addEventListener("change",async()=>{
      const file=fileInput.files?.[0];
      fileInput.value="";
      if(file)await importFile(file);
    });

    document.getElementById("saveYoutube")?.addEventListener("click",()=>{
      const value=String(youtubeUrl?.value||"").trim();
      if(!value){setMessage("Paste a YouTube link first.");return;}
      try{
        const url=new URL(value);
        const host=url.hostname.replace(/^www\./,"");
        if(host!=="youtube.com"&&host!=="m.youtube.com"&&host!=="youtu.be"){
          setMessage("That does not look like a YouTube link.");return;
        }
        pendingYoutube=value;
        setMessage("Link saved as reference. Now choose the authorized audio file.");
      }catch(_){setMessage("Paste a valid YouTube URL.");}
    });

    document.getElementById("backLibrary")?.addEventListener("click",closeSong);
    document.getElementById("deleteSong")?.addEventListener("click",deleteCurrentSong);
    playPause?.addEventListener("click",togglePlay);
    document.getElementById("back10")?.addEventListener("click",()=>seekBy(-10));
    document.getElementById("forward10")?.addEventListener("click",()=>seekBy(10));

    audio?.addEventListener("loadedmetadata",()=>{
      if(activeMode==="original")updatePlaybackUI(audio.currentTime,audio.duration);
    });
    audio?.addEventListener("timeupdate",()=>{
      if(activeMode==="original")updatePlaybackUI(audio.currentTime,audio.duration);
    });
    audio?.addEventListener("ended",()=>{
      if(activeMode!=="original")return;
      playPause.textContent="▶";
      if(pendingStemTransport)activatePendingStemTransport(0);
    });

    progress?.addEventListener("input",()=>{
      const duration=activeDuration();
      if(duration>0)seekActive((Number(progress.value)/1000)*duration);
    });
  }

  function openModal(){
    modal.hidden=false;
    setMessage("");
    pendingYoutube=String(youtubeUrl?.value||"").trim();
  }
  function closeModal(){modal.hidden=true;setMessage("");}
  function setMessage(text){if(message)message.textContent=text||"";}

  async function renderLibrary(){
    songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>Loading your songs…</h2><p>Connecting to your private FORTISSIMO library.</p></div>';
    try{
      const data=await callApi("list");
      const songs=Array.isArray(data.songs)?data.songs:[];
      songsEl.replaceChildren();
      if(!songs.length){
        songsEl.innerHTML='<div class="empty"><div class="empty-mark">♫</div><h2>Your songs will live here</h2><p>Add your first track. It will be stored privately in your FORTISSIMO account and prepared for Hi‑Fi separation.</p><button class="primary" type="button" data-empty-add>+ Add your first song</button></div>';
        songsEl.querySelector("[data-empty-add]")?.addEventListener("click",openModal);
        return;
      }
      songs.forEach(song=>{
        const button=document.createElement("button");
        button.className="song-card";
        button.type="button";
        const meta=[song.artist,statusLabel(song.status)].filter(Boolean).join(" · ");
        button.innerHTML=`<span class="song-art">${escapeHtml(String(song.title||"S").slice(0,1).toUpperCase())}</span><span class="song-info"><span class="song-title">${escapeHtml(song.title||"Untitled")}</span><span class="song-meta">${escapeHtml(meta||"Private cloud song")}</span></span><span class="chev">›</span>`;
        button.addEventListener("click",()=>openSong(song));
        songsEl.appendChild(button);
      });
    }catch(error){
      songsEl.innerHTML='<div class="empty"><div class="empty-mark">!</div><h2>Could not load Play Songs</h2><p>Your cloud library is safe. Check the connection and try again.</p><button class="primary" type="button" data-retry>Retry</button></div>';
      songsEl.querySelector("[data-retry]")?.addEventListener("click",renderLibrary);
      console.warn("Play Songs list failed",error);
    }
  }

  async function importFile(file){
    const looksAudio=String(file.type||"").startsWith("audio/")||/\.(mp3|wav|m4a|flac)$/i.test(file.name||"");
    if(!looksAudio){setMessage("Choose an audio file: MP3, WAV, M4A or FLAC.");return;}
    if(file.size>262144000){setMessage("This first build accepts songs up to 250 MB.");return;}
    if(!storageClient){setMessage("The upload engine could not start. Reload Play Songs and try again.");return;}

    const title=String(file.name||"Song").replace(/\.[^.]+$/,"")||"Song";
    setMessage("Preparing private upload…");
    try{
      const durationSeconds=await probeDuration(file).catch(()=>null);
      const created=await callApi("create-upload",{
        title,
        artist:null,
        fileName:file.name,
        mimeType:file.type||"application/octet-stream",
        fileSizeBytes:file.size,
        sourceReference:pendingYoutube||null
      });

      setMessage("Uploading song to your FORTISSIMO library…");
      const upload=created.upload;
      const {error:uploadError}=await storageClient.storage
        .from(upload.bucket)
        .uploadToSignedUrl(upload.path,upload.token,file,{
          contentType:file.type||"application/octet-stream",
          cacheControl:"3600"
        });
      if(uploadError)throw uploadError;

      setMessage("Upload complete. Queuing Hi‑Fi separation…");
      await callApi("mark-uploaded",{
        songId:created.song.id,
        originalPath:upload.path,
        durationSeconds
      });

      pendingYoutube="";
      if(youtubeUrl)youtubeUrl.value="";
      closeModal();
      await renderLibrary();
      await openSong({...created.song,status:"queued",durationSeconds});
    }catch(error){
      console.warn("Play Songs upload failed",error);
      if(error?.code==="file_too_large")setMessage("This file is too large for the current Play Songs limit.");
      else if(error?.code==="unauthorized")setMessage("Your session expired. Return to Home and sign in again.");
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

  async function openSong(song){
    const requestId=++openRequestId;
    stopDetailPolling();
    destroyTransports();
    currentSong=song;
    currentDetail=null;
    activeMode="original";
    lastChordIndex=-1;
    lastChordWindow=-1;

    library.classList.add("is-hidden");
    player.classList.add("is-open");
    document.getElementById("playerSongTitle").textContent=song.title||"Song";
    document.getElementById("playerSongMeta").textContent=song.artist||"FORTISSIMO Play Songs";
    setSongStatus(song.status||"uploaded");
    renderChords([]);
    resetStemControls();

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    progress.value=0;
    playPause.textContent="▶";
    updatePlaybackUI(0,Number(song.durationSeconds||0));
    scrollTo({top:0,behavior:"auto"});

    try{
      const detail=await callApi("detail",{songId:song.id});
      if(requestId!==openRequestId||currentSong?.id!==song.id)return;
      await applyDetail(detail,false);
      if(["uploaded","queued","processing"].includes(currentSong?.status))startDetailPolling(song.id);
    }catch(error){
      if(requestId!==openRequestId)return;
      console.warn("Play Songs detail failed",error);
      setSongStatus("failed_to_load");
    }
  }

  async function applyDetail(detail,fromPoll){
    if(!detail?.song||!currentSong)return;
    currentDetail=detail;
    currentSong={...currentSong,...detail.song};
    document.getElementById("playerSongTitle").textContent=currentSong.title||"Song";
    document.getElementById("playerSongMeta").textContent=currentSong.artist||"FORTISSIMO Play Songs";
    setSongStatus(currentSong.status);
    renderChords(detail.chords||[]);

    if(detail.song.originalUrl&&!audio.src){
      audio.src=detail.song.originalUrl;
      audio.load();
    }

    const hasAllStems=STEM_KEYS.every(key=>detail.stems?.[key]?.url);
    if(hasAllStems){
      stopDetailPolling();
      await prepareStemTransport(detail.stems,fromPoll);
    }else{
      updateStemAvailability(detail.stems||{});
      if(currentSong.status==="failed")stopDetailPolling();
    }
  }

  async function prepareStemTransport(stems,fromPoll){
    if(stemTransport||pendingStemTransport)return;
    const transport=new StemTransport(stems,updatePlaybackUI,()=>{playPause.textContent="▶";});
    pendingStemTransport=transport;
    updateStemAvailability(stems,true);
    try{
      await transport.load();
      if(pendingStemTransport!==transport){transport.destroy();return;}
      const currentTime=activeMode==="original"?Number(audio.currentTime||0):0;
      transport.seek(currentTime);
      if(activeMode==="original"&&!audio.paused&&fromPoll){
        // Do not interrupt an active practice take. The next pause/play tap
        // changes to the freshly prepared four-stem transport.
        setMixerReadyUI(transport,true);
        if(originalNote)originalNote.textContent="Hi‑Fi stems are ready. Pause once to switch this session to the four-stem mixer.";
      }else{
        activatePendingStemTransport(currentTime);
      }
    }catch(error){
      console.warn("Could not prepare stem mixer",error);
      if(pendingStemTransport===transport)pendingStemTransport=null;
      transport.destroy();
      resetStemControls();
      setMixerBadge("STEMS RETRY");
    }
  }

  function activatePendingStemTransport(atTime){
    if(!pendingStemTransport)return false;
    audio.pause();
    const previous=stemTransport;
    stemTransport=pendingStemTransport;
    pendingStemTransport=null;
    activeMode="stems";
    previous?.destroy();
    stemTransport.seek(Number.isFinite(atTime)?atTime:Number(audio.currentTime||0));
    setMixerReadyUI(stemTransport,false);
    setSongStatus("ready");
    updatePlaybackUI(stemTransport.currentTime(),stemTransport.duration());
    return true;
  }

  function startDetailPolling(songId){
    stopDetailPolling();
    const tick=async()=>{
      if(detailPollBusy||currentSong?.id!==songId)return;
      detailPollBusy=true;
      try{
        const detail=await callApi("detail",{songId});
        if(currentSong?.id!==songId)return;
        await applyDetail(detail,true);
      }catch(error){console.warn("Play Songs status refresh failed",error);}
      finally{detailPollBusy=false;}
    };
    detailPollTimer=setInterval(tick,DETAIL_POLL_MS);
  }

  function stopDetailPolling(){
    if(detailPollTimer){clearInterval(detailPollTimer);detailPollTimer=0;}
    detailPollBusy=false;
  }

  function closeSong(){
    ++openRequestId;
    stopDetailPolling();
    audio.pause();
    playPause.textContent="▶";
    player.classList.remove("is-open");
    library.classList.remove("is-hidden");
    currentSong=null;
    currentDetail=null;
    audio.removeAttribute("src");
    audio.load();
    destroyTransports();
    resetStemControls();
    activeMode="original";
    scrollTo({top:0,behavior:"auto"});
  }

  function destroyTransports(){
    stemTransport?.destroy();
    pendingStemTransport?.destroy();
    stemTransport=null;
    pendingStemTransport=null;
  }

  async function deleteCurrentSong(){
    if(!currentSong)return;
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
    if(activeMode==="original"&&pendingStemTransport&&audio.paused){
      activatePendingStemTransport(Number(audio.currentTime||0));
    }

    if(activeMode==="stems"&&stemTransport){
      if(stemTransport.isPaused()){
        try{await stemTransport.play();playPause.textContent="❚❚";}
        catch(error){console.warn("Stem playback could not start",error);playPause.textContent="▶";}
      }else{
        stemTransport.pause();
        playPause.textContent="▶";
      }
      return;
    }

    if(!audio.src)return;
    if(audio.paused){
      try{await audio.play();playPause.textContent="❚❚";}catch(_){}
    }else{
      audio.pause();
      playPause.textContent="▶";
      if(pendingStemTransport)activatePendingStemTransport(Number(audio.currentTime||0));
    }
  }

  function activeTime(){return activeMode==="stems"&&stemTransport?stemTransport.currentTime():Number(audio.currentTime||0);}
  function activeDuration(){return activeMode==="stems"&&stemTransport?stemTransport.duration():Number(audio.duration||currentSong?.durationSeconds||0);}

  function seekBy(delta){seekActive(activeTime()+Number(delta||0));}
  function seekActive(seconds){
    const duration=activeDuration();
    const next=Math.max(0,Math.min(Number(seconds)||0,duration||Infinity));
    if(activeMode==="stems"&&stemTransport)stemTransport.seek(next);
    else if(audio.src){try{audio.currentTime=next;}catch(_){}updatePlaybackUI(next,duration);}
  }

  function updatePlaybackUI(time,duration){
    const safeTime=Number.isFinite(time)&&time>=0?time:0;
    const safeDuration=Number.isFinite(duration)&&duration>0?duration:Number(currentSong?.durationSeconds||0);
    document.getElementById("currentTime").textContent=formatTime(safeTime);
    document.getElementById("duration").textContent=formatTime(safeDuration);
    if(safeDuration>0)progress.value=Math.max(0,Math.min(1000,Math.round(safeTime/safeDuration*1000)));
    renderActiveChord(safeTime);
  }

  function setSongStatus(status){
    if(statusText)statusText.textContent=statusLabel(status);
    if(originalNote){
      originalNote.textContent=status==="ready"
        ? activeMode==="stems"
          ? "Four synchronized Hi‑Fi stems are active. Mute, solo or rebalance any instrument while you practice."
          : "Hi‑Fi stems are ready for this song."
        : status==="processing"
          ? "FORTISSIMO is separating this song into Drums, Bass, Guitars and Other."
          : "The original is stored privately. The separation worker will activate the four-stem mixer when processing is complete.";
    }
  }

  function statusLabel(status){
    return ({
      awaiting_upload:"Awaiting upload",
      uploaded:"Uploaded",
      queued:"Queued for Hi‑Fi",
      processing:"Separating stems",
      ready:"Hi‑Fi ready",
      failed:"Processing failed",
      failed_to_load:"Could not load"
    })[status]||"Private cloud song";
  }

  function renderChords(chords){
    if(!chordLane)return;
    lastChordIndex=-1;
    lastChordWindow=-1;
    chordLane.replaceChildren();
    const list=Array.isArray(chords)&&chords.length?chords.slice(0,4):[null,null,null,null];
    list.forEach((entry,index)=>{
      const el=document.createElement("div");
      el.className="chord"+(index===0&&entry?" active":"");
      el.textContent=entry?.chord||"—";
      chordLane.appendChild(el);
    });
  }

  function renderActiveChord(time){
    const chords=Array.isArray(currentDetail?.chords)?currentDetail.chords:[];
    if(!chords.length||!chordLane)return;
    let index=0;
    for(let i=0;i<chords.length;i++){
      if(Number(chords[i].start||0)<=time)index=i;else break;
    }
    const windowStart=Math.max(0,Math.min(index-1,Math.max(0,chords.length-4)));
    if(index===lastChordIndex&&windowStart===lastChordWindow)return;
    lastChordIndex=index;
    lastChordWindow=windowStart;
    const visible=chords.slice(windowStart,windowStart+4);
    chordLane.replaceChildren();
    visible.forEach((entry,i)=>{
      const el=document.createElement("div");
      el.className="chord"+(windowStart+i===index?" active":"");
      el.textContent=entry.chord||"—";
      chordLane.appendChild(el);
    });
  }

  function updateStemAvailability(stems,loading){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;
      const stem=stems?.[key];
      const wait=row.querySelector(".stem-wait");
      if(wait)wait.textContent=stem?.url?(loading?"Loading synchronized stem…":"Stem ready"):key==="other"?"Vocals, keys, strings, brass and everything else":"Awaiting separated stem";
      row.classList.toggle("has-stem",Boolean(stem?.url));
    });
    setMixerBadge(STEM_KEYS.every(key=>stems?.[key]?.url)?(loading?"LOADING STEMS":"STEMS READY"):"HI‑FI ENGINE");
  }

  function setMixerReadyUI(transport,waitingForSwitch){
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;
      const [muteButton,soloButton]=row.querySelectorAll(".stem-actions button");
      const slider=row.querySelector('input[type="range"]');
      if(muteButton){
        muteButton.disabled=false;
        muteButton.onclick=()=>{
          transport.toggleMute(key);
          refreshMixerButtons(transport);
        };
      }
      if(soloButton){
        soloButton.disabled=false;
        soloButton.onclick=()=>{
          transport.toggleSolo(key);
          refreshMixerButtons(transport);
        };
      }
      if(slider){
        slider.disabled=false;
        slider.value=String(Math.round((transport.state(key)?.volume??1)*100));
        slider.oninput=()=>transport.setVolume(key,Number(slider.value)/100);
      }
      const wait=row.querySelector(".stem-wait");
      if(wait)wait.textContent=waitingForSwitch?"Ready · pause once to switch":"Synchronized · ready to mix";
    });
    setMixerBadge(waitingForSwitch?"STEMS READY":"MIXER ACTIVE");
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
      const wait=row.querySelector(".stem-wait");
      if(wait)wait.textContent=row.dataset.stem==="other"?"Vocals, keys, strings, brass and everything else":"Awaiting separated stem";
    });
    setMixerBadge("HI‑FI ENGINE");
  }

  function setMixerBadge(text){const badge=document.getElementById("engineBadge");if(badge)badge.textContent=text;}

  function installMixerStyles(){
    if(document.getElementById("playSongsMixerRuntimeStyles"))return;
    const style=document.createElement("style");
    style.id="playSongsMixerRuntimeStyles";
    style.textContent=`
      .stem-actions button:not(:disabled){color:rgba(255,255,255,.78);cursor:pointer}
      .stem-actions button:not(:disabled):active{transform:scale(.94)}
      .stem-actions button.is-active{border-color:rgba(255,101,0,.72);background:rgba(255,101,0,.18);color:#ff9c61}
      .stem input:not(:disabled){opacity:1;cursor:pointer}
      .stem.is-muted .stem-name{opacity:.48}
      .stem.has-stem .stem-wait{color:#ff9c61}
    `;
    document.head.appendChild(style);
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

  function buildWave(){
    const wave=document.getElementById("wave");
    if(!wave||wave.children.length)return;
    for(let i=0;i<90;i++){
      const bar=document.createElement("span");
      bar.style.height=(18+((i*37)%58))+"%";
      wave.appendChild(bar);
    }
  }

  function formatTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return"0:00";
    const m=Math.floor(seconds/60),s=Math.floor(seconds%60);
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function escapeHtml(text){
    return String(text).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
})();
