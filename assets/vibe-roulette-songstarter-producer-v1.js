import { buildSupportPlayerPlan } from './vibe-roulette-support-player-v1.js';
import { buildHookPlayerPlan } from './vibe-roulette-hook-player-v1.js';
import {
  ROLE_AWARE_PRESET_GROUPS,
  SONG_STARTER_ROLE_CONTRACT_V1,
  roleDensityPolicy,
  supportPresetPriority,
  hookPresetPriority,
  layerExportDescriptor
} from './vibe-roulette-role-density-v1.js';

function offsetPass(plan,{beatOffset=0,chordOffset=0,pass='A'}={}){
  if(!plan)return null;
  return {
    ...plan,
    pass,
    events:(plan.events||[]).map(event=>({
      ...event,
      startBeat:Number(event.startBeat||0)+beatOffset,
      chordIndex:Number(event.chordIndex||0)+chordOffset,
      pass
    }))
  };
}

function mergePassPlans(first,second,layerRole){
  if(!first&&!second)return null;
  const events=[...(first?.events||[]),...(second?.events||[])];
  return {
    version:'1.0',
    profile:`fortissimo-songstarter-${layerRole}-eightbar-v1`,
    layerRole,
    events,
    firstPass:first,
    secondPass:second,
    dynamics:{
      velocityMin:events.length?Math.min(...events.map(event=>Number(event.velocity||0))):0,
      velocityMax:events.length?Math.max(...events.map(event=>Number(event.velocity||0))):0
    }
  };
}

function chooseLayerSet(density){
  if(density.maxLayers<=2){
    if(density.supportEnabled&&density.supportDensity>=density.hookDensity)return {support:true,hook:false};
    if(density.hookDensity>density.supportDensity)return {support:false,hook:true};
    return {support:Boolean(density.supportEnabled),hook:false};
  }
  return {support:Boolean(density.supportEnabled),hook:Boolean(density.hookEnabled)};
}

export function buildSongStarterProducerPlan(arrangement,{
  foundationPerformance=null,
  foundationPreset='Beautiful Rhodes',
  bpm=null,
  energyTarget=0.62,
  emotionFilters=[],
  mood='connection',
  seed='songstarter-producer-v1'
}={}){
  if(!arrangement?.firstPass?.chords?.length||!arrangement?.secondPass?.chords?.length)throw new Error('Song Starter Producer needs an 8-bar A/A-prime arrangement.');
  if(!foundationPerformance?.events?.length)throw new Error('Song Starter Producer needs the existing Foundation performance.');

  const actualBpm=Number(bpm||foundationPerformance.bpm||arrangement.bpm||100);
  const firstFoundation=foundationPerformance.firstPass||null;
  const secondFoundation=foundationPerformance.secondPass||null;
  const chordCount=(arrangement.firstPass.chords?.length||0)+(arrangement.secondPass.chords?.length||0);
  const density=roleDensityPolicy({
    energyTarget,
    emotionFilters,
    mood,
    foundationEventCount:foundationPerformance.events.length,
    chordCount
  });
  const active=chooseLayerSet(density);
  const supportPreset=supportPresetPriority(density)[0];
  const hookPreset=hookPresetPriority(density)[0];

  let support=null,hook=null;
  if(active.support){
    const first=buildSupportPlayerPlan(arrangement.firstPass.chords,{
      roman:arrangement.firstPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
      pass:'A',seed:`${seed}|support|A`,foundationPlan:firstFoundation,densityPolicy:density
    });
    const secondRaw=buildSupportPlayerPlan(arrangement.secondPass.chords,{
      roman:arrangement.secondPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
      pass:'A′',seed:`${seed}|support|A-prime`,foundationPlan:secondFoundation,densityPolicy:density
    });
    const second=offsetPass(secondRaw,{beatOffset:16,chordOffset:arrangement.firstPass.chords.length,pass:'A′'});
    support=mergePassPlans(first,second,'support');
    support.preset=supportPreset;
    support.export=layerExportDescriptor('support',supportPreset);
  }

  if(active.hook){
    const first=buildHookPlayerPlan(arrangement.firstPass.chords,{
      roman:arrangement.firstPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
      pass:'A',seed:`${seed}|hook|A`,foundationPlan:firstFoundation,densityPolicy:density,presetHint:hookPreset
    });
    const secondRaw=buildHookPlayerPlan(arrangement.secondPass.chords,{
      roman:arrangement.secondPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
      pass:'A′',seed:`${seed}|hook|A-prime`,foundationPlan:secondFoundation,densityPolicy:density,presetHint:hookPreset
    });
    const second=offsetPass(secondRaw,{beatOffset:16,chordOffset:arrangement.firstPass.chords.length,pass:'A′'});
    hook=mergePassPlans(first,second,'hook');
    hook.preset=hookPreset;
    hook.export=layerExportDescriptor('hook',hookPreset);
  }

  const layers=[
    {
      role:'foundation',player:'Human Pianist V1.3',preset:foundationPreset,active:true,
      events:(foundationPerformance.events||[]).map(event=>({...event,layerRole:'foundation'})),
      export:layerExportDescriptor('foundation',foundationPreset),gainScale:1
    },
    ...(support?[{
      role:'support',player:'Support / Texture Player V1',preset:supportPreset,active:true,
      events:support.events,export:support.export,gainScale:0.48
    }]:[]),
    ...(hook?[{
      role:'hook',player:'Hook Player V1',preset:hookPreset,active:true,
      events:hook.events,export:hook.export,gainScale:0.62
    }]:[])
  ];

  return {
    version:'1.0',phase:4,profile:'fortissimo-songstarter-producer-v1',
    bpm:actualBpm,energy:Number(energyTarget),mood,emotionFilters:[...emotionFilters],seed,
    foundationPreset,supportPreset:support?.preset||null,hookPreset:hook?.preset||null,
    density,support,hook,layers,activeLayerCount:layers.length,
    presetGroups:ROLE_AWARE_PRESET_GROUPS,
    exportContract:SONG_STARTER_ROLE_CONTRACT_V1,
    exportFiles:layers.map(layer=>layer.export.filename),
    metadataFile:'starter-info.json',
    contract:{
      foundationPerformanceUnchanged:true,
      separateMidiPerLayer:true,
      sharedHarmony:true,
      sharedTransport:true,
      maxMusicalLayers:3,
      drumsSeparateSharedClock:true,
      phase5ArrangementEvolutionDeferred:true,
      rawReferenceAssetsEmbedded:false
    }
  };
}

export const SONG_STARTER_PRODUCER_V1_INFO=Object.freeze({
  version:'1.0',phase:4,
  architecture:'Foundation + optional Support/Texture + optional Hook + existing Afro drums',
  foundationPresets:[...ROLE_AWARE_PRESET_GROUPS.foundation],
  supportPresets:[...ROLE_AWARE_PRESET_GROUPS.support],
  hookPresets:[...ROLE_AWARE_PRESET_GROUPS.hook],
  maxMusicalLayers:3,
  separateMidiPerLayer:true,
  visualLayerPianoRollsRequired:false,
  phase5ArrangementEvolutionDeferred:true
});
