// FORTISSIMO Reference Authority seed corpus.
// Purpose: prioritize established/mainstream artists *after* Cyanite acoustic matching.
// This is intentionally genre-aware: fame never creates a match by itself.

const A = 1.0, B = 0.62;

export const AUTHORITY_BY_GENRE = {
  "latin trap": {
    A: ["bad bunny","anuel aa","eladio carrion","myke towers","arcangel","bryant myers","jon z","noriel","ozuna","rauw alejandro"],
    B: ["roa","omar courtz","dei v","young miko","lunay","jhayco","brray","alvaro diaz"]
  },
  reggaeton: {
    A: ["bad bunny","daddy yankee","don omar","j balvin","karol g","ozuna","rauw alejandro","wisin","yandel","nicky jam","maluma","feid","myke towers"],
    B: ["jhayco","sech","mora","young miko","dei v","omar courtz","rauw","lenny tavarez","justin quiles"]
  },
  bachata: {
    A: ["romeo santos","aventura","prince royce","juan luis guerra","monchy y alexandra","frank reyes","zacarías ferreira","zacarias ferreira","raulin rodriguez"],
    B: ["elvis martinez","luis miguel del amargue","hector acosta","kiko rodriguez","dani j","pinto picasso"]
  },
  salsa: {
    A: ["marc anthony","hector lavoe","willie colon","ruben blades","celia cruz","grupo niche","frankie ruiz","gilberto santa rosa","victor manuelle","el gran combo","fania all stars"],
    B: ["la india","tito nieves","jerry rivera","oscar d'leon","eddie santiago","rey ruiz"]
  },
  merengue: {
    A: ["juan luis guerra","fernando villalona","sergio vargas","eddy herrera","toño rosario","tono rosario","los hermanos rosario","milly quezada","elvis crespo"],
    B: ["jossie esteban","ramon orlando","kinito mendez","oro solido"]
  },
  "afrobeats": {
    A: ["burna boy","wizkid","davido","rema","tems","asake","ayra starr","tyla"],
    B: ["fireboy dml","ckay","oxlade","victony","omah lay","joeboy"]
  },
  trap: {
    A: ["drake","travis scott","future","21 savage","lil baby","metro boomin","kendrick lamar","playboi carti","gunna"],
    B: ["don toliver","lil durk","young thug","offset","quavo","lil uzi vert"]
  },
  "r&b": {
    A: ["the weeknd","sza","chris brown","usher","beyonce","bruno mars","frank ocean","summer walker"],
    B: ["giveon","brent faiyaz","victoria monet","coco jones","partynextdoor"]
  },
  pop: {
    A: ["taylor swift","the weeknd","bruno mars","dua lipa","ariana grande","billie eilish","lady gaga","justin bieber","sabrina carpenter","olivia rodrigo"],
    B: ["tate mcrae","benson boone","doja cat","charli xcx","chappell roan"]
  }
};

function fold(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function genreKeys(dna = {}) {
  const text = fold([...(dna.genres || []), ...(dna.subgenres || []), dna.freeGenre || ""].join(" "));
  const keys = [];
  if (/latin.*trap|trap.*latin|urbano.*trap/.test(text)) keys.push("latin trap");
  if (/reggaeton|reggaet[oó]n|urbano latino/.test(text)) keys.push("reggaeton");
  if (/bachata/.test(text)) keys.push("bachata");
  if (/salsa/.test(text)) keys.push("salsa");
  if (/merengue/.test(text)) keys.push("merengue");
  if (/afrobeat|afrobeats|afropop/.test(text)) keys.push("afrobeats");
  if (/r&b|rnb|rhythm and blues/.test(text)) keys.push("r&b");
  if (/\btrap\b/.test(text)) keys.push("trap");
  if (/\bpop\b/.test(text)) keys.push("pop");
  return [...new Set(keys)];
}

export function authorityForCandidate(title, dna = {}) {
  const haystack = ` ${fold(title)} `;
  let best = { score: 0, tier: "C", artist: null, genre: null };
  for (const genre of genreKeys(dna)) {
    const group = AUTHORITY_BY_GENRE[genre];
    if (!group) continue;
    for (const [tier, score] of [["A", A], ["B", B]]) {
      for (const artist of group[tier] || []) {
        const needle = fold(artist);
        if (haystack.includes(needle) && score > best.score) best = { score, tier, artist, genre };
      }
    }
  }
  return best;
}

export function authorityGenres(dna = {}) { return genreKeys(dna); }
