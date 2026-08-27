import { suggestedTempoRangeForEnergy } from './vibe-roulette-tempo-v2.js';

const STORY_STORAGE_KEY='fortissimo.vibeRoulette.storyProfile.v1';

function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }
function normalize(text=''){
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9ñ'\s-]/g,' ').replace(/\s+/g,' ').trim();
}
function countMatches(text,terms=[]){
  let score=0;
  for(const term of terms){
    if(typeof term==='string'){
      if(text.includes(normalize(term))) score+=1;
    }else if(term?.phrase && text.includes(normalize(term.phrase))){
      score+=Number(term.weight||1);
    }
  }
  return score;
}

const TERRITORIES={
  illusion:{
    base:1,
    terms:['aparece','aparecio','conocer','conoci','comienza','comenzo','nuevo','nueva','posibilidad','futuro','descubrir','descubrio','coincidir','coincidencia','camino','ilusion','esperanza','imaginar','sonar','deseo','quiero que pase','primera vez','todo cambia','empieza','inicio','before her','appears','possibility','new beginning','future','hope','wonder']
  },
  nostalgia:{
    base:1,
    terms:['antes','recuerdo','recordar','foto','fotografia','pasado','extrano','extrañar','volver','regresar','olvidar','olvido','desaparecio','ghost','ghosted','ya no','lo que fuimos','me acorde','memoria','lejos','perdi','perder','nostalgia','yesterday','memory','miss you','past','gone','used to','remember']
  },
  connection:{
    base:1,
    terms:['juntos','juntas','amigos','amigas','solo amigos','conexion','conexión','comparten','hablan','parejas','ambos sienten','ninguno reconoce','mirada','beso','besos','piel','tocarnos','cercania','cercanía','intimidad','complicidad','quedate','quédate','contigo','nosotros','entre los dos','solo nosotros','friends','connection','together','both feel','unspoken','chemistry','kiss','touch','close','intimate']
  }
};

const SIGNALS=[
  {id:'romantic-tension',label:'Romantic tension',tag:'#RomanticTension',terms:['solo amigos','ambos sienten','ninguno reconoce','no lo admite','no lo decimos','tension','tensión','quimica','química','miradas','friends but','unspoken','both feel','chemistry'],energy:0.05,bias:0},
  {id:'intimate',label:'Intimate',tag:'#Intimate',terms:['intimidad','intimo','íntimo','cerca','cercania','cercanía','secreto','en privado','solo nosotros','cuarto','habitacion','habitación','intimate','close','private','between us'],energy:-0.04,bias:-3},
  {id:'sensual',label:'Sensual',tag:'#Sensual',terms:['sensual','piel','beso','besos','tocarnos','tocar','cuerpo','deseo','sexo','sexual','labios','cama','sensuality','skin','kiss','body','desire'],energy:0.04,bias:-2},
  {id:'playful',label:'Playful / Picardía',tag:'#Playful',terms:['picardia','picardía','coqueteo','coquetear','juego','jugar','travieso','atrevido','atrevida','vacilon','vacilón','flirt','playful','tease'],energy:0.12,bias:3},
  {id:'summer',label:'Summer',tag:'#Summer',terms:['verano','calor','sol','sunset','atardecer','summer','heat','sun'],energy:0.10,bias:3},
  {id:'beach',label:'Beach',tag:'#Beach',terms:['playa','arena','mar','oceano','océano','costa','beach','ocean','sea','sand'],energy:0.08,bias:2},
  {id:'tropical',label:'Tropical',tag:'#Tropical',terms:['tropical','caribe','caribeno','caribeño','isla','palmas','afrobeat','afrobeats','afropop','merengue','dancehall','caribbean'],energy:0.08,bias:4},
  {id:'warm',label:'Warm',tag:'#Warm',terms:['calido','cálido','calidez','abrazo','hogar','seguro','segura','ternura','suave','warm','hug','safe','tender'],energy:-0.01,bias:-1},
  {id:'mystery',label:'Mystery',tag:'#Mystery',terms:['misterio','misterioso','secreto','no sabe','no sabemos','incierto','oculto','noche','mystery','secret','unknown','uncertain'],energy:0.01,bias:-1},
  {id:'freedom',label:'Freedom',tag:'#Freedom',terms:['libertad','libre','fluir','fluyendo','viaje','viajar','carretera','escapar','freedom','free','flow','road','travel'],energy:0.09,bias:3},
  {id:'vulnerable',label:'Vulnerable',tag:'#Vulnerable',terms:['vulnerable','miedo','herida','llorar','fragil','frágil','confesar','no me atrevo','afraid','hurt','cry','fragile','confess'],energy:-0.10,bias:-4},
  {id:'melancholic',label:'Melancholic',tag:'#Melancholic',terms:['melancolia','melancolía','triste','soledad','vacio','vacío','duelo','dolor','sad','lonely','empty','grief'],energy:-0.09,bias:-4},
  {id:'hopeful',label:'Hopeful',tag:'#Hopeful',terms:['esperanza','ojala','ojalá','puede pasar','quizas','quizás','tal vez','hope','maybe','perhaps','could happen'],energy:0.05,bias:1},
  {id:'night',label:'Night',tag:'#Night',terms:['noche','madrugada','luna','luces','after','club','night','midnight','moon'],energy:0.02,bias:0}
];

const BASE_TAGS=['#Afropop','#AfroTropical','#Commercial'];

function harmonicIntentFrom(profile){
  const ids=new Set(profile.vibeSignals.map(item=>item.id));
  if(ids.has('romantic-tension')) return 'Warm unresolved loop · restrained tension · singing top voice · selective color';
  if(ids.has('playful')||ids.has('summer')||ids.has('beach')) return 'Open commercial loop · rhythmic pocket · bright-but-soft color · clear return home';
  if(ids.has('vulnerable')||ids.has('melancholic')) return 'Spacious loop · emotional common tones · gentle A′ variation · avoid over-harmonizing';
  if(profile.primaryTerritory==='illusion') return 'Forward-moving loop · open voicings · lift without jazz density';
  if(profile.primaryTerritory==='nostalgia') return 'Bittersweet commercial loop · active nostalgia · soft tension back to bar 1';
  return 'Intimate commercial loop · warm voice leading · subtle second-pass evolution';
}

export function analyzeStoryLocally(text,{title=''}={}){
  const combined=normalize(`${title} ${text}`);
  const territoryScores={};
  for(const [id,config] of Object.entries(TERRITORIES)){
    territoryScores[id]=config.base+countMatches(combined,config.terms);
  }

  // Phrase-level context matters more than isolated words.
  if(combined.includes('solo amigos')) territoryScores.connection+=4;
  if(combined.includes('ambos sienten')) territoryScores.connection+=3;
  if(combined.includes('ninguno reconoce')||combined.includes('ninguno admite')) territoryScores.connection+=3;
  if(combined.includes('todo cambia')) territoryScores.illusion+=2.5;
  if(combined.includes('me tope con tu foto')||combined.includes('me encontre tu foto')) territoryScores.nostalgia+=5;

  const ranked=Object.entries(territoryScores).sort((a,b)=>b[1]-a[1]);
  const primaryTerritory=ranked[0][0];
  const secondTerritory=ranked[1][0];
  const confidence=clamp((ranked[0][1]-ranked[1][1]+2)/8,0.35,0.96);

  const vibeSignals=SIGNALS.map(signal=>({
    ...signal,
    score:countMatches(combined,signal.terms)
  })).filter(signal=>signal.score>0).sort((a,b)=>b.score-a.score).slice(0,6)
    .map(({terms,...signal})=>signal);

  let energy=primaryTerritory==='illusion'?0.64:primaryTerritory==='nostalgia'?0.48:0.56;
  let tempoBias=0;
  for(const signal of vibeSignals){ energy+=signal.energy*Math.min(1.5,signal.score); tempoBias+=signal.bias*Math.min(1.25,signal.score); }
  energy=clamp(energy,0.18,0.94);
  tempoBias=clamp(tempoBias,-10,12);
  const tempo=suggestedTempoRangeForEnergy(energy,{width:8,bias:tempoBias});
  const tags=[...new Set([...BASE_TAGS,...vibeSignals.map(s=>s.tag),primaryTerritory==='connection'?'#Connection':primaryTerritory==='nostalgia'?'#Nostalgia':'#Illusion'])];

  const profile={
    version:1,
    source:'fortissimo-story-intelligence-v1',
    text:String(text||'').trim(),
    title:String(title||'').trim(),
    primaryTerritory,
    secondaryTerritory:secondTerritory,
    confidence,
    territoryScores,
    vibeSignals,
    energySuggestion:energy,
    tempoSuggestion:tempo,
    harmonicIntent:'',
    tags,
    analyzedAt:new Date().toISOString()
  };
  profile.harmonicIntent=harmonicIntentFrom(profile);
  return profile;
}

export function getActiveStoryProfile(){
  if(typeof window!=='undefined' && window.__FORTISSIMO_VIBE_STORY_PROFILE__) return window.__FORTISSIMO_VIBE_STORY_PROFILE__;
  return null;
}

export function storyAffinityWeight(item,profile=getActiveStoryProfile()){
  if(!profile) return 1;
  const styles=(item?.styleAffinity||[]).map(value=>normalize(value));
  const tags=(profile.tags||[]).map(value=>normalize(value.replace(/^#/,'')));
  let weight=1;
  for(const style of styles){
    if(tags.some(tag=>style.includes(tag)||tag.includes(style))) weight*=1.08;
    if(/afro|latin|tropical|caribbean|pop/.test(style)) weight*=1.035;
  }
  const mood=Number(item?.mood?.[profile.primaryTerritory])||0;
  weight*=0.86+0.28*mood;
  const movement=Number(item?.mood?.movement)||0.5;
  const requested=profile.energySuggestion??0.55;
  weight*=0.90+0.10*(1-Math.abs(movement-requested));
  return clamp(weight,0.72,1.55);
}

export function deriveResultTags(result,profile=getActiveStoryProfile()){
  const styleTags=(result?.styleAffinity||[]).map(value=>`#${String(value).replace(/[^a-z0-9]+/gi,'').replace(/^./,m=>m.toUpperCase())}`).filter(tag=>tag.length>1);
  return [...new Set([...BASE_TAGS,...styleTags,...(profile?.tags||[])])].slice(0,10);
}

function persistProfile(profile){
  if(typeof window==='undefined') return;
  window.__FORTISSIMO_VIBE_STORY_PROFILE__=profile;
  try{localStorage.setItem(STORY_STORAGE_KEY,JSON.stringify(profile));}catch(_){ }
}

function clearProfile(){
  if(typeof window==='undefined') return;
  window.__FORTISSIMO_VIBE_STORY_PROFILE__=null;
  try{localStorage.removeItem(STORY_STORAGE_KEY);}catch(_){ }
}

function restoreProfile(){
  if(typeof window==='undefined') return null;
  try{
    const raw=localStorage.getItem(STORY_STORAGE_KEY);
    const profile=raw?JSON.parse(raw):null;
    if(profile?.version===1){ window.__FORTISSIMO_VIBE_STORY_PROFILE__=profile; return profile; }
  }catch(_){ }
  return null;
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function installStyles(){
  if(document.getElementById('vibe-story-intelligence-styles')) return;
  const style=document.createElement('style');
  style.id='vibe-story-intelligence-styles';
  style.textContent=`
    .story-intel{display:grid;gap:10px;margin-top:2px}.story-intel label{font-size:12px;font-weight:900;letter-spacing:.04em;color:rgba(255,255,255,.78)}
    .story-intel textarea{width:100%;min-height:132px;resize:vertical;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.055);color:#fff;padding:13px 14px;font:500 16px/1.48 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:0;-webkit-text-size-adjust:100%}
    .story-intel textarea:focus{border-color:rgba(255,90,0,.75);box-shadow:0 0 0 3px rgba(255,90,0,.08)}
    .story-intel-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.story-analyze{min-height:42px;border:1px solid rgba(255,90,0,.62);border-radius:999px;background:rgba(255,90,0,.08);color:#ff8a45;padding:0 16px;font-weight:900;cursor:pointer;touch-action:manipulation}.story-analyze:disabled{opacity:.45;cursor:default}
    .story-analysis{display:none;padding:13px 14px;border:1px solid rgba(255,255,255,.10);border-radius:15px;background:rgba(255,255,255,.035)}.story-analysis.show{display:grid;gap:8px}.story-analysis-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.story-analysis-head strong{font-size:14px}.story-analysis-head span{font-size:11px;color:#ff9a5b;font-weight:900}.story-analysis-line{font-size:12px;line-height:1.45;color:rgba(255,255,255,.70)}.story-analysis-line b{color:#fff}.story-mini-tags,.vibe-runtime-tags{display:flex;gap:7px;flex-wrap:wrap}.story-mini-tag,.vibe-runtime-tag{display:inline-flex;align-items:center;min-height:27px;padding:0 9px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.035);font-size:10px;font-weight:850;color:rgba(255,255,255,.72)}
    .vibe-runtime-tags{margin:10px 0 2px}.vibe-runtime-tag{border-color:rgba(255,90,0,.18);color:#ffb184;background:rgba(255,90,0,.045)}
    .meta-row .chip.verified{cursor:pointer;user-select:none;-webkit-user-select:none}.meta-row .chip.verified:after{content:'  ⓘ';font-size:.9em;opacity:.78}
    .provenance-backdrop{position:fixed;inset:0;z-index:220;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:18px;opacity:0;visibility:hidden;pointer-events:none;transition:.18s ease}.provenance-backdrop.open{opacity:1;visibility:visible;pointer-events:auto}.provenance-sheet{width:min(620px,100%);max-height:78svh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#0c0c0c;color:#fff;padding:20px;box-shadow:0 30px 90px rgba(0,0,0,.65)}.provenance-grabber{width:46px;height:4px;border-radius:99px;background:rgba(255,255,255,.22);margin:-7px auto 15px}.provenance-head{display:flex;gap:12px;align-items:flex-start}.provenance-head h3{margin:0;font-size:20px;letter-spacing:-.03em}.provenance-head button{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:22px}.provenance-copy{margin:6px 0 16px;color:rgba(255,255,255,.60);font-size:12px;line-height:1.45}.provenance-song{padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}.provenance-song strong{display:block;font-size:14px}.provenance-song span{display:block;margin-top:3px;color:rgba(255,255,255,.64);font-size:12px}.provenance-confidence{margin-top:12px;padding:10px 12px;border-radius:13px;background:rgba(255,90,0,.08);color:#ffb184;font-size:12px;font-weight:800}
    @media(max-width:760px){.story-intel textarea{min-height:146px}.provenance-backdrop{padding:0}.provenance-sheet{border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:max(22px,env(safe-area-inset-bottom))}}
  `;
  document.head.appendChild(style);
}

function applyProfileToControls(profile){
  const moodBtn=document.querySelector(`[data-mood="${profile.primaryTerritory}"]`);
  if(moodBtn && moodBtn.getAttribute('aria-pressed')!=='true') moodBtn.click();
  const slider=document.getElementById('energySlider');
  if(slider){ slider.value=String(Math.round(profile.energySuggestion*100)); slider.dispatchEvent(new Event('input',{bubbles:true})); }
}

function renderAnalysis(panel,profile){
  const signals=profile.vibeSignals.length?profile.vibeSignals.map(item=>item.label).join(' · '):'Balanced / open';
  panel.innerHTML=`
    <div class="story-analysis-head"><strong>Detected direction</strong><span>${Math.round(profile.confidence*100)}% fit</span></div>
    <div class="story-analysis-line"><b>${escapeHtml(profile.primaryTerritory[0].toUpperCase()+profile.primaryTerritory.slice(1))}</b> · ${escapeHtml(signals)}</div>
    <div class="story-analysis-line">Suggested Body Energy <b>${Math.round(profile.energySuggestion*100)}%</b> · Suggested tempo <b>${profile.tempoSuggestion.min}–${profile.tempoSuggestion.max} BPM</b> · Start ${profile.tempoSuggestion.center} BPM</div>
    <div class="story-analysis-line">${escapeHtml(profile.harmonicIntent)}</div>
    <div class="story-mini-tags">${profile.tags.slice(0,8).map(tag=>`<span class="story-mini-tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
  panel.classList.add('show');
}

function renderRuntimeTags(){
  const meta=document.getElementById('metaRow');
  if(!meta) return;
  let row=document.getElementById('vibeRuntimeTags');
  if(!row){ row=document.createElement('div'); row.id='vibeRuntimeTags'; row.className='vibe-runtime-tags'; meta.insertAdjacentElement('afterend',row); }
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__;
  const tags=result?.tags||getActiveStoryProfile()?.tags||[];
  row.innerHTML=tags.slice(0,9).map(tag=>`<span class="vibe-runtime-tag">${escapeHtml(tag)}</span>`).join('');
}

function ensureProvenanceSheet(){
  let backdrop=document.getElementById('vibeProvenanceBackdrop');
  if(backdrop) return backdrop;
  backdrop=document.createElement('div'); backdrop.id='vibeProvenanceBackdrop'; backdrop.className='provenance-backdrop';
  backdrop.innerHTML='<section class="provenance-sheet" role="dialog" aria-modal="true" aria-label="Hit-derived source evidence"><div class="provenance-grabber"></div><div id="vibeProvenanceContent"></div></section>';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click',event=>{ if(event.target===backdrop||event.target.closest('[data-close-provenance]')) backdrop.classList.remove('open'); });
  return backdrop;
}

function openProvenance(){
  const engine=window.__FORTISSIMO_VIBE_ENGINE__;
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||engine?.lastResult;
  if(!engine||!result) return;
  const ids=result.evidenceSummary?.supportedSongIds||[];
  const songs=ids.map(id=>engine.dataset?.songs?.find(song=>song.id===id)).filter(Boolean);
  const backdrop=ensureProvenanceSheet();
  const content=backdrop.querySelector('#vibeProvenanceContent');
  content.innerHTML=`
    <div class="provenance-head"><div><h3>HIT-DERIVED · VERIFIED</h3><div class="provenance-copy">Verified provenance for the harmonic family — not a claim that one song owns the progression.</div></div><button type="button" data-close-provenance aria-label="Close">×</button></div>
    ${songs.length?songs.slice(0,4).map(song=>`<div class="provenance-song"><strong>${escapeHtml(song.title||'Verified source')}</strong><span>${escapeHtml(song.artist||'')} ${Number(song.peakRank)>0?`· chart peak #${song.peakRank}`:''}</span></div>`).join(''):'<div class="provenance-song"><strong>Verified harmonic source</strong><span>The corpus record has verified evidence, but no displayable song metadata is attached yet.</span></div>'}
    <div class="provenance-confidence">Harmonic evidence confidence: ${Math.round((result.evidenceConfidence||0)*100)}% · Current playback may transpose, revoice and create an A′ variation while preserving source-family provenance.</div>`;
  backdrop.classList.add('open');
}

function installUi(){
  if(typeof document==='undefined'||document.getElementById('storyCreativeBrief')) return;
  installStyles();
  const titleField=document.getElementById('workingTitle')?.closest('.session-field');
  if(!titleField) return;
  const wrap=document.createElement('div'); wrap.className='story-intel';
  wrap.innerHTML=`<label for="storyCreativeBrief">Story / Chapter / Creative Brief</label><textarea id="storyCreativeBrief" maxlength="2400" placeholder="Paste the story your team is writing from. Vibe Roulette will suggest emotional territory, vibe colors, Body Energy and a BPM range."></textarea><div class="story-intel-actions"><button class="story-analyze" id="storyAnalyzeBtn" type="button">Analyze story</button><span style="font-size:11px;color:rgba(255,255,255,.46)">Suggestion only — you can override Mood and Body Energy.</span></div><div class="story-analysis" id="storyAnalysisPanel"></div>`;
  titleField.insertAdjacentElement('afterend',wrap);
  const textarea=wrap.querySelector('#storyCreativeBrief');
  const button=wrap.querySelector('#storyAnalyzeBtn');
  const panel=wrap.querySelector('#storyAnalysisPanel');
  const restored=restoreProfile();
  if(restored?.text){ textarea.value=restored.text; renderAnalysis(panel,restored); }

  let timer=0;
  const analyze=({apply=true}={})=>{
    const text=textarea.value.trim();
    if(text.length<12){ panel.classList.remove('show'); clearProfile(); renderRuntimeTags(); return null; }
    const profile=analyzeStoryLocally(text,{title:document.getElementById('workingTitle')?.value||''});
    persistProfile(profile); renderAnalysis(panel,profile); if(apply) applyProfileToControls(profile); renderRuntimeTags();
    document.dispatchEvent(new CustomEvent('fortissimo:vibe-story-analyzed',{detail:profile}));
    return profile;
  };
  button.addEventListener('click',()=>analyze({apply:true}));
  textarea.addEventListener('input',()=>{ window.clearTimeout(timer); timer=window.setTimeout(()=>analyze({apply:true}),760); });
  document.getElementById('workingTitle')?.addEventListener('change',()=>{ if(textarea.value.trim().length>=12) analyze({apply:false}); });

  document.addEventListener('click',event=>{
    const chip=event.target.closest?.('.meta-row .chip.verified');
    if(chip){ event.preventDefault(); openProvenance(); }
  });
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('.meta-row .chip.verified')){event.preventDefault();openProvenance();}
  });

  const meta=document.getElementById('metaRow');
  if(meta){
    const observer=new MutationObserver(()=>{
      const chip=meta.querySelector('.chip.verified');
      if(chip){chip.setAttribute('role','button');chip.setAttribute('tabindex','0');chip.setAttribute('aria-label','Show verified hit sources');}
      renderRuntimeTags();
    });
    observer.observe(meta,{childList:true,subtree:true,characterData:true});
  }
  renderRuntimeTags();
}

if(typeof window!=='undefined'){
  restoreProfile();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installUi,{once:true}); else queueMicrotask(installUi);
}
