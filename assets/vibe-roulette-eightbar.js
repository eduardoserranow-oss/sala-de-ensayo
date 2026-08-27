import {
  progressionToChords,
  recommendedBpmForEnergy,
  formatCommercialFourBarPlan
} from './vibe-roulette-engine-v2.js';
import { SeamlessEightBarLoopTransport } from './vibe-roulette-seamless-loop-v1.js';

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
  if(isMinorRoman(base)) return r<0.56 ? `${base}7` : `${base}add9`;
  return `${base}add9`;
}

export function chooseTurnaroundType({ mood='connection', energyTarget=0.65, seed='' } = {}) {
  const r = hash01(`${mood}|${Math.round(energyTarget*100)}|${seed}`);
  if (mood === 'nostalgia') return r < 0.68 ? 'soft-turnaround' : 'loop-home';
  if (mood === 'illusion') return r < 0.58 ? 'loop-home' : 'open-ending';
  return r < 0.52 ? 'soft-turnaround' : r < 0.84 ? 'loop-home' : 'open-ending';
}

export function chooseSecondPassVariation({roman=[],mood='connection',energyTarget=0.65,seed=''}={}){
  const r=hash01(`A-prime|${roman.join('-')}|${mood}|${Math.round(energyTarget*100)}|${seed}`);
  if(roman.length<=2){ if(r<0.58) return 'early-color'; if(r<0.78) return 'phrasing-only'; return 'turnaround'; }
  if(r<0.34) return 'early-color';
  if(r<0.52) return 'middle-color';
  if(r<0.66) return 'phrasing-only';
  return 'turnaround';
}

export function buildSecondPassRoman(baseRoman=[], { mode='major', mood='connection', energyTarget=0.65, seed='' } = {}) {
  const roman = [...baseRoman];
  if (!roman.length) return { roman: [], strategy: 'open-ending', note: 'No harmonic variation available.', variationEvents:[] };
  const variationType=chooseSecondPassVariation({roman,mood,energyTarget,seed});
  const variationEvents=[];

  if(variationType==='early-color'){
    const before=roman[0]; roman[0]=colorRomanToken(before,{mood,energyTarget,seed:`${seed}|bar5`});
    variationEvents.push({position:'start-of-A-prime',index:0,before,after:roman[0],kind:'harmonic-color'});
    return {roman,strategy:'early-color',variationEvents,note:'A′ evolves immediately at bar 5 with a restrained color on the opening harmony; later bars may stay familiar instead of forcing another change.'};
  }
  if(variationType==='middle-color'){
    const index=Math.min(roman.length-1,2); const before=roman[index]; roman[index]=colorRomanToken(before,{mood,energyTarget,seed:`${seed}|bar7`});
    variationEvents.push({position:'middle-of-A-prime',index,before,after:roman[index],kind:'harmonic-color'});
    return {roman,strategy:'middle-color',variationEvents,note:'A′ keeps the opening familiar and introduces one commercial color later in the second pass, then lets the loop resolve naturally.'};
  }
  if(variationType==='phrasing-only'){
    return {roman,strategy:'phrasing-only',variationEvents:[{position:'performance',kind:'voicing-rhythm'}],note:'A′ keeps the same chord symbols; its evolution is carried by voicing, top-line and rhythmic phrasing rather than extra harmony.'};
  }

  const strategy = chooseTurnaroundType({ mood, energyTarget, seed: `${seed}|${roman.join('-')}` });
  const dominant = dominantTurnaroundToken(mode);
  if (strategy === 'open-ending') return {roman,strategy,variationEvents:[{position:'ending',kind:'open-ending'}],note:'A′ keeps the same harmonic loop and lets phrasing/voicing create the variation instead of forcing a new closing chord.'};

  const last = roman[roman.length - 1];
  if (hasDominantFunction(stripExtension(last))) {
    roman[roman.length - 1] = dominant;
    variationEvents.push({position:'ending',index:roman.length-1,before:last,after:dominant,kind:'dominant-strengthening'});
    return {roman,strategy,variationEvents,note:strategy==='loop-home'?'A′ saves its variation for the close: the final dominant is strengthened so bar 8 pulls clearly back to bar 1.':'A gentle dominant-color ending creates motion back into the loop without over-arranging the second pass.'};
  }
  if (roman.length === 4) {
    roman.push(dominant); variationEvents.push({position:'bar8-shared',index:4,before:null,after:dominant,kind:'turnaround'});
    return {roman,strategy,variationEvents,note:strategy==='loop-home'?'Bar 8 splits into the original closing harmony and a dominant turnaround, creating a clear need to return to bar 1.':'Bar 8 gains a short dominant pickup so the second pass reconnects naturally with the loop.'};
  }
  if(roman.length<=2){
    const before=roman[0]; roman[0]=colorRomanToken(before,{mood,energyTarget,seed:`${seed}|short-loop`});
    variationEvents.push({position:'start-of-A-prime',index:0,before,after:roman[0],kind:'harmonic-color'});
    return {roman,strategy:'early-color',variationEvents,note:'The short source loop stays intact; A′ changes the opening color while preserving the original closing harmony.'};
  }
  roman[roman.length - 1] = dominant; variationEvents.push({position:'ending',index:roman.length-1,before:last,after:dominant,kind:'turnaround'});
  return {roman,strategy,variationEvents,note:'The second pass keeps the source loop compact and uses a dominant-colored close to reconnect with bar 1.'};
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
