"use strict";

class FortissimoTunerPitchProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.config={
      minFreq:60,
      maxFreq:720,
      windowSize:4096,
      hopSize:1536,
      decimation:2,
      threshold:.115,
      rmsGate:.0032
    };
    this.noiseFloor=.0008;
    this.samplesSinceAnalysis=0;
    this.configureBuffers();
    this.port.onmessage=(event)=>this.onMessage(event.data||{});
  }

  onMessage(message){
    if(message.type==="config"){
      Object.assign(this.config,message.config||{});
      this.configureBuffers();
    }else if(message.type==="reset"){
      this.resetState();
    }else if(message.type==="self-test"){
      this.runSelfTest(message.id||"default");
    }
  }

  configureBuffers(){
    const size=Math.max(2048,Math.min(16384,Math.round(this.config.windowSize)||4096));
    this.config.windowSize=size;
    this.ring=new Float32Array(size);
    this.window=new Float32Array(size);
    const decimation=Math.max(1,Math.min(4,Math.round(this.config.decimation)||1));
    this.config.decimation=decimation;
    const preparedLength=Math.floor(size/decimation);
    this.prepared=new Float32Array(preparedLength);
    const preparedRate=sampleRate/decimation;
    const maxTau=Math.min(Math.floor(preparedRate/Math.max(20,this.config.minFreq)),Math.floor(preparedLength*.49));
    this.yin=new Float32Array(Math.max(16,maxTau+2));
    this.resetState();
  }

  resetState(){
    this.ring.fill(0);
    this.writeIndex=0;
    this.filled=0;
    this.samplesSinceAnalysis=0;
    this.lastFrequency=0;
    this.noiseFloor=.0008;
  }

  process(inputs,outputs){
    const input=inputs[0];
    const channel=input&&input[0];
    if(channel){
      for(let i=0;i<channel.length;i++){
        this.ring[this.writeIndex]=channel[i];
        this.writeIndex=(this.writeIndex+1)%this.ring.length;
        if(this.filled<this.ring.length) this.filled++;
        this.samplesSinceAnalysis++;
      }
      if(this.filled===this.ring.length && this.samplesSinceAnalysis>=this.config.hopSize){
        this.samplesSinceAnalysis=0;
        const measurement=this.measure();
        if(measurement) this.port.postMessage({type:"pitch",...measurement});
        else this.port.postMessage({type:"silence"});
      }
    }
    for(const output of outputs){
      for(const outChannel of output) outChannel.fill(0);
    }
    return true;
  }

  copyWindow(){
    const n=this.ring.length;
    let source=this.writeIndex;
    for(let i=0;i<n;i++){
      this.window[i]=this.ring[source];
      source=(source+1)%n;
    }
  }

  prepare(raw){
    const d=this.config.decimation;
    const out=this.prepared;
    let rawMean=0;
    for(let i=0;i<raw.length;i++) rawMean+=raw[i];
    rawMean/=raw.length;
    let rawRms=0;
    for(let i=0;i<raw.length;i++){
      const v=raw[i]-rawMean;
      rawRms+=v*v;
    }
    rawRms=Math.sqrt(rawRms/raw.length);

    if(rawRms<.02) this.noiseFloor=this.noiseFloor*.995+rawRms*.005;
    const dynamicGate=Math.max(this.config.rmsGate,this.noiseFloor*2.8);
    if(rawRms<dynamicGate) return null;

    let mean=0;
    for(let i=0;i<out.length;i++){
      let sum=0;
      const base=i*d;
      for(let j=0;j<d;j++) sum+=raw[base+j]||0;
      const value=sum/d;
      out[i]=value;
      mean+=value;
    }
    mean/=out.length;
    for(let i=0;i<out.length;i++) out[i]-=mean;
    return {buffer:out,sampleRate:sampleRate/d,rms:rawRms,gate:dynamicGate};
  }

  measure(){
    this.copyWindow();
    const prepared=this.prepare(this.window);
    if(!prepared) return null;
    const result=this.detectPitch(prepared.buffer,prepared.sampleRate,this.config.minFreq,this.config.maxFreq,this.config.threshold);
    if(!result || result.confidence<.52) return null;
    const frequency=result.frequency;
    const jump=this.lastFrequency>0 ? Math.abs(1200*Math.log2(frequency/this.lastFrequency)) : 0;
    this.lastFrequency=frequency;
    return {
      frequency,
      confidence:result.confidence,
      periodicity:result.periodicity,
      rms:prepared.rms,
      gate:prepared.gate,
      jumpCents:Number.isFinite(jump)?jump:0,
      sampleRate
    };
  }

  detectPitch(buffer,rate,minFreq,maxFreq,threshold){
    const minTau=Math.max(2,Math.floor(rate/maxFreq));
    const maxTau=Math.min(Math.floor(rate/minFreq),Math.floor(buffer.length*.49),this.yin.length-2);
    if(maxTau<=minTau+3) return null;
    const yin=this.yin;
    yin.fill(0,0,maxTau+1);
    const limit=buffer.length-maxTau;
    const stride=2;
    for(let tau=1;tau<=maxTau;tau++){
      let sum=0;
      for(let i=0;i<limit;i+=stride){
        const diff=buffer[i]-buffer[i+tau];
        sum+=diff*diff;
      }
      yin[tau]=sum;
    }

    let running=0;
    yin[0]=1;
    for(let tau=1;tau<=maxTau;tau++){
      running+=yin[tau];
      yin[tau]=running>1e-12 ? yin[tau]*tau/running : 1;
    }

    let tauEstimate=-1;
    for(let tau=minTau;tau<maxTau;tau++){
      if(yin[tau]<threshold){
        while(tau+1<maxTau && yin[tau+1]<yin[tau]) tau++;
        tauEstimate=tau;
        break;
      }
    }
    if(tauEstimate<0){
      let best=Infinity;
      for(let tau=minTau;tau<=maxTau;tau++){
        if(yin[tau]<best){ best=yin[tau]; tauEstimate=tau; }
      }
      if(best>.24) return null;
    }

    const left=tauEstimate>minTau?tauEstimate-1:tauEstimate;
    const right=tauEstimate<maxTau?tauEstimate+1:tauEstimate;
    const s0=yin[left],s1=yin[tauEstimate],s2=yin[right];
    const denominator=2*(2*s1-s2-s0);
    let refinedTau=tauEstimate;
    if(Math.abs(denominator)>1e-12) refinedTau+=(s2-s0)/denominator;
    if(!Number.isFinite(refinedTau)||refinedTau<=0) return null;

    const correlation=this.refineWithNormalizedCorrelation(buffer,rate,refinedTau,minTau,maxTau);
    if(correlation&&Number.isFinite(correlation.tau)) refinedTau=correlation.tau;
    const frequency=rate/refinedTau;
    if(!Number.isFinite(frequency)||frequency<minFreq*.96||frequency>maxFreq*1.04) return null;
    const periodicity=Math.max(0,Math.min(1,correlation?.score||1-s1));
    const yinConfidence=Math.max(0,Math.min(1,1-s1));
    const confidence=Math.max(0,Math.min(1,yinConfidence*.55+periodicity*.45));
    return {frequency,confidence,periodicity,tau:refinedTau};
  }

  refineWithNormalizedCorrelation(buffer,rate,roughTau,minTau,maxTau){
    const center=Math.round(roughTau);
    const from=Math.max(minTau,center-4);
    const to=Math.min(maxTau,center+4);
    let bestTau=center;
    let bestScore=-Infinity;
    const scores=new Float32Array(to-from+1);
    for(let tau=from;tau<=to;tau++){
      let cross=0,a2=0,b2=0;
      const limit=buffer.length-tau;
      for(let i=0;i<limit;i++){
        const a=buffer[i],b=buffer[i+tau];
        cross+=a*b;
        a2+=a*a;
        b2+=b*b;
      }
      const score=cross/(Math.sqrt(a2*b2)+1e-12);
      scores[tau-from]=score;
      if(score>bestScore){ bestScore=score; bestTau=tau; }
    }
    const index=bestTau-from;
    let fractional=0;
    if(index>0&&index<scores.length-1){
      const y0=scores[index-1],y1=scores[index],y2=scores[index+1];
      const denominator=y0-2*y1+y2;
      if(Math.abs(denominator)>1e-12){
        fractional=.5*(y0-y2)/denominator;
        fractional=Math.max(-1,Math.min(1,fractional));
      }
    }
    return {tau:bestTau+fractional,score:Math.max(0,Math.min(1,bestScore))};
  }

  syntheticSignal(frequency,size){
    const signal=new Float32Array(size);
    const phase=.37;
    for(let i=0;i<size;i++){
      const t=i/sampleRate;
      const attack=Math.min(1,i/(sampleRate*.008));
      signal[i]=attack*(
        .62*Math.sin(2*Math.PI*frequency*t+phase)+
        .24*Math.sin(2*Math.PI*frequency*2*t+.71)+
        .10*Math.sin(2*Math.PI*frequency*3*t+1.13)+
        .04*Math.sin(2*Math.PI*frequency*4*t+.23)
      );
    }
    return signal;
  }

  runSelfTest(id){
    const old={...this.config};
    const targets=[82.406889,110,146.832384,195.997718,246.941651,329.627557];
    const offsets=[-10,-3,0,3,10];
    const results=[];
    this.config.minFreq=70;
    this.config.maxFreq=700;
    this.config.windowSize=4096;
    this.config.decimation=2;
    this.config.threshold=.115;
    this.configureBuffers();
    for(const target of targets){
      for(const offset of offsets){
        const injected=target*Math.pow(2,offset/1200);
        const signal=this.syntheticSignal(injected,4096);
        const prepared=this.prepare(signal);
        const result=prepared?this.detectPitch(prepared.buffer,prepared.sampleRate,70,700,.115):null;
        const error=result?1200*Math.log2(result.frequency/injected):null;
        results.push({target,offset,injected,detected:result?.frequency||null,errorCents:error,confidence:result?.confidence||0});
      }
    }
    const valid=results.filter(item=>Number.isFinite(item.errorCents));
    const maxError=valid.length?Math.max(...valid.map(item=>Math.abs(item.errorCents))):Infinity;
    const meanError=valid.length?valid.reduce((sum,item)=>sum+Math.abs(item.errorCents),0)/valid.length:Infinity;
    this.config=old;
    this.configureBuffers();
    this.port.postMessage({type:"self-test-result",id,passed:valid.length===results.length&&maxError<=1,maxErrorCents:maxError,meanErrorCents:meanError,tests:results});
  }
}

registerProcessor("fortissimo-tuner-pitch-v3",FortissimoTunerPitchProcessor);
