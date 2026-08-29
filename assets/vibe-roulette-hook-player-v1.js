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
    cost:Math.abs(midi-previousAnchor)*1.1+(foundation.has(midi)?3.5:0)+Math.abs(midi-80)*0.16+hash01(`${seed}|hook-anchor|${chordIndex}|${midi}`)
  })).sort((a,b)=>a.cost-b.cost);
  return candidates[0]?.midi??76;
}
function safeMotifNotes({chord,romanToken='',anchor,foundationPlan,chordIndex,seed}){
  const safe=safePitchClassesForChord(chord,{romanToken,allowColor:true});
  const foundation=foundationNotesForChord(foundationPlan,chordIndex);
  const candidates=allMidiForPcs(safe,68,92).sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor)||a-b);
  const ranked=candidates.filter(m=>Math.abs(m-anchor)<=9).map(midi=>({midi,cost:(foundation.has(midi)?2.8:0)+hash01(`${seed}|hook-note|${chordIndex}|${midi}`)})).sort((a,b)=>a.cost-b.cost);
  const pool=[anchor,...ranked.map(x=>x.midi).filter(m=>m!==anchor)];
  return [...new Set(pool)].slice(0,4);
}
function patternForPreset(preset,{energy,density,seed,chordIndex,pass}){
  if(preset==='Warm Pluck')return hash01(`${seed}|warm-pattern|${chordIndex}|${pass}`)<0.62?'warm-pluck-pocket':'upper-ostinato';
  if(preset==='Hidden Whistle')return hash01(`${seed}|whistle-pattern|${chordIndex}|${pass}`)<0.58?'whistle-call':'phrase-answer';
  if(preset==='Toy Piano')return hash01(`${seed}|toy-pattern|${chordIndex}|${pass}`)<0.64?'toy-piano-motif':'phrase-answer';
  return energy+density>1.1?'upper-ostinato':'phrase-answer';
}
function contourFor(pattern){
  if(pattern==='upper-ostinato')return [0,1,2,1];
  if(pattern==='warm-pluck-pocket')return [0,1,0,2];
  if(pattern==='whistle-call')return [0,2,1];
  if(pattern==='toy-piano-motif')return [0,1,2];
  return [0,1,0];
}
function startsFor(pattern,item,density){
  const s=item.startBeat,b=item.beats;
  if(pattern==='upper-ostinato'){
    const step=density>0.50?0.5:0.75;const starts=[];
    for(let t=s+Math.min(0.5,b*0.12);t<s+b-0.18&&starts.length<6;t+=step)starts.push(t);
    return starts;
  }
  if(pattern==='warm-pluck-pocket')return [s+b*0.16,s+b*0.39,s+b*0.63,s+b*0.82].filter(t=>t<s+b-0.08);
  if(pattern==='whistle-call')return [s+b*0.24,s+b*0.58,s+b*0.78].filter(t=>t<s+b-0.08);
  if(pattern==='toy-piano-motif')return [s+b*0.18,s+b*0.48,s+b*0.72].filter(t=>t<s+b-0.08);
  return [s+b*0.72,s+b*0.84,s+b*0.92].filter(t=>t<s+b-0.04);
}
function durationFor(pattern,item,energy){
  if(pattern==='warm-pluck-pocket')return clamp(item.beats*0.10,0.16,0.42);
  if(pattern==='upper-ostinato')return clamp(0.28+(1-energy)*0.18,0.24,0.48);
  if(pattern==='whistle-call')return clamp(item.beats*0.16,0.24,0.70);
  if(pattern==='toy-piano-motif')return clamp(item.beats*0.13,0.22,0.58);
  return 0.18+0.16*(1-energy);
}

export function buildHookPlayerPlan(chords,{
  roman=[],bars=4,beatsPerBar=4,bpm=100,energyTarget=0.62,emotionFilters=[],mood='connection',
  pass='A',seed='hook-player-v1',foundationPlan=null,densityPolicy=null,presetHint=null
}={}){
  const plan=buildCommercialFourBarPlan(chords,{bars,beatsPerBar});
  const energy=clamp(energyTarget,0,1);
  const policy=densityPolicy||roleDensityPolicy({energyTarget:energy,emotionFilters,mood,foundationEventCount:foundationPlan?.events?.length||16,chordCount:plan.length});
  const density=policy.hookDensity;
  const suggestedPresets=hookPresetPriority(policy);
  const preset=suggestedPresets.includes(presetHint)?presetHint:suggestedPresets[0];
  const events=[];const motifs=[];let previousAnchor=79;
  for(let chordIndex=0;chordIndex<plan.length;chordIndex+=1){
    const item=plan[chordIndex];
    const anchor=chooseAnchor({chord:item.chord,romanToken:roman[chordIndex]||'',previousAnchor,foundationPlan,chordIndex,seed});
    const notes=safeMotifNotes({chord:item.chord,romanToken:roman[chordIndex]||'',anchor,foundationPlan,chordIndex,seed});
    const pattern=patternForPreset(preset,{energy,density,seed,chordIndex,pass});
    const contour=contourFor(pattern);const starts=startsFor(pattern,item,density);const duration=durationFor(pattern,item,energy);
    motifs.push({chordIndex,chord:item.chord,pattern,anchor,contour:[...contour],sourceDnaId:`B1-hook-${pattern}`});
    for(let i=0;i<starts.length;i+=1){
      const idx=contour[i%contour.length]%Math.max(1,notes.length);const midi=notes[idx]??anchor;
      const phraseAccent=i===0||i===starts.length-1?4:0;
      const velocity=clamp(Math.round(34+energy*24+density*13+phraseAccent+(hash01(`${seed}|hook-vel|${chordIndex}|${i}`)*2-1)*4),22,82);
      events.push({
        midi,velocity,startBeat:starts[i],durationBeats:duration,
        fingerOffsetSeconds:(pattern==='whistle-call'?0.012:0.006)+(i%2)*0.004,
        releaseTailSeconds:pattern==='whistle-call'?0.14:0.06,
        role:pattern==='phrase-answer'?'hook-phrase-response':'hook-motif',layerRole:'hook',playerRole:'hook-melodic',chordIndex,
        hookPattern:pattern,motifIndex:i,sourceDnaId:`B1-hook-${pattern}`,continuityIntent:'role-aware-hook'
      });
    }
    previousAnchor=anchor;
  }
  events.sort((a,b)=>a.startBeat-b.startBeat||a.midi-b.midi);
  return {
    version:'1.0',profile:'fortissimo-songstarter-hook-player-v1',player:'Hook Player',layerRole:'hook',
    pass,bpm,energy,mood,emotionFilters:[...emotionFilters],plan,events,motifs,densityPolicy:policy,
    suggestedPresets,selectedPresetHint:preset,
    export:layerExportDescriptor('hook',preset),
    dna:{session:'Reference DNA B1',derivedOnly:true,grammars:['rhythmic-pluck-pocket','upper-ostinato','whistle-call','toy-piano-motif','phrase-end-answer']},
    contract:{foundationUntouched:true,fullFoundationCloneForbidden:true,sharedHarmony:true,sharedTransport:true,skyKeysPlaybackDeferredToPhase4:true},
    dynamics:{velocityMin:events.length?Math.min(...events.map(e=>e.velocity)):0,velocityMax:events.length?Math.max(...events.map(e=>e.velocity)):0}
  };
}

export const HOOK_PLAYER_V1_INFO=Object.freeze({
  version:'1.0',phase:3,role:'hook',
  presets:['Hidden Whistle','Toy Piano','Warm Pluck'],
  principles:['short repeatable motifs','upper-register separation','phrase responses','rhythmic pluck pocket','harmonically safe transformed DNA'],
  rawReferenceAssetsEmbedded:false
});
