(function(){
  "use strict";

  const CORE_URL="assets/sound-gym-level3-phase3.js?v=sg-bm-core3";
  const MANIFEST_VERSION="bm-rotation3";
  const HISTORY_KEY="fortissimo.soundGym.balanceMemory.rotation.v3";
  const SESSION_SIZE=5;

  const GROUPS={
    "esto-no-se-llama-amor":"original",
    "gimme-dat-love":"original",
    "bm-p4-01":"urban",
    "bm-p4-02":"urban",
    "bm-p4-03":"hiphop",
    "bm-p4-04":"pop-rnb",
    "bm-p4-05":"salsa",
    "bm-p4-06":"urban",
    "bm-p6-06":"afro",
    "bm-p6-07":"salsa",
    "bm-p6-08":"salsa",
    "bm-p6-09":"hiphop",
    "bm-p6-10":"urban",
    "bm-p7-01":"funk-pop",
    "bm-p7-02":"urban",
    "bm-p7-03":"tropical"
  };

  function replacementDeckFunction(){
    return `function buildSetDeck(){
    const allSets=(stemManifest.sets||[]).filter(set=>set&&set.id&&set.id!=="alefu");
    const historyKey="${HISTORY_KEY}";
    let history=[];
    try{const parsed=JSON.parse(localStorage.getItem(historyKey)||"[]");if(Array.isArray(parsed))history=parsed.filter(Array.isArray).slice(-2);}catch(_){history=[];}
    const blocked=new Set(history.flat());
    let pool=allSets.filter(set=>!blocked.has(set.id));
    if(pool.length<STAGE_TOTAL){
      const lastSession=new Set(history.length?history[history.length-1]:[]);
      pool=allSets.filter(set=>!lastSession.has(set.id));
    }
    if(pool.length<STAGE_TOTAL)pool=allSets.slice();
    const groupMap=${JSON.stringify(GROUPS)};
    const buckets={};
    shuffle(pool).forEach(set=>{const group=groupMap[set.id]||"other";(buckets[group]||(buckets[group]=[])).push(set);});
    const groupOrder=shuffle(Object.keys(buckets));
    const picked=[];
    while(picked.length<STAGE_TOTAL){
      let added=false;
      for(const group of groupOrder){
        const bucket=buckets[group];
        if(bucket&&bucket.length&&picked.length<STAGE_TOTAL){picked.push(bucket.shift());added=true;}
      }
      if(!added)break;
    }
    if(picked.length<STAGE_TOTAL){
      for(const set of shuffle(pool)){
        if(picked.length>=STAGE_TOTAL)break;
        if(!picked.some(item=>item.id===set.id))picked.push(set);
      }
    }
    const nextHistory=[...history,picked.map(set=>set.id)].slice(-3);
    try{localStorage.setItem(historyKey,JSON.stringify(nextHistory));}catch(_){ }
    return picked;
  }`;
  }

  async function boot(){
    try{
      const response=await fetch(CORE_URL,{cache:"no-store"});
      if(!response.ok)throw new Error(`Balance Memory core ${response.status}`);
      let source=await response.text();

      const deckPattern=/function buildSetDeck\(\)\{[^\n]*\}\n  function pickSet\(\)/;
      if(!deckPattern.test(source))throw new Error("Balance Memory deck hook not found");

      source=source
        .replace('const STEM_MANIFEST_URL="assets/stem-sets.json";',`const STEM_MANIFEST_URL="assets/stem-sets.json?v=${MANIFEST_VERSION}";`)
        .replace("const STAGE_TOTAL=6;",`const STAGE_TOTAL=${SESSION_SIZE};`)
        .replace("1 / 6","1 / 5")
        .replace('fetch(STEM_MANIFEST_URL,{cache:"force-cache"})','fetch(STEM_MANIFEST_URL,{cache:"no-store"})')
        .replace(deckPattern,`${replacementDeckFunction()}\n  function pickSet()`);

      (0,eval)(`${source}\n//# sourceURL=sound-gym-level3-phase3-rotated.js`);
    }catch(error){
      console.error("Balance Memory rotation boot failed",error);
      const toast=document.getElementById("sgToast");
      if(toast){toast.textContent="No se pudo cargar Balance Memory.";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2600);}
    }
  }

  boot();
})();
