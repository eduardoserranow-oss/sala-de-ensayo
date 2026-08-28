const basePath='./assets/vibe-roulette-drums';

const loopSpecs=[
  [1,100,8],[2,114,4],[3,98,4],[4,112,8],[5,102,4],[6,122,8],[7,120,8],
  [8,95,8],[9,117,8],[10,118,8],[11,110,8],[12,116,8],[13,112,8],[14,118,8],
  [15,98,4],[16,120,8],[17,112,8],[18,125,8],[19,118,8],[20,121,8],[21,113,8],
  [22,98,8],[23,115,8],[24,125,8],[25,124,8],[26,110,4],[27,115,8],[28,100,4]
];

function pad(id){ return String(id).padStart(3,'0'); }
function hash(value=''){ let h=2166136261; for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; }
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

// Filename is intentionally the source filename: it is what the musician can
// search for in the original sample library.  The browser only receives MP3
// derivatives, never the WAV masters.
export const AFRO_DRUM_LIBRARY=loopSpecs.map(([id,bpm,bars])=>{
  const stem=`vr-afro-drum-${pad(id)}_${bpm}bpm_${bars}bar`;
  return {
    id:stem,
    originalFilename:`${stem}.wav`,
    src:`${basePath}/${stem}.mp3`,
    nativeBpm:bpm,
    bars,
    pocket:bpm>=118?'Forward afro pocket':bpm<=102?'Laid-back afro pocket':'Balanced afro pocket',
    density:bars===4?'Focused loop':'Full phrase',
    moods:bpm>=118?['illusion','connection']:bpm<=102?['nostalgia','connection']:['illusion','nostalgia','connection']
  };
});

export function selectAfroDrum({bpm=110,mood='connection',energyTarget=.65,seed='',recentIds=[],tasteScores={}}={}){
  const sessionBpm=clamp(Number(bpm)||110,90,150);
  const inWindow=AFRO_DRUM_LIBRARY.filter(loop=>Math.abs(loop.nativeBpm-sessionBpm)<=10);
  const nearestDifference=Math.min(...AFRO_DRUM_LIBRARY.map(loop=>Math.abs(loop.nativeBpm-sessionBpm)));
  // Outside the ±10 window, closeness is a hard rule: musical preferences only
  // break ties between loops with the same nearest native BPM.
  const candidates=inWindow.length?inWindow:AFRO_DRUM_LIBRARY.filter(loop=>Math.abs(loop.nativeBpm-sessionBpm)===nearestDifference);
  const ranked=candidates.map(loop=>{
    const difference=Math.abs(loop.nativeBpm-sessionBpm);
    const tempoScore=1-difference/Math.max(1,inWindow.length?10:60);
    const moodScore=loop.moods.includes(mood)?1:.35;
    const energyScore=1-Math.min(1,Math.abs((loop.nativeBpm-90)/60-energyTarget));
    const cooldown=recentIds.includes(loop.id)?-.35:0;
    const variation=(hash(`${seed}|${loop.id}`)%1000)/1000*.16;
    const taste=clamp(Number(tasteScores[loop.originalFilename]||0)*.12,-.32,.32);
    return {loop,score:tempoScore*.55+moodScore*.2+energyScore*.15+cooldown+variation+taste,difference};
  }).sort((a,b)=>b.score-a.score||a.difference-b.difference||a.loop.id.localeCompare(b.loop.id));
  return {...ranked[0].loop,sessionBpm,difference:ranked[0].difference,withinIdealWindow:Boolean(inWindow.length),stretchRatio:sessionBpm/ranked[0].loop.nativeBpm};
}

function setPreservePitch(audio){
  audio.preservesPitch=true;
  audio.webkitPreservesPitch=true;
  audio.mozPreservesPitch=true;
}

export class AfroDrumLoopPlayer{
  constructor({onStateChange=null}={}){this.audio=null;this.loop=null;this.muted=false;this.onStateChange=onStateChange;}
  emit(state,extra={}){this.onStateChange?.({state,loop:this.loop,muted:this.muted,...extra});}
  async load(loop,{sessionBpm}={}){
    const same=this.audio&&this.loop?.id===loop.id;
    if(!same){this.stop();this.audio=new Audio(loop.src);this.audio.preload='auto';this.audio.loop=true;this.audio.crossOrigin='anonymous';this.loop=loop;}
    setPreservePitch(this.audio);
    this.audio.playbackRate=clamp((Number(sessionBpm)||loop.nativeBpm)/loop.nativeBpm,.5,2);
    this.audio.muted=this.muted;
    return this.audio;
  }
  async play(loop,options={}){const audio=await this.load(loop,options);try{await audio.play();this.emit('playing');}catch(error){throw new Error('Drums could not start. Tap Play again to allow audio.');}return audio;}
  pause(){if(!this.audio)return;this.audio.pause();this.emit('paused');}
  resume(){return this.audio?.play().then(()=>this.emit('playing'));}
  setMuted(muted){this.muted=Boolean(muted);if(this.audio)this.audio.muted=this.muted;this.emit(this.muted?'muted':'unmuted');}
  stop(){if(!this.audio)return;this.audio.pause();this.audio.currentTime=0;this.audio.removeAttribute('src');this.audio.load();this.audio=null;this.loop=null;}
}
