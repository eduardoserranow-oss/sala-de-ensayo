import {VibeRouletteIntentEngine,recommendedBpmForEnergy} from './vibe-roulette-engine-v2.js';
import {buildEightBarArrangement} from './vibe-roulette-eightbar.js';
import {SeamlessEightBarLoopTransport,buildSeamlessEightBarPerformance} from './vibe-roulette-seamless-loop-v1.js';
import {SkyKeysSoundEngine,nearestZone,playbackRateForMidi} from './vibe-roulette-skykeys-engine-v1.js';
import {buildSoundDirectionContext,chooseSkyKeysPresetForEngine,summarizeSoundDecision} from './vibe-roulette-skykeys-sound-direction-v1.js';
import {velocityToGain} from './vibe-roulette-neo-soul-player-v12.js';
import {SKYKEYS_WEB_PACK_INFO,loadSkyKeysWebPilot} from './vibe-roulette-skykeys-web-pack-v1.js';

export const SKYKEYS_PHASE5_INFO={version:'5.6.0-audio-truth',integration:'Vibe Roulette -> Sound Direction -> S.K.Y. Keys Sound Engine',mutatesPianist:false,mutatesHarmony:false,drumsUntouched:true,rhodesFallback:true,hostedPilotPreference:true,audioTruthUi:true};

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const phase5={engine:new SkyKeysSoundEngine({maxCachedBuffers:72}),ready:false,boot:null,webPackReport:{status:'not-loaded',loaded:[],failed:[],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount},idealDecision:null,lastDecision:null,decisionSource:'not-selected',lastResult:null,lastContext:null,audioState:{mode:'loading',preset:null,error:null}};

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

function copyPresetName(name){
  const value=String(name||'').trim();if(!value)return Promise.resolve(false);
  if(navigator?.clipboard?.writeText)return navigator.clipboard.writeText(value).then(()=>true);
  if(typeof document==='undefined')return Promise.resolve(false);
  const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return Promise.resolve(ok);
}

function ensureSoundBadge(){
  if(typeof document==='undefined')return null;
  let badge=document.getElementById('skykeysSoundDirectionStatus');
  if(!badge){
    badge=document.createElement('div');badge.id='skykeysSoundDirectionStatus';badge.className='intent-fit';
    badge.style.cssText='margin-top:10px;padding:12px 14px;border:1px solid rgba(255,107,20,.32);border-radius:14px;display:grid;gap:6px;';
    badge.innerHTML='<div data-skykeys-primary></div><div data-skykeys-detail style="opacity:.72;font-size:.86em"></div><button type="button" data-skykeys-copy style="display:none;justify-self:start;border:1px solid rgba(255,107,20,.55);background:transparent;color:inherit;border-radius:999px;padding:7px 11px;font:inherit;font-size:.82em">Copy preset</button>';
    badge.querySelector('[data-skykeys-copy]').addEventListener('click',async()=>{const name=badge.dataset.preset||'';if(!name)return;const button=badge.querySelector('[data-skykeys-copy]');try{await copyPresetName(name);button.textContent='✓ Preset copied';setTimeout(()=>{button.textContent='Copy preset';},1200);}catch{button.textContent='Copy failed';setTimeout(()=>{button.textContent='Copy preset';},1200);}});
    const loop=document.querySelector('.loop-panel');if(loop)loop.insertAdjacentElement('afterend',badge);
  }
  return badge;
}

function setBadgeText(badge,primary,detail='',preset=''){
  badge.querySelector('[data-skykeys-primary]').textContent=primary;
  badge.querySelector('[data-skykeys-detail]').textContent=detail;
  badge.dataset.preset=preset||'';
  const copy=badge.querySelector('[data-skykeys-copy]');copy.style.display=preset?'inline-flex':'none';
}

function firstWebPackError(){const failed=phase5.webPackReport?.failed||[];return failed[0]?`${failed[0].preset}: ${failed[0].error}`:'';}

function updateSoundBadge(decision,availability,{ideal=null,substituted=false,status=null,error=null}={}){
  const badge=ensureSoundBadge();if(!badge)return;
  if(status==='loading'){
    phase5.audioState={mode:'loading',preset:null,error:null};badge.dataset.audioMode='loading';
    setBadgeText(badge,'S.K.Y. Keys · loading hosted instruments…','Checking the four web presets before playback.');return;
  }
  if(status==='web-ready'&&!decision){
    const count=phase5.webPackReport.presetCount||0,expected=SKYKEYS_WEB_PACK_INFO.presetCount;
    phase5.audioState={mode:'ready',preset:null,error:null};badge.dataset.audioMode='ready';
    setBadgeText(badge,`S.K.Y. Keys · ${count}/${expected} web presets ready`,'Spin to choose the best available S.K.Y. instrument.');return;
  }
  if(status==='web-error'&&!decision){
    const detail=error||firstWebPackError()||'Hosted presets could not be loaded.';
    phase5.audioState={mode:'fallback',preset:null,error:detail};badge.dataset.audioMode='rhodes-fallback';
    setBadgeText(badge,'RHODES FALLBACK · S.K.Y. web presets unavailable',detail);return;
  }
  if(!decision?.preset){
    const detail=error||firstWebPackError()||'No eligible hosted S.K.Y. preset is available.';
    phase5.audioState={mode:'fallback',preset:null,error:detail};badge.dataset.audioMode='rhodes-fallback';
    setBadgeText(badge,'RHODES FALLBACK',detail);return;
  }
  const summary=summarizeSoundDecision(decision),idealSummary=ideal?.preset?summarizeSoundDecision(ideal):null,preset=summary.preset;
  badge.dataset.role=summary.role;badge.dataset.idealPreset=idealSummary?.preset||'';
  const idealDetail=substituted&&idealSummary?.preset?`Ideal: ${idealSummary.preset} · not hosted yet.`:'';
  if(status==='active'){
    phase5.audioState={mode:'active',preset,error:null};badge.dataset.audioMode='skykeys-active';
    setBadgeText(badge,`S.K.Y. AUDIO ACTIVE · ${preset}`,`${summary.function} · ${summary.role.replaceAll('_',' ')}${idealDetail?` · ${idealDetail}`:''}`,preset);return;
  }
  if(status==='fallback'){
    const detail=error||'This S.K.Y. preset could not be decoded; Rhodes is playing instead.';
    phase5.audioState={mode:'fallback',preset,error:detail};badge.dataset.audioMode='rhodes-fallback';
    setBadgeText(badge,`RHODES FALLBACK · selected ${preset}`,detail,preset);return;
  }
  if(availability.total>0){
    phase5.audioState={mode:'selected',preset,error:null};badge.dataset.audioMode='skykeys-selected';
    setBadgeText(badge,`Selected: S.K.Y. Keys — ${preset}`,`${summary.function} · ${summary.role.replaceAll('_',' ')} · tap Play to activate${idealDetail?` · ${idealDetail}`:''}`,preset);return;
  }
  phase5.audioState={mode:'fallback',preset,error:'Hosted samples unavailable'};badge.dataset.audioMode='rhodes-fallback';
  setBadgeText(badge,`RHODES FALLBACK · ${preset} unavailable`,'The selected S.K.Y. preset has no playable hosted samples.',preset);
}

function choosePlaybackDecision(context){
  const ideal=chooseSkyKeysPresetForEngine(phase5.engine,context,{requireAvailable:false,exploration:.025,candidateCount:10});
  const idealAvailability=availabilityFor(ideal);
  let decision=ideal,substituted=false,source='ideal';
  if(!ideal?.preset||idealAvailability.total<=0){
    const hosted=chooseSkyKeysPresetForEngine(phase5.engine,context,{requireAvailable:true,exploration:.025,candidateCount:10});
    if(hosted?.preset){decision=hosted;substituted=Boolean(ideal?.preset&&ideal.preset.name!==hosted.preset.name);source='hosted-substitute';}
    else source='rhodes-fallback';
  }
  const availability=availabilityFor(decision);
  phase5.idealDecision=ideal;phase5.lastDecision=decision;phase5.decisionSource=source;
  return {ideal,decision,availability,substituted,source};
}

function renderWebPackResult(){
  if(phase5.lastDecision)return;
  if(phase5.webPackReport.presetCount>0)updateSoundBadge(null,{total:0},{status:'web-ready'});
  else updateSoundBadge(null,{total:0},{status:'web-error',error:firstWebPackError()});
}

async function loadWebPilot(){
  phase5.webPackReport={status:'loading',loaded:[],failed:[],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};updateSoundBadge(null,{total:0},{status:'loading'});
  try{phase5.webPackReport=await loadSkyKeysWebPilot(phase5.engine);}
  catch(error){phase5.webPackReport={status:'unavailable',loaded:[],failed:[{preset:'web-pilot',error:String(error?.message||error)}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};}
  renderWebPackResult();return phase5.webPackReport;
}

async function boot(){
  if(phase5.ready&&phase5.webPackReport.status!=='not-loaded'&&phase5.webPackReport.status!=='loading')return phase5.engine;
  if(phase5.boot)return phase5.boot;
  phase5.boot=phase5.engine.loadCatalog().then(async()=>{
    phase5.ready=phase5.engine.catalog.length===222;
    await loadWebPilot();
    return phase5.engine;
  }).catch(error=>{
    phase5.webPackReport={status:'unavailable',loaded:[],failed:[{preset:'catalog-or-web-pilot',error:String(error?.message||error)}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};
    updateSoundBadge(null,{total:0},{status:'web-error',error:firstWebPackError()});return phase5.engine;
  });
  return phase5.boot;
}

export async function reloadSkyKeysWebPilot(){
  if(!phase5.engine.catalog.length){
    try{await phase5.engine.loadCatalog();phase5.ready=phase5.engine.catalog.length===222;}
    catch(error){const detail=String(error?.message||error);updateSoundBadge(null,{total:0},{status:'web-error',error:detail});return {status:'unavailable',loaded:[],failed:[{preset:'catalog',error:detail}],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};}
  }
  const report=await loadWebPilot();
  if(phase5.lastResult&&phase5.lastContext){const selected=choosePlaybackDecision(phase5.lastContext);updateSoundBadge(selected.decision,selected.availability,selected);}
  return report;
}

export function registerSkyKeysRemotePreset(name,zones,settings=null){
  phase5.engine.registerRemotePresetManifest(name,zones);if(settings)phase5.engine.registerPresetSettings(name,settings);return phase5.engine.getAvailability(name);
}

export function getSkyKeysPhase5State(){
  const ideal=phase5.idealDecision?.preset?{...summarizeSoundDecision(phase5.idealDecision),availability:availabilityFor(phase5.idealDecision)}:null;
  const playing=phase5.lastDecision?.preset?{...summarizeSoundDecision(phase5.lastDecision),availability:availabilityFor(phase5.lastDecision)}:null;
  return {ready:phase5.ready,webPack:{...SKYKEYS_WEB_PACK_INFO,runtime:phase5.webPackReport},decisionSource:phase5.decisionSource,audioState:{...phase5.audioState},idealDecision:ideal,lastDecision:playing};
}

export function decideSkyKeysForSpin(result,{arrangement=null,energyTarget=null,bpm=null,emotionFilters=null}={}){
  if(!result)return null;phase5.lastResult=result;
  if(!phase5.ready||phase5.webPackReport.status==='not-loaded'||phase5.webPackReport.status==='loading'){updateSoundBadge(null,{total:0},{status:'loading'});return null;}
  const arr=arrangement||buildEightBarArrangement(result,{energyTarget:energyTarget??result?.intent?.energyTarget??.65});
  const context=directionContext(result,arr,{energyTarget:energyTarget??result?.intent?.energyTarget??.65,bpm:bpm||recommendedBpmForEnergy(energyTarget??result?.intent?.energyTarget??.65),emotionFilters:emotionFilters||result.emotionFilters||[]});
  phase5.lastContext=context;
  const selected=choosePlaybackDecision(context);updateSoundBadge(selected.decision,selected.availability,selected);
  return {...selected.decision,availability:selected.availability,idealPreset:selected.ideal?.preset?.name||null,decisionSource:selected.source,substituted:selected.substituted};
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
  const patched=function(...args){
    const result=originalSpin.apply(this,args),opts=args[0]||{};phase5.lastResult=result;
    const decide=()=>{try{decideSkyKeysForSpin(result,{energyTarget:opts.energyTarget,emotionFilters:opts.emotionFilters});}catch(error){updateSoundBadge(null,{total:0},{status:'web-error',error:String(error?.message||error)});}};
    if(phase5.ready&&phase5.webPackReport.status!=='not-loaded'&&phase5.webPackReport.status!=='loading')decide();
    else{updateSoundBadge(null,{total:0},{status:'loading'});boot().then(decide).catch(error=>updateSoundBadge(null,{total:0},{status:'web-error',error:String(error?.message||error)}));}
    return result;
  };
  patched.__skyKeysPhase5Patched=true;VibeRouletteIntentEngine.prototype.spin=patched;
}

const originalPrepareSources=SeamlessEightBarLoopTransport.prototype.prepareSources;
if(!originalPrepareSources.__skyKeysPhase5Patched){
  const patched=async function(token){
    const base=await originalPrepareSources.call(this,token);this.__skyKeysPhase5Active=false;await boot();if(!base||!phase5.ready)return base;
    let selected=null,decision=null,availability={total:0};
    try{
      const result=phase5.lastResult;const context=result?directionContext(result,this.arrangement,this.options||{}):null;
      if(context){phase5.lastContext=context;selected=choosePlaybackDecision(context);}else if(phase5.lastDecision)selected={ideal:phase5.idealDecision,decision:phase5.lastDecision,availability:availabilityFor(phase5.lastDecision),substituted:phase5.decisionSource==='hosted-substitute',source:phase5.decisionSource};
      decision=selected?.decision;availability=selected?.availability||availabilityFor(decision);updateSoundBadge(decision,availability,selected||{});if(!decision?.preset||availability.total<=0){updateSoundBadge(decision,availability,{...(selected||{}),status:'fallback',error:firstWebPackError()||'No hosted S.K.Y. preset is playable.'});return base;}
      phase5.engine.ctx=this.ctx;phase5.engine.setPreset(decision.preset.name,{role:decision.role,enforceGuardrail:true});
      await phase5.engine.preload(this.performance.events.map(e=>e.midi),{preset:decision.preset.name});
      this.__skyKeysPhase5Active=this.running&&token===this.token;this.__skyKeysPhase5Decision=decision;
      if(this.__skyKeysPhase5Active)updateSoundBadge(decision,availability,{...(selected||{}),status:'active'});
      return base;
    }catch(error){
      this.__skyKeysPhase5Active=false;updateSoundBadge(decision,availability,{...(selected||{}),status:'fallback',error:String(error?.message||error)});return base;
    }
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

if(typeof window!=='undefined')window.__FORTISSIMO_SKYKEYS_PHASE5__={getState:getSkyKeysPhase5State,reloadWebPilot:reloadSkyKeysWebPilot,registerRemotePreset:registerSkyKeysRemotePreset,decide:decideSkyKeysForSpin,copyPreset:()=>copyPresetName(phase5.audioState.preset||phase5.lastDecision?.preset?.name)};

export const SKYKEYS_PHASE5_CONTRACT={
  chain:'Chord Generator -> Existing Pianist -> Sound Direction -> S.K.Y. Keys Sound Engine -> Audio',
  selection:'Sound Direction keeps its ideal 222-preset recommendation. If that preset is not hosted, playback uses the highest-ranked hosted preset for the same context before Rhodes fallback.',
  audioTruth:'The UI may say S.K.Y. AUDIO ACTIVE only after the selected hosted preset samples decode successfully for the current pianist performance. Otherwise it explicitly reports RHODES FALLBACK.',
  invariant:'No harmony, voicing, inversion, pianist timing, velocity, gesture or A/A-prime memory mutation.',
  fallback:'If no eligible hosted S.K.Y. preset can play or decoding fails, the existing Rhodes renderer remains active.',
  drums:'Existing Afro drum selection, buffer, mute, volume, replacement and shared clock are untouched.'
};