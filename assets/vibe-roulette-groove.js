const DEGREE_MAP = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7 };

export const AFROBEATS_PRACTITIONER_PATTERNS = [
  [4,5,6,5],
  [2,3],
  [4,3,6,5],
  [6,3,4,5],
  [4,5,6]
];

const MODERN_AFRO_COMMERCIAL_PATTERNS = [
  ...AFROBEATS_PRACTITIONER_PATTERNS,
  [1,4],
  [6,4],
  [1,5,6,4],
  [6,4,1,5],
  [1,6,4,5],
  [4,1,5,6]
];

function cleanRoman(token = '') {
  return String(token)
    .replaceAll('♭','b')
    .replaceAll('♯','#')
    .replace(/^[b#]+/, '')
    .replace(/[^ivIV]/g, '')
    .toUpperCase();
}

export function romanDegrees(roman = []) {
  return roman.map(token => DEGREE_MAP[cleanRoman(token)] || null);
}

function matchesPatternList(roman=[],patterns=[]){
  const degrees=romanDegrees(roman);
  return patterns.some(pattern=>pattern.length===degrees.length&&pattern.every((degree,index)=>degree===degrees[index]));
}

export function matchesAfrobeatsPractitionerPattern(roman = []) {
  return matchesPatternList(roman,AFROBEATS_PRACTITIONER_PATTERNS);
}

export function commercialProgressionWeight(roman = []) {
  const count = roman.length;
  let weight=1;
  if (count === 4) weight*=1.22;
  else if (count === 2 || count === 3) weight*=1.12;
  else if (count === 5) weight*=0.80;
  else if (count >= 6) weight*=0.64;

  if(matchesPatternList(roman,MODERN_AFRO_COMMERCIAL_PATTERNS))weight*=1.24;
  if(matchesAfrobeatsPractitionerPattern(roman))weight*=1.12;

  const alteredCount=roman.filter(token=>/[b#♭♯]|dim|°|ø|aug|\+|\//i.test(String(token))).length;
  if(alteredCount)weight*=Math.max(0.62,1-alteredCount*0.12);
  return weight;
}

export function afroTropicalStyleWeight(styleAffinity = []) {
  const styles = styleAffinity.map(value => String(value).toLowerCase());
  const primaryTerms = ['afro','afropop','afrobeats','latin','tropical','caribbean','merengue','reggaeton','reggaetón'];
  const adjacentTerms = ['rnb','r&b','soul','funk','pop'];
  const primary=styles.some(style => primaryTerms.some(term => style.includes(term)));
  const adjacent=styles.some(style => adjacentTerms.some(term => style.includes(term)));
  const jazzOnly=styles.length>0&&styles.every(style=>/jazz|fusion|classical|gospel/.test(style));
  if(primary)return 1.28;
  if(adjacent)return 1.10;
  if(jazzOnly)return 0.72;
  return 0.92;
}

export function buildCommercialFourBarPlan(chords, { bars = 4, beatsPerBar = 4 } = {}) {
  const clean = (chords || []).map(String).filter(Boolean);
  if (!clean.length) throw new Error('A progression needs at least one chord.');
  const totalBeats = bars * beatsPerBar;
  if (bars !== 4 || beatsPerBar !== 4) {
    const beatsPerChord = totalBeats / clean.length;
    let cursor = 0;
    return clean.map((chord, index) => {
      const item = { chord, beats: beatsPerChord, startBeat: cursor, index };
      cursor += beatsPerChord;
      return item;
    });
  }

  const durations = [];
  if (clean.length <= 4) {
    const baseBars = Math.floor(4 / clean.length);
    const extraBars = 4 - baseBars * clean.length;
    for (let i = 0; i < clean.length; i += 1) {
      durations.push((baseBars + (i >= clean.length - extraBars ? 1 : 0)) * 4);
    }
  } else if (clean.length <= 8) {
    const fullBarChords = 8 - clean.length;
    for (let i = 0; i < clean.length; i += 1) durations.push(i < fullBarChords ? 4 : 2);
  } else {
    const beatsPerChord = totalBeats / clean.length;
    for (let i = 0; i < clean.length; i += 1) durations.push(beatsPerChord);
  }

  let cursor = 0;
  return clean.map((chord, index) => {
    const beats = durations[index];
    const item = {
      chord,
      beats,
      startBeat: cursor,
      index,
      bar: Math.floor(cursor / 4) + 1,
      beatInBar: (cursor % 4) + 1,
      sharesBar: beats < 4
    };
    cursor += beats;
    return item;
  });
}

export function formatCommercialFourBarPlan(chords = []) {
  const plan = buildCommercialFourBarPlan(chords);
  const bars = [[],[],[],[]];
  for (const item of plan) {
    const barIndex = Math.min(3, Math.floor(item.startBeat / 4));
    bars[barIndex].push(item.chord);
  }
  return bars.map(items => items.join(' → ') || '—');
}
