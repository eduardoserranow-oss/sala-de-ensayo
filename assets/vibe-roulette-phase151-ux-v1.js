const TERRITORY_LABELS={illusion:'Illusion',nostalgia:'Nostalgia',connection:'Connection',desire:'Desire',introspection:'Introspection',calm:'Calm',liberation:'Liberation'};

function installStyles(){
  if(document.getElementById('vr-phase151-styles'))return;
  const s=document.createElement('style');s.id='vr-phase151-styles';s.textContent=`
  .vr-compact-meta{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 12px}.vr-compact-meta span{display:inline-flex;align-items:center;min-height:30px;padding:5px 10px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.68);font-size:11px;font-weight:780}.vr-compact-meta span:first-child{border-color:rgba(255,90,0,.28);color:#ffad7d}
  .chorus.vr-section-near-main{margin:14px 0 12px;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.018)}.vr-section-type{display:inline-flex;margin:0 0 8px;padding:4px 8px;border:1px solid rgba(255,90,0,.28);border-radius:999px;color:#ff9a5b;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.chorus.vr-section-near-main .chorus-label{font-size:10px;letter-spacing:.17em;color:#ff7a2b}.chorus.vr-section-near-main h3{margin-top:5px}.vr-section-switcher{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.vr-section-switcher button{min-height:48px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#101010;color:#fff;font-weight:900}.vr-section-switcher button.is-active{border-color:#ff5a00;background:rgba(255,90,0,.13);color:#ffad7d;box-shadow:0 0 0 1px rgba(255,90,0,.1)}.vr-section-switcher button:disabled{opacity:.38}.vr-section-status{margin-top:8px;color:rgba(255,255,255,.46);font-size:10px;line-height:1.4}.details-inner .variation-summary{margin-top:0}.details-inner #metaRow{margin-top:10px}
  @media(max-width:760px){.vr-compact-meta{gap:5px;margin:8px 0 10px}.vr-compact-meta span{font-size:9px;min-height:26px;padding:4px 8px}.chorus.vr-section-near-main{padding:14px;margin:10px 0}.vr-section-switcher button{min-height:46px;font-size:12px}}
  `;document.head.appendChild(s);
}

function bpmText(){
  const energy=document.getElementById('energyValue')?.textContent||'';
  const m=energy.match(/(\d+)\s*BPM/i);return m?`${m[1]} BPM`:'';
}
function compactItems(){
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||{};
  const texts=[...document.querySelectorAll('#metaRow > *')].map(el=>(el.textContent||'').trim()).filter(Boolean);
  const bpm=texts.find(t=>/\bBPM\b/i.test(t))||bpmText();
  const family=texts.find(t=>/relative-minor|afro.*family|2[–-]3[–-]6|6[–-]2[–-]3/i.test(t))||result.intent?.afroLanguage?.label||result.intent?.afroLanguage?.id||'';
  const territoryId=result.storyProfile?.primaryTerritory||result.mood||'';
  const territory=TERRITORY_LABELS[territoryId]||territoryId;
  const energy=texts.find(t=>/energy fit/i.test(t))||`${Math.round(Number(result.intent?.energyFit??1)*100)}% energy fit`;
  return [...new Set([bpm,family,territory,energy].map(String).filter(Boolean))].slice(0,4);
}
function syncCompactMeta(){
  const box=document.getElementById('vrCompactMeta');if(!box)return;
  box.innerHTML=compactItems().map(text=>`<span>${text}</span>`).join('');
}

function moveMetadataIntoDetails(){
  const details=document.querySelector('.details-toggle .details-inner');
  const variation=document.getElementById('variationSummary');const meta=document.getElementById('metaRow');
  if(!details||!variation||!meta)return;
  if(!document.getElementById('vrCompactMeta')){
    const compact=document.createElement('div');compact.id='vrCompactMeta';compact.className='vr-compact-meta';
    variation.insertAdjacentElement('beforebegin',compact);
  }
  if(variation.parentElement!==details)details.insertAdjacentElement('afterbegin',variation);
  if(meta.parentElement!==details)variation.insertAdjacentElement('afterend',meta);
  syncCompactMeta();
}

function moveSectionBelowMain(){
  const chorus=document.querySelector('.chorus');const wrap=document.getElementById('eightbarWrap');if(!chorus||!wrap)return;
  chorus.classList.add('vr-section-near-main');
  const label=chorus.querySelector('.chorus-label');if(label)label.textContent='SECTION DIRECTION';
  if(!chorus.querySelector('.vr-section-type')){const type=document.createElement('div');type.className='vr-section-type';type.textContent='Chorus';label?.insertAdjacentElement('afterend',type);}
  if(wrap.nextElementSibling!==chorus)wrap.insertAdjacentElement('afterend',chorus);
}

function sectionData(){
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||{};
  let chords=result?.chorusVariation?.chords||[];
  let roman=result?.chorusVariation?.roman||[];
  if(!chords.length)chords=[...document.querySelectorAll('#chorusChords .chorus-chord')].map(el=>(el.textContent||'').trim()).filter(Boolean);
  return {result,chords,roman};
}
function sectionReady(){return sectionData().chords.length>0;}
function syncSectionAvailability(){
  const play=document.getElementById('playChorusBtn');const main=document.getElementById('mainProgressionBtn');const ready=sectionReady();
  if(play)play.disabled=!ready;
  if(main)main.disabled=!ready;
}

async function ensureTransport(){
  let t=window.__FORTISSIMO_VIBE_TRANSPORT__;
  if(t?.running)return t;
  const primary=document.getElementById('loopBtn');if(!primary||primary.disabled)return null;
  primary.click();
  for(let i=0;i<60&&!window.__FORTISSIMO_VIBE_TRANSPORT__?.running;i+=1)await new Promise(r=>setTimeout(r,70));
  return window.__FORTISSIMO_VIBE_TRANSPORT__||null;
}
function errorMessage(message){const box=document.getElementById('errorBox');if(box){box.textContent=message;box.classList.add('show');}}
function paintSwitcher(){
  const mode=window.__FORTISSIMO_ACTIVE_SECTION__||'main';
  document.getElementById('playChorusBtn')?.classList.toggle('is-active',mode==='chorus');
  document.getElementById('mainProgressionBtn')?.classList.toggle('is-active',mode==='main');
  const status=document.getElementById('vrSectionStatus');if(status)status.textContent=mode==='chorus'?'Section progression is active. Main remains ready on the same transport.':'Main progression is active. Section remains ready on the same transport.';
  syncSectionAvailability();
}

function installSectionSwitcher(){
  const old=document.getElementById('playChorusBtn');if(!old)return;
  if(document.getElementById('mainProgressionBtn')){syncSectionAvailability();paintSwitcher();return;}
  const row=old.closest('.action-row')||old.parentElement;if(!row)return;
  const play=old.cloneNode(true);play.id='playChorusBtn';play.textContent='▶ Play Section';play.dataset.phase151='1';old.replaceWith(play);
  row.classList.add('vr-section-switcher');
  const main=document.createElement('button');main.id='mainProgressionBtn';main.type='button';main.className=play.className;main.textContent='↩ Main Progression';row.appendChild(main);
  const legacyHint=row.nextElementSibling?.classList?.contains('vr-section-hint')?row.nextElementSibling:null;if(legacyHint)legacyHint.remove();
  const status=document.createElement('div');status.id='vrSectionStatus';status.className='vr-section-status';status.textContent='Main progression is active. Section remains ready on the same transport.';row.insertAdjacentElement('afterend',status);
  syncSectionAvailability();
  play.addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    try{
      const {result,chords,roman}=sectionData();if(!chords.length)throw new Error('No section progression is loaded yet.');
      const t=await ensureTransport();if(!t?.running)throw new Error('Play Chords could not start the shared transport.');
      if(window.__FORTISSIMO_ACTIVE_SECTION__==='chorus'){paintSwitcher();return;}
      await t.switchToSection(chords,{roman,mood:result?.mood,emotionFilters:result?.emotionFilters,performancePattern:result?.performancePattern});
    }catch(error){errorMessage(error.message||String(error));}
  },true);
  main.addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    try{
      if(!sectionReady())throw new Error('No section progression is loaded yet.');
      const t=await ensureTransport();if(!t?.running)throw new Error('Play Chords could not start the shared transport.');
      if(window.__FORTISSIMO_ACTIVE_SECTION__!=='main')await t.returnToMain();
      paintSwitcher();
    }catch(error){errorMessage(error.message||String(error));}
  },true);
  document.addEventListener('fortissimo:vibe-section-change',paintSwitcher);paintSwitcher();
}

function watchResult(){
  const meta=document.getElementById('metaRow');const key=document.getElementById('resultKey');const chorus=document.getElementById('chorusChords');
  const observer=new MutationObserver(()=>setTimeout(()=>{syncCompactMeta();syncSectionAvailability();moveSectionBelowMain();},0));
  if(meta)observer.observe(meta,{childList:true,subtree:true,characterData:true});if(key)observer.observe(key,{childList:true,subtree:true,characterData:true});if(chorus)observer.observe(chorus,{childList:true,subtree:true,characterData:true});
}
function install(){installStyles();moveMetadataIntoDetails();moveSectionBelowMain();installSectionSwitcher();watchResult();syncCompactMeta();syncSectionAvailability();}
if(typeof document!=='undefined'){const run=()=>setTimeout(install,55);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();}

export const PHASE151_INFO={version:'1.5.2',principle:'Main A/A-prime stays first, Section Direction follows directly below it, and both switching controls remain explicitly available on the shared transport.'};
