import { buildSeamlessEightBarPerformance } from './vibe-roulette-seamless-loop-v1.js';
import {
  buildPhase5ArrangementDirection,
  applyPhase5FoundationArrangement
} from './vibe-roulette-arrangement-intelligence-v1.js';
import { buildSongStarterProducerPlan } from './vibe-roulette-songstarter-producer-v1.js';

export const SONG_STARTER_EXPORT_V1_INFO=Object.freeze({
  phase:6,
  version:'1.0.0',
  name:'Song Starter Export',
  archive:'ZIP (store method, no external dependency)',
  files:Object.freeze(['01_Foundation_<S.K.Y.-Preset>.mid','02_Support_<S.K.Y.-Preset>.mid','starter-info.json']),
  midi:Object.freeze({format:0,ppq:480,bars:8,timeSignature:'4/4',preserves:Object.freeze(['pitch','velocity','duration','Human Pianist finger microtiming','A/A′ placement'])}),
  activeRoles:Object.freeze(['foundation','support']),
  hookDormant:true,
  drumsAudioExported:false,
  rawReferenceAssetsEmbedded:false,
  principle:'Export the exact current two-layer Song Starter as DAW-ready MIDI plus truthful preset/session metadata without changing composition or playback.'
});

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const enc=new TextEncoder();
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const u16be=value=>[(value>>8)&255,value&255];
const u32be=value=>[(value>>>24)&255,(value>>>16)&255,(value>>8)&255,value&255];
const u16le=value=>[value&255,(value>>8)&255];
const u32le=value=>[value&255,(value>>8)&255,(value>>>16)&255,(value>>>24)&255];

function vlq(value){
  let v=Math.max(0,Math.round(Number(value)||0));
  let buffer=v&0x7f;
  const out=[];
  while((v>>=7)){buffer<<=8;buffer|=(v&0x7f)|0x80;}
  for(;;){out.push(buffer&0xff);if(buffer&0x80)buffer>>=8;else break;}
  return out;
}

function safeFilenamePart(value='Song-Starter'){
  const out=String(value||'Song-Starter').trim().replace(/\s+/g,'-').replace(/[^A-Za-z0-9_.#-]/g,'').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'');
  return out||'Song-Starter';
}

function trackLabel(layer={}){
  const role=layer.role==='foundation'?'Foundation':layer.role==='support'?'Support/Texture':String(layer.role||'Layer');
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
  const trackName=trackLabel(layer);
  events.push({tick:0,order:-40,data:metaBytes(0x03,trackName)});
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

let crcTable=null;
function getCrcTable(){
  if(crcTable)return crcTable;
  crcTable=new Uint32Array(256);
  for(let n=0;n<256;n+=1){
    let c=n;
    for(let k=0;k<8;k+=1)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    crcTable[n]=c>>>0;
  }
  return crcTable;
}

export function crc32(bytes){
  const table=getCrcTable();
  let crc=0xffffffff;
  for(const byte of bytes)crc=table[(crc^byte)&0xff]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

function asBytes(value){return typeof value==='string'?enc.encode(value):value instanceof Uint8Array?value:new Uint8Array(value||[]);}

export function buildStoredZip(entries=[]){
  const locals=[];
  const centrals=[];
  let offset=0;
  for(const entry of entries){
    const name=enc.encode(String(entry.name));
    const data=asBytes(entry.data);
    const crc=crc32(data);
    const flags=0x0800;
    const local=new Uint8Array([
      ...u32le(0x04034b50),...u16le(20),...u16le(flags),...u16le(0),...u16le(0),...u16le(0),
      ...u32le(crc),...u32le(data.length),...u32le(data.length),...u16le(name.length),...u16le(0),...name,...data
    ]);
    const central=new Uint8Array([
      ...u32le(0x02014b50),...u16le(20),...u16le(20),...u16le(flags),...u16le(0),...u16le(0),...u16le(0),
      ...u32le(crc),...u32le(data.length),...u32le(data.length),...u16le(name.length),...u16le(0),...u16le(0),
      ...u16le(0),...u16le(0),...u32le(0),...u32le(offset),...name
    ]);
    locals.push(local);centrals.push(central);offset+=local.length;
  }
  const centralOffset=offset;
  const centralSize=centrals.reduce((sum,item)=>sum+item.length,0);
  const end=new Uint8Array([
    ...u32le(0x06054b50),...u16le(0),...u16le(0),...u16le(entries.length),...u16le(entries.length),
    ...u32le(centralSize),...u32le(centralOffset),...u16le(0)
  ]);
  const total=centralOffset+centralSize+end.length;
  const out=new Uint8Array(total);
  let cursor=0;
  for(const part of [...locals,...centrals,end]){out.set(part,cursor);cursor+=part.length;}
  return out;
}

function normalizedLayerFilename(layer,index){
  if(layer?.export?.filename)return layer.export.filename;
  const role=layer?.role==='foundation'?'Foundation':'Support';
  return `${String(index+1).padStart(2,'0')}_${role}_${safeFilenamePart(layer?.preset||'Preset')}.mid`;
}

export function buildStarterMetadata({plan,result,arrangement,title='',drum=null,exportedAt=null}={}){
  if(!plan?.layers?.length)throw new Error('A Song Starter plan is required for metadata export.');
  const active=plan.layers.filter(layer=>layer?.active!==false&&['foundation','support'].includes(layer.role));
  return {
    format:'FORTISSIMO Song Starter',
    exportVersion:SONG_STARTER_EXPORT_V1_INFO.version,
    phase:6,
    exportedAt:exportedAt||new Date().toISOString(),
    title:String(title||''),
    session:{
      bpm:Number(plan.bpm||arrangement?.bpm||110),timeSignature:'4/4',bars:8,totalBeats:32,
      bodyEnergy:Number(plan.energy??result?.intent?.energyTarget??0),
      key:result?.key||'',mode:result?.mode||'',mood:result?.mood||plan.mood||'',
      emotionalTerritory:result?.storyProfile?.primaryTerritory||result?.mood||plan.mood||'',
      emotionFilters:[...(result?.emotionFilters||plan.emotionFilters||[])]
    },
    harmony:{
      firstPass:{label:'A',roman:[...(arrangement?.firstPass?.roman||[])],chords:[...(arrangement?.firstPass?.chords||[])]},
      secondPass:{label:'A′',roman:[...(arrangement?.secondPass?.roman||[])],chords:[...(arrangement?.secondPass?.chords||[])],strategy:arrangement?.secondPass?.strategy||''},
      userEdit:clone(result?.userEdit||null)
    },
    arrangementIntelligence:{
      phase:5,
      version:plan.arrangementIntelligence?.version||null,
      archetype:plan.arrangementIntelligence?.archetype||null,
      principle:'A states. A′ remembers, evolves and returns.'
    },
    layers:active.map((layer,index)=>({
      role:layer.role,
      player:layer.player||'',
      preset:layer.preset||'',
      midiFile:normalizedLayerFilename(layer,index),
      eventCount:(layer.events||[]).length,
      gainScale:Number(layer.gainScale??1)
    })),
    drums:drum?clone(drum):null,
    dawImport:{
      start:'Bar 1 · Beat 1',
      tempo:Number(plan.bpm||arrangement?.bpm||110),
      instructions:[
        'Set the DAW session to the exported BPM and 4/4.',
        'Place both MIDI files at Bar 1 Beat 1 without quantizing or humanizing them again.',
        'Load the exact S.K.Y. Keys preset named in each MIDI filename and in layers[].preset.',
        'Foundation and Support/Texture are separate parts and should remain aligned on the same 8-bar grid.',
        'The Afro drum audio is not included in this ZIP; starter-info.json records the drum context when available.'
      ]
    },
    contract:{
      foundationAndTextureOnly:true,
      hookDormant:true,
      exactSelectedHarmony:true,
      userEditedChordsPreserved:true,
      humanPianistMicrotimingPreserved:true,
      velocitiesPreserved:true,
      separateMidiPerLayer:true,
      rawReferenceAssetsEmbedded:false
    }
  };
}

export function buildSongStarterArchive({plan,result,arrangement,title='',drum=null,exportedAt=null}={}){
  if(!plan?.layers?.length)throw new Error('No Song Starter layers are available to export.');
  const layers=plan.layers.filter(layer=>layer?.active!==false&&['foundation','support'].includes(layer.role));
  if(layers.length!==2)throw new Error('Phase 6 requires exactly Foundation + Support/Texture.');
  const bpm=Number(plan.bpm||arrangement?.bpm||110);
  const metadata=buildStarterMetadata({plan,result,arrangement,title,drum,exportedAt});
  const entries=layers.map((layer,index)=>({name:normalizedLayerFilename(layer,index),data:layerToMidiBytes(layer,{bpm})}));
  entries.push({name:'starter-info.json',data:JSON.stringify(metadata,null,2)});
  const base=safeFilenamePart(title||'Song-Starter');
  const key=safeFilenamePart(`${result?.key||'Key'}-${result?.mode||'mode'}`);
  const filename=`FORTISSIMO_${base}_${key}_${Math.round(bpm)}BPM.zip`;
  return {filename,bytes:buildStoredZip(entries),entries:entries.map(entry=>entry.name),metadata};
}

function readBodyEnergy(){
  const slider=typeof document!=='undefined'?document.getElementById('energySlider'):null;
  return slider?clamp(Number(slider.value)/100,0,1):null;
}

function currentDrumMetadata(bpm){
  if(typeof window==='undefined'||typeof document==='undefined')return null;
  const transport=window.__FORTISSIMO_VIBE_TRANSPORT__;
  const source=transport?.drum||null;
  const filename=document.getElementById('drumFilename')?.textContent?.trim()||source?.originalName||'';
  if(!filename&&!source)return null;
  const sourceBpm=Number(source?.bpm)||Number((document.getElementById('drumMeta')?.textContent||'').match(/Original\s+(\d+)/i)?.[1])||null;
  const actualBpm=Number(bpm)||Number(transport?.performance?.bpm)||null;
  const percent=sourceBpm&&actualBpm?(actualBpm/sourceBpm-1)*100:null;
  return {
    id:source?.id||null,
    originalName:filename||null,
    originalBpm:sourceBpm,
    sessionBpm:actualBpm,
    bars:Number(source?.bars)||null,
    pocket:source?.pocket||null,
    territory:source?.territory||null,
    timeStretchPercent:percent==null?null:Number(percent.toFixed(3)),
    audioIncluded:false
  };
}

function starterSeed(result,bpm){return result?.id||result?.performancePattern?.variantSeed||result?.progressionId||`${result?.roman?.join('-')||'vibe'}|${bpm}`;}

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

export async function buildCurrentSongStarterArchive(){
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

  const base=buildSeamlessEightBarPerformance(arrangement,{bpm,energyTarget:energy,mood,emotionFilters,performancePattern,performanceSeed});
  const direction=buildPhase5ArrangementDirection(arrangement,{energyTarget:energy,mood,emotionFilters,seed:performanceSeed});
  const foundation=applyPhase5FoundationArrangement(base,direction);
  const plan=buildSongStarterProducerPlan(arrangement,{
    foundationPerformance:foundation,
    foundationPreset,
    bpm,energyTarget:energy,emotionFilters,mood,
    seed:starterSeed(result,bpm)
  });
  const title=document.getElementById('workingTitle')?.value?.trim()||'';
  return buildSongStarterArchive({plan,result,arrangement,title,drum:currentDrumMetadata(bpm)});
}

async function deliverArchive(archive){
  const file=new File([archive.bytes],archive.filename,{type:'application/zip'});
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
  if(isiOS&&navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file],title:'FORTISSIMO Song Starter'});
    return 'share-sheet';
  }
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;link.download=archive.filename;link.style.display='none';document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return 'download';
}

function installStyles(){
  if(document.getElementById('vr-phase6-export-style'))return;
  const style=document.createElement('style');style.id='vr-phase6-export-style';style.textContent=`
    .vr-phase6-export{margin-top:10px;display:grid;gap:6px}.vr-phase6-export-btn{width:100%;min-height:46px;border:1px solid rgba(255,107,20,.55);border-radius:14px;background:rgba(255,107,20,.08);color:#ff995d;font:850 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.035em;touch-action:manipulation}.vr-phase6-export-btn:disabled{opacity:.38}.vr-phase6-export-note{color:rgba(255,255,255,.42);font-size:10px;line-height:1.35;text-align:center}.vr-phase6-export.is-ready .vr-phase6-export-note{color:rgba(255,255,255,.55)}
  `;document.head.appendChild(style);
}

function showUiError(message){
  const box=document.getElementById('errorBox');if(!box)return;
  box.textContent=message||'';box.classList.toggle('show',Boolean(message));
}

function syncExportButton(){
  const wrap=document.getElementById('vrPhase6Export');const button=document.getElementById('vrSongStarterExportBtn');if(!wrap||!button)return;
  const ready=Boolean(window.__FORTISSIMO_VIBE_LAST_RESULT__&&window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__);
  button.disabled=!ready;wrap.classList.toggle('is-ready',ready);
}

function installExportUi(){
  if(typeof document==='undefined'||document.getElementById('vrPhase6Export'))return;
  installStyles();
  const utility=document.querySelector('.utility-row');if(!utility)return;
  const wrap=document.createElement('div');wrap.id='vrPhase6Export';wrap.className='vr-phase6-export';
  wrap.innerHTML='<button type="button" class="vr-phase6-export-btn" id="vrSongStarterExportBtn" disabled>⇩ Export Song Starter</button><div class="vr-phase6-export-note">ZIP · Foundation MIDI + Texture MIDI + starter-info.json</div>';
  utility.insertAdjacentElement('afterend',wrap);
  const button=wrap.querySelector('#vrSongStarterExportBtn');
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    const original='⇩ Export Song Starter';
    try{
      showUiError('');button.disabled=true;button.textContent='Preparing Song Starter…';
      const archive=await buildCurrentSongStarterArchive();
      button.textContent='Opening export…';
      await deliverArchive(archive);
      button.textContent='✓ Song Starter exported';
      setTimeout(()=>{button.textContent=original;syncExportButton();},1500);
    }catch(error){
      if(error?.name!=='AbortError')showUiError(error?.message||String(error));
      button.textContent=original;syncExportButton();
    }
  });
  window.addEventListener('fortissimo:vibe-arrangement-updated',syncExportButton);
  const key=document.getElementById('resultKey');if(key)new MutationObserver(syncExportButton).observe(key,{childList:true,subtree:true,characterData:true});
  syncExportButton();
}

if(typeof document!=='undefined'){
  const install=()=>{if(document.querySelector('.utility-row'))installExportUi();else setTimeout(install,120);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}

if(typeof window!=='undefined')window.__FORTISSIMO_SONGSTARTER_EXPORT_V1__={
  info:SONG_STARTER_EXPORT_V1_INFO,
  buildCurrent:buildCurrentSongStarterArchive
};
