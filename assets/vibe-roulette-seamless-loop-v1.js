import { velocityLayerForMidiVelocity } from './vibe-roulette-rhodes-v3.js';
import { buildNeoSoulRhodesPlan, velocityToGain } from './vibe-roulette-neo-soul-player-v12.js';
import { renderPitchPreservedDrumBuffer, drumStretchInfo } from './vibe-roulette-afro-drums-v1.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

function combinePerformance(arrangement,options={}){
  const bpm=Number(options.bpm||arrangement?.bpm||96);
  const energyTarget=Number(options.energyTarget??0.65);
  const mood=options.mood||'connection';
  const performancePattern=options.performancePattern||arrangement?.performancePattern||null;
  const emotionFilters=options.emotionFilters||arrangement?.emotionFilters||[];
  const seed=options.performanceSeed||performancePattern?.variantSeed||`${arrangement?.firstPass?.roman?.join('-')||'vibe'}|${mood}|${Math.round(energyTarget*100)}`;

  const first=buildNeoSoulRhodesPlan(arrangement.firstPass.chords,{
    roman:arrangement.firstPass.roman,bars:4,beatsPerBar:4,bpm,energyTarget,mood,emotionFilters,performancePattern,pass:'A',phraseBarOffset:0,seed
  });
  const second=buildNeoSoulRhodesPlan(arrangement.secondPass.chords,{
    roman:arrangement.secondPass.roman,bars:4,beatsPerBar:4,bpm,energyTarget,mood,emotionFilters,performancePattern,pass:"A′",phraseBarOffset:4,previousRight:first.finalRight,seed
  });

  return {
    instrument:first.instrument,
    style:first.style,
    profile:'seamless-eightbar-neo-soul-v1.2-afro-drums-v1',
    performancePattern:first.performancePattern,
    neoSoulPlayer:true,
    bpm,energy:energyTarget,mood,emotionFilters,bars:8,beatsPerBar:4,totalBeats:32,
    events:[
      ...first.events.map(event=>({...event,pass:'A'})),
      ...second.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+first.voicings.length,pass:"A′"}))
    ],
    voicings:[...first.voicings,...second.voicings],
    gestures:[...first.gestures,...second.gestures],
    harmonicSafety:{
      policy:'FORTISSIMO Neo-Soul Player V1.2',
      violations:[...(first.harmonicSafety?.violations||[]),...(second.harmonicSafety?.violations||[])],
      count:Number(first.harmonicSafety?.count||0)+Number(second.harmonicSafety?.count||0)
    },
    dynamics:{
      velocityMin:Math.min(first.dynamics?.velocityMin||127,second.dynamics?.velocityMin||127),
      velocityMax:Math.max(first.dynamics?.velocityMax||0,second.dynamics?.velocityMax||0)
    },
    complexityBudget:{first:first.complexityBudget,second:second.complexityBudget},
    discipline:{first:first.discipline,second:second.discipline},
    afroPocket:{first:first.afroPocket,second:second.afroPocket},
    firstPass:first,
    secondPass:second
  };
}

export class SeamlessEightBarLoopTransport{
  constructor(engine,{onStateChange=null}={}){
    this.engine=engine;
    this.onStateChange=onStateChange;
    this.running=false;
    this.paused=false;
    this.arrangement=null;
    this.options=null;
    this.performance=null;
    this.timer=null;
    this.token=0;
    this.nextCycleStart=0;
    this.cycleSeconds=0;
    this.originTime=0;
    this.pauseOffsetSeconds=0;
    this.preview=null;
    this.ctx=null;
    this.chain=null;
    this.decoded=new Map();
    this.drum=null;
    this.drumBuffer=null;
    this.drumSource=null;
    this.fallbackDrumSources=new Set();
    this.drumGain=null;
    this.drumMuted=false;
    this.drumVolume=0.46;
  }

  emit(state,extra={}){
    if(typeof this.onStateChange==='function') this.onStateChange({state,running:this.running,paused:this.paused,activePass:'A + A′',positionSeconds:this.pauseOffsetSeconds,drum:this.drum,...extra});
  }

  async prepare(arrangement,options={}){
    const preview=this.engine.getAudioPreview();
    const performance=combinePerformance(arrangement,options);
    const jobs=[preview.sampleBank.preload(performance)];
    if(options.drum)jobs.push(fetch(options.drum.webPath,{cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error(`Drum audio failed to preload (${response.status})`);return response.arrayBuffer();}));
    await Promise.allSettled(jobs);
    return performance;
  }

  async prepareSources(token){
    const unique=new Map();
    for(const event of this.performance.events){
      const layer=velocityLayerForMidiVelocity(event.velocity);
      unique.set(`${layer}:${event.midi}`,[layer,event.midi]);
    }
    this.decoded.clear();
    const pianoReady=Promise.all([...unique.entries()].map(async([key,[layer,midi]])=>{
      try{this.decoded.set(key,await this.preview.sampleBank.decode(this.ctx,layer,midi));}catch(_){ }
    }));
    const drumReady=this.drum
      ? renderPitchPreservedDrumBuffer(this.ctx,this.drum,this.performance.bpm).then(buffer=>{this.drumBuffer=buffer;})
      : Promise.resolve().then(()=>{this.drumBuffer=null;});
    await drumReady;
    if(!this.running||token!==this.token) return false;
    await Promise.race([pianoReady,new Promise(resolve=>window.setTimeout(resolve,850))]);
    return this.running&&token===this.token;
  }

  async start(arrangement,options={}){
    this.stop();
    const token=++this.token;
    this.running=true;this.paused=false;this.pauseOffsetSeconds=0;
    this.arrangement=arrangement;
    this.options={...options,bpm:Number(options.bpm||arrangement?.bpm||96),performancePattern:options.performancePattern||arrangement?.performancePattern||null};
    this.drum=options.drum||null;
    this.performance=combinePerformance(arrangement,this.options);
    this.preview=this.engine.getAudioPreview();
    this.emit('playing',{activePass:this.drum?'Loading piano + Afro drums…':'Loading Neo-Soul Player V1.2…',preparing:true});

    this.ctx=await this.preview.ensureContext();
    if(!this.running||token!==this.token) return null;
    this.preview.stop();
    if(!this.running||token!==this.token) return null;
    this.chain=this.preview.createChain(this.ctx,this.performance.energy);
    const secondsPerBeat=60/this.performance.bpm;
    this.cycleSeconds=this.performance.totalBeats*secondsPerBeat;
    const firstStart=this.ctx.currentTime+0.12;
    this.originTime=firstStart;
    this.nextCycleStart=firstStart;

    this.scheduleCycle(this.nextCycleStart,token,{notBefore:firstStart});
    if(this.drum)this.scheduleFallbackDrums(this.nextCycleStart,token);
    this.nextCycleStart+=this.cycleSeconds;
    this.scheduleCycle(this.nextCycleStart,token);
    if(this.drum)this.scheduleFallbackDrums(this.nextCycleStart,token);
    this.nextCycleStart+=this.cycleSeconds;
    this.fillLookahead(token);
    const checkMs=Math.max(650,Math.min(2200,this.cycleSeconds*250));
    this.timer=window.setInterval(()=>this.fillLookahead(token),checkMs);
    this.emit('playing',{
      activePass:this.drum?'Starting immediately · preparing selected Afro drum…':'A + A′',scheduledAhead:2,preparing:Boolean(this.drum),performancePattern:this.performance.performancePattern,
      player:'FORTISSIMO Neo-Soul Player V1.2',harmonicSafety:this.performance.harmonicSafety,dynamics:this.performance.dynamics,
      discipline:this.performance.discipline,drumStretch:this.drum?drumStretchInfo(this.drum,this.performance.bpm):null
    });
    this.prepareSources(token).then(ready=>{
      if(!ready||!this.running||token!==this.token)return;
      this.stopFallbackDrums();
      if(this.drumBuffer){const start=this.ctx.currentTime+0.06;const elapsed=Math.max(0,start-this.originTime);this.scheduleDrum(start,elapsed%this.cycleSeconds,token);}
      this.emit('playing',{scheduledAhead:2,preparing:false,performancePattern:this.performance.performancePattern,player:'FORTISSIMO Neo-Soul Player V1.2',drumStretch:this.drum?drumStretchInfo(this.drum,this.performance.bpm):null});
    }).catch(error=>{
      if(this.running&&token===this.token)this.emit('playing',{activePass:'Instant rhythm active · selected drum could not load',preparing:false,audioError:error?.message||String(error)});
    });
    return this.performance;
  }

  async resume(){
    if(this.running)return this.performance;
    if(!this.paused||!this.arrangement)return this.start(this.arrangement,this.options||{});
    const token=++this.token;this.running=true;this.paused=false;
    this.emit('playing',{activePass:'Resuming in place…',preparing:true});
    this.ctx=this.ctx||await this.preview.ensureContext();
    if(!this.performance)this.performance=combinePerformance(this.arrangement,this.options||{});
    if(!this.decoded.size||this.drum&&!this.drumBuffer){if(!await this.prepareSources(token))return null;}
    this.preview.stop();
    this.chain=this.preview.createChain(this.ctx,this.performance.energy);
    const firstStart=this.ctx.currentTime+0.08;const offset=clamp(this.pauseOffsetSeconds,0,Math.max(0,this.cycleSeconds-0.001));
    this.originTime=firstStart-offset;
    this.scheduleCycle(this.originTime,token,{notBefore:firstStart});
    this.nextCycleStart=this.originTime+this.cycleSeconds;
    this.scheduleCycle(this.nextCycleStart,token);this.nextCycleStart+=this.cycleSeconds;
    this.scheduleDrum(firstStart,offset,token);
    this.fillLookahead(token);
    const checkMs=Math.max(650,Math.min(2200,this.cycleSeconds*250));this.timer=window.setInterval(()=>this.fillLookahead(token),checkMs);
    this.emit('playing',{preparing:false,resumed:true,positionSeconds:offset,drumStretch:this.drum?drumStretchInfo(this.drum,this.performance.bpm):null});
    return this.performance;
  }

  fillLookahead(token){
    if(!this.running||token!==this.token||!this.ctx) return;
    const horizon=this.ctx.currentTime+this.cycleSeconds*1.65;
    while(this.nextCycleStart<horizon){
      this.scheduleCycle(this.nextCycleStart,token);
      if(this.drum&&!this.drumBuffer)this.scheduleFallbackDrums(this.nextCycleStart,token);
      this.nextCycleStart+=this.cycleSeconds;
    }
  }

  scheduleCycle(cycleStart,token,{notBefore=-Infinity}={}){
    if(!this.running||token!==this.token) return;
    const secondsPerBeat=60/this.performance.bpm;
    for(const event of this.performance.events){
      const layer=velocityLayerForMidiVelocity(event.velocity);
      const buffer=this.decoded.get(`${layer}:${event.midi}`);
      const dynamicGain=velocityToGain(event.velocity,event.role);
      const naturalStart=cycleStart+event.startBeat*secondsPerBeat+(event.fingerOffsetSeconds||0);
      const bodyDuration=Math.max(0.10,event.durationBeats*secondsPerBeat);
      if(!buffer){this.scheduleFallbackRhodes(event,naturalStart,bodyDuration,notBefore);continue;}
      const requestedTail=Math.max(0,Number(event.releaseTailSeconds)||0);
      const maxAvailable=Math.max(0.10,buffer.duration-0.03);
      const totalDuration=Math.max(0.10,Math.min(maxAvailable,bodyDuration+requestedTail));
      const naturalEnd=naturalStart+totalDuration;
      if(naturalEnd<=notBefore+0.002)continue;

      const resumedInsideNote=naturalStart<notBefore;
      const sourceOffset=resumedInsideNote?clamp(notBefore-naturalStart,0,Math.max(0,maxAvailable-0.05)):0;
      const start=resumedInsideNote?notBefore:naturalStart;
      const remaining=Math.min(naturalEnd-start,maxAvailable-sourceOffset);
      if(remaining<=0.025)continue;
      const end=start+remaining;
      const source=this.ctx.createBufferSource();source.buffer=buffer;
      const gain=this.ctx.createGain();source.connect(gain);gain.connect(this.chain.input);
      gain.gain.setValueAtTime(0.0001,start);
      if(resumedInsideNote){
        gain.gain.exponentialRampToValueAtTime(Math.max(0.008,dynamicGain*0.54),start+0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001,end);
      }else{
        const bodyEnd=start+Math.min(bodyDuration,remaining);
        const attack=event.role==='ghost-answer'||event.role==='neo-soul-response'?0.011:0.016+Math.min(0.012,(1-dynamicGain)*0.015);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.012,dynamicGain),start+attack);
        const sustainPoint=Math.max(start+0.05,bodyEnd-Math.min(0.23,Math.max(0.08,bodyDuration*0.20)));
        if(sustainPoint<end-0.015)gain.gain.setValueAtTime(Math.max(0.008,dynamicGain*0.84),sustainPoint);
        if(end>bodyEnd+0.025)gain.gain.exponentialRampToValueAtTime(Math.max(0.004,dynamicGain*0.24),Math.min(end-0.012,bodyEnd+Math.min(requestedTail*0.58,0.12)));
        gain.gain.exponentialRampToValueAtTime(0.0001,end);
      }
      source.start(start,sourceOffset);source.stop(end+0.035);
      this.preview.activeSources.add(source);
      source.onended=()=>{
        this.preview.activeSources.delete(source);
        try{source.disconnect();}catch(_){ }
        try{gain.disconnect();}catch(_){ }
      };
    }
  }

  scheduleFallbackRhodes(event,naturalStart,bodyDuration,notBefore=-Infinity){
    const naturalEnd=naturalStart+bodyDuration;if(naturalEnd<=notBefore+0.002)return;
    const start=Math.max(naturalStart,notBefore);const duration=Math.max(0.06,naturalEnd-start);const end=start+duration;
    const frequency=440*Math.pow(2,(event.midi-69)/12);const gain=this.ctx.createGain();const oscA=this.ctx.createOscillator();const oscB=this.ctx.createOscillator();
    oscA.type='triangle';oscA.frequency.value=frequency;oscB.type='sine';oscB.frequency.value=frequency*2;const peak=Math.max(0.006,velocityToGain(event.velocity,event.role)*0.17);
    gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(peak,start+0.012);gain.gain.exponentialRampToValueAtTime(Math.max(0.0008,peak*0.44),start+Math.min(0.18,duration*0.35));gain.gain.exponentialRampToValueAtTime(0.0001,end);
    oscA.connect(gain);oscB.connect(gain);gain.connect(this.chain.input);oscA.start(start);oscB.start(start);oscA.stop(end+0.02);oscB.stop(end+0.02);this.preview.activeSources.add(oscA);this.preview.activeSources.add(oscB);
    const cleanup=source=>{source.onended=()=>{this.preview.activeSources.delete(source);try{source.disconnect();}catch(_){};}};cleanup(oscA);cleanup(oscB);
  }

  scheduleFallbackDrums(cycleStart,token){
    if(!this.running||token!==this.token||this.drumBuffer)return;
    const beat=60/this.performance.bpm;const gain=this.ensureDrumGain();
    for(let step=0;step<64;step++){
      const start=cycleStart+step*beat*0.5;const isKick=step%8===0||step%8===5;const isSnare=step%8===4;
      const osc=this.ctx.createOscillator();const amp=this.ctx.createGain();osc.type=isKick?'sine':isSnare?'triangle':'square';osc.frequency.setValueAtTime(isKick?118:isSnare?210:7200,start);if(isKick)osc.frequency.exponentialRampToValueAtTime(48,start+0.09);
      const peak=isKick?0.22:isSnare?0.105:0.018;amp.gain.setValueAtTime(0.0001,start);amp.gain.exponentialRampToValueAtTime(peak,start+0.003);amp.gain.exponentialRampToValueAtTime(0.0001,start+(isKick?0.12:isSnare?0.075:0.025));osc.connect(amp);amp.connect(gain);osc.start(start);osc.stop(start+(isKick?0.13:isSnare?0.085:0.03));this.fallbackDrumSources.add(osc);
      osc.onended=()=>{this.fallbackDrumSources.delete(osc);try{osc.disconnect();amp.disconnect();}catch(_){}};
    }
  }

  stopFallbackDrums(){for(const source of this.fallbackDrumSources){try{source.stop();}catch(_){}try{source.disconnect();}catch(_){}}this.fallbackDrumSources.clear();}

  ensureDrumGain(){
    if(this.drumGain)return this.drumGain;
    const gain=this.ctx.createGain();gain.gain.value=this.drumMuted?0:this.drumVolume;gain.connect(this.ctx.destination);this.drumGain=gain;return gain;
  }

  scheduleDrum(start,offsetSeconds=0,token=this.token){
    this.stopDrumSource();
    if(!this.running||token!==this.token||!this.drumBuffer)return;
    const source=this.ctx.createBufferSource();source.buffer=this.drumBuffer;source.loop=true;source.loopStart=0;source.loopEnd=Math.min(this.cycleSeconds,this.drumBuffer.duration);
    source.connect(this.ensureDrumGain());
    const offset=clamp(offsetSeconds,0,Math.max(0.001,source.loopEnd-0.001));source.start(start,offset);this.drumSource=source;
    source.onended=()=>{if(this.drumSource===source)this.drumSource=null;try{source.disconnect();}catch(_){}};
  }

  stopDrumSource(){this.stopFallbackDrums();if(this.drumSource){try{this.drumSource.stop();}catch(_){}try{this.drumSource.disconnect();}catch(_){}this.drumSource=null;}}

  setDrumMuted(value){
    this.drumMuted=Boolean(value);if(!this.ctx||!this.drumGain)return this.drumMuted;
    const now=this.ctx.currentTime;const target=this.drumMuted?0:this.drumVolume;this.drumGain.gain.cancelScheduledValues(now);this.drumGain.gain.setValueAtTime(Math.max(0,this.drumGain.gain.value),now);this.drumGain.gain.linearRampToValueAtTime(target,now+0.007);return this.drumMuted;
  }

  setDrumVolume(value){
    this.drumVolume=clamp(Number(value),0,1);if(this.ctx&&this.drumGain&&!this.drumMuted){const now=this.ctx.currentTime;this.drumGain.gain.cancelScheduledValues(now);this.drumGain.gain.setTargetAtTime(this.drumVolume,now,0.018);}return this.drumVolume;
  }

  async replaceDrum(drum){
    this.drum=drum||null;if(this.options)this.options={...this.options,drum:this.drum};this.drumBuffer=null;
    if(this.ctx&&this.drum)this.drumBuffer=await renderPitchPreservedDrumBuffer(this.ctx,this.drum,this.performance?.bpm||this.options?.bpm||drum.bpm);
    if(this.running&&this.arrangement)return this.start(this.arrangement,{...(this.options||{}),drum:this.drum});
    return this.drum;
  }

  pause(){
    if(!this.running)return;
    if(this.ctx&&this.cycleSeconds>0&&this.originTime){const elapsed=this.ctx.currentTime-this.originTime;this.pauseOffsetSeconds=((elapsed%this.cycleSeconds)+this.cycleSeconds)%this.cycleSeconds;}
    this.running=false;this.paused=true;this.token+=1;
    if(this.timer)window.clearInterval(this.timer);this.timer=null;
    this.preview?.stop();this.stopDrumSource();
    this.emit('paused',{positionBeat:this.performance?this.pauseOffsetSeconds/(60/this.performance.bpm):0});
  }

  stop(){
    this.running=false;this.paused=false;this.pauseOffsetSeconds=0;this.token+=1;
    if(this.timer) window.clearInterval(this.timer);this.timer=null;
    this.preview?.stop();this.stopDrumSource();this.decoded.clear();
    if(this.drumGain){try{this.drumGain.disconnect();}catch(_){}this.drumGain=null;}
    this.emit('stopped');
  }
}

export function buildSeamlessEightBarPerformance(arrangement,options={}){
  return combinePerformance(arrangement,options);
}
