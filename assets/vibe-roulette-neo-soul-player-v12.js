import { buildNeoSoulRhodesPlan as buildV11, velocityToGain as velocityToGainV11 } from './vibe-roulette-neo-soul-player-v11.js';
import { afroPocketPolicy } from './vibe-roulette-afro-language-v12.js';
import { serraPerformanceDirection } from './vibe-roulette-serra-emotion-v1.js';
import {
  HUMAN_PERFORMANCE_DNA_B1,
  chooseHumanGestureB1,
  humanVoiceVelocityB1,
  humanOffsetSecondsB1,
  shouldHoldCommonToneB1
} from './vibe-roulette-human-performance-dna-b1.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const chordKey=(value='')=>String(value).replace(/\s+/g,'').toLowerCase();
const firstPassMemory=new Map();
const CORE_ROLES=new Set(['top-voice','inner-voice','bass-root','bass-tenth']);
const ORNAMENT_ROLES=new Set(['neo-soul-response','keyboard-pickup','ghost-answer','human-phrase-response']);

function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}

function applyAfroPocket(plan,options={}){
  const basePolicy=afroPocketPolicy(options);
  const emotional=serraPerformanceDirection(options.emotionFilters||[],options.mood||'connection');
  const policy={...basePolicy,sustainRatio:Math.max(basePolicy.sustainRatio,emotional.sustainRatio),maxOrnamentsPerChord:Math.max(basePolicy.maxOrnamentsPerChord,emotional.ornamentAllowance),emotionalDirection:emotional};
  const itemByChord=new Map((plan.plan||[]).map((item,index)=>[index,item]));
  const ornamentCount=new Map();
  const events=[];
  for(const source of plan.events||[]){
    const event={...source};
    const item=itemByChord.get(event.chordIndex);
    const ornament=event.role==='neo-soul-response'||event.role==='keyboard-pickup'||event.role==='ghost-answer';
    if(policy.leftHandMode==='roots-only'&&event.role==='bass-tenth')continue;
    if(ornament){
      const count=ornamentCount.get(event.chordIndex)||0;
      if(count>=policy.maxOrnamentsPerChord)continue;
      ornamentCount.set(event.chordIndex,count+1);
      if(event.role==='keyboard-pickup'&&policy.pickupProbability<0.16)continue;
    }
    if(item&&CORE_ROLES.has(event.role)){
      const span=Number(item.beats)||4;
      const ratio=event.role.startsWith('bass')?policy.bassSustainRatio:policy.sustainRatio;
      event.durationBeats=Math.max(0.24,Math.min(Number(event.durationBeats)||span,span*ratio));
      event.releaseTailSeconds=policy.archetype==='staggered-stabs'?0.07:0.10;
      event.continuityIntent=policy.archetype;
      if(event.role==='top-voice')event.velocity=Math.round(event.velocity*policy.topVoiceAccent);
      if(event.role==='inner-voice')event.velocity=Math.round(event.velocity*policy.innerVoiceScale);
      event.velocity=Math.round(event.velocity*emotional.velocityScale);
      event.fingerOffsetSeconds=(Number(event.fingerOffsetSeconds)||0)+(event.chordIndex%2?0.005:0);
    }
    event.velocity=Math.round(clamp(event.velocity,1,127));
    events.push(event);
  }
  return {...plan,profile:'fortissimo-neo-soul-player-v1.2-memory',style:`FORTISSIMO Neo-Soul Player V1.2 · ${policy.archetype}`,events,afroPocket:policy,discipline:{...plan.discipline,principle:'Afrobeats harmony first · Neo-Soul musicianship second · vocal/song space always',continuity:'phrase-specific sustain, intentional release, phrase memory and room for voice, bass and drums',leftHand:policy.leftHandMode,archetype:policy.archetype},dynamics:{velocityMin:events.length?Math.min(...events.map(event=>event.velocity)):0,velocityMax:events.length?Math.max(...events.map(event=>event.velocity)):0}};
}

function inheritFirstPassMemory(plan,firstPass){
  if(!firstPass?.voicings?.length)return plan;
  const firstByChord=new Map();
  firstPass.voicings.forEach((v,index)=>{const key=chordKey(v.chord);if(key&&!firstByChord.has(key))firstByChord.set(key,{index,voicing:v});});
  const remembered=new Map();
  const voicings=(plan.voicings||[]).map((v,index)=>{
    const source=firstByChord.get(chordKey(v.chord));
    if(!source)return {...v};
    remembered.set(index,source);
    return {...v,left:[...(source.voicing.left||v.left||[])],right:[...(source.voicing.right||v.right||[])]};
  });
  if(!remembered.size)return plan;
  const events=(plan.events||[]).map(event=>{
    const source=remembered.get(event.chordIndex);
    if(!source)return {...event};
    const target=voicings[event.chordIndex];
    const out={...event,phraseMemorySource:`A:${source.index}`,memoryStrength:0.88};
    if(event.role==='bass-root')out.midi=target.left?.[0]??event.midi;
    else if(event.role==='bass-tenth')out.midi=target.left?.[1]??event.midi;
    else if(event.role==='top-voice')out.midi=target.right?.at(-1)??event.midi;
    else if(event.role==='inner-voice'){
      const pool=(target.right||[]).slice(0,-1);
      if(pool.length)out.midi=pool.reduce((best,n)=>Math.abs(n-event.midi)<Math.abs(best-event.midi)?n:best,pool[0]);
    }
    if(CORE_ROLES.has(event.role))out.velocity=clamp(Math.round(event.velocity*0.98),1,127);
    return out;
  });
  const ornamentSeen=new Set();
  const filtered=events.filter(event=>{
    if(!remembered.has(event.chordIndex))return true;
    if(!['neo-soul-response','keyboard-pickup','ghost-answer'].includes(event.role))return true;
    if(ornamentSeen.has(event.chordIndex))return false;
    ornamentSeen.add(event.chordIndex);return true;
  });
  return {...plan,voicings,events:filtered,phraseMemory:{...(plan.phraseMemory||{}),crossPassReturns:remembered.size,crossPassStrength:0.88,policy:'A = statement; A′ = remembered phrase + restrained evolution',topLine:'stable on returning harmony'}};
}

function chordEventIndexes(events){
  const byChord=new Map();
  events.forEach((event,index)=>{
    if(!Number.isFinite(Number(event.chordIndex)))return;
    if(!byChord.has(event.chordIndex))byChord.set(event.chordIndex,[]);
    byChord.get(event.chordIndex).push(index);
  });
  return byChord;
}

function applyHumanPerformanceDNA(plan,options={}){
  const bpm=Math.max(40,Number(options.bpm)||100);
  const energy=clamp(Number(options.energyTarget??0.62),0,1);
  const mood=options.mood||'connection',pass=options.pass||'A',seed=String(options.seed||'human-pianist-v13');
  const sourceEvents=(plan.events||[]).map((event,index)=>({...event,__dnaIndex:index}));
  const byChord=chordEventIndexes(sourceEvents);
  const chordIndexes=[...byChord.keys()].sort((a,b)=>a-b);
  const itemByChord=new Map((plan.plan||[]).map((item,index)=>[index,item]));
  const gestures=new Map();
  const skipIndexes=new Set();
  const holdSourceIndexes=new Map();

  for(const chordIndex of chordIndexes){
    gestures.set(chordIndex,chooseHumanGestureB1({seed,chordIndex,energy,mood,pass}));
  }

  // Data-derived common-tone legato: hold at most one right-hand note across
  // each adjacent harmonic boundary, then avoid re-striking that exact voice.
  for(let pos=0;pos<chordIndexes.length-1;pos+=1){
    const chordIndex=chordIndexes[pos],nextChordIndex=chordIndexes[pos+1];
    const currentIndexes=(byChord.get(chordIndex)||[]).filter(i=>['inner-voice','top-voice'].includes(sourceEvents[i].role));
    const nextIndexes=(byChord.get(nextChordIndex)||[]).filter(i=>['inner-voice','top-voice'].includes(sourceEvents[i].role));
    const nextByMidi=new Map(nextIndexes.map(i=>[sourceEvents[i].midi,i]));
    const common=currentIndexes.filter(i=>nextByMidi.has(sourceEvents[i].midi)).sort((a,b)=>sourceEvents[b].midi-sourceEvents[a].midi);
    if(!common.length)continue;
    const chosen=common.find(i=>shouldHoldCommonToneB1({seed,chordIndex,midi:sourceEvents[i].midi,energy}));
    if(chosen===undefined)continue;
    const nextIndex=nextByMidi.get(sourceEvents[chosen].midi);
    const nextStart=Math.min(...(byChord.get(nextChordIndex)||[]).map(i=>Number(sourceEvents[i].startBeat)||0));
    const nextSpan=Number(itemByChord.get(nextChordIndex)?.beats)||4;
    holdSourceIndexes.set(chosen,{nextStart,nextSpan});
    skipIndexes.add(nextIndex);
  }

  const events=[];
  for(const source of sourceEvents){
    if(skipIndexes.has(source.__dnaIndex))continue;
    const event={...source};
    const chordIndexesForRole=(byChord.get(event.chordIndex)||[]).filter(i=>sourceEvents[i].role===event.role).sort((a,b)=>sourceEvents[a].midi-sourceEvents[b].midi);
    const voiceIndex=Math.max(0,chordIndexesForRole.indexOf(event.__dnaIndex));
    const voiceCount=Math.max(1,chordIndexesForRole.length);
    const gesture=gestures.get(event.chordIndex);

    event.humanGesture=gesture?.id||'near-simultaneous';
    event.humanDnaVersion='B1';
    event.velocity=humanVoiceVelocityB1({velocity:event.velocity,role:event.role,voiceIndex,voiceCount,seed,chordIndex:event.chordIndex,energy});
    if(CORE_ROLES.has(event.role)){
      const dnaOffset=humanOffsetSecondsB1({gesture,role:event.role,voiceIndex,voiceCount,bpm,seed,chordIndex:event.chordIndex});
      const legacyOffset=Math.max(0,Number(event.fingerOffsetSeconds)||0);
      event.fingerOffsetSeconds=Math.max(legacyOffset*0.55,dnaOffset);
      const releaseShade=0.86+hash01(`${seed}|release-b1|${event.chordIndex}|${event.role}|${voiceIndex}`)*0.28;
      if(event.role==='inner-voice')event.durationBeats=Math.max(0.12,Number(event.durationBeats||0.5)*releaseShade);
      else if(event.role==='top-voice')event.durationBeats=Math.max(0.16,Number(event.durationBeats||0.5)*(0.95+0.16*hash01(`${seed}|top-release|${event.chordIndex}`)));
      else event.durationBeats=Math.max(0.14,Number(event.durationBeats||0.5)*(0.92+0.10*hash01(`${seed}|bass-release|${event.chordIndex}`)));
      event.releaseTailSeconds=Math.max(Number(event.releaseTailSeconds)||0.06,0.07+0.12*hash01(`${seed}|tail-b1|${event.chordIndex}|${event.role}|${voiceIndex}`));
    }else if(ORNAMENT_ROLES.has(event.role)){
      event.fingerOffsetSeconds=Math.max(0,Number(event.fingerOffsetSeconds)||0);
      event.releaseTailSeconds=Math.max(0.05,Number(event.releaseTailSeconds)||0.05);
    }

    const hold=holdSourceIndexes.get(event.__dnaIndex);
    if(hold){
      const targetDuration=Math.max(0.2,hold.nextStart-(Number(event.startBeat)||0)+hold.nextSpan*(0.30+0.20*(1-energy)));
      event.durationBeats=Math.max(Number(event.durationBeats)||0,targetDuration);
      event.releaseTailSeconds=Math.max(Number(event.releaseTailSeconds)||0,0.12);
      event.continuityIntent='human-common-tone-hold';
      event.commonToneHeld=true;
    }
    delete event.__dnaIndex;
    events.push(event);
  }

  // Sparse phrase-end response: reuse only a pitch already present in the
  // current voicing, so Human DNA cannot introduce an unsafe pitch class.
  if(chordIndexes.length){
    const lastChordIndex=chordIndexes.at(-1);
    const lastIndexes=byChord.get(lastChordIndex)||[];
    const lastStart=Math.min(...lastIndexes.map(i=>Number(sourceEvents[i].startBeat)||0));
    const span=Number(itemByChord.get(lastChordIndex)?.beats)||4;
    const phraseEnd=lastStart+span;
    const existingLate=events.some(event=>event.chordIndex===lastChordIndex&&ORNAMENT_ROLES.has(event.role)&&Number(event.startBeat)>=phraseEnd-1.05);
    const allowResponse=!existingLate&&hash01(`${seed}|phrase-response-b1|${pass}`)<(0.42+energy*0.16);
    const right=[...(plan.voicings?.[lastChordIndex]?.right||[])];
    if(allowResponse&&right.length){
      const midi=right[Math.max(0,right.length-1-(hash01(`${seed}|response-note-b1|${pass}`)<0.38?1:0))];
      events.push({
        midi,velocity:humanVoiceVelocityB1({velocity:48,role:'human-phrase-response',voiceIndex:0,voiceCount:1,seed,chordIndex:lastChordIndex,energy}),
        startBeat:Math.max(lastStart+0.25,phraseEnd-(0.42+0.24*hash01(`${seed}|response-start-b1|${pass}`))),
        durationBeats:0.18+0.22*hash01(`${seed}|response-duration-b1|${pass}`),
        fingerOffsetSeconds:0,releaseTailSeconds:0.07,role:'human-phrase-response',chordIndex:lastChordIndex,
        humanGesture:'phrase-end-response',humanDnaVersion:'B1',continuityIntent:'human-phrase-response'
      });
    }
  }

  events.sort((a,b)=>Number(a.startBeat)-Number(b.startBeat)||Number(a.fingerOffsetSeconds||0)-Number(b.fingerOffsetSeconds||0)||Number(a.midi)-Number(b.midi));
  const heldCommonTones=events.filter(event=>event.commonToneHeld).length;
  const phraseResponses=events.filter(event=>event.role==='human-phrase-response').length;
  const gestureSummary=[...new Set(events.filter(event=>CORE_ROLES.has(event.role)).map(event=>event.humanGesture))];

  return {
    ...plan,
    profile:'fortissimo-neo-soul-player-v1.3-human-dna-b1',
    style:`FORTISSIMO Human Pianist V1.3 · ${plan.afroPocket?.archetype||'Afro human pocket'}`,
    events,
    humanPerformance:{
      version:'1.3',
      dna:'Reference DNA Session B1',
      midiReferences:HUMAN_PERFORMANCE_DNA_B1.midiReferences,
      audioPairs:HUMAN_PERFORMANCE_DNA_B1.audioPairs,
      contextualMicrotiming:true,
      velocityByVoiceRole:true,
      independentReleases:true,
      commonToneSustain:true,
      phraseEndResponses:true,
      heldCommonTones,
      phraseResponses,
      gestureSummary,
      sharedTransportUntouched:true
    },
    discipline:{
      ...plan.discipline,
      humanization:'Reference DNA B1: finger-mixed velocity, contextual timing, common-tone legato, independent releases and sparse phrase responses',
      clock:'shared BPM/bar grid remains exact; only intra-gesture timing breathes'
    },
    dynamics:{
      velocityMin:events.length?Math.min(...events.map(event=>event.velocity)):0,
      velocityMax:events.length?Math.max(...events.map(event=>event.velocity)):0
    }
  };
}

export function buildNeoSoulRhodesPlan(chords,options={}){
  const pocketed=applyAfroPocket(buildV11(chords,options),{roman:options.roman||[],bpm:options.bpm,energyTarget:options.energyTarget,timeSignature:options.timeSignature||'4/4',emotionFilters:options.emotionFilters||[],mood:options.mood||'connection'});
  const seed=String(options.seed||'neo-soul-v12');
  const pass=String(options.pass||'A');
  let remembered=pocketed;
  if(pass==='A'){
    firstPassMemory.set(seed,pocketed);
    if(firstPassMemory.size>24)firstPassMemory.delete(firstPassMemory.keys().next().value);
  }else{
    const source=options.previousPhrasePlan||firstPassMemory.get(seed)||null;
    remembered=inheritFirstPassMemory(pocketed,source);
  }
  return applyHumanPerformanceDNA(remembered,{...options,seed,pass});
}

export function velocityToGain(velocity,role='inner-voice'){
  const base=velocityToGainV11(velocity,role==='human-phrase-response'?'neo-soul-response':role);
  const scale=role==='human-phrase-response'?0.72:1;
  return clamp(base*scale,0.035,0.90);
}

// Compatibility export name retained because existing runtime imports V12.
// The implementation itself is now Human Pianist V1.3 powered by B1 DNA.
export const NEO_SOUL_PLAYER_V12_INFO={version:'1.3-human-dna-b1',identity:'Afrobeats harmony first. Soul / Neo-Soul / R&B in the hands. Human performance DNA B1. Vocal space always.',changes:['Reference DNA B1','velocity by voice role','contextual microtiming','human chord-roll gestures','common-tone sustain','independent releases','sparse phrase-end responses','A→A′ phrase memory','returning-chord identity','preserved voicing safety']};
export const NEO_SOUL_PLAYER_V13_INFO=NEO_SOUL_PLAYER_V12_INFO;
