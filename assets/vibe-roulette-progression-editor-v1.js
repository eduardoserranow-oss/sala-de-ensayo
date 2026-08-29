import { VibeRouletteEngine, progressionToChords } from './vibe-roulette-engine.js';
import { classifyAfroProgression, afroLanguageWeight } from './vibe-roulette-afro-language-v12.js';
import { afroHarmonyDnaWeight, referenceDnaSimilarity } from './vibe-roulette-afro-harmony-dna-v2.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const NOTE_PC={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const NUMERALS=['I','II','III','IV','V','VI','VII'];
const MAJOR_QUALITY=['major','minor','minor','major','major','minor','minor'];
const MINOR_QUALITY=['minor','minor','major','minor','minor','major','major'];
const EXTENSIONS=['','7','maj7','add9','9','sus2','sus4'];
const LOCK_KEY='fortissimo.vibeRoulette.chordLocks.v1';
const RECENT_WINDOW=8;

const mod=(value,base=12)=>((value%base)+base)%base;

function romanParts(token=''){
  const normalized=String(token).trim().replaceAll('♭','b').replaceAll('♯','#');
  const match=normalized.match(/^([b#]*)([ivIV]+)(.*)$/);
  if(!match)return null;
  const [,accidental,numeral,suffix]=match;
  return {accidental,numeral,suffix,degree:NUMERALS.indexOf(numeral.toUpperCase())+1,major:numeral===numeral.toUpperCase()};
}

function structuralRoman(token=''){
  const parts=romanParts(token);
  return parts?`${parts.accidental}${parts.numeral}`:String(token).trim();
}

function chordRoot(chord=''){return String(chord).match(/^[A-G](?:bb|##|b|#)?/)?.[0]||'';}
function chordRootPc(chord=''){const root=chordRoot(chord);return NOTE_PC[root]??null;}
function tokenRootPc(token,key,mode){try{return chordRootPc(progressionToChords([token],key,mode)[0]);}catch(_){return null;}}
function canonicalQuality(degree,mode){return (mode==='minor'?MINOR_QUALITY:MAJOR_QUALITY)[Math.max(0,degree-1)]||'major';}
function tokenFor(degree,quality='major',accidental='',extension=''){
  const numeral=NUMERALS[Math.max(0,degree-1)]||'I';
  const head=quality==='minor'?numeral.toLowerCase():numeral;
  return `${accidental}${head}${extension}`;
}
function extensionComplexity(suffix=''){
  if(!suffix)return 0;
  if(/sus2|sus4|add9/i.test(suffix))return 1;
  if(/maj7|7/i.test(suffix))return 1.2;
  if(/9/i.test(suffix))return 1.6;
  return 1.4;
}
function chordIntervals(chord=''){
  if(/sus2/i.test(chord))return [0,2,7];
  if(/sus4/i.test(chord))return [0,5,7];
  const minor=/m(?!aj)/.test(chord);
  const major7=/maj7|maj9/i.test(chord);
  const dominant=!major7&&/(?:7|9)/.test(chord);
  const intervals=minor?[0,3,7]:[0,4,7];
  if(major7)intervals.push(11);else if(dominant)intervals.push(10);
  if(/9/.test(chord))intervals.push(2);
  return [...new Set(intervals.map(v=>mod(v)))];
}
function chordPitchClasses(chord=''){
  const root=chordRootPc(chord);if(root==null)return [];
  return chordIntervals(chord).map(interval=>mod(root+interval));
}
function sharedToneRatio(a='',b=''){
  const pa=chordPitchClasses(a),pb=chordPitchClasses(b);if(!pa.length||!pb.length)return 0;
  const shared=pa.filter(pc=>pb.includes(pc)).length;
  return shared/Math.max(pa.length,pb.length);
}
function functionGroup(degree){if([1,3,6].includes(degree))return 'tonic';if([2,4].includes(degree))return 'predominant';return 'dominant';}
function progressionSignature(result={}){
  const roman=(result.roman||[]).map(structuralRoman).join('|');
  return `${String(result.mode||'').toLowerCase()}::${roman}`;
}

function candidatePool({key='C',mode='major'}={}){
  const tokens=[];
  for(let degree=1;degree<=7;degree+=1){
    for(const accidental of ['','b','#']){
      for(const quality of ['major','minor']){
        for(const extension of EXTENSIONS){
          if(quality==='minor'&&/^maj7$/i.test(extension))continue;
          const token=tokenFor(degree,quality,accidental,extension);
          try{
            const chord=progressionToChords([token],key,mode)[0];
            if(chord)tokens.push({token,chord,rootPc:chordRootPc(chord),degree,quality,accidental,extension});
          }catch(_){}
        }
      }
    }
  }
  const seen=new Set();
  return tokens.filter(item=>{const sig=`${item.token}|${item.chord}`;if(seen.has(sig))return false;seen.add(sig);return true;});
}

function baseCandidateScore(item,context={}){
  const {roman=[],index=0,key='C',mode='major',energyTarget=.6}=context;
  const proposal=[...roman];proposal[index]=item.token;
  const classification=classifyAfroProgression(proposal);
  const dna=referenceDnaSimilarity(proposal,mode);
  let score=afroLanguageWeight({roman:proposal})*afroHarmonyDnaWeight({roman:proposal,mode},{energyTarget});
  if(classification.matched)score*=1.17;
  score*=.82+dna.score*.34;
  if(item.quality===canonicalQuality(item.degree,mode))score*=1.10;
  if(item.accidental)score*=.91;
  score*=Math.max(.76,1-extensionComplexity(item.extension)*.035);
  const previous=index>0?progressionToChords([roman[index-1]],key,mode)[0]:'';
  const next=index<roman.length-1?progressionToChords([roman[index+1]],key,mode)[0]:'';
  if(previous)score*=.94+sharedToneRatio(previous,item.chord)*.18;
  if(next)score*=.94+sharedToneRatio(item.chord,next)*.18;
  return {proposal,score,classification,dna,previous,next};
}

function riskLabel({classification,dna,accidental}){
  if(classification?.matched||dna?.score>=.68)return 'CORE';
  if(dna?.score>=.42||!accidental)return 'COLOR';
  return 'BOLD';
}

function reasonFor(mode,analysis){
  const core=analysis.classification?.matched?`${analysis.classification.label} · ${analysis.classification.motion}`:`Reference-DNA fit ${Math.round((analysis.dna?.score||0)*100)}%`;
  const labels={
    'semitone-down':'Root moved down ½ step; quality/color reharmonized for the surrounding progression.',
    'semitone-up':'Root moved up ½ step; quality/color reharmonized for the surrounding progression.',
    'degree-down':'Moves to the previous diatonic degree while preserving the surrounding harmonic direction.',
    'degree-up':'Moves to the next diatonic degree while preserving the surrounding harmonic direction.',
    color:'Same harmonic root, alternate color/extension.',
    'keep-root':'Same root; quality and color may change while the bass anchor stays fixed.',
    'keep-function':'Alternative chord from the same tonic / predominant / dominant function family.',
    borrowed:'Controlled borrowed/modal color that still scores against the Afro Reference DNA.',
    relative:'Relative major/minor swap with shared-tone priority.',
    'voice-leading':'Chosen for common tones and minimal movement into the neighboring chords.',
    'less-tension':'Simpler color with lower extension/tension load.',
    'more-tension':'Adds controlled color without changing the root trajectory unnecessarily.',
    surprise:'A fresh but safety-ranked option for this bar only.'
  };
  return `${labels[mode]||'Contextual harmonic alternative'} ${core}`;
}

export const EDIT_MODE_LABELS=Object.freeze({
  contextual:'Context',
  'semitone-down':'−½ semitone','semitone-up':'+½ semitone',
  'degree-down':'Degree −','degree-up':'Degree +',color:'Color','keep-root':'Keep root',
  'keep-function':'Keep function',borrowed:'Borrowed',relative:'Relative','voice-leading':'Voice lead',
  'less-tension':'Less tension','more-tension':'More tension',surprise:'Surprise here'
});

function rankCandidates(items=[],context={},editMode='contextual'){
  const currentToken=context.roman?.[context.index]||'';
  const parts=romanParts(currentToken);
  if(!parts)return [];
  const currentPc=tokenRootPc(currentToken,context.key,context.mode);
  const currentQuality=parts.major?'major':'minor';
  const currentFunction=functionGroup(parts.degree);
  const currentExt=parts.suffix||'';
  const targetPc=editMode==='semitone-up'?mod(currentPc+1):editMode==='semitone-down'?mod(currentPc-1):null;
  const targetDegree=editMode==='degree-up'?(parts.degree%7)+1:editMode==='degree-down'?((parts.degree+5)%7)+1:null;
  const relativePc=parts.major?mod(currentPc+9):mod(currentPc+3);

  const filtered=items.filter(item=>{
    if(item.token===currentToken)return false;
    if(editMode==='semitone-up'||editMode==='semitone-down')return item.rootPc===targetPc;
    if(editMode==='degree-up'||editMode==='degree-down')return item.degree===targetDegree&&!item.accidental;
    if(editMode==='color')return item.rootPc===currentPc&&item.quality===currentQuality;
    if(editMode==='keep-root')return item.rootPc===currentPc;
    if(editMode==='keep-function')return functionGroup(item.degree)===currentFunction&&item.rootPc!==currentPc&&!item.accidental;
    if(editMode==='borrowed')return Boolean(item.accidental)&&item.rootPc!==currentPc;
    if(editMode==='relative')return item.rootPc===relativePc&&item.quality!==currentQuality;
    if(editMode==='less-tension')return item.rootPc===currentPc&&extensionComplexity(item.extension)<extensionComplexity(currentExt);
    if(editMode==='more-tension')return item.rootPc===currentPc&&extensionComplexity(item.extension)>extensionComplexity(currentExt);
    return true;
  });

  return filtered.map(item=>{
    const analysis=baseCandidateScore(item,context);
    let score=analysis.score;
    if(editMode==='color')score*=1.18;
    if(editMode==='keep-root')score*=1.14;
    if(editMode==='keep-function')score*=1.10;
    if(editMode==='borrowed')score*=analysis.dna.score>=.42?1.12:.82;
    if(editMode==='relative')score*=1.16;
    if(editMode==='voice-leading')score*=1+(sharedToneRatio(analysis.previous,item.chord)+sharedToneRatio(item.chord,analysis.next))*.24;
    if(editMode==='less-tension')score*=1.13+(extensionComplexity(currentExt)-extensionComplexity(item.extension))*.04;
    if(editMode==='more-tension')score*=1.08+Math.min(2,extensionComplexity(item.extension)-extensionComplexity(currentExt))*.035;
    if(editMode==='surprise')score*=.94+Math.random()*.12;
    if(analysis.dna.score<.18&&!analysis.classification?.matched&&!['semitone-up','semitone-down'].includes(editMode))score*=.45;
    const risk=riskLabel({classification:analysis.classification,dna:analysis.dna,accidental:item.accidental});
    return {
      roman:item.token,progression:analysis.proposal,chord:item.chord,score,
      type:`${EDIT_MODE_LABELS[editMode]||'Edit'} · ${risk}`,
      reason:reasonFor(editMode,analysis),classification:analysis.classification,
      referenceDnaSimilarity:analysis.dna.score,editMode,risk
    };
  }).filter(item=>item.score>.25).sort((a,b)=>b.score-a.score);
}

export function suggestProgressionEditCandidates({roman=[],index=0,key='C',mode='major',emotionFilters=[],primaryMood='connection',energyTarget=.6,editMode='contextual',limit=6}={}){
  if(index<0||index>=roman.length)return [];
  const context={roman:[...roman],index,key,mode,emotionFilters,primaryMood,energyTarget};
  return rankCandidates(candidatePool({key,mode}),context,editMode).slice(0,clamp(limit,3,6));
}

export function setNextChordEditMode(mode='contextual'){
  const normalized=EDIT_MODE_LABELS[mode]?mode:'contextual';
  if(typeof window!=='undefined')window.__FORTISSIMO_NEXT_CHORD_EDIT_MODE__=normalized;
  return normalized;
}
export function consumeNextChordEditMode(){
  if(typeof window==='undefined')return 'contextual';
  const mode=EDIT_MODE_LABELS[window.__FORTISSIMO_NEXT_CHORD_EDIT_MODE__]?window.__FORTISSIMO_NEXT_CHORD_EDIT_MODE__:'contextual';
  window.__FORTISSIMO_NEXT_CHORD_EDIT_MODE__='contextual';
  window.__FORTISSIMO_LAST_CHORD_EDIT_MODE__=mode;
  return mode;
}
export function rememberChordEditContext(context={}){if(typeof window!=='undefined')window.__FORTISSIMO_LAST_CHORD_EDIT_CONTEXT__={...context};}

function loadLocks(){if(typeof window==='undefined')return {resultId:null,bars:[]};try{return JSON.parse(localStorage.getItem(LOCK_KEY)||'{}')||{};}catch(_){return {resultId:null,bars:[]};}}
function saveLocks(value){if(typeof window==='undefined')return;try{localStorage.setItem(LOCK_KEY,JSON.stringify(value));}catch(_){}}
function resultId(){return typeof window!=='undefined'?window.__FORTISSIMO_VIBE_LAST_RESULT__?.id||null:null;}
export function isChordBarLocked(bar){const id=resultId();const locks=loadLocks();return Boolean(id&&locks.resultId===id&&(locks.bars||[]).includes(Number(bar)));}
export function toggleChordBarLock(bar){
  const id=resultId();if(!id)return false;
  const number=Number(bar),current=loadLocks();
  const bars=current.resultId===id?new Set(current.bars||[]):new Set();
  if(bars.has(number))bars.delete(number);else bars.add(number);
  saveLocks({resultId:id,bars:[...bars].sort((a,b)=>a-b)});
  return bars.has(number);
}

function installEditorUi(){
  if(typeof window==='undefined'||typeof document==='undefined')return;
  if(!document.getElementById('fortissimo-progression-editor-style')){
    const style=document.createElement('style');style.id='fortissimo-progression-editor-style';style.textContent=`
      .fortissimo-chord-editor{margin:14px 0 16px;padding:12px;border:1px solid rgba(255,103,28,.28);border-radius:18px;background:rgba(255,255,255,.025)}
      .fortissimo-chord-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;color:#bbb;font-size:12px}.fortissimo-chord-editor-head strong{color:#ff6a1a;letter-spacing:.08em;text-transform:uppercase}
      .fortissimo-edit-scroll{display:flex;gap:8px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}.fortissimo-edit-scroll::-webkit-scrollbar{display:none}
      .fortissimo-edit-btn{flex:0 0 auto;border:1px solid #353535;background:#151515;color:#f0f0f0;border-radius:999px;padding:9px 12px;font:700 12px/1 system-ui,-apple-system,sans-serif;white-space:nowrap}.fortissimo-edit-btn.active{border-color:#ff6a1a;color:#ff7a2d;background:rgba(255,103,28,.08)}
      .fortissimo-lock-btn{border:1px solid #3a3a3a;background:#1a1a1a;color:#ddd;border-radius:999px;padding:8px 11px;font:700 12px/1 system-ui,-apple-system,sans-serif}.fortissimo-lock-btn.locked{border-color:#ff6a1a;color:#ff7a2d}
      .chord-alternative-option[disabled]{opacity:.42;pointer-events:none}.fortissimo-lock-note{display:none;color:#ff8a4b;font-size:12px;margin-top:7px}.fortissimo-lock-note.show{display:block}
    `;document.head.appendChild(style);
  }

  let frame=0;
  let backdropObserver=null;
  let bodyObserver=null;
  const schedule=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;sync();});
  };
  const sync=()=>{
    const sheet=document.querySelector('.chord-alternative-sheet');
    const backdrop=document.getElementById('chordAlternativeBackdrop');
    if(!sheet||!backdrop?.classList.contains('open'))return;
    const title=sheet.querySelector('#chordAlternativeTitle')?.textContent||'';
    const bar=Number(title.match(/Bar\s+(\d+)/i)?.[1]||0);
    let editor=sheet.querySelector('.fortissimo-chord-editor');
    if(!editor){
      editor=document.createElement('div');editor.className='fortissimo-chord-editor';editor.dataset.editorSafe='true';
      editor.innerHTML=`<div class="fortissimo-chord-editor-head"><strong>Progression editor</strong><button type="button" class="fortissimo-lock-btn">🔓 Lock bar</button></div><div class="fortissimo-edit-scroll"></div><div class="fortissimo-lock-note">This bar is locked. Unlock it before replacing the chord.</div>`;
      sheet.querySelector('.chord-sheet-copy')?.insertAdjacentElement('afterend',editor);
      const scroll=editor.querySelector('.fortissimo-edit-scroll');
      for(const mode of ['semitone-down','semitone-up','degree-down','degree-up','color','keep-root','keep-function','relative','borrowed','voice-leading','less-tension','more-tension','surprise']){
        const button=document.createElement('button');button.type='button';button.className='fortissimo-edit-btn';button.dataset.editMode=mode;button.textContent=EDIT_MODE_LABELS[mode];scroll.appendChild(button);
      }
      scroll.addEventListener('click',event=>{
        const button=event.target.closest('[data-edit-mode]');if(!button)return;
        const liveTitle=sheet.querySelector('#chordAlternativeTitle')?.textContent||'';
        const liveBar=Number(liveTitle.match(/Bar\s+(\d+)/i)?.[1]||0);
        if(isChordBarLocked(liveBar))return;
        setNextChordEditMode(button.dataset.editMode);
        backdrop.classList.remove('open');
        window.setTimeout(()=>document.querySelector(`[data-slot="${Math.max(0,liveBar-1)}"]`)?.click(),16);
      });
      editor.querySelector('.fortissimo-lock-btn').addEventListener('click',()=>{
        const liveTitle=sheet.querySelector('#chordAlternativeTitle')?.textContent||'';
        toggleChordBarLock(Number(liveTitle.match(/Bar\s+(\d+)/i)?.[1]||0));
        schedule();
      });
    }
    const active=window.__FORTISSIMO_LAST_CHORD_EDIT_MODE__||'contextual';
    editor.querySelectorAll('[data-edit-mode]').forEach(button=>button.classList.toggle('active',button.dataset.editMode===active));
    const locked=isChordBarLocked(bar),lockButton=editor.querySelector('.fortissimo-lock-btn');
    if(lockButton){lockButton.textContent=locked?'🔒 Locked':'🔓 Lock bar';lockButton.classList.toggle('locked',locked);}
    editor.querySelector('.fortissimo-lock-note')?.classList.toggle('show',locked);
    sheet.querySelectorAll('.chord-alternative-option').forEach(button=>{button.disabled=locked;});
  };

  const bindBackdrop=()=>{
    const backdrop=document.getElementById('chordAlternativeBackdrop');
    if(!backdrop)return false;
    backdropObserver?.disconnect();
    backdropObserver=new MutationObserver(schedule);
    backdropObserver.observe(backdrop,{attributes:true,attributeFilter:['class']});
    schedule();
    return true;
  };
  const start=()=>{
    if(bindBackdrop())return;
    bodyObserver=new MutationObserver(()=>{if(bindBackdrop())bodyObserver?.disconnect();});
    bodyObserver.observe(document.body,{childList:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}

const proto=VibeRouletteEngine.prototype;
const antiRepeatBase=proto.spin;
if(antiRepeatBase&&!antiRepeatBase.__progressionEditorAntiRepeatPatched){
  const patched=function(options={}){
    const recent=Array.isArray(this.__fortissimoRecentProgressionSignatures)?this.__fortissimoRecentProgressionSignatures:[];
    const baseRandom=this.random;
    let result=null;
    try{
      for(let attempt=0;attempt<10;attempt+=1){
        if(attempt>0&&typeof baseRandom==='function'){
          const offset=attempt*.1732050808;
          this.random=()=>mod((Number(baseRandom())||0)+offset,1);
        }
        result=antiRepeatBase.call(this,options);
        const signature=progressionSignature(result);
        if(!recent.includes(signature)||attempt===9)break;
      }
    }finally{this.random=baseRandom;}
    const signature=progressionSignature(result);
    this.__fortissimoRecentProgressionSignatures=[signature,...recent.filter(item=>item!==signature)].slice(0,RECENT_WINDOW);
    if(result)result.progressionAntiRepeat={window:RECENT_WINDOW,signature,transpositionCountsAsSame:true,extensionsCountAsSame:true};
    return result;
  };
  patched.__progressionEditorAntiRepeatPatched=true;
  patched.__originalSpin=antiRepeatBase;
  proto.spin=patched;
}

installEditorUi();

export const PROGRESSION_EDITOR_V1_INFO=Object.freeze({
  version:'1.1-safe-ui',phase:4.4,antiRepeatWindow:RECENT_WINDOW,transpositionCountsAsSame:true,
  editModes:Object.freeze(Object.keys(EDIT_MODE_LABELS).filter(mode=>mode!=='contextual')),
  policy:'User can nudge roots, degrees, color, function, relative/borrowed harmony, voice leading and tension while every candidate is re-ranked against Afro language + Reference DNA context.',
  lockPolicy:'Locks are scoped to the current generated direction and prevent accidental replacement of a liked bar.',
  uiSafety:'The editor observes only the sheet backdrop open/close state; it never observes its own descendant mutations, preventing iPhone microtask feedback loops.'
});

if(typeof window!=='undefined')window.__FORTISSIMO_PROGRESSION_EDITOR_V1__={
  info:PROGRESSION_EDITOR_V1_INFO,suggest:suggestProgressionEditCandidates,setMode:setNextChordEditMode,toggleLock:toggleChordBarLock
};
