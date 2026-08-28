export const SKYKEYS_PHASE2_INFO={version:'2.0.0-prototype',isolated:true,mutatesPianist:false,mutatesHarmony:false};

export const SKYKEYS_PILOT_PRESETS={
  'Beautiful Rhodes':{id:92,function:'Keys',source:'Acoustic',attack:0,release:1.451,overlap:false,voices:8,loop:false,stereo:true,pianistCompatibility:'preferred'},
  'Soft Piano':{id:91,function:'Keys',source:'Acoustic',attack:0,release:1.181,overlap:false,voices:8,loop:false,stereo:true,pianistCompatibility:'preferred'},
  'Modest Wurli':{id:89,function:'Keys',source:'Acoustic',attack:0.33,release:1.321,overlap:true,voices:8,loop:false,stereo:true,pianistCompatibility:'preferred'},
  'Grand Piano':{id:87,function:'Keys',source:'Acoustic',attack:0,release:1.521,overlap:false,voices:8,loop:false,stereo:true,pianistCompatibility:'preferred'},
  'Smooth Pluck':{id:193,function:'Plucks',source:'Synths',attack:0.01,release:0.831,overlap:false,voices:8,loop:false,stereo:true,pianistCompatibility:'restricted'},
  'Maybe Pad':{id:218,function:'Pads',source:'Effected',attack:0,release:0.901,overlap:false,voices:12,loop:true,stereo:true,pianistCompatibility:'conditional'},
  'Nylon Guitar':{id:99,function:'Plucks',source:'Acoustic',attack:0,release:2.001,overlap:true,voices:8,loop:false,stereo:true,pianistCompatibility:'restricted'}
};

const FLAC_RE=/^(\d{3})-([^.]+)\.flac$/i;

export function parseSkyKeysSampleName(name){
  const m=String(name||'').match(FLAC_RE);
  if(!m)return null;
  return {rootMidi:Number(m[1]),zoneLabel:m[2],name};
}

export function presetFromRelativePath(path){
  const parts=String(path||'').replace(/\\/g,'/').split('/').filter(Boolean);
  const file=parts.at(-1)||'';
  const preset=parts.length>=2?parts.at(-2):'';
  return {preset,file};
}

export function buildZoneMap(files,presetName){
  const zones=[];
  for(const file of Array.from(files||[])){
    const rel=file.webkitRelativePath||file.relativePath||file.name||'';
    const loc=presetFromRelativePath(rel);
    if(loc.preset!==presetName)continue;
    const parsed=parseSkyKeysSampleName(loc.file);
    if(!parsed)continue;
    zones.push({...parsed,file});
  }
  zones.sort((a,b)=>a.rootMidi-b.rootMidi||a.name.localeCompare(b.name));
  return zones;
}

export function nearestZone(zones,midi){
  if(!zones?.length)return null;
  let best=zones[0],distance=Math.abs(midi-best.rootMidi);
  for(let i=1;i<zones.length;i++){
    const d=Math.abs(midi-zones[i].rootMidi);
    if(d<distance || (d===distance && zones[i].rootMidi<best.rootMidi)){
      best=zones[i];distance=d;
    }
  }
  return best;
}

export function playbackRateForMidi(targetMidi,rootMidi){
  return 2**((Number(targetMidi)-Number(rootMidi))/12);
}

export class SkyKeysSamplerPrototype{
  constructor({audioContext=null,onStatus=null,fallback=null}={}){
    this.ctx=audioContext||null;
    this.onStatus=onStatus||(()=>{});
    this.fallback=fallback||null;
    this.files=[];
    this.zoneMaps=new Map();
    this.buffers=new Map();
    this.voices=[];
    this.presetName='Beautiful Rhodes';
  }
  setFiles(files){
    this.stopAll();
    this.files=Array.from(files||[]);
    this.zoneMaps.clear();
    this.buffers.clear();
    for(const presetName of Object.keys(SKYKEYS_PILOT_PRESETS)){
      this.zoneMaps.set(presetName,buildZoneMap(this.files,presetName));
    }
    this.onStatus({type:'indexed',presets:this.getInventory()});
    return this.getInventory();
  }
  getInventory(){
    return Object.fromEntries([...this.zoneMaps].map(([name,zones])=>[name,zones.length]));
  }
  setPreset(name){
    if(!SKYKEYS_PILOT_PRESETS[name])throw new Error(`Unknown S.K.Y. Keys pilot preset: ${name}`);
    this.stopAll();
    this.presetName=name;
    return SKYKEYS_PILOT_PRESETS[name];
  }
  async ensureContext(){
    if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(this.ctx.state==='suspended')await this.ctx.resume();
    return this.ctx;
  }
  async decodeZone(zone){
    const key=`${this.presetName}:${zone.name}`;
    if(this.buffers.has(key))return this.buffers.get(key);
    const ctx=await this.ensureContext();
    const ab=await zone.file.arrayBuffer();
    const buffer=await ctx.decodeAudioData(ab.slice(0));
    this.buffers.set(key,buffer);
    return buffer;
  }
  enforcePolyphony(limit){
    this.voices=this.voices.filter(v=>!v.ended);
    while(this.voices.length>=limit){
      const victim=this.voices.shift();
      try{victim.source.stop();}catch{}
      victim.ended=true;
    }
  }
  async noteOn(midi,velocity=96,{duration=null}={}){
    const preset=SKYKEYS_PILOT_PRESETS[this.presetName];
    const zones=this.zoneMaps.get(this.presetName)||[];
    if(!zones.length){
      this.onStatus({type:'fallback',preset:this.presetName,reason:'no-local-samples'});
      if(this.fallback)return this.fallback(midi,velocity,{duration});
      throw new Error(`No local samples indexed for ${this.presetName}`);
    }
    const zone=nearestZone(zones,midi);
    const ctx=await this.ensureContext();
    const buffer=await this.decodeZone(zone);
    this.enforcePolyphony(preset.voices||8);
    if(!preset.overlap)this.releaseMidi(midi,0.025);
    const source=ctx.createBufferSource();
    const gain=ctx.createGain();
    source.buffer=buffer;
    source.playbackRate.value=playbackRateForMidi(midi,zone.rootMidi);
    // Phase 2 safe-loop approximation. Production loop points remain a Phase 3 mapping concern.
    if(preset.loop && buffer.duration>0.7){
      source.loop=true;
      source.loopStart=Math.min(buffer.duration*0.18,0.35);
      source.loopEnd=Math.max(source.loopStart+0.08,buffer.duration*0.82);
    }
    const now=ctx.currentTime;
    const peak=Math.max(0.02,Math.min(1,velocity/127));
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.linearRampToValueAtTime(peak,now+Math.max(0.003,preset.attack||0.003));
    source.connect(gain).connect(ctx.destination);
    const voice={midi,source,gain,ended:false,preset:this.presetName,zone:zone.name};
    source.onended=()=>{voice.ended=true;};
    this.voices.push(voice);
    source.start(now);
    if(duration!=null)setTimeout(()=>this.noteOff(midi),Math.max(20,duration*1000));
    this.onStatus({type:'note',preset:this.presetName,midi,velocity,zone:zone.name,rootMidi:zone.rootMidi,rate:source.playbackRate.value});
    return voice;
  }
  releaseMidi(midi,releaseOverride=null){
    const preset=SKYKEYS_PILOT_PRESETS[this.presetName];
    const ctx=this.ctx;
    if(!ctx)return;
    const now=ctx.currentTime;
    for(const voice of this.voices){
      if(voice.ended||voice.midi!==midi)continue;
      const r=Math.max(0.02,releaseOverride??preset.release??0.3);
      try{
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(Math.max(0.0001,voice.gain.gain.value),now);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001,now+r);
        voice.source.stop(now+r+0.02);
      }catch{}
    }
  }
  noteOff(midi){this.releaseMidi(midi);}
  stopAll(){
    for(const voice of this.voices){try{voice.source.stop();}catch{} voice.ended=true;}
    this.voices=[];
  }
  async playPerformancePlan(events,{preset=this.presetName}={}){
    this.setPreset(preset);
    const snapshot=(events||[]).map(e=>({...e}));
    const fingerprint=JSON.stringify(snapshot);
    const timers=[];
    const t0=performance.now();
    for(const event of snapshot){
      timers.push(setTimeout(()=>this.noteOn(event.midi,event.velocity??96,{duration:event.duration??0.5}).catch(err=>this.onStatus({type:'error',error:String(err)})),Math.max(0,(event.start||0)*1000)));
    }
    return {fingerprint,inputUnchanged:fingerprint===JSON.stringify(events||[]),scheduled:snapshot.length,t0,timers};
  }
}

export function assertProducerGuardrail(presetName,role='main_harmony'){
  const p=SKYKEYS_PILOT_PRESETS[presetName];
  if(!p)return {allowed:false,reason:'unknown-preset'};
  if(role==='main_harmony' && p.pianistCompatibility==='restricted')return {allowed:false,reason:'not-for-full-pianist-voicings'};
  return {allowed:true,reason:p.pianistCompatibility};
}
