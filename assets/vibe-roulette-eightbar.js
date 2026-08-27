import {
  progressionToChords,
  recommendedBpmForEnergy,
  formatCommercialFourBarPlan
} from './vibe-roulette-engine-v2.js';
import { SeamlessEightBarLoopTransport } from './vibe-roulette-seamless-loop-v1.js';
import { shouldAllowFunctionalTurnaround } from './vibe-roulette-afro-commercial-v11.js';

function hash01(seed='') {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function stripExtension(token='') {
  return String(token).replace(/(maj13|maj11|maj9|maj7|add13|add11|add9|sus2|sus4|13|11|9|7)$/i,'');
}
function hasExistingColor(token=''){ return /(maj13|maj11|maj9|maj7|add13|add11|add9|sus2|sus4|13|11|9|7|dim|°|ø)/i.test(String(token)); }
function hasDominantFunction(token='') { return /^V(?:7|9|11|13)?(?:\/.*)?$/i.test(String(token).replaceAll('♭','b').replaceAll('♯','#')); }
function dominantTurnaroundToken() { return 'V7'; }
function isMinorRoman(token=''){ const head=stripExtension(token).replace(/^[b#]+/,'').split('/')[0]; return /^[iv]+$/.test(head); }

function colorRomanToken(token,{mood='connection',energyTarget=0.65,seed=''}={}){
  if(hasExistingColor(token)) return token;
  const base=stripExtension(token);
  const r=hash01(`${seed}|${token}|${mood}|${Math.round(energyTarget*100)}`);
  if(isMinorRoman(base)) return r<0.62 ? `${base}7` : `${base}add9`;
  return `${base}add9`;
}

export function chooseTurnaroundType({ mood='connection', energyTarget=0.65, seed='' } = {}) {
  const r = hash01(`${mood}|${Math.round(energyTarget*100)}|${seed}`);
  if (mood === 'nostalgia') return r < 0.58 ? 'soft-turnaround' : 'loop-home';
  if (mood === 'illusion') return r < 0.52 ? 'loop-home' : 'open-ending';
  return r < 0.46 ? 'soft-turnaround' : r < 0.74 ? 'loop-home' : 'open-ending';
}

export function chooseSecondPassVariation({roman=[],mood='connection',energyTarget=0.65,seed=''}={}){
  const r=hash01(`A-prime-v11|${roman.join('-')}|${mood}|${Math.round(energyTarget*100)}|${seed}`);
  if(roman.length<=2){
    if(r<0.76) return 'phrasing-only';
    if(r<0.86) return 'early-color';
    if(r<0.95) return 'middle-color';
    return 'turnaround';
  }
  if(r<0.82) return 'phrasing-only';
  if(r<0.89) return 'early-color';
  if(r<0.95) return 'middle-color';
  return 'turnaround';
}

export function buildSecondPassRoman(baseRoman=[], { mode='major', mood='connection', energyTarget=0.65, seed='' } = {}) {
  const roman = [...baseRoman];
  if (!roman.length) return { roman: [], strategy: 'open-ending', note: 'No harmonic variation available.', variationEvents:[] };
  const variationType=chooseSecondPassVariation({roman,mood,energyTarget,seed});
  const variationEvents=[];

  if(variationType==='phrasing-only'){
    return {roman,strategy:'phrasing-only',variationEvents:[{position:'performance',kind:'voicing-rhythm'}],note:'A′ keeps the same commercial chord formula. The Neo-Soul Player changes top-line, touch, inversion, dynamics and pocket instead of forcing new harmony.'};
  }
  if(variationType==='early-color'){
    const before=roman[0]; roman[0]=colorRomanToken(before,{mood,energyTarget,seed:`${seed}|bar5`});
    variationEvents.push({position:'start-of-A-prime',index:0,before,after:roman[0],kind:'harmonic-color'});
    return {roman,strategy:'early-color',variationEvents,note:'A′ adds one restrained commercial color at bar 5, then preserves the familiar loop. The hands carry the rest of the variation.'};
  }
  if(variationType==='middle-color'){
    const index=Math.min(roman.length-1,2); const before=roman[index]; roman[index]=colorRomanToken(before,{mood,energyTarget,seed:`${seed}|bar7`});
    variationEvents.push({position:'middle-of-A-prime',index,before,after:roman[index],kind:'harmonic-color'});
    return {roman,strategy:'middle-color',variationEvents,note:'A′ keeps the hook intact and adds one small color later in the phrase; no extra functional cadence is required.'};
  }

  const turnaroundSeed=hash01(`${seed}|functional-turnaround|${roman.join('-')}`);
  if(!shouldAllowFunctionalTurnaround({roman,seedValue:turnaroundSeed})){
    return {roman,strategy:'phrasing-only',variationEvents:[{position:'performance',kind:'turnaround-rejected-by-commercial-gate'}],note:'The Afro Commercial Gate rejected an unnecessary functional turnaround. A′ stays on the original loop and varies through performance.'};
  }

  const strategy = chooseTurnaroundType({ mood, energyTarget, seed: `${seed}|${roman.join('-')}` });
  if(strategy==='open-ending') return {roman,strategy:'phrasing-only',variationEvents:[{position:'ending',kind:'open-loop'}],note:'The loop itself is the resolution. A′ preserves the commercial cycle and lets the groove return naturally to bar 1.'};
  const dominant = dominantTurnaroundToken(mode);
  const last = roman[roman.length - 1];

  if (hasDominantFunction(stripExtension(last))) {
    roman[roman.length - 1] = dominant;
    variationEvents.push({position:'ending',index:roman.length-1,before:last,after:dominant,kind:'dominant-strengthening'});
    return {roman,strategy,variationEvents,note:'A rare functional close is allowed because the source loop already supports dominant motion; the change remains compact.'};
  }
  if (roman.length === 4) {
    roman.push(dominant); variationEvents.push({position:'bar8-shared',index:4,before:null,after:dominant,kind:'turnaround'});
    return {roman,strategy,variationEvents,note:'A rare bar-8 pickup is used as a two-beat turnaround. This is intentionally uncommon in the Afro/Afropop writing model.'};
  }
  return {roman,strategy:'phrasing-only',variationEvents:[{position:'performance',kind:'commercial-restraint'}],note:'The progression stays harmonically compact; the second pass evolves through the pianist rather than extra chords.'};
}

export function buildEightBarArrangement(result, {
  key = result?.key,
  mode = result?.mode,
  mood = result?.mood,
  energyTarget = result?.intent?.energyTarget ?? 0.65
} = {}) {
  if (!result?.roman?.length) throw new Error('A roulette result is required to build an eight-bar arrangement.');
  const firstRoman = [...result.roman];
  const firstChords = progressionToChords(firstRoman, key, mode);
  const spinSeed = result.id || result.performancePattern?.variantSeed || result.progressionId || firstRoman.join('-');
  const second = buildSecondPassRoman(firstRoman, {mode,mood,energyTarget,seed:spinSeed});
  const secondChords = progressionToChords(second.roman, key, mode);
  return {
    bars:8,beatsPerBar:4,totalBeats:32,bpm:recommendedBpmForEnergy(energyTarget),performancePattern:result.performancePattern||null,
    firstPass:{label:'A · First pass',roman:firstRoman,chords:firstChords,romanBars:formatCommercialFourBarPlan(firstRoman),chordBars:formatCommercialFourBarPlan(firstChords)},
    secondPass:{label:"A′ · Variation",roman:second.roman,chords:secondChords,romanBars:formatCommercialFourBarPlan(second.roman),chordBars:formatCommercialFourBarPlan(secondChords),strategy:second.strategy,variationEvents:second.variationEvents,note:second.note}
  };
}

export class EightBarLoopTransport extends SeamlessEightBarLoopTransport {}

export const SLOT_REEL_POOL = ['C','Cm','Db','D','Dm','Eb','E','Em','F','Fm','F#','G','Gm','Ab','A','Am','Bb','B','Bm','Cadd9','Dm7','Em7','Fmaj7','G7','Am7','Bbadd9'];