import { velocityLayerForMidiVelocity } from './vibe-roulette-rhodes-v3.js';
import { buildNeoSoulRhodesPlan, velocityToGain } from './vibe-roulette-neo-soul-player-v11.js';
import { AfroDrumLoopPlayer } from './vibe-roulette-drums.js';

function combinePerformance(arrangement,options={}){
  const bpm=Number(options.bpm||arrangement?.bpm||96);
  const energyTarget=Number(options.energyTarget??0.65);
  const mood=options.mood||'connection';
  const performancePattern=options.performancePattern||arrangement?.performancePattern||null;
  const seed=options.performanceSeed||performancePattern?.variantSeed||`${arrangement?.firstPass?.roman?.join('-')||'vibe'}|${mood}|${Math.round(energyTarget*100)}`;

  const first=buildNeoSoulRhodesPlan(arrangement.firstPass.chords,{
    roman:arrangement.firstPass.roman,bars:4,beatsPerBar:4,bpm,energyTarget,mood,performancePattern,pass:'A',phraseBarOffset:0,seed
  });
  const second=buildNeoSoulRhodesPlan(arrangement.secondPass.chords,{
    roman:arrangement.secondPass.roman,bars:4,beatsPerBar:4,bpm,energyTarget,mood,performancePattern,pass:"A′",phraseBarOffset:4,previousRight:first.finalRight,seed
  });

  return {
    instrument:first.instrument,
    style:first.style,
    profile:'seamless-eightbar-neo-soul-v1.1',
    performancePattern:first.performancePattern,
    neoSoulPlayer:true,
    bpm,energy:energyTarget,mood,bars:8,beatsPerBar:4,totalBeats:32,
    events:[
      ...first.events.map(event=>({...event,pass:'A'})),
      ...second.events.map(event=>({...event,startBeat:event.startBeat+16,chordIndex:event.chordIndex+first.voicings.length,pass:"A′"}))
    ],
    voicings:[...first.voicings,...second.voicings],
    gestures:[...first.gestures,...second.gestures],
    harmonicSafety:{
      policy:'FORTISSIMO Neo-Soul Player V1.1',
      violations:[...(first.harmonicSafety?.violations||[]),...(second.harmonicSafety?.violations||[])],
      count:Number(first.harmonicSafety?.count||0)+Number(second.harmonicSafety?.count||0)
    },
    dynamics:{
      velocityMin:Math.min(first.dynamics?.velocityMin||127,second.dynamics?.velocityMin||127),
      velocityMax:Math.max(first.dynamics?.velocityMax||0,second.dynamics?.velocityMax||0)
    },
    complexityBudget:{first:first.complexityBudget,second:second.complexityBudget},
    discipline:{first:first.discipline,second:second.discipline},
    firstPass:first,
    secondPass:second
  };
}

export class SeamlessEightBarLoopTransport{
  constructor(engine,{onStateChange=null}={}){
    this.engine=engine;
    this.onStateChange=onStateChange;
    this.running=false;
    this.arrangement=null;
    this.options=null;
    this.performance=null;
    this.timer=null;
    this.token=0;
    this.nextCycleStart=0;
    this.cycleSeconds=0;
    this.preview=null;
    this.ctx=null;
    this.chain=null;
    this.decoded=new Map();
    this.drumPlayer=new AfroDrumLoopPlayer({onStateChange:detail=>this.emit(this.running?'playing':detail.state,{drums:detail})});
  }

  emit(state,extra={}){
    if(typeof this.onStateChange==='function') this.onStateChange({state,running:this.running,activePass:'A + A′',...extra});
  }

  async prepare(arrangement,options={}){
    const preview=this.engine.getAudioPreview();
    const performance=combinePerformance(arrangement,options);
    await preview.sampleBank.preload(performance);
    return performance;
  }

  async start(arrangement,options={}){
    this.stop();
    const token=++this.token;
    this.running=true;
    this.arrangement=arrangement;
    this.options={...options,bpm:Number(options.bpm||arrangement?.bpm||96),performancePattern:options.performancePattern||arrangement?.performancePattern||null};
    this.performance=combinePerformance(arrangement,this.options);
    this.preview=this.engine.getAudioPreview();
    this.emit('playing',{activePass:'Loading Neo-Soul Player V1.1…',preparing:true});

    this.ctx=await this.preview.ensureContext();
    if(!this.running||token!==this.token) return null;

    await this.preview.sampleBank.preload(this.performance);
    if(!this.running||token!==this.token) return null;
    const unique=new Map();
    for(const event of this.performance.events){
      const layer=velocityLayerForMidiVelocity(event.velocity);
      unique.set(`${layer}:${event.midi}`,[layer,event.midi]);
    }
    this.decoded.clear();
    await Promise.all([...unique.entries()].map(async([key,[layer,midi]])=>{
      this.decoded.set(key,await this.preview.sampleBank.decode(this.ctx,layer,midi));
    }));
    if(!this.running||token!==this.token) return null;

    this.preview.stop();
    if(!this.running||token!==this.token) return null;
    this.chain=this.preview.createChain(this.ctx,this.performance.energy);
    const secondsPerBeat=60/this.performance.bpm;
    this.cycleSeconds=this.performance.totalBeats*secondsPerBeat;
    // The media element uses preservesPitch while the Rhodes stays on the same
    // AudioContext clock.  Start both from this transport call, never from two
    // independent UI timers.
    if(this.options.drumLoop) await this.drumPlayer.play(this.options.drumLoop,{sessionBpm:this.performance.bpm});
    const firstStart=this.ctx.currentTime+0.018;
    this.nextCycleStart=firstStart;

    this.scheduleCycle(this.nextCycleStart,token);
    this.nextCycleStart+=this.cycleSeconds;
    this.scheduleCycle(this.nextCycleStart,token);
    this.nextCycleStart+=this.cycleSeconds;
    this.fillLookahead(token);
    const checkMs=Math.max(650,Math.min(2200,this.cycleSeconds*250));
    this.timer=window.setInterval(()=>this.fillLookahead(token),checkMs);
    this.emit('playing',{
      scheduledAhead:2,preparing:false,performancePattern:this.performance.performancePattern,
      player:'FORTISSIMO Neo-Soul Player V1.1',harmonicSafety:this.performance.harmonicSafety,dynamics:this.performance.dynamics,
      discipline:this.performance.discipline
    });
    return this.performance;
  }

  fillLookahead(token){
    if(!this.running||token!==this.token||!this.ctx) return;
    const horizon=this.ctx.currentTime+this.cycleSeconds*1.65;
    while(this.nextCycleStart<horizon){
      this.scheduleCycle(this.nextCycleStart,token);
      this.nextCycleStart+=this.cycleSeconds;
    }
  }

  scheduleCycle(cycleStart,token){
    if(!this.running||token!==this.token) return;
    const secondsPerBeat=60/this.performance.bpm;
    for(const event of this.performance.events){
      const layer=velocityLayerForMidiVelocity(event.velocity);
      const buffer=this.decoded.get(`${layer}:${event.midi}`);
      if(!buffer) continue;
      const source=this.ctx.createBufferSource();
      source.buffer=buffer;
      const gain=this.ctx.createGain();

      const dynamicGain=velocityToGain(event.velocity,event.role);
      const start=cycleStart+event.startBeat*secondsPerBeat+(event.fingerOffsetSeconds||0);
      const bodyDuration=Math.max(0.10,event.durationBeats*secondsPerBeat);
      const requestedTail=Math.max(0,Number(event.releaseTailSeconds)||0);
      const maxAvailable=Math.max(0.10,buffer.duration-0.03);
      const totalDuration=Math.max(0.10,Math.min(maxAvailable,bodyDuration+requestedTail));
      const bodyEnd=start+Math.min(bodyDuration,totalDuration);
      const end=start+totalDuration;
      const attack=event.role==='ghost-answer'||event.role==='neo-soul-response'?0.011:0.016+Math.min(0.012,(1-dynamicGain)*0.015);
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.012,dynamicGain),start+attack);
      const sustainPoint=Math.max(start+0.05,bodyEnd-Math.min(0.23,Math.max(0.08,bodyDuration*0.20)));
      gain.gain.setValueAtTime(Math.max(0.008,dynamicGain*0.84),sustainPoint);
      if(end>bodyEnd+0.025){
        gain.gain.exponentialRampToValueAtTime(Math.max(0.004,dynamicGain*0.24),bodyEnd+Math.min(requestedTail*0.58,0.12));
      }
      gain.gain.exponentialRampToValueAtTime(0.0001,end);
      source.connect(gain); gain.connect(this.chain.input);
      source.start(start); source.stop(end+0.035);
      this.preview.activeSources.add(source);
      source.onended=()=>{
        this.preview.activeSources.delete(source);
        try{source.disconnect();}catch(_){ }
        try{gain.disconnect();}catch(_){ }
      };
    }
  }

  pause(){
    if(!this.running) return;
    this.running=false;
    this.token+=1;
    if(this.timer) window.clearInterval(this.timer);
    this.timer=null;
    this.preview?.stop();
    this.drumPlayer.pause();
    this.emit('paused');
  }

  stop(){
    this.running=false;
    this.token+=1;
    if(this.timer) window.clearInterval(this.timer);
    this.timer=null;
    this.preview?.stop();
    this.drumPlayer.stop();
    this.decoded.clear();
    this.emit('stopped');
  }

  setDrumsMuted(muted){ this.drumPlayer.setMuted(muted); }
}

export function buildSeamlessEightBarPerformance(arrangement,options={}){
  return combinePerformance(arrangement,options);
}
