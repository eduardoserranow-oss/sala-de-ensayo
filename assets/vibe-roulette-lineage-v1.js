function stripRomanColor(token=''){
  return String(token)
    .replaceAll('♭','b').replaceAll('♯','#')
    .replace(/(maj13|maj11|maj9|maj7|add13|add11|add9|sus2|sus4|13|11|9|7)$/i,'')
    .replace(/°|ø|dim/gi,'');
}

export function canonicalRomanFamily(roman=[]){
  return (roman||[]).map(stripRomanColor).join('-');
}

function rotations(items=[]){
  if(!items.length)return [];
  return items.map((_,index)=>[...items.slice(index),...items.slice(0,index)]);
}

function sameFamily(a=[],b=[]){
  const aa=(a||[]).map(stripRomanColor);const bb=(b||[]).map(stripRomanColor);
  if(aa.length!==bb.length)return false;
  const target=bb.join('-');
  return rotations(aa).some(item=>item.join('-')===target);
}

export const MODERN_HARMONIC_RELATIVES=[
  {
    id:'modern-beele-si-te-pillara',title:'Si Te Pillara',artist:'Beéle',year:2025,
    roman:['IV','V','vi','V'],displayChords:'Bb – C – Dm – C',tempoNote:'~100 BPM / source transcriptions may display double-time',
    tags:['#Afropop','#LatinAfro','#Commercial','#Warm'],
    evidenceClass:'community-harmonic-transcription',confidence:0.74,
    sourceName:'Chordify',sourceUrl:'https://chordify.net/chords/beele-songs/si-te-pillara-chords',
    note:'Useful contemporary relative for the 4–5–6–5 family. Community transcription, so it is shown as a modern relative rather than upgraded to the verified historical corpus.'
  },
  {
    id:'modern-burna-last-last',title:'Last Last',artist:'Burna Boy',year:2022,
    roman:['i','iv'],displayChords:'Fm – Bbm7',tempoNote:'88 BPM in one Chordify transcription',
    tags:['#Afrobeats','#Afropop','#MinimalHarmony','#Pocket'],
    evidenceClass:'community-harmonic-transcription',confidence:0.76,
    sourceName:'Chordify',sourceUrl:'https://chordify.net/es/chords/burna-boy-songs/last-last-chords',
    note:'Modern evidence that extremely simple harmonic DNA can feel current when pocket, vocal phrasing and production carry the movement.'
  },
  {
    id:'modern-victony-soweto',title:'Soweto',artist:'Victony',year:2022,
    roman:['iv','i','bVI','bVII'],displayChords:'Fm – Cm – Dbmaj7 – Eb',tempoNote:'103 BPM in Chordify transcription',
    tags:['#Afrobeats','#Afropop','#Modern','#OpenColor'],
    evidenceClass:'community-harmonic-transcription',confidence:0.72,
    sourceName:'Chordify',sourceUrl:'https://chordify.net/chords/soweto-victony-topic',
    note:'Contemporary Afrobeat relative with a compact four-chord cycle and selective maj7 color rather than dense jazz voicing.'
  },
  {
    id:'modern-tems-free-mind',title:'Free Mind',artist:'Tems',year:2020,
    roman:['i','v','iv','v'],displayChords:'minor-center cycle with m7 colors',tempoNote:'multiple transcriptions disagree on absolute BPM; harmonic family is the useful signal here',
    tags:['#Afropop','#RnB','#Intimate','#Soulful'],
    evidenceClass:'cross-source-community-transcription',confidence:0.70,
    sourceName:'Cifra Club / LaMucal',sourceUrl:'https://www.cifraclub.com/tems/free-mind/',
    note:'Used as a modern performance/harmonic relative, not as a replacement for the verified hit corpus.'
  },
  {
    id:'modern-elena-caracas',title:'Caracas en el 2000',artist:'Elena Rose, Danny Ocean & Jerry Di',year:2023,
    roman:['IV','V','iii','ii'],displayChords:'Gmaj7 – A – F#m7 – Em7',tempoNote:'118 BPM in LaMucal',
    tags:['#LatinPop','#AfroLatin','#Warm','#ModernColor'],
    evidenceClass:'community-harmonic-transcription',confidence:0.73,
    sourceName:'LaMucal',sourceUrl:'https://lamucal.com/es/chords/elena-rose-danny-ocean-jerry-d/caracas-en-el-2000-642757',
    note:'Shows a current Latin-pop loop where sevenths color a four-center commercial cycle without turning the arrangement into jazz.'
  },
  {
    id:'modern-kapo-ohnana',title:'Ohnana',artist:'Kapo',year:2024,
    roman:['VI','i','VII'],displayChords:'A – C#m – B in a C# minor-centered transcription',tempoNote:'contemporary Latin-Afro reference',
    tags:['#LatinAfro','#Afropop','#Romantic','#Commercial'],
    evidenceClass:'community-harmonic-transcription',confidence:0.68,
    sourceName:'Cifra Club',sourceUrl:'https://www.cifraclub.com/sr-kapo/ohnana/',
    note:'Kept as a contemporary relative/reference lens; not promoted to verified harmonic-corpus status.'
  }
];

export const MODERN_PERFORMANCE_LENS={
  label:'Historical DNA · Modern Execution',
  references:['Daramola','Elena Rose','Kapo','Beéle','Burna Boy','Victony','Tems'],
  note:'These names guide present-day Afro/Latin/Afropop/R&B performance language. They are not claims that every generated progression was taken from these artists.'
};

export function findModernRelatives(roman=[],{limit=3}={}){
  const exact=[];const looser=[];
  for(const item of MODERN_HARMONIC_RELATIVES){
    if(sameFamily(roman,item.roman))exact.push({...item,matchType:'same-family-or-rotation'});
    else{
      const a=new Set((roman||[]).map(stripRomanColor));const b=new Set(item.roman.map(stripRomanColor));
      const overlap=[...a].filter(x=>b.has(x)).length/Math.max(1,Math.max(a.size,b.size));
      if(overlap>=0.66)looser.push({...item,matchType:'functional-overlap',overlap});
    }
  }
  return [...exact,...looser.sort((a,b)=>(b.overlap||0)-(a.overlap||0))].slice(0,limit);
}

export function buildLineageSummary(result){
  const modernRelatives=findModernRelatives(result?.roman||[],{limit:3});
  return {
    version:1,
    historicalSourceIds:[...(result?.evidenceSummary?.supportedSongIds||[])],
    modernRelatives,
    performanceLens:MODERN_PERFORMANCE_LENS,
    policy:'Historical evidence remains provenance. Modern relatives are separately labeled unless they meet the stronger verified-corpus standard.'
  };
}
