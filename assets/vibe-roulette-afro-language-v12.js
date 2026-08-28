import { harmonicComplexityScore, performanceComplexityBudget } from './vibe-roulette-afro-commercial-v11.js';

const DEGREE_MAP={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function cleanRoman(token=''){
  return String(token)
    .replaceAll('♭','b').replaceAll('♯','#')
    .replace(/^[b#]+/,'')
    .replace(/[^ivIV]/g,'')
    .toUpperCase();
}

export function afroRomanDegrees(roman=[]){
  return roman.map(token=>DEGREE_MAP[cleanRoman(token)]||null).filter(Boolean);
}

function keyForDegrees(degrees=[]){return degrees.join('-');}

const RELATIVE_MINOR_236={
  '2-3-6':{rank:'core',weight:1.38,relativeMinor:['iv','v','i'],motion:'minor-resolution'},
  '6-2-3':{rank:'core',weight:1.32,relativeMinor:['i','iv','v'],motion:'minor-cycle'},
  '3-2-6':{rank:'strong',weight:1.24,relativeMinor:['v','iv','i'],motion:'backward-minor-resolution'},
  '6-3-2':{rank:'supporting',weight:1.19,relativeMinor:['i','v','iv'],motion:'descending-minor-cycle'},
  '2-6-3':{rank:'supporting',weight:1.18,relativeMinor:['iv','i','v'],motion:'open-minor-cycle'},
  '3-6-2':{rank:'supporting',weight:1.16,relativeMinor:['v','i','iv'],motion:'open-minor-cycle'}
};

const COMMERCIAL_FAMILIES={
  '4-5-6-5':{id:'ascending-4565',rank:'core',weight:1.45,motion:'lift-return'},
  '6-1-4-5':{id:'vi-centered-cycle',rank:'core',weight:1.37,motion:'emotional-forward'},
  '4-6-5':{id:'iv-vi-v',rank:'strong',weight:1.28,motion:'lift-pivot-return'},
  '4-5-6':{id:'ascending-456',rank:'strong',weight:1.28,motion:'open-lift'},
  '6-5-4':{id:'vi-v-iv',rank:'strong',weight:1.27,motion:'descending-release'},
  '6-1-4':{id:'vi-i-iv',rank:'strong',weight:1.24,motion:'warm-open-cycle'},
  '2-3':{id:'minor-23-vamp',rank:'strong',weight:1.26,motion:'rising-vamp'},
  '6-2-5-1':{id:'functional-6251',rank:'conditional',weight:1.08,motion:'functional-cadence'},
  // Earlier user-supplied practitioner material remains available.
  '4-3-6-5':{id:'legacy-practitioner-4365',rank:'supporting',weight:1.16,motion:'inner-fall-lift'},
  '6-3-4-5':{id:'legacy-practitioner-6345',rank:'supporting',weight:1.16,motion:'vi-centered-lift'}
};

export const AFRO_LANGUAGE_FAMILIES={
  relativeMinor236:{
    id:'relative-minor-236',
    label:'Relative-minor 2–3–6 family',
    principle:'Major-scale ii/iii/vi heard as relative-minor iv/v/i.',
    members:RELATIVE_MINOR_236
  },
  commercial:COMMERCIAL_FAMILIES
};

export function classifyAfroProgression(roman=[]){
  const degrees=afroRomanDegrees(roman);
  const key=keyForDegrees(degrees);
  const minorMember=RELATIVE_MINOR_236[key];
  if(minorMember){
    return {
      matched:true,id:'relative-minor-236',label:'Relative-minor 2–3–6',degrees,
      majorFrame:roman.map(cleanRoman),...minorMember,
      practitionerEvidence:true,tonalCenter:'relative-minor'
    };
  }
  const commercial=COMMERCIAL_FAMILIES[key];
  if(commercial){
    return {matched:true,label:'Afro commercial family',degrees,...commercial,practitionerEvidence:true,tonalCenter:degrees[0]===6?'vi-centered':'major-relative-minor-fluid'};
  }
  return {matched:false,id:'general-afro-commercial',label:'General Afro commercial',degrees,rank:'unclassified',weight:1,motion:'open',practitionerEvidence:false,tonalCenter:'source-defined'};
}

export function afroLanguageWeight(item={}){
  const classification=classifyAfroProgression(item.roman||[]);
  let weight=classification.weight||1;
  const evidenceClass=String(item.evidenceClass||'').toUpperCase();
  if(evidenceClass.includes('PRACTITIONER'))weight*=1.08;
  if((item.roman||[]).length>4)weight*=0.82;
  weight*=1-harmonicComplexityScore(item.roman||[])*0.24;
  return clamp(weight,0.62,1.62);
}

export function afroPocketPolicy({roman=[],bpm=96,energyTarget=0.62,timeSignature='4/4'}={}){
  const classification=classifyAfroProgression(roman);
  const budget=performanceComplexityBudget(roman);
  const energy=clamp(Number(energyTarget)||0.62,0,1);
  const compound=String(timeSignature)==='6/8';
  let policy={
    archetype:'afro-space-and-response',density:0.62,sustainRatio:0.66,bassSustainRatio:0.72,
    maxOrnamentsPerChord:1,leftHandMode:'roots-first',keepCommonTones:true,
    pickupProbability:0.22,topVoiceAccent:1.06,innerVoiceScale:0.94
  };

  if(classification.id==='relative-minor-236'){
    policy={...policy,archetype:'minor-cycle-conversation',density:0.56,sustainRatio:0.70,bassSustainRatio:0.76,pickupProbability:0.18,leftHandMode:'roots-only'};
  }else if(classification.id==='ascending-4565'||classification.id==='ascending-456'){
    policy={...policy,archetype:'staggered-stabs',density:0.68,sustainRatio:0.48,bassSustainRatio:0.60,pickupProbability:0.30,leftHandMode:'roots-only',topVoiceAccent:1.10};
  }else if(classification.id==='minor-23-vamp'){
    policy={...policy,archetype:'vamp-call-response',density:0.52,sustainRatio:0.58,bassSustainRatio:0.68,pickupProbability:0.26,leftHandMode:'roots-only'};
  }else if(classification.id==='vi-centered-cycle'||classification.id==='vi-v-iv'||classification.id==='vi-i-iv'){
    policy={...policy,archetype:'sustain-and-upper-pulse',density:0.60,sustainRatio:0.72,bassSustainRatio:0.76,pickupProbability:0.20,leftHandMode:'roots-first'};
  }else if(classification.id==='functional-6251'){
    policy={...policy,archetype:'restrained-functional',density:0.48,sustainRatio:0.76,bassSustainRatio:0.78,maxOrnamentsPerChord:0,pickupProbability:0.10,leftHandMode:'roots-only'};
  }

  if(compound){
    policy={...policy,archetype:'compound-6-8-arpeggio',density:0.58,sustainRatio:0.42,bassSustainRatio:0.62,maxOrnamentsPerChord:0,pickupProbability:0,
      arpeggioContour:['root','third','fifth','third','octave','fifth']};
  }

  const complexity=harmonicComplexityScore(roman);
  const complexityRestraint=1-complexity*0.38;
  return {
    ...policy,
    version:'1.2',bpm:Number(bpm)||96,energy,classification,
    density:clamp(policy.density*complexityRestraint,0.34,0.76),
    performanceBudget:budget.performance,
    complexityBudget:budget,
    rule:'Commercial harmony first. Harmonic complexity up means performance complexity down.'
  };
}

export const AFRO_LANGUAGE_V12_INFO={
  version:'1.2',
  evidenceClass:'PRACTITIONER_EDUCATIONAL',
  principle:'Neo-Soul in the hands. Afro/Afropop in the song. Commercial harmony first.',
  safeguards:['progression is separate from voicing','2-3-6 permutations are not equally ranked','no Billboard upgrade','roots-first left hand','intentional silence','complexity budget']
};
