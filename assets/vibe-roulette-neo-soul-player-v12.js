import { buildNeoSoulRhodesPlan as buildV11, velocityToGain as velocityToGainV11 } from './vibe-roulette-neo-soul-player-v11.js';
import { afroPocketPolicy } from './vibe-roulette-afro-language-v12.js';
import { serraPerformanceDirection } from './vibe-roulette-serra-emotion-v1.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

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
    profile:'fortissimo-neo-soul-player-v1.2',
    style:`FORTISSIMO Neo-Soul Player V1.2 · ${policy.archetype}`,
    events,
    afroPocket:policy,
    discipline:{
      ...plan.discipline,
      principle:'Neo-Soul hands · Afro/Afropop pocket · commercial harmony first',
      continuity:'phrase-specific sustain, intentional release and room for future voice, bass and drums',
      leftHand:policy.leftHandMode,
      archetype:policy.archetype
    },
    dynamics:{
      velocityMin:events.length?Math.min(...events.map(event=>event.velocity)):0,
      velocityMax:events.length?Math.max(...events.map(event=>event.velocity)):0
    }
  };
}

export function buildNeoSoulRhodesPlan(chords,options={}){
  return applyAfroPocket(buildV11(chords,options),{
    roman:options.roman||[],bpm:options.bpm,energyTarget:options.energyTarget,
    timeSignature:options.timeSignature||'4/4',emotionFilters:options.emotionFilters||[],mood:options.mood||'connection'
  });
}

export function velocityToGain(velocity,role='inner-voice'){
  return velocityToGainV11(velocity,role);
}

export const NEO_SOUL_PLAYER_V12_INFO={
  version:'1.2',
  identity:'Neo-Soul in the hands. Afro/Afropop in the pocket. Commercial harmony first.',
  changes:['progression-aware pocket','roots-first left hand','phrase-specific sustain','ornament caps','intentional release','preserved V1.1 voicing safety']
};
