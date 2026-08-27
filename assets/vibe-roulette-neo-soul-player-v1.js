import { buildCommercialFourBarPlan } from './vibe-roulette-groove.js';

const NATURAL_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const clamp01=(v,f=0.62)=>{const n=Number(v);return Number.isFinite(n)?clamp(n,0,1):f;};
const mod=(n,m=12)=>((n%m)+m)%m;
const lerp=(a,b,t)=>a+(b-a)*clamp01(t);

function hash01(seed=''){
  let h=2166136261;
  for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
}
function signed(seed,amount=1){return (hash01(seed)*2-1)*amount;}
function pcFromName(name){
  const match=String(name).match(/^([A-G])([b#]{0,2})$/);
  if(!match) throw new Error(`Unsupported note name: ${name}`);
  let pc=NATURAL_PC[match[1]];
  for(const acc of match[2]) pc+=acc==='#'?1:-1;
  return mod(pc);
}
function splitChord(chord){
  const match=String(chord||'').match(/^([A-G][b#]{0,2})(.*)$/);
  if(!match) throw new Error(`Unsupported chord: ${chord}`);
  return {root:match[1],suffix:match[2],pc:pcFromName(match[1])};
}
function midiForPcNear(pc,target,min=48,max=78){
  let best=null;
  for(let midi=min;midi<=max;midi+=1){
    if(mod(midi)!==pc) continue;
    const distance=Math.abs(midi-target);
    if(!best||distance<best.distance) best={midi,distance};
  }
  return best?.midi??clamp(Math.round(target),min,max);
}
function romanFamily(token=''){
  return String(token).replace(/[♭#b]/g,'').replace(/[^ivIV]/g,'').toUpperCase();
}
function isMinorSuffix(suffix=''){return /m(?!aj)/.test(suffix)&&!/(dim|ø)/.test(suffix);}
function isDominantSuffix(suffix=''){return /(^|[^a-z])7/.test(suffix)&&!/maj7/.test(suffix);}

export function safeIntervalsForChord(chord,{romanToken='',allowColor=true}={}){
  const {suffix}=splitChord(chord);
  if(/m7b5|ø/.test(suffix)) return [0,3,6,10];
  if(/dim7/.test(suffix)) return [0,3,6,9];
  if(/dim/.test(suffix)) return [0,3,6];
  if(/sus2/.test(suffix)) return [0,2,7,10];
  if(/sus4/.test(suffix)) return [0,5,7,10];

  const minor=isMinorSuffix(suffix);
  const explicitMaj7=/maj7|maj9|maj11|maj13/.test(suffix);
  const explicit7=isDominantSuffix(suffix)||/m7|m9|m11|m13/.test(suffix);
  const explicit9=/add9|(?:^|[^a-z])9|maj9|m9/.test(suffix);
  const family=romanFamily(romanToken);
  const intervals=minor?[0,3,7]:[0,4,7];

  if(explicitMaj7) intervals.push(11);
  else if(explicit7) intervals.push(10);
  if(explicit9) intervals.push(14);

  // Conservative harmonic-safety policy: inferred color is limited to stable
  // commercial 7ths/9ths. No implicit altered dominants or major-chord natural 11s.
  if(allowColor&&!explicitMaj7&&!explicit7&&!explicit9){
    if(minor) intervals.push(10,14);
    else if(family==='V') intervals.push(10,14);
    else intervals.push(14);
  }
  return [...new Set(intervals)];
}

export function safePitchClassesForChord(chord,options={}){
  const root=splitChord(chord).pc;
  return [...new Set(safeIntervalsForChord(chord,options).map(interval=>mod(root+interval)))];
}

function roleForPc(pc,chord,romanToken){
  const root=splitChord(chord).pc;
  const interval=mod(pc-root);
  const safe=safeIntervalsForChord(chord,{romanToken,allowColor:true}).map(x=>mod(x));
  if(interval===3||interval===4)return 'third';
  if(interval===10||interval===11)return 'seventh';
  if(interval===2)return 'ninth';
  if(interval===7)return 'fifth';
  if(safe.includes(interval))return 'color';
  return 'other';
}

function candidateRightVoicings(chord,romanToken,{center=63,maxNotes=3}={}){
  const safePcs=safePitchClassesForChord(chord,{romanToken,allowColor:true});
  const rootPc=splitChord(chord).pc;
  let pcs=safePcs.filter(pc=>pc!==rootPc);
  if(pcs.length<2) pcs=safePcs;

  const rolePriority={third:0,seventh:1,ninth:2,fifth:3,color:4,other:5};
  pcs=[...pcs].sort((a,b)=>rolePriority[roleForPc(a,chord,romanToken)]-rolePriority[roleForPc(b,chord,romanToken)]);
  const subsets=[];
  const max=Math.min(maxNotes,pcs.length);
  for(let count=Math.max(2,max-1);count<=max;count+=1){
    const recurse=(start,chosen)=>{
      if(chosen.length===count){subsets.push([...chosen]);return;}
      for(let i=start;i<pcs.length;i+=1)recurse(i+1,[...chosen,pcs[i]]);
    };
    recurse(0,[]);
  }

  const voicings=[];
  for(const subset of subsets){
    const options=subset.map(pc=>{
      const base=midiForPcNear(pc,center,50,77);
      return [base-12,base,base+12].filter(m=>m>=50&&m<=77);
    });
    const walk=(index,notes)=>{
      if(index===options.length){
        const sorted=[...notes].sort((a,b)=>a-b);
        if(new Set(sorted).size!==sorted.length)return;
        const span=sorted.at(-1)-sorted[0];
        if(span>17)return;
        for(let i=1;i<sorted.length;i+=1){
          const gap=sorted[i]-sorted[i-1];
          if(gap<2)return;
          if(gap===2&&i<sorted.length-1)return;
        }
        voicings.push(sorted);
        return;
      }
      for(const midi of options[index])walk(index+1,[...notes,midi]);
    };
    walk(0,[]);
  }
  if(voicings.length)return voicings;
  const fallback=[midiForPcNear(pcs[0]??rootPc,center-3),midiForPcNear(pcs[1]??rootPc,center+4)];
  return [[...new Set(fallback)].sort((a,b)=>a-b)];
}

function melodicVoiceLeadingCost(candidate,previous,previousTop){
  const top=candidate.at(-1);
  let cost=Math.abs(top-(previousTop??top))*1.45;
  if(previous?.length){
    for(const note of candidate)cost+=Math.min(...previous.map(prev=>Math.abs(prev-note)))*0.72;
    const common=candidate.filter(note=>previous.includes(note)).length;
    cost-=common*3.2;
  }
  const span=candidate.at(-1)-candidate[0];
  cost+=Math.max(0,span-12)*0.18;
  return cost;
}

function selectRightVoicing(chord,romanToken,previous,index,seed){
  const center=61+(index%3)+signed(`${seed}|center|${index}`,1.4);
  const candidates=candidateRightVoicings(chord,romanToken,{center,maxNotes:3});
  const previousTop=previous?.at(-1)??null;
  return candidates.map(notes=>({notes,cost:melodicVoiceLeadingCost(notes,previous,previousTop)+hash01(`${seed}|${notes.join('-')}`)*0.9}))
    .sort((a,b)=>a.cost-b.cost)[0].notes;
}

function leftHandForChord(chord,right,{energy,index,seed,performancePattern}){
  const info=splitChord(chord);
  const root=midiForPcNear(info.pc,39+(index%2),35,47);
  const family=performancePattern?.id||'';
  const allowTenth=energy<0.72&&/soul|rnb|indie/.test(family)&&hash01(`${seed}|tenth|${index}`)<0.38;
  if(!allowTenth)return [root];
  const thirdInterval=isMinorSuffix(info.suffix)?3:4;
  const tenth=midiForPcNear(mod(info.pc+thirdInterval),root+16,48,59);
  if(right.some(note=>Math.abs(note-tenth)<2))return [root];
  return [root,tenth];
}

export function buildSafeVoicingSequence(chords,{roman=[],energyTarget=0.62,performancePattern=null,seed='neo-soul'}={}){
  const energy=clamp01(energyTarget);
  const sequence=[];
  let previous=null;
  chords.forEach((chord,index)=>{
    const romanToken=roman[index]||'';
    const right=selectRightVoicing(chord,romanToken,previous,index,seed);
    const left=leftHandForChord(chord,right,{energy,index,seed,performancePattern});
    sequence.push({chord,romanToken,left,right,safePcs:safePitchClassesForChord(chord,{romanToken,allowColor:true})});
    previous=right;
  });
  return sequence;
}

const GESTURES={
  'bass-then-shell':{label:'Bass → shell',spread:[0.045,0.105,0.155],groupDelay:0.035,response:[2.55],density:0.78},
  'soft-roll-up':{label:'Soft upward roll',spread:[0,0.065,0.135],groupDelay:0.055,response:[3.22],density:0.72},
  'top-first-squeeze':{label:'Top-first squeeze',spread:[0.11,0.055,0],groupDelay:0.035,response:[1.9,3.42],density:0.9},
  'broken-shell':{label:'Broken shell',spread:[0,0.115,0.205],groupDelay:0.02,response:[2.25],density:0.82},
  'late-color':{label:'Late color tone',spread:[0,0.025,0.175],groupDelay:0.04,response:[3.5],density:0.7},
  'soul-stab':{label:'Soft soul stab',spread:[0,0.018,0.042],groupDelay:0.03,response:[1.55,3.05],density:0.94},
  'long-bloom':{label:'Long bloom',spread:[0,0.085,0.16],groupDelay:0.07,response:[],density:0.58},
  'answer-space':{label:'Answer + space',spread:[0.03,0.08,0.13],groupDelay:0.04,response:[2.82],density:0.64}
};

function gesturePoolForPocket(id=''){
  if(id==='rnb-push'||id==='soul-topline')return ['top-first-squeeze','late-color','long-bloom','broken-shell','bass-then-shell'];
  if(id==='indie-lofi-space')return ['long-bloom','answer-space','soft-roll-up','bass-then-shell'];
  if(id==='tropical-conversation')return ['soul-stab','bass-then-shell','answer-space','soft-roll-up'];
  if(id==='pop-clean')return ['bass-then-shell','soft-roll-up','answer-space'];
  return ['bass-then-shell','soft-roll-up','late-color','answer-space','soul-stab'];
}

function chooseGesture({performancePattern,pass,barIndex,chordIndex,energy,seed}){
  const pool=gesturePoolForPocket(performancePattern?.id);
  const prime=pass==="A′"||pass==='A-prime';
  let index=Math.floor(hash01(`${seed}|gesture|${performancePattern?.variantSeed||''}|${pass}|${barIndex}|${chordIndex}`)*pool.length);
  if(prime) index=(index+1+(barIndex%2))%pool.length;
  const id=pool[index];
  return {id,...GESTURES[id],energy,prime};
}

function phraseArc(localBar,pass,energy,seed){
  const baseA=[0.78,0.9,1.0,0.84];
  const basePrime=[0.86,0.98,0.9,0.76];
  const base=(pass==="A′"||pass==='A-prime'?basePrime:baseA)[localBar%4];
  return clamp(base+signed(`${seed}|arc|${pass}|${localBar}`,0.055)+(energy-0.5)*0.06,0.64,1.08);
}

function fingerVelocity({role,index,count,energy,arc,seed}){
  const base=role==='bass-root'?lerp(38,57,energy):role==='bass-tenth'?lerp(32,49,energy):role==='top-voice'?lerp(50,70,energy):role==='inner-voice'?lerp(38,57,energy):lerp(32,50,energy);
  const handShape=role==='top-voice'?6:index===0?-2:count>2&&index===1?1:0;
  return clamp(Math.round((base+handShape+signed(seed,5.5))*arc),24,82);
}

export function velocityToGain(velocity,role='inner-voice'){
  const v=clamp(Number(velocity)||48,1,127)/127;
  const continuous=0.18+0.82*Math.pow(v,1.55);
  const roleScale=role==='bass-root'?0.82:role==='bass-tenth'?0.58:role==='top-voice'?1:role==='ghost-answer'?0.5:role==='keyboard-pickup'?0.54:role==='neo-soul-response'?0.58:0.76;
  return clamp(continuous*roleScale,0.06,0.94);
}

function pushEvent(events,event){
  events.push({...event,midi:clamp(Math.round(event.midi),35,86),velocity:clamp(Math.round(event.velocity),1,127),startBeat:Math.max(0,event.startBeat),durationBeats:Math.max(0.06,event.durationBeats),fingerOffsetSeconds:Math.max(0,event.fingerOffsetSeconds||0)});
}
function noteRole(index,count){return index===count-1?'top-voice':'inner-voice';}

function commonHoldMap(voicings,seed){
  const held=new Map();
  for(let i=0;i<voicings.length-1;i+=1){
    const common=voicings[i].right.filter(note=>voicings[i+1].right.includes(note));
    if(!common.length)continue;
    const topPreferred=[...common].sort((a,b)=>b-a)[0];
    if(hash01(`${seed}|hold|${i}|${topPreferred}`)<0.46) held.set(i,topPreferred);
  }
  return held;
}

export function buildNeoSoulRhodesPlan(chords,{
  roman=[],bars=4,beatsPerBar=4,bpm=96,energyTarget=0.62,mood='connection',performancePattern=null,pass='A',
  phraseBarOffset=0,previousRight=null,seed='neo-soul-player-v1'
}={}){
  const energy=clamp01(energyTarget);
  const harmonicPlan=buildCommercialFourBarPlan(chords,{bars,beatsPerBar});
  const voicings=[];
  let previous=Array.isArray(previousRight)&&previousRight.length?previousRight:null;
  harmonicPlan.forEach((item,index)=>{
    const romanToken=roman[index]||'';
    const right=selectRightVoicing(item.chord,romanToken,previous,index+phraseBarOffset,`${seed}|${performancePattern?.variantSeed||'base'}|${pass}`);
    const left=leftHandForChord(item.chord,right,{energy,index:index+phraseBarOffset,seed,performancePattern});
    voicings.push({chord:item.chord,romanToken,left,right,safePcs:safePitchClassesForChord(item.chord,{romanToken,allowColor:true})});
    previous=right;
  });

  const held=commonHoldMap(voicings,`${seed}|${performancePattern?.variantSeed||''}|${pass}`);
  const events=[];
  const gestures=[];

  harmonicPlan.forEach((item,index)=>{
    const voicing=voicings[index];
    const span=item.beats;
    const localBar=Math.floor(item.startBeat/beatsPerBar);
    const globalBar=phraseBarOffset+localBar;
    const arc=phraseArc(localBar,pass,energy,seed);
    const gesture=chooseGesture({performancePattern,pass,barIndex:localBar,chordIndex:index,energy,seed});
    gestures.push({bar:globalBar+1,chordIndex:index,id:gesture.id,label:gesture.label});

    voicing.left.forEach((midi,leftIndex)=>{
      const role=leftIndex===0?'bass-root':'bass-tenth';
      pushEvent(events,{
        midi,role,chordIndex:index,
        velocity:fingerVelocity({role,index:leftIndex,count:voicing.left.length,energy,arc,seed:`${seed}|${pass}|lh|${index}|${leftIndex}`}),
        startBeat:item.startBeat+(leftIndex===0?0:Math.min(0.12,span*0.05)),
        durationBeats:Math.min(span*0.9,leftIndex===0?3.5:2.3),
        fingerOffsetSeconds:leftIndex===0?0:0.035+Math.abs(signed(`${seed}|lh-offset|${index}`,0.018))
      });
    });

    const skipFromPrevious=index>0&&held.get(index-1);
    const holdIntoNext=held.get(index);
    voicing.right.forEach((midi,rightIndex)=>{
      if(skipFromPrevious===midi)return;
      const role=noteRole(rightIndex,voicing.right.length);
      const spread=gesture.spread[Math.min(rightIndex,gesture.spread.length-1)]??0;
      const human=Math.max(-0.012,signed(`${seed}|${performancePattern?.variantSeed||''}|${pass}|finger|${index}|${rightIndex}`,0.012));
      let duration=Math.min(span*0.78,gesture.id==='long-bloom'?3.55:2.65+(1-energy)*0.5);
      if(holdIntoNext===midi&&index<harmonicPlan.length-1) duration=Math.min(span+harmonicPlan[index+1].beats*0.72,6.5);
      pushEvent(events,{
        midi,role,chordIndex:index,
        velocity:fingerVelocity({role,index:rightIndex,count:voicing.right.length,energy,arc,seed:`${seed}|${pass}|rh|${index}|${rightIndex}`}),
        startBeat:item.startBeat+Math.min(0.34,gesture.groupDelay+(energy>0.76?-0.012:0.018)),
        durationBeats:duration,
        fingerOffsetSeconds:Math.max(0,spread+human)
      });
    });

    if(span>=3.6&&gesture.response.length&&hash01(`${seed}|response-enable|${pass}|${index}`)<gesture.density){
      gesture.response.forEach((offset,responseIndex)=>{
        if(offset>=span-0.18)return;
        const sourceNotes=responseIndex%2===0?voicing.right.slice(-2):voicing.right.slice(-1);
        sourceNotes.forEach((midi,noteIndex)=>pushEvent(events,{
          midi,role:'neo-soul-response',chordIndex:index,
          velocity:fingerVelocity({role:'response',index:noteIndex,count:sourceNotes.length,energy:energy*0.78,arc:arc*0.9,seed:`${seed}|resp|${pass}|${index}|${responseIndex}|${noteIndex}`}),
          startBeat:item.startBeat+offset,
          durationBeats:Math.min(0.46+(1-energy)*0.38,span-offset-0.08),
          fingerOffsetSeconds:noteIndex*0.04+Math.abs(signed(`${seed}|resp-time|${index}|${responseIndex}|${noteIndex}`,0.012))
        }));
      });
    }

    const pickupChance=/afro|tropical|rnb/.test(performancePattern?.id||'')?0.34:0.22;
    if(span>=3.6&&index<harmonicPlan.length-1&&hash01(`${seed}|pickup|${pass}|${index}`)<pickupChance){
      const midi=voicing.right.at(-1);
      pushEvent(events,{
        midi,role:'keyboard-pickup',chordIndex:index,
        velocity:fingerVelocity({role:'response',index:0,count:1,energy:energy*0.7,arc,seed:`${seed}|pickup-vel|${pass}|${index}`}),
        startBeat:item.startBeat+Math.min(span-0.18,3.55),durationBeats:0.22,fingerOffsetSeconds:0
      });
    }
  });

  const safetyViolations=[];
  events.forEach(event=>{
    const voicing=voicings[event.chordIndex];
    if(voicing&&!voicing.safePcs.includes(mod(event.midi))) safetyViolations.push({midi:event.midi,chord:voicing.chord,chordIndex:event.chordIndex,role:event.role});
  });

  return {
    instrument:'Rhodes FM',
    style:`FORTISSIMO Neo-Soul Player · ${performancePattern?.label||'Soul Pocket'}`,
    profile:'fortissimo-neo-soul-player-v1',
    performancePattern:performancePattern?{id:performancePattern.id,label:performancePattern.label,variant:performancePattern.variant,tag:performancePattern.tag}:null,
    pass,bpm:clamp(Number(bpm)||96,40,220),bars,beatsPerBar,totalBeats:bars*beatsPerBar,energy,mood,
    plan:harmonicPlan,voicings,gestures,events,
    finalRight:voicings.at(-1)?.right||previousRight||[],
    harmonicSafety:{policy:'chord-tone + stable commercial color only',violations:safetyViolations,count:safetyViolations.length},
    dynamics:{velocityMin:events.length?Math.min(...events.map(e=>e.velocity)):0,velocityMax:events.length?Math.max(...events.map(e=>e.velocity)):0}
  };
}

export const NEO_SOUL_PLAYER_INFO={
  name:'FORTISSIMO Neo-Soul Player',
  version:1,
  principle:'Soul / Neo-Soul in the hands · Afro/Latin/Pop in the pocket · commercial harmony first',
  gestures:Object.entries(GESTURES).map(([id,value])=>({id,label:value.label})),
  harmonicSafety:'No implicit altered tensions or outside notes; inferred colors are limited to stable 7ths/9ths.'
};
