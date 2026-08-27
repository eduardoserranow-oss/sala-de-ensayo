const DEGREE_MAP = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7 };

export const AFROBEATS_PRACTITIONER_PATTERNS = [
  [4,5,6,5],
  [2,3],
  [4,3,6,5],
  [6,3,4,5],
  [4,5,6]
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

export function matchesAfrobeatsPractitionerPattern(roman = []) {
  const degrees = romanDegrees(roman);
  return AFROBEATS_PRACTITIONER_PATTERNS.some(pattern =>
    pattern.length === degrees.length && pattern.every((degree, index) => degree === degrees[index])
  );
}

export function commercialProgressionWeight(roman = []) {
  const count = roman.length;
  if (count === 4) return 1.18;
  if (count === 2 || count === 3) return 1.07;
  if (count === 5) return 0.92;
  if (count >= 6) return 0.82;
  return 1;
}

export function afroTropicalStyleWeight(styleAffinity = []) {
  const styles = styleAffinity.map(value => String(value).toLowerCase());
  const targetTerms = ['afro','afropop','afrobeats','latin','tropical','merengue','reggaeton','reggaetón','rnb','soul','funk'];
  return styles.some(style => targetTerms.some(term => style.includes(term))) ? 1.10 : 1;
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
