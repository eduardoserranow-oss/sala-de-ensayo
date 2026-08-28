import { buildNeoSoulRhodesPlan as buildV11, velocityToGain as velocityToGainV11 } from './vibe-roulette-neo-soul-player-v11.js';
import { afroPocketPolicy } from './vibe-roulette-afro-language-v12.js';
import { serraPerformanceDirection } from './vibe-roulette-serra-emotion-v1.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const chordKey=(value='')=>String(value).replace(/\s+/g,'').toLowerCase();

function applyAfroPocket(plan,options={}){
  const basePolicy=afroPocketPolicy(options);
  const emotional=serraPerformanceDirection(options.emotionFilters||[],options.mood||'connection');
  const policy={...basePolicy,
    sustainRatio:Math.max(basePolicy.sustainRatio,emotional.sustainRatio),
    maxOrnamentsPerChord:Math.max(basePolicy.maxOrnamentsPerChord,emotional.ornamentAllowance),
    emotionalDirection:emotional};
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

    if(item&&['top-voice','inner-voice','bass-root','bass-tenth'].includes(event.role)){
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

  return {
    ...plan,
    profile:'fortissimo-neo-soul-player-v1.2-memory',
    style:`FORTISSIMO Neo-Soul Player V1.2 · ${policy.archetype}`,
    events,
    afroPocket:policy,
    discipline:{
      ...plan.discipline,
      principle:'Afrobeats harmony first · Neo-Soul musicianship second · vocal/song space always',
      continuity:'phrase-specific sustain, intentional release, phrase memory and room for voice, bass and drums',
      leftHand:policy.leftHandMode,
      archetype:policy.archetype
    },
    dynamics:{
      velocityMin:events.length?Math.min(...events.map(event=>event.velocity)):0,
      velocityMax:events.length?Math.max(...events.map(event=>event.velocity)):0
    }
  };
}

// Cross-pass memory for A → A′. The second pass inherits the recognizable hand
// shape/top-line of the first pass whenever the same chord returns. Variation
// is allowed primarily in touch, timing and one restrained answer, not through
// a wholesale reinvention of the voicing.
function inheritFirstPassMemory(plan,firstPass){
  if(!firstPass?.voicings?.length)return plan;
  const firstByChord=new Map();
  firstPass.voicings.forEach((v,index)=>{
    const key=chordKey(v.chord);
    if(key&&!firstByChord.has(key))firstByChord.set(key,{index,voicing:v});
  });
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
    // Shade dynamics slightly so A′ breathes without sounding copied.
    if(['top-voice','inner-voice','bass-root','bass-tenth'].includes(event.role))out.velocity=clamp(Math.round(event.velocity*0.98),1,127);
    return out;
  });

  // Keep ornaments sparse on remembered harmony: a human player develops the
  // phrase instead of proving a new lick on every return.
  const ornamentSeen=new Set();
  const filtered=events.filter(event=>{
    if(!remembered.has(event.chordIndex))return true;
    if(!['neo-soul-response','keyboard-pickup','ghost-answer'].includes(event.role))return true;
    if(ornamentSeen.has(event.chordIndex))return false;
    ornamentSeen.add(event.chordIndex);
    return true;
  });

  return {...plan,voicings,events:filtered,phraseMemory:{...(plan.phraseMemory||{}),crossPassReturns:remembered.size,crossPassStrength:0.88,policy:'A = statement; A′ = remembered phrase + restrained evolution',topLine:'stable on returning harmony'}};
}

export function buildNeoSoulRhodesPlan(chords,options={}){
  const pocketed=applyAfroPocket(buildV11(chords,options),{
    roman:options.roman||[],bpm:options.bpm,energyTarget:options.energyTarget,
    timeSignature:options.timeSignature||'4/4',emotionFilters:options.emotionFilters||[],mood:options.mood||'connection'
  });
  return inheritFirstPassMemory(pocketed,options.previousPhrasePlan||null);
}

export function velocityToGain(velocity,role='inner-voice'){
  return velocityToGainV11(velocity,role);
}

export const NEO_SOUL_PLAYER_V12_INFO={
  version:'1.2-memory',
  identity:'Afrobeats harmony first. Soul / Neo-Soul / R&B in the hands. Vocal space always.',
  changes:['A→A′ phrase memory','returning-chord identity','stable top-line','progression-aware pocket','roots-first left hand','phrase-specific sustain','ornament caps','intentional release','preserved voicing safety']
};
