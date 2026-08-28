export const SKYKEYS_PHASE4_INFO={version:'4.0.0',engine:'S.K.Y. Keys Sound Direction',isolated:true,mutatesPianist:false,mutatesHarmony:false,selectionPolicy:'function-first-contextual-ranking'};

const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const norm=s=>String(s||'').trim().toLowerCase();
const includesAny=(s,words)=>words.some(w=>norm(s).includes(w));

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

const ROLE_BY_FUNCTION={
  Keys:'main_harmony',
  Chords:'rhythmic_chords',
  Pads:'support_pad',
  Plucks:'pluck_arp',
  Leads:'hook_lead'
};

export function deriveMusicalFunction(context={}){
  const density=clamp01(context.pianistDensity??.5),energy=clamp01(context.bodyEnergy??.5),vocalSpace=clamp01(context.vocalSpace??.7);
  const requested=context.role;
  if(requested)return requested;
  if(context.sectionRole==='hook'&&energy>.58)return 'hook_lead';
  if(context.sectionRole==='support'||density>.78)return 'support_pad';
  if(energy>.70&&density<.62)return 'rhythmic_chords';
  if(energy>.76&&vocalSpace>.64)return 'pluck_arp';
  return 'main_harmony';
}

function inferredTimbre(preset){
  const s=norm(`${preset?.name} ${preset?.function} ${preset?.source} ${preset?.section}`);
  let warm=.50,bright=.50,dark=.35,intimate=.48,air=.42,organic=.42,texture=.40;
  if(includesAny(s,['rhodes','wurli','warm','soft','velvet','mellow','heart'])){warm+=.28;intimate+=.22;bright-=.10;}
  if(includesAny(s,['piano','acoustic','guitar','marimba','xylophone','thumb'])){organic+=.30;intimate+=.12;}
  if(includesAny(s,['bell','chime','shine','bright','star','neon','saw'])){bright+=.30;warm-=.08;}
  if(includesAny(s,['dark','sad','lonely','ancient','dust','crackle','old','aged','lo-fi','rough'])){dark+=.34;bright-=.18;texture+=.22;}
  if(includesAny(s,['pad','swell','strings','choir','space','field','texture'])){air+=.30;texture+=.24;}
  if(preset?.source==='Vintage Tape'){warm+=.18;dark+=.14;texture+=.24;bright-=.12;}
  if(preset?.source==='Effected'){texture+=.20;air+=.10;}
  if(preset?.source==='Acoustic'){organic+=.22;texture-=.06;}
  if(preset?.function==='Plucks'){bright+=.12;air-=.10;}
  if(preset?.function==='Leads'){bright+=.10;intimate-=.08;}
  return Object.fromEntries(Object.entries({warm,bright,dark,intimate,air,organic,texture}).map(([k,v])=>[k,clamp01(v)]));
}

function emotionVector(context={}){
  const names=[];
  if(context.emotionalTerritory)names.push(context.emotionalTerritory);
  for(const x of context.emotions||[])names.push(x);
  if(!names.length)names.push('conexion');
  const vectors=names.map(x=>SKYKEYS_EMOTIONAL_TERRITORIES[norm(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'')]||null).filter(Boolean);
  if(!vectors.length)return SKYKEYS_EMOTIONAL_TERRITORIES.conexion;
  const keys=Object.keys(vectors[0]);
  return Object.fromEntries(keys.map(k=>[k,vectors.reduce((a,v)=>a+v[k],0)/vectors.length]));
}

export function scorePresetForContext(preset,context={}){
  const role=deriveMusicalFunction(context),roleBase=clamp01(preset?.roleScores?.[role]??0);
  if(!preset)return {score:-Infinity,blocked:true,reasons:['unknown-preset'],role};
  const reasons=[];
  if(role==='main_harmony'&&preset.pianistCompatibility==='restricted')return {score:-Infinity,blocked:true,reasons:['restricted-full-pianist-voicings'],role};
  if(role==='main_harmony'&&preset.function==='Leads')return {score:-Infinity,blocked:true,reasons:['lead-not-harmonic-bed'],role};
  if(role==='main_harmony'&&preset.section==='Guitars')return {score:-Infinity,blocked:true,reasons:['guitar-needs-guitar-appropriate-pattern'],role};
  if(role==='main_harmony'&&preset.section==='Vocals')return {score:-Infinity,blocked:true,reasons:['vocal-not-default-harmonic-bed'],role};

  const desired=emotionVector(context),timbre=inferredTimbre(preset);
  const similarity=Object.keys(desired).reduce((sum,k)=>sum+(1-Math.abs(desired[k]-timbre[k])),0)/Object.keys(desired).length;
  const energy=clamp01(context.bodyEnergy??.5),density=clamp01(context.pianistDensity??.5),vocalSpace=clamp01(context.vocalSpace??.72);
  const bpm=Number(context.bpm||110);
  let score=roleBase*.44+similarity*.28;

  if(preset.favorite){score+=.025;reasons.push('favorite-prior');}
  if(preset.pianistCompatibility==='preferred'&&role==='main_harmony'){score+=.10;reasons.push('pianist-preferred');}
  if(preset.function==='Keys'&&role==='main_harmony'){score+=.08;reasons.push('keys-fit-main-harmony');}
  if(preset.function==='Pads'&&role==='support_pad'){score+=.10;reasons.push('pad-fit-support');}
  if(preset.function==='Plucks'&&role==='pluck_arp'){score+=.10;reasons.push('pluck-fit-rhythm');}
  if(preset.function==='Leads'&&role==='hook_lead'){score+=.10;reasons.push('lead-fit-hook');}

  if(energy>.68){score+=timbre.bright*.07+(1-timbre.air)*.025;if(preset.function==='Plucks'||preset.function==='Chords')score+=.035;}
  if(energy<.38){score+=timbre.warm*.05+timbre.air*.05;}
  if(bpm>=125&&preset.function==='Pads'&&role==='main_harmony')score-=.08;
  if(bpm>=128&&timbre.air>.78&&role==='rhythmic_chords')score-=.06;
  if(density>.72&&role==='main_harmony'){score-=timbre.texture*.08;if(preset.function==='Keys')score+=.05;reasons.push('dense-pianist-needs-clearer-source');}
  if(vocalSpace>.70){score+=(1-timbre.texture)*.05;if(preset.function==='Leads'&&role!=='hook_lead')score-=.10;reasons.push('vocal-space-priority');}
  if(context.afroPriority!==false){if(preset.function==='Keys'||preset.function==='Plucks'||preset.function==='Chords')score+=.035;if(preset.function==='Pads'&&energy>.72)score-=.035;}
  if(context.neoSoulHands!==false&&role==='main_harmony'&&includesAny(preset.name,['rhodes','wurli','piano','keys'])){score+=.075;reasons.push('neo-soul-hands-compatible');}

  score=Math.max(0,Math.min(1.25,score));
  reasons.unshift(`emotion-match:${similarity.toFixed(3)}`,`role-fit:${roleBase.toFixed(3)}`);
  return {score,blocked:false,reasons,role,timbre,emotionMatch:similarity};
}

function deterministicNoise(name,seed='default'){
  let h=2166136261;for(const ch of `${seed}:${name}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return ((h>>>0)%10000)/10000;
}

export function rankSkyKeysPresets(catalog,context={},{limit=12,exploration=.06}={}){
  return Array.from(catalog||[]).map(p=>({preset:p,...scorePresetForContext(p,context)})).filter(x=>!x.blocked).map(x=>({...x,finalScore:x.score+deterministicNoise(x.preset.name,context.seed||'sky')*Math.max(0,Math.min(.12,exploration))})).sort((a,b)=>b.finalScore-a.finalScore||a.preset.name.localeCompare(b.preset.name)).slice(0,limit);
}

export function chooseSkyKeysPreset(catalog,context={},options={}){
  const ranked=rankSkyKeysPresets(catalog,context,{limit:Math.max(3,options.candidateCount||8),exploration:options.exploration??.045});
  if(!ranked.length)return {preset:null,role:deriveMusicalFunction(context),reason:'no-eligible-preset',ranked:[]};
  const top=ranked[0];
  return {preset:top.preset,role:top.role,score:top.score,finalScore:top.finalScore,reasons:top.reasons,ranked};
}

export function buildSoundDirectionContext({emotionalTerritory,emotions=[],bodyEnergy=.5,bpm=110,pianistDensity=.5,vocalSpace=.72,sectionRole='main',seed='sky',role=null,afroPriority=true,neoSoulHands=true}={}){
  return {emotionalTerritory,emotions,bodyEnergy:clamp01(bodyEnergy),bpm:Number(bpm)||110,pianistDensity:clamp01(pianistDensity),vocalSpace:clamp01(vocalSpace),sectionRole,seed,role,afroPriority,neoSoulHands};
}

export function summarizeSoundDecision(decision){
  if(!decision?.preset)return {preset:null,role:decision?.role||null};
  return {preset:decision.preset.name,id:decision.preset.id,function:decision.preset.function,source:decision.preset.source,role:decision.role,score:Number(decision.score?.toFixed?.(4)??decision.score),reasons:decision.reasons};
}
