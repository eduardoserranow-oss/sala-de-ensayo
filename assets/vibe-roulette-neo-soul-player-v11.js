import { buildNeoSoulRhodesPlan as buildV1, velocityToGain as velocityToGainV1 } from './vibe-roulette-neo-soul-player-v1.js';
import { performanceComplexityBudget } from './vibe-roulette-afro-commercial-v11.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}

function suffixComplexity(chord=''){
  const suffix=String(chord).replace(/^[A-G][b#]{0,2}/,'');
  let score=0;
  if(/(?:maj7|m7|add9|sus2|sus4|7|9)/i.test(suffix))score+=0.35;
  if(/(?:11|13|dim|aug|ø|°|#|b)/i.test(suffix))score+=0.45;
  return clamp(score,0,1);
}

function normalizeContinuity(plan,{roman=[],energyTarget=0.62,seed='v11'}={}){
  const budget=performanceComplexityBudget(roman);
  const gestureByChord=new Map((plan.gestures||[]).map(g=>[g.chordIndex,g.id]));
  const planByChord=new Map((plan.plan||[]).map((item,index)=>[index,item]));
  const responseCount=new Map();
  for(const event of plan.events||[]){
    if(event.role==='neo-soul-response'||event.role==='keyboard-pickup')responseCount.set(event.chordIndex,(responseCount.get(event.chordIndex)||0)+1);
  }

  const filtered=[];
  for(const event0 of plan.events||[]){
    const event={...event0};
    const item=planByChord.get(event.chordIndex);
    const chord=plan.voicings?.[event.chordIndex]?.chord||item?.chord||'';
    const localComplexity=suffixComplexity(chord);
    const performanceBudget=clamp(budget.performance-localComplexity*0.24,0.28,0.96);

    if(event.role==='neo-soul-response'||event.role==='keyboard-pickup'){
      const keep=hash01(`${seed}|ornament|${event.chordIndex}|${event.role}|${event.startBeat}|${event.midi}`)<performanceBudget;
      if(!keep)continue;
      event.velocity=Math.round(event.velocity*(0.88+performanceBudget*0.10));
    }

    if(item&&(event.role==='top-voice'||event.role==='inner-voice'||event.role==='bass-root'||event.role==='bass-tenth')){
      const span=Number(item.beats)||4;
      const gesture=gestureByChord.get(event.chordIndex)||'';
      const hasResponse=(responseCount.get(event.chordIndex)||0)>0;
      const isIntentionalStab=gesture==='soul-stab'&&hasResponse;
      const isAnswerSpace=gesture==='answer-space'&&hasResponse;
      if(!isIntentionalStab&&!isAnswerSpace){
        const target=event.role.startsWith('bass')?span*0.93:span*0.90;
        event.durationBeats=Math.max(event.durationBeats,target);
      } else {
        event.durationBeats=Math.max(event.durationBeats,Math.min(span*0.56,2.2));
      }
      event.releaseTailSeconds=event.role.startsWith('bass')?0.10:0.16+0.08*(1-energyTarget);
      event.continuityIntent=isIntentionalStab||isAnswerSpace?'intentional-space':'legato-support';
    } else {
      event.releaseTailSeconds=Math.max(0.06,Number(event.releaseTailSeconds)||0.08);
    }
    filtered.push(event);
  }

  return {
    ...plan,
    profile:'fortissimo-neo-soul-player-v1.1',
    style:`FORTISSIMO Neo-Soul Player V1.1 · ${plan.performancePattern?.label||'Afro Commercial Pocket'}`,
    events:filtered,
    complexityBudget:budget,
    discipline:{
      principle:'Neo-Soul hands · Afro/Afropop writing · commercial harmony first',
      continuity:'release tails + near-full-bar support unless silence is intentional',
      performanceBudget:budget.performance
    },
    dynamics:{
      velocityMin:filtered.length?Math.min(...filtered.map(e=>e.velocity)):0,
      velocityMax:filtered.length?Math.max(...filtered.map(e=>e.velocity)):0
    }
  };
}

export function buildNeoSoulRhodesPlan(chords,options={}){
  const plan=buildV1(chords,options);
  return normalizeContinuity(plan,{
    roman:options.roman||[],
    energyTarget:Number(options.energyTarget??0.62),
    seed:options.seed||'neo-soul-v11'
  });
}

export function velocityToGain(velocity,role='inner-voice'){
  const base=velocityToGainV1(velocity,role);
  return clamp(base,0.045,0.90);
}

export const NEO_SOUL_PLAYER_V11_INFO={
  version:'1.1',
  identity:'Soul / Neo-Soul in the hands; Afro/Afropop/Latin Tropical in the song.',
  changes:['commercial complexity budget','intentional silence only','legato support','release tails','ornament restraint']
};
