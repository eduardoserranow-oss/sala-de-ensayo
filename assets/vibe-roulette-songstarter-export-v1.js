import {
  buildPhase5ArrangementDirection,
  applyPhase5FoundationArrangement
} from './vibe-roulette-arrangement-intelligence-v1.js';
import { buildSongStarterProducerPlan } from './vibe-roulette-songstarter-producer-v1.js';

export const SONG_STARTER_EXPORT_V1_INFO=Object.freeze({
  phase:6,
  version:'1.1.0-desktop-two-midi',
  name:'Song Starter Export',
  desktopOnly:true,
  mobileUi:false,
  files:Object.freeze(['01_Foundation_<S.K.Y.-Preset>.mid','02_Texture_<S.K.Y.-Preset>.mid']),
  midi:Object.freeze({
    format:0,
    ppq:480,
    bars:8,
    timeSignature:'4/4',
    preserves:Object.freeze(['pitch','velocity','duration','Human Pianist finger microtiming','A/A′ placement'])
  }),
  activeRoles:Object.freeze(['foundation','support']),
  hookDormant:true,
  drumsExported:false,
  audioExported:false,
  metadataFileExported:false,
  zipExported:false,
  rawReferenceAssetsEmbedded:false,
  principle:'Desktop export is exactly two DAW-ready MIDI files: Foundation and Texture. No drums, audio, ZIP or metadata file.'
});

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const enc=new TextEncoder();
const u16be=value=>[(value>>8)&255,value&255];
const u32be=value=>[(value>>>24)&255,(value>>>16)&255,(value>>8)&255,value&255];

function vlq(value){
  let v=Math.max(0,Math.round(Number(value)||0));
  let buffer=v&0x7f;
  const out=[];
  while((v>>=7)){buffer<<=8;buffer|=(v&0x7f)|0x80;}
  for(;;){out.push(buffer&0xff);if(buffer&0x80)buffer>>=8;else break;}
  return out;
}

function safeFilenamePart(value='Preset'){
  const out=String(value||'Preset').trim().replace(/\s+/g,'-').replace(/[^A-Za-z0-9_.#-]/g,'').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'');
  return out||'Preset';
}

function layerExportName(layer={}){
  const preset=safeFilenamePart(layer.preset||'Preset');
  return layer.role==='foundation'
    ? `01_Foundation_${preset}.mid`
    : `02_Texture_${preset}.mid`;
}

function trackLabel(layer={}){
  const role=layer.role==='foundation'?'Foundation':layer.role==='support'?'Texture':String(layer.role||'Layer');
  return `${role} — ${layer.preset||'Unknown preset'}`;
}

function metaBytes(type,text){
  const data=typeof text==='string'?enc.encode(text):Uint8Array.from(text||[]);
  return [0xff,type,...vlq(data.length),...data];
}

export function eventTimingTicks(event,{bpm=110,ppq=480,totalBeats=32}={}){
  const actualBpm=clamp(bpm,30,300);
  const fingerBeat=(Number(event?.fingerOffsetSeconds)||0)*actualBpm/60;
  const startBeat=clamp((Number(event?.startBeat)||0)+fingerBeat,0,totalBeats);
  const duration=Math.max(1/ppq,Number(event?.durationBeats)||0.2);
  const endBeat=clamp(startBeat+duration,startBeat+1/ppq,totalBeats);
  return {
    startBeat,
    endBeat,
    startTick:Math.round(startBeat*ppq),
    endTick:Math.max(Math.round(startBeat*ppq)+1,Math.round(endBeat*ppq))
  };
}

export function layerToMidiBytes(layer,{bpm=110,ppq=480,totalBeats=32}={}){
  const actualBpm=clamp(bpm,30,300);
  const events=[];
  events.push({tick:0,order:-40,data:metaBytes(0x03,trackLabel(layer))});
  const micros=Math.round(60000000/actualBpm);
  events.push({tick:0,order:-30,data:[0xff,0x51,0x03,(micros>>16)&255,(micros>>8)&255,micros&255]});
  events.push({tick:0,order:-20,data:[0xff,0x58,0x04,0x04,0x02,0x18,0x08]});
  events.push({tick:0,order:-10,data:metaBytes(0x06,'A · bars 1–4')});
  events.push({tick:16*ppq,order:-10,data:metaBytes(0x06,'A′ · bars 5–8')});

  for(const source of layer?.events||[]){
    const midi=clamp(Math.round(Number(source?.midi)||60),0,127);
    const velocity=clamp(Math.round(Number(source?.velocity)||64),1,127);
    const timing=eventTimingTicks(source,{bpm:actualBpm,ppq,totalBeats});
    events.push({tick:timing.startTick,order:2,data:[0x90,midi,velocity]});
    events.push({tick:timing.endTick,order:1,data:[0x80,midi,0]});
  }

  const endTick=Math.max(totalBeats*ppq,...events.map(event=>event.tick));
  events.push({tick:endTick,order:99,data:[0xff,0x2f,0x00]});
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  const track=[];
  let previous=0;
  for(const event of events){
    track.push(...vlq(event.tick-previous),...event.data);
    previous=event.tick;
  }
  const header=[0x4d,0x54,0x68,0x64,...u32be(6),...u16be(0),...u16be(1),...u16be(ppq)];
  const chunk=[0x4d,0x54,0x72,0x6b,...u32be(track.length),...track];
  return new Uint8Array([...header,...chunk]);
}

export function buildSongStarterMidiPair({plan}={}){
  if(!plan?.layers?.length)throw new Error('No Song Starter layers are available to export.');
  const layers=plan.layers.filter(layer=>layer?.active!==false&&['foundation','support'].includes(layer.role));
  const foundation=layers.find(layer=>layer.role==='foundation');
  const texture=layers.find(layer=>layer.role==='support');
  if(!foundation||!texture||layers.length!==2)throw new Error('Phase 6 requires exactly Foundation + Texture.');
  const bpm=Number(plan.bpm||110);
  const files=[foundation,texture].map(layer=>({
    role:layer.role==='foundation'?'foundation':'texture',
    preset:String(layer.preset||''),
    filename:layerExportName(layer),
    bytes:layerToMidiBytes(layer,{bpm})
  }));
  return {
    phase:6,
    version:SONG_STARTER_EXPORT_V1_INFO.version,
    bpm,
    files,
    drumsIncluded:false,
    audioIncluded:false,
    metadataIncluded:false,
    zipIncluded:false
  };
}

function readBodyEnergy(){
  const slider=typeof document!=='undefined'?document.getElementById('energySlider'):null;
  return slider?clamp(Number(slider.value)/100,0,1):null;
}

function starterSeed(result,bpm){
  return result?.id||result?.performancePattern?.variantSeed||result?.progressionId||`${result?.roman?.join('-')||'vibe'}|${bpm}`;
}

async function waitForSkyApi(timeoutMs=6500){
  const start=Date.now();
  while(Date.now()-start<timeoutMs){
    const api=window.__FORTISSIMO_SKYKEYS_PHASE5__;
    const state=api?.getState?.();
    if(api&&state?.ready&&state?.webPack?.runtime?.status!=='loading')return api;
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  return window.__FORTISSIMO_SKYKEYS_PHASE5__||null;
}

export async function buildCurrentSongStarterMidiPair(){
  if(typeof window==='undefined')throw new Error('Current-session export is available in the browser only.');
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__;
  const arrangement=window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__;
  if(!result||!arrangement)throw new Error('Spin a writing direction before exporting the Song Starter.');

  const energy=readBodyEnergy()??Number(result?.intent?.energyTarget??0.65);
  const bpm=Number(arrangement.bpm)||Number(document.getElementById('energyValue')?.textContent?.match(/(\d+)\s*BPM/i)?.[1])||110;
  const mood=result.mood||'connection';
  const emotionFilters=result.emotionFilters||arrangement.emotionFilters||[];
  const performancePattern=result.performancePattern||arrangement.performancePattern||null;
  const performanceSeed=performancePattern?.variantSeed||arrangement?.firstPass?.roman?.join('-')||'phase6-export';

  const sky=await waitForSkyApi();
  let decision=null;
  if(sky?.decide){
    try{decision=sky.decide(result,{arrangement,energyTarget:energy,bpm,emotionFilters});}catch(_){decision=null;}
  }
  const skyState=sky?.getState?.()||null;
  const foundationPreset=decision?.preset?.name||skyState?.lastDecision?.preset||skyState?.audioState?.preset||skyState?.idealDecision?.preset||null;
  if(!foundationPreset)throw new Error('S.K.Y. Keys is still preparing the Foundation preset. Try Export Song Starter again in a moment.');

  // Dynamic import keeps Phase 6 cycle-safe while preserving the exact current pianist performance.
  const {buildSeamlessEightBarPerformance}=await import('./vibe-roulette-seamless-loop-v1.js');
  const base=buildSeamlessEightBarPerformance(arrangement,{bpm,energyTarget:energy,mood,emotionFilters,performancePattern,performanceSeed});
  const direction=buildPhase5ArrangementDirection(arrangement,{energyTarget:energy,mood,emotionFilters,seed:performanceSeed});
  const foundation=applyPhase5FoundationArrangement(base,direction);
  const plan=buildSongStarterProducerPlan(arrangement,{
    foundationPerformance:foundation,
    foundationPreset,
    bpm,
    energyTarget:energy,
    emotionFilters,
    mood,
    seed:starterSeed(result,bpm)
  });
  return buildSongStarterMidiPair({plan});
}

function downloadMidiFile(file){
  const blob=new Blob([file.bytes],{type:'audio/midi'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=file.filename;
  link.style.display='none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1800);
}

async function deliverMidiPair(pair){
  if(!pair?.files||pair.files.length!==2)throw new Error('The Song Starter export must contain exactly two MIDI files.');
  downloadMidiFile(pair.files[0]);
  await new Promise(resolve=>setTimeout(resolve,180));
  downloadMidiFile(pair.files[1]);
  return 'two-midi-downloads';
}

export function isDesktopExportSurface(){
  if(typeof window==='undefined')return false;
  if(typeof window.matchMedia==='function')return window.matchMedia('(min-width: 900px) and (any-pointer: fine)').matches;
  return Number(window.innerWidth||0)>=900&&!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
}

function installStyles(){
  if(document.getElementById('vr-phase6-export-style'))return;
  const style=document.createElement('style');
  style.id='vr-phase6-export-style';
  style.textContent=`
    .vr-phase6-export{margin-top:10px;display:grid;gap:6px}.vr-phase6-export-btn{width:100%;min-height:46px;border:1px solid rgba(255,107,20,.55);border-radius:14px;background:rgba(255,107,20,.08);color:#ff995d;font:850 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.035em}.vr-phase6-export-btn:disabled{opacity:.38}.vr-phase6-export-note{color:rgba(255,255,255,.42);font-size:10px;line-height:1.35;text-align:center}.vr-phase6-export.is-ready .vr-phase6-export-note{color:rgba(255,255,255,.55)}
    @media(max-width:899px),(any-pointer:coarse){.vr-phase6-export{display:none!important}}
  `;
  document.head.appendChild(style);
}

function showUiError(message){
  const box=document.getElementById('errorBox');if(!box)return;
  box.textContent=message||'';box.classList.toggle('show',Boolean(message));
}

function syncExportButton(){
  const wrap=document.getElementById('vrPhase6Export');
  const button=document.getElementById('vrSongStarterExportBtn');
  if(!wrap||!button)return;
  if(!isDesktopExportSurface()){wrap.remove();return;}
  const ready=Boolean(window.__FORTISSIMO_VIBE_LAST_RESULT__&&window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__);
  button.disabled=!ready;
  wrap.classList.toggle('is-ready',ready);
}

function installExportUi(){
  if(typeof document==='undefined'||!isDesktopExportSurface()||document.getElementById('vrPhase6Export'))return;
  installStyles();
  const utility=document.querySelector('.utility-row');if(!utility)return;
  const wrap=document.createElement('div');
  wrap.id='vrPhase6Export';
  wrap.className='vr-phase6-export';
  wrap.innerHTML='<button type="button" class="vr-phase6-export-btn" id="vrSongStarterExportBtn" disabled>⇩ Export 2 MIDI</button><div class="vr-phase6-export-note">Desktop only · Foundation MIDI + Texture MIDI</div>';
  utility.insertAdjacentElement('afterend',wrap);
  const button=wrap.querySelector('#vrSongStarterExportBtn');
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    const original='⇩ Export 2 MIDI';
    try{
      showUiError('');
      button.disabled=true;
      button.textContent='Preparing 2 MIDI…';
      const pair=await buildCurrentSongStarterMidiPair();
      button.textContent='Downloading Foundation + Texture…';
      await deliverMidiPair(pair);
      button.textContent='✓ 2 MIDI exported';
      setTimeout(()=>{button.textContent=original;syncExportButton();},1500);
    }catch(error){
      showUiError(error?.message||String(error));
      button.textContent=original;
      syncExportButton();
    }
  });
  window.addEventListener('fortissimo:vibe-arrangement-updated',syncExportButton);
  const key=document.getElementById('resultKey');
  if(key)new MutationObserver(syncExportButton).observe(key,{childList:true,subtree:true,characterData:true});
  syncExportButton();
}

if(typeof document!=='undefined'){
  const install=()=>{
    if(!isDesktopExportSurface())return;
    if(document.querySelector('.utility-row'))installExportUi();
    else setTimeout(install,120);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('resize',()=>{if(isDesktopExportSurface())installExportUi();else document.getElementById('vrPhase6Export')?.remove();},{passive:true});
}

if(typeof window!=='undefined')window.__FORTISSIMO_SONGSTARTER_EXPORT_V1__={
  info:SONG_STARTER_EXPORT_V1_INFO,
  buildCurrent:buildCurrentSongStarterMidiPair
};
