export const SKYKEYS_WEB_PACK_INFO={
  version:'1.0.0-pilot',
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

function validateManifest(preset,url,manifest){
  if(!manifest||manifest.preset!==preset)throw new Error(`preset mismatch for ${preset}`);
  if(String(manifest.format||'').toLowerCase()!=='m4a')throw new Error(`unexpected format for ${preset}`);
  if(String(manifest.mimeType||'').toLowerCase()!=='audio/mp4')throw new Error(`unexpected MIME for ${preset}`);
  const zones=Array.isArray(manifest.zones)?manifest.zones:[];
  const expected=SKYKEYS_WEB_EXPECTED_ZONE_COUNTS[preset];
  if(zones.length!==expected)throw new Error(`zone count ${zones.length}/${expected} for ${preset}`);
  const seen=new Set(),base=url.slice(0,url.lastIndexOf('/')+1);
  for(const zone of zones){
    const root=Number(zone?.rootMidi),name=String(zone?.name||''),zoneUrl=String(zone?.url||'');
    if(!Number.isFinite(root)||seen.has(root))throw new Error(`invalid/duplicate root MIDI for ${preset}`);
    if(!/\.m4a$/i.test(name)||!zoneUrl.startsWith(base)||!/^https:\/\//i.test(zoneUrl))throw new Error(`invalid zone URL for ${preset}`);
    seen.add(root);
  }
  return zones;
}

export async function loadSkyKeysWebPilot(engine,{fetchImpl=globalThis.fetch}={}){
  if(!engine?.registerRemotePresetManifest||!engine?.registerPresetSettings)throw new Error('S.K.Y. web pilot requires a compatible sound engine');
  if(typeof fetchImpl!=='function')throw new Error('S.K.Y. web pilot requires fetch');
  const report={status:'loading',loaded:[],failed:[],zones:0,presetCount:0,expectedZones:SKYKEYS_WEB_PACK_INFO.zoneCount};
  for(const [preset,url] of Object.entries(SKYKEYS_WEB_MANIFEST_URLS)){
    try{
      const response=await fetchImpl(url,{cache:'no-store'});
      if(!response?.ok)throw new Error(`manifest HTTP ${response?.status??'unavailable'}`);
      const manifest=await response.json(),zones=validateManifest(preset,url,manifest);
      const settings=normalizeWebManifestSettings(manifest.settings||{});
      engine.registerRemotePresetManifest(preset,zones);
      engine.registerPresetSettings(preset,settings);
      report.loaded.push({preset,url,zones:zones.length,format:manifest.format,mimeType:manifest.mimeType});
      report.zones+=zones.length;
    }catch(error){report.failed.push({preset,url,error:String(error?.message||error)});}
  }
  report.presetCount=report.loaded.length;
  report.status=report.loaded.length===Object.keys(SKYKEYS_WEB_MANIFEST_URLS).length&&report.zones===SKYKEYS_WEB_PACK_INFO.zoneCount?'ready':report.loaded.length?'partial':'unavailable';
  return report;
}

export const SKYKEYS_WEB_PACK_CONTRACT={
  purpose:'Load the four validated AAC-LC/M4A S.K.Y. Keys pilot manifests from Supabase without embedding sample binaries in the application repository.',
  selection:'Sound Direction remains authoritative; loading remote manifests only changes which selected presets have playable S.K.Y. audio.',
  fallback:'If a manifest or sample is unavailable, the existing Rhodes safety renderer remains authoritative for audio delivery.',
  invariance:'Remote audio registration cannot mutate harmony, pianist notes, voicings, inversions, timing, velocity, phrase memory or drums.',
  secretPolicy:'No Supabase service-role key is present or required in frontend runtime code.'
};
