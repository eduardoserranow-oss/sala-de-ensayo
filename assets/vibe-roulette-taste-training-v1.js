import './vibe-roulette-phase1-ux-v1.js';
import './vibe-roulette-phase15-workflow-v1.js';
import './vibe-roulette-phase151-ux-v1.js';
import './vibe-roulette-phase2-library-midi-v1.js';

const STORAGE_KEY='fortissimo.vibeRoulette.tasteTraining.v1';
const RATING_DELTA={inspire:2,interesting:1,generic:-1,wrongVibe:-2};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const cleanRoman=(roman=[])=>roman.map(token=>String(token).trim()).join('>');
const energyBucket=value=>{const e=Number(value)||0;return e<0.34?'low':e<0.68?'mid':'high';};

function blank(){return {version:1,count:0,harmony:{},performance:{},rhythm:{},emotion:{},combination:{},samples:[]};}
export function loadTasteTraining(){
  if(typeof localStorage==='undefined')return blank();
  try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return parsed&&parsed.version===1?{...blank(),...parsed}:blank();}catch(_){return blank();}
}
function save(model){if(typeof localStorage!=='undefined'){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(model));}catch(_){}}return model;}
function bump(vector,key,delta){if(!key)return;vector[key]=clamp(Number(vector[key]||0)+delta,-12,12);}
function scopeForReason(reason){
  if(reason==='progression'||reason==='specific-chord')return ['harmony'];
  if(reason==='pianist')return ['performance'];
  if(reason==='drum-groove')return ['rhythm'];
  if(reason==='emotion')return ['emotion'];
  if(reason==='too-basic'||reason==='too-loaded')return ['harmony','performance'];
  if(reason==='too-much-energy'||reason==='too-little-energy')return ['rhythm','emotion'];
  return ['harmony','performance','rhythm','emotion','combination'];
}
function scaledDelta(primary,reason,scope){
  const base=RATING_DELTA[primary]||0;
  if(reason==='combination')return base*0.55;
  if(scope==='combination')return base*0.75;
  return base;
}
function applyReason(model,context,primary,reason){
  const scopes=scopeForReason(reason);const romanKey=cleanRoman(context.roman||[]);const mood=String(context.mood||'');
  const performanceId=context.performancePattern?.id||context.performancePattern?.family||'';
  const drum=context.drum||{};const pocket=String(drum.pocket||'');const territory=String(drum.territory||'');
  const comboKey=[romanKey,performanceId,drum.id||''].join('::');
  for(const scope of scopes){
    const delta=scaledDelta(primary,reason,scope);
    if(scope==='harmony'){
      bump(model.harmony,`roman:${romanKey}`,delta);
      bump(model.harmony,`count:${(context.roman||[]).length}`,delta*0.35);
      if(mood)bump(model.harmony,`mood:${mood}:${romanKey}`,delta*0.45);
    }
    if(scope==='performance'&&performanceId)bump(model.performance,performanceId,delta);
    if(scope==='rhythm'){
      if(drum.id)bump(model.rhythm,`drum:${drum.id}`,delta);
      if(pocket)bump(model.rhythm,`pocket:${pocket}`,delta*0.55);
      bump(model.rhythm,`energy:${energyBucket(context.energyTarget)}`,delta*0.35);
    }
    if(scope==='emotion'){
      if(mood)bump(model.emotion,`mood:${mood}`,delta*0.55);
      for(const filter of context.emotionFilters||[])bump(model.emotion,`filter:${filter}`,delta*0.35);
      if(territory)bump(model.emotion,`territory:${territory}`,delta*0.35);
    }
    if(scope==='combination')bump(model.combination,comboKey,delta);
  }
}

export function recordTasteFeedback(context={},primary='interesting',reason='combination'){
  const model=loadTasteTraining();
  const pending=typeof window!=='undefined'&&Array.isArray(window.__FORTISSIMO_MULTI_FEEDBACK_REASONS__)?window.__FORTISSIMO_MULTI_FEEDBACK_REASONS__:null;
  const reasons=[...new Set((pending?.length?pending:(Array.isArray(reason)?reason:[reason])).filter(Boolean))];
  for(const item of reasons)applyReason(model,context,primary,item);
  model.count+=1;
  const drum=context.drum||{};
  model.samples.unshift({at:new Date().toISOString(),primary,reason:reasons[0]||'combination',reasons,roman:context.roman||[],chords:context.chords||[],key:context.key||'',mood:String(context.mood||''),energyTarget:context.energyTarget,bpm:context.bpm,emotionFilters:context.emotionFilters||[],performancePattern:context.performancePattern||null,drum:drum?{id:drum.id,originalName:drum.originalName,bpm:drum.bpm,pocket:drum.pocket,territory:drum.territory}:null,timeStretch:context.timeStretch||null,substitutions:context.substitutions||null});
  model.samples=model.samples.slice(0,120);
  if(typeof window!=='undefined')window.__FORTISSIMO_MULTI_FEEDBACK_REASONS__=null;
  return save(model);
}

function gentleWeight(score){return clamp(1+Number(score||0)*0.035,0.62,1.38);}
export function progressionTasteWeight(item={},mood=''){
  const model=loadTasteTraining();const roman=cleanRoman(item.roman||[]);
  const direct=Number(model.harmony[`roman:${roman}`]||0);
  const moodSpecific=Number(model.harmony[`mood:${mood}:${roman}`]||0);
  const count=Number(model.harmony[`count:${(item.roman||[]).length}`]||0);
  return gentleWeight(direct+0.55*moodSpecific+0.3*count);
}
export function performanceTasteWeight(familyId=''){
  return gentleWeight(loadTasteTraining().performance[familyId]||0);
}
export function drumTasteWeight(drum={},context={}){
  const model=loadTasteTraining();let score=0;
  score+=Number(model.rhythm[`drum:${drum.id}`]||0);
  score+=0.55*Number(model.rhythm[`pocket:${drum.pocket}`]||0);
  score+=0.25*Number(model.rhythm[`energy:${energyBucket(context.energyTarget)}`]||0);
  score+=0.25*Number(model.emotion[`territory:${drum.territory}`]||0);
  return gentleWeight(score);
}
export function emotionTasteWeight({mood='',emotionFilters=[]}={}){
  const model=loadTasteTraining();let score=Number(model.emotion[`mood:${mood}`]||0);
  for(const filter of emotionFilters)score+=0.35*Number(model.emotion[`filter:${filter}`]||0);
  return gentleWeight(score);
}
export function getTasteTrainingCount(){return loadTasteTraining().count||0;}
export function getPerformanceTasteVector(){return {...loadTasteTraining().performance};}
export const TASTE_TRAINING_INFO={version:1,storageKey:STORAGE_KEY,principle:'Feedback updates only the relevant taste vector; drum criticism does not punish harmony. Multi-factor feedback updates every selected relevant vector while counting as one rated direction.',explorationFloor:0.18};
