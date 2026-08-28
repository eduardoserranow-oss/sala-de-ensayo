import {VibeRouletteIntentEngine,recommendedBpmForEnergy} from './vibe-roulette-engine-v2.js';
import {buildEightBarArrangement} from './vibe-roulette-eightbar.js';
import {SeamlessEightBarLoopTransport,buildSeamlessEightBarPerformance} from './vibe-roulette-seamless-loop-v1.js';
import {SkyKeysSoundEngine,nearestZone,playbackRateForMidi} from './vibe-roulette-skykeys-engine-v1.js';
import {buildSoundDirectionContext,chooseSkyKeysPresetForEngine,summarizeSoundDecision} from './vibe-roulette-skykeys-sound-direction-v1.js';
import {velocityToGain} from './vibe-roulette-neo-soul-player-v12.js';
import {SKYKEYS_WEB_PACK_INFO,loadSkyKeysWebPilot} from './vibe-roulette-skykeys-web-pack-v1.js';

export const SKYKEYS_PHASE5_INFO={version:'5.2.0-web-pilot',integration:'Vibe Roulette -> Sound Direction -> S.K.Y. Keys Sound Engine',mutatesPianist:false,mutatesHarmony:false,drumsUntouched:true,rhodesFallback:true};

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const phase5={engine:new SkyKeysSoundEngine({maxCachedBuffers:72}),ready:false,boot:null,webPackReport:{status:'not-loaded',loaded:[],failed:[],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount},lastDecision:null,lastResult:null,lastContext:null};

function performanceForDirection(arrangement,options={}){
  const p=buildSeamlessEightBarPerformance(arrangement,options);
  const spb=60/Math.max(1,p.bpm||110);
  return {performance:p,events:p.events.map(e=>({midi:e.midi,velocity:e.velocity,start:Number(e.startBeat||0)*spb,duration:Number(e.durationBeats||.5)*spb,role:e.role}))};
}

function normalizeMood(mood){return ({illusion:'ilusion',connection:'conexion'}[mood]||mood||'conexion');}

function directionContext(result,arrangement,options={}){
  const bpm=Number(options.bpm||recommendedBpmForEnergy(options.energyTarget??result?.intent?.energyTarget??.65));
  const {events}=performanceForDirection(arrangement,{...options,bpm,mood:result?.mood||options.mood,emotionFilters:result?.emotionFilters||options.emotionFilters||[]});
  return buildSoundDirectionContext({
    emotionalTerritory:normalizeMood(result?.mood||options.mood),
    emotions:result?.emotionFilters||options.emotionFilters||[],
    bodyEnergy:options.energyTarget??result?.intent?.energyTarget??.65,
    bpm,performancePlan:events,vocalSpace:.76,sectionRole:'main',
    seed:result?.id||result?.performancePattern?.variantSeed||result?.progressionId||`${result?.roman?.join('-')||'vibe'}|${bpm}`,
    afroPriority:true,neoSoulHands:true
  });
}

function availabilityFor(decision){
  if(!decision?.preset)return {localSamples:0,remoteSamples:0,total:0};
  const a=phase5.engine.getAvailability(decision.preset.name);return {...a,total:Number(a.localSamples||0)+Number(a.remoteSamples||0)};
}

function updateSoundBadge(decision,availability){
  if(typeof document==='undefined')return;
  let badge=document.getElementById('skykeysSoundDirectionStatus');
  if(!badge){
    badge=document.createElement('div');badge.id='skykeysSoundDirectionStatus';badge.className='intent-fit';badge.style.marginTop='10px';
    const loop=document.querySelector('.loop-panel');if(loop)loop.insertAdjacentElement('afterend',badge);
  }
  if(!badge)return;
  if(!decision?.preset){badge.textContent='S.K.Y. Keys · Rhodes safety fallback';return;}
  const summary=summarizeSoundDecision(decision);
  badge.dataset.preset=summary.preset;badge.dataset.role=summary.role;badge.dataset.audioMode=availability.total>0?'skykeys':'rhodes-fallback';
  badge.textContent=availability.total>0?`S.K.Y. Keys · ${summary.preset} · ${summary.function} · ${summary.role.replaceAll('_',' ')}`:`S.K.Y. Keys direction · ${summary.preset} · Rhodes fallback until this preset has hosted samples`;
}

async function loadWebPilot(){
  try{phase5.webPackReport=await loadSkyKeysWebPilot(phase5.engine);}
  catch(error){phase5.webPackReport={status:'unavailable',loaded:[],failed:[{preset:'web-pilot',error:String(error?.message||error)}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};}
  return phase5.webPackReport;
}

async function boot(){
  if(phase5.ready)return phase5.engine;
  if(phase5.boot)return phase5.boot;
  phase5.boot=phase5.engine.loadCatalog().then(async()=>{
    phase5.ready=phase5.engine.catalog.length===222;
    await loadWebPilot();
    return phase5.engine;
  }).catch(error=>{
    phase5.webPackReport={status:'unavailable',loaded:[],failed:[{preset:'catalog-or-web-pilot',error:String(error?.message||error)}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};
    return phase5.engine;
  });
  return phase5.boot;
}

export async function reloadSkyKeysWebPilot(){
  if(!phase5.engine.catalog.length){
    try{await phase5.engine.loadCatalog();phase5.ready=phase5.engine.catalog.length===222;}
    catch(error){return {status:'unavailable',loaded:[],failed:[{preset:'catalog',error:String(error?.message||error)}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};}
  }
  return loadWebPilot();
}

export function registerSkyKeysRemotePreset(name,zones,settings=null){
  phase5.engine.registerRemotePresetManifest(name,zones);if(settings)phase5.engine.registerPresetSettings(name,settings);return phase5.engine.getAvailability(name);
}

export function getSkyKeysPhase5State(){return {ready:phase5.ready,webPack:{...SKYKEYS_WEB_PACK_INFO,runtime:phase5.webPackReport},lastDecision:phase5.lastDecision?{...summarizeSoundDecision(phase5.lastDecision),availability:availabilityFor(phase5.lastDecision)}:null};}

export function decideSkyKeysForSpin(result,{arrangement=null,energyTarget=null,bpm=null,emotionFilters=null}={}){
  if(!phase5.ready||!result)return null;
  const arr=arrangement||buildEightBarArrangement(result,{energyTarget:energyTarget??result?.intent?.energyTarget??.65});
  const context=directionContext(result,arr,{energyTarget:energyTarget??result?.intent?.energyTarget??.65,bpm:bpm||recommendedBpmForEnergy(energyTarget??result?.intent?.energyTarget??.65),emotionFilters:emotionFilters||result.emotionFilters||[]});
  const decision=chooseSkyKeysPresetForEngine(phase5.engine,context,{requireAvailable:false,exploration:.025,candidateCount:10});
  phase5.lastResult=result;phase5.lastContext=context;phase5.lastDecision=decision;const availability=availabilityFor(decision);updateSoundBadge(decision,availability);
  return {...decision,availability};
}

function presetBuffer(engine,zone,presetName){return engine.buffers.get(`${presetName}:${zone.name||zone.url}`);}

function scheduleSkyEvent(transport,event,cycleStart,{notBefore=-Infinity}={}){
  const engine=phase5.engine,preset=phase5.lastDecision?.preset;if(!preset)return false;
  const zones=engine.getZones(preset.name);const zone=nearestZone(zones,event.midi);if(!zone)return false;
  const buffer=presetBuffer(engine,zone,preset.name);if(!buffer)return false;
  const settings=engine.getSettings(preset.name),spb=60/transport.performance.bpm;
  const naturalStart=cycleStart+event.startBeat*spb+(event.fingerOffsetSeconds||0);
  const bodyDuration=Math.max(.10,event.durationBeats*spb),release=Math.max(.02,Number(settings.Release||.3));
  const maxAvailable=Math.max(.10,buffer.duration-.03),naturalEnd=naturalStart+Math.min(maxAvailable,bodyDuration+Math.min(release,.8));
  if(naturalEnd<=notBefore+.002)return true;
  const resumed=naturalStart<notBefore,start=resumed?notBefore:naturalStart;
  const pitchRate=playbackRateForMidi(event.midi,zone.rootMidi),sourceOffsetSeconds=resumed?clamp(notBefore-naturalStart,0,maxAvailable-.05):0;
  const sampleOffset=sourceOffsetSeconds*pitchRate;const remaining=Math.min(naturalEnd-start,Math.max(.03,(maxAvailable-sampleOffset)/Math.max(.25,pitchRate)));if(remaining<=.025)return true;
  const end=start+remaining,ctx=transport.ctx,source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.playbackRate.value=pitchRate;
  const loopOn=Boolean(Number(settings['Loop Bool']||0)),ls=Number(settings['Loop Start']),le=Number(settings['Loop End']);
  if(loopOn&&buffer.duration>.08&&Number.isFinite(ls)&&Number.isFinite(le)&&le>ls){source.loop=true;source.loopStart=Math.max(0,Math.min(buffer.duration-.04,ls<=1?ls*buffer.duration:ls));source.loopEnd=Math.max(source.loopStart+.03,Math.min(buffer.duration,le<=1?le*buffer.duration:le));}
  source.connect(gain);gain.connect(transport.chain.input);
  const dynamic=Math.max(.012,velocityToGain(event.velocity,event.role)),attack=Math.max(.004,Math.min(.45,Number(settings.Attack||.01)));
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(dynamic,start+Math.min(attack,Math.max(.004,remaining*.35)));
  const fadeStart=Math.max(start+.02,end-Math.min(release,Math.max(.04,remaining*.45)));if(fadeStart<end-.01)gain.gain.setValueAtTime(Math.max(.006,dynamic*.78),fadeStart);gain.gain.exponentialRampToValueAtTime(.0001,end);
  const startRaw=Number(settings.Start||0),presetOffset=Number.isFinite(startRaw)&&startRaw>0?(startRaw<=1?startRaw*buffer.duration:startRaw):0;
  source.start(start,clamp(presetOffset+sampleOffset,0,Math.max(0,buffer.duration-.02)));source.stop(end+.035);
  transport.preview.activeSources.add(source);source.onended=()=>{transport.preview.activeSources.delete(source);try{source.disconnect();}catch{}try{gain.disconnect();}catch{}};return true;
}

const originalSpin=VibeRouletteIntentEngine.prototype.spin;
if(!originalSpin.__skyKeysPhase5Patched){
  const patched=function(...args){const result=originalSpin.apply(this,args);try{const opts=args[0]||{};decideSkyKeysForSpin(result,{energyTarget:opts.energyTarget,emotionFilters:opts.emotionFilters});}catch{}return result;};
  patched.__skyKeysPhase5Patched=true;VibeRouletteIntentEngine.prototype.spin=patched;
}

const originalPrepareSources=SeamlessEightBarLoopTransport.prototype.prepareSources;
if(!originalPrepareSources.__skyKeysPhase5Patched){
  const patched=async function(token){
    const base=await originalPrepareSources.call(this,token);this.__skyKeysPhase5Active=false;if(!base||!phase5.ready)return base;
    try{
      const result=phase5.lastResult;const context=result?directionContext(result,this.arrangement,this.options||{}):null;
      if(context)phase5.lastDecision=chooseSkyKeysPresetForEngine(phase5.engine,context,{requireAvailable:false,exploration:.025,candidateCount:10});
      const decision=phase5.lastDecision,availability=availabilityFor(decision);updateSoundBadge(decision,availability);if(!decision?.preset||availability.total<=0)return base;
      phase5.engine.ctx=this.ctx;phase5.engine.setPreset(decision.preset.name,{role:decision.role,enforceGuardrail:true});
      await phase5.engine.preload(this.performance.events.map(e=>e.midi),{preset:decision.preset.name});
      this.__skyKeysPhase5Active=this.running&&token===this.token;this.__skyKeysPhase5Decision=decision;return base;
    }catch{this.__skyKeysPhase5Active=false;return base;}
  };
  patched.__skyKeysPhase5Patched=true;SeamlessEightBarLoopTransport.prototype.prepareSources=patched;
}

const originalScheduleCycle=SeamlessEightBarLoopTransport.prototype.scheduleCycle;
if(!originalScheduleCycle.__skyKeysPhase5Patched){
  const patched=function(cycleStart,token,options={}){
    if(!this.__skyKeysPhase5Active)return originalScheduleCycle.call(this,cycleStart,token,options);
    if(!this.running||token!==this.token)return;for(const event of this.performance.events)scheduleSkyEvent(this,event,cycleStart,options);
  };
  patched.__skyKeysPhase5Patched=true;SeamlessEightBarLoopTransport.prototype.scheduleCycle=patched;
}

boot();

if(typeof window!=='undefined')window.__FORTISSIMO_SKYKEYS_PHASE5__={getState:getSkyKeysPhase5State,reloadWebPilot:reloadSkyKeysWebPilot,registerRemotePreset:registerSkyKeysRemotePreset,decide:decideSkyKeysForSpin};

export const SKYKEYS_PHASE5_CONTRACT={
  chain:'Chord Generator -> Existing Pianist -> Sound Direction -> S.K.Y. Keys Sound Engine -> Audio',
  invariant:'No harmony, voicing, inversion, pianist timing, velocity, gesture or A/A-prime memory mutation.',
  fallback:'If the selected S.K.Y. preset has no local/remote samples or cannot decode, the existing Rhodes renderer remains active.',
  drums:'Existing Afro drum selection, buffer, mute, volume, replacement and shared clock are untouched.'
};
