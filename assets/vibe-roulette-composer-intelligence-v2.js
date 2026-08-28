import { commercialProgressionWeight, matchesAfrobeatsPractitionerPattern } from './vibe-roulette-groove.js';
import { granularTasteWeight, applyTasteWithExploration } from './vibe-roulette-taste-training-v1.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const cleanRoman=(roman=[])=>roman.map(x=>String(x).trim()).filter(Boolean);
const same=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
const SECTION_ARC={verse:{energy:-.08,density:'sparse'},prechorus:{energy:.08,density:'balanced'},chorus:{energy:.16,density:'balanced'},bridge:{energy:-.02,density:'rich'}};

function changeCount(a=[],b=[]){const n=Math.max(a.length,b.length);let count=0;for(let i=0;i<n;i+=1)if(!same(a[i],b[i]))count+=1;return count;}
function vocalSpacePenalty(candidate={}){const density=String(candidate.neoSoulDensity||candidate.density||'');const extensions=String(candidate.extensionPolicy||'');let penalty=1;if(density==='rich')penalty*=.9;if(/dense|altered|chromatic/i.test(extensions))penalty*=.82;return penalty;}
function afroSafety(candidate={}){const roman=cleanRoman(candidate.roman);if(!roman.length)return 0;let score=commercialProgressionWeight(roman);if(matchesAfrobeatsPractitionerPattern(roman))score*=1.18;return score;}
function sectionArcWeight(candidate={},section='chorus',context={}){const arc=SECTION_ARC[section]||SECTION_ARC.chorus;let score=1;const target=clamp(Number(context.energyTarget||.6)+arc.energy,0,1);const energy=Number(candidate.energyTarget??target);score*=Math.max(.72,1-Math.abs(energy-target)*.55);if(candidate.neoSoulDensity===arc.density)score*=1.1;return score;}
function continuityWeight(candidate={},main={}){const changes=changeCount(main.roman||[],candidate.roman||[]);if(changes===0)return .86;if(changes===1)return 1.22;if(changes===2)return 1.08;return .78;}
function primeMemoryWeight(candidate={},main={}){const changes=changeCount(main.chords||main.roman||[],candidate.chords||candidate.roman||[]);if(changes<=1)return 1.24;if(changes===2)return 1.04;return .76;}

export function scoreComposerCandidate(candidate={},context={}){
  const section=String(context.section||candidate.section||'chorus').toLowerCase();const main=context.main||{};
  const hard=afroSafety(candidate)*vocalSpacePenalty(candidate);if(hard<=0)return 0;
  const musical=sectionArcWeight(candidate,section,context)*continuityWeight(candidate,main);
  const memory=section==='a-prime'||section==='aprime'?primeMemoryWeight(candidate,main):1;
  const taste=granularTasteWeight({...context,...candidate,emotionalTerritory:context.emotionalTerritory||candidate.emotionalTerritory});
  return hard*musical*memory*applyTasteWithExploration(taste,context.random||Math.random);
}

export function rankComposerCandidates(candidates=[],context={}){return [...candidates].map(candidate=>({candidate,score:scoreComposerCandidate(candidate,context)})).sort((a,b)=>b.score-a.score);}
export function chooseComposerDirection(candidates=[],context={}){return rankComposerCandidates(candidates,context)[0]?.candidate||null;}
export function composerSectionBrief(section='chorus',context={}){const key=String(section).toLowerCase();const arc=SECTION_ARC[key]||SECTION_ARC.chorus;return {section:key,energyTarget:clamp(Number(context.energyTarget||.6)+arc.energy,0,1),neoSoulDensity:arc.density,continuityRule:key==='chorus'?'Recognizable lift from Main; prefer one or two meaningful harmonic changes.':key==='prechorus'?'Create forward pull without abandoning the song harmonic DNA.':key==='bridge'?'Allow the largest contrast while preserving Afro-commercial identity.':'Preserve the song DNA and leave vocal space.',playerRule:'Afrobeats harmony first. Neo-Soul musicianship second. Vocal/song space always.'};}

if(typeof window!=='undefined')window.__FORTISSIMO_COMPOSER_INTELLIGENCE_V2__={scoreComposerCandidate,rankComposerCandidates,chooseComposerDirection,composerSectionBrief};
export const COMPOSER_INTELLIGENCE_V2_INFO={version:2,phase:4,principle:'Taste influences composition only after Afro-commercial safety, section continuity and vocal space. A′ behaves like memory plus small evolution; later song sections may contrast more without losing the song DNA.',sections:['verse','prechorus','chorus','bridge'],hardRules:['Afrobeats/Afropop harmonic identity','commercial progression safety','vocal space','Neo-Soul density restraint','A/A-prime phrase memory']};
