import { buildCommercialFourBarPlan } from './vibe-roulette-groove.js';
import { safePitchClassesForChord } from './vibe-roulette-neo-soul-player-v1.js';
import { serraPerformanceDirection } from './vibe-roulette-serra-emotion-v1.js';
import { roleDensityPolicy, supportPresetPriority, layerExportDescriptor } from './vibe-roulette-role-density-v1.js';

const NATURAL_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const mod=(n,m=12)=>((n%m)+m)%m;
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
function rootPc(chord=''){
  const m=String(chord).match(/^([A-G])([b#]{0,2})/);if(!m)return 0;
  let pc=NATURAL_PC[m[1]];for(const acc of m[2])pc+=acc==='#'?1:-1;return mod(pc);
}
function midiCandidates(pcs,target=67,min=54,max=79){
  const set=new Set((pcs||[]).map(pc=>mod(pc)));const out=[];
  for(let midi=min;midi<=max;midi+=1)if(set.has(mod(midi)))out.push(midi);
  return out.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b);
}
function foundationNotesForChord(foundationPlan,chordIndex){
  return new Set((foundationPlan?.events||[]).filter(event=>event.chordIndex===chordIndex).map(event=>Number(event.midi)).filter(Number.isFinite));
}
function chooseNotes({chord,romanToken='',nextChord=null,nextRomanToken='',previous=[],foundationPlan,chordIndex,density,seed}){
  const safe=safePitchClassesForChord(chord,{romanToken,allowColor:true});
  const root=rootPc(chord);
  let pcs=safe.filter(pc=>mod(pc)!==root);
  if(!pcs.length)pcs=safe;
  if(nextChord){
    const nextSafe=new Set(safePitchClassesForChord(nextChord,{romanToken:nextRomanToken,allowColor:true}).map(pc=>mod(pc)));
    const common=pcs.filter(pc=>nextSafe.has(mod(pc)));
    if(common.length&&hash01(`${seed}|support-common|${chordIndex}`)<0.66)pcs=[...common,...pcs.filter(pc=>!common.includes(pc))];
  }
  const center=64+Math.round(density*5)+(chordIndex%2?1:0);
  const candidates=midiCandidates(pcs,center,55,80);
  const foundation=foundationNotesForChord(foundationPlan,chordIndex);
  const count=density>0.48?2:1;
  const chosen=[];
  for(let voice=0;voice<count;voice+=1){
    const prev=previous[voice]??previous.at(-1)??center+voice*5;
    const ranked=candidates
      .filter(midi=>!chosen.includes(midi))
      .map(midi=>({midi,cost:Math.abs(midi-prev)*1.15+(foundation.has(midi)?5.5:0)+Math.max(0,4-Math.abs(midi-(chosen.at(-1)??midi)))*1.4+hash01(`${seed}|support-note|${chordIndex}|${voice}|${midi}`)}))
      .sort((a,b)=>a.cost-b.cost);
    if(ranked.length)chosen.push(ranked[0].midi);
  }
  return chosen.sort((a,b)=>a-b);
}
function choosePattern({seed,chordIndex,energy,density,mood,pass}){
  let pool=['common-tone-bloom','sparse-dyad','late-air'];
  if(energy>0.64&&density>0.42)pool=['sparse-dyad','rhythmic-support','common-tone-bloom','late-air'];
  if(/calm|nostalg|intros|sad/.test(String(mood).toLowerCase()))pool=['common-tone-bloom','late-air','sparse-dyad'];
  let index=Math.floor(hash01(`${seed}|support-pattern|${chordIndex}|${pass}`)*pool.length);
  if(String(pass).includes('′'))index=(index+1)%pool.length;
  return pool[index];
}
function eventBase({midi,velocity,startBeat,durationBeats,chordIndex,pattern,voiceIndex,bpm,timingFeel}){
  const behind=timingFeel==='slightly-behind'?0.018:timingFeel==='contained-forward'?0.004:0.010;
  return {
    midi,velocity,startBeat,durationBeats,
    fingerOffsetSeconds:behind+voiceIndex*(0.008*60/Math.max(60,bpm)),
    releaseTailSeconds:0.12,
    role:'support-harmony',layerRole:'support',playerRole:'support-texture',chordIndex,
    supportPattern:pattern,sourceDnaId:`B1-support-${pattern}`,continuityIntent:'role-aware-support'
  };
}

export function buildSupportPlayerPlan(chords,{
  roman=[],bars=4,beatsPerBar=4,bpm=100,energyTarget=0.62,emotionFilters=[],mood='connection',
  pass='A',seed='support-player-v1',foundationPlan=null,densityPolicy=null
}={}){
  const plan=buildCommercialFourBarPlan(chords,{bars,beatsPerBar});
  const energy=clamp(energyTarget,0,1);
  const policy=densityPolicy||roleDensityPolicy({energyTarget:energy,emotionFilters,mood,foundationEventCount:foundationPlan?.events?.length||16,chordCount:plan.length});
  const direction=serraPerformanceDirection(emotionFilters,mood);
  const density=policy.supportDensity;
  const events=[];const voicings=[];const patterns=[];
  let previous=[];
  for(let chordIndex=0;chordIndex<plan.length;chordIndex+=1){
    const item=plan[chordIndex],next=plan[chordIndex+1]||null;
    const notes=chooseNotes({chord:item.chord,romanToken:roman[chordIndex]||'',nextChord:next?.chord||null,nextRomanToken:roman[chordIndex+1]||'',previous,foundationPlan,chordIndex,density,seed});
    const pattern=choosePattern({seed,chordIndex,energy,density,mood,pass});patterns.push({chordIndex,id:pattern});
    voicings.push({chord:item.chord,notes:[...notes],romanToken:roman[chordIndex]||'',pattern});
    const velocityBase=Math.round(24+density*22+energy*7);
    const sustain=clamp(direction.sustainRatio+0.10,0.52,0.92);
    if(pattern==='rhythmic-support'){
      const pulseStarts=[item.startBeat+Math.min(0.5,item.beats*0.16),item.startBeat+item.beats*0.58];
      for(const [pulseIndex,startBeat] of pulseStarts.entries())for(const [voiceIndex,midi] of notes.entries()){
        events.push(eventBase({midi,velocity:clamp(velocityBase+(voiceIndex?3:-2)+(pulseIndex?2:0),14,62),startBeat,durationBeats:Math.max(0.22,item.beats*0.24),chordIndex,pattern,voiceIndex,bpm,timingFeel:direction.timingFeel}));
      }
    }else{
      const entry=pattern==='late-air'?item.beats*0.28:pattern==='common-tone-bloom'?Math.min(0.32,item.beats*0.10):Math.min(0.22,item.beats*0.07);
      for(const [voiceIndex,midi] of notes.entries()){
        const duration=pattern==='sparse-dyad'?item.beats*clamp(sustain-0.12,0.42,0.78):Math.max(0.30,item.beats*sustain-entry);
        events.push(eventBase({midi,velocity:clamp(velocityBase+(voiceIndex?4:-3),12,60),startBeat:item.startBeat+entry,durationBeats:duration,chordIndex,pattern,voiceIndex,bpm,timingFeel:direction.timingFeel}));
      }
    }
    previous=notes;
  }
  events.sort((a,b)=>a.startBeat-b.startBeat||a.midi-b.midi);
  const suggestedPresets=supportPresetPriority(policy);
  return {
    version:'1.0',profile:'fortissimo-songstarter-support-player-v1',player:'Support / Texture Player',layerRole:'support',
    pass,bpm,energy,mood,emotionFilters:[...emotionFilters],plan,events,voicings,patterns,densityPolicy:policy,
    suggestedPresets,
    export:layerExportDescriptor('support',suggestedPresets[0]),
    dna:{session:'Reference DNA B1',derivedOnly:true,grammars:['common-tone-bloom','sparse-dyads','upper-air','restrained-rhythmic-support']},
    contract:{foundationUntouched:true,fullFoundationCloneForbidden:true,sharedHarmony:true,sharedTransport:true,skyKeysPlaybackDeferredToPhase4:true},
    dynamics:{velocityMin:events.length?Math.min(...events.map(e=>e.velocity)):0,velocityMax:events.length?Math.max(...events.map(e=>e.velocity)):0}
  };
}

export const SUPPORT_PLAYER_V1_INFO=Object.freeze({
  version:'1.0',phase:3,role:'support',
  presets:['Always Danger','Broad Texture'],
  principles:['common tones over duplicate roots','sparse upper harmony','late/long texture entries','density yields to Foundation and vocal space'],
  rawReferenceAssetsEmbedded:false
});
