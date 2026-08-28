import './vibe-roulette-skykeys-catalog-gap-repair-v1.js';

export const SKYKEYS_WEB_PACK_INFO={
  version:'1.2.0-direct-zone-bootstrap',
  codec:'AAC-LC',
  container:'m4a',
  mimeType:'audio/mp4',
  sampleRate:44100,
  channels:2,
  presetCount:4,
  zoneCount:205,
  sourceBytes:288166375,
  webBytes:67656500,
  hosting:'Supabase Storage public bucket vibe-roulette-audio',
  delivery:'direct-zone-bootstrap + background-manifest-hydration',
  manifestTimeoutMs:5000,
  physicalSafariValidation:false,
  productionPolicy:'Four-preset web pilot only. Zone URLs are registered immediately so Safari manifest fetches cannot block playback; manifests remain the source of full original settings when hydration succeeds.'
};

const STORAGE_BASE='https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1';

export const SKYKEYS_WEB_MANIFEST_URLS=Object.freeze({
  'Beautiful Rhodes':`${STORAGE_BASE}/beautiful-rhodes/manifest.json`,
  'Soft Piano':`${STORAGE_BASE}/soft-piano/manifest.json`,
  'Modest Wurli':`${STORAGE_BASE}/modest-wurli/manifest.json`,
  'Grand Piano':`${STORAGE_BASE}/grand-piano/manifest.json`
});

export const SKYKEYS_WEB_EXPECTED_ZONE_COUNTS=Object.freeze({
  'Beautiful Rhodes':13,
  'Soft Piano':84,
  'Modest Wurli':20,
  'Grand Piano':88
});

const PILOT_RENDER_SETTINGS=Object.freeze({
  'Beautiful Rhodes':{Attack:0,Release:1.451,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1},
  'Soft Piano':{Attack:0,Release:1.181,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1},
  'Modest Wurli':{Attack:.33,Release:1.321,Overlap:1,Voices:8,'Loop Bool':0,Stereo:1},
  'Grand Piano':{Attack:0,Release:1.521,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}
});

const SUPPORTED_MIME_TYPES=new Set(['audio/mp4','audio/x-m4a','audio/m4a','audio/aac']);

const SETTING_ALIASES=Object.freeze({
  attack:'Attack',release:'Release',overlap:'Overlap',voices:'Voices',loopBool:'Loop Bool',loop:'Loop Bool',
  glide:'Glide',legato:'Legato',rotate:'Rotate',tsPower:'TSPower',toneShifts:'Tone Shifts',reversePower:'Reverse Power',
  reverseDivision:'Reverse Division',reverseContinuous:'Reverse Continuous',revFadeIn:'Rev Fade in',vibratoPower:'Vibrato Power',
  vibratoDepth:'Vibrato Depth',vibratoSpeed:'Vibrato Speed',flutter:'Flutter',reverb:'Reverb',reverbMix:'Reverb Mix',
  reverbLength:'Reverb Length',reverbTone:'Reverb Tone',filterPower:'Filter Power',lowPass:'Low pass',highPass:'High Pass',
  filterSlope:'Filter Slope',start:'Start',loopStart:'Loop Start',loopEnd:'Loop End',reverseEnd:'Reverse End',
  reverseStart:'Reverse Start',saturation:'Saturation',toneRange:'Tone Range',stereo:'Stereo'
});

export function normalizeWebManifestSettings(settings={}){
  const normalized={...settings};
  for(const [source,target] of Object.entries(SETTING_ALIASES))if(settings[source]!==undefined&&normalized[target]===undefined)normalized[target]=settings[source];
  normalized.Attack=Number(normalized.Attack??0);
  normalized.Release=Number(normalized.Release??.8);
  normalized.Overlap=Number(normalized.Overlap??0);
  normalized.Voices=Number(normalized.Voices??8);
  normalized['Loop Bool']=Number(normalized['Loop Bool']??0);
  normalized.Start=Number(normalized.Start??0);
  normalized['Loop Start']=Number(normalized['Loop Start']??0);
  normalized['Loop End']=Number(normalized['Loop End']??1);
  return normalized;
}

const pad3=n=>String(n).padStart(3,'0');
const zone=(presetFolder,midi,label)=>({rootMidi:midi,zoneLabel:label,name:`${pad3(midi)}-${label}.m4a`,url:`${STORAGE_BASE}/${presetFolder}/${pad3(midi)}-${label}.m4a`});

function directZonesFor(preset){
  if(preset==='Beautiful Rhodes')return Array.from({length:13},(_,i)=>{const midi=60+i*4;return zone('beautiful-rhodes',midi,i===0?'dow':i===12?'top':'ev4');});
  if(preset==='Modest Wurli')return Array.from({length:20},(_,i)=>{const midi=36+i*4;return zone('modest-wurli',midi,i===0?'dow':i===19?'top':'ev4');});
  if(preset==='Soft Piano')return Array.from({length:84},(_,i)=>{const midi=24+i;return zone('soft-piano',midi,i===0?'do1':i===83?'top':'one');});
  if(preset==='Grand Piano'){
    const midis=[...Array.from({length:85},(_,i)=>21+i),107,108,109];
    return midis.map((midi,i)=>zone('grand-piano',midi,i===0?'do1':i===midis.length-1?'top':'one'));
  }
  return [];
}

function absoluteZoneUrl(base,zoneData){
  const raw=String(zoneData?.url||zoneData?.name||'').trim();if(!raw)return '';
  try{return new URL(raw,base).href;}catch{return '';}
}

function validateManifest(preset,url,manifest){
  if(!manifest||manifest.preset!==preset)throw new Error(`preset mismatch for ${preset}`);
  if(String(manifest.format||'').toLowerCase()!=='m4a')throw new Error(`unexpected format for ${preset}`);
  const declaredMime=String(manifest.mimeType||manifest.mime||'').toLowerCase();
  if(declaredMime&&!SUPPORTED_MIME_TYPES.has(declaredMime))throw new Error(`unexpected MIME ${declaredMime} for ${preset}`);
  const zones=Array.isArray(manifest.zones)?manifest.zones:[],expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];
  if(zones.length!==expected)throw new Error(`zone count ${zones.length}/${expected} for ${preset}`);
  const seen=new Set(),base=url.slice(0,url.lastIndexOf('/')+1),baseOrigin=new URL(base).origin,normalized=[];
  for(const item of zones){
    const root=Number(item?.rootMidi),name=String(item?.name||''),zoneUrl=absoluteZoneUrl(base,item);
    if(!Number.isFinite(root)||seen.has(root))throw new Error(`invalid/duplicate root MIDI for ${preset}`);
    if(!/\.m4a$/i.test(name)||!zoneUrl||new URL(zoneUrl).origin!==baseOrigin)throw new Error(`invalid zone URL for ${preset}`);
    seen.add(root);normalized.push({...item,rootMidi:root,name,url:zoneUrl});
  }
  return normalized;
}

async function fetchManifest(fetchImpl,url,timeoutMs){
  if(typeof AbortController==='undefined')return fetchImpl(url,{cache:'no-store'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(timeoutMs)||SKYKEYS_WEB_PACK_INFO.manifestTimeoutMs));
  try{return await fetchImpl(url,{cache:'no-store',signal:controller.signal});}
  catch(error){if(error?.name==='AbortError')throw new Error(`manifest timeout after ${timeoutMs}ms`);throw error;}
  finally{clearTimeout(timer);}
}

function registerDirectPilot(engine){
  const loaded=[];let zones=0;
  for(const preset of Object.keys(SKYKEYS_WEB_MANIFEST_URLS)){
    const direct=directZonesFor(preset),expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];
    if(direct.length!==expected)throw new Error(`direct zone count ${direct.length}/${expected} for ${preset}`);
    engine.registerRemotePresetManifest(preset,direct);
    engine.registerPresetSettings(preset,PILOT_RENDER_SETTINGS[preset]);
    loaded.push({preset,url:SKYKEYS_WEB_MANIFEST_URLS[preset],zones:direct.length,format:'m4a',mimeType:'audio/x-m4a',source:'direct-zone-bootstrap'});
    zones+=direct.length;
  }
  return {status:zones===SKYKEYS_WEB_PACK_INFO.zoneCount?'ready':'partial',loaded,failed:[],zones,presetCount:loaded.length,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount,source:'direct-zone-bootstrap'};
}

async function hydrateManifestsInBackground(engine,fetchImpl,timeoutMs,report){
  const hydration={loaded:[],failed:[]};
  await Promise.all(Object.entries(SKYKEYS_WEB_MANIFEST_URLS).map(async([preset,url])=>{
    try{
      const response=await fetchManifest(fetchImpl,url,timeoutMs);if(!response?.ok)throw new Error(`manifest HTTP ${response?.status??'unavailable'}`);
      const manifest=await response.json(),zones=validateManifest(preset,url,manifest),settings=normalizeWebManifestSettings(manifest.settings||{});
      engine.registerRemotePresetManifest(preset,zones);engine.registerPresetSettings(preset,settings);
      hydration.loaded.push({preset,settingsSource:'manifest',zones:zones.length});
    }catch(error){hydration.failed.push({preset,error:String(error?.message||error)});}
  }));
  report.manifestHydration=hydration;return hydration;
}

export async function loadSkyKeysWebPilot(engine,{fetchImpl=globalThis.fetch,timeoutMs=SKYKEYS_WEB_PACK_INFO.manifestTimeoutMs}={}){
  if(!engine?.registerRemotePresetManifest||!engine?.registerPresetSettings)throw new Error('S.K.Y. web pilot requires a compatible sound engine');
  const startedAt=Date.now(),report=registerDirectPilot(engine);
  report.startedAt=startedAt;report.completedAt=Date.now();report.durationMs=report.completedAt-startedAt;report.manifestHydration={status:'background',loaded:[],failed:[]};
  if(typeof fetchImpl==='function')hydrateManifestsInBackground(engine,fetchImpl,timeoutMs,report).catch(()=>{});
  return report;
}

export const SKYKEYS_WEB_PACK_CONTRACT={
  purpose:'Register the four validated AAC-LC/M4A S.K.Y. Keys pilot zone maps immediately from known Supabase object paths, while hydrating the full original preset settings from the uploaded manifests in the background.',
  selection:'Sound Direction remains authoritative; direct zone bootstrap only prevents manifest-network latency from blocking which hosted presets are playable.',
  resilience:'Safari no longer waits on cross-origin manifest fetches before the four hosted presets become available; background manifest hydration remains timeout-bounded and accepts Supabase M4A MIME variants.',
  fallback:'If an actual M4A sample cannot be fetched or decoded, the existing Rhodes safety renderer remains authoritative for audio delivery.',
  invariance:'Remote audio registration cannot mutate harmony, pianist notes, voicings, inversions, timing, velocity, phrase memory or drums.',
  secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'
};