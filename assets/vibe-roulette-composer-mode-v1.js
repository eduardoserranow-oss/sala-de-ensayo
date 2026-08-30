import { progressionToChords, recommendedBpmForEnergy } from './vibe-roulette-engine-v2.js';
import { buildEightBarArrangement } from './vibe-roulette-eightbar.js';
import { buildCommercialFourBarPlan } from './vibe-roulette-groove.js';
import { suggestAfroChordAlternatives, replaceRomanAt } from './vibe-roulette-chord-alternatives-v1.js';

export const VIBE_ROULETTE_COMPOSER_MODE_V1_INFO = Object.freeze({
  version:'14.0.0',
  pillars:Object.freeze(['listen','lock','edit','variate']),
  maxUndo:30,
  keepDnaMaxChanges:2,
  pianoRoll:false,
  subdivisions:false
});

const MAX_UNDO=30;
const locks=new Set();
const undoStack=[];
const redoStack=[];
let compareA=null;
let compareB=null;
let compareShowing='B';
let variationSerial=0;
let lastObserved=null;
let suppressObserver=false;
let compositionDirty=false;
let spinArmedUntil=0;
let ui=null;

function clone(value){
  if(value==null)return value;
  if(typeof structuredClone==='function')return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function core(){
  return {
    session:window.__FORTISSIMO_VIBE_SESSION_V1__,
    engine:window.__FORTISSIMO_VIBE_ENGINE__
  };
}

function capture(){
  const snap=core().session?.capture?.();
  return snap?clone(snap):null;
}

function fingerprint(snapshot){
  if(!snapshot?.result||!snapshot?.arrangement)return '';
  return JSON.stringify({
    key:snapshot.result.key,
    roman:snapshot.result.roman,
    customSecondRoman:snapshot.result.customSecondRoman||null,
    energyTarget:snapshot.energyTarget,
    mood:snapshot.mood,
    emotionFilters:snapshot.emotionFilters,
    drum:snapshot.selectedDrum?.id||snapshot.selectedDrum?.originalName||null,
    first:snapshot.arrangement.firstPass?.roman,
    second:snapshot.arrangement.secondPass?.roman
  });
}

function setStatus(message,tone='neutral'){
  if(!ui)return;
  ui.status.textContent=message;
  ui.status.dataset.tone=tone;
}

function pushUndo(snapshot){
  if(!snapshot)return;
  const fp=fingerprint(snapshot);
  if(fp&&fingerprint(undoStack.at(-1))===fp)return;
  undoStack.push(clone(snapshot));
  if(undoStack.length>MAX_UNDO)undoStack.shift();
  redoStack.length=0;
  refreshToolbar();
}

async function restore(snapshot,{status='',track=false}={}){
  if(!snapshot||!core().session?.restore)return false;
  suppressObserver=true;
  try{
    const result=await core().session.restore(clone(snapshot));
    if(!result?.ok)return false;
    lastObserved=capture();
    if(track)compositionDirty=true;
    if(status)setStatus(status,'accent');
    refreshCards();
    refreshToolbar();
    return true;
  }finally{
    queueMicrotask(()=>{suppressObserver=false;});
  }
}

function targetForSlot(snapshot,slotIndex){
  if(!snapshot?.arrangement)return null;
  const second=slotIndex>=4;
  const localBar=slotIndex%4;
  const pass=second?snapshot.arrangement.secondPass:snapshot.arrangement.firstPass;
  if(!pass?.chords?.length)return null;
  const plan=buildCommercialFourBarPlan(pass.chords);
  const item=plan.find(entry=>Math.floor(Number(entry.startBeat||0)/4)===localBar);
  if(!item)return null;
  return {
    slotIndex,
    bar:slotIndex+1,
    pass:second?'second':'first',
    index:item.index,
    chord:pass.chords[item.index],
    romanToken:pass.roman?.[item.index]||'',
    roman:pass.roman||[],
    chords:pass.chords||[]
  };
}

function alternativesFor(snapshot,target){
  if(!snapshot?.result||!target)return [];
  return suggestAfroChordAlternatives({
    roman:target.roman,
    index:target.index,
    key:snapshot.result.key,
    mode:snapshot.result.mode,
    emotionFilters:snapshot.emotionFilters||snapshot.result.emotionFilters||[],
    primaryMood:snapshot.mood||snapshot.result.mood,
    limit:7
  }).filter(option=>option?.roman&&option.roman!==target.romanToken);
}

function rebuildSnapshot(snapshot){
  const next=clone(snapshot);
  next.arrangement=buildEightBarArrangement(next.result,{
    key:next.result.key,
    mode:next.result.mode,
    mood:next.result.mood,
    energyTarget:next.energyTarget
  });
  return next;
}

function applyAlternative(snapshot,target,option){
  let next=clone(snapshot);
  if(target.pass==='first'){
    const roman=replaceRomanAt(next.result.roman,target.index,option.roman);
    next.result={
      ...next.result,
      roman,
      chords:progressionToChords(roman,next.result.key,next.result.mode),
      customSecondRoman:null,
      evidenceClass:'USER_EDITED_AFRO',
      intent:{...next.result.intent,afroLanguage:option.classification||next.result.intent?.afroLanguage},
      userEdit:{bar:target.bar,replacement:option.roman,reason:option.reason||'Composer Mode variation'}
    };
  }else{
    const roman=replaceRomanAt(next.arrangement.secondPass.roman,target.index,option.roman);
    next.result={
      ...next.result,
      customSecondRoman:roman,
      evidenceClass:'USER_EDITED_AFRO',
      userEdit:{bar:target.bar,replacement:option.roman,reason:option.reason||'Composer Mode variation'}
    };
  }
  return rebuildSnapshot(next);
}

async function auditionSlot(slotIndex){
  const snapshot=capture();
  const target=targetForSlot(snapshot,slotIndex);
  const engine=core().engine;
  if(!target||!engine?.playFourBars)return;
  try{
    window.__FORTISSIMO_VIBE_ENGINE__?.stopAudio?.();
    setStatus(`Listening · Bar ${target.bar} · ${target.chord}`,'accent');
    await engine.playFourBars([target.chord],{
      roman:[target.romanToken],
      bars:1,
      beatsPerBar:4,
      bpm:recommendedBpmForEnergy(snapshot.energyTarget),
      energyTarget:snapshot.energyTarget,
      mood:snapshot.result.mood,
      emotionFilters:snapshot.result.emotionFilters||snapshot.emotionFilters,
      performancePattern:snapshot.result.performancePattern,
      pass:'COMPOSER-AUDITION'
    });
  }catch(error){
    setStatus(error?.message||'Could not audition this chord.','error');
  }
}

function toggleLock(slotIndex){
  if(locks.has(slotIndex))locks.delete(slotIndex);else locks.add(slotIndex);
  refreshCards();
  setStatus(locks.has(slotIndex)?`Bar ${slotIndex+1} locked.`:`Bar ${slotIndex+1} unlocked.`,'neutral');
}

async function regenerateSlot(slotIndex){
  if(locks.has(slotIndex)){setStatus(`Bar ${slotIndex+1} is locked.`,`neutral`);return;}
  const before=capture();
  const target=targetForSlot(before,slotIndex);
  const alternatives=alternativesFor(before,target);
  if(!alternatives.length){setStatus(`No safe alternative found for Bar ${slotIndex+1}.`,'neutral');return;}
  const option=alternatives[(variationSerial++)%alternatives.length];
  pushUndo(before);
  const next=applyAlternative(before,target,option);
  compareA=clone(before);compareB=clone(next);compareShowing='B';
  await restore(next,{status:`Bar ${slotIndex+1}: ${target.chord} → ${option.chord}`,track:true});
}

function editableGroups(snapshot){
  const map=new Map();
  for(let slot=0;slot<8;slot+=1){
    const target=targetForSlot(snapshot,slot);if(!target)continue;
    const key=`${target.pass}:${target.index}`;
    if(!map.has(key))map.set(key,{target,slots:[]});
    map.get(key).slots.push(slot);
  }
  return [...map.values()];
}

async function keepDNA(){
  const before=capture();
  if(!before)return;
  const candidates=editableGroups(before).filter(group=>group.slots.every(slot=>!locks.has(slot)));
  if(!candidates.length){setStatus('Everything available is locked. Unlock a bar to vary it.','neutral');return;}
  const rotated=[...candidates.slice(variationSerial%candidates.length),...candidates.slice(0,variationSerial%candidates.length)];
  const desired=Math.min(VIBE_ROULETTE_COMPOSER_MODE_V1_INFO.keepDnaMaxChanges,rotated.length,rotated.length>=4?2:1);
  let draft=clone(before);let changed=0;const changedBars=[];
  for(const group of rotated){
    if(changed>=desired)break;
    const slot=group.slots[0];
    const target=targetForSlot(draft,slot)||group.target;
    const alternatives=alternativesFor(draft,target);
    if(!alternatives.length)continue;
    const option=alternatives[(variationSerial+changed)%alternatives.length];
    draft=applyAlternative(draft,target,option);
    changed+=1;changedBars.push(target.bar);
  }
  variationSerial+=1;
  if(!changed){setStatus('No safe DNA variation found with the current locks.','neutral');return;}
  pushUndo(before);
  compareA=clone(before);compareB=clone(draft);compareShowing='B';
  await restore(draft,{status:`Keep DNA · varied ${changedBars.map(bar=>`Bar ${bar}`).join(' + ')}`,track:true});
}

async function undo(){
  if(!undoStack.length)return;
  const current=capture();const previous=undoStack.pop();
  if(current)redoStack.push(clone(current));
  compareA=null;compareB=null;
  await restore(previous,{status:'Undo · previous composition restored',track:true});
}

async function redo(){
  if(!redoStack.length)return;
  const current=capture();const next=redoStack.pop();
  if(current){undoStack.push(clone(current));if(undoStack.length>MAX_UNDO)undoStack.shift();}
  compareA=null;compareB=null;
  await restore(next,{status:'Redo · composition restored',track:true});
}

async function showCompare(which){
  const snap=which==='A'?compareA:compareB;
  if(!snap)return;
  compareShowing=which;
  await restore(snap,{status:`A/B · listening to ${which}`,track:false});
}

function openExistingEditor(slotIndex){
  const card=document.querySelector(`[data-slot="${slotIndex}"]`);
  if(!card)return;
  card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}

function installStyles(){
  if(document.getElementById('vrComposerModeStyle'))return;
  const style=document.createElement('style');style.id='vrComposerModeStyle';style.textContent=`
    .vr-composer-toolbar{margin:10px 0 14px;padding:11px 12px;border:1px solid rgba(255,106,20,.30);border-radius:14px;background:linear-gradient(145deg,rgba(255,106,20,.07),rgba(255,255,255,.018));display:grid;gap:9px}.vr-composer-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.vr-composer-title{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:#ff9457}.vr-composer-pill{font-size:8px;font-weight:900;letter-spacing:.08em;padding:4px 7px;border-radius:999px;border:1px solid rgba(255,106,20,.26);color:rgba(255,255,255,.58)}.vr-composer-actions{display:flex;flex-wrap:wrap;gap:6px}.vr-composer-btn{min-height:34px;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.74);font-size:9px;font-weight:900;cursor:pointer}.vr-composer-btn:hover{border-color:rgba(255,106,20,.44)}.vr-composer-btn.primary{border-color:rgba(255,106,20,.58);background:rgba(255,106,20,.11);color:#ff9b61}.vr-composer-btn[disabled]{opacity:.34;cursor:default}.vr-composer-btn[data-active="true"]{background:#ff6a14;color:#fff;border-color:#ff6a14}.vr-composer-status{font-size:9px;color:rgba(255,255,255,.44);line-height:1.35}.vr-composer-status[data-tone="accent"]{color:#ffad7b}.vr-composer-status[data-tone="error"]{color:#ff8170}
    .slot-card{position:relative}.vr-composer-card-tools{position:absolute;left:7px;right:7px;bottom:6px;z-index:5;display:flex;justify-content:center;gap:4px;opacity:.72;transition:opacity .15s ease}.slot-card:hover .vr-composer-card-tools,.slot-card:focus-within .vr-composer-card-tools{opacity:1}.vr-composer-mini{width:27px;height:25px;padding:0;border:1px solid rgba(255,255,255,.11);border-radius:7px;background:rgba(8,8,8,.76);color:rgba(255,255,255,.67);font-size:10px;font-weight:900;display:grid;place-items:center;cursor:pointer}.vr-composer-mini:hover{border-color:rgba(255,106,20,.54);color:#ff9b61}.vr-composer-mini.locked{background:rgba(255,106,20,.14);border-color:rgba(255,106,20,.52);color:#ff9b61}.slot-card.vr-composer-locked{box-shadow:inset 0 0 0 1px rgba(255,106,20,.28)}.slot-card.vr-composer-locked:after{content:'LOCKED';position:absolute;top:5px;right:6px;font-size:6px;font-weight:950;letter-spacing:.08em;color:#ff9b61}.slot-card .slot-window{padding-bottom:27px}
    @media(max-width:760px){.vr-composer-head{align-items:flex-start}.vr-composer-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.vr-composer-btn{padding:7px 5px}.vr-composer-card-tools{opacity:1}.vr-composer-mini{width:30px;height:28px}}
  `;document.head.appendChild(style);
}

function ensureToolbar(){
  if(ui)return ui;
  const anchor=document.querySelector('.eightbar-wrap');if(!anchor)return null;
  const toolbar=document.createElement('section');toolbar.className='vr-composer-toolbar';toolbar.id='vrComposerMode';toolbar.setAttribute('aria-label','Composer Mode');toolbar.innerHTML=`
    <div class="vr-composer-head"><div class="vr-composer-title">✦ Composer Mode <span class="vr-composer-pill">LISTEN · LOCK · EDIT · VARIATE</span></div><span class="vr-composer-pill">14.0</span></div>
    <div class="vr-composer-actions">
      <button type="button" class="vr-composer-btn" data-composer="undo">↶ Undo</button>
      <button type="button" class="vr-composer-btn" data-composer="redo">↷ Redo</button>
      <button type="button" class="vr-composer-btn" data-composer="compare-a">A Original</button>
      <button type="button" class="vr-composer-btn" data-composer="compare-b">B Edit</button>
      <button type="button" class="vr-composer-btn primary" data-composer="keep-dna">✦ Keep DNA</button>
    </div>
    <div class="vr-composer-status" id="vrComposerStatus" aria-live="polite">Spin a direction, then shape it without starting over.</div>`;
  anchor.insertAdjacentElement('beforebegin',toolbar);
  ui={
    toolbar,status:toolbar.querySelector('#vrComposerStatus'),
    undo:toolbar.querySelector('[data-composer="undo"]'),redo:toolbar.querySelector('[data-composer="redo"]'),
    a:toolbar.querySelector('[data-composer="compare-a"]'),b:toolbar.querySelector('[data-composer="compare-b"]'),dna:toolbar.querySelector('[data-composer="keep-dna"]')
  };
  ui.undo.addEventListener('click',event=>{event.preventDefault();undo();});
  ui.redo.addEventListener('click',event=>{event.preventDefault();redo();});
  ui.a.addEventListener('click',event=>{event.preventDefault();showCompare('A');});
  ui.b.addEventListener('click',event=>{event.preventDefault();showCompare('B');});
  ui.dna.addEventListener('click',event=>{event.preventDefault();keepDNA();});
  return ui;
}

function ensureCardTools(){
  document.querySelectorAll('[data-slot]').forEach((card,index)=>{
    let tools=card.querySelector('.vr-composer-card-tools');
    if(!tools){
      tools=document.createElement('div');tools.className='vr-composer-card-tools';tools.innerHTML=`
        <button type="button" class="vr-composer-mini" data-action="listen" title="Listen to this chord" aria-label="Listen to Bar ${index+1}">▶</button>
        <button type="button" class="vr-composer-mini" data-action="lock" title="Lock this bar" aria-label="Lock Bar ${index+1}">◇</button>
        <button type="button" class="vr-composer-mini" data-action="vary" title="Regenerate only this bar" aria-label="Vary Bar ${index+1}">↻</button>
        <button type="button" class="vr-composer-mini" data-action="edit" title="Edit chord" aria-label="Edit Bar ${index+1}">✎</button>`;
      tools.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const button=event.target.closest('[data-action]');if(!button)return;
        const action=button.dataset.action;
        if(action==='listen')auditionSlot(index);
        else if(action==='lock')toggleLock(index);
        else if(action==='vary')regenerateSlot(index);
        else if(action==='edit')openExistingEditor(index);
      });
      tools.addEventListener('keydown',event=>event.stopPropagation());
      card.appendChild(tools);
    }
  });
}

function refreshCards(){
  ensureCardTools();
  document.querySelectorAll('[data-slot]').forEach((card,index)=>{
    const locked=locks.has(index);card.classList.toggle('vr-composer-locked',locked);
    const lock=card.querySelector('[data-action="lock"]');if(lock){lock.classList.toggle('locked',locked);lock.textContent=locked?'◆':'◇';lock.setAttribute('aria-label',`${locked?'Unlock':'Lock'} Bar ${index+1}`);}
    const vary=card.querySelector('[data-action="vary"]');if(vary)vary.disabled=locked;
  });
}

function refreshToolbar(){
  if(!ui)return;
  ui.undo.disabled=!undoStack.length;ui.redo.disabled=!redoStack.length;
  ui.a.disabled=!compareA;ui.b.disabled=!compareB;
  ui.a.dataset.active=String(Boolean(compareA&&compareShowing==='A'));
  ui.b.dataset.active=String(Boolean(compareB&&compareShowing==='B'));
  const hasDirection=Boolean(capture());ui.dna.disabled=!hasDirection;
}

function observeArrangement(){
  window.addEventListener('fortissimo:vibe-arrangement-updated',()=>{
    queueMicrotask(()=>{
      const current=capture();if(!current)return;
      if(suppressObserver){lastObserved=clone(current);return;}
      if(lastObserved&&fingerprint(lastObserved)!==fingerprint(current)){
        pushUndo(lastObserved);compositionDirty=true;compareA=clone(lastObserved);compareB=clone(current);compareShowing='B';
        setStatus('Composition changed · Undo and A/B are available.','accent');
      }
      lastObserved=clone(current);refreshToolbar();refreshCards();
    });
  });
}

function protectEditedSpin(){
  const button=document.getElementById('spinBtn');if(!button)return;
  button.addEventListener('click',event=>{
    if(!compositionDirty)return;
    const now=Date.now();
    if(now<spinArmedUntil){spinArmedUntil=0;compositionDirty=false;compareA=null;compareB=null;setStatus('Starting a completely new direction.','neutral');return;}
    event.preventDefault();event.stopImmediatePropagation();spinArmedUntil=now+3200;
    const original=button.textContent;button.textContent='SPIN AGAIN TO REPLACE';
    setStatus('Your edited composition is protected. Click Spin again within 3 seconds to replace it, or use Keep DNA.','accent');
    window.setTimeout(()=>{if(Date.now()>=spinArmedUntil){spinArmedUntil=0;if(button.textContent==='SPIN AGAIN TO REPLACE')button.textContent=original;}},3300);
  },true);
}

function install(){
  const {session,engine}=core();
  if(!session?.capture||!session?.restore||!engine){setTimeout(install,120);return;}
  installStyles();if(!ensureToolbar()){setTimeout(install,120);return;}
  refreshCards();lastObserved=capture();refreshToolbar();observeArrangement();protectEditedSpin();
  window.__FORTISSIMO_VIBE_COMPOSER_MODE_V1__=Object.freeze({
    info:VIBE_ROULETTE_COMPOSER_MODE_V1_INFO,
    auditionBar:auditionSlot,
    varyBar:regenerateSlot,
    keepDNA,
    undo,
    redo,
    getLocks:()=>Object.freeze([...locks]),
    capture
  });
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}
