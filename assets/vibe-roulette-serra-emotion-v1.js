const STORAGE_KEY='fortissimo.vibeRoulette.serraEmotion.v1';
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export const SERRA_EMOTION_FILTERS={
  joy:{id:'joy',label:'Alegría',emoji:'☀️',territory:'illusion',description:'luz, posibilidad y apertura'},
  sadness:{id:'sadness',label:'Tristeza',emoji:'💧',territory:'nostalgia',description:'ausencia, anhelo y vulnerabilidad'},
  calm:{id:'calm',label:'Calma',emoji:'🌿',territory:'connection',description:'respiración, estabilidad y espacio'},
  sensual:{id:'sensual',label:'Sensual',emoji:'🌙',territory:'connection',description:'cercanía elegante, tensión suave'},
  danceable:{id:'danceable',label:'Bailable',emoji:'〰️',territory:'movement',description:'pulso corporal y repetición'},
  party:{id:'party',label:'Fiesta',emoji:'✨',territory:'movement',description:'energía social y celebración'},
  introspection:{id:'introspection',label:'Introspección',emoji:'🪞',territory:'nostalgia',description:'profundidad, ambigüedad y silencio'}
};

export function normalizeEmotionFilters(filters=[]){
  return [...new Set((filters||[]).map(String).filter(id=>SERRA_EMOTION_FILTERS[id]))].slice(0,4);
}

export function getActiveSerraEmotionFilters(){
  if(typeof window==='undefined')return [];
  if(Array.isArray(window.__FORTISSIMO_SERRA_EMOTION_FILTERS__))return normalizeEmotionFilters(window.__FORTISSIMO_SERRA_EMOTION_FILTERS__);
  try{return normalizeEmotionFilters(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'));}catch(_){return [];}
}

export function setActiveSerraEmotionFilters(filters,{persist=true}={}){
  const normalized=normalizeEmotionFilters(filters);
  if(typeof window!=='undefined'){
    window.__FORTISSIMO_SERRA_EMOTION_FILTERS__=normalized;
    if(persist)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));}catch(_){}
    document.dispatchEvent(new CustomEvent('fortissimo:serra-emotion-change',{detail:{filters:normalized,profile:buildSerraEmotionProfile(normalized)}}));
  }
  return normalized;
}

export function buildSerraEmotionProfile(filters=[],primaryMood='connection'){
  const active=normalizeEmotionFilters(filters);
  const has=id=>active.includes(id);
  const vector={
    brightness:0.5+(has('joy')?.23:0)-(has('sadness')?.20:0)-(has('introspection')?.07:0),
    tension:0.38+(has('sadness')?.11:0)+(has('sensual')?.10:0)+(has('introspection')?.08:0)-(has('calm')?.15:0),
    movement:0.5+(has('danceable')?.25:0)+(has('party')?.23:0)+(has('joy')?.08:0)-(has('calm')?.18:0)-(has('introspection')?.10:0),
    intimacy:0.45+(has('sensual')?.25:0)+(has('calm')?.12:0)+(has('introspection')?.16:0)-(has('party')?.07:0),
    stability:0.55+(has('calm')?.22:0)+(has('joy')?.06:0)-(has('sadness')?.09:0)-(has('introspection')?.06:0),
    space:0.48+(has('calm')?.24:0)+(has('introspection')?.22:0)+(has('sensual')?.08:0)-(has('party')?.18:0),
    body:0.48+(has('danceable')?.28:0)+(has('party')?.25:0)-(has('calm')?.10:0)
  };
  Object.keys(vector).forEach(key=>{vector[key]=clamp(vector[key],0,1);});
  const contradictions=[];
  if(has('sadness')&&has('danceable'))contradictions.push('danceable-sadness');
  if(has('party')&&has('introspection'))contradictions.push('introspective-party');
  if(has('sensual')&&has('calm'))contradictions.push('calm-sensuality');
  return {version:1,filters:active,primaryMood,vector,contradictions,
    identity:'Urbano bailable con alma · emocional accesible · sensual elegante · comercial con identidad'};
}

export function serraEmotionProgressionWeight(item={},filters=[],primaryMood='connection'){
  const profile=buildSerraEmotionProfile(filters,primaryMood);
  if(!profile.filters.length)return 1;
  const mood=item.mood||{};
  const affinity=(value,target)=>{const numeric=Number(value);return 1-Math.abs((Number.isFinite(numeric)?numeric:0.5)-target);};
  let score=0.70;
  score+=affinity(mood.brightness,profile.vector.brightness)*0.12;
  score+=affinity(mood.tension,profile.vector.tension)*0.10;
  score+=affinity(mood.movement,profile.vector.movement)*0.15;
  score+=affinity(mood.stability,profile.vector.stability)*0.08;
  if(profile.filters.includes('joy'))score+=Number(mood.illusion||0.5)*0.10;
  if(profile.filters.includes('sadness'))score+=Number(mood.nostalgia||0.5)*0.12;
  if(profile.filters.includes('calm')||profile.filters.includes('sensual'))score+=Number(mood.connection||0.5)*0.09;
  if(profile.filters.includes('sensual'))score+=Number(mood.sensuality||0.5)*0.12;
  return clamp(score,0.72,1.48);
}

export function serraPerformanceDirection(filters=[],primaryMood='connection'){
  const profile=buildSerraEmotionProfile(filters,primaryMood);
  const {vector}=profile;
  return {
    profile,
    articulation:vector.movement>0.68?'defined-syncopated':vector.space>0.68?'breathing-legato':'balanced-conversation',
    topLine:vector.brightness>0.62?'gently-rising':vector.brightness<0.39?'falling-yearning':vector.intimacy>0.62?'stable-singing-tone':'small-arc',
    responseDensity:clamp(0.46+vector.movement*0.28+vector.intimacy*0.16-vector.space*0.18,0.38,0.82),
    sustainRatio:clamp(0.42+vector.space*0.34-vector.movement*0.12,0.42,0.78),
    velocityScale:clamp(0.82+vector.body*0.28,0.84,1.10),
    timingFeel:profile.filters.includes('sensual')?'slightly-behind':profile.filters.includes('party')?'forward-conversational':'human-center',
    ornamentAllowance:vector.intimacy>0.58||vector.space>0.62?3:2
  };
}

export const SERRA_EMOTION_INFO={
  version:1,
  axes:['Fiesta ↔ Introspección','Ilusión / deseo ↔ Conexión emocional','Movimiento ↔ Calma'],
  principle:'Filters shape harmony and performance before selection; they are not labels added after a random spin.'
};
