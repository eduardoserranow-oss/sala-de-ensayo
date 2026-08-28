const STORAGE_KEY='fortissimo.vibeRoulette.serraEmotion.v1';
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const normalizeText=(text='')=>String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9ñ'\s-]/g,' ').replace(/\s+/g,' ').trim();

export const SERRA_EMOTION_FAMILIES=[
  {id:'light-forward',label:'Luz / avance',description:'apertura, posibilidad y energía emocional positiva'},
  {id:'calm-resolution',label:'Calma / resolución',description:'estabilidad, aceptación y descanso emocional'},
  {id:'bond-desire',label:'Vínculo / deseo',description:'cercanía, atracción y conexión afectiva'},
  {id:'sensitive-pain',label:'Dolor sensible',description:'pérdida, fragilidad y tristeza con humanidad'},
  {id:'uncertainty',label:'Incertidumbre',description:'duda, inseguridad y tensión mental'},
  {id:'emotional-tension',label:'Tensión emocional',description:'fricción afectiva sin convertir a SERRA en agresivo'},
  {id:'processing',label:'Procesamiento',description:'mirar hacia dentro, soltar y transformar'}
];

function filter(id,label,emoji,family,territory,description,terms,effects={}){
  return {id,label,emoji,family,territory,description,terms,effects};
}

export const SERRA_EMOTION_FILTERS={
  joy:filter('joy','Alegría','☀️','light-forward','illusion','luz, disfrute y apertura',['alegria','feliz','felicidad','contento','contenta','disfrutar','sonreir','sonrisa','gozo','diversion'],{brightness:.22,stability:.05,tension:-.05}),
  hope:filter('hope','Esperanza','✨','light-forward','illusion','posibilidad que todavía se siente viva',['esperanza','ojala','tal vez','quizas','puede pasar','todavia puede','fe en','hope','maybe'],{brightness:.16,stability:.08,tension:-.04}),
  enthusiasm:filter('enthusiasm','Entusiasmo','⚡','light-forward','illusion','ganas, impulso y emoción por lo que viene',['entusiasmo','emocionado','emocionada','ganas de','ilusionado','ilusionada','no veo la hora','emocion por'],{brightness:.18,tension:.04,space:-.03}),
  euphoria:filter('euphoria','Euforia','🌟','light-forward','illusion','alegría intensa y expansión emocional',['euforia','euforico','euforica','demasiado feliz','felicidad enorme','extasis'],{brightness:.24,tension:.08,space:-.06}),
  strength:filter('strength','Fuerza','🔆','light-forward','liberation','determinación emocional y capacidad de seguir',['fuerza','fuerte','seguir adelante','me levanto','me levante','resistir','puedo con esto','superarme'],{brightness:.12,stability:.16,tension:.02}),
  curiosity:filter('curiosity','Curiosidad','👀','light-forward','illusion','interés por descubrir qué puede pasar',['curiosidad','curioso','curiosa','quiero saber','que pasaria','descubrir','conocer mas','intriga'],{brightness:.10,tension:.05,intimacy:.03}),
  optimism:filter('optimism','Optimismo','🌅','light-forward','illusion','mirada positiva hacia adelante',['optimismo','optimista','todo va a salir','va a estar bien','algo bueno','mejor vendra','lo bueno viene'],{brightness:.17,stability:.12,tension:-.04}),

  calm:filter('calm','Calma','🌿','calm-resolution','calm','respiración, estabilidad y espacio',['calma','tranquilo','tranquila','paz','respirar','sin prisa','despacio','quietud'],{stability:.20,tension:-.18,space:.18,intimacy:.06}),
  security:filter('security','Seguridad','🛡️','calm-resolution','calm','certeza afectiva, refugio y confianza',['seguridad','seguro','segura','confianza','lugar seguro','me siento protegido','me siento protegida','estabilidad'],{stability:.22,tension:-.15,intimacy:.04}),
  gratitude:filter('gratitude','Agradecimiento','🙏','calm-resolution','connection','gratitud por lo vivido o compartido',['agradecimiento','agradecido','agradecida','gracias por','valoro','valorar','afortunado','afortunada'],{brightness:.10,stability:.16,intimacy:.10}),
  fulfillment:filter('fulfillment','Plenitud','💫','calm-resolution','calm','sensación de completitud y bienestar',['plenitud','pleno','plena','completo','completa','satisfecho','satisfecha','todo esta bien'],{brightness:.12,stability:.19,tension:-.08}),
  acceptance:filter('acceptance','Aceptación','🤍','calm-resolution','calm','entender lo que es y dejar de pelear con ello',['aceptacion','acepto','aceptar','entendi que','entiendo que','es lo mejor','mereces algo mejor','por tu bien','no puedo cambiarlo'],{stability:.22,tension:-.18,space:.10}),
  serenity:filter('serenity','Serenidad','🍃','calm-resolution','calm','paz emocional profunda y sin urgencia',['serenidad','sereno','serena','en paz','tranquilidad profunda','sin ansiedad','todo en calma'],{stability:.24,tension:-.22,space:.18}),

  sensuality:filter('sensuality','Sensualidad','🌙','bond-desire','desire','cercanía elegante y tensión corporal suave',['sensual','sensualidad','piel','cuerpo','labios','cama','tocarnos','rozarnos','sexo','sexual'],{intimacy:.23,tension:.09,space:.06}),
  desire:filter('desire','Deseo','🔥','bond-desire','desire','atracción, ganas y tensión romántica',['deseo','te deseo','ganas de verte','quiero verte','quiero besarte','atraccion','me atraes','me gustas','te quiero cerca'],{intimacy:.18,tension:.14,brightness:.04}),
  intimacy:filter('intimacy','Intimidad','🫶','bond-desire','connection','cercanía emocional o física protegida',['intimidad','intimo','intima','solo nosotros','en privado','cercania','cerca de ti','abrirnos','confianza entre'],{intimacy:.25,space:.12,tension:-.02}),
  tenderness:filter('tenderness','Ternura','🧡','bond-desire','connection','cuidado, cariño y suavidad afectiva',['ternura','carino','cariño','cuidarte','cuidar de ti','abrazo','mereces algo mejor','te quiero bien','dulzura'],{intimacy:.20,stability:.10,brightness:.06}),

  sadness:filter('sadness','Tristeza','💧','sensitive-pain','nostalgia','dolor, pérdida y emoción que pesa',['triste','tristeza','dolor','duele','llorar','lagrimas','pena','corazon roto','me duele'],{brightness:-.20,tension:.09,stability:-.05,space:.09}),
  melancholy:filter('melancholy','Melancolía','🌫️','sensitive-pain','nostalgia','tristeza contemplativa y memoria viva',['melancolia','melancolico','melancolica','recuerdo','recordar','extrañar','extrano','pasado','nostalgia','añorar'],{brightness:-.18,tension:.06,space:.12,intimacy:.04}),
  vulnerability:filter('vulnerability','Vulnerabilidad','🫧','sensitive-pain','introspection','fragilidad, honestidad y exposición emocional',['vulnerable','vulnerabilidad','fragil','miedo de decir','no me atrevo','no pude darte','no podia amarte','no supe amarte','falle','fallé'],{stability:-.10,tension:.11,intimacy:.12,space:.08}),
  abandonment:filter('abandonment','Abandono','🕳️','sensitive-pain','nostalgia','sentirse dejado, reemplazado o solo',['abandono','abandonado','abandonada','me dejaste','te fuiste','me cambiaste','me reemplazaste','solo otra vez','sola otra vez'],{brightness:-.17,stability:-.16,tension:.18,intimacy:-.03}),
  grief:filter('grief','Pena','🥀','sensitive-pain','nostalgia','duelo, pérdida profunda o despedida',['duelo','pena','perdida','perdí','despedida','se murio','fallecio','ya no esta','no volvera'],{brightness:-.22,stability:-.10,tension:.16,space:.10}),

  anxiety:filter('anxiety','Ansiedad','⚠️','uncertainty','introspection','urgencia interna, presión y anticipación negativa',['ansiedad','ansioso','ansiosa','no puedo respirar','me acelera','me desespera','nervioso','nerviosa','angustia'],{tension:.22,stability:-.15,space:-.06}),
  insecurity:filter('insecurity','Inseguridad','🫥','uncertainty','introspection','miedo a no ser suficiente o a perder algo',['inseguridad','inseguro','insegura','no soy suficiente','no se si me quiere','miedo a perderte','compararme','dudar de mi'],{tension:.18,stability:-.17,intimacy:.04}),
  confusion:filter('confusion','Confusión','❔','uncertainty','introspection','emociones mezcladas y dificultad para entender lo que pasa',['confusion','confundido','confundida','no entiendo','no se que siento','no se que somos','que somos','no se que hacer'],{tension:.14,stability:-.10,space:.03}),
  worry:filter('worry','Preocupación','🌀','uncertainty','introspection','pensamiento insistente sobre lo que puede salir mal',['preocupacion','preocupado','preocupada','me preocupa','y si sale mal','y si te pierdo','pensando demasiado'],{tension:.17,stability:-.09}),
  disillusionment:filter('disillusionment','Desilusión','🌧️','uncertainty','nostalgia','caída de una expectativa o promesa emocional',['desilusion','desilusionado','desilusionada','decepcion','decepcionado','decepcionada','no era lo que creia','me fallaste'],{brightness:-.16,stability:-.10,tension:.12}),

  frustration:filter('frustration','Frustración','😤','emotional-tension','introspection','impotencia, choque y emoción contenida',['frustracion','frustrado','frustrada','no puedo mas','por mas que intento','impotencia','me cansa','me harto'],{tension:.20,stability:-.08}),
  resentment:filter('resentment','Resentimiento','🧱','emotional-tension','nostalgia','dolor acumulado, reclamo y memoria amarga',['resentimiento','rencor','no te perdono','me lo debes','todavia me molesta','me hiciste daño','reclamo'],{tension:.22,intimacy:-.08,brightness:-.08}),
  jealousy:filter('jealousy','Celos','👁️','emotional-tension','desire','miedo relacional, comparación y posesividad',['celos','celoso','celosa','con otra','con otro','quien es ella','quien es el','me da celos','no quiero compartirte'],{tension:.23,stability:-.12,intimacy:.06}),

  introspection:filter('introspection','Introspección','🪞','processing','introspection','mirar hacia dentro, cuestionarse y comprenderse',['introspeccion','reflexionar','pensar en mi','darme cuenta','me di cuenta','entenderme','quien soy','qué quiero','que quiero','procesar','aprendiendo'],{space:.20,tension:.04,intimacy:.07,brightness:-.04}),
  liberation:filter('liberation','Liberación','🕊️','processing','liberation','soltar, cerrar y recuperar libertad',['liberacion','libre','soltar','dejar ir','deje ir','te deje ir','seguir adelante','superar','cerrar ciclo','cerrar este capitulo','pasar pagina','ya te solte'],{brightness:.14,stability:.15,tension:-.12,space:.05})
};

export function normalizeEmotionFilters(filters=[]){
  return [...new Set((filters||[]).map(String).filter(id=>SERRA_EMOTION_FILTERS[id]))].slice(0,4);
}

export function getActiveSerraEmotionFilters(){
  if(typeof window==='undefined')return [];
  if(Array.isArray(window.__FORTISSIMO_SERRA_EMOTION_FILTERS__))return normalizeEmotionFilters(window.__FORTISSIMO_SERRA_EMOTION_FILTERS__);
  try{return normalizeEmotionFilters(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'));}catch(_){return [];}
}

export function setActiveSerraEmotionFilters(filters,{persist=true}={}){
  const normalized=normalizeEmotionFilters(filters);
  if(typeof window!=='undefined'){
    window.__FORTISSIMO_SERRA_EMOTION_FILTERS__=normalized;
    if(persist)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));}catch(_){}
    document.dispatchEvent(new CustomEvent('fortissimo:serra-emotion-change',{detail:{filters:normalized,profile:buildSerraEmotionProfile(normalized)}}));
  }
  return normalized;
}

function countMatches(text,terms=[]){let score=0;for(const term of terms){const phrase=normalizeText(term);if(phrase&&text.includes(phrase))score+=1;}return score;}

export function inferSerraEmotionFilters(text,{primaryTerritory='connection',secondaryTerritory=null,limit=4}={}){
  const normalized=normalizeText(text);const scores={};
  for(const [id,item] of Object.entries(SERRA_EMOTION_FILTERS))scores[id]=countMatches(normalized,item.terms||[]);
  const boost=(id,value)=>{scores[id]=(scores[id]||0)+value;};

  if(/te deje ir|deje ir|dejarte ir|soltar|seguir adelante|cerrar (este )?capitulo|pasar pagina|mereces algo mejor/.test(normalized)){boost('liberation',3.3);boost('acceptance',2.5);}
  if(/no podia amarte|no supe amarte|no pude darte|no te pude dar|mereces algo mejor|merecias algo mejor/.test(normalized)){boost('vulnerability',2.7);boost('sadness',1.8);boost('tenderness',1.4);}
  if(/se termino|terminamos|ruptura|ya no estamos|despedida|te fuiste|me dejaste/.test(normalized)){boost('sadness',2.2);boost('melancholy',1.7);}
  if(/amarte|me amas|me amabas|te amo|te quiero|cuidarte|mereces/.test(normalized)){boost('tenderness',1.5);boost('intimacy',.8);}
  if(/quimica|piel|beso|besarte|atraccion|ganas de verte|quiero verte/.test(normalized)){boost('desire',2);boost('sensuality',1.4);}
  if(/no se que somos|no se que siento|que somos|no entiendo lo que pasa/.test(normalized)){boost('confusion',2.4);boost('insecurity',1.3);}
  if(/no puedo dejar de pensar|no puedo soltarte|me consume|necesito verte|no puedo sin ti/.test(normalized)){boost('anxiety',2.1);boost('insecurity',1.5);boost('desire',1.2);}
  if(/me engano|me engaño|traicion|mentira|con otra|con otro/.test(normalized)){boost('resentment',2);boost('frustration',1.5);boost('jealousy',1.2);}

  const territoryAnchors={
    illusion:[['hope',1.35],['optimism',1],['curiosity',.75]],
    nostalgia:[['sadness',1.25],['melancholy',1.35],['vulnerability',.55]],
    connection:[['intimacy',1.2],['tenderness',1.15],['gratitude',.45]],
    desire:[['desire',1.55],['sensuality',1.2],['intimacy',.55]],
    introspection:[['introspection',1.55],['confusion',.6],['vulnerability',.55]],
    calm:[['calm',1.45],['acceptance',1.2],['serenity',1]],
    liberation:[['liberation',1.65],['acceptance',1.3],['hope',.65],['strength',.55]]
  };
  for(const [id,value] of territoryAnchors[primaryTerritory]||[])boost(id,value);
  for(const [id,value] of territoryAnchors[secondaryTerritory]||[])boost(id,value*.42);

  const ranked=Object.entries(scores).filter(([,score])=>score>0).sort((a,b)=>b[1]-a[1]);
  const selected=[];
  for(const [id] of ranked){if(selected.length>=limit)break;selected.push(id);}
  if(!selected.length){for(const [id] of (territoryAnchors[primaryTerritory]||[]).slice(0,2))selected.push(id);}
  return normalizeEmotionFilters(selected);
}

export function deriveCompositeEmotionalState(filters=[],primaryTerritory='connection'){
  const active=new Set(normalizeEmotionFilters(filters));
  if(active.has('resentment')||active.has('frustration')||active.has('jealousy'))return 'spite';
  if((active.has('anxiety')||active.has('insecurity'))&&(active.has('desire')||primaryTerritory==='desire'))return 'suffocation';
  if(['sadness','melancholy','abandonment','grief','disillusionment'].some(id=>active.has(id))||primaryTerritory==='nostalgia'||primaryTerritory==='liberation')return 'heartbreak';
  return 'love';
}

export function buildSerraEmotionProfile(filters=[],primaryMood='connection'){
  const active=normalizeEmotionFilters(filters);
  const vector={brightness:.5,tension:.38,intimacy:.45,stability:.55,space:.48,movement:.5,body:.5};
  for(const id of active){const effects=SERRA_EMOTION_FILTERS[id]?.effects||{};for(const [axis,delta] of Object.entries(effects))vector[axis]=(vector[axis]??.5)+Number(delta||0);}
  Object.keys(vector).forEach(key=>{vector[key]=clamp(vector[key],0,1);});
  const families=[...new Set(active.map(id=>SERRA_EMOTION_FILTERS[id]?.family).filter(Boolean))];
  return {version:2,filters:active,primaryMood,vector,families,
    bodyEnergyIndependent:true,
    identity:'Ilusión · Nostalgia · Conexión en movimiento · urbano bailable con alma · sensual elegante · comercial con identidad'};
}

export function serraEmotionProgressionWeight(item={},filters=[],primaryMood='connection'){
  const profile=buildSerraEmotionProfile(filters,primaryMood);
  if(!profile.filters.length)return 1;
  const mood=item.mood||{};
  const affinity=(value,target)=>{const numeric=Number(value);return 1-Math.abs((Number.isFinite(numeric)?numeric:.5)-target);};
  let score=.68;
  score+=affinity(mood.brightness,profile.vector.brightness)*.11;
  score+=affinity(mood.tension,profile.vector.tension)*.12;
  score+=affinity(mood.stability,profile.vector.stability)*.10;
  score+=affinity(mood.sensuality,profile.vector.intimacy)*.08;
  const has=id=>profile.filters.includes(id);
  if(['joy','hope','enthusiasm','euphoria','strength','curiosity','optimism','liberation'].some(has))score+=Number(mood.illusion||.5)*.10;
  if(['sadness','melancholy','vulnerability','abandonment','grief','disillusionment','resentment'].some(has))score+=Number(mood.nostalgia||.5)*.12;
  if(['calm','security','gratitude','fulfillment','acceptance','serenity','intimacy','tenderness','sensuality','desire'].some(has))score+=Number(mood.connection||.5)*.09;
  if(['sensuality','desire','jealousy'].some(has))score+=Number(mood.sensuality||.5)*.10;
  if(['anxiety','insecurity','confusion','worry','frustration','resentment','jealousy'].some(has))score+=Number(mood.tension||.5)*.09;
  return clamp(score,.72,1.52);
}

export function serraPerformanceDirection(filters=[],primaryMood='connection'){
  const profile=buildSerraEmotionProfile(filters,primaryMood);const {vector}=profile;
  const active=new Set(profile.filters);
  const behind=['sensuality','desire','intimacy','calm','serenity'].some(id=>active.has(id));
  const pressured=['anxiety','frustration','jealousy'].some(id=>active.has(id));
  return {
    profile,
    articulation:vector.space>.68?'breathing-legato':vector.tension>.62?'defined-contained':'balanced-conversation',
    topLine:vector.brightness>.64?'gently-rising':vector.brightness<.38?'falling-yearning':vector.intimacy>.66?'stable-singing-tone':'small-arc',
    responseDensity:clamp(.43+vector.tension*.20+vector.intimacy*.19-vector.space*.16,.34,.78),
    sustainRatio:clamp(.43+vector.space*.32+vector.intimacy*.08-vector.tension*.10,.40,.80),
    velocityScale:clamp(.86+vector.tension*.10+vector.brightness*.05,.84,1.05),
    timingFeel:behind?'slightly-behind':pressured?'contained-forward':'human-center',
    ornamentAllowance:vector.intimacy>.60||vector.space>.62?3:2,
    bodyEnergyIndependent:true
  };
}

function installFilterStyles(){
  if(typeof document==='undefined'||document.getElementById('serra-emotion-v2-styles'))return;
  const style=document.createElement('style');style.id='serra-emotion-v2-styles';style.textContent=`
  #serraFilterGrid.serra-filter-shell{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
  .serra-filter-active{display:flex;gap:7px;flex-wrap:wrap;min-width:0}.serra-filter-active.empty{color:rgba(255,255,255,.42);font-size:11px;line-height:1.4}
  .serra-active-chip{display:inline-flex;align-items:center;gap:5px;min-height:35px;padding:0 10px;border:1px solid rgba(255,90,0,.34);border-radius:999px;background:rgba(255,90,0,.075);color:#fff;font-size:11px;font-weight:850}
  .serra-edit-filters{min-height:38px;border:1px solid rgba(255,90,0,.55);border-radius:999px;background:rgba(255,90,0,.07);color:#ff9a5b;padding:0 13px;font:inherit;font-size:11px;font-weight:900;white-space:nowrap}
  .serra-filter-backdrop{position:fixed;inset:0;z-index:245;display:flex;align-items:flex-end;justify-content:center;padding:18px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);opacity:0;visibility:hidden;pointer-events:none;transition:.18s ease}.serra-filter-backdrop.open{opacity:1;visibility:visible;pointer-events:auto}
  .serra-filter-sheet{width:min(720px,100%);max-height:84svh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#0b0b0b;padding:18px 18px max(22px,env(safe-area-inset-bottom));box-shadow:0 -20px 70px rgba(0,0,0,.45)}
  .serra-filter-grabber{width:46px;height:4px;border-radius:999px;background:rgba(255,255,255,.22);margin:-5px auto 15px}.serra-filter-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:7px}.serra-filter-head h3{margin:0;font-size:20px}.serra-filter-head p{margin:5px 0 0;color:rgba(255,255,255,.52);font-size:11px;line-height:1.4}.serra-filter-close{margin-left:auto;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:22px}
  .serra-filter-family{padding:13px 0;border-top:1px solid rgba(255,255,255,.07)}.serra-filter-family:first-of-type{border-top:0}.serra-filter-family-title{font-size:11px;font-weight:950;color:#ff9a5b;letter-spacing:.08em;text-transform:uppercase}.serra-filter-family-copy{margin:3px 0 9px;color:rgba(255,255,255,.43);font-size:10px}.serra-filter-options{display:flex;gap:7px;flex-wrap:wrap}.serra-filter-option{min-height:40px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.035);color:#ddd;padding:0 11px;font:inherit;font-size:11px;font-weight:800}.serra-filter-option[aria-pressed="true"]{border-color:rgba(255,90,0,.72);background:rgba(255,90,0,.13);color:#fff}
  @media(max-width:640px){#serraFilterGrid.serra-filter-shell{grid-template-columns:1fr}.serra-edit-filters{justify-self:start}.serra-filter-backdrop{padding:0}.serra-filter-sheet{border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;max-height:88svh}.serra-filter-option{min-height:44px}}
  `;document.head.appendChild(style);
}

export function renderSerraEmotionFilterUi(filters=getActiveSerraEmotionFilters()){
  if(typeof document==='undefined')return;const grid=document.getElementById('serraFilterGrid');if(!grid||grid.dataset.emotionV2!=='1')return;
  const active=normalizeEmotionFilters(filters);const summary=grid.querySelector('[data-serra-active]');
  if(summary){summary.classList.toggle('empty',!active.length);summary.innerHTML=active.length?active.map(id=>{const item=SERRA_EMOTION_FILTERS[id];return `<span class="serra-active-chip">${item.emoji} ${item.label}</span>`;}).join(''):'Analyze Story or choose up to 4 emotional filters.';}
  grid.querySelectorAll('[data-serra-filter]').forEach(button=>button.setAttribute('aria-pressed',String(active.includes(button.dataset.serraFilter))));
}

export function installSerraEmotionFilterUi(){
  if(typeof document==='undefined')return;const grid=document.getElementById('serraFilterGrid');if(!grid||grid.dataset.emotionV2==='1')return;
  installFilterStyles();grid.dataset.emotionV2='1';grid.classList.add('serra-filter-shell');
  const familyHtml=SERRA_EMOTION_FAMILIES.map(family=>{
    const options=Object.values(SERRA_EMOTION_FILTERS).filter(item=>item.family===family.id);
    return `<section class="serra-filter-family"><div class="serra-filter-family-title">${family.label}</div><div class="serra-filter-family-copy">${family.description}</div><div class="serra-filter-options">${options.map(item=>`<button type="button" class="serra-filter-option" data-serra-filter="${item.id}" aria-pressed="false" title="${item.description}">${item.emoji} ${item.label}</button>`).join('')}</div></section>`;
  }).join('');
  grid.innerHTML=`<div class="serra-filter-active empty" data-serra-active></div><button type="button" class="serra-edit-filters" data-serra-edit>Edit filters</button><div class="serra-filter-backdrop" data-serra-backdrop><section class="serra-filter-sheet" role="dialog" aria-modal="true" aria-label="Serra Emotional Filters"><div class="serra-filter-grabber"></div><div class="serra-filter-head"><div><h3>Serra Emotional Filters</h3><p>Choose up to 4. These are emotional ingredients; Body Energy controls movement and BPM separately.</p></div><button type="button" class="serra-filter-close" data-serra-close aria-label="Close">×</button></div>${familyHtml}</section></div>`;
  grid.addEventListener('click',event=>{const edit=event.target.closest('[data-serra-edit]');const close=event.target.closest('[data-serra-close]');const backdrop=event.target.closest('[data-serra-backdrop]');const panel=grid.querySelector('[data-serra-backdrop]');if(edit){panel?.classList.add('open');return;}if(close||event.target===backdrop){panel?.classList.remove('open');}});
  document.addEventListener('fortissimo:serra-emotion-change',event=>renderSerraEmotionFilterUi(event.detail?.filters||[]));
  renderSerraEmotionFilterUi();
}

export const SERRA_EMOTION_INFO={
  version:2,
  filterCount:Object.keys(SERRA_EMOTION_FILTERS).length,
  families:SERRA_EMOTION_FAMILIES.map(item=>item.label),
  axes:['Fiesta ↔ Introspección','Ilusión / deseo ↔ Conexión emocional','Movimiento ↔ Calma'],
  principle:'Emotional Filters describe the story precisely. Body Energy independently controls BPM, groove and physical movement.'
};
