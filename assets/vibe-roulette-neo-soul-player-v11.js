import { buildNeoSoulRhodesPlan as buildV1, velocityToGain as velocityToGainV1 } from './vibe-roulette-neo-soul-player-v1.js';
import { performanceComplexityBudget } from './vibe-roulette-afro-commercial-v11.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
function chordIdentity(chord=''){return String(chord).replace(/\s+/g,'').toLowerCase();}

function suffixComplexity(chord=''){
  const suffix=String(chord).replace(/^[A-G][b#]{0,2}/,'');
  let score=0;
  if(/(?:maj7|m7|add9|sus2|sus4|7|9)/i.test(suffix))score+=0.35;
  if(/(?:11|13|dim|aug|ø|°|#|b)/i.test(suffix))score+=0.45;
  return clamp(score,0,1);
}

// Phrase-memory layer: when harmony returns, the player should sound like the
// same musician remembering a phrase, not like a new random voicing engine.
// Repeated chords keep their established hand shape/top-line identity. The
// performance can still evolve through dynamics, timing and restrained answers.
function applyPhraseMemory(plan,{seed='phrase-memory'}={}){
  const voicings=(plan.voicings||[]).map(v=>({...v,left:[...(v.left||[])],right:[...(v.right||[])]}));
  const firstByChord=new Map();
  const memoryByIndex=new Map();

  voicings.forEach((voicing,index)=>{
    const key=chordIdentity(voicing.chord);
    if(!key)return;
    if(!firstByChord.has(key)){
      firstByChord.set(key,{index,right:[...voicing.right],left:[...voicing.left]});
      return;
    }
    const source=firstByChord.get(key);
    const distance=index-source.index;
    // Strongest memory on returns inside the same 8-bar thought. Preserve the
    // recognizable shell/top note; evolution belongs to touch and phrasing.
    if(distance<=8){
      voicing.right=[...source.right];
      // Keep bass identity too, unless the original engine deliberately chose a
      // different inversion/register; root remains stable and tenth is optional.
      if(source.left?.length) voicing.left=[...source.left];
      memoryByIndex.set(index,{sourceIndex:source.index,strength:0.86});
    }
  });

  if(!memoryByIndex.size)return {...plan,voicings,phraseMemory:{returns:0,policy:'statement → remembered evolution'}};

  const sourceEventsByChord=new Map();
  for(const event of plan.events||[]){
    if(!sourceEventsByChord.has(event.chordIndex))sourceEventsByChord.set(event.chordIndex,[]);
    sourceEventsByChord.get(event.chordIndex).push(event);
  }

  const events=(plan.events||[]).map(event=>{
    const memory=memoryByIndex.get(event.chordIndex);
    if(!memory)return {...event};
    const targetVoicing=voicings[event.chordIndex];
    const sourceEvents=sourceEventsByChord.get(memory.sourceIndex)||[];
    const roleEvents=sourceEvents.filter(e=>e.role===event.role);
    const sameRoleOrdinal=(plan.events||[]).filter(e=>e.chordIndex===event.chordIndex&&e.role===event.role&&e.startBeat<=event.startBeat).length-1;
    const source=roleEvents[Math.min(Math.max(0,sameRoleOrdinal),Math.max(0,roleEvents.length-1))];
    const copy={...event,phraseMemorySource:memory.sourceIndex,memoryStrength:memory.strength};

    if(event.role==='bass-root')copy.midi=targetVoicing.left[0]??event.midi;
    else if(event.role==='bass-tenth')copy.midi=targetVoicing.left[1]??event.midi;
    else if(event.role==='top-voice')copy.midi=targetVoicing.right.at(-1)??event.midi;
    else if(event.role==='inner-voice'){
      const candidates=targetVoicing.right.slice(0,-1);
      if(candidates.length)copy.midi=candidates.reduce((best,n)=>Math.abs(n-event.midi)<Math.abs(best-event.midi)?n:best,candidates[0]);
    }

    // A return is not a clone: preserve the idea, then humanly shade it.
    if(source){
      copy.velocity=clamp(Math.round(source.velocity*(0.96+hash01(`${seed}|vel|${event.chordIndex}|${event.role}`)*0.08)),1,127);
      if(/top-voice|inner-voice|bass-root|bass-tenth/.test(event.role)){
        copy.durationBeats=Math.max(copy.durationBeats,source.durationBeats*0.88);
      }
    }
    return copy;
  });

  return {
    ...plan,
    voicings,
    events,
    phraseMemory:{
      returns:memoryByIndex.size,
      strength:0.86,
      policy:'A = statement; return/A′ = remembered idea + one-dimensional evolution',
      topLine:'preserve recognizable top voice on repeated harmony',
      rule:'vary touch/timing/answer before changing the harmonic hand shape'
    }
  };
}

function normalizeContinuity(plan,{roman=[],energyTarget=0.62,seed='v11'}={}){
  const budget=performanceComplexityBudget(roman);
  const remembered=applyPhraseMemory(plan,{seed});
  const gestureByChord=new Map((remembered.gestures||[]).map(g=>[g.chordIndex,g.id]));
  const planByChord=new Map((remembered.plan||[]).map((item,index)=>[index,item]));
  const responseCount=new Map();
  for(const event of remembered.events||[]){
    if(event.role==='neo-soul-response'||event.role==='keyboard-pickup')responseCount.set(event.chordIndex,(responseCount.get(event.chordIndex)||0)+1);
  }

  const filtered=[];
  for(const event0 of remembered.events||[]){
    const event={...event0};
    const item=planByChord.get(event.chordIndex);
    const chord=remembered.voicings?.[event.chordIndex]?.chord||item?.chord||'';
    const localComplexity=suffixComplexity(chord);
    const performanceBudget=clamp(budget.performance-localComplexity*0.24,0.28,0.96);
    const isRemembered=Number.isFinite(event.memoryStrength);

    if(event.role==='neo-soul-response'||event.role==='keyboard-pickup'){
      // On remembered harmony, restraint wins: one familiar idea is more human
      // than stacking a new ornament on every return.
      const memoryRestraint=isRemembered?0.62:1;
      const keep=hash01(`${seed}|ornament|${event.chordIndex}|${event.role}|${event.startBeat}|${event.midi}`)<performanceBudget*memoryRestraint;
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
    ...remembered,
    profile:'fortissimo-neo-soul-player-v1.2-memory',
    style:`FORTISSIMO Neo-Soul Player V1.2 · ${remembered.performancePattern?.label||'Afro Commercial Pocket'}`,
    events:filtered,
    complexityBudget:budget,
    discipline:{
      principle:'Afrobeats harmony first · Neo-Soul musicianship second · vocal/song space always',
      identity:'Soul / Neo-Soul / R&B in the hands; Afro/Afropop in the composition.',
      continuity:'release tails + phrase memory + stable top-line; silence only when intentional',
      variation:'recognizable evolution, never random reinvention of a returning chord',
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
    seed:options.seed||'neo-soul-v12-memory'
  });
}

export function velocityToGain(velocity,role='inner-voice'){
  const base=velocityToGainV1(velocity,role);
  return clamp(base,0.045,0.90);
}

export const NEO_SOUL_PLAYER_V11_INFO={
  version:'1.2-memory',
  identity:'Afrobeats harmony first; Soul / Neo-Soul / R&B hands; vocal space always.',
  changes:['phrase memory','repeated-chord identity','top-line continuity','A→A′ evolution','ornament restraint','commercial complexity budget','legato support','release tails']
};
