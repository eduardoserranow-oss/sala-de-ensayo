import './vibe-roulette-skykeys-catalog-gap-repair-v1.js';

export const SKYKEYS_WEB_PACK_INFO={
  version:'1.3.0-afro-priority-bank',
  codec:'AAC-LC',
  container:'m4a',
  mimeType:'audio/mp4',
  sampleRate:44100,
  channels:2,
  presetCount:10,
  zoneCount:307,
  sourceBytes:349314258,
  webBytes:80718014,
  hosting:'Supabase Storage public bucket vibe-roulette-audio',
  delivery:'direct-zone-bootstrap + background-manifest-hydration',
  manifestTimeoutMs:5000,
  physicalSafariValidation:'partial: Beautiful Rhodes confirmed on iPhone; remaining presets pending listening validation',
  productionPolicy:'Ten-preset curated Afro/Afropop web bank. Five main-harmony instruments compete for the existing pianist; five color instruments are hosted now but reserved for role-aware layering so they are not fed the full pianist blindly.'
};

const STORAGE_BASE='https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1';

export const SKYKEYS_AFRO_PRIORITY_BANK=Object.freeze({
  mainHarmony:Object.freeze(['About Time','Beautiful Rhodes','Soft Piano','Modest Wurli','Grand Piano']),
  colors:Object.freeze(['Always Danger','Broad Texture','Hidden Whistle','Toy Piano','Warm Pluck']),
  metadata:Object.freeze({
    'About Time':{id:41,originalFunction:'Keys',source:'Synths',fortissimoUse:'main harmonic instrument / core Afrobeats keys'},
    'Beautiful Rhodes':{id:92,originalFunction:'Keys',source:'Acoustic',fortissimoUse:'warm main harmony / sensual / connection / nostalgia'},
    'Soft Piano':{id:91,originalFunction:'Keys',source:'Acoustic',fortissimoUse:'soft emotional main harmony / calm / introspection / nostalgia'},
    'Modest Wurli':{id:89,originalFunction:'Keys',source:'Acoustic',fortissimoUse:'warm intimate main harmony / sensual / connection'},
    'Grand Piano':{id:87,originalFunction:'Keys',source:'Acoustic',fortissimoUse:'neutral organic main harmony'},
    'Always Danger':{id:111,originalFunction:'Keys',source:'Effected',fortissimoUse:'support texture / pad-like effected layer'},
    'Broad Texture':{id:146,originalFunction:'Pads',source:'Effected',fortissimoUse:'atmospheric / textural pad'},
    'Hidden Whistle':{id:38,originalFunction:'Keys',source:'Synths',fortissimoUse:'melodic hook / whistle-like color'},
    'Toy Piano':{id:238,originalFunction:'Plucks',source:'Acoustic',fortissimoUse:'emotional / nostalgic hook color'},
    'Warm Pluck':{id:196,originalFunction:'Plucks',source:'Synths',fortissimoUse:'high-priority Afrobeats rhythmic pluck'}
  })
});

const PRESET_SPECS=Object.freeze({
  'Beautiful Rhodes':{folder:'beautiful-rhodes',count:13,mode:'step4',start:60,end:108,settings:{Attack:0,Release:1.451,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}},
  'Soft Piano':{folder:'soft-piano',count:84,mode:'one',start:24,end:107,settings:{Attack:0,Release:1.181,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}},
  'Modest Wurli':{folder:'modest-wurli',count:20,mode:'step4',start:36,end:112,settings:{Attack:.33,Release:1.321,Overlap:1,Voices:8,'Loop Bool':0,Stereo:1}},
  'Grand Piano':{folder:'grand-piano',count:88,mode:'grand',settings:{Attack:0,Release:1.521,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}},
  'About Time':{folder:'about-time',count:15,mode:'step4',start:24,end:80,settings:{Attack:0,Release:1.501,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}},
  'Always Danger':{folder:'always-danger',count:15,mode:'step4',start:36,end:92,settings:{Attack:0,Release:1.401,Overlap:1,Voices:8,'Loop Bool':0,Stereo:1}},
  'Broad Texture':{folder:'broad-texture',count:15,mode:'step4',start:24,end:80,settings:{Attack:1.53,Release:1.671,Overlap:0,Voices:8,'Loop Bool':1,Stereo:1}},
  'Hidden Whistle':{folder:'hidden-whistle',count:14,mode:'step4',start:16,end:68,settings:{Attack:0,Release:1.771,Overlap:0,Voices:8,'Loop Bool':1,Stereo:1}},
  'Toy Piano':{folder:'toy-piano',count:31,mode:'one',start:44,end:74,settings:{Attack:0,Release:1.841,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}},
  'Warm Pluck':{folder:'warm-pluck',count:12,mode:'step4',start:24,end:68,settings:{Attack:.01,Release:1.371,Overlap:0,Voices:8,'Loop Bool':0,Stereo:1}}
});

export const SKYKEYS_WEB_MANIFEST_URLS=Object.freeze(Object.fromEntries(Object.entries(PRESET_SPECS).map(([name,spec])=>[name,`${STORAGE_BASE}/${spec.folder}/manifest.json`])));
export const SKYKEYS_WEB_EXPECTED_ZONE_COUNTS=Object.freeze(Object.fromEntries(Object.entries(PRESET_SPECS).map(([name,spec])=>[name,spec.count])));

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
  normalized.Attack=Number(normalized.Attack??0);normalized.Release=Number(normalized.Release??.8);normalized.Overlap=Number(normalized.Overlap??0);normalized.Voices=Number(normalized.Voices??8);
  normalized['Loop Bool']=Number(normalized['Loop Bool']??0);normalized.Start=Number(normalized.Start??0);normalized['Loop Start']=Number(normalized['Loop Start']??0);normalized['Loop End']=Number(normalized['Loop End']??1);
  return normalized;
}

const pad3=n=>String(n).padStart(3,'0');
const zone=(presetFolder,midi,label)=>({rootMidi:midi,zoneLabel:label,name:`${pad3(midi)}-${label}.m4a`,url:`${STORAGE_BASE}/${presetFolder}/${pad3(midi)}-${label}.m4a`});

function directZonesFor(preset){
  const spec=PRESET_SPECS[preset];if(!spec)return [];
  if(spec.mode==='grand'){
    const midis=[...Array.from({length:85},(_,i)=>21+i),107,108,109];
    return midis.map((midi,i)=>zone(spec.folder,midi,i===0?'do1':i===midis.length-1?'top':'one'));
  }
  const step=spec.mode==='step4'?4:1,midis=[];for(let midi=spec.start;midi<=spec.end;midi+=step)midis.push(midi);
  return midis.map((midi,i)=>zone(spec.folder,midi,i===0?(spec.mode==='one'?'do1':'dow'):i===midis.length-1?'top':spec.mode==='one'?'one':'ev4'));
}

function absoluteZoneUrl(base,zoneData){const raw=String(zoneData?.url||zoneData?.name||'').trim();if(!raw)return '';try{return new URL(raw,base).href;}catch{return '';}}

function validateManifest(preset,url,manifest){
  if(!manifest||manifest.preset!==preset)throw new Error(`preset mismatch for ${preset}`);
  if(String(manifest.format||'').toLowerCase()!=='m4a')throw new Error(`unexpected format for ${preset}`);
  const declaredMime=String(manifest.mimeType||manifest.mime||'').toLowerCase();if(declaredMime&&!SUPPORTED_MIME_TYPES.has(declaredMime))throw new Error(`unexpected MIME ${declaredMime} for ${preset}`);
  const zones=Array.isArray(manifest.zones)?manifest.zones:[],expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];if(zones.length!==expected)throw new Error(`zone count ${zones.length}/${expected} for ${preset}`);
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

const MAIN_BANK=new Set(SKYKEYS_AFRO_PRIORITY_BANK.mainHarmony);
const BASE_MAIN_ROLE=Object.freeze({'About Time':1,'Beautiful Rhodes':.98,'Modest Wurli':.95,'Soft Piano':.93,'Grand Piano':.90});
const varietyState={recent:[],observer:null,engine:null};

function applyMainBankAndVariety(engine){
  if(!engine?.catalog?.length)return;
  varietyState.engine=engine;
  for(const preset of engine.catalog){
    if(preset.__skyOriginalCompatibility===undefined)preset.__skyOriginalCompatibility=preset.pianistCompatibility;
    if(preset.__skyOriginalMainHarmony===undefined)preset.__skyOriginalMainHarmony=Number(preset.roleScores?.main_harmony||0);
    if(MAIN_BANK.has(preset.name)){
      preset.pianistCompatibility='preferred';
      const recentIndex=varietyState.recent.indexOf(preset.name);const penalty=recentIndex===0?.34:recentIndex===1?.18:recentIndex===2?.08:0;
      preset.roleScores.main_harmony=Math.max(.50,(BASE_MAIN_ROLE[preset.name]??preset.__skyOriginalMainHarmony)-penalty);
    }else{
      preset.pianistCompatibility='restricted';
    }
  }
}

function rememberPlayedMainPreset(name){
  if(!MAIN_BANK.has(name)||varietyState.recent[0]===name)return;
  varietyState.recent=[name,...varietyState.recent.filter(x=>x!==name)].slice(0,3);applyMainBankAndVariety(varietyState.engine);
}

function installVarietyObserver(engine){
  applyMainBankAndVariety(engine);
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||varietyState.observer)return;
  const inspect=()=>{const badge=document.getElementById('skykeysSoundDirectionStatus');if(!badge||badge.dataset.audioMode!=='skykeys-active')return;rememberPlayedMainPreset(badge.dataset.preset||'');};
  varietyState.observer=new MutationObserver(inspect);varietyState.observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-audio-mode','data-preset']});inspect();
}

function registerDirectPilot(engine){
  const loaded=[];let zones=0;
  for(const [preset,spec] of Object.entries(PRESET_SPECS)){
    const direct=directZonesFor(preset),expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];if(direct.length!==expected)throw new Error(`direct zone count ${direct.length}/${expected} for ${preset}`);
    engine.registerRemotePresetManifest(preset,direct);engine.registerPresetSettings(preset,spec.settings);
    loaded.push({preset,url:SKYKEYS_WEB_MANIFEST_URLS[preset],zones:direct.length,format:'m4a',mimeType:'audio/x-m4a',source:'direct-zone-bootstrap',bank:MAIN_BANK.has(preset)?'main-harmony':'role-aware-color'});zones+=direct.length;
  }
  installVarietyObserver(engine);
  return {status:zones===SKYKEYS_WEB_PACK_INFO.zoneCount?'ready':'partial',loaded,failed:[],zones,presetCount:loaded.length,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount,source:'direct-zone-bootstrap',afroPriority:{mainHarmony:[...SKYKEYS_AFRO_PRIORITY_BANK.mainHarmony],colors:[...SKYKEYS_AFRO_PRIORITY_BANK.colors],recentPlayed:[...varietyState.recent]}};
}

async function hydrateManifestsInBackground(engine,fetchImpl,timeoutMs,report){
  const hydration={loaded:[],failed:[]};
  await Promise.all(Object.entries(SKYKEYS_WEB_MANIFEST_URLS).map(async([preset,url])=>{
    try{
      const response=await fetchManifest(fetchImpl,url,timeoutMs);if(!response?.ok)throw new Error(`manifest HTTP ${response?.status??'unavailable'}`);
      const manifest=await response.json(),zones=validateManifest(preset,url,manifest),settings=normalizeWebManifestSettings(manifest.settings||{});
      engine.registerRemotePresetManifest(preset,zones);engine.registerPresetSettings(preset,settings);hydration.loaded.push({preset,settingsSource:'manifest',zones:zones.length});
    }catch(error){hydration.failed.push({preset,error:String(error?.message||error)});}
  }));
  report.manifestHydration=hydration;return hydration;
}

export async function loadSkyKeysWebPilot(engine,{fetchImpl=globalThis.fetch,timeoutMs=SKYKEYS_WEB_PACK_INFO.manifestTimeoutMs}={}){
  if(!engine?.registerRemotePresetManifest||!engine?.registerPresetSettings)throw new Error('S.K.Y. web pilot requires a compatible sound engine');
  const startedAt=Date.now(),report=registerDirectPilot(engine);report.startedAt=startedAt;report.completedAt=Date.now();report.durationMs=report.completedAt-startedAt;report.manifestHydration={status:'background',loaded:[],failed:[]};
  if(typeof fetchImpl==='function')hydrateManifestsInBackground(engine,fetchImpl,timeoutMs,report).catch(()=>{});return report;
}

export function getSkyKeysAfroPriorityState(){return {mainHarmony:[...SKYKEYS_AFRO_PRIORITY_BANK.mainHarmony],colors:[...SKYKEYS_AFRO_PRIORITY_BANK.colors],recentPlayed:[...varietyState.recent]};}

export const SKYKEYS_WEB_PACK_CONTRACT={
  purpose:'Register the ten validated AAC-LC/M4A curated S.K.Y. Keys presets immediately from known Supabase object paths, while hydrating their full original settings from uploaded manifests in the background.',
  selection:'For the current single-instrument phase, only About Time, Beautiful Rhodes, Soft Piano, Modest Wurli and Grand Piano may compete as the full-pianist main harmony. The other five hosted sounds remain reserved for role-aware color/layer playback.',
  variety:'A three-item played-preset memory applies a temporary score penalty only after S.K.Y. audio is confirmed ACTIVE, reducing immediate repetition without random rotation. Emotion, Body Energy and Sound Direction still decide among musically eligible main instruments.',
  resilience:'Safari does not wait on cross-origin manifest fetches before hosted presets become available; background manifest hydration remains timeout-bounded and accepts Supabase M4A MIME variants.',
  fallback:'If an actual M4A sample cannot be fetched or decoded, the existing Rhodes safety renderer remains authoritative for audio delivery.',
  invariance:'Remote audio registration and variety memory cannot mutate harmony, pianist notes, voicings, inversions, timing, velocity, phrase memory or drums.',
  secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'
};