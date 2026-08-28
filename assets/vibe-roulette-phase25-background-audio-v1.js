const KEEPER_ID='vrBackgroundAudioKeeper';
const BG_STATE={armed:false,lastKnownRunning:false,lastVisibility:'visible'};

function buildKeeperWavUrl(){
  const sampleRate=8000,seconds=1,frames=sampleRate*seconds,bytes=44+frames*2;
  const b=new ArrayBuffer(bytes),v=new DataView(b);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,bytes-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*2,true);
  for(let i=0;i<frames;i++){
    const sample=Math.round(Math.sin((i/sampleRate)*Math.PI*2*18)*2);
    v.setInt16(44+i*2,sample,true);
  }
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
}

function keeper(){
  if(typeof document==='undefined')return null;
  let audio=document.getElementById(KEEPER_ID);if(audio)return audio;
  audio=document.createElement('audio');audio.id=KEEPER_ID;audio.loop=true;audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');audio.setAttribute('aria-hidden','true');audio.style.display='none';audio.src=buildKeeperWavUrl();audio.volume=0.01;document.body.appendChild(audio);return audio;
}

function currentTransport(){return typeof window!=='undefined'?window.__FORTISSIMO_VIBE_TRANSPORT__:null;}
function setMediaPlaybackState(state){try{if('mediaSession'in navigator)navigator.mediaSession.playbackState=state;}catch(_){}}
function directionTitle(){const r=window.__FORTISSIMO_VIBE_LAST_RESULT__||{};return document.getElementById('workingTitle')?.value?.trim()||r.storyProfile?.primaryTerritory||r.mood||'Vibe Roulette';}
function updateMetadata(){
  if(!('mediaSession'in navigator)||typeof MediaMetadata==='undefined')return;
  const t=currentTransport(),bpm=Math.round(Number(t?.performance?.bpm)||0),mode=window.__FORTISSIMO_ACTIVE_SECTION__==='chorus'?'Section Direction':'Main Progression';
  try{navigator.mediaSession.metadata=new MediaMetadata({title:directionTitle(),artist:'FORTISSIMO · Vibe Roulette',album:bpm?`${mode} · ${bpm} BPM`:mode});}catch(_){}
}
async function armKeeper(){
  const a=keeper();if(!a)return false;
  try{await a.play();BG_STATE.armed=true;return true;}catch(_){return false;}
}
function disarmKeeper(){const a=keeper();if(a&&!a.paused)a.pause();BG_STATE.armed=false;}

async function resumeTransport(){
  const t=currentTransport();if(!t)return;
  try{if(t.ctx?.state==='suspended')await t.ctx.resume();}catch(_){}
  if(!t.running&&t.paused)await t.resume();
  await armKeeper();setMediaPlaybackState('playing');updateMetadata();
}
function pauseTransport(){const t=currentTransport();if(t?.running)t.pause();disarmKeeper();setMediaPlaybackState('paused');updateMetadata();}

function installMediaSession(){
  if(!('mediaSession'in navigator))return;
  try{navigator.mediaSession.setActionHandler('play',()=>resumeTransport().catch(()=>{}));}catch(_){}
  try{navigator.mediaSession.setActionHandler('pause',()=>pauseTransport());}catch(_){}
  try{navigator.mediaSession.setActionHandler('stop',()=>{const t=currentTransport();t?.stop();disarmKeeper();setMediaPlaybackState('none');});}catch(_){}
}

function patchTransportLifecycle(){
  const watch=()=>{
    const t=currentTransport();if(!t||t.__phase25BackgroundPatched)return false;t.__phase25BackgroundPatched=true;
    const start=t.start.bind(t),resume=t.resume.bind(t),pause=t.pause.bind(t),stop=t.stop.bind(t);
    t.start=async(...args)=>{const out=await start(...args);if(out){BG_STATE.lastKnownRunning=true;await armKeeper();setMediaPlaybackState('playing');updateMetadata();}return out;};
    t.resume=async(...args)=>{const out=await resume(...args);if(out){BG_STATE.lastKnownRunning=true;await armKeeper();setMediaPlaybackState('playing');updateMetadata();}return out;};
    t.pause=(...args)=>{BG_STATE.lastKnownRunning=false;const out=pause(...args);disarmKeeper();setMediaPlaybackState('paused');updateMetadata();return out;};
    t.stop=(...args)=>{BG_STATE.lastKnownRunning=false;const out=stop(...args);disarmKeeper();setMediaPlaybackState('none');updateMetadata();return out;};
    return true;
  };
  if(watch())return;
  const id=window.setInterval(()=>{if(watch())window.clearInterval(id);},180);
}

function installVisibilityRecovery(){
  document.addEventListener('visibilitychange',async()=>{
    BG_STATE.lastVisibility=document.visibilityState;
    const t=currentTransport();
    if(document.visibilityState==='hidden'){
      if(t?.running){BG_STATE.lastKnownRunning=true;await armKeeper();setMediaPlaybackState('playing');updateMetadata();}
      return;
    }
    if(BG_STATE.lastKnownRunning&&t){
      try{if(t.ctx?.state==='suspended')await t.ctx.resume();}catch(_){}
      if(!t.running&&t.paused)try{await t.resume();}catch(_){}
      await armKeeper();setMediaPlaybackState(t.running?'playing':'paused');updateMetadata();
    }
  });
  window.addEventListener('pageshow',async()=>{const t=currentTransport();if(BG_STATE.lastKnownRunning&&t){try{if(t.ctx?.state==='suspended')await t.ctx.resume();}catch(_){}await armKeeper();}});
}

function installStatusBadge(){
  if(document.getElementById('vrBackgroundModeNote'))return;
  const loop=document.querySelector('.loop-panel');if(!loop)return;
  const note=document.createElement('div');note.id='vrBackgroundModeNote';note.className='vr-background-mode-note';note.textContent='Background composition · best effort on iPhone/iPad';loop.insertAdjacentElement('afterend',note);
  const style=document.createElement('style');style.id='vr-phase25-styles';style.textContent='.vr-background-mode-note{margin:7px 0 2px;color:rgba(255,255,255,.38);font-size:9px;font-weight:700;letter-spacing:.03em}.vr-background-mode-note::before{content:"●";color:#ff5a00;margin-right:5px}';document.head.appendChild(style);
}

function install(){keeper();installMediaSession();patchTransportLifecycle();installVisibilityRecovery();installStatusBadge();document.addEventListener('fortissimo:vibe-section-change',updateMetadata);}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});else setTimeout(install,80);}

export const PHASE25_INFO={version:'2.5',mode:'Background Composition Mode',principle:'Use HTML media ownership, Media Session controls and AudioContext recovery as a best-effort bridge for mobile background composition. Native iOS background audio remains the only guaranteed path.'};
