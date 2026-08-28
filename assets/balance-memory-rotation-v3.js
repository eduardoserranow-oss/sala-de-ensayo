(function(){
  "use strict";

  const CORE_URL="assets/sound-gym-level3-phase3.js?v=sg-bm-core4";
  const MANIFEST_VERSION="bm-master-reference4";
  const HISTORY_KEY="fortissimo.soundGym.balanceMemory.rotation.v4";
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

  function replacementBeginStage(){
    return `  async function beginStage(number){
    stopAudio();clearMemoryTimers();state.stage=number;state.phase="loading";state.revealed=false;state.set=pickSet();
    state.targetDb=flatLevels(0);state.userDb=flatLevels(-12);state.scrambleRmse=0;state.calibrationDb=flatLevels(0);renderStage();
    const loaded=await Promise.all([loadSetBuffers(state.set),decodeFullMix(state.set)]);if(state.stage!==number)return;
    stageBuffers=loaded[0];
    state.calibrationDb=buildStemCalibration(stageBuffers);
    state.targetDb=Object.fromEntries(ROLES.map(role=>[role,Math.round((-state.calibrationDb[role])*10)/10]));
    renderStage();
    await startReferenceAudio(loaded[1]);if(state.stage!==number)return;
    state.phase="memory";state.memoryStartedAt=performance.now();renderStagePhase();beginMemoryWindow();
  }

  function renderStage(){`;
  }

  function replacementEnterEditing(){
    return `  async function enterEditing(){
    if(state.phase!=="memory")return;
    clearMemoryTimers();
    const startButton=trainer.querySelector("[data-bm-start]");if(startButton)startButton.disabled=true;
    const scrambled=scrambleBalance(state.targetDb,state.stage);
    state.userDb=scrambled;state.scrambleRmse=relativeRmse(state.targetDb,scrambled);state.phase="loading";
    ROLES.forEach(role=>setFaderUI(role,state.userDb[role]));
    stopAudio();
    if(!stageBuffers)throw new Error("No se cargaron los stems de esta canción.");
    await startStemAudio(stageBuffers,state.userDb);
    state.phase="editing";state.decisionStartedAt=performance.now();renderStagePhase();
    const consoleEl=trainer.querySelector("[data-bm-console]");consoleEl.classList.add("is-scrambling");setTimeout(()=>consoleEl.classList.remove("is-scrambling"),420);
    trainer.querySelector("[data-bm-confirm]").disabled=false;
    updateCoach("Ahora escuchas los stems separados. Reconstruye el balance que acabas de oír en el master original.");
  }

  async function getContext()`;
  }

  function stemHelpers(){
    return `  async function loadSetBuffers(set){const pairs=await Promise.all(ROLES.map(async role=>[role,await decodeStem(set,role)]));return Object.fromEntries(pairs);}

  async function decodeFullMix(set){
    const file=set?.fullMix;if(!file)throw new Error("Falta el master original de esta canción.");
    const key=\`${'${set.id}'}:fullMix\`;if(decoded.has(key))return decoded.get(key);
    const context=await getContext(),bytes=await fetchStemBytes(file),buffer=await context.decodeAudioData(bytes.slice(0));decoded.set(key,buffer);return buffer;
  }

  function stemRmsDb(buffer){
    if(!buffer||!buffer.length)return -60;
    const step=24;let sum=0,count=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++){
      const data=buffer.getChannelData(ch);
      for(let i=0;i<data.length;i+=step){const v=data[i];sum+=v*v;count++;}
    }
    const rms=Math.sqrt(sum/Math.max(1,count));return 20*Math.log10(Math.max(rms,1e-5));
  }

  function buildStemCalibration(buffers){
    const measured=Object.fromEntries(ROLES.map(role=>[role,stemRmsDb(buffers[role])]));
    const sorted=ROLES.map(role=>measured[role]).sort((a,b)=>a-b);
    const reference=(sorted[1]+sorted[2])/2;
    return Object.fromEntries(ROLES.map(role=>[role,Math.round(clamp(reference-measured[role],-10,10)*10)/10]));
  }

  async function startReferenceAudio(buffer){
    stopAudio();const context=await getContext(),token=++sourceToken;masterGain=context.createGain();masterGain.gain.value=1;masterGain.connect(context.destination);
    const src=context.createBufferSource(),duration=Math.min(buffer?.duration||24,state.set?.durationSeconds||24),when=context.currentTime+.06;
    src.buffer=buffer;src.loop=true;src.loopStart=0;src.loopEnd=Math.max(.5,duration);src.connect(masterGain);src.onended=()=>{if(token!==sourceToken)return;sources.delete("__master__");};src.start(when,0);sources.set("__master__",src);
  }`;
  }

  async function boot(){
    try{
      const response=await fetch(CORE_URL,{cache:"no-store"});
      if(!response.ok)throw new Error(`Balance Memory core ${response.status}`);
      let source=await response.text();

      const deckPattern=/function buildSetDeck\(\)\{[^\n]*\}\n  function pickSet\(\)/;
      const beginPattern=/  async function beginStage\(number\)\{[\s\S]*?\n  \}\n\n  function renderStage\(\)\{/;
      const enterPattern=/  function enterEditing\(\)\{[\s\S]*?\n  \}\n\n  async function getContext\(\)/;
      const loadBuffersPattern=/  async function loadSetBuffers\(set\)\{const pairs=await Promise\.all\(ROLES\.map\(async role=>\[role,await decodeStem\(set,role\)\]\)\);return Object\.fromEntries\(pairs\);\}/;

      if(!deckPattern.test(source))throw new Error("Balance Memory deck hook not found");
      if(!beginPattern.test(source))throw new Error("Balance Memory begin-stage hook not found");
      if(!enterPattern.test(source))throw new Error("Balance Memory edit hook not found");
      if(!loadBuffersPattern.test(source))throw new Error("Balance Memory buffer hook not found");

      source=source
        .replace('const STEM_MANIFEST_URL="assets/stem-sets.json";',`const STEM_MANIFEST_URL="assets/stem-sets.json?v=${MANIFEST_VERSION}";`)
        .replace("const STAGE_TOTAL=6;",`const STAGE_TOTAL=${SESSION_SIZE};`)
        .replace("let state=freshState();","let state=freshState();\n  let stageBuffers=null;")
        .replace("1 / 6","1 / 5")
        .replace('fetch(STEM_MANIFEST_URL,{cache:"force-cache"})','fetch(STEM_MANIFEST_URL,{cache:"no-store"})')
        .replace(deckPattern,`${replacementDeckFunction()}\n  function pickSet()`)
        .replace(beginPattern,replacementBeginStage())
        .replace(enterPattern,replacementEnterEditing())
        .replace(loadBuffersPattern,stemHelpers())
        .replace("gain.gain.value=dbToGain(levels[role]);","gain.gain.value=dbToGain((state.calibrationDb?.[role]||0)+levels[role]);")
        .replace("param.exponentialRampToValueAtTime(Math.max(dbToGain(levels[role]),.0001),now+duration);","param.exponentialRampToValueAtTime(Math.max(dbToGain((state.calibrationDb?.[role]||0)+levels[role]),.0001),now+duration);")
        .replace("param.setTargetAtTime(dbToGain(db),now,.018);","param.setTargetAtTime(dbToGain((state.calibrationDb?.[role]||0)+db),now,.018);")
        .replace("Esta es la mezcla correcta. Memoriza qué tan adelante o atrás está cada elemento.","Este es el master original de la canción. Memoriza qué tan adelante o atrás está cada elemento.")
        .replace("Escucha la referencia correcta. Cuando pulses Start mixing, el juego cambiará drásticamente el balance.","Escucha el master original de la canción. Cuando pulses Start mixing, pasarás a los stems separados y el balance será alterado.");

      (0,eval)(`${source}\n//# sourceURL=sound-gym-level3-phase3-master-reference.js`);
    }catch(error){
      console.error("Balance Memory master-reference boot failed",error);
      const toast=document.getElementById("sgToast");
      if(toast){toast.textContent="No se pudo cargar Balance Memory.";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2600);}
    }
  }

  boot();
})();