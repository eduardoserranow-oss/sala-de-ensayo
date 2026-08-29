import { buildCommercialFourBarPlan } from './vibe-roulette-groove.js';
import { safePitchClassesForChord } from './vibe-roulette-neo-soul-player-v1.js';
import { roleDensityPolicy, hookPresetPriority, layerExportDescriptor } from './vibe-roulette-role-density-v1.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const mod=(n,m=12)=>((n%m)+m)%m;
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
function allMidiForPcs(pcs,min=67,max=91){const set=new Set((pcs||[]).map(pc=>mod(pc)));const out=[];for(let m=min;m<=max;m+=1)if(set.has(mod(m)))out.push(m);return out;}
function foundationNotesForChord(foundationPlan,chordIndex){return new Set((foundationPlan?.events||[]).filter(e=>e.chordIndex===chordIndex).map(e=>Number(e.midi)).filter(Number.isFinite));}
function chooseAnchor({chord,romanToken='',previousAnchor=79,foundationPlan,chordIndex,seed}){
  const safe=safePitchClassesForChord(chord,{romanToken,allowColor:true});
  const foundation=foundationNotesForChord(foundationPlan,chordIndex);
  const candidates=allMidiForPcs(safe,69,91).map(midi=>({
    midi,
    cost:Math.abs(midi-previousAnchor)*1.28+(foundation.has(midi)?3.6:0)+Math.abs(midi-79)*0.13+hash01(`${seed}|hook-anchor|${chordIndex}|${midi}`)*0.9
  })).sort((a,b)=>a.cost-b.cost);
  return candidates[0]?.midi??76;
}
function safePhrasePool({chord,romanToken='',anchor,foundationPlan,chordIndex,seed}){
  const safe=safePitchClassesForChord(chord,{romanToken,allowColor:true});
  const foundation=foundationNotesForChord(foundationPlan,chordIndex);
  const candidates=allMidiForPcs(safe,68,92).filter(m=>Math.abs(m-anchor)<=10).map(midi=>({
    midi,
    cost:Math.abs(midi-anchor)*0.14+(foundation.has(midi)?2.8:0)+hash01(`${seed}|phrase-note|${chordIndex}|${midi}`)*0.8
  })).sort((a,b)=>a.cost-b.cost||a.midi-b.midi);
  return [...new Set([anchor,...candidates.map(x=>x.midi)])].slice(0,6);
}
function phraseShape(seed,preset){
  const shapes=preset==='Hidden Whistle'
    ?[[0,1,0],[0,2,1],[0,1,2,1]]
    :preset==='Toy Piano'
      ?[[0,1,2,1],[0,2,1],[1,0,2,0]]
      :[[0,1,0,2],[0,2,1,0],[0,1,2,1]];
  return shapes[Math.floor(hash01(`${seed}|phrase-shape|${preset}`)*shapes.length)%shapes.length];
}
function phraseGesture(preset,chordIndex,{energy,density,seed,pass}={}){
  const slot=chordIndex%4;
  const variant=hash01(`${seed}|gesture|${preset}|${slot}|${pass}`);
  if(preset==='Hidden Whistle'){
    if(slot===0)return {id:'whistle-statement',fractions:[.22,.62],durations:[.62,.96],velocityShape:[1,.82]};
    if(slot===1)return variant<.52?{id:'whistle-breath',fractions:[.54],durations:[1.12],velocityShape:[.82]}:{id:'whistle-answer',fractions:[.46,.78],durations:[.58,.78],velocityShape:[.88,.72]};
    if(slot===2)return {id:'whistle-variation',fractions:[.18,.48,.76],durations:[.50,.74,.54],velocityShape:[.94,.78,.86]};
    return {id:'phrase-answer',fractions:[.67,.86],durations:[.54,1.08],velocityShape:[.78,1.02]};
  }
  if(preset==='Toy Piano'){
    if(slot===0)return {id:'toy-motif-statement',fractions:[.18,.48,.74],durations:[.42,.72,.48],velocityShape:[1,.78,.88]};
    if(slot===1)return variant<.62?{id:'toy-motif-echo',fractions:[.30,.66],durations:[.58,.88],velocityShape:[.72,.88]}:{id:'toy-breath',fractions:[.63],durations:[1.04],velocityShape:[.76]};
    if(slot===2)return {id:'toy-motif-variation',fractions:[.20,.52,.80],durations:[.46,.82,.60],velocityShape:[.92,.72,.94]};
    return {id:'phrase-answer',fractions:[.70,.88],durations:[.46,.90],velocityShape:[.76,.98]};
  }
  // Warm Pluck keeps rhythmic identity, but breathes like a player instead of firing a constant staccato grid.
  if(slot===0)return {id:'warm-pluck-statement',fractions:[.16,.42,.71],durations:[.32,.58,.42],velocityShape:[1,.74,.90]};
  if(slot===1)return variant<.58?{id:'warm-pluck-breath',fractions:[.58,.82],durations:[.52,.64],velocityShape:[.70,.86]}:{id:'warm-pluck-answer',fractions:[.34,.68],durations:[.44,.72],velocityShape:[.80,.94]};
  if(slot===2)return {id:'warm-pluck-variation',fractions:[.20,.47,.78],durations:[.36,.68,.48],velocityShape:[.94,.72,1]};
  return {id:'phrase-answer',fractions:[.66,.86],durations:[.42,.82],velocityShape:[.74,.98]};
}
function snapPhraseNote(pool,anchor,shapeValue,index){
  if(!pool.length)return anchor;
  const sorted=[...pool].sort((a,b)=>a-b);
  const anchorIndex=Math.max(0,sorted.reduce((best,_,i)=>Math.abs(sorted[i]-anchor)<Math.abs(sorted[best]-anchor)?i:best,0));
  const movement=(shapeValue??0)-1;
  const phraseLift=index%4===3?1:0;
  return sorted[clamp(anchorIndex+movement+phraseLift,0,sorted.length-1)]??anchor;
}
function humanOffsetSeconds({preset,index,chordIndex,gestureId,seed}){
  const base=preset==='Hidden Whistle'?0.015:preset==='Toy Piano'?0.010:0.008;
  const phrasePush=gestureId==='phrase-answer'?0.010:0;
  const alternating=index%2===0?0.004:-0.004;
  const micro=(hash01(`${seed}|human-offset|${chordIndex}|${index}`)*2-1)*0.009;
  return clamp(base+phrasePush+alternating+micro,-0.006,0.034);
}
function velocityFor({preset,energy,density,shape=1,index,chordIndex,gestureId,seed}){
  const base=preset==='Hidden Whistle'?45:preset==='Toy Piano'?39:44;
  const range=preset==='Hidden Whistle'?21:preset==='Toy Piano'?20:24;
  const phraseAccent=index===0?5:gestureId==='phrase-answer'&&index>0?6:0;
  const human=(hash01(`${seed}|hook-velocity|${chordIndex}|${index}`)*2-1)*8;
  const value=(base+energy*range+density*6+phraseAccent+human)*shape;
  return clamp(Math.round(value),22,86);
}
function maybeExtendCommonTone(events,plan,roman,preset){
  if(preset==='Warm Pluck')return events;
  for(let chordIndex=0;chordIndex<plan.length-1;chordIndex+=1){
    const current=events.filter(e=>e.chordIndex===chordIndex).sort((a,b)=>a.startBeat-b.startBeat);
    if(!current.length)continue;
    const last=current.at(-1),next=plan[chordIndex+1];
    const nextSafe=new Set(safePitchClassesForChord(next.chord,{romanToken:roman[chordIndex+1]||'',allowColor:true}).map(pc=>mod(pc)));
    if(!nextSafe.has(mod(last.midi)))continue;
    const boundary=next.startBeat;
    const desired=boundary-last.startBeat+(preset==='Hidden Whistle'?.72:.44);
    if(desired>last.durationBeats){last.durationBeats=clamp(desired,last.durationBeats,2.25);last.continuityIntent='common-tone-carry';last.releaseTailSeconds=preset==='Hidden Whistle'?.24:.15;}
  }
  return events;
}

export function buildHookPlayerPlan(chords,{
  roman=[],bars=4,beatsPerBar=4,bpm=100,energyTarget=0.62,emotionFilters=[],mood='connection',
  pass='A',seed='hook-player-v11',foundationPlan=null,densityPolicy=null,presetHint=null
}={}){
  const plan=buildCommercialFourBarPlan(chords,{bars,beatsPerBar});
  const energy=clamp(energyTarget,0,1);
  const policy=densityPolicy||roleDensityPolicy({energyTarget:energy,emotionFilters,mood,foundationEventCount:foundationPlan?.events?.length||16,chordCount:plan.length});
  const density=policy.hookDensity;
  const suggestedPresets=hookPresetPriority(policy);
  const preset=suggestedPresets.includes(presetHint)?presetHint:suggestedPresets[0];
  const phrase=phraseShape(seed,preset);
  const events=[];const motifs=[];let previousAnchor=79;

  for(let chordIndex=0;chordIndex<plan.length;chordIndex+=1){
    const item=plan[chordIndex];
    const anchor=chooseAnchor({chord:item.chord,romanToken:roman[chordIndex]||'',previousAnchor,foundationPlan,chordIndex,seed});
    const pool=safePhrasePool({chord:item.chord,romanToken:roman[chordIndex]||'',anchor,foundationPlan,chordIndex,seed});
    const gesture=phraseGesture(preset,chordIndex,{energy,density,seed,pass});
    const starts=gesture.fractions.map(f=>item.startBeat+item.beats*f).filter(t=>t<item.startBeat+item.beats-.06);
    motifs.push({chordIndex,chord:item.chord,pattern:gesture.id,anchor,phraseShape:[...phrase],sourceDnaId:`B1-human-hook-${gesture.id}`});

    for(let i=0;i<starts.length;i+=1){
      const shapeValue=phrase[(i+chordIndex)%phrase.length];
      const midi=snapPhraseNote(pool,anchor,shapeValue,i);
      const rawDuration=(gesture.durations[i]??gesture.durations.at(-1)??.55)*(0.88+hash01(`${seed}|hook-duration|${chordIndex}|${i}`)*0.28);
      const remaining=item.startBeat+item.beats-starts[i];
      const durationBeats=clamp(Math.min(rawDuration,remaining+.18),preset==='Warm Pluck'?.26:.38,preset==='Hidden Whistle'?1.55:1.18);
      events.push({
        midi,
        velocity:velocityFor({preset,energy,density,shape:gesture.velocityShape[i]??1,index:i,chordIndex,gestureId:gesture.id,seed}),
        startBeat:starts[i],durationBeats,
        fingerOffsetSeconds:humanOffsetSeconds({preset,index:i,chordIndex,gestureId:gesture.id,seed}),
        releaseTailSeconds:preset==='Hidden Whistle'?.20:preset==='Toy Piano'?.13:.09,
        role:gesture.id==='phrase-answer'?'hook-phrase-response':'hook-motif',layerRole:'hook',playerRole:'hook-melodic',chordIndex,
        hookPattern:gesture.id,motifIndex:i,phraseShapeIndex:(i+chordIndex)%phrase.length,sourceDnaId:`B1-human-hook-${gesture.id}`,
        continuityIntent:gesture.id.includes('breath')?'intentional-space':'human-phrase'
      });
    }
    previousAnchor=anchor;
  }

  maybeExtendCommonTone(events,plan,roman,preset);
  events.sort((a,b)=>a.startBeat-b.startBeat||a.midi-b.midi);
  return {
    version:'1.1',profile:'fortissimo-songstarter-hook-player-v1',player:'Human Hook Player V1.1',layerRole:'hook',
    pass,bpm,energy,mood,emotionFilters:[...emotionFilters],plan,events,motifs,densityPolicy:policy,
    suggestedPresets,selectedPresetHint:preset,
    export:layerExportDescriptor('hook',preset),
    dna:{session:'Reference DNA B1',derivedOnly:true,phraseLevel:true,grammars:['phrase statement','breath/space','motif echo','motif variation','phrase-end answer','common-tone carry','human velocity contour','contextual microtiming']},
    contract:{foundationUntouched:true,fullFoundationCloneForbidden:true,sharedHarmony:true,sharedTransport:true,roboticConstantGridForbidden:true,phraseMemoryInsidePass:true,skyKeysPlaybackDeferredToPhase4:true},
    dynamics:{velocityMin:events.length?Math.min(...events.map(e=>e.velocity)):0,velocityMax:events.length?Math.max(...events.map(e=>e.velocity)):0}
  };
}

export const HOOK_PLAYER_V1_INFO=Object.freeze({
  version:'1.1-human-phrase',phase:4.1,role:'hook',
  presets:['Hidden Whistle','Toy Piano','Warm Pluck'],
  principles:['2–4 bar phrase identity','intentional rests','mixed note lengths','human velocity contour','contextual microtiming','common-tone carry where safe','preset-specific articulation','harmonically safe transformed DNA'],
  rawReferenceAssetsEmbedded:false
});
