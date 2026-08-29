import { buildNeoSoulRhodesPlan } from './vibe-roulette-neo-soul-player-v12.js';
import { buildSupportPlayerPlan } from './vibe-roulette-support-player-v1.js';
import { buildHookPlayerPlan } from './vibe-roulette-hook-player-v1.js';
import {
  ROLE_AWARE_PRESET_GROUPS,
  SONG_STARTER_ROLE_CONTRACT_V1,
  roleDensityPolicy,
  layerExportDescriptor
} from './vibe-roulette-role-density-v1.js';

function tagLayer(plan,layerRole){
  if(!plan)return null;
  return {...plan,layerRole,events:(plan.events||[]).map(event=>({...event,layerRole}))};
}

export function buildRoleAwarePlayersPlan(chords,options={}){
  const roman=options.roman||[];
  const foundationRaw=buildNeoSoulRhodesPlan(chords,options);
  const foundation=tagLayer(foundationRaw,'foundation');
  const density=roleDensityPolicy({
    energyTarget:options.energyTarget,
    emotionFilters:options.emotionFilters||[],
    mood:options.mood||'connection',
    foundationEventCount:foundation.events.length,
    chordCount:foundation.plan?.length||chords.length
  });

  let support=null,hook=null;
  if(density.maxLayers===2){
    if(density.supportDensity>=density.hookDensity&&density.supportEnabled){
      support=buildSupportPlayerPlan(chords,{...options,roman,foundationPlan:foundation,densityPolicy:density,seed:`${options.seed||'songstarter'}|support`});
    }else if(density.hookDensity>density.supportDensity){
      hook=buildHookPlayerPlan(chords,{...options,roman,foundationPlan:foundation,densityPolicy:density,seed:`${options.seed||'songstarter'}|hook`});
    }
  }else{
    if(density.supportEnabled)support=buildSupportPlayerPlan(chords,{...options,roman,foundationPlan:foundation,densityPolicy:density,seed:`${options.seed||'songstarter'}|support`});
    if(density.hookEnabled)hook=buildHookPlayerPlan(chords,{...options,roman,foundationPlan:foundation,densityPolicy:density,seed:`${options.seed||'songstarter'}|hook`});
  }

  const layers=[
    {
      role:'foundation',player:'Human Pianist V1.3',active:true,plan:foundation,
      presetCandidates:[...ROLE_AWARE_PRESET_GROUPS.foundation],export:layerExportDescriptor('foundation')
    },
    ...(support?[{role:'support',player:'Support / Texture Player V1',active:true,plan:support,presetCandidates:[...support.suggestedPresets],export:layerExportDescriptor('support',support.suggestedPresets[0])}]:[]),
    ...(hook?[{role:'hook',player:'Hook Player V1',active:true,plan:hook,presetCandidates:[...hook.suggestedPresets],export:layerExportDescriptor('hook',hook.selectedPresetHint||hook.suggestedPresets[0])}]:[])
  ];

  return {
    version:'1.0',profile:'fortissimo-songstarter-role-aware-players-v1',phase:3,
    bpm:Number(options.bpm||100),energy:Number(options.energyTarget??0.62),mood:options.mood||'connection',emotionFilters:[...(options.emotionFilters||[])],
    foundation,support,hook,layers,density,
    exportContract:SONG_STARTER_ROLE_CONTRACT_V1,
    runtimeIntegration:{
      currentVibeRoulettePlaybackUntouched:true,
      skyKeysMultilayerPlayback:'deferred-to-phase4',
      midiZipExport:'contract-prepared; implementation deferred until generated multilayer playback exists',
      drumsUntouched:true
    },
    sourcePolicy:'Derived/transposable Reference DNA B1 only; no premium source MIDI/audio embedded.'
  };
}

export const ROLE_AWARE_PLAYERS_V1_INFO=Object.freeze({
  version:'1.0',phase:3,
  players:['Human Pianist V1.3 Foundation','Support / Texture Player V1','Hook Player V1'],
  foundationPresets:[...ROLE_AWARE_PRESET_GROUPS.foundation],
  supportPresets:[...ROLE_AWARE_PRESET_GROUPS.support],
  hookPresets:[...ROLE_AWARE_PRESET_GROUPS.hook],
  composition:'shared harmony + separate role-aware MIDI',
  runtimeWiringDeferredToPhase4:true,
  exportPrepared:true
});
