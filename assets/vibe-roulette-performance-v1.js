const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const clamp01=(v,f=0.65)=>{const n=Number(v);return Number.isFinite(n)?clamp(n,0,1):f;};

export const PERFORMANCE_FAMILIES=[
  {
    id:'afro-pocket',label:'Afro Pocket',tag:'#AfroPocket',
    description:'Root-led pocket, syncopated right-hand answers and breathing room.',
    affinities:['afro','afropop','afrobeats','tropical','connection','love','playful'],
    mainOffsets:[0.05,0.12,0.04,0.16],responseOffsets:[[1.55,3.25],[2.2,3.55],[1.7,3.1],[2.35,3.62]],bassOffsets:[0,0.03,0,0.05],pickupOffsets:[3.55,null,3.4,3.7],spread:0.85,responseGain:1.0
  },
  {
    id:'afropop-air',label:'Afropop Air',tag:'#AfropopAir',
    description:'Open top voice, fewer attacks, small pickups and modern space.',
    affinities:['afropop','commercial','warm','summer','beach','love','illusion'],
    mainOffsets:[0.08,0.22,0.09,0.18],responseOffsets:[[2.75],[1.8,3.4],[2.55],[1.95,3.45]],bassOffsets:[0,0.06,0.02,0.05],pickupOffsets:[null,3.65,null,3.58],spread:1.05,responseGain:0.88
  },
  {
    id:'rnb-push',label:'R&B Push',tag:'#RnBPush',
    description:'Late pocket, singing upper voice and anticipatory responses.',
    affinities:['rnb','soul','intimate','sensual','romantic-tension','heartbreak','suffocation'],
    mainOffsets:[0.18,0.08,0.2,0.1],responseOffsets:[[1.85,3.35],[2.65],[1.7,3.5],[2.3,3.72]],bassOffsets:[0.02,0.1,0.04,0.08],pickupOffsets:[3.7,3.45,null,3.68],spread:1.35,responseGain:0.92
  },
  {
    id:'tropical-conversation',label:'Tropical Conversation',tag:'#TropicalKeys',
    description:'Call-and-response keys with compact stabs and an Afro-Latin pulse.',
    affinities:['latin','tropical','caribbean','playful','summer','beach','spite'],
    mainOffsets:[0.04,0.32,0.05,0.28],responseOffsets:[[1.25,2.8,3.55],[1.7,3.15],[1.35,2.95,3.6],[1.9,3.45]],bassOffsets:[0,0.04,0,0.06],pickupOffsets:[3.62,3.7,3.48,3.7],spread:0.72,responseGain:1.08
  },
  {
    id:'indie-lofi-space',label:'Indie Lo-Fi Space',tag:'#IndieLoFi',
    description:'Longer breaths, gentle broken attacks and restrained movement.',
    affinities:['indie','lofi','nostalgia','vulnerable','melancholic','heartbreak','warm'],
    mainOffsets:[0.1,0.18,0.12,0.2],responseOffsets:[[3.05],[2.55],[3.2],[2.8]],bassOffsets:[0,0.08,0,0.08],pickupOffsets:[null,null,3.72,null],spread:1.55,responseGain:0.66
  },
  {
    id:'soul-topline',label:'Soul Topline',tag:'#SoulTopline',
    description:'Expressive top-note motion, gentle chord shells and human answers.',
    affinities:['soul','rnb','love','connection','nostalgia','warm','sensual'],
    mainOffsets:[0.06,0.14,0.08,0.12],responseOffsets:[[2.3,3.5],[1.8,3.25],[2.15,3.55],[1.75,3.4]],bassOffsets:[0,0.04,0.02,0.04],pickupOffsets:[null,3.68,3.58,3.72],spread:1.18,responseGain:0.96
  },
  {
    id:'pop-clean',label:'Modern Pop Clean',tag:'#ModernPopKeys',
    description:'Clear harmonic statement with small syncopations and minimal ornament.',
    affinities:['pop','commercial','illusion','love','summer'],
    mainOffsets:[0.03,0.07,0.03,0.09],responseOffsets:[[2.85],[3.2],[2.65],[3.35]],bassOffsets:[0,0,0,0],pickupOffsets:[null,null,null,3.7],spread:0.68,responseGain:0.72
  }
];

function normalize(value=''){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-');}
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}

function weightedPick(items,weightFn,random=Math.random){
  const weights=items.map(item=>Math.max(0.001,Number(weightFn(item))||0.001));
  const total=weights.reduce((a,b)=>a+b,0);let cursor=random()*total;
  for(let i=0;i<items.length;i+=1){cursor-=weights[i];if(cursor<=0)return items[i];}
  return items.at(-1);
}

function profileTokens({storyProfile=null,emotionalState='love',mood='connection'}={}){
  const tokens=new Set([normalize(mood),normalize(emotionalState)]);
  (storyProfile?.tags||[]).forEach(tag=>tokens.add(normalize(tag.replace(/^#/,''))));
  (storyProfile?.vibeSignals||[]).forEach(signal=>tokens.add(normalize(signal.id||signal.label)));
  return tokens;
}

export class KeyboardPerformanceSelector{
  constructor({random=Math.random,maxHistory=4}={}){this.random=random;this.maxHistory=maxHistory;this.history=[];}
  score(family,context={}){
    const tokens=profileTokens(context);let score=1;
    for(const affinity of family.affinities){const a=normalize(affinity);if([...tokens].some(token=>token.includes(a)||a.includes(token)))score*=1.24;}
    const energy=clamp01(context.energyTarget,0.65);
    if(family.id==='tropical-conversation'&&energy>0.67)score*=1.14;
    if(family.id==='indie-lofi-space'&&energy<0.58)score*=1.16;
    if(family.id==='rnb-push'&&context.emotionalState==='suffocation')score*=1.18;
    if(this.history.includes(family.id))score*=0.15;
    return score;
  }
  select(context={}){
    const family=weightedPick(PERFORMANCE_FAMILIES,item=>this.score(item,context),this.random);
    this.history.unshift(family.id);this.history=[...new Set(this.history)].slice(0,this.maxHistory);
    const variant=Math.floor(this.random()*1000000);
    return {...family,variant,variantSeed:`${family.id}-${variant}`,version:1};
  }
}

export function performanceTimingForBar(pattern,barIndex,{pass='A',energyTarget=0.65}={}){
  const p=pattern||PERFORMANCE_FAMILIES[0];const i=((barIndex%4)+4)%4;const energy=clamp01(energyTarget,0.65);
  const prime=pass==="A′"||pass==='A-prime';
  const variantJitter=(hash01(`${p.variantSeed}|${pass}|${i}`)-0.5)*0.16;
  let mainOffset=(p.mainOffsets?.[i]??0.08)+variantJitter;
  let responses=[...(p.responseOffsets?.[i]||[2.6,3.5])];
  let bassOffset=p.bassOffsets?.[i]??0;
  let pickup=p.pickupOffsets?.[i]??null;
  if(prime){
    const mode=Math.floor(hash01(`${p.variantSeed}|prime-mode`)*4);
    if(mode===0)responses=responses.map((x,index)=>index===0?Math.max(1.05,x-0.28):Math.min(3.78,x+0.08));
    if(mode===1)mainOffset+=0.09;
    if(mode===2&&responses.length>1)responses=responses.slice(1);
    if(mode===3&&pickup===null)pickup=3.62;
  }
  const energyShift=(energy-0.5)*0.08;
  return {
    mainOffset:clamp(mainOffset-energyShift,0.015,0.42),
    responseOffsets:responses.map(x=>clamp(x,0.65,3.82)),
    bassOffset:clamp(bassOffset,0,0.16),
    pickupOffset:pickup===null?null:clamp(pickup,2.8,3.86),
    spreadMultiplier:p.spread||1,
    responseGain:p.responseGain||1,
    familyId:p.id,
    passVariation:prime
  };
}

export function performanceTasteVector(pattern){
  if(!pattern)return null;
  return {family:pattern.id,label:pattern.label,tag:pattern.tag,variant:pattern.variant,description:pattern.description};
}
