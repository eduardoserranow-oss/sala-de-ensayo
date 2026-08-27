"use strict";

const NOTE_NAMES=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
let cfg={instrument:"guitar",a4:440,minFreq:65,maxFreq:700,windowSize:4096};

self.onmessage=function(event){
  const data=event.data||{};
  if(data.type==="config"){
    cfg={...cfg,...data.config};
    return;
  }
  if(data.type==="window"){
    const incoming=new Float32Array(data.buffer);
    const size=Math.min(cfg.windowSize||4096,incoming.length);
    const samples=incoming.subarray(incoming.length-size);
    const result=detectPitch(samples,data.sampleRate||48000,cfg);
    self.postMessage({type:"pitch",seq:data.seq||0,result});
    return;
  }
  if(data.type==="selftest"){
    const report=runSelfTest(data.sampleRate||48000,data.a4||440);
    self.postMessage({type:"selftest",report});
  }
};

function detectPitch(input,sampleRate,config){
  const n=input.length;
  if(n<1024) return null;

  let mean=0;
  for(let i=0;i<n;i++) mean+=input[i];
  mean/=n;

  let rmsSum=0;
  const x=new Float32Array(n);
  for(let i=0;i<n;i++){
    const v=input[i]-mean;
    x[i]=v;
    rmsSum+=v*v;
  }
  const rms=Math.sqrt(rmsSum/n);
  const gate=config.instrument==="bass"?0.0032:0.0028;
  if(!Number.isFinite(rms)||rms<gate) return null;

  const minFreq=Math.max(25,config.minFreq||40);
  const maxFreq=Math.max(minFreq+1,config.maxFreq||1000);
  const minTau=Math.max(2,Math.floor(sampleRate/maxFreq));
  const maxTau=Math.min(Math.floor(sampleRate/minFreq),Math.floor(n*0.48));
  if(maxTau<=minTau+2) return null;

  const diff=new Float32Array(maxTau+1);
  const limit=n-maxTau;
  const stride=config.instrument==="bass"?3:2;
  for(let tau=1;tau<=maxTau;tau++){
    let sum=0;
    for(let i=0;i<limit;i+=stride){
      const d=x[i]-x[i+tau];
      sum+=d*d;
    }
    diff[tau]=sum;
  }

  const cmnd=new Float32Array(maxTau+1);
  cmnd[0]=1;
  let running=0;
  for(let tau=1;tau<=maxTau;tau++){
    running+=diff[tau];
    cmnd[tau]=running>0?(diff[tau]*tau/running):1;
  }

  const threshold=config.instrument==="bass"?0.13:0.10;
  let tau=-1;
  for(let t=minTau;t<maxTau;t++){
    if(cmnd[t]<threshold){
      while(t+1<maxTau&&cmnd[t+1]<cmnd[t]) t++;
      tau=t;
      break;
    }
  }

  if(tau<0){
    let best=Infinity;
    let bestTau=-1;
    for(let t=minTau;t<=maxTau;t++){
      if(cmnd[t]<best){best=cmnd[t];bestTau=t;}
    }
    const reject=config.instrument==="bass"?0.22:0.19;
    if(bestTau<0||best>reject) return null;
    tau=bestTau;
  }

  let betterTau=tau;
  if(tau>1&&tau<maxTau){
    const s0=cmnd[tau-1],s1=cmnd[tau],s2=cmnd[tau+1];
    const denom=(s0-2*s1+s2);
    if(Math.abs(denom)>1e-12){
      const shift=0.5*(s0-s2)/denom;
      if(Number.isFinite(shift)&&Math.abs(shift)<=1) betterTau=tau+shift;
    }
  }

  const frequency=sampleRate/betterTau;
  if(!Number.isFinite(frequency)||frequency<minFreq*0.88||frequency>maxFreq*1.12) return null;

  const confidence=Math.max(0,Math.min(1,1-cmnd[tau]));
  if(confidence<(config.instrument==="bass"?0.72:0.78)) return null;

  const a4=Number(config.a4)||440;
  const midiFloat=69+12*Math.log2(frequency/a4);
  const midi=Math.round(midiFloat);
  const targetFrequency=a4*Math.pow(2,(midi-69)/12);
  const cents=1200*Math.log2(frequency/targetFrequency);
  const octave=Math.floor(midi/12)-1;
  const name=NOTE_NAMES[((midi%12)+12)%12];

  return {
    frequency,
    confidence,
    rms,
    midiFloat,
    midi,
    targetFrequency,
    cents,
    note:name,
    octave
  };
}

function runSelfTest(sampleRate,a4){
  const openMidi=[40,45,50,55,59,64];
  const offsets=[-5,0,5];
  const tests=[];
  for(const midi of openMidi){
    for(const cents of offsets){
      const target=a4*Math.pow(2,(midi-69)/12)*Math.pow(2,cents/1200);
      const signal=makeTestSignal(target,sampleRate,4096);
      const result=detectPitch(signal,sampleRate,{instrument:"guitar",a4,minFreq:65,maxFreq:700,windowSize:4096});
      const detected=result?.frequency||NaN;
      const error=Number.isFinite(detected)?1200*Math.log2(detected/target):Infinity;
      tests.push({midi,injectedHz:target,offsetCents:cents,detectedHz:detected,errorCents:error,pass:Number.isFinite(error)&&Math.abs(error)<=0.75});
    }
  }
  return {sampleRate,a4,tests,passed:tests.filter(t=>t.pass).length,total:tests.length,maxAbsError:Math.max(...tests.filter(t=>Number.isFinite(t.errorCents)).map(t=>Math.abs(t.errorCents)),Infinity)};
}

function makeTestSignal(freq,sampleRate,size){
  const out=new Float32Array(size);
  for(let i=0;i<size;i++){
    const t=i/sampleRate;
    const attack=Math.min(1,i/160);
    const decay=Math.exp(-i/(size*2.2));
    out[i]=attack*decay*(0.72*Math.sin(2*Math.PI*freq*t)+0.22*Math.sin(2*Math.PI*freq*2*t+0.37)+0.09*Math.sin(2*Math.PI*freq*3*t+0.91));
  }
  return out;
}
