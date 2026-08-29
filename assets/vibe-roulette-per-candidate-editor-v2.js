import { reharmonizeCandidateSemitone, forceCandidateQuality } from './vibe-roulette-progression-editor-v1.js';
import { previewAfroChordAlternative } from './vibe-roulette-chord-preview-v1.js';

const STYLE_ID='fortissimo-per-candidate-editor-v2-style';
let listObserver=null;
let scheduled=false;

function currentContext(){
  return typeof window!=='undefined'?window.__FORTISSIMO_LAST_CHORD_EDIT_CONTEXT__||null:null;
}

function romanQuality(candidate){
  const token=String(candidate?.roman||'').replaceAll('♭','b').replaceAll('♯','#');
  const match=token.match(/^[b#]*([ivIV]+)/);
  if(!match)return null;
  return match[1]===match[1].toUpperCase()?'major':'minor';
}

function installStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #chordAlternativeList .fortissimo-candidate-card{border:1px solid rgba(255,255,255,.11);border-radius:18px;background:rgba(255,255,255,.035);overflow:hidden;margin:0;min-width:0}
    #chordAlternativeList .fortissimo-candidate-card .chord-alternative-preview-wrap{margin:0}
    #chordAlternativeList .fortissimo-candidate-card .chord-alternative-option{border:0!important;border-radius:0!important;background:transparent!important;margin:0!important;padding-top:13px!important;padding-bottom:10px!important}
    #chordAlternativeList .fortissimo-candidate-card .chord-alternative-preview-wrap>.chord-alternative-option{padding-right:82px!important}
    #chordAlternativeList .fortissimo-card-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:0 12px 12px}
    #chordAlternativeList .fortissimo-card-control{min-width:0;min-height:40px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:#141414;color:#efefef;font:800 12px/1 system-ui,-apple-system,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #chordAlternativeList .fortissimo-card-control.chromatic{font-size:15px}
    #chordAlternativeList .fortissimo-card-control.quality.active{border-color:#ff6a1a;background:rgba(255,103,28,.10);color:#ff8a45}
    #chordAlternativeList .fortissimo-card-control:active{transform:scale(.98)}
    #chordAlternativeList .fortissimo-card-control[disabled]{opacity:.35;pointer-events:none}
    #chordAlternativeList .fortissimo-candidate-card.is-edited{border-color:rgba(255,103,28,.42)}
    @media(max-width:430px){#chordAlternativeList .fortissimo-card-controls{gap:6px;padding:0 10px 10px}#chordAlternativeList .fortissimo-card-control{min-height:42px;padding:0 5px;font-size:11px}}
  `;
  document.head.appendChild(style);
}

function renderCandidate(option,candidate){
  if(!option||!candidate)return;
  const chord=option.querySelector('.alternative-chord');
  const roman=option.querySelector('.alternative-roman');
  const type=option.querySelector('strong');
  const reason=option.querySelector('small');
  if(chord)chord.textContent=candidate.chord;
  if(roman)roman.textContent=candidate.roman;
  if(type)type.textContent=candidate.type||'Contextual option';
  if(reason)reason.textContent=candidate.reason||'';
  const preview=option.closest('.chord-alternative-preview-wrap')?.querySelector('.chord-alternative-preview');
  if(preview)preview.setAttribute('aria-label',`Preview ${candidate.chord}`);
}

function syncQuality(card,candidate){
  const quality=romanQuality(candidate);
  card.querySelectorAll('[data-card-quality]').forEach(button=>{
    const active=button.dataset.cardQuality===quality;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}

function controlsMarkup(){
  return `<div class="fortissimo-card-controls" aria-label="Edit this chord suggestion">
    <button type="button" class="fortissimo-card-control chromatic" data-card-shift="-1" aria-label="Lower this suggestion one semitone">−½</button>
    <button type="button" class="fortissimo-card-control chromatic" data-card-shift="1" aria-label="Raise this suggestion one semitone">+½</button>
    <button type="button" class="fortissimo-card-control quality" data-card-quality="major" aria-pressed="false">Major</button>
    <button type="button" class="fortissimo-card-control quality" data-card-quality="minor" aria-pressed="false">Minor</button>
  </div>`;
}

function normalizeOldWrapper(option){
  const old=option.closest('.fortissimo-candidate-wrap');
  if(!old)return option.closest('.chord-alternative-preview-wrap')||option;
  old.querySelector('.fortissimo-candidate-controls')?.remove();
  const visual=option.closest('.chord-alternative-preview-wrap')||option;
  const parent=old.parentNode;
  if(parent){parent.insertBefore(visual,old);old.remove();}
  return visual;
}

function enhanceOption(option,alternatives){
  if(!option)return;
  const index=Number(option.dataset.alternativeIndex);
  const candidate=alternatives?.[index];
  if(!candidate)return;
  let card=option.closest('.fortissimo-candidate-card');
  if(!card){
    const visual=normalizeOldWrapper(option);
    const parent=visual.parentNode;if(!parent)return;
    card=document.createElement('div');
    card.className='fortissimo-candidate-card';
    card.dataset.candidateIndex=String(index);
    parent.insertBefore(card,visual);
    card.appendChild(visual);
    card.insertAdjacentHTML('beforeend',controlsMarkup());
  }
  card.dataset.candidateIndex=String(index);
  const locked=Boolean(option.disabled);
  card.querySelectorAll('.fortissimo-card-control').forEach(button=>{button.disabled=locked;});
  renderCandidate(option,candidate);
  syncQuality(card,candidate);
}

function enhanceList(){
  scheduled=false;
  if(typeof document==='undefined')return;
  installStyles();
  const list=document.getElementById('chordAlternativeList');
  if(!list)return;
  bindList(list);
  const alternatives=currentContext()?.alternatives;
  if(!Array.isArray(alternatives))return;
  [...list.querySelectorAll('.chord-alternative-option')].forEach(option=>enhanceOption(option,alternatives));
}

function scheduleEnhance(){
  if(scheduled||typeof window==='undefined')return;
  scheduled=true;
  window.requestAnimationFrame(enhanceList);
}

function bindList(list){
  if(!list||list.dataset.perCandidateV2Bound)return;
  list.dataset.perCandidateV2Bound='true';
  listObserver?.disconnect();
  listObserver=new MutationObserver(scheduleEnhance);
  listObserver.observe(list,{childList:true});
}

function candidateFromControl(control){
  const card=control.closest('.fortissimo-candidate-card');
  const index=Number(card?.dataset.candidateIndex);
  const context=currentContext();
  const alternatives=context?.alternatives;
  const candidate=Array.isArray(alternatives)?alternatives[index]:null;
  const option=card?.querySelector('.chord-alternative-option')||null;
  return {card,index,context,alternatives,candidate,option};
}

function handleCandidateControl(event,control){
  event.preventDefault();
  event.stopPropagation();
  const {card,context,candidate,option}=candidateFromControl(control);
  if(!card||!context||!candidate||!option||option.disabled)return;
  let next=null;
  if(control.dataset.cardShift){
    next=reharmonizeCandidateSemitone({candidate,context,direction:Number(control.dataset.cardShift)});
  }else if(control.dataset.cardQuality){
    next=forceCandidateQuality({candidate,context,quality:control.dataset.cardQuality});
  }
  if(!next)return;
  Object.assign(candidate,next);
  card.classList.add('is-edited');
  renderCandidate(option,candidate);
  syncQuality(card,candidate);
  scheduleEnhance();
}

function handleLivePreview(event,preview){
  const card=preview.closest('.fortissimo-candidate-card');
  if(!card)return false;
  const option=card.querySelector('.chord-alternative-option');
  if(!option)return false;
  const chord=(option.querySelector('.alternative-chord')?.textContent||'').trim();
  const roman=(option.querySelector('.alternative-roman')?.textContent||'').trim();
  if(!chord)return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  previewAfroChordAlternative({chord,roman,button:preview});
  return true;
}

function install(){
  if(typeof document==='undefined')return;
  installStyles();
  document.addEventListener('click',event=>{
    const control=event.target.closest('.fortissimo-card-control');
    if(control){handleCandidateControl(event,control);return;}
    const preview=event.target.closest('.chord-alternative-preview');
    if(preview&&handleLivePreview(event,preview))return;
    scheduleEnhance();
  },true);
  scheduleEnhance();
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
}

export const PER_CANDIDATE_EDITOR_V2_INFO=Object.freeze({
  version:'2.0.0-card-native',phase:'4.4.1',
  controlsPerCard:Object.freeze(['−½','+½','Major','Minor']),
  livePreview:true,
  selectionUsesEditedCandidate:true,
  policy:'Chromatic and Major/Minor editing belongs to each individual Afro-aware suggestion card. Other suggestions remain unchanged until the user edits them.'
});
