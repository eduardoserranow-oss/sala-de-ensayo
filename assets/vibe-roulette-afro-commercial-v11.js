const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const DEGREE_MAP={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7};

function cleanRoman(token=''){
  return String(token).replaceAll('♭','b').replaceAll('♯','#').replace(/^[b#]+/,'').replace(/[^ivIV]/g,'').toUpperCase();
}
function degree(token){return DEGREE_MAP[cleanRoman(token)]||null;}
function styleTokens(styleAffinity=[]){return styleAffinity.map(v=>String(v).toLowerCase());}

export function harmonicComplexityScore(roman=[]){
  if(!roman.length)return 0;
  let score=0;
  for(const token0 of roman){
    const token=String(token0);
    if(/[b#♭♯]/.test(token))score+=0.14;
    if(/\//.test(token))score+=0.14;
    if(/dim|°|ø|aug|\+/.test(token))score+=0.2;
    if(/(?:maj7|m7|add9|sus2|sus4|7|9)/i.test(token))score+=0.08;
    if(/(?:11|13|#|b)(?:5|9|11|13)/i.test(token))score+=0.2;
  }
  if(roman.length>4)score+=(roman.length-4)*0.12;
  return clamp(score/Math.max(1,roman.length),0,1);
}

export function performanceComplexityBudget(roman=[]){
  const harmonic=harmonicComplexityScore(roman);
  return {harmonic,performance:clamp(0.95-harmonic*0.62,0.34,0.95)};
}

export function afroCommercialGateWeight(item={}){
  const roman=item.roman||[];
  const degrees=roman.map(degree).filter(Boolean);
  const styles=styleTokens(item.styleAffinity||[]);
  let weight=1;

  if(roman.length===4)weight*=1.18;
  else if(roman.length===2||roman.length===3)weight*=1.11;
  else if(roman.length===5)weight*=0.82;
  else if(roman.length>=6)weight*=0.66;

  const exactPatterns=[
    [4,5,6,5],[4,3,6,5],[6,3,4,5],[4,5,6],[2,3],
    [1,4],[6,4],[1,5,6,4],[6,4,1,5],[1,6,4,5],[4,1,5,6]
  ];
  if(exactPatterns.some(pattern=>pattern.length===degrees.length&&pattern.every((d,i)=>d===degrees[i])))weight*=1.34;

  const target=['afro','afropop','afrobeats','latin','tropical','caribbean','reggaeton','reggaetón','rnb','soul','funk','pop'];
  const direct=styles.some(style=>target.some(term=>style.includes(term)));
  const jazzOnly=styles.length&&styles.every(style=>/jazz|fusion|classical|gospel/.test(style));
  if(direct)weight*=1.20;
  if(jazzOnly)weight*=0.72;

  const complexity=harmonicComplexityScore(roman);
  weight*=1-complexity*0.34;
  return clamp(weight,0.42,1.72);
}

export function shouldAllowFunctionalTurnaround({roman=[],seedValue=0.5}={}){
  const complexity=harmonicComplexityScore(roman);
  if(roman.length>4)return false;
  if(complexity>0.34)return false;
  return seedValue<0.10;
}

export const AFRO_COMMERCIAL_DISCIPLINE_INFO={
  version:'1.1',
  principle:'Neo-Soul is how the pianist plays. Afro/Afropop is what we are writing.',
  aPrimePolicy:{phrasingOnly:0.70,colorOnly:0.20,functionalTurnaroundMax:0.10}
};
