import { suggestedTempoRangeForEnergy } from './vibe-roulette-tempo-v2.js';
import { MODERN_PERFORMANCE_LENS } from './vibe-roulette-lineage-v1.js';

const STORY_STORAGE_KEY='fortissimo.vibeRoulette.storyProfile.v2';
const STATE_STORAGE_KEY='fortissimo.vibeRoulette.emotionalState.v1';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function normalize(text=''){
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9ñ'\s-]/g,' ').replace(/\s+/g,' ').trim();
}
function countMatches(text,terms=[]){
  let score=0;
  for(const term of terms){
    const phrase=normalize(typeof term==='string'?term:term?.phrase||'');
    if(phrase&&text.includes(phrase))score+=typeof term==='string'?1:Number(term.weight||1);
  }
  return score;
}

const TERRITORIES={
  illusion:{base:1,terms:[{phrase:'todo cambia',weight:2.6},{phrase:'primera vez',weight:2},{phrase:'puede pasar',weight:1.7},'posibilidad','futuro','descubrir','coincidir','ilusion','esperanza','imaginar','nuevo comienzo','aparece']},
  nostalgia:{base:1,terms:[{phrase:'me tope con tu foto',weight:5},{phrase:'me encontre tu foto',weight:5},{phrase:'ya no',weight:1.7},'recuerdo','recordar','foto','pasado','extrano','volver','olvidar','desaparecio','ghosted','memoria','lejos','perdi','nostalgia']},
  connection:{base:1,terms:[{phrase:'solo amigos',weight:4},{phrase:'amigos con derecho',weight:6},{phrase:'relacion casual',weight:4},{phrase:'quimica fisica',weight:4},{phrase:'quimica emocional',weight:4},{phrase:'quimica fisica y emocional',weight:7},{phrase:'ninguno habla de sentimientos',weight:6},{phrase:'ambos sienten',weight:4},{phrase:'ninguno reconoce',weight:4},'juntos','amigos','conexion','comparten','parejas','mirada','beso','piel','cercania','intimidad','complicidad','contigo','nosotros','chemistry','unspoken','intimate']}
};

export const EMOTIONAL_STATES={
  love:{id:'love',label:'Amor',tag:'#Amor',description:'afecto, deseo, entrega, ternura o vínculo que quiere crecer'},
  heartbreak:{id:'heartbreak',label:'Desamor',tag:'#Desamor',description:'pérdida, distancia, ruptura, ausencia o amor que ya no está'},
  spite:{id:'spite',label:'Despecho',tag:'#Despecho',description:'dolor con actitud, orgullo, reclamo, traición o impulso de responder'},
  suffocation:{id:'suffocation',label:'Asfixia',tag:'#Asfixia',description:'obsesión, presión emocional, dependencia, intensidad o no poder soltar'}
};

const STATE_TERMS={
  love:[{phrase:'quimica fisica y emocional',weight:4},{phrase:'amigos con derecho',weight:2},'amor','enamorado','enamorada','carino','ternura','deseo','quiero estar','me gustas','me encanta','conexion','complicidad','beso','piel'],
  heartbreak:[{phrase:'ya no estamos',weight:4},{phrase:'se termino',weight:4},'ruptura','separacion','te fuiste','me dejaste','olvidarte','extraño','perdida','ausencia','desamor','ghosted','desaparecio'],
  spite:[{phrase:'me engano',weight:5},{phrase:'me traiciono',weight:5},'traicion','engaño','mentira','rabia','orgullo','despecho','venganza','reclamo','no te necesito','te vas a arrepentir'],
  suffocation:[{phrase:'no puedo dejar de pensar',weight:5},{phrase:'no puedo soltarte',weight:5},{phrase:'me tiene loco',weight:3},{phrase:'me tiene loca',weight:3},'obsesion','obsesivo','obsesiva','asfixia','dependencia','adiccion','necesito verte','no respiro','no puedo sin ti','me consume']
};

const SIGNALS=[
  {id:'romantic-tension',label:'Romantic tension',tag:'#RomanticTension',terms:[{phrase:'amigos con derecho',weight:4},{phrase:'relacion casual',weight:2},{phrase:'ninguno habla de sentimientos',weight:5},{phrase:'ambos sienten',weight:3},'solo amigos','quimica','miradas','unspoken','chemistry'],energy:0.04,bias:0},
  {id:'intimate',label:'Intimate',tag:'#Intimate',terms:['intimidad','intimo','cerca','cercania','secreto','en privado','solo nosotros','habitacion','intimate','private'],energy:-0.04,bias:-3},
  {id:'sensual',label:'Sensual',tag:'#Sensual',terms:[{phrase:'quimica fisica',weight:3},'sensual','piel','beso','tocarnos','cuerpo','deseo','sexo','sexual','labios','cama'],energy:0.04,bias:-2},
  {id:'playful',label:'Playful / Picardía',tag:'#Playful',terms:['picardia','coqueteo','coquetear','juego','travieso','atrevido','vacilon','flirt','tease'],energy:0.12,bias:3},
  {id:'summer',label:'Summer',tag:'#Summer',terms:['verano','calor','sol','sunset','atardecer','summer'],energy:0.10,bias:3},
  {id:'beach',label:'Beach',tag:'#Beach',terms:['playa','arena','mar','oceano','costa','beach','ocean'],energy:0.08,bias:2},
  {id:'tropical',label:'Tropical',tag:'#Tropical',terms:['tropical','caribe','caribeno','isla','afrobeat','afrobeats','afropop','merengue','dancehall'],energy:0.08,bias:4},
  {id:'warm',label:'Warm',tag:'#Warm',terms:['calido','calidez','abrazo','hogar','seguro','ternura','suave','warm'],energy:-0.01,bias:-1},
  {id:'mystery',label:'Mystery',tag:'#Mystery',terms:['misterio','secreto','no sabe','no sabemos','incierto','oculto','noche','unknown'],energy:0.01,bias:-1},
  {id:'freedom',label:'Freedom',tag:'#Freedom',terms:['libertad','libre','fluir','viaje','carretera','escapar','freedom','flow'],energy:0.09,bias:3},
  {id:'vulnerable',label:'Vulnerable',tag:'#Vulnerable',terms:['vulnerable','miedo','herida','llorar','fragil','confesar','no me atrevo'],energy:-0.10,bias:-4},
  {id:'melancholic',label:'Melancholic',tag:'#Melancholic',terms:['melancolia','triste','soledad','vacio','duelo','dolor','sad','lonely'],energy:-0.09,bias:-4},
  {id:'hopeful',label:'Hopeful',tag:'#Hopeful',terms:['esperanza','ojala','quizas','tal vez','hope','maybe'],energy:0.05,bias:1},
  {id:'night',label:'Night',tag:'#Night',terms:['noche','madrugada','luna','luces','after','club','night'],energy:0.02,bias:0}
];

const BASE_TAGS=['#Afropop','#AfroTropical','#Commercial'];
function titleCase(id=''){return id.charAt(0).toUpperCase()+id.slice(1);}

function detectEmotionalState(text,primaryTerritory,vibeSignals=[]){
  const scores={love:1,heartbreak:0.8,spite:0.6,suffocation:0.7};
  for(const [id,terms] of Object.entries(STATE_TERMS))scores[id]+=countMatches(text,terms);
  if(primaryTerritory==='connection')scores.love+=1.7;
  if(primaryTerritory==='nostalgia')scores.heartbreak+=1.1;
  const signalIds=new Set(vibeSignals.map(s=>s.id));
  if(signalIds.has('romantic-tension'))scores.love+=1.4;
  if(signalIds.has('sensual'))scores.love+=0.8;
  if(signalIds.has('vulnerable'))scores.heartbreak+=0.8;
  if(/casual|amigos con derecho|quimica fisica y emocional/.test(text)){scores.love+=2.2;scores.suffocation-=0.3;}
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}

function harmonicIntentFrom(profile){
  const ids=new Set(profile.vibeSignals.map(item=>item.id));
  if(profile.emotionalState==='spite')return 'Rhythmic tension · clean harmonic identity · attitude without over-harmonizing';
  if(profile.emotionalState==='suffocation')return 'Hypnotic loop · delayed resolution · repeated common tones · controlled pressure';
  if(ids.has('romantic-tension'))return 'Warm unresolved loop · restrained tension · singing top voice · selective color';
  if(ids.has('playful')||ids.has('summer')||ids.has('beach'))return 'Open commercial loop · rhythmic pocket · bright-but-soft color · clear return home';
  if(ids.has('vulnerable')||ids.has('melancholic'))return 'Spacious loop · emotional common tones · gentle A′ variation · avoid over-harmonizing';
  if(profile.primaryTerritory==='illusion')return 'Forward-moving loop · open voicings · lift without jazz density';
  if(profile.primaryTerritory==='nostalgia')return 'Bittersweet commercial loop · active nostalgia · soft tension back to bar 1';
  return 'Intimate commercial loop · warm voice leading · subtle second-pass evolution';
}

export function analyzeStoryLocally(text,{title=''}={}){
  const combined=normalize(`${title} ${text}`);const territoryScores={};
  for(const [id,config] of Object.entries(TERRITORIES))territoryScores[id]=config.base+countMatches(combined,config.terms);
  // Context overrides: beginnings inside an already-defined relationship are not automatically "Illusion".
  const casualRelation=/(relacion casual|amigos con derecho|solo amigos)/.test(combined);
  const mutualChemistry=/(quimica fisica y emocional|quimica fisica|ambos sienten|ninguno habla de sentimientos)/.test(combined);
  if(casualRelation)territoryScores.connection+=5;
  if(mutualChemistry)territoryScores.connection+=5;
  if(casualRelation&&mutualChemistry){territoryScores.connection+=5;territoryScores.illusion=Math.max(1,territoryScores.illusion-2.5);}
  if(combined.includes('todo cambia')&&!casualRelation)territoryScores.illusion+=2;
  if(combined.includes('me tope con tu foto')||combined.includes('me encontre tu foto'))territoryScores.nostalgia+=5;

  const ranked=Object.entries(territoryScores).sort((a,b)=>b[1]-a[1]);
  const primaryTerritory=ranked[0][0];const secondaryTerritory=ranked[1][0];
  const confidence=clamp((ranked[0][1]-ranked[1][1]+2.4)/8,0.38,0.97);
  const vibeSignals=SIGNALS.map(signal=>({...signal,score:countMatches(combined,signal.terms)})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(({terms,...signal})=>signal);
  const emotionalState=detectEmotionalState(combined,primaryTerritory,vibeSignals);
  let energy=primaryTerritory==='illusion'?0.62:primaryTerritory==='nostalgia'?0.48:0.55;let tempoBias=0;
  for(const signal of vibeSignals){energy+=signal.energy*Math.min(1.5,signal.score);tempoBias+=signal.bias*Math.min(1.25,signal.score);}
  if(emotionalState==='spite')energy+=0.10;if(emotionalState==='suffocation')energy-=0.02;
  energy=clamp(energy,0.18,0.94);tempoBias=clamp(tempoBias,-10,12);
  const tempo=suggestedTempoRangeForEnergy(energy,{width:8,bias:tempoBias});
  const stateTag=EMOTIONAL_STATES[emotionalState].tag;
  const tags=[...new Set([...BASE_TAGS,...vibeSignals.map(s=>s.tag),primaryTerritory==='connection'?'#Connection':primaryTerritory==='nostalgia'?'#Nostalgia':'#Illusion',stateTag])];
  const profile={version:2,source:'fortissimo-story-intelligence-v2-contextual',text:String(text||'').trim(),title:String(title||'').trim(),primaryTerritory,secondaryTerritory,confidence,territoryScores,vibeSignals,emotionalState,energySuggestion:energy,tempoSuggestion:tempo,harmonicIntent:'',tags,analyzedAt:new Date().toISOString()};
  profile.harmonicIntent=harmonicIntentFrom(profile);return profile;
}

export function getActiveStoryProfile(){return typeof window!=='undefined'?window.__FORTISSIMO_VIBE_STORY_PROFILE__||null:null;}
export function getActiveEmotionalState(){
  if(typeof window==='undefined')return 'love';
  return window.__FORTISSIMO_VIBE_EMOTIONAL_STATE__||localStorage.getItem(STATE_STORAGE_KEY)||getActiveStoryProfile()?.emotionalState||'love';
}
export function setActiveEmotionalState(value,{persist=true}={}){
  const id=EMOTIONAL_STATES[value]?value:'love';
  if(typeof window!=='undefined'){window.__FORTISSIMO_VIBE_EMOTIONAL_STATE__=id;if(persist)try{localStorage.setItem(STATE_STORAGE_KEY,id);}catch(_){}}
  return id;
}

export function storyAffinityWeight(item,profile=getActiveStoryProfile()){
  if(!profile)return 1;const styles=(item?.styleAffinity||[]).map(normalize);const tags=(profile.tags||[]).map(v=>normalize(v.replace(/^#/,'')));let weight=1;
  for(const style of styles){if(tags.some(tag=>style.includes(tag)||tag.includes(style)))weight*=1.08;if(/afro|latin|tropical|caribbean|pop|rnb|soul/.test(style))weight*=1.035;}
  const mood=Number(item?.mood?.[profile.primaryTerritory])||0;weight*=0.86+0.28*mood;
  const movement=Number(item?.mood?.movement)||0.5;weight*=0.90+0.10*(1-Math.abs(movement-(profile.energySuggestion??0.55)));
  if(profile.emotionalState==='love')weight*=0.96+0.12*(Number(item?.mood?.connection)||0.5);
  if(profile.emotionalState==='heartbreak')weight*=0.94+0.14*(Number(item?.mood?.nostalgia)||0.5);
  if(profile.emotionalState==='suffocation')weight*=0.96+0.11*(Number(item?.mood?.tension)||0.5);
  if(profile.emotionalState==='spite')weight*=0.96+0.10*(Number(item?.mood?.movement)||0.5);
  return clamp(weight,0.70,1.65);
}

export function deriveResultTags(result,profile=getActiveStoryProfile()){
  const styleTags=(result?.styleAffinity||[]).map(v=>`#${String(v).replace(/[^a-z0-9]+/gi,'').replace(/^./,m=>m.toUpperCase())}`).filter(t=>t.length>1);
  const performanceTag=result?.performancePattern?.tag?[result.performancePattern.tag]:[];
  return [...new Set([...BASE_TAGS,...styleTags,...(profile?.tags||[]),...performanceTag])].slice(0,12);
}

function persistProfile(profile){if(typeof window==='undefined')return;window.__FORTISSIMO_VIBE_STORY_PROFILE__=profile;try{localStorage.setItem(STORY_STORAGE_KEY,JSON.stringify(profile));}catch(_){}}
function clearProfile(){if(typeof window==='undefined')return;window.__FORTISSIMO_VIBE_STORY_PROFILE__=null;try{localStorage.removeItem(STORY_STORAGE_KEY);}catch(_){}}
function restoreProfile(){if(typeof window==='undefined')return null;try{const raw=localStorage.getItem(STORY_STORAGE_KEY);const p=raw?JSON.parse(raw):null;if(p?.version===2){window.__FORTISSIMO_VIBE_STORY_PROFILE__=p;setActiveEmotionalState(p.emotionalState||'love',{persist:false});return p;}}catch(_){}return null;}
function esc(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

function installStyles(){
  if(document.getElementById('vibe-story-v2-styles'))return;const style=document.createElement('style');style.id='vibe-story-v2-styles';style.textContent=`
  .story-intel{display:grid;gap:10px;margin-top:2px}.story-intel label,.emotional-state-title{font-size:12px;font-weight:900;letter-spacing:.04em;color:rgba(255,255,255,.78)}
  .story-intel textarea{width:100%;min-height:132px;resize:vertical;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.055);color:#fff;padding:13px 14px;font:500 16px/1.48 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:0}.story-intel textarea:focus{border-color:rgba(255,90,0,.75);box-shadow:0 0 0 3px rgba(255,90,0,.08)}
  .story-intel-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.story-analyze{min-height:42px;border:1px solid rgba(255,90,0,.62);border-radius:999px;background:rgba(255,90,0,.08);color:#ff8a45;padding:0 16px;font-weight:900}.story-analysis{display:none;padding:13px 14px;border:1px solid rgba(255,255,255,.10);border-radius:15px;background:rgba(255,255,255,.035)}.story-analysis.show{display:grid;gap:8px}.story-analysis-head{display:flex;justify-content:space-between;gap:10px}.story-analysis-head span{font-size:11px;color:#ff9a5b;font-weight:900}.story-analysis-line{font-size:12px;line-height:1.45;color:rgba(255,255,255,.70)}.story-analysis-line b{color:#fff}
  .emotional-state-wrap{display:grid;gap:9px}.emotional-state-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.emotional-state-btn{min-height:54px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.035);color:#fff;padding:9px 11px;text-align:left;font-weight:900}.emotional-state-btn small{display:block;margin-top:3px;font-size:9px;line-height:1.25;color:rgba(255,255,255,.50);font-weight:600}.emotional-state-btn[aria-pressed="true"]{border-color:rgba(255,90,0,.68);background:rgba(255,90,0,.10);color:#ff9a5b}
  .story-mini-tags,.vibe-runtime-tags{display:flex;gap:7px;flex-wrap:wrap}.story-mini-tag,.vibe-runtime-tag{display:inline-flex;align-items:center;min-height:27px;padding:0 9px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.035);font-size:10px;font-weight:850;color:rgba(255,255,255,.72)}.vibe-runtime-tags{margin:10px 0 2px}.vibe-runtime-tag{border-color:rgba(255,90,0,.18);color:#ffb184;background:rgba(255,90,0,.045)}
  .meta-row .chip.verified{cursor:pointer;user-select:none}.meta-row .chip.verified:after{content:'  ⓘ';font-size:.9em;opacity:.78}.provenance-backdrop{position:fixed;inset:0;z-index:220;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:18px;opacity:0;visibility:hidden;pointer-events:none;transition:.18s ease}.provenance-backdrop.open{opacity:1;visibility:visible;pointer-events:auto}.provenance-sheet{width:min(640px,100%);max-height:82svh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#0c0c0c;color:#fff;padding:20px}.provenance-grabber{width:46px;height:4px;border-radius:99px;background:rgba(255,255,255,.22);margin:-7px auto 15px}.provenance-head{display:flex;gap:12px}.provenance-head h3{margin:0;font-size:20px}.provenance-head button{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:22px}.provenance-copy,.provenance-note{margin:6px 0 14px;color:rgba(255,255,255,.60);font-size:12px;line-height:1.45}.provenance-section{margin-top:14px;font-size:11px;font-weight:950;color:#ff9a5b;letter-spacing:.08em;text-transform:uppercase}.provenance-song{padding:11px 0;border-top:1px solid rgba(255,255,255,.08)}.provenance-song strong{display:block;font-size:14px}.provenance-song span{display:block;margin-top:3px;color:rgba(255,255,255,.64);font-size:12px}.provenance-confidence{margin-top:12px;padding:10px 12px;border-radius:13px;background:rgba(255,90,0,.08);color:#ffb184;font-size:12px;font-weight:800}
  @media(max-width:760px){.story-intel textarea{min-height:146px}.provenance-backdrop{padding:0}.provenance-sheet{border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:max(22px,env(safe-area-inset-bottom))}}`;
  document.head.appendChild(style);
}

function applyProfileToControls(profile){
  const territory=document.querySelector(`[data-mood="${profile.primaryTerritory}"]`);if(territory&&territory.getAttribute('aria-pressed')!=='true')territory.click();
  setActiveEmotionalState(profile.emotionalState);document.querySelectorAll('[data-emotional-state]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.emotionalState===profile.emotionalState)));
  const slider=document.getElementById('energySlider');if(slider){slider.value=String(Math.round(profile.energySuggestion*100));slider.dispatchEvent(new Event('input',{bubbles:true}));}
}
function renderAnalysis(panel,p){
  const signals=p.vibeSignals.length?p.vibeSignals.map(i=>i.label).join(' · '):'Balanced / open';
  panel.innerHTML=`<div class="story-analysis-head"><strong>Detected direction</strong><span>${Math.round(p.confidence*100)}% fit</span></div><div class="story-analysis-line"><b>${esc(titleCase(p.primaryTerritory))}</b> · <b>${esc(EMOTIONAL_STATES[p.emotionalState].label)}</b> · ${esc(signals)}</div><div class="story-analysis-line">Suggested Body Energy <b>${Math.round(p.energySuggestion*100)}%</b> · Suggested tempo <b>${p.tempoSuggestion.min}–${p.tempoSuggestion.max} BPM</b> · Start ${p.tempoSuggestion.center} BPM</div><div class="story-analysis-line">${esc(p.harmonicIntent)}</div><div class="story-mini-tags">${p.tags.slice(0,9).map(t=>`<span class="story-mini-tag">${esc(t)}</span>`).join('')}</div>`;panel.classList.add('show');
}
function renderRuntimeTags(){
  const meta=document.getElementById('metaRow');if(!meta)return;let row=document.getElementById('vibeRuntimeTags');if(!row){row=document.createElement('div');row.id='vibeRuntimeTags';row.className='vibe-runtime-tags';meta.insertAdjacentElement('afterend',row);}const r=window.__FORTISSIMO_VIBE_LAST_RESULT__;const tags=r?.tags||getActiveStoryProfile()?.tags||[];row.innerHTML=tags.slice(0,11).map(t=>`<span class="vibe-runtime-tag">${esc(t)}</span>`).join('');
}
function ensureProvenanceSheet(){let b=document.getElementById('vibeProvenanceBackdrop');if(b)return b;b=document.createElement('div');b.id='vibeProvenanceBackdrop';b.className='provenance-backdrop';b.innerHTML='<section class="provenance-sheet" role="dialog" aria-modal="true"><div class="provenance-grabber"></div><div id="vibeProvenanceContent"></div></section>';document.body.appendChild(b);b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-close-provenance]'))b.classList.remove('open');});return b;}
function openProvenance(){
  const engine=window.__FORTISSIMO_VIBE_ENGINE__;const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||engine?.lastResult;if(!engine||!result)return;const historical=(result.evidenceSummary?.supportedSongIds||[]).map(id=>engine.dataset?.songs?.find(s=>s.id===id)).filter(Boolean);const modern=result.lineage?.modernRelatives||[];const b=ensureProvenanceSheet();const c=b.querySelector('#vibeProvenanceContent');
  c.innerHTML=`<div class="provenance-head"><div><h3>HIT-DERIVED · VERIFIED</h3><div class="provenance-copy">Historical DNA stays separate from present-day relatives. Modern playback can transpose, revoice and change rhythm without pretending a modern artist authored the original progression.</div></div><button type="button" data-close-provenance>×</button></div><div class="provenance-section">Heritage source</div>${historical.length?historical.slice(0,4).map(s=>`<div class="provenance-song"><strong>${esc(s.title)}</strong><span>${esc(s.artist)} ${Number(s.peakRank)>0?`· chart peak #${s.peakRank}`:''}</span></div>`).join(''):'<div class="provenance-song"><strong>Verified harmonic source</strong><span>No displayable song metadata attached.</span></div>'}<div class="provenance-section">Contemporary relatives</div>${modern.length?modern.map(s=>`<div class="provenance-song"><strong>${esc(s.title)} — ${esc(s.artist)}</strong><span>${esc(s.displayChords||'')} · ${esc(s.matchType||s.evidenceClass)} · ${Math.round((s.confidence||0)*100)}% relative confidence</span><div class="provenance-note">${esc(s.note||'')}</div></div>`).join(''):'<div class="provenance-song"><strong>No exact modern-family match attached yet.</strong><span>The historical source can still be performed through the current modern keyboard language.</span></div>'}<div class="provenance-section">Modern performance lens</div><div class="provenance-note"><strong>${esc(MODERN_PERFORMANCE_LENS.label)}</strong><br>${esc(MODERN_PERFORMANCE_LENS.references.join(' · '))}<br>${esc(MODERN_PERFORMANCE_LENS.note)}</div><div class="provenance-confidence">Historical harmonic evidence confidence: ${Math.round((result.evidenceConfidence||0)*100)}%.</div>`;b.classList.add('open');
}

function installUi(){
  if(typeof document==='undefined'||document.getElementById('storyCreativeBrief'))return;installStyles();
  const territoryBlock=document.getElementById('moodGrid')?.parentElement;if(territoryBlock&&!document.getElementById('emotionalStateGrid')){const wrap=document.createElement('div');wrap.className='emotional-state-wrap';wrap.innerHTML=`<div class="emotional-state-title">Mood</div><div class="emotional-state-grid" id="emotionalStateGrid">${Object.values(EMOTIONAL_STATES).map((s,i)=>`<button class="emotional-state-btn" type="button" data-emotional-state="${s.id}" aria-pressed="${i===0?'true':'false'}">${s.label}<small>${s.description}</small></button>`).join('')}</div>`;territoryBlock.insertAdjacentElement('afterend',wrap);wrap.addEventListener('click',e=>{const btn=e.target.closest('[data-emotional-state]');if(!btn)return;setActiveEmotionalState(btn.dataset.emotionalState);wrap.querySelectorAll('[data-emotional-state]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));});}
  const titleField=document.getElementById('workingTitle')?.closest('.session-field');if(!titleField)return;const wrap=document.createElement('div');wrap.className='story-intel';wrap.innerHTML=`<label for="storyCreativeBrief">Story / Chapter / Creative Brief</label><textarea id="storyCreativeBrief" maxlength="2400" placeholder="Paste the story your team is writing from. Vibe Roulette will infer territory, Mood, vibe signals, Body Energy and tempo."></textarea><div class="story-intel-actions"><button class="story-analyze" id="storyAnalyzeBtn" type="button">Analyze story</button><span style="font-size:11px;color:rgba(255,255,255,.46)">Suggestion only — you can override Territory, Mood and Body Energy.</span></div><div class="story-analysis" id="storyAnalysisPanel"></div>`;titleField.insertAdjacentElement('afterend',wrap);
  const textarea=wrap.querySelector('#storyCreativeBrief'),button=wrap.querySelector('#storyAnalyzeBtn'),panel=wrap.querySelector('#storyAnalysisPanel');const restored=restoreProfile();if(restored?.text){textarea.value=restored.text;renderAnalysis(panel,restored);applyProfileToControls(restored);}else setActiveEmotionalState(getActiveEmotionalState());
  let timer=0;const analyze=({apply=true}={})=>{const text=textarea.value.trim();if(text.length<12){panel.classList.remove('show');clearProfile();renderRuntimeTags();return null;}const p=analyzeStoryLocally(text,{title:document.getElementById('workingTitle')?.value||''});persistProfile(p);renderAnalysis(panel,p);if(apply)applyProfileToControls(p);renderRuntimeTags();document.dispatchEvent(new CustomEvent('fortissimo:vibe-story-analyzed',{detail:p}));return p;};button.addEventListener('click',()=>analyze({apply:true}));textarea.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>analyze({apply:true}),720);});document.getElementById('workingTitle')?.addEventListener('change',()=>{if(textarea.value.trim().length>=12)analyze({apply:false});});
  document.addEventListener('click',e=>{const chip=e.target.closest?.('.meta-row .chip.verified');if(chip){e.preventDefault();openProvenance();}});const meta=document.getElementById('metaRow');if(meta){new MutationObserver(()=>{const chip=meta.querySelector('.chip.verified');if(chip){chip.setAttribute('role','button');chip.setAttribute('tabindex','0');chip.setAttribute('aria-label','Show hit lineage and modern relatives');}renderRuntimeTags();}).observe(meta,{childList:true,subtree:true,characterData:true});}renderRuntimeTags();
}

if(typeof window!=='undefined'){restoreProfile();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else queueMicrotask(installUi);}
