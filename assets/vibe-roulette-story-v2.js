import { suggestedTempoRangeForEnergy } from './vibe-roulette-tempo-v2.js';
import { MODERN_PERFORMANCE_LENS } from './vibe-roulette-lineage-v1.js';
import {
  SERRA_EMOTION_FILTERS,
  getActiveSerraEmotionFilters,
  setActiveSerraEmotionFilters,
  inferSerraEmotionFilters,
  deriveCompositeEmotionalState,
  installSerraEmotionFilterUi
} from './vibe-roulette-serra-emotion-v1.js';

const STORY_STORAGE_KEY='fortissimo.vibeRoulette.storyProfile.v3';
const LEGACY_STORY_STORAGE_KEY='fortissimo.vibeRoulette.storyProfile.v2';
const STATE_STORAGE_KEY='fortissimo.vibeRoulette.emotionalState.v1';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function normalize(text=''){return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9ñ'\s-]/g,' ').replace(/\s+/g,' ').trim();}
function countMatches(text,terms=[]){let score=0;for(const term of terms){const phrase=normalize(typeof term==='string'?term:term?.phrase||'');if(phrase&&text.includes(phrase))score+=typeof term==='string'?1:Number(term.weight||1);}return score;}

export const EMOTIONAL_TERRITORIES={
  illusion:{id:'illusion',label:'Illusion',emoji:'✨',tag:'#Illusion',corpusMood:'illusion',description:'desire · possibility · movement forward',baseEnergy:.62,terms:[{phrase:'todo cambia',weight:2.6},{phrase:'primera vez',weight:2},{phrase:'puede pasar',weight:1.7},'posibilidad','futuro','descubrir','coincidir','ilusion','esperanza','imaginar','nuevo comienzo','aparece','conocer a alguien','empezar de nuevo']},
  nostalgia:{id:'nostalgia',label:'Nostalgia',emoji:'💎',tag:'#Nostalgia',corpusMood:'nostalgia',description:'memory · longing · bittersweet motion',baseEnergy:.50,terms:[{phrase:'me tope con tu foto',weight:5},{phrase:'me encontre tu foto',weight:5},{phrase:'ya no',weight:1.7},'recuerdo','recordar','foto','pasado','extrano','extraño','volver','olvidar','desaparecio','ghosted','memoria','lejos','perdi','perdí','nostalgia','despedida','se termino','terminamos']},
  connection:{id:'connection',label:'Connection',emoji:'🌙',tag:'#Connection',corpusMood:'connection',description:'closeness · belonging · shared emotional moment',baseEnergy:.55,terms:[{phrase:'solo amigos',weight:4},{phrase:'amigos con derecho',weight:6},{phrase:'relacion casual',weight:4},{phrase:'quimica emocional',weight:4},{phrase:'ambos sienten',weight:4},'juntos','amigos','conexion','comparten','mirada','cercania','intimidad','complicidad','contigo','nosotros','amarte','te amo','te quiero','cuidarte','mereces','pareja','relacion']},
  desire:{id:'desire',label:'Desire',emoji:'🔥',tag:'#Desire',corpusMood:'connection',description:'attraction · chemistry · romantic tension',baseEnergy:.58,terms:[{phrase:'quimica fisica',weight:4},{phrase:'ganas de verte',weight:3},{phrase:'quiero besarte',weight:3},'deseo','atraccion','piel','beso','labios','cuerpo','sexo','sensual','coqueteo','quimica','me atraes','me gustas']},
  introspection:{id:'introspection',label:'Introspection',emoji:'🪞',tag:'#Introspection',corpusMood:'nostalgia',description:'inner processing · questions · self-discovery',baseEnergy:.42,terms:[{phrase:'me di cuenta',weight:3},{phrase:'quien soy',weight:3},{phrase:'que quiero',weight:2.4},'introspeccion','reflexionar','entenderme','procesar','pensar en mi','aprendiendo','cuestionarme','no se que siento','no entiendo','mirar hacia dentro']},
  calm:{id:'calm',label:'Calm',emoji:'🌿',tag:'#Calm',corpusMood:'connection',description:'peace · acceptance · emotional steadiness',baseEnergy:.38,terms:[{phrase:'lugar seguro',weight:3},{phrase:'en paz',weight:3},{phrase:'es lo mejor',weight:2},'calma','tranquilo','tranquila','paz','aceptar','aceptacion','estabilidad','serenidad','respirar','sin prisa','presente']},
  liberation:{id:'liberation',label:'Liberation',emoji:'🕊️',tag:'#Liberation',corpusMood:'illusion',description:'release · closure · freedom · moving on',baseEnergy:.58,terms:[{phrase:'te deje ir',weight:6},{phrase:'deje ir',weight:5},{phrase:'mereces algo mejor',weight:4.2},{phrase:'seguir adelante',weight:3.5},{phrase:'cerrar este capitulo',weight:3},'soltar','liberacion','libre','superar','cerrar ciclo','pasar pagina','ya te solte','dejar atras','recuperar mi libertad']}
};

// Kept as an internal compatibility layer for performance/ranking code. These are
// inferred composite states now; the user no longer chooses a separate Mood UI.
export const EMOTIONAL_STATES={
  love:{id:'love',label:'Amor',tag:'#Amor'},
  heartbreak:{id:'heartbreak',label:'Desamor',tag:'#Desamor'},
  spite:{id:'spite',label:'Despecho',tag:'#Despecho'},
  suffocation:{id:'suffocation',label:'Asfixia',tag:'#Asfixia'}
};

const SIGNALS=[
  {id:'romantic-tension',label:'Romantic tension',tag:'#RomanticTension',terms:[{phrase:'amigos con derecho',weight:4},{phrase:'relacion casual',weight:2},{phrase:'ninguno habla de sentimientos',weight:5},{phrase:'ambos sienten',weight:3},'solo amigos','quimica','miradas','unspoken','chemistry'],energy:.04,bias:0},
  {id:'playful',label:'Playful / Picardía',tag:'#Playful',terms:['picardia','coqueteo','coquetear','juego','travieso','atrevido','vacilon','flirt','tease'],energy:.10,bias:3},
  {id:'summer',label:'Summer',tag:'#Summer',terms:['verano','calor','sol','sunset','atardecer','summer'],energy:.08,bias:3},
  {id:'beach',label:'Beach scene',tag:'#Beach',terms:['playa','arena','mar','oceano','costa','beach','ocean'],energy:.06,bias:2},
  {id:'tropical',label:'Tropical context',tag:'#Tropical',terms:['tropical','caribe','caribeno','isla','afrobeat','afrobeats','afropop','merengue','dancehall'],energy:.06,bias:3},
  {id:'night',label:'Night scene',tag:'#Night',terms:['noche','madrugada','luna','luces','after','club','night'],energy:.02,bias:0},
  {id:'celebration',label:'Celebration / social energy',tag:'#Celebration',terms:['fiesta','party','celebrar','celebracion','discoteca','bailando','bailar','baile'],energy:.18,bias:7},
  {id:'movement',label:'Movement / road',tag:'#Movement',terms:['viaje','carretera','moverme','caminar','camino','de camino','salir','recorrer'],energy:.09,bias:3}
];

const BASE_TAGS=['#Afropop','#AfroTropical','#Commercial'];
export function corpusTerritoryProxy(id='connection'){return EMOTIONAL_TERRITORIES[id]?.corpusMood||'connection';}
function titleCase(id=''){return String(id).charAt(0).toUpperCase()+String(id).slice(1);}
function territoryLabel(id){return EMOTIONAL_TERRITORIES[id]?.label||titleCase(id);}

function harmonicIntentFrom(profile){
  const filters=new Set(profile.emotionalFilters||[]);
  if(filters.has('resentment')||filters.has('frustration'))return 'Contained emotional tension · commercial loop · clear identity · no aggressive or jazz-heavy reharmonization';
  if(filters.has('anxiety')||filters.has('insecurity'))return 'Hypnotic commercial loop · controlled unresolved pressure · common-tone continuity · room for the vocal';
  if(profile.primaryTerritory==='desire')return 'Warm unresolved loop · sensual pocket · singing top voice · selective color';
  if(profile.primaryTerritory==='liberation')return 'Forward release · simple commercial loop · emotional lift · bar 1 feels like freedom rather than a forced cadence';
  if(profile.primaryTerritory==='introspection')return 'Spacious commercial loop · reflective common tones · restrained inner movement · avoid over-harmonizing';
  if(profile.primaryTerritory==='calm')return 'Stable open loop · soft harmonic gravity · long breath · minimal tension';
  if(profile.primaryTerritory==='illusion')return 'Forward-moving loop · open voicings · lift without jazz density';
  if(profile.primaryTerritory==='nostalgia')return 'Bittersweet commercial loop · active nostalgia · soft tension that can still move the body';
  return 'Intimate commercial loop · warm voice leading · subtle second-pass evolution';
}

function secondaryIfMeaningful(ranked){
  if(ranked.length<2)return null;const [first,second]=ranked;const ratio=second[1]/Math.max(.01,first[1]);const gap=first[1]-second[1];return ratio>=.52||gap<=2.2?second[0]:null;
}

export function analyzeStoryLocally(text,{title=''}={}){
  const combined=normalize(`${title} ${text}`);const territoryScores={};
  for(const [id,config] of Object.entries(EMOTIONAL_TERRITORIES))territoryScores[id]=.8+countMatches(combined,config.terms);

  const casualRelation=/(relacion casual|amigos con derecho|solo amigos)/.test(combined);
  const mutualChemistry=/(quimica fisica y emocional|quimica fisica|ambos sienten|ninguno habla de sentimientos)/.test(combined);
  if(casualRelation)territoryScores.connection+=4.5;
  if(mutualChemistry){territoryScores.connection+=2.2;territoryScores.desire+=3.4;}
  if(casualRelation&&mutualChemistry)territoryScores.illusion=Math.max(.8,territoryScores.illusion-1.8);
  if(/me tope con tu foto|me encontre tu foto/.test(combined))territoryScores.nostalgia+=5;
  if(/te deje ir|deje ir|dejarte ir|mereces algo mejor|seguir adelante|soltar/.test(combined)){territoryScores.liberation+=4.2;territoryScores.connection+=1.2;territoryScores.nostalgia+=1.0;}
  if(/no podia amarte|no supe amarte|no pude darte|no te pude dar/.test(combined)){territoryScores.introspection+=2.2;territoryScores.nostalgia+=1.4;territoryScores.connection+=1.1;}
  if(/en paz|acepto|aceptar|es lo mejor|lugar seguro|tranquilo|tranquila/.test(combined))territoryScores.calm+=2.4;

  const ranked=Object.entries(territoryScores).sort((a,b)=>b[1]-a[1]);
  const primaryTerritory=ranked[0][0];const secondaryTerritory=secondaryIfMeaningful(ranked);
  const confidence=clamp((ranked[0][1]-(ranked[1]?.[1]||0)+3)/8,.42,.97);
  const vibeSignals=SIGNALS.map(signal=>({...signal,score:countMatches(combined,signal.terms)})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(({terms,...signal})=>signal);
  const emotionalFilters=inferSerraEmotionFilters(combined,{primaryTerritory,secondaryTerritory,limit:4});
  const emotionalState=deriveCompositeEmotionalState(emotionalFilters,primaryTerritory);
  let energy=EMOTIONAL_TERRITORIES[primaryTerritory]?.baseEnergy??.55;let tempoBias=0;
  for(const signal of vibeSignals){energy+=signal.energy*Math.min(1.4,signal.score);tempoBias+=signal.bias*Math.min(1.2,signal.score);}
  // Emotional filters describe the story; they only nudge suggested activation.
  // Body Energy remains a separate, user-overridable musical control.
  if(emotionalFilters.includes('calm')||emotionalFilters.includes('serenity'))energy-=.05;
  if(emotionalFilters.includes('enthusiasm')||emotionalFilters.includes('euphoria'))energy+=.05;
  energy=clamp(energy,.18,.94);tempoBias=clamp(tempoBias,-9,11);
  const tempo=suggestedTempoRangeForEnergy(energy,{width:8,bias:tempoBias});
  const filterTags=emotionalFilters.map(id=>`#${SERRA_EMOTION_FILTERS[id]?.label?.replace(/\s+/g,'')||titleCase(id)}`);
  const territoryTags=[EMOTIONAL_TERRITORIES[primaryTerritory].tag,secondaryTerritory?EMOTIONAL_TERRITORIES[secondaryTerritory].tag:null].filter(Boolean);
  const tags=[...new Set([...BASE_TAGS,...territoryTags,...filterTags,...vibeSignals.map(s=>s.tag)])];
  const profile={version:3,source:'fortissimo-story-intelligence-v3-serra-emotional-architecture',text:String(text||'').trim(),title:String(title||'').trim(),primaryTerritory,secondaryTerritory,confidence,territoryScores,vibeSignals,emotionalFilters,emotionalState,energySuggestion:energy,tempoSuggestion:tempo,harmonicIntent:'',tags,analyzedAt:new Date().toISOString()};
  profile.harmonicIntent=harmonicIntentFrom(profile);return profile;
}

export function getActiveStoryProfile(){return typeof window!=='undefined'?window.__FORTISSIMO_VIBE_STORY_PROFILE__||null:null;}
export function getActiveEmotionalState(){
  if(typeof window==='undefined')return 'love';
  const profile=getActiveStoryProfile();
  return profile?.emotionalState||deriveCompositeEmotionalState(getActiveSerraEmotionFilters(),profile?.primaryTerritory||'connection')||window.__FORTISSIMO_VIBE_EMOTIONAL_STATE__||localStorage.getItem(STATE_STORAGE_KEY)||'love';
}
export function setActiveEmotionalState(value,{persist=true}={}){const id=EMOTIONAL_STATES[value]?value:'love';if(typeof window!=='undefined'){window.__FORTISSIMO_VIBE_EMOTIONAL_STATE__=id;if(persist)try{localStorage.setItem(STATE_STORAGE_KEY,id);}catch(_){}}return id;}

export function storyAffinityWeight(item,profile=getActiveStoryProfile()){
  if(!profile)return 1;const styles=(item?.styleAffinity||[]).map(normalize);const tags=(profile.tags||[]).map(v=>normalize(v.replace(/^#/,'')));let weight=1;
  for(const style of styles){if(tags.some(tag=>style.includes(tag)||tag.includes(style)))weight*=1.08;if(/afro|latin|tropical|caribbean|pop|rnb|soul/.test(style))weight*=1.035;}
  const mood=item?.mood||{};const proxy=corpusTerritoryProxy(profile.primaryTerritory);weight*=.84+.30*(Number(mood?.[proxy])||.5);
  if(profile.primaryTerritory==='desire')weight*=.90+.20*(Number(mood.sensuality)||.5)+.08*(Number(mood.connection)||.5);
  if(profile.primaryTerritory==='introspection')weight*=.90+.16*(Number(mood.nostalgia)||.5)+.10*(1-(Number(mood.movement)||.5));
  if(profile.primaryTerritory==='calm')weight*=.90+.18*(Number(mood.stability)||.5)+.10*(1-(Number(mood.tension)||.5));
  if(profile.primaryTerritory==='liberation')weight*=.90+.15*(Number(mood.illusion)||.5)+.10*(Number(mood.stability)||.5);
  const movement=Number(mood.movement)||.5;weight*=.90+.10*(1-Math.abs(movement-(profile.energySuggestion??.55)));
  return clamp(weight,.68,1.72);
}

export function deriveResultTags(result,profile=getActiveStoryProfile()){
  const styleTags=(result?.styleAffinity||[]).map(v=>`#${String(v).replace(/[^a-z0-9]+/gi,'').replace(/^./,m=>m.toUpperCase())}`).filter(t=>t.length>1);const performanceTag=result?.performancePattern?.tag?[result.performancePattern.tag]:[];
  return [...new Set([...BASE_TAGS,...styleTags,...(profile?.tags||[]),...performanceTag])].slice(0,14);
}

function persistProfile(profile){if(typeof window==='undefined')return;window.__FORTISSIMO_VIBE_STORY_PROFILE__=profile;setActiveEmotionalState(profile.emotionalState||'love',{persist:false});try{localStorage.setItem(STORY_STORAGE_KEY,JSON.stringify(profile));}catch(_){}}
function clearProfile(){if(typeof window==='undefined')return;window.__FORTISSIMO_VIBE_STORY_PROFILE__=null;try{localStorage.removeItem(STORY_STORAGE_KEY);}catch(_){}}
function restoreProfile(){
  if(typeof window==='undefined')return null;
  try{const raw=localStorage.getItem(STORY_STORAGE_KEY);const p=raw?JSON.parse(raw):null;if(p?.version===3){window.__FORTISSIMO_VIBE_STORY_PROFILE__=p;setActiveEmotionalState(p.emotionalState||'love',{persist:false});return p;}}catch(_){}
  try{const raw=localStorage.getItem(LEGACY_STORY_STORAGE_KEY);const legacy=raw?JSON.parse(raw):null;if(legacy?.text){const upgraded=analyzeStoryLocally(legacy.text,{title:legacy.title||''});persistProfile(upgraded);return upgraded;}}catch(_){}
  return null;
}
function esc(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

function installStyles(){
  if(document.getElementById('vibe-story-v3-styles'))return;const style=document.createElement('style');style.id='vibe-story-v3-styles';style.textContent=`
  .story-intel{display:grid;gap:10px;margin-top:2px}.story-intel label{font-size:12px;font-weight:900;letter-spacing:.04em;color:rgba(255,255,255,.78)}
  .story-intel textarea{width:100%;min-height:132px;resize:vertical;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.055);color:#fff;padding:13px 14px;font:500 16px/1.48 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:0}.story-intel textarea:focus{border-color:rgba(255,90,0,.75);box-shadow:0 0 0 3px rgba(255,90,0,.08)}
  .story-intel-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.story-analyze{min-height:42px;border:1px solid rgba(255,90,0,.62);border-radius:999px;background:rgba(255,90,0,.08);color:#ff8a45;padding:0 16px;font-weight:900}.story-analysis{display:none;padding:13px 14px;border:1px solid rgba(255,255,255,.10);border-radius:15px;background:rgba(255,255,255,.035)}.story-analysis.show{display:grid;gap:8px}.story-analysis-head{display:flex;justify-content:space-between;gap:10px}.story-analysis-head span{font-size:11px;color:#ff9a5b;font-weight:900}.story-analysis-line{font-size:12px;line-height:1.45;color:rgba(255,255,255,.70)}.story-analysis-line b{color:#fff}
  .story-filter-result{display:flex;gap:6px;flex-wrap:wrap}.story-filter-result span,.story-mini-tag,.vibe-runtime-tag{display:inline-flex;align-items:center;min-height:27px;padding:0 9px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.035);font-size:10px;font-weight:850;color:rgba(255,255,255,.72)}.story-filter-result span{border-color:rgba(255,90,0,.25);color:#ffd0b2;background:rgba(255,90,0,.055)}
  .story-mini-tags,.vibe-runtime-tags{display:flex;gap:7px;flex-wrap:wrap}.vibe-runtime-tags{margin:10px 0 2px}.vibe-runtime-tag{border-color:rgba(255,90,0,.18);color:#ffb184;background:rgba(255,90,0,.045)}
  #moodGrid[data-territory-v3="1"]{display:grid;grid-template-columns:1fr;gap:9px}
  .meta-row .chip.verified{cursor:pointer;user-select:none}.meta-row .chip.verified:after{content:'  ⓘ';font-size:.9em;opacity:.78}.provenance-backdrop{position:fixed;inset:0;z-index:220;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:18px;opacity:0;visibility:hidden;pointer-events:none;transition:.18s ease}.provenance-backdrop.open{opacity:1;visibility:visible;pointer-events:auto}.provenance-sheet{width:min(640px,100%);max-height:82svh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#0c0c0c;color:#fff;padding:20px}.provenance-grabber{width:46px;height:4px;border-radius:99px;background:rgba(255,255,255,.22);margin:-7px auto 15px}.provenance-head{display:flex;gap:12px}.provenance-head h3{margin:0;font-size:20px}.provenance-head button{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:22px}.provenance-copy,.provenance-note{margin:6px 0 14px;color:rgba(255,255,255,.60);font-size:12px;line-height:1.45}.provenance-section{margin-top:14px;font-size:11px;font-weight:950;color:#ff9a5b;letter-spacing:.08em;text-transform:uppercase}.provenance-song{padding:11px 0;border-top:1px solid rgba(255,255,255,.08)}.provenance-song strong{display:block;font-size:14px}.provenance-song span{display:block;margin-top:3px;color:rgba(255,255,255,.64);font-size:12px}.provenance-confidence{margin-top:12px;padding:10px 12px;border-radius:13px;background:rgba(255,90,0,.08);color:#ffb184;font-size:12px;font-weight:800}
  @media(max-width:760px){.story-intel textarea{min-height:146px}.provenance-backdrop{padding:0}.provenance-sheet{border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:max(22px,env(safe-area-inset-bottom))}}`;
  document.head.appendChild(style);
}

function installTerritoryControls(){
  const grid=document.getElementById('moodGrid');if(!grid||grid.dataset.territoryV3==='1')return;const current=grid.querySelector('[data-mood][aria-pressed="true"]')?.dataset.mood||'nostalgia';grid.dataset.territoryV3='1';
  grid.innerHTML=Object.values(EMOTIONAL_TERRITORIES).map(item=>`<button class="mood-btn" data-mood="${item.id}" aria-pressed="${item.id===current?'true':'false'}">${item.emoji} ${item.label}<small>${item.description}</small></button>`).join('');
}

function applyFiltersThroughControls(filters=[]){
  installSerraEmotionFilterUi();const target=[...new Set(filters)].slice(0,4);const grid=document.getElementById('serraFilterGrid');if(!grid){setActiveSerraEmotionFilters(target);return;}
  let current=getActiveSerraEmotionFilters();
  for(const id of current.filter(id=>!target.includes(id))){const btn=grid.querySelector(`[data-serra-filter="${id}"]`);if(btn)btn.click();}
  current=getActiveSerraEmotionFilters();
  for(const id of target.filter(id=>!current.includes(id))){const btn=grid.querySelector(`[data-serra-filter="${id}"]`);if(btn)btn.click();}
  if(JSON.stringify(getActiveSerraEmotionFilters())!==JSON.stringify(target))setActiveSerraEmotionFilters(target);
}

function applyProfileToControls(profile){
  const territory=document.querySelector(`[data-mood="${profile.primaryTerritory}"]`);if(territory&&territory.getAttribute('aria-pressed')!=='true')territory.click();
  applyFiltersThroughControls(profile.emotionalFilters||[]);setActiveEmotionalState(profile.emotionalState||'love');
  const slider=document.getElementById('energySlider');if(slider){slider.value=String(Math.round(profile.energySuggestion*100));slider.dispatchEvent(new Event('input',{bubbles:true}));}
}
function renderAnalysis(panel,p){
  const secondary=p.secondaryTerritory?` + ${territoryLabel(p.secondaryTerritory)}`:'';const filters=(p.emotionalFilters||[]).map(id=>SERRA_EMOTION_FILTERS[id]).filter(Boolean);
  panel.innerHTML=`<div class="story-analysis-head"><strong>Detected direction</strong><span>${Math.round(p.confidence*100)}% fit</span></div><div class="story-analysis-line"><b>${esc(territoryLabel(p.primaryTerritory))}${esc(secondary)}</b></div><div class="story-filter-result">${filters.map(item=>`<span>${item.emoji} ${esc(item.label)}</span>`).join('')}</div><div class="story-analysis-line">Suggested Body Energy <b>${Math.round(p.energySuggestion*100)}%</b> · Suggested tempo <b>${p.tempoSuggestion.min}–${p.tempoSuggestion.max} BPM</b> · Start ${p.tempoSuggestion.center} BPM</div><div class="story-analysis-line">${esc(p.harmonicIntent)}</div><div class="story-mini-tags">${p.vibeSignals.slice(0,4).map(s=>`<span class="story-mini-tag">${esc(s.label)}</span>`).join('')}</div>`;panel.classList.add('show');
}
function renderRuntimeTags(){const meta=document.getElementById('metaRow');if(!meta)return;let row=document.getElementById('vibeRuntimeTags');if(!row){row=document.createElement('div');row.id='vibeRuntimeTags';row.className='vibe-runtime-tags';meta.insertAdjacentElement('afterend',row);}const r=window.__FORTISSIMO_VIBE_LAST_RESULT__;const tags=r?.tags||getActiveStoryProfile()?.tags||[];row.innerHTML=tags.slice(0,12).map(t=>`<span class="vibe-runtime-tag">${esc(t)}</span>`).join('');}
function ensureProvenanceSheet(){let b=document.getElementById('vibeProvenanceBackdrop');if(b)return b;b=document.createElement('div');b.id='vibeProvenanceBackdrop';b.className='provenance-backdrop';b.innerHTML='<section class="provenance-sheet" role="dialog" aria-modal="true"><div class="provenance-grabber"></div><div id="vibeProvenanceContent"></div></section>';document.body.appendChild(b);b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-close-provenance]'))b.classList.remove('open');});return b;}
function openProvenance(){
  const engine=window.__FORTISSIMO_VIBE_ENGINE__;const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||engine?.lastResult;if(!engine||!result)return;const historical=(result.evidenceSummary?.supportedSongIds||[]).map(id=>engine.dataset?.songs?.find(s=>s.id===id)).filter(Boolean);const modern=result.lineage?.modernRelatives||[];const b=ensureProvenanceSheet();const c=b.querySelector('#vibeProvenanceContent');
  c.innerHTML=`<div class="provenance-head"><div><h3>HIT-DERIVED · VERIFIED</h3><div class="provenance-copy">Historical DNA stays separate from present-day relatives. Modern playback can transpose, revoice and change rhythm without pretending a modern artist authored the original progression.</div></div><button type="button" data-close-provenance>×</button></div><div class="provenance-section">Heritage source</div>${historical.length?historical.slice(0,4).map(s=>`<div class="provenance-song"><strong>${esc(s.title)}</strong><span>${esc(s.artist)} ${Number(s.peakRank)>0?`· chart peak #${s.peakRank}`:''}</span></div>`).join(''):'<div class="provenance-song"><strong>Verified harmonic source</strong><span>No displayable song metadata attached.</span></div>'}<div class="provenance-section">Contemporary relatives</div>${modern.length?modern.map(s=>`<div class="provenance-song"><strong>${esc(s.title)} — ${esc(s.artist)}</strong><span>${esc(s.displayChords||'')} · ${esc(s.matchType||s.evidenceClass)} · ${Math.round((s.confidence||0)*100)}% relative confidence</span><div class="provenance-note">${esc(s.note||'')}</div></div>`).join(''):'<div class="provenance-song"><strong>No exact modern-family match attached yet.</strong><span>The historical source can still be performed through the current modern keyboard language.</span></div>'}<div class="provenance-section">Modern performance lens</div><div class="provenance-note"><strong>${esc(MODERN_PERFORMANCE_LENS.label)}</strong><br>${esc(MODERN_PERFORMANCE_LENS.references.join(' · '))}<br>${esc(MODERN_PERFORMANCE_LENS.note)}</div><div class="provenance-confidence">Historical harmonic evidence confidence: ${Math.round((result.evidenceConfidence||0)*100)}%.</div>`;b.classList.add('open');
}

function installUi(){
  if(typeof document==='undefined')return;installStyles();installTerritoryControls();installSerraEmotionFilterUi();
  document.querySelector('.emotional-state-wrap')?.remove();
  if(document.getElementById('storyCreativeBrief'))return;
  const titleField=document.getElementById('workingTitle')?.closest('.session-field');if(!titleField)return;const wrap=document.createElement('div');wrap.className='story-intel';wrap.innerHTML=`<label for="storyCreativeBrief">Story / Chapter / Creative Brief</label><textarea id="storyCreativeBrief" maxlength="2400" placeholder="Paste the story. Vibe Roulette will infer Emotional Territory, up to 4 Serra Emotional Filters, Body Energy and tempo."></textarea><div class="story-intel-actions"><button class="story-analyze" id="storyAnalyzeBtn" type="button">Analyze story</button><span style="font-size:11px;color:rgba(255,255,255,.46)">Suggestion only — you can override Territory, Emotional Filters and Body Energy.</span></div><div class="story-analysis" id="storyAnalysisPanel"></div>`;titleField.insertAdjacentElement('afterend',wrap);
  const textarea=wrap.querySelector('#storyCreativeBrief'),button=wrap.querySelector('#storyAnalyzeBtn'),panel=wrap.querySelector('#storyAnalysisPanel');const restored=restoreProfile();if(restored?.text){textarea.value=restored.text;renderAnalysis(panel,restored);applyProfileToControls(restored);}
  let timer=0;const analyze=({apply=true}={})=>{const text=textarea.value.trim();if(text.length<12){panel.classList.remove('show');clearProfile();renderRuntimeTags();return null;}const p=analyzeStoryLocally(text,{title:document.getElementById('workingTitle')?.value||''});persistProfile(p);renderAnalysis(panel,p);if(apply)applyProfileToControls(p);renderRuntimeTags();document.dispatchEvent(new CustomEvent('fortissimo:vibe-story-analyzed',{detail:p}));return p;};button.addEventListener('click',()=>analyze({apply:true}));textarea.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>analyze({apply:true}),720);});document.getElementById('workingTitle')?.addEventListener('change',()=>{if(textarea.value.trim().length>=12)analyze({apply:false});});
  document.addEventListener('click',e=>{const chip=e.target.closest?.('.meta-row .chip.verified');if(chip){e.preventDefault();openProvenance();}});const meta=document.getElementById('metaRow');if(meta){new MutationObserver(()=>{const chip=meta.querySelector('.chip.verified');if(chip){chip.setAttribute('role','button');chip.setAttribute('tabindex','0');chip.setAttribute('aria-label','Show hit lineage and modern relatives');}renderRuntimeTags();}).observe(meta,{childList:true,subtree:true,characterData:true});}renderRuntimeTags();
}

if(typeof window!=='undefined'){restoreProfile();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else queueMicrotask(installUi);}
