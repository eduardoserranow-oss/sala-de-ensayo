function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
function clamp01(value,fallback=0.65){ const n=Number(value); return Number.isFinite(n)?clamp(n,0,1):fallback; }
function lerp(a,b,t){ return a+(b-a)*clamp01(t,0); }

export const VIBE_BPM_MIN = 90;
export const VIBE_BPM_MAX = 150;

// Musical rather than linear mapping. Most of the slider resolution stays in the
// writing-friendly 80–120 BPM zone; the final quarter opens the faster tropical /
// afro-merengue / double-time territory without making ordinary "danceable" ideas race.
export function recommendedBpmForEnergy(value){
  const energy=clamp01(value,0.65);
  // Body Energy is deliberately the only tempo control.  The curve keeps useful
  // resolution around the middle while always remaining inside the drum library's
  // supported writing range.
  if(energy<0.42) return Math.round(lerp(90,108,energy/0.42));
  if(energy<0.74) return Math.round(lerp(108,126,(energy-0.42)/0.32));
  return Math.round(lerp(126,150,(energy-0.74)/0.26));
}

export function describeBodyEnergy(value){
  const energy=clamp01(value,0.65);
  const percent=Math.round(energy*100);
  const label=energy<0.38?'Calm':energy<0.72?'Flowing':'Danceable';
  return { energy,percent,label,bpm:recommendedBpmForEnergy(energy),minBpm:VIBE_BPM_MIN,maxBpm:VIBE_BPM_MAX };
}

export function suggestedTempoRangeForEnergy(value,{width=8,bias=0}={}){
  const energy=clamp01(value,0.65);
  const center=clamp(recommendedBpmForEnergy(energy)+Number(bias||0),VIBE_BPM_MIN,VIBE_BPM_MAX);
  const adaptiveWidth=energy>0.88?Math.max(width,12):energy<0.28?Math.max(width,7):width;
  return {
    min:Math.round(clamp(center-adaptiveWidth,VIBE_BPM_MIN,VIBE_BPM_MAX)),
    max:Math.round(clamp(center+adaptiveWidth,VIBE_BPM_MIN,VIBE_BPM_MAX)),
    center:Math.round(center)
  };
}

export function energyForBpm(bpm){
  const target=clamp(Number(bpm)||96,VIBE_BPM_MIN,VIBE_BPM_MAX);
  let best={energy:0,bpm:recommendedBpmForEnergy(0),distance:Infinity};
  for(let i=0;i<=1000;i+=1){
    const energy=i/1000;
    const candidate=recommendedBpmForEnergy(energy);
    const distance=Math.abs(candidate-target);
    if(distance<best.distance) best={energy,bpm:candidate,distance};
  }
  return best.energy;
}
