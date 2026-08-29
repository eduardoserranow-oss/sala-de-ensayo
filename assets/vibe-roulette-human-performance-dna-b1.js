// Derived, non-redistributive performance DNA from Reference DNA Session B1.
// Source study: 22 curated MIDI references + 21 matching audio references.
// No raw premium MIDI/audio is embedded here; only abstract, transposable behavior.

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
function hash01(seed=''){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}

export const HUMAN_PERFORMANCE_DNA_B1=Object.freeze({
  version:'B1',
  midiReferences:22,
  audioPairs:21,
  expressiveReferenceCount:5,
  findings:Object.freeze({
    velocityStdMedian:21.21003773433799,
    velocityFloorMedian:5,
    rollSpreadMedianBeats:0.0833333333333286,
    rollSpreadP90Beats:0.1875,
    gridDeviationMedianBeats:0.0416666666666714,
    gridDeviationP90Beats:0.0749999999999992,
    sustainAcrossNextMedianRatio:0.631578947368421,
    medianNoteDurationBeats:1.634375
  }),
  principles:Object.freeze([
    'Contextual microtiming, never per-note random jitter.',
    'Velocity is mixed by finger/voice role, not scaled uniformly.',
    'Common tones may breathe across chord boundaries instead of being re-struck.',
    'Releases are independent by voice.',
    'Phrase-end responses are sparse and harmonically safe.',
    'Shared BPM/transport remains exact.'
  ]),
  referenceGrammar:Object.freeze({
    afroChordFan:'KRS 104 chord fan: staged chord tones with earlier notes sustained',
    splitHandPocket:'KRS 94 bass/upper interlock',
    phraseResponse:'Tropical 102 repeated chord stabs + phrase-end melodic answer',
    multilayerSeed:'Raspberry sustained foundation + high sixteenth ostinato',
    ghostHarmony:'Wurliano/Celeste extremely soft inner harmony + stronger top movement',
    approachNotes:'AS 95 Lead Mbela short approach-note cells',
    humanVoicing:'Grand Piano Session 4 + Electric Piano Out Of Sync: finger-mixed dynamics, long overlaps and staggered voicings'
  })
});

export const HUMAN_GESTURES_B1=Object.freeze({
  'near-simultaneous':Object.freeze({label:'Near-simultaneous human press',rightBeats:[0,0.0208333333,0.0416666667],bassBeat:0}),
  'bottom-up-fan':Object.freeze({label:'Bottom-up chord fan',rightBeats:[0,0.0416666667,0.0833333333],bassBeat:0}),
  'partial-roll':Object.freeze({label:'Partial roll',rightBeats:[0,0.0208333333,0.1041666667],bassBeat:0.0104166667}),
  'delayed-extension':Object.freeze({label:'Delayed extension',rightBeats:[0,0.03125,0.125],bassBeat:0}),
  'delayed-top':Object.freeze({label:'Delayed top voice',rightBeats:[0,0.015625,0.0833333333],bassBeat:0}),
  'split-hand':Object.freeze({label:'Split-hand arrival',rightBeats:[0.0416666667,0.0625,0.0833333333],bassBeat:0}),
  'afro-quarter-fan':Object.freeze({label:'Afro quarter-beat fan',rightBeats:[0,0.125,0.25],bassBeat:0})
});

export function chooseHumanGestureB1({seed='human-b1',chordIndex=0,energy=0.62,mood='connection',pass='A'}={}){
  const e=clamp(energy,0,1),m=String(mood||'connection').toLowerCase();
  let pool=['near-simultaneous','bottom-up-fan','partial-roll','delayed-top','split-hand'];
  if(e<0.46||/calm|calma|sad|triste|nostalg|intros/.test(m))pool=['bottom-up-fan','delayed-extension','delayed-top','partial-roll','near-simultaneous'];
  else if(e>0.72||/dance|bail|fiesta|joy|alegr/.test(m))pool=['near-simultaneous','split-hand','partial-roll','bottom-up-fan','afro-quarter-fan'];
  const prime=String(pass).includes('′')||String(pass).toLowerCase().includes('prime');
  let index=Math.floor(hash01(`${seed}|gesture-b1|${chordIndex}|${pass}`)*pool.length);
  if(prime)index=(index+1+(chordIndex%2))%pool.length;
  return {id:pool[index],...HUMAN_GESTURES_B1[pool[index]]};
}

export function humanVoiceVelocityB1({velocity=52,role='inner-voice',voiceIndex=0,voiceCount=3,seed='human-b1',chordIndex=0,energy=0.62}={}){
  const e=clamp(energy,0,1),h=hash01(`${seed}|vel-b1|${chordIndex}|${role}|${voiceIndex}`);
  let scale=1;
  if(role==='bass-root')scale=0.96+e*0.10;
  else if(role==='bass-tenth')scale=0.72+e*0.08;
  else if(role==='top-voice')scale=1.04+e*0.08;
  else if(role==='inner-voice'){
    const ghost=h<0.22;
    if(ghost)scale=0.34+0.18*hash01(`${seed}|ghost|${chordIndex}|${voiceIndex}`);
    else scale=0.66+0.22*(voiceCount<=1?0.5:voiceIndex/Math.max(1,voiceCount-1));
  }else if(/response|pickup|answer/.test(role))scale=0.70+e*0.10;
  const contour=(hash01(`${seed}|contour|${chordIndex}|${role}|${voiceIndex}`)*2-1)*(role==='inner-voice'?7:4);
  const floor=role==='inner-voice'?5:16;
  return Math.round(clamp(Number(velocity)*scale+contour,floor,104));
}

export function humanOffsetSecondsB1({gesture,role='inner-voice',voiceIndex=0,voiceCount=3,bpm=100,seed='human-b1',chordIndex=0}={}){
  const secondsPerBeat=60/Math.max(40,Number(bpm)||100);
  const g=gesture||HUMAN_GESTURES_B1['near-simultaneous'];
  let beats=0;
  if(role==='bass-root'||role==='bass-tenth')beats=Number(g.bassBeat||0);
  else if(role==='top-voice')beats=Number(g.rightBeats?.at(-1)||0);
  else if(role==='inner-voice'){
    const idx=Math.min(Math.max(0,voiceIndex),Math.max(0,(g.rightBeats?.length||1)-1));
    beats=Number(g.rightBeats?.[idx]||0);
  }else beats=HUMAN_PERFORMANCE_DNA_B1.findings.gridDeviationMedianBeats*0.5;
  const micro=(hash01(`${seed}|micro-b1|${chordIndex}|${role}|${voiceIndex}`)*2-1)*0.0104166667;
  return Math.max(0,(beats+micro)*secondsPerBeat);
}

export function shouldHoldCommonToneB1({seed='human-b1',chordIndex=0,midi=60,energy=0.62}={}){
  const e=clamp(energy,0,1);
  const probability=clamp(0.48+(1-e)*0.18,0.42,0.66);
  return hash01(`${seed}|common-tone-b1|${chordIndex}|${midi}`)<probability;
}

export const HUMAN_PERFORMANCE_DNA_B1_CONTRACT=Object.freeze({
  transport:'BPM, bar grid and shared piano/drum clock are immutable.',
  harmony:'No new pitch class may be introduced by the humanization layer.',
  sourcePolicy:'Only derived timing/dynamic/role grammar is shipped; raw premium MIDI/audio is not embedded.',
  memory:'A→A′ harmonic/phrase memory remains authoritative before human performance shading.'
});
