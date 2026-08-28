function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
function clamp01(value,fallback=0.65){ const n=Number(value); return Number.isFinite(n)?clamp(n,0,1):fallback; }
function lerp(a,b,t){ return a+(b-a)*clamp01(t,0); }

export const VIBE_BPM_MIN = 90;
export const VIBE_BPM_MAX = 150;

// Vibe Roulette now lives inside a dedicated Afro/Afropop writing range.
// The mapping is intentionally nonlinear: most slider resolution stays around
// 95–122 BPM where the supplied Afro drum library is strongest, while the last
// quarter opens faster Afro-Latin / tropical energy up to 150 BPM.
export function recommendedBpmForEnergy(value){
  const energy=clamp01(value,0.65);
  if(energy<0.35) return Math.round(lerp(90,100,energy/0.35));
  if(energy<0.75) return Math.round(lerp(100,120,(energy-0.35)/0.40));
  const t=(energy-0.75)/0.25;
  return Math.round(120+30*Math.pow(clamp01(t,0),1.28));
}

export function describeBodyEnergy(value){
  const energy=clamp01(value,0.65);
  const percent=Math.round(energy*100);
  const label=energy<0.35?'Calm':energy<0.72?'Flowing':'Danceable';
  return { energy,percent,label,bpm:recommendedBpmForEnergy(energy),minBpm:VIBE_BPM_MIN,maxBpm:VIBE_BPM_MAX };
}

export function suggestedTempoRangeForEnergy(value,{width=7,bias=0}={}){
  const energy=clamp01(value,0.65);
  const center=clamp(recommendedBpmForEnergy(energy)+Number(bias||0),VIBE_BPM_MIN,VIBE_BPM_MAX);
  const adaptiveWidth=energy>0.88?Math.max(width,10):width;
  return {
    min:Math.round(clamp(center-adaptiveWidth,VIBE_BPM_MIN,VIBE_BPM_MAX)),
    max:Math.round(clamp(center+adaptiveWidth,VIBE_BPM_MIN,VIBE_BPM_MAX)),
    center:Math.round(center)
  };
}

export function energyForBpm(bpm){
  const target=clamp(Number(bpm)||108,VIBE_BPM_MIN,VIBE_BPM_MAX);
  let best={energy:0,bpm:recommendedBpmForEnergy(0),distance:Infinity};
  for(let i=0;i<=1000;i+=1){
    const energy=i/1000;
    const candidate=recommendedBpmForEnergy(energy);
    const distance=Math.abs(candidate-target);
    if(distance<best.distance) best={energy,bpm:candidate,distance};
  }
  return best.energy;
}
