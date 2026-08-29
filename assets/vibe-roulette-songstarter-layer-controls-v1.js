import { SeamlessEightBarLoopTransport } from './vibe-roulette-seamless-loop-v1.js';
import { getSkyKeysPhase5State } from './vibe-roulette-skykeys-phase5-integration-v1.js';

export const SONG_STARTER_LAYER_CONTROLS_V1_INFO=Object.freeze({
  version:'1.1-two-layer',phase:4.2,
  roles:['support'],
  labels:{support:'M2'},
  behavior:'session mute for the Texture layer; preserve composition and resume at current transport position',
  hookControlRemoved:true,
  drumsUntouched:true,foundationUntouched:true
});

const muted={support:false};
let activeTransport=null;
let reprimePending=false;

function selectedPreset(){
  try{
    const state=getSkyKeysPhase5State();
    const plan=state?.songStarter?.plan;
    return plan?.layers?.find(layer=>layer.role==='support')?.preset||null;
  }catch{return null;}
}
function buttonLabel(){return `M2 · ${selectedPreset()||'Texture'}`;}
function updateButton(){
  if(typeof document==='undefined')return;
  const button=document.querySelector('[data-songstarter-mute="support"]');if(!button)return;
  const isMuted=Boolean(muted.support);button.textContent=`${buttonLabel()}${isMuted?' · MUTED':''}`;
  button.setAttribute('aria-pressed',String(isMuted));button.dataset.muted=String(isMuted);
  button.title=`${isMuted?'Unmute':'Mute'} Support / Texture layer without changing the Song Starter`;
  button.style.opacity=isMuted?'.56':'1';
  button.style.borderColor=isMuted?'rgba(255,255,255,.22)':'rgba(255,107,20,.55)';
}
function ensureControls(){
  if(typeof document==='undefined')return null;
  const loopPanel=document.querySelector('.loop-panel');if(!loopPanel)return null;
  let wrap=document.getElementById('songStarterLayerMutes');
  if(!wrap){
    wrap=document.createElement('div');wrap.id='songStarterLayerMutes';wrap.className='songstarter-layer-mutes';
    wrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;';
    const button=document.createElement('button');button.type='button';button.className='utility-btn songstarter-layer-mute';button.dataset.songstarterMute='support';
    button.style.cssText='min-height:38px;padding:8px 11px;border:1px solid rgba(255,107,20,.55);border-radius:999px;background:rgba(255,255,255,.025);color:inherit;font:inherit;font-size:.78rem;';
    button.addEventListener('click',()=>setSongStarterLayerMuted('support',!muted.support));wrap.appendChild(button);
    const status=loopPanel.querySelector('.loop-status');if(status)status.insertAdjacentElement('beforebegin',wrap);else loopPanel.appendChild(wrap);
  }else{
    for(const stale of wrap.querySelectorAll('[data-songstarter-mute="hook"]'))stale.remove();
  }
  updateButton();return wrap;
}
async function reprimeCurrentPosition(){
  if(reprimePending||!activeTransport?.running)return;
  reprimePending=true;
  try{
    activeTransport.pause();
    await activeTransport.resume();
  }catch(error){console.warn('Song Starter layer mute reprime failed',error);}
  finally{reprimePending=false;}
}
export function setSongStarterLayerMuted(role,value,{reprime=true}={}){
  if(role!=='support')throw new Error(`Unsupported active Song Starter mute role: ${role}`);
  muted.support=Boolean(value);updateButton();
  if(reprime)void reprimeCurrentPosition();
  return getSongStarterLayerMuteState();
}
export function toggleSongStarterLayer(role='support'){return setSongStarterLayerMuted(role,!muted.support);}
export function getSongStarterLayerMuteState(){return {support:muted.support};}

const proto=SeamlessEightBarLoopTransport.prototype;
const originalStart=proto.start;
if(originalStart&&!originalStart.__songStarterLayerControlsPatched){
  const patched=async function(...args){activeTransport=this;const result=await originalStart.apply(this,args);updateButton();return result;};
  patched.__songStarterLayerControlsPatched=true;proto.start=patched;
}
const originalResume=proto.resume;
if(originalResume&&!originalResume.__songStarterLayerControlsPatched){
  const patched=async function(...args){activeTransport=this;const result=await originalResume.apply(this,args);updateButton();return result;};
  patched.__songStarterLayerControlsPatched=true;proto.resume=patched;
}
const originalScheduleCycle=proto.scheduleCycle;
if(originalScheduleCycle&&!originalScheduleCycle.__songStarterLayerControlsPatched){
  const patched=function(...args){
    activeTransport=this;
    const originalLayers=this.__songStarterPhase4Layers;
    if(!Array.isArray(originalLayers)||!originalLayers.length)return originalScheduleCycle.apply(this,args);
    this.__songStarterPhase4Layers=originalLayers.filter(layer=>layer.role==='foundation'||layer.role!=='support'||!muted.support);
    try{return originalScheduleCycle.apply(this,args);}finally{this.__songStarterPhase4Layers=originalLayers;}
  };
  patched.__songStarterLayerControlsPatched=true;proto.scheduleCycle=patched;
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControls,{once:true});else ensureControls();
  const observer=new MutationObserver(()=>updateButton());
  const observe=()=>{const badge=document.getElementById('skykeysSoundDirectionStatus');if(badge)observer.observe(badge,{subtree:true,childList:true,characterData:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
}
if(typeof window!=='undefined')window.__FORTISSIMO_SONGSTARTER_LAYER_CONTROLS__={
  getState:getSongStarterLayerMuteState,setMuted:setSongStarterLayerMuted,toggle:toggleSongStarterLayer,ensureControls
};

export const SONG_STARTER_LAYER_MUTE_CONTRACT={
  foundation:'never muted by M2',
  support:'M2 controls Support/Texture only',
  hook:'dormant in Phase 4.2; there is no active M3 control',
  transport:'mute/unmute preserves the current transport position instead of restarting the composition',
  composition:'mute state never deletes or regenerates MIDI events',
  drums:'existing drum mute remains separate and untouched'
};
