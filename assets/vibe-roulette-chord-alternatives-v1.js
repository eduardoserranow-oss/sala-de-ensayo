import './vibe-roulette-chord-preview-v1.js';
import './vibe-roulette-skykeys-phase5-integration-v1.js';
import './vibe-roulette-songstarter-layer-controls-v1.js';
import { progressionToChords } from './vibe-roulette-engine.js';
import { classifyAfroProgression, afroLanguageWeight } from './vibe-roulette-afro-language-v12.js';
import { buildSerraEmotionProfile } from './vibe-roulette-serra-emotion-v1.js';

const DEGREE={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7};
const MAJOR=['I','ii','iii','IV','V','vi'];
const MINOR=['i','ii','III','iv','v','VI','VII'];
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
function clean(token=''){return String(token).replace(/^[b#♭♯]+/,'').replace(/[^ivIV]/g,'');}
function degree(token=''){return DEGREE[clean(token).toUpperCase()]||0;}
function circularDistance(a,b){const d=Math.abs(a-b);return Math.min(d,7-d);}

const FILTER_DEGREE_BIAS={
  joy:{1:1.16,4:1.12,5:1.08,6:1.06},sadness:{6:1.18,2:1.12,3:1.09,4:1.05},calm:{1:1.16,4:1.12,6:1.08},
  sensual:{6:1.16,2:1.10,4:1.08,3:1.06},danceable:{4:1.12,5:1.12,6:1.14,2:1.06},party:{4:1.14,5:1.14,6:1.10,1:1.08},
  introspection:{6:1.17,3:1.12,2:1.10,4:1.06}
};

export function suggestAfroChordAlternatives({roman=[],index=0,key='C',mode='major',emotionFilters=[],primaryMood='connection',limit=5}={}){
  if(index<0||index>=roman.length)return [];
  const vocabulary=mode==='minor'?MINOR:MAJOR;
  const current=roman[index];
  const currentDegree=degree(current);
  const emotional=buildSerraEmotionProfile(emotionFilters,primaryMood);
  const candidates=[];
  for(const token of vocabulary){
    if(clean(token)===clean(current))continue;
    const proposal=[...roman];proposal[index]=token;
    const classification=classifyAfroProgression(proposal);
    let score=afroLanguageWeight({roman:proposal});
    for(const filter of emotional.filters)score*=FILTER_DEGREE_BIAS[filter]?.[degree(token)]||1;
    score*=1.10-circularDistance(currentDegree,degree(token))*0.035;
    if(index>0)score*=1.08-circularDistance(degree(proposal[index-1]),degree(token))*0.018;
    if(index<proposal.length-1)score*=1.08-circularDistance(degree(token),degree(proposal[index+1]))*0.018;
    const family=classification.matched;
    const functionClose=Math.abs(degree(token)-currentDegree)<=2;
    const type=family?'Afro family':functionClose?'Close color':'Emotional turn';
    candidates.push({roman:token,progression:proposal,chord:progressionToChords([token],key,mode)[0],score,type,
      reason:family?`${classification.label} · ${classification.motion}`:functionClose?'Smooth voice-leading option':'Controlled contrast inside the Serra emotional profile',
      classification});
  }
  return candidates.sort((a,b)=>b.score-a.score).slice(0,clamp(limit,3,6));
}

export function replaceRomanAt(roman=[],index,replacement){
  if(index<0||index>=roman.length)throw new Error('This bar does not contain an editable harmonic event.');
  const next=[...roman];next[index]=replacement;return next;
}

export const CHORD_ALTERNATIVES_INFO={version:1,policy:'Contextual Afro-family alternatives, not a generic relative-chord list.'};
