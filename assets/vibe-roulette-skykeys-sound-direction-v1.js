import {producerGuardrail} from './vibe-roulette-skykeys-engine-v1.js';

export const SKYKEYS_PHASE4_INFO={version:'4.0.0',engine:'S.K.Y. Keys Sound Direction',isolated:true,mutatesPianist:false,mutatesHarmony:false,selectionPolicy:'musical-function-first, contextual, deterministic, explainable'};

const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const includesAny=(s,items)=>items.some(x=>norm(s).includes(x));

export const SKYKEYS_EMOTIONAL_TERRITORIES={
  alegria:{warm:.62,bright:.88,dark:.08,intimate:.34,air:.56,organic:.58,texture:.38},
  tristeza:{warm:.58,bright:.18,dark:.82,intimate:.78,air:.55,organic:.66,texture:.62},
  calma:{warm:.72,bright:.42,dark:.30,intimate:.76,air:.84,organic:.66,texture:.52},
  sensual:{warm:.92,bright:.32,dark:.48,intimate:.94,air:.62,organic:.74,texture:.55},
  bailable:{warm:.56,bright:.76,dark:.18,intimate:.30,air:.34,organic:.54,texture:.32},
  fiesta:{warm:.48,bright:.94,dark:.08,intimate:.16,air:.28,organic:.42,texture:.34},
  introspeccion:{warm:.68,bright:.24,dark:.72,intimate:.90,air:.76,organic:.70,texture:.72},
  ilusion:{warm:.72,bright:.82,dark:.14,intimate:.62,air:.72,organic:.58,texture:.46},
  nostalgia:{warm:.76,bright:.24,dark:.64,intimate:.88,air:.68,organic:.78,texture:.72},
  conexion:{warm:.86,bright:.48,dark:.34,intimate:.92,air:.64,organic:.76,texture:.50}
};

const TERRITORY_ALIASES={joy:'alegria',happy:'alegria',sadness:'tristeza',sad:'tristeza',calm:'calma',dance:'bailable',danceable:'bailable',party:'fiesta',introspection:'introspeccion',reflective:'introspeccion',intimate:'sensual',connection:'conexion'};

export function normalizeBodyEnergy(value,{minBpm=90,maxBpm=150}={}){
  const n=Number(value);
  if(!Number.isFinite(n))return .5;
  if(n>=minBpm&&n<=maxBpm)return clamp01((n-minBpm)/(maxBpm-minBpm));
  if(n>1&&n<=100)return clamp01(n/100);
  return clamp01(n);
}

export function analyzePianistPerformance(events=[]){
  if(!Array.isArray(events)||!events.length)return {density:.45,notesPerSecond:0,polyphonyPeak:0,avgDuration:.5};
  const starts=events.map(e=>Number(e.start||0));
  const ends=events.map(e=>Number(e.start||0)+Math.max(.02,Number(e.duration??.5)));
  const span=Math.max(.5,Math.max(...ends)-Math.min(...starts));
  const notesPerSecond=events.length/span;
  const points=[];
  for(const e of events){const s=Number(e.start||0),t=s+Math.max(.02,Number(e.duration??.5));points.push([s,1],[t,-1]);}
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let active=0,polyphonyPeak=0;
  for(const [,d] of points){active+=d;polyphonyPeak=Math.max(polyphonyPeak,active);}
  const avgDuration=events.reduce((a,e)=>a+Math.max(.02,Number(e.duration??.5)),0)/events.length;
  const density=clamp01(notesPerSecond/5*.65+polyphonyPeak/8*.35);
  return {density,notesPerSecond,polyphonyPeak,avgDuration};
}

function normalizedTerritories(context={}){
  const values=[context.emotionalTerritory,...(context.emotions||[])].filter(Boolean).map(x=>TERRITORY_ALIASES[norm(x)]||norm(x));
  return values.length?[...new Set(values)]:['conexion'];
}

export function deriveMusicalFunction(context={}){
  if(context.role)return context.role;
  const performance=context.performanceAnalysis||analyzePianistPerformance(context.performancePlan||[]);
  const density=clamp01(context.pianistDensity??performance.density),energy=normalizeBodyEnergy(context.bodyEnergy??context.bpm??.5),vocalSpace=clamp01(context.vocalSpace??.72);
  const territories=normalizedTerritories(context);
  if(context.sectionRole==='support'||context.layerIntent==='support')return 'support_pad';
  if(context.sectionRole==='hook'||context.layerIntent==='hook')return energy>.56?'pluck_arp':'hook_lead';
  if((territories.includes('bailable')||territories.includes('fiesta'))&&energy>.68&&vocalSpace>.62&&density<.62)return 'pluck_arp';
  if((territories.includes('bailable')||territories.includes('fiesta'))&&energy>.60&&density<.74)return 'rhythmic_chords';
  return 'main_harmony';
}

function inferredTimbre(preset,settings={}){
  const s=norm(`${preset?.name} ${preset?.function} ${preset?.source} ${preset?.section}`);
  let warm=.50,bright=.50,dark=.35,intimate=.48,air=.42,organic=.42,texture=.40;
  if(includesAny(s,['rhodes','wurli','warm','soft','velvet','mellow','heart'])){warm+=.28;intimate+=.22;bright-=.10;}
  if(includesAny(s,['piano','acoustic','guitar','marimba','xylophone','thumb','harmonium'])){organic+=.30;intimate+=.12;}
  if(includesAny(s,['bell','chime','shine','bright','star','neon','saw'])){bright+=.30;warm-=.08;}
  if(includesAny(s,['dark','sad','lonely','pain','ancient','dust','crackle','old','aged','lo-fi','rough'])){dark+=.34;bright-=.18;texture+=.22;}
  if(includesAny(s,['pad','swell','strings','choir','space','field','texture','air'])){air+=.30;texture+=.24;}
  if(preset?.source==='Vintage Tape'){warm+=.18;dark+=.14;texture+=.24;bright-=.12;}
  if(preset?.source==='Effected'){texture+=.20;air+=.10;}
  if(preset?.source==='Acoustic'){organic+=.22;texture-=.06;}
  if(preset?.function==='Plucks'){bright+=.12;air-=.10;}
  if(preset?.function==='Leads'){bright+=.10;intimate-=.08;}
  const attack=Math.max(0,Number(settings.Attack??0)),release=Math.max(0,Number(settings.Release??.8));
  return {...Object.fromEntries(Object.entries({warm,bright,dark,intimate,air,organic,texture}).map(([k,v])=>[k,clamp01(v)])),fastAttack:attack<=.08,slowAttack:attack>=.28,longRelease:release>=1.15,shortRelease:release<=.65,loop:Boolean(Number(settings['Loop Bool']||0))};
}

function emotionVector(context={}){
  const names=normalizedTerritories(context);
  const vectors=names.map(x=>SKYKEYS_EMOTIONAL_TERRITORIES[x]).filter(Boolean);
  if(!vectors.length)return SKYKEYS_EMOTIONAL_TERRITORIES.conexion;
  const keys=Object.keys(vectors[0]);
  return Object.fromEntries(keys.map(k=>[k,vectors.reduce((a,v)=>a+v[k],0)/vectors.length]));
}

export function scorePresetForContext(preset,context={},settings={}){
  const role=deriveMusicalFunction(context);
  if(!preset)return {score:-Infinity,blocked:true,reasons:['unknown-preset'],role};
  const gate=producerGuardrail(preset,role);
  if(!gate.allowed)return {score:-Infinity,blocked:true,reasons:[gate.reason],role};
  if(role==='main_harmony'&&preset.section==='Guitars')return {score:-Infinity,blocked:true,reasons:['guitar-needs-guitar-appropriate-pattern'],role};
  if(role==='main_harmony'&&preset.section==='Vocals')return {score:-Infinity,blocked:true,reasons:['vocal-not-default-harmonic-bed'],role};

  const roleBase=clamp01(preset?.roleScores?.[role]??0),desired=emotionVector(context),timbre=inferredTimbre(preset,settings);
  const similarity=Object.keys(desired).reduce((sum,k)=>sum+(1-Math.abs(desired[k]-timbre[k])),0)/Object.keys(desired).length;
  const performance=context.performanceAnalysis||analyzePianistPerformance(context.performancePlan||[]);
  const energy=normalizeBodyEnergy(context.bodyEnergy??context.bpm??.5),density=clamp01(context.pianistDensity??performance.density),vocalSpace=clamp01(context.vocalSpace??.72),bpm=Number(context.bpm||110);
  const reasons=[];let score=roleBase*.44+similarity*.28;

  if(preset.favorite){score+=.02;reasons.push('favorite-prior');}
  if(preset.pianistCompatibility==='preferred'&&role==='main_harmony'){score+=.10;reasons.push('pianist-preferred');}
  if(preset.function==='Keys'&&role==='main_harmony'){score+=.08;reasons.push('keys-fit-main-harmony');}
  if(preset.function==='Chords'&&role==='rhythmic_chords'){score+=.10;reasons.push('chords-fit-rhythmic-role');}
  if(preset.function==='Pads'&&role==='support_pad'){score+=.11;reasons.push('pad-fit-support');}
  if(preset.function==='Plucks'&&role==='pluck_arp'){score+=.12;reasons.push('pluck-fit-rhythm');}
  if(preset.function==='Leads'&&role==='hook_lead'){score+=.11;reasons.push('lead-fit-hook');}

  if(energy>.68){score+=timbre.bright*.06+(timbre.fastAttack?.07:-.025)+(timbre.shortRelease?.025:0);}
  if(energy<.38){score+=timbre.warm*.05+timbre.air*.04+(timbre.longRelease?.04:0);}
  if(bpm>=125&&preset.function==='Pads'&&role==='main_harmony')score-=.08;
  if(density>.72&&role==='main_harmony'){score-=timbre.texture*.08;if(preset.function==='Keys')score+=.05;reasons.push('dense-pianist-needs-clearer-source');}
  if(vocalSpace>.70){score+=(1-timbre.texture)*.05;if(preset.function==='Leads'&&role!=='hook_lead')score-=.10;reasons.push('vocal-space-priority');}
  if(context.afroPriority!==false){if(['Keys','Plucks','Chords'].includes(preset.function))score+=.035;if(preset.function==='Pads'&&energy>.72)score-=.035;}
  if(context.neoSoulHands!==false&&role==='main_harmony'&&includesAny(preset.name,['rhodes','wurli','piano','keys'])){score+=.075;reasons.push('neo-soul-hands-compatible');}

  score=Math.max(0,Math.min(1.25,score));
  reasons.unshift(`emotion-match:${similarity.toFixed(3)}`,`role-fit:${roleBase.toFixed(3)}`);
  return {score,blocked:false,reasons,role,timbre,emotionMatch:similarity,context:{energy,density,vocalSpace,territories:normalizedTerritories(context)}};
}

function deterministicNoise(name,seed='default'){
  let h=2166136261;for(const ch of `${seed}:${name}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return ((h>>>0)%10000)/10000;
}

export function rankSkyKeysPresets(catalog,context={},{limit=12,exploration=.04,getSettings=()=>({}),requireAvailable=false,getAvailability=()=>({localSamples:1,remoteSamples:0})}={}){
  return Array.from(catalog||[]).filter(p=>{if(!requireAvailable)return true;const a=getAvailability(p.name)||{};return (a.localSamples||0)+(a.remoteSamples||0)>0;}).map(p=>({preset:p,...scorePresetForContext(p,context,getSettings(p.name)||{})})).filter(x=>!x.blocked).map(x=>({...x,finalScore:x.score+deterministicNoise(x.preset.name,context.seed||'sky')*Math.max(0,Math.min(.08,exploration))})).sort((a,b)=>b.finalScore-a.finalScore||a.preset.id-b.preset.id).slice(0,limit);
}

export function chooseSkyKeysPreset(catalog,context={},options={}){
  const ranked=rankSkyKeysPresets(catalog,context,{limit:Math.max(3,options.candidateCount||8),exploration:options.exploration??.04,getSettings:options.getSettings||(()=>({})),requireAvailable:Boolean(options.requireAvailable),getAvailability:options.getAvailability||(()=>({localSamples:1,remoteSamples:0}))});
  if(!ranked.length)return {preset:null,role:deriveMusicalFunction(context),reason:'no-eligible-preset',ranked:[]};
  const top=ranked[0];return {preset:top.preset,role:top.role,score:top.score,finalScore:top.finalScore,reasons:top.reasons,ranked};
}

export function chooseSkyKeysPresetForEngine(engine,context={},options={}){
  if(!engine?.catalog?.length)throw new Error('S.K.Y. Keys Sound Direction requires a loaded catalog');
  return chooseSkyKeysPreset(engine.catalog,context,{...options,getSettings:name=>engine.getSettings(name),getAvailability:name=>engine.getAvailability(name)});
}

export function applySoundDirectionToEngine(engine,context={},options={}){
  const decision=chooseSkyKeysPresetForEngine(engine,context,options);
  if(decision.preset)engine.setPreset(decision.preset.name,{role:decision.role,enforceGuardrail:true});
  return decision;
}

export function buildSoundDirectionContext({emotionalTerritory='conexion',emotions=[],bodyEnergy=.5,bpm=110,pianistDensity=null,performancePlan=[],vocalSpace=.72,sectionRole='main',seed='sky',role=null,afroPriority=true,neoSoulHands=true}={}){
  const analysis=analyzePianistPerformance(performancePlan);
  return {emotionalTerritory,emotions,bodyEnergy:normalizeBodyEnergy(bodyEnergy),bpm:Number(bpm)||110,pianistDensity:pianistDensity==null?analysis.density:clamp01(pianistDensity),performancePlan,performanceAnalysis:analysis,vocalSpace:clamp01(vocalSpace),sectionRole,seed,role,afroPriority,neoSoulHands};
}

export function summarizeSoundDecision(decision){
  if(!decision?.preset)return {preset:null,role:decision?.role||null};
  return {preset:decision.preset.name,id:decision.preset.id,function:decision.preset.function,source:decision.preset.source,role:decision.role,score:Number(decision.score.toFixed(4)),reasons:decision.reasons.slice(0,6)};
}

export const SKYKEYS_SOUND_DIRECTION_CONTRACT={
  chain:'Emotion + Body Energy + progression/rhythm + pianist density + vocal space -> musical function -> S.K.Y. category -> specific preset',
  mainRule:'Choose the required musical function first; never choose a preset first and force it into an unsuitable role.',
  upstreamInvariant:'Selection may choose an instrument only. It must never rewrite harmony, pianist notes, voicings, inversions, timing, velocities or A/A-prime memory.',
  deterministic:true,tasteTrainingMutation:false
};
