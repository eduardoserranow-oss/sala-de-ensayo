export const SKYKEYS_WEB_PACK_INFO={
  version:'1.1.0-resilient-pilot',
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
  delivery:'remote-manifest',
  manifestTimeoutMs:5000,
  physicalSafariValidation:false,
  productionPolicy:'Four-preset web pilot only. Remote assets must exist before S.K.Y. audio replaces the Rhodes safety fallback.'
};

export const SKYKEYS_WEB_MANIFEST_URLS=Object.freeze({
  'Beautiful Rhodes':'https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1/beautiful-rhodes/manifest.json',
  'Soft Piano':'https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1/soft-piano/manifest.json',
  'Modest Wurli':'https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1/modest-wurli/manifest.json',
  'Grand Piano':'https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/skykeys-web-v1/grand-piano/manifest.json'
});

export const SKYKEYS_WEB_EXPECTED_ZONE_COUNTS=Object.freeze({
  'Beautiful Rhodes':13,
  'Soft Piano':84,
  'Modest Wurli':20,
  'Grand Piano':88
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

function absoluteZoneUrl(base,zone){
  const raw=String(zone?.url||zone?.name||'').trim();
  if(!raw)return '';
  try{return new URL(raw,base).href;}catch{return '';}
}

function validateManifest(preset,url,manifest){
  if(!manifest||manifest.preset!==preset)throw new Error(`preset mismatch for ${preset}`);
  if(String(manifest.format||'').toLowerCase()!=='m4a')throw new Error(`unexpected format for ${preset}`);
  const declaredMime=String(manifest.mimeType||manifest.mime||'').toLowerCase();
  if(declaredMime&&!SUPPORTED_MIME_TYPES.has(declaredMime))throw new Error(`unexpected MIME ${declaredMime} for ${preset}`);
  const zones=Array.isArray(manifest.zones)?manifest.zones:[];
  const expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];
  if(zones.length!==expected)throw new Error(`zone count ${zones.length}/${expected} for ${preset}`);
  const seen=new Set(),base=url.slice(0,url.lastIndexOf('/')+1),baseOrigin=new URL(base).origin;
  const normalized=[];
  for(const zone of zones){
    const root=Number(zone?.rootMidi),name=String(zone?.name||''),zoneUrl=absoluteZoneUrl(base,zone);
    if(!Number.isFinite(root)||seen.has(root))throw new Error(`invalid/duplicate root MIDI for ${preset}`);
    if(!/\.m4a$/i.test(name)||!zoneUrl||new URL(zoneUrl).origin!==baseOrigin)throw new Error(`invalid zone URL for ${preset}`);
    seen.add(root);normalized.push({...zone,rootMidi:root,name,url:zoneUrl});
  }
  return normalized;
}

async function fetchManifest(fetchImpl,url,timeoutMs){
  if(typeof AbortController==='undefined')return fetchImpl(url,{cache:'no-store'});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(timeoutMs)||SKYKEYS_WEB_PACK_INFO.manifestTimeoutMs));
  try{return await fetchImpl(url,{cache:'no-store',signal:controller.signal});}
  catch(error){if(error?.name==='AbortError')throw new Error(`manifest timeout after ${timeoutMs}ms`);throw error;}
  finally{clearTimeout(timer);}
}

export async function loadSkyKeysWebPilot(engine,{fetchImpl=globalThis.fetch,timeoutMs=SKYKEYS_WEB_PACK_INFO.manifestTimeoutMs}={}){
  if(!engine?.registerRemotePresetManifest||!engine?.registerPresetSettings)throw new Error('S.K.Y. web pilot requires a compatible sound engine');
  if(typeof fetchImpl!=='function')throw new Error('S.K.Y. web pilot requires fetch');
  const report={status:'loading',loaded:[],failed:[],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount,startedAt:Date.now(),completedAt:null};
  await Promise.all(Object.entries(SKYKEYS_WEB_MANIFEST_URLS).map(async([preset,url])=>{
    const started=Date.now();
    try{
      const response=await fetchManifest(fetchImpl,url,timeoutMs);
      if(!response?.ok)throw new Error(`manifest HTTP ${response?.status??'unavailable'}`);
      const manifest=await response.json(),zones=validateManifest(preset,url,manifest);
      const settings=normalizeWebManifestSettings(manifest.settings||{});
      engine.registerRemotePresetManifest(preset,zones);
      engine.registerPresetSettings(preset,settings);
      report.loaded.push({preset,url,zones:zones.length,format:manifest.format,mimeType:manifest.mimeType||manifest.mime||null,ms:Date.now()-started});
    }catch(error){report.failed.push({preset,url,error:String(error?.message||error),ms:Date.now()-started});}
  }));
  report.loaded.sort((a,b)=>Object.keys(SKYKEYS_WEB_MANIFEST_URLS).indexOf(a.preset)-Object.keys(SKYKEYS_WEB_MANIFEST_URLS).indexOf(b.preset));
  report.failed.sort((a,b)=>Object.keys(SKYKEYS_WEB_MANIFEST_URLS).indexOf(a.preset)-Object.keys(SKYKEYS_WEB_MANIFEST_URLS).indexOf(b.preset));
  report.zones=report.loaded.reduce((sum,item)=>sum+Number(item.zones||0),0);
  report.presetCount=report.loaded.length;
  report.status=report.loaded.length===Object.keys(SKYKEYS_WEB_MANIFEST_URLS).length&&report.zones===SKYKEYS_WEB_PACK_INFO.zoneCount?'ready':report.loaded.length?'partial':'unavailable';
  report.completedAt=Date.now();report.durationMs=report.completedAt-report.startedAt;
  return report;
}

export const SKYKEYS_WEB_PACK_CONTRACT={
  purpose:'Load the four validated AAC-LC/M4A S.K.Y. Keys pilot manifests from Supabase without embedding sample binaries in the application repository.',
  selection:'Sound Direction remains authoritative; loading remote manifests only changes which selected presets have playable S.K.Y. audio.',
  resilience:'Manifest loading is parallel, timeout-bounded, accepts the Safari/Supabase M4A MIME variants, and resolves relative zone URLs only within the same storage origin.',
  fallback:'If a manifest or sample is unavailable, the existing Rhodes safety renderer remains authoritative for audio delivery.',
  invariance:'Remote audio registration cannot mutate harmony, pianist notes, voicings, inversions, timing, velocity, phrase memory or drums.',
  secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'
};