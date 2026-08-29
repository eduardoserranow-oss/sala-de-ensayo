const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const ORNAMENT_ROLES=new Set(['neo-soul-response','keyboard-pickup','ghost-answer','human-phrase-response']);

function hash01(seed=''){
  let h=2166136261;
  for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
}

function globalBarForEvent(event={}){
  return Math.max(1,Math.min(8,Math.floor(Math.max(0,Number(event.startBeat)||0)/4)+1));
}

function emotionString(mood='',filters=[]){return `${String(mood).toLowerCase()} ${(filters||[]).join(' ').toLowerCase()}`;}

function chooseArchetype({seed,mood,emotionFilters,energy}){
  const text=emotionString(mood,emotionFilters);
  const r=hash01(`${seed}|phase5-archetype|${Math.round(energy*100)}|${text}`);
  if(/calm|nostalg|sad|intros/.test(text))return r<0.62?'breath-and-return':'memory-bloom';
  if(/sensual|connection|intim/.test(text))return r<0.56?'memory-bloom':'breath-and-return';
  if(energy>.7)return r<0.58?'pocket-lift':'memory-bloom';
  return r<0.46?'memory-bloom':r<0.76?'breath-and-return':'pocket-lift';
}

function foundationBars({archetype,energy,mood,emotionFilters}){
  const text=emotionString(mood,emotionFilters);
  const soft=/calm|nostalg|sad|intros|sensual/.test(text);
  const energetic=energy>.7;
  const bars={
    1:{stage:'statement',velocityScale:soft?0.96:0.99,sustainScale:1.00,innerDensity:1,ornamentScale:.82,topVoiceScale:1},
    2:{stage:'settle',velocityScale:.99,sustainScale:1.02,innerDensity:1,ornamentScale:.78,topVoiceScale:1},
    3:{stage:'answer-space',velocityScale:1.00,sustainScale:1.04,innerDensity:.96,ornamentScale:.72,topVoiceScale:1.02},
    4:{stage:'breath',velocityScale:.95,sustainScale:.90,innerDensity:.88,ornamentScale:.46,topVoiceScale:.98},
    5:{stage:'remembered-return',velocityScale:.96,sustainScale:1.06,innerDensity:.82,ornamentScale:.38,topVoiceScale:1.01},
    6:{stage:'lift',velocityScale:1.01,sustainScale:1.04,innerDensity:.92,ornamentScale:.64,topVoiceScale:1.05},
    7:{stage:'bloom',velocityScale:1.03,sustainScale:1.08,innerDensity:.94,ornamentScale:.70,topVoiceScale:1.08},
    8:{stage:'loop-home',velocityScale:.95,sustainScale:.86,innerDensity:.82,ornamentScale:.34,topVoiceScale:.98}
  };
  if(archetype==='breath-and-return'){
    bars[4]={...bars[4],innerDensity:.80,ornamentScale:.28,sustainScale:.84};
    bars[5]={...bars[5],velocityScale:.93,innerDensity:.76,ornamentScale:.24,sustainScale:1.10};
    bars[6]={...bars[6],velocityScale:.99,topVoiceScale:1.03};
  }else if(archetype==='pocket-lift'){
    bars[4]={...bars[4],sustainScale:.82};
    bars[6]={...bars[6],velocityScale:1.04,sustainScale:.94,topVoiceScale:1.07};
    bars[7]={...bars[7],velocityScale:1.05,sustainScale:1.00};
    bars[8]={...bars[8],sustainScale:.78};
  }else{
    bars[5]={...bars[5],sustainScale:1.12};
    bars[7]={...bars[7],sustainScale:1.12,topVoiceScale:1.10};
  }
  if(energetic){
    for(const bar of [2,3,6,7])bars[bar]={...bars[bar],velocityScale:bars[bar].velocityScale*1.025,ornamentScale:Math.min(.86,bars[bar].ornamentScale+.08)};
  }
  return bars;
}

function supportBars({archetype,energy,mood,emotionFilters,seed}){
  const text=emotionString(mood,emotionFilters);
  const lateEntry=energy<.52||/calm|nostalg|sad|intros/.test(text)||hash01(`${seed}|support-entry`)<.28;
  const bars={
    1:{stage:'statement-space',active:!lateEntry,velocityScale:.78,sustainScale:.92,entryDelayBeats:lateEntry?0:.08},
    2:{stage:'support-entry',active:true,velocityScale:.84,sustainScale:.98,entryDelayBeats:.06},
    3:{stage:'support-settle',active:true,velocityScale:.88,sustainScale:1.02,entryDelayBeats:.04},
    4:{stage:'support-breath',active:true,velocityScale:.74,sustainScale:.76,entryDelayBeats:.10},
    5:{stage:'a-prime-air',active:true,velocityScale:.82,sustainScale:1.08,entryDelayBeats:.14},
    6:{stage:'support-lift',active:true,velocityScale:.91,sustainScale:1.06,entryDelayBeats:.05},
    7:{stage:'texture-bloom',active:true,velocityScale:1.00,sustainScale:1.14,entryDelayBeats:.02},
    8:{stage:'texture-recede',active:true,velocityScale:.70,sustainScale:.68,entryDelayBeats:.08}
  };
  if(archetype==='breath-and-return'){
    bars[1]={...bars[1],active:false};
    bars[4]={...bars[4],velocityScale:.66,sustainScale:.66};
    bars[5]={...bars[5],entryDelayBeats:.22,velocityScale:.76,sustainScale:1.14};
  }else if(archetype==='pocket-lift'){
    bars[1]={...bars[1],active:true,velocityScale:.82};
    bars[6]={...bars[6],velocityScale:.96,sustainScale:.92};
    bars[7]={...bars[7],velocityScale:1.02,sustainScale:1.02};
    bars[8]={...bars[8],velocityScale:.67,sustainScale:.60};
  }else{
    bars[5]={...bars[5],sustainScale:1.16};
    bars[7]={...bars[7],velocityScale:1.03,sustainScale:1.18};
  }
  return bars;
}

export function buildPhase5ArrangementDirection(arrangement,{
  energyTarget=.62,mood='connection',emotionFilters=[],seed='phase5-arrangement-v1'
}={}){
  const energy=clamp(energyTarget,0,1);
  const sourceSeed=String(seed||arrangement?.performancePattern?.variantSeed||arrangement?.firstPass?.roman?.join('-')||'phase5-arrangement-v1');
  const archetype=chooseArchetype({seed:sourceSeed,mood,emotionFilters,energy});
  return {
    phase:5,version:'1.0',profile:'fortissimo-a-a-prime-arrangement-intelligence-v1',archetype,
    seed:sourceSeed,energy,mood,emotionFilters:[...emotionFilters],
    foundation:{bars:foundationBars({archetype,energy,mood,emotionFilters})},
    support:{bars:supportBars({archetype,energy,mood,emotionFilters,seed:sourceSeed})},
    contract:{
      harmonyInvariant:true,userEditedChordsInvariant:true,midiPitchClassesInvariant:true,
      humanPianistIdentityPreserved:true,foundationSupportOnly:true,hookDormant:true,
      drumsUntouched:true,sharedEightBarClock:true,
      principle:'A states the idea. A′ remembers it, breathes, lifts and returns without decorating weak harmony.'
    }
  };
}

function keepFoundationEvent(event,barRule,direction){
  const role=String(event.role||'');
  if(role==='inner-voice'&&barRule.innerDensity<.999){
    const keep=hash01(`${direction.seed}|foundation-inner|${globalBarForEvent(event)}|${event.chordIndex}|${event.midi}|${event.startBeat}`);
    if(keep>barRule.innerDensity)return false;
  }
  if(ORNAMENT_ROLES.has(role)&&barRule.ornamentScale<.999){
    const keep=hash01(`${direction.seed}|foundation-ornament|${globalBarForEvent(event)}|${event.chordIndex}|${role}|${event.startBeat}`);
    if(keep>barRule.ornamentScale)return false;
  }
  return true;
}

function transformFoundationEvent(event,barRule){
  const role=String(event.role||'');
  const roleScale=role==='top-voice'?barRule.topVoiceScale:role==='inner-voice'?0.96:1;
  const durationRole=role.startsWith('bass')?0.97:1;
  return {
    ...event,
    velocity:Math.round(clamp(Number(event.velocity||1)*barRule.velocityScale*roleScale,1,127)),
    durationBeats:Math.max(.08,Number(event.durationBeats||.5)*barRule.sustainScale*durationRole),
    fingerOffsetSeconds:Math.max(0,Number(event.fingerOffsetSeconds)||0),
    arrangementStage:barRule.stage,
    arrangementPass:globalBarForEvent(event)<=4?'A':'A′',
    arrangementIntelligenceVersion:'Phase5-V1'
  };
}

export function applyPhase5FoundationArrangement(performance,direction){
  if(!performance?.events?.length||!direction?.foundation?.bars)return performance;
  if(performance.arrangementIntelligence?.phase===5)return performance;
  const firstChordCount=Number(performance.firstPass?.voicings?.length||performance.firstPass?.plan?.length||0);
  const transformed=[];
  for(const source of performance.events){
    const bar=globalBarForEvent(source),rule=direction.foundation.bars[bar]||direction.foundation.bars[bar<=4?1:5];
    if(!keepFoundationEvent(source,rule,direction))continue;
    transformed.push(transformFoundationEvent(source,rule));
  }
  const firstEvents=transformed.filter(event=>globalBarForEvent(event)<=4).map(event=>({...event,pass:'A'}));
  const secondEvents=transformed.filter(event=>globalBarForEvent(event)>=5).map(event=>({...event,startBeat:Number(event.startBeat||0)-16,chordIndex:Math.max(0,Number(event.chordIndex||0)-firstChordCount),pass:'A′'}));
  return {
    ...performance,
    events:transformed,
    firstPass:performance.firstPass?{...performance.firstPass,events:firstEvents,arrangementStage:'A · statement'}:performance.firstPass,
    secondPass:performance.secondPass?{...performance.secondPass,events:secondEvents,arrangementStage:'A′ · remembered evolution'}:performance.secondPass,
    arrangementIntelligence:{
      phase:5,version:direction.version,archetype:direction.archetype,
      A:'statement / space / breath',Aprime:'remembered return / lift / bloom / loop-home',
      harmonyMutated:false,pitchesAdded:false,drumsTouched:false
    }
  };
}

export function applyPhase5SupportArrangement(support,direction){
  if(!support?.events?.length||!direction?.support?.bars)return support;
  if(support.arrangementIntelligence?.phase===5)return support;
  const events=[];
  for(const source of support.events){
    const bar=globalBarForEvent(source),rule=direction.support.bars[bar]||direction.support.bars[bar<=4?1:5];
    if(rule.active===false)continue;
    const barStart=(bar-1)*4,barEnd=barStart+4;
    const delayedStart=Math.min(barEnd-.05,Math.max(barStart,Number(source.startBeat||0)+Number(rule.entryDelayBeats||0)));
    const duration=Math.max(.10,Math.min(Number(source.durationBeats||.5)*rule.sustainScale,Math.max(.10,barEnd-delayedStart+.35)));
    events.push({
      ...source,
      startBeat:delayedStart,
      durationBeats:duration,
      velocity:Math.round(clamp(Number(source.velocity||1)*rule.velocityScale,1,127)),
      arrangementStage:rule.stage,
      arrangementPass:bar<=4?'A':'A′',
      arrangementIntelligenceVersion:'Phase5-V1'
    });
  }
  return {
    ...support,
    events,
    arrangementIntelligence:{
      phase:5,version:direction.version,archetype:direction.archetype,
      relationship:'Texture leaves statement space in A, then supports the remembered A′ lift and recedes before the loop returns.',
      foundationCloneForbidden:true,harmonyMutated:false,pitchesAdded:false
    },
    dynamics:{velocityMin:events.length?Math.min(...events.map(event=>event.velocity)):0,velocityMax:events.length?Math.max(...events.map(event=>event.velocity)):0}
  };
}

export const PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO=Object.freeze({
  phase:5,version:'1.0',
  name:'A/A′ Arrangement Intelligence',
  activeRoles:Object.freeze(['foundation','support']),
  hookDormant:true,
  humanPianistPreserved:true,
  harmonyInvariant:true,
  userEditedChordInvariant:true,
  drumsUntouched:true,
  sharedTransportUntouched:true,
  referenceDnaUse:'Reference DNA B1 guides restraint, sustain, phrase breathing, second-pass memory and texture relationship; raw premium assets are not embedded.',
  principle:'A states. A′ remembers, evolves and returns.'
});

if(typeof window!=='undefined')window.__FORTISSIMO_PHASE5_ARRANGEMENT__={
  info:PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO,
  build:buildPhase5ArrangementDirection,
  arrangeFoundation:applyPhase5FoundationArrangement,
  arrangeSupport:applyPhase5SupportArrangement
};
