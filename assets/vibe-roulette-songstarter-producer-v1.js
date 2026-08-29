import { buildSupportPlayerPlan } from './vibe-roulette-support-player-v1.js';
import {
  ROLE_AWARE_PRESET_GROUPS,
  roleDensityPolicy,
  supportPresetPriority,
  layerExportDescriptor
} from './vibe-roulette-role-density-v1.js';
import {
  buildPhase5ArrangementDirection,
  applyPhase5SupportArrangement,
  PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO
} from './vibe-roulette-arrangement-intelligence-v1.js';

const TWO_LAYER_EXPORT_CONTRACT=Object.freeze({
  version:'1.0-two-layer',
  roles:Object.freeze(['foundation','support']),
  midiExport:Object.freeze({
    foundation:'01_Foundation_<S.K.Y.-Preset>.mid',
    support:'02_Support_<S.K.Y.-Preset>.mid',
    metadata:'starter-info.json'
  }),
  hook:'archived/dormant; never generated, played or exported by the active Phase 4.2 Song Starter',
  sourcePolicy:'Derived Reference DNA only; raw premium MIDI/audio is not embedded in the public runtime.'
});

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
  const supportPreset=supportPresetPriority(density)[0];

  const firstSupport=buildSupportPlayerPlan(arrangement.firstPass.chords,{
    roman:arrangement.firstPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
    pass:'A',seed:`${seed}|support|A`,foundationPlan:firstFoundation,densityPolicy:density
  });
  const secondSupportRaw=buildSupportPlayerPlan(arrangement.secondPass.chords,{
    roman:arrangement.secondPass.roman||[],bars:4,beatsPerBar:4,bpm:actualBpm,energyTarget,emotionFilters,mood,
    pass:'A′',seed:`${seed}|support|A-prime`,foundationPlan:secondFoundation,densityPolicy:density
  });
  const secondSupport=offsetPass(secondSupportRaw,{beatOffset:16,chordOffset:arrangement.firstPass.chords.length,pass:'A′'});
  const supportBase=mergePassPlans(firstSupport,secondSupport,'support');
  supportBase.preset=supportPreset;
  supportBase.export=layerExportDescriptor('support',supportPreset);

  const arrangementIntelligence=buildPhase5ArrangementDirection(arrangement,{energyTarget,emotionFilters,mood,seed});
  const support=applyPhase5SupportArrangement(supportBase,arrangementIntelligence);
  support.preset=supportPreset;
  support.export=layerExportDescriptor('support',supportPreset);

  const layers=[
    {
      role:'foundation',player:'Human Pianist V1.3',preset:foundationPreset,active:true,
      events:(foundationPerformance.events||[]).map(event=>({...event,layerRole:'foundation'})),
      export:layerExportDescriptor('foundation',foundationPreset),gainScale:1
    },
    {
      role:'support',player:'Support / Texture Player V1 · Phase 5 arranged',preset:supportPreset,active:true,
      events:support.events,export:support.export,gainScale:0.48
    }
  ];

  return {
    version:'1.2-two-layer-lock',phase:4.2,profile:'fortissimo-songstarter-producer-v1',
    bpm:actualBpm,energy:Number(energyTarget),mood,emotionFilters:[...emotionFilters],seed,
    foundationPreset,supportPreset:support.preset,hookPreset:null,
    density:{...density,maxLayers:2,supportEnabled:true,hookEnabled:false,hookDensity:0},
    support,hook:null,layers,activeLayerCount:2,
    arrangementIntelligence,
    presetGroups:Object.freeze({foundation:ROLE_AWARE_PRESET_GROUPS.foundation,support:ROLE_AWARE_PRESET_GROUPS.support}),
    archivedHookPresets:[...ROLE_AWARE_PRESET_GROUPS.hook],
    exportContract:TWO_LAYER_EXPORT_CONTRACT,
    exportFiles:layers.map(layer=>layer.export.filename),
    metadataFile:'starter-info.json',
    contract:{
      foundationPerformanceUnchanged:true,
      separateMidiPerLayer:true,
      sharedHarmony:true,
      sharedTransport:true,
      maxMusicalLayers:2,
      activeRoles:['foundation','support'],
      supportAlwaysActive:true,
      hookDormant:true,
      drumsSeparateSharedClock:true,
      phase5ArrangementEvolutionDeferred:false,
      phase5ArrangementEvolutionActive:true,
      phase5ArrangementVersion:PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.version,
      phase6ExportAvailable:true,
      harmonyInvariant:true,
      userEditedChordInvariant:true,
      rawReferenceAssetsEmbedded:false
    }
  };
}

export const SONG_STARTER_PRODUCER_V1_INFO=Object.freeze({
  version:'1.2-two-layer-lock',phase:4.2,
  architecture:'Foundation + Support/Texture + existing Afro drums',
  foundationPresets:[...ROLE_AWARE_PRESET_GROUPS.foundation],
  supportPresets:[...ROLE_AWARE_PRESET_GROUPS.support],
  archivedHookPresets:[...ROLE_AWARE_PRESET_GROUPS.hook],
  activeRoles:['foundation','support'],
  supportAlwaysActive:true,
  hookDormant:true,
  maxMusicalLayers:2,
  separateMidiPerLayer:true,
  visualLayerPianoRollsRequired:false,
  phase5ArrangementEvolutionDeferred:false,
  phase5ArrangementEvolutionActive:true,
  phase5ArrangementVersion:PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.version,
  phase6ExportAvailable:true
});

export const SONG_STARTER_PHASE5_ARRANGEMENT_INFO=PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO;

// Browser-only activation is deferred one task so the existing S.K.Y. and transport
// wrappers finish installing first. The Phase 5 wrapper then sits outside them and
// reshapes only performance dynamics/density before decoding; Node tests stay cycle-free.
// Phase 6 export is loaded after the same task and never patches the playback chain.
if(typeof window!=='undefined'){
  window.setTimeout(()=>{
    import('./vibe-roulette-arrangement-runtime-v1.js').catch(error=>console.warn('Phase 5 arrangement runtime unavailable',error));
    import('./vibe-roulette-songstarter-export-v1.js').catch(error=>console.warn('Phase 6 Song Starter export unavailable',error));
  },0);
}