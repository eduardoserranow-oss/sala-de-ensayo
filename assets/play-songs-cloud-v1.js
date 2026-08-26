(function(){
  "use strict";

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const FUNCTION_URL=API_URL+"/functions/v1/play-songs-api";
  const SESSION_KEY="myLessons.localSession";

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

  init();

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

  function cloudAccountId(session){
    return String(session?.cloudAccountId||"").trim();
  }

  function validSession(session){
    return Boolean(cloudAccountId(session)&&session?.cloudToken);
  }

  function makeStorageClient(){
    if(!window.supabase?.createClient) return null;
    return window.supabase.createClient(API_URL,API_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }

  async function callApi(action,payload){
    const session=getSession();
    if(!validSession(session)) throw new Error("unauthorized");
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
      if(file) await importFile(file);
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
    document.getElementById("back10")?.addEventListener("click",()=>{audio.currentTime=Math.max(0,audio.currentTime-10);});
    document.getElementById("forward10")?.addEventListener("click",()=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10);});
    audio?.addEventListener("loadedmetadata",()=>{document.getElementById("duration").textContent=formatTime(audio.duration);});
    audio?.addEventListener("timeupdate",onTimeUpdate);
    audio?.addEventListener("ended",()=>{playPause.textContent="▶";});
    progress?.addEventListener("input",()=>{
      if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(progress.value)/1000)*audio.duration;
    });
  }

  function openModal(){
    modal.hidden=false;
    setMessage("");
    pendingYoutube=String(youtubeUrl?.value||"").trim();
  }

  function closeModal(){
    modal.hidden=true;
    setMessage("");
  }

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
      if(uploadError) throw uploadError;

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
      await openSong({...created.song,status:"queued"});
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
    currentSong=song;
    library.classList.add("is-hidden");
    player.classList.add("is-open");
    document.getElementById("playerSongTitle").textContent=song.title||"Song";
    document.getElementById("playerSongMeta").textContent=song.artist||"FORTISSIMO Play Songs";
    setSongStatus(song.status||"uploaded");
    renderChords([]);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    progress.value=0;
    playPause.textContent="▶";
    document.getElementById("currentTime").textContent="0:00";
    document.getElementById("duration").textContent=formatTime(Number(song.durationSeconds||0));
    scrollTo({top:0,behavior:"auto"});

    try{
      currentDetail=await callApi("detail",{songId:song.id});
      const detailSong=currentDetail.song||{};
      currentSong={...song,...detailSong};
      document.getElementById("playerSongTitle").textContent=currentSong.title||"Song";
      document.getElementById("playerSongMeta").textContent=currentSong.artist||"FORTISSIMO Play Songs";
      setSongStatus(currentSong.status);
      renderChords(currentDetail.chords||[]);
      updateStemState(currentDetail.stems||{});
      if(detailSong.originalUrl){
        audio.src=detailSong.originalUrl;
        audio.load();
      }
    }catch(error){
      console.warn("Play Songs detail failed",error);
      setSongStatus("failed_to_load");
    }
  }

  function closeSong(){
    audio.pause();
    playPause.textContent="▶";
    player.classList.remove("is-open");
    library.classList.remove("is-hidden");
    currentSong=null;
    currentDetail=null;
    audio.removeAttribute("src");
    audio.load();
    scrollTo({top:0,behavior:"auto"});
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
    if(!audio.src)return;
    if(audio.paused){
      try{await audio.play();playPause.textContent="❚❚";}catch(_){ }
    }else{
      audio.pause();
      playPause.textContent="▶";
    }
  }

  function onTimeUpdate(){
    document.getElementById("currentTime").textContent=formatTime(audio.currentTime);
    if(Number.isFinite(audio.duration)&&audio.duration>0)progress.value=Math.round(audio.currentTime/audio.duration*1000);
    renderActiveChord(audio.currentTime);
  }

  function setSongStatus(status){
    if(statusText)statusText.textContent=statusLabel(status);
    if(originalNote){
      originalNote.textContent=status==="ready"
        ? "Hi‑Fi stems are ready for this song."
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
    chordLane.replaceChildren();
    const list=Array.isArray(chords)&&chords.length?chords.slice(0,4):[null,null,null,null];
    list.forEach((entry,index)=>{
      const el=document.createElement("div");
      el.className="chord"+(index===0?" active":"");
      el.textContent=entry?.chord||"—";
      if(entry)el.dataset.start=String(entry.start||0);
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
    const windowStart=Math.max(0,index-1);
    const visible=chords.slice(windowStart,windowStart+4);
    chordLane.replaceChildren();
    visible.forEach((entry,i)=>{
      const el=document.createElement("div");
      el.className="chord"+(windowStart+i===index?" active":"");
      el.textContent=entry.chord||"—";
      chordLane.appendChild(el);
    });
  }

  function updateStemState(stems){
    const ready=stems&&["drums","bass","guitars","other"].every(key=>stems[key]?.url);
    document.querySelectorAll("[data-stem]").forEach(row=>{
      const key=row.dataset.stem;
      const stem=stems?.[key];
      const wait=row.querySelector(".stem-wait");
      if(wait)wait.textContent=stem?.url?"Stem available · mixer activation next":"Awaiting separated stem";
      row.classList.toggle("has-stem",Boolean(stem?.url));
    });
    const badge=document.getElementById("engineBadge");
    if(badge)badge.textContent=ready?"STEMS READY":"HI‑FI ENGINE";
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
