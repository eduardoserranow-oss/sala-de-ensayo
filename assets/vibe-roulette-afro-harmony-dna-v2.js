import { VibeRouletteEngine } from './vibe-roulette-engine.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const copy=value=>JSON.parse(JSON.stringify(value));

function mood(illusion,nostalgia,connection,energy,tension,sensuality,brightness,stability,movement){
  return {illusion,nostalgia,connection,energy,tension,sensuality,brightness,stability,movement};
}

const BASE_EVIDENCE=Object.freeze([{
  sourceId:'serra-reference-dna-b1',
  kind:'user-curated-midi-audio-reference-study',
  verified:false
}]);

function family({
  id,label,roman,mode='major',confidence=.84,moodProfile,styleAffinity=['afrobeats','afropop'],
  motion='open-cycle',sourceRefs=1,note='',chorusRoman=null,tonalInterpretation=null
}){
  return Object.freeze({
    id:`reference-dna-b1-${id}`,
    roman:Object.freeze([...roman]),
    mode,
    referenceDna:true,
    referenceDnaFamily:id,
    referenceDnaLabel:label,
    referenceDnaMotion:motion,
    referenceDnaSourceRefs:sourceRefs,
    referenceDnaConfidence:confidence,
    evidenceClass:'REFERENCE_DNA_CURATED',
    provisional:false,
    evidenceConfidence:confidence,
    mood:Object.freeze({...moodProfile}),
    moodDerivation:'Editorial mapping from the user-curated MIDI performance plus its paired audio activity/density where available; the source does not assert an emotion label.',
    styleAffinity:Object.freeze([...styleAffinity]),
    serraFitNote:note || 'Reference-DNA harmony: preserve the root trajectory and let the Human Pianist create color through voice leading rather than adding unrelated chords.',
    evidence:BASE_EVIDENCE,
    tonalInterpretation,
    chorusVariation:Object.freeze({
      strategy:'same-reference-dna-family',
      roman:Object.freeze([...(chorusRoman||roman)]),
      note:'Keep the same curated harmonic family for the section; change entry/voicing before inventing extra functional harmony.'
    })
  });
}

/*
Reference DNA B1 is deliberately derivative/abstract:
- 22 user-supplied MIDI references were inspected.
- 21 had paired audio.
- 1,360 MIDI note events were analyzed.
- 19 sources carried useful harmonic-role information; lead/free-session material remains performance DNA rather than being forced into progression training.
No raw MIDI/audio bytes or literal note-event streams are embedded here.
*/
export const AFRO_HARMONY_DNA_PROGRESSIONS=Object.freeze([
  family({
    id:'soul-circle-2516',label:'Soul circle · ii–V–I–vi',
    roman:['ii7','V7','Imaj7','vi7'],mode:'major',confidence:.91,sourceRefs:1,motion:'circle-release',
    moodProfile:mood(.66,.88,.89,.48,.36,.74,.52,.84,.68),
    styleAffinity:['afropop','afrobeats','neo-soul','r&b'],
    note:'A warm ii–V–I–vi trajectory extracted from the expressive electric-piano reference; use restrained extensions and strong common-tone voice leading.'
  }),
  family({
    id:'afro-minor-descending-1767',label:'Afro minor descent · i–VII–VI–VII',
    roman:['i7','VIIadd9','VImaj7','VIIadd9'],mode:'minor',confidence:.90,sourceRefs:1,motion:'minor-descend-return',
    moodProfile:mood(.70,.84,.78,.72,.42,.70,.44,.76,.84),
    styleAffinity:['afrobeats','afropop','afro-latin'],
    note:'Minor tonic falls through VII and VI, then reopens through VII. Root movement is the hook; do not over-harmonize it.'
  }),
  family({
    id:'minor-third-vamp-13',label:'Minor color vamp · i–III',
    roman:['i7','IIImaj7'],mode:'minor',confidence:.80,sourceRefs:1,motion:'two-chord-breath',
    moodProfile:mood(.60,.79,.86,.58,.34,.84,.40,.83,.64),
    styleAffinity:['afrobeats','afropop','r&b'],
    note:'Two-chord minor/relative-major conversation. Rhythm, touch and texture should create evolution instead of adding more roots.'
  }),
  family({
    id:'minor-473',label:'Minor soul release · iv–VII–III',
    roman:['iv7','VII7','IIImaj7'],mode:'minor',confidence:.88,sourceRefs:1,motion:'four-seven-three-release',
    moodProfile:mood(.56,.92,.82,.45,.40,.72,.34,.86,.61),
    styleAffinity:['afropop','r&b','neo-soul','afrobeats'],
    note:'iv–VII–III extracted from a slow minor electric-key reference. Let the III feel like release without turning the phrase into a heavy cadence.'
  }),
  family({
    id:'minor-61',label:'Emotional two-chord · VI–i',
    roman:['VImaj7','i7'],mode:'minor',confidence:.90,sourceRefs:1,motion:'relative-major-to-home',
    moodProfile:mood(.52,.94,.80,.38,.30,.68,.30,.90,.48),
    styleAffinity:['afropop','r&b','neo-soul'],
    note:'Very simple VI–i emotional bed. The DNA asks the pianist and Texture layer to carry sophistication while harmony stays memorable.'
  }),
  family({
    id:'major-1532',label:'Open pop-soul fall · I–V–iii–ii',
    roman:['Imaj7','Vadd9','iii7','ii7'],mode:'major',confidence:.86,sourceRefs:1,motion:'major-downward-release',
    moodProfile:mood(.80,.70,.86,.62,.30,.66,.72,.88,.74),
    styleAffinity:['afropop','pop','neo-soul','afrobeats'],
    note:'Major-frame I–V–iii–ii movement from a song-starter reference; smooth bass/upper-voice descent matters more than extra substitutions.'
  }),
  family({
    id:'minor-653',label:'Minor falling frame · VI–v–III',
    roman:['VImaj7','v7','IIImaj7'],mode:'minor',confidence:.84,sourceRefs:1,motion:'six-five-three-release',
    moodProfile:mood(.58,.90,.76,.46,.32,.70,.34,.86,.58),
    styleAffinity:['afropop','r&b','afrobeats'],
    note:'VI–v–III is a soft descending minor-frame family. Keep the ending open enough to loop naturally.'
  }),
  family({
    id:'minor-6747',label:'Afro lift-return · VI–VII–iv–VII',
    roman:['VImaj7','VIIadd9','iv7','VIIadd9'],mode:'minor',confidence:.91,sourceRefs:1,motion:'six-seven-four-seven',
    moodProfile:mood(.78,.75,.84,.74,.38,.72,.58,.79,.88),
    styleAffinity:['afrobeats','afropop','afro-latin'],
    note:'Reference-derived Afro/Afropop motion with a clear VI→VII lift, a iv release and return to VII. Strong candidate for danceable writing.'
  }),
  family({
    id:'major-164',label:'Open song-starter · I–vi–IV',
    roman:['Imaj7','vi7','IVadd9'],mode:'major',confidence:.89,sourceRefs:1,motion:'home-minor-lift',
    moodProfile:mood(.86,.68,.90,.62,.25,.68,.78,.91,.72),
    styleAffinity:['afropop','pop','afrobeats'],
    note:'I–vi–IV three-chord frame extracted from an arpeggiated keys reference. Keep the fourth bar spacious instead of forcing V.'
  }),
  family({
    id:'minor-1532-modal',label:'Modal minor conversation · i–v–III–ii',
    roman:['i7','v7','IIImaj7','ii7'],mode:'minor',confidence:.81,sourceRefs:1,motion:'minor-modal-conversation',
    moodProfile:mood(.57,.82,.80,.55,.44,.76,.38,.75,.69),
    styleAffinity:['afropop','neo-soul','r&b','afrobeats'],
    note:'Modal minor family from the Wurlitzer/arp reference. Use ii as color, not as a cue for a large functional cadence.'
  }),
  family({
    id:'minor-1254',label:'Tense minor color · i–II7–v–iv',
    roman:['i7','II7','v7','iv7'],mode:'minor',confidence:.83,sourceRefs:1,motion:'minor-chromatic-pull',
    moodProfile:mood(.50,.86,.70,.58,.66,.64,.28,.66,.71),
    styleAffinity:['r&b','neo-soul','afropop','afrobeats'],
    note:'A controlled chromatic II7 appears inside an otherwise compact minor family. Keep performance density lower when this color is chosen.'
  }),
  family({
    id:'minor-14',label:'Minor foundation vamp · i–iv',
    roman:['i7','iv7'],mode:'minor',confidence:.92,sourceRefs:2,motion:'minor-home-subdominant',
    moodProfile:mood(.54,.84,.88,.50,.28,.90,.34,.90,.59),
    styleAffinity:['afrobeats','afropop','r&b'],
    note:'i–iv is intentionally minimal: an excellent place for pocket, human touch and Texture without melodic clutter.'
  }),
  family({
    id:'major-b67',label:'Tropical borrowed lift · bVI–bVII',
    roman:['bVIadd9','bVIIadd9'],mode:'major',confidence:.90,sourceRefs:1,motion:'borrowed-two-chord-lift',
    moodProfile:mood(.90,.55,.82,.82,.36,.64,.80,.78,.92),
    styleAffinity:['afrobeats','afropop','latin-tropical','caribbean'],
    note:'Borrowed bVI–bVII two-chord lift derived from the tropical rhythmic reference; treat groove and repeated stabs as the engine of motion.'
  }),
  family({
    id:'major-4136',label:'Airy major support · IV–I–iii–vi',
    roman:['IVmaj7','Imaj7','iii7','vi7'],mode:'major',confidence:.78,sourceRefs:2,motion:'four-home-inner-minor',
    moodProfile:mood(.78,.66,.91,.54,.24,.72,.70,.90,.66),
    styleAffinity:['afropop','pop','neo-soul'],
    note:'Airy major-frame family distilled from upper-register keys references. Keep roots grounded and let common tones smooth the movement.'
  })
]);

const DNA_BY_ID=new Map(AFRO_HARMONY_DNA_PROGRESSIONS.map(item=>[item.id,item]));

function cleanHead(token=''){
  return String(token).trim().replaceAll('♭','b').replaceAll('♯','#').match(/^([b#]*)([ivIV]+)/)?.slice(1).join('')||'';
}
function degreeNumber(head=''){
  const numeral=String(head).replace(/^[b#]+/,'').toUpperCase();
  return {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7}[numeral]||0;
}
function normalizeMode(mode=''){
  const value=String(mode).toLowerCase();
  if(value==='minor'||value==='min')return 'minor';
  if(value==='major'||value==='maj')return 'major';
  return value;
}
function transitionSignature(roman=[]){
  const heads=roman.map(cleanHead).filter(Boolean);
  const degrees=heads.map(degreeNumber);
  return degrees.slice(1).map((degree,index)=>((degree-degrees[index]+7)%7)||7);
}
function familySimilarity(roman=[],familyRoman=[]){
  const a=roman.map(cleanHead).filter(Boolean),b=familyRoman.map(cleanHead).filter(Boolean);
  if(!a.length||!b.length)return 0;
  const lengthFit=Math.min(a.length,b.length)/Math.max(a.length,b.length);
  const positionCount=Math.min(a.length,b.length);
  let position=0;
  for(let i=0;i<positionCount;i+=1){
    if(a[i]===b[i])position+=1;
    else if(degreeNumber(a[i])===degreeNumber(b[i]))position+=.62;
  }
  position/=Math.max(1,positionCount);
  const ta=transitionSignature(a),tb=transitionSignature(b);
  const n=Math.min(ta.length,tb.length);
  let transitions=0;
  for(let i=0;i<n;i+=1)if(ta[i]===tb[i])transitions+=1;
  transitions=n?transitions/n:position;
  return clamp(lengthFit*(position*.58+transitions*.42),0,1);
}

export function referenceDnaSimilarity(roman=[],mode=null){
  let best={score:0,family:null};
  const wantedMode=normalizeMode(mode);
  for(const family of AFRO_HARMONY_DNA_PROGRESSIONS){
    const modePenalty=wantedMode&&normalizeMode(family.mode)!==wantedMode?.78:1;
    const score=familySimilarity(roman,family.roman)*modePenalty;
    if(score>best.score)best={score,family};
  }
  return best;
}

export function afroHarmonyDnaWeight(item={},context={}){
  if(item.referenceDna){
    const energy=clamp(context.energyTarget??item.mood?.energy??.6,0,1);
    const fit=1-Math.abs(energy-Number(item.mood?.energy??.6));
    return 1.68+Number(item.referenceDnaConfidence||.8)*.34+fit*.18;
  }
  const match=referenceDnaSimilarity(item.roman||[],item.mode);
  if(match.score>=.86)return 1.30;
  if(match.score>=.68)return 1.16;
  if(match.score>=.48)return 1.03;
  if(match.score<.22)return .82;
  return .94;
}

export function getAfroHarmonyDnaProgressions(){return AFRO_HARMONY_DNA_PROGRESSIONS.map(copy);}

function candidatesForMood(mood='connection'){
  const key=String(mood||'connection').toLowerCase();
  return AFRO_HARMONY_DNA_PROGRESSIONS.filter(item=>Number(item.mood?.[key])>0);
}

function decorateReferenceResult(result,selected){
  if(!result||!selected)return result;
  result.referenceDna=true;
  result.referenceDnaFamily=selected.referenceDnaFamily;
  result.referenceDnaLabel=selected.referenceDnaLabel;
  result.referenceDnaMotion=selected.referenceDnaMotion;
  result.referenceDnaSourceRefs=selected.referenceDnaSourceRefs;
  result.evidenceClass='REFERENCE_DNA_CURATED';
  result.provisional=false;
  result.evidenceConfidence=selected.referenceDnaConfidence;
  result.evidenceSummary={
    verifiedCount:0,supportedSongIds:[],kinds:['user-curated-midi-audio-reference-study'],
    confidence:selected.referenceDnaConfidence,provisional:false
  };
  result.harmonyDna={
    version:'B1-progression-v2',
    family:selected.referenceDnaFamily,
    label:selected.referenceDnaLabel,
    motion:selected.referenceDnaMotion,
    sourceRefs:selected.referenceDnaSourceRefs,
    confidence:selected.referenceDnaConfidence,
    rawReferenceAssetsEmbedded:false
  };
  return result;
}

const proto=VibeRouletteEngine.prototype;
const originalSpin=proto.spin;
if(originalSpin&&!originalSpin.__afroHarmonyDnaV2Patched){
  const patched=function(options={}){
    const moodKey=String(options?.mood||'nostalgia').toLowerCase();
    const dnaCandidates=candidatesForMood(moodKey);
    const sourceDataset=this.dataset;
    const draw=typeof this.random==='function'?this.random():Math.random();
    // The user-curated bank now drives most Spins. A small exploration window keeps
    // verified/practitioner legacy corpus material alive and prevents overfitting.
    const preferReferenceDna=dnaCandidates.length>0&&draw<.86;
    if(preferReferenceDna)this.dataset={...sourceDataset,progressions:dnaCandidates};
    let result;
    try{result=originalSpin.call(this,options);}
    finally{this.dataset=sourceDataset;}
    const selected=DNA_BY_ID.get(result?.progressionId);
    return selected?decorateReferenceResult(result,selected):result;
  };
  patched.__afroHarmonyDnaV2Patched=true;
  patched.__originalSpin=originalSpin;
  proto.spin=patched;
}

function installUiTruth(){
  if(typeof window==='undefined'||typeof document==='undefined')return;
  let pending=false;
  const sync=()=>{
    pending=false;
    const result=window.__FORTISSIMO_VIBE_LAST_RESULT__;
    if(!result?.referenceDna)return;
    const meta=document.getElementById('metaRow');
    const firstChip=meta?.querySelector('.chip');
    if(firstChip&&firstChip.textContent!=='SERRA REFERENCE DNA · CURATED'){
      firstChip.textContent='SERRA REFERENCE DNA · CURATED';
      firstChip.classList.remove('verified');
      firstChip.classList.add('warn');
    }
    const evidence=document.getElementById('evidenceContent');
    if(evidence&&!evidence.querySelector('[data-reference-dna-b1]')){
      evidence.innerHTML=`<div data-reference-dna-b1 class="evidence-foot"><strong>Reference DNA B1:</strong> this harmony comes from a transposable grammar derived from 22 user-supplied MIDI references, 21 paired audio files and 1,360 analyzed MIDI notes. The active family is <strong>${String(result.referenceDnaLabel||'curated harmonic family')}</strong>. Raw premium MIDI/audio is not embedded in the public runtime.</div>`;
    }
  };
  const schedule=()=>{if(pending)return;pending=true;queueMicrotask(sync);};
  const start=()=>{
    const root=document.querySelector('.vr-panel[aria-live="polite"]')||document.body;
    if(!root)return;
    new MutationObserver(schedule).observe(root,{subtree:true,childList:true,characterData:true});
    schedule();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
installUiTruth();

export const AFRO_HARMONY_DNA_V2_INFO=Object.freeze({
  version:'2.0-reference-dna-b1',
  phase:4.3,
  referenceMidiCount:22,
  pairedAudioCount:21,
  analyzedMidiNoteCount:1360,
  harmonicRoleReferenceCount:19,
  derivedFamilyCount:AFRO_HARMONY_DNA_PROGRESSIONS.length,
  activeSelectionBias:.86,
  rawReferenceAssetsEmbedded:false,
  purpose:'Make progression/root selection feel like the user-curated Afrobeats/Pop/Soul MIDI/audio references before Phase 5 arrangement intelligence.',
  safeguards:Object.freeze([
    'derived/transposable harmony only',
    '2–4 chord commercial forms',
    'legacy corpus exploration remains available',
    'Human Pianist, Texture, drums and S.K.Y. playback are not mutated by this phase'
  ])
});

if(typeof window!=='undefined')window.__FORTISSIMO_AFRO_HARMONY_DNA_V2__={
  info:AFRO_HARMONY_DNA_V2_INFO,
  families:AFRO_HARMONY_DNA_PROGRESSIONS,
  similarity:referenceDnaSimilarity,
  weight:afroHarmonyDnaWeight
};
