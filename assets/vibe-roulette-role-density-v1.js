import { buildSerraEmotionProfile } from './vibe-roulette-serra-emotion-v1.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));

export const ROLE_AWARE_PRESET_GROUPS=Object.freeze({
  foundation:Object.freeze(['About Time','Beautiful Rhodes','Soft Piano','Modest Wurli','Grand Piano']),
  support:Object.freeze(['Always Danger','Broad Texture']),
  hook:Object.freeze(['Hidden Whistle','Toy Piano','Warm Pluck'])
});

export const SONG_STARTER_ROLE_CONTRACT_V1=Object.freeze({
  version:'1.0-role-aware',
  roles:Object.freeze(['foundation','support','hook']),
  rule:'Each player shares harmony and transport, but composes a different MIDI role. Support/Hook must never clone the Foundation performance.',
  display:'Layer details may stay compact/hidden in the UI.',
  midiExport:Object.freeze({
    foundation:'01_Foundation_<S.K.Y.-Preset>.mid',
    support:'02_Support_<S.K.Y.-Preset>.mid',
    hook:'03_Hook_<S.K.Y.-Preset>.mid',
    metadata:'starter-info.json'
  }),
  sourcePolicy:'Derived Reference DNA only; raw premium MIDI/audio is not embedded in the public runtime.'
});

export function roleDensityPolicy({
  energyTarget=0.62,
  emotionFilters=[],
  mood='connection',
  foundationEventCount=16,
  chordCount=4
}={}){
  const energy=clamp(energyTarget,0,1);
  const profile=buildSerraEmotionProfile(emotionFilters,mood);
  const vector=profile.vector||{};
  const perChord=Math.max(0,Number(foundationEventCount)||0)/Math.max(1,Number(chordCount)||1);
  const foundationDensity=clamp((perChord-2.5)/5.5,0,1);
  const supportDensity=clamp(
    0.40+(vector.space??0.5)*0.22+(vector.intimacy??0.5)*0.12-foundationDensity*0.28-energy*0.05,
    0.18,0.72
  );
  const hookDensity=clamp(
    0.14+energy*0.42+(vector.brightness??0.5)*0.10+(vector.tension??0.5)*0.06-(vector.space??0.5)*0.08-foundationDensity*0.10,
    0.10,0.72
  );
  const veryOpen=(vector.space??0.5)>0.72&&energy<0.48;
  const maxLayers=energy<0.32||veryOpen?2:3;
  const supportEnabled=supportDensity>=0.24;
  const hookEnabled=maxLayers>=3&&hookDensity>=0.22;
  return {
    version:'1.0',energy,profile,foundationDensity,supportDensity,hookDensity,maxLayers,
    supportEnabled,hookEnabled,
    collisionRules:Object.freeze({
      foundation:'authoritative harmony/voice-leading layer',
      support:'prefer non-root upper harmony, common tones, sparse dyads and late entries; reduce density when Foundation is busy',
      hook:'prefer upper-register motifs/ostinatos/phrase responses; leave chord attacks and vocal center unobstructed',
      all:'same BPM/bar grid; independent MIDI events; no full-performance duplication'
    })
  };
}

export function supportPresetPriority(policy={}){
  const vector=policy.profile?.vector||{};
  const intimate=(vector.intimacy??0.5)>0.60;
  const tense=(vector.tension??0.5)>0.58;
  const spacious=(vector.space??0.5)>0.60;
  if(intimate||tense)return ['Always Danger','Broad Texture'];
  if(spacious)return ['Broad Texture','Always Danger'];
  return ['Broad Texture','Always Danger'];
}

export function hookPresetPriority(policy={}){
  const vector=policy.profile?.vector||{};
  const filters=new Set(policy.profile?.filters||[]);
  const nostalgic=['sadness','melancholy','vulnerability','grief','disillusionment','introspection'].some(id=>filters.has(id));
  if(nostalgic)return ['Toy Piano','Hidden Whistle','Warm Pluck'];
  if(policy.energy>=0.62)return ['Warm Pluck','Hidden Whistle','Toy Piano'];
  if((vector.brightness??0.5)>=0.58)return ['Hidden Whistle','Warm Pluck','Toy Piano'];
  return ['Toy Piano','Warm Pluck','Hidden Whistle'];
}

export function layerExportDescriptor(role,preset='<S.K.Y.-Preset>'){
  const title=role==='foundation'?'Foundation':role==='support'?'Support':'Hook';
  const index=role==='foundation'?'01':role==='support'?'02':'03';
  const safePreset=String(preset||'<S.K.Y.-Preset>').replace(/\s+/g,'-').replace(/[^A-Za-z0-9_.<>-]/g,'');
  return {
    layerRole:role,
    preset:String(preset),
    filename:`${index}_${title}_${safePreset}.mid`,
    hiddenUiAllowed:true,
    exportRequiredWhenActive:true
  };
}

export const ROLE_DENSITY_V1_INFO=Object.freeze({
  version:'1.0',
  phase:'Song Starter Phase 3',
  bodyEnergyIndependent:true,
  emotionAware:true,
  foundationUntouched:true,
  drumsUntouched:true,
  skyKeysRuntimeWiringDeferredToPhase4:true
});
