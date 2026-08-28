import { AFRO_DRUM_LOOPS } from './vibe-roulette-afro-drums-catalog-v1.js';
import { drumTasteWeight } from './vibe-roulette-taste-training-v1.js';

const ROTATION_KEY='fortissimo.vibeRoulette.drumRotation.v1';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const territoryLabel={
  illusion:'Ilusión',nostalgia:'Nostalgia',connection:'Conexión',
  desire:'Conexión',introspection:'Nostalgia',calm:'Conexión',liberation:'Ilusión'
};
const densityValue={'sparse':1,'medium':2,'dense':3,'very-dense':4};
const filterTags={
  joy:['joy'],hope:['joy'],enthusiasm:['joy','danceable'],euphoria:['party','joy','danceable'],strength:['joy','danceable'],curiosity:['introspection','joy'],optimism:['joy'],
  calm:['calm'],security:['calm'],gratitude:['calm','joy'],fulfillment:['calm','joy'],acceptance:['calm'],serenity:['calm'],
  sensual:['sensual'],desire:['sensual'],intimacy:['sensual','calm'],tenderness:['sensual','calm'],
  sadness:['sadness'],melancholy:['sadness'],vulnerability:['sadness','introspection'],abandonment:['sadness'],grief:['sadness'],
  anxiety:['introspection','sadness'],insecurity:['introspection','sadness'],confusion:['introspection'],worry:['introspection','sadness'],disillusion:['sadness'],
  frustration:['sadness','danceable'],resentment:['sadness'],jealousy:['sensual','sadness'],introspection:['introspection'],release:['joy','calm','danceable']
};
const decodedCache=new Map();
const stretchedCache=new Map();

function loadRecent(){if(typeof localStorage==='undefined')return[];try{const x=JSON.parse(localStorage.getItem(ROTATION_KEY)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
function saveRecent(value){if(typeof localStorage!=='undefined'){try{localStorage.setItem(ROTATION_KEY,JSON.stringify(value.slice(0,8)));}catch(_){}}}
function weightedPick(items,scoreFn,random=Math.random){const weights=items.map(item=>Math.max(0.001,scoreFn(item)));const total=weights.reduce((a,b)=>a+b,0);let cursor=random()*total;for(let i=0;i<items.length;i++){cursor-=weights[i];if(cursor<=0)return items[i];}return items.at(-1);}

export function drumStretchInfo(drum,sessionBpm){
  const source=Number(drum?.bpm)||100;const target=Number(sessionBpm)||source;
  const playbackTempoRatio=target/source;const durationRatio=source/target;const percent=(playbackTempoRatio-1)*100;const abs=Math.abs(percent);
  return {sourceBpm:source,sessionBpm:target,playbackTempoRatio,durationRatio,percent,level:abs<0.5?'Native':abs<=3?'Very light':abs<=7?'Light':abs<=12?'Moderate':'Strong'};
}

export class AfroDrumSelector{
  constructor({loops=AFRO_DRUM_LOOPS,random=Math.random}={}){this.loops=loops;this.random=random;this.recent=loadRecent();}
  score(loop,context={}){
    const bpm=Number(context.bpm)||110;const diff=Math.abs(loop.bpm-bpm);let score=1;
    score*=diff<=3?2.25:diff<=6?1.72:diff<=10?1.30:1;
    const requestedTerritory=territoryLabel[context.mood]||context.territory||'';
    if(requestedTerritory&&loop.territory===requestedTerritory)score*=1.34;
    else if(requestedTerritory==='Conexión'&&['Nostalgia','Ilusión'].includes(loop.territory))score*=1.06;
    const targetBody=1+4*clamp(Number(context.energyTarget)||0,0,1);
    score*=clamp(1.42-Math.abs(loop.bodyEnergy-targetBody)*0.16,0.72,1.42);
    const targetDensity=clamp(Math.round(1+3*(Number(context.energyTarget)||0)),1,4);
    score*=clamp(1.17-Math.abs((densityValue[loop.density]||2)-targetDensity)*0.045,0.90,1.17);
    for(const filter of context.emotionFilters||[]){const tags=filterTags[filter]||[filter];if(tags.some(tag=>loop.emotionTags.includes(tag)))score*=1.105;}
    if(loop.pocket.includes('laid-back')&&(context.emotionFilters||[]).some(id=>['calm','sadness','sensual','introspection','melancholy','vulnerability','acceptance','serenity','tenderness'].includes(id)))score*=1.10;
    if((loop.pocket.includes('driving')||loop.pocket.includes('busy'))&&(context.emotionFilters||[]).some(id=>['joy','enthusiasm','euphoria','strength','optimism','release'].includes(id)))score*=1.10;
    const recentIndex=this.recent.indexOf(loop.id);if(recentIndex===0)score*=0.12;else if(recentIndex===1)score*=0.38;
    score*=drumTasteWeight(loop,context);
    return score;
  }
  candidatePool(context={},excludeId=null){
    const bpm=Number(context.bpm)||110;const available=this.loops.filter(loop=>loop.id!==excludeId);if(!available.length)return[];
    for(const ceiling of [3,6,10]){const band=available.filter(loop=>Math.abs(loop.bpm-bpm)<=ceiling);if(band.length)return band;}
    const nearest=Math.min(...available.map(loop=>Math.abs(loop.bpm-bpm)));
    return available.filter(loop=>Math.abs(loop.bpm-bpm)===nearest);
  }
  select(context={},excludeId=null){
    const pool=this.candidatePool(context,excludeId);if(!pool.length)return null;
    const ranked=[...pool].sort((a,b)=>this.score(b,context)-this.score(a,context));
    const exploration=this.random()<0.18;
    const choice=exploration?ranked[Math.floor(this.random()*Math.min(8,ranked.length))]:weightedPick(ranked.slice(0,Math.min(10,ranked.length)),item=>this.score(item,context),this.random);
    return choice||ranked[0];
  }
  markUsed(loop){if(!loop)return;this.recent=[loop.id,...this.recent.filter(id=>id!==loop.id)].slice(0,8);saveRecent(this.recent);}
  next(context={},currentId=null){return this.select(context,currentId);}
}

function decodeAudio(ctx,arrayBuffer){return new Promise((resolve,reject)=>{const copy=arrayBuffer.slice(0);const result=ctx.decodeAudioData(copy,resolve,reject);if(result?.then)result.then(resolve).catch(reject);});}
export async function loadOriginalDrumBuffer(ctx,drum){
  if(decodedCache.has(drum.id))return decodedCache.get(drum.id);
  const response=await fetch(drum.webPath,{cache:'force-cache'});if(!response.ok)throw new Error(`Drum audio is not available yet: ${drum.originalName}`);
  const buffer=await decodeAudio(ctx,await response.arrayBuffer());decodedCache.set(drum.id,buffer);return buffer;
}

function buildEightBarSource(ctx,decoded,drum){
  const sampleRate=decoded.sampleRate;const oneBeat=60/drum.bpm;const onePassSeconds=(drum.bars===4?16:32)*oneBeat;const sourceFrames=Math.min(decoded.length,Math.round(onePassSeconds*sampleRate));
  const cycleFrames=Math.round(32*oneBeat*sampleRate);const output=ctx.createBuffer(decoded.numberOfChannels,cycleFrames,sampleRate);
  for(let ch=0;ch<decoded.numberOfChannels;ch++){
    const input=decoded.getChannelData(ch);const out=output.getChannelData(ch);const first=input.subarray(0,sourceFrames);out.set(first.subarray(0,Math.min(first.length,out.length)),0);
    if(drum.bars===4){const offset=Math.min(sourceFrames,out.length);out.set(first.subarray(0,Math.min(first.length,out.length-offset)),offset);}
  }
  return output;
}

function makeSeamless(buffer,ms=10){
  const frames=Math.min(Math.floor(buffer.sampleRate*ms/1000),Math.floor(buffer.length/8));if(frames<2)return buffer;
  for(let ch=0;ch<buffer.numberOfChannels;ch++){
    const data=buffer.getChannelData(ch);for(let i=0;i<frames;i++){const j=data.length-1-i;const w=1-i/frames;const avg=(data[i]+data[j])*0.5;data[i]=data[i]*(1-w)+avg*w;data[j]=data[j]*(1-w)+avg*w;}
  }
  return buffer;
}

export async function renderPitchPreservedDrumBuffer(ctx,drum,sessionBpm){
  const bpm=Math.round(Number(sessionBpm)||drum.bpm);const cacheKey=`${drum.id}|${bpm}`;if(stretchedCache.has(cacheKey))return stretchedCache.get(cacheKey);
  const decoded=await loadOriginalDrumBuffer(ctx,drum);const sourceCycle=buildEightBarSource(ctx,decoded,drum);const targetSeconds=32*60/bpm;
  if(Math.abs(bpm-drum.bpm)<0.01){stretchedCache.set(cacheKey,sourceCycle);return sourceCycle;}
  const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw new Error('Pitch-preserving drum stretch is not supported by this browser.');
  const sampleRate=sourceCycle.sampleRate;const targetFrames=Math.max(1,Math.round(targetSeconds*sampleRate));const offline=new Offline(sourceCycle.numberOfChannels,targetFrames,sampleRate);
  const grainSeconds=0.12;const analysisHop=0.055;const durationRatio=drum.bpm/bpm;const synthesisHop=analysisHop*durationRatio;const peak=clamp(0.82*Math.sqrt(synthesisHop/analysisHop),0.62,0.90);
  for(let inputTime=0,outputTime=0;inputTime<sourceCycle.duration&&outputTime<targetSeconds;inputTime+=analysisHop,outputTime+=synthesisHop){
    const duration=Math.min(grainSeconds,sourceCycle.duration-inputTime,targetSeconds-outputTime);if(duration<=0.012)continue;
    const src=offline.createBufferSource();src.buffer=sourceCycle;const gain=offline.createGain();const half=duration*0.5;
    gain.gain.setValueAtTime(0.0001,outputTime);gain.gain.linearRampToValueAtTime(peak,outputTime+half);gain.gain.linearRampToValueAtTime(0.0001,outputTime+duration);
    src.connect(gain);gain.connect(offline.destination);src.start(outputTime,inputTime,duration);
  }
  const rendered=makeSeamless(await offline.startRendering(),10);stretchedCache.set(cacheKey,rendered);return rendered;
}

export function clearDrumStretchCache(){stretchedCache.clear();}
export const AFRO_DRUM_ENGINE_INFO={version:1,tempoWindow:10,tempoPriorityBands:[3,6,10],cooldown:2,explorationFloor:0.18,stretch:'granular overlap-add at playbackRate 1.0; pitch preserved; exact 32-beat output buffer'};

// The page still carries V1 inline defaults for backward compatibility. This
// micro-module migrates them immediately after the page has attached listeners:
// muted from factory, 42% level and the level slider always visible.
if(typeof window!=='undefined') import('./vibe-roulette-drum-defaults-v2.js').catch(()=>{});
