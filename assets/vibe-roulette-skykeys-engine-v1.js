export const SKYKEYS_PHASE3_INFO={version:'3.0.0',engine:'S.K.Y. Keys Sound Engine',isolated:true,mutatesPianist:false,mutatesHarmony:false,catalogTarget:222};

const SAMPLE_RE=/^(\d{3})-([^.]+)\.flac$/i;
const DEFAULT_SETTINGS={Attack:0,Release:.8,Overlap:0,Voices:8,'Loop Bool':0,Start:0,'Loop Start':0,'Loop End':1,Stereo:1};

export function parseSkyKeysSampleName(name){
  const m=String(name||'').match(SAMPLE_RE);
  return m?{rootMidi:Number(m[1]),zoneLabel:m[2],name}:null;
}

export function playbackRateForMidi(targetMidi,rootMidi){return 2**((Number(targetMidi)-Number(rootMidi))/12);}

export function parseCatalogCsv(text){
  const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2)return [];
  const head=lines[0].split(',');
  return lines.slice(1).map(line=>{
    const cols=line.split(',');
    const row=Object.fromEntries(head.map((h,i)=>[h,cols[i]??'']));
    return {
      id:Number(row.id),name:row.name,function:row.function_category,source:row.source_category,section:row.original_section,
      favorite:row.favorite==='true',pianistCompatibility:row.pianist_compatibility,
      roleScores:{main_harmony:+row.main_harmony,rhythmic_chords:+row.rhythmic_chords,support_pad:+row.support_pad,pluck_arp:+row.pluck_arp,hook_lead:+row.hook_lead,texture:+row.texture}
    };
  }).filter(x=>x.id&&x.name);
}

export function parseSkyKeysSettingsText(text){
  const src=String(text||'');
  const tm=src.match(/Settings Template\s*=\s*(.+)/);
  if(!tm)return new Map();
  const fields=tm[1].split(',').map(x=>x.trim());
  const map=new Map();
  for(const line of src.split(/\r?\n/)){
    const m=line.match(/^(.*?) Settings:\s*(.+);\s*$/);
    if(!m)continue;
    const values=m[2].split(',').map(x=>x.trim()).filter(Boolean).map(v=>Number.isFinite(Number(v))?Number(v):v);
    if(values.length<3)continue;
    const raw=Object.fromEntries(fields.map((f,i)=>[f,values[i]]));
    map.set(m[1].trim(),{
      id:Number(raw['ID #']),soundType:Number(raw['Sound Type #']),sourceType:Number(raw['Source Type #']),
      ...Object.fromEntries(Object.entries(raw).filter(([k])=>!['ID #','Sound Type #','Source Type #'].includes(k)))
    });
  }
  return map;
}

export function nearestZone(zones,midi){
  if(!zones?.length)return null;
  return zones.reduce((best,z)=>{
    const db=Math.abs(Number(midi)-best.rootMidi),dz=Math.abs(Number(midi)-z.rootMidi);
    return dz<db||(dz===db&&z.rootMidi<best.rootMidi)?z:best;
  },zones[0]);
}

function pathParts(file){
  return String(file?.webkitRelativePath||file?.relativePath||file?.name||'').replace(/\\/g,'/').split('/').filter(Boolean);
}

export function indexLocalLibrary(files){
  const byPreset=new Map(); let settingsFile=null;
  for(const file of Array.from(files||[])){
    const parts=pathParts(file); const name=parts.at(-1)||'';
    if(/S\.K\.Y\. Keys Settings\.txt$/i.test(name)){settingsFile=file;continue;}
    const parsed=parseSkyKeysSampleName(name); if(!parsed||parts.length<2)continue;
    const preset=parts.at(-2); if(!byPreset.has(preset))byPreset.set(preset,[]);
    byPreset.get(preset).push({...parsed,kind:'file',file});
  }
  for(const zones of byPreset.values())zones.sort((a,b)=>a.rootMidi-b.rootMidi||a.name.localeCompare(b.name));
  return {byPreset,settingsFile};
}

export function producerGuardrail(preset,role='main_harmony'){
  if(!preset)return {allowed:false,reason:'unknown-preset'};
  if(role==='main_harmony'&&preset.pianistCompatibility==='restricted')return {allowed:false,reason:'not-for-full-pianist-voicings'};
  if(role==='main_harmony'&&preset.function==='Leads')return {allowed:false,reason:'lead-not-default-harmonic-bed'};
  return {allowed:true,reason:preset.pianistCompatibility||'conditional'};
}

class LruAudioBufferCache{
  constructor(max=96){this.max=Math.max(12,max);this.map=new Map();}
  get(k){if(!this.map.has(k))return null;const v=this.map.get(k);this.map.delete(k);this.map.set(k,v);return v;}
  set(k,v){if(this.map.has(k))this.map.delete(k);this.map.set(k,v);while(this.map.size>this.max)this.map.delete(this.map.keys().next().value);}
  clear(){this.map.clear();}
  get size(){return this.map.size;}
}

export class SkyKeysSoundEngine{
  constructor({audioContext=null,fallback=null,onStatus=null,maxCachedBuffers=96}={}){
    this.ctx=audioContext;this.fallback=fallback;this.onStatus=onStatus||(()=>{});
    this.catalog=[];this.catalogByName=new Map();this.settingsByName=new Map();this.localZones=new Map();this.remoteZones=new Map();
    this.buffers=new LruAudioBufferCache(maxCachedBuffers);this.voices=[];this.presetName=null;this.role='main_harmony';
  }
  async ensureContext(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx;}
  setCatalog(records){this.catalog=Array.from(records||[]);this.catalogByName=new Map(this.catalog.map(x=>[x.name,x]));this.onStatus({type:'catalog',count:this.catalog.length});return this.catalog.length;}
  async loadCatalog(url='data/vibe-roulette/skykeys-catalog-v1.csv'){
    const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(`S.K.Y. catalog ${r.status}`);return this.setCatalog(parseCatalogCsv(await r.text()));
  }
  async setLocalLibrary(files){
    this.stopAll();const indexed=indexLocalLibrary(files);this.localZones=indexed.byPreset;this.buffers.clear();
    if(indexed.settingsFile){try{this.settingsByName=parseSkyKeysSettingsText(await indexed.settingsFile.text());}catch(err){this.onStatus({type:'warning',reason:'settings-parse-failed',error:String(err)});}}
    this.onStatus({type:'library-indexed',presetFolders:this.localZones.size,settingsCount:this.settingsByName.size});
    return {presetFolders:this.localZones.size,settingsCount:this.settingsByName.size};
  }
  registerRemotePresetManifest(name,zones){
    const clean=Array.from(zones||[]).map(z=>({rootMidi:Number(z.rootMidi),zoneLabel:z.zoneLabel||'',name:z.name||String(z.url||'').split('/').at(-1),kind:'url',url:z.url})).filter(z=>Number.isFinite(z.rootMidi)&&z.url).sort((a,b)=>a.rootMidi-b.rootMidi);
    this.remoteZones.set(name,clean);return clean.length;
  }
  registerPresetSettings(name,settings){this.settingsByName.set(name,{...settings});return this.settingsByName.get(name);}
  getPreset(name=this.presetName){return this.catalogByName.get(name)||null;}
  getSettings(name=this.presetName){return {...DEFAULT_SETTINGS,...(this.settingsByName.get(name)||{})};}
  getZones(name=this.presetName){return this.localZones.get(name)||this.remoteZones.get(name)||[];}
  getAvailability(name){return {catalog:this.catalogByName.has(name),localSamples:(this.localZones.get(name)||[]).length,remoteSamples:(this.remoteZones.get(name)||[]).length,settings:this.settingsByName.has(name)};}
  listAvailable(){return this.catalog.map(p=>({...p,availability:this.getAvailability(p.name)}));}
  setPreset(name,{role=this.role,enforceGuardrail=true}={}){
    const p=this.getPreset(name);if(!p)throw new Error(`Unknown S.K.Y. Keys preset: ${name}`);
    const gate=producerGuardrail(p,role);if(enforceGuardrail&&!gate.allowed)throw new Error(`S.K.Y. Keys guardrail: ${gate.reason}`);
    this.stopAll();this.presetName=name;this.role=role;this.onStatus({type:'preset',preset:name,role,gate});return p;
  }
  async decodeZone(zone,presetName=this.presetName){
    const key=`${presetName}:${zone.name||zone.url}`;const hit=this.buffers.get(key);if(hit)return hit;
    const ctx=await this.ensureContext();let ab;
    if(zone.kind==='file')ab=await zone.file.arrayBuffer();else{const r=await fetch(zone.url,{cache:'force-cache'});if(!r.ok)throw new Error(`S.K.Y. sample ${r.status}`);ab=await r.arrayBuffer();}
    const buffer=await ctx.decodeAudioData(ab.slice(0));this.buffers.set(key,buffer);return buffer;
  }
  enforcePolyphony(limit){this.voices=this.voices.filter(v=>!v.ended);while(this.voices.length>=Math.max(1,limit||8)){const v=this.voices.shift();try{v.source.stop();}catch{}v.ended=true;}}
  releaseMidi(midi,releaseOverride=null){
    if(!this.ctx)return;const now=this.ctx.currentTime;const settings=this.getSettings();const release=Math.max(.02,releaseOverride??Number(settings.Release||.3));
    for(const v of this.voices){if(v.ended||v.midi!==midi)continue;try{v.gain.gain.cancelScheduledValues(now);v.gain.gain.setValueAtTime(Math.max(.0001,v.gain.gain.value),now);v.gain.gain.exponentialRampToValueAtTime(.0001,now+release);v.source.stop(now+release+.02);}catch{}}
  }
  noteOff(midi){this.releaseMidi(midi);}
  stopAll(){for(const v of this.voices){try{v.source.stop();}catch{}v.ended=true;}this.voices=[];}
  async noteOn(midi,velocity=96,{duration=null}={}){
    const preset=this.getPreset();if(!preset)throw new Error('No S.K.Y. Keys preset selected');const zones=this.getZones();
    if(!zones.length){this.onStatus({type:'fallback',preset:this.presetName,reason:'samples-unavailable'});if(this.fallback)return this.fallback(midi,velocity,{duration,preset:this.presetName});throw new Error(`No samples available for ${this.presetName}`);}
    const zone=nearestZone(zones,midi),settings=this.getSettings(),ctx=await this.ensureContext(),buffer=await this.decodeZone(zone);
    this.enforcePolyphony(Number(settings.Voices||8));if(!Number(settings.Overlap||0))this.releaseMidi(midi,.025);
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.playbackRate.value=playbackRateForMidi(midi,zone.rootMidi);
    const loopOn=Boolean(Number(settings['Loop Bool']||0));const ls=Number(settings['Loop Start']),le=Number(settings['Loop End']);
    if(loopOn&&buffer.duration>.08&&Number.isFinite(ls)&&Number.isFinite(le)&&le>ls){source.loop=true;source.loopStart=Math.max(0,Math.min(buffer.duration-.04,ls<=1?ls*buffer.duration:ls));source.loopEnd=Math.max(source.loopStart+.03,Math.min(buffer.duration,le<=1?le*buffer.duration:le));}
    const now=ctx.currentTime,attack=Math.max(.003,Number(settings.Attack||0)),peak=Math.max(.02,Math.min(1,Number(velocity)/127));
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(peak,now+attack);source.connect(gain).connect(ctx.destination);
    const startRaw=Number(settings.Start||0),offset=Number.isFinite(startRaw)&&startRaw>0?Math.min(buffer.duration-.01,startRaw<=1?startRaw*buffer.duration:startRaw):0;
    const voice={midi,source,gain,ended:false,preset:this.presetName,zone:zone.name};source.onended=()=>{voice.ended=true;};this.voices.push(voice);source.start(now,Math.max(0,offset));
    if(duration!=null)setTimeout(()=>this.noteOff(midi),Math.max(20,Number(duration)*1000));
    this.onStatus({type:'note',preset:this.presetName,midi,velocity,zone:zone.name,rootMidi:zone.rootMidi,rate:source.playbackRate.value,cacheSize:this.buffers.size});return voice;
  }
  async preload(midis,{preset=this.presetName}={}){
    const zones=this.getZones(preset),unique=new Map();for(const midi of midis||[]){const z=nearestZone(zones,midi);if(z)unique.set(z.name||z.url,z);}await Promise.all([...unique.values()].map(z=>this.decodeZone(z,preset)));return unique.size;
  }
  async playPerformancePlan(events,{preset=this.presetName,role='main_harmony'}={}){
    if(preset!==this.presetName)this.setPreset(preset,{role});const snapshot=(events||[]).map(e=>({...e}));const fingerprint=JSON.stringify(snapshot);const timers=[];
    for(const e of snapshot)timers.push(setTimeout(()=>this.noteOn(e.midi,e.velocity??96,{duration:e.duration??.5}).catch(error=>this.onStatus({type:'error',error:String(error)})),Math.max(0,Number(e.start||0)*1000)));
    return {fingerprint,inputUnchanged:fingerprint===JSON.stringify(events||[]),scheduled:snapshot.length,timers};
  }
}

export const SKYKEYS_PHASE3_PARAMETER_POLICY={
  rendered:['Attack','Release','Overlap','Voices','Loop Bool','Loop Start','Loop End','Start'],
  preservedForLater:['Glide','Legato','Rotate','TSPower','Tone Shifts','Reverse Power','Reverse Division','Reverse Continuous','Rev Fade in','Vibrato Power','Vibrato Depth','Vibrato Speed','Flutter','Reverb','Reverb Mix','Reverb Length','Reverb Tone','Filter Power','Low pass','High Pass','Filter Slope','Reverse End','Reverse Start','Saturation','Tone Range','Stereo'],
  note:'Phase 3 renders only parameters whose Web Audio semantics are sufficiently established; every other original value remains preserved in settings metadata rather than guessed.'
};
