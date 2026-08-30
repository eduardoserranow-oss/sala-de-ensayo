import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js';

const api=window.fortissimoDesktop;
const capabilities=Array.isArray(api?.capabilities)?api.capabilities:[];
const canDrag=Boolean(api?.isDesktop&&capabilities.includes('midi-stage')&&capabilities.includes('midi-drag')&&typeof api.stageMidiPair==='function'&&typeof api.startMidiDrag==='function');
const canExport=Boolean(capabilities.includes('midi-export-native')&&typeof api.chooseMidiExportFolder==='function'&&typeof api.saveStagedMidi==='function'&&typeof api.openMidiExportFolder==='function');
const canProjectWorkflow=Boolean(canExport&&capabilities.includes('midi-project-workflow'));
if(!canDrag)throw new Error('FORTISSIMO Desktop MIDI bridge is unavailable.');

document.documentElement.classList.add('fortissimo-desktop');
document.body.classList.add('fortissimo-desktop');

const SESSION_STORAGE_KEY='fortissimo.desktop.projectSessions.v1';
const MAX_RECENT_SESSIONS=12;

const style=document.createElement('style');
style.id='fortissimo-desktop-workspace-style';
style.textContent=`
@media(min-width:1000px){
  body.fortissimo-desktop .vr-shell{width:min(1540px,calc(100vw - 64px));padding:24px 28px 54px;overflow:visible}
  body.fortissimo-desktop .vr-top{margin-bottom:26px;align-items:flex-end}
  body.fortissimo-desktop .vr-title{font-size:clamp(54px,5vw,78px)}
  body.fortissimo-desktop .vr-grid{grid-template-columns:minmax(320px,.72fr) minmax(720px,1.78fr);gap:24px;align-items:start}
  body.fortissimo-desktop .vr-session{position:sticky;top:calc(var(--fortissimo-header-height) + 18px);max-height:calc(100vh - var(--fortissimo-header-height) - 36px);overflow:auto;scrollbar-width:thin}
  body.fortissimo-desktop .vr-panel{padding:24px}
  body.fortissimo-desktop .bar-grid{gap:12px}
  body.fortissimo-desktop .slot-card{min-height:126px}
  body.fortissimo-desktop .slot-value{font-size:clamp(28px,2.5vw,42px)}
  body.fortissimo-desktop .feedback-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
}
.vr-daw-dock{margin-top:14px;padding:14px;border:1px solid rgba(255,90,0,.38);border-radius:18px;background:linear-gradient(145deg,rgba(255,90,0,.09),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.025);display:grid;gap:10px}
.vr-daw-dock-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vr-daw-dock-label{font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:#ff8a45}.vr-daw-dock-state{font-size:10px;color:rgba(255,255,255,.48);text-align:right}
.vr-project-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.vr-project-copy{min-width:0;display:grid;gap:2px}.vr-project-copy small{font-size:8px;font-weight:900;letter-spacing:.12em;color:rgba(255,255,255,.38);text-transform:uppercase}.vr-project-copy strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-project-folder{font-size:9px;color:#ff9b61;white-space:nowrap;max-width:42%;overflow:hidden;text-overflow:ellipsis}
.vr-daw-drag{min-height:62px;width:100%;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid rgba(255,90,0,.7);border-radius:14px;background:#15100d;color:#ffad7c;font-weight:950;font-size:14px;letter-spacing:.02em;cursor:grab;user-select:none;-webkit-user-select:none;transition:.16s ease}.vr-daw-drag:hover{background:#1c120d;border-color:#ff6b1a;transform:translateY(-1px)}.vr-daw-drag:active{cursor:grabbing;transform:scale(.995)}.vr-daw-drag[aria-disabled=true]{opacity:.48;cursor:default;transform:none}.vr-daw-drag-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(255,90,0,.14);font-size:18px}.vr-daw-drag-copy{display:grid;gap:3px;text-align:left}.vr-daw-drag-copy small{font-size:10px;font-weight:700;color:rgba(255,255,255,.48)}
.vr-daw-layer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vr-daw-layer{min-height:46px;padding:8px 10px;border:1px solid rgba(255,255,255,.11);border-radius:11px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.78);font-size:10px;font-weight:900;cursor:grab;text-align:left;overflow:hidden}.vr-daw-layer small{display:block;margin-top:3px;font-size:8px;font-weight:700;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-daw-layer[aria-disabled=true]{opacity:.4;cursor:default}
.vr-project-actions{display:grid;grid-template-columns:1.15fr .85fr;gap:7px}.vr-project-subactions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.vr-project-btn{min-height:36px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.72);font-size:9px;font-weight:850;cursor:pointer}.vr-project-btn.primary{border-color:rgba(255,90,0,.52);background:rgba(255,90,0,.1);color:#ff9b61}.vr-project-btn:disabled{opacity:.4;cursor:default}
.vr-session-intel{display:grid;gap:8px;padding-top:4px;border-top:1px solid rgba(255,255,255,.07)}.vr-session-intel-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.vr-session-intel-head strong{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.68)}.vr-session-intel-head button{border:0;background:transparent;color:#ff995e;font-size:9px;font-weight:850;cursor:pointer;padding:4px 0}.vr-session-list{display:grid;gap:6px;max-height:186px;overflow:auto;scrollbar-width:thin}.vr-session-empty{padding:9px 10px;border:1px dashed rgba(255,255,255,.09);border-radius:10px;font-size:9px;color:rgba(255,255,255,.38);text-align:center}.vr-session-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 9px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025)}.vr-session-card-copy{min-width:0;display:grid;gap:3px}.vr-session-card-title{font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-session-card-meta{font-size:8px;color:rgba(255,255,255,.43);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-session-card-actions{display:flex;gap:5px}.vr-session-card-actions button{min-height:28px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.03);color:rgba(255,255,255,.7);font-size:8px;font-weight:850;cursor:pointer}.vr-session-card-actions button:first-child{border-color:rgba(255,90,0,.36);color:#ff9b61}.vr-session-snapshot{padding:8px 10px;border-radius:10px;background:rgba(255,90,0,.055);font-size:8px;line-height:1.45;color:rgba(255,255,255,.5)}
.vr-daw-help{text-align:center;color:rgba(255,255,255,.42);font-size:9px;line-height:1.4}
body.fortissimo-desktop #vrPhase6Export,body.fortissimo-desktop #vrNativeMidiDrag{display:none!important}
`;
document.head.appendChild(style);

let staged=null,serial=0,timer=null,folderLabel='';
function ready(){return Boolean(window.__FORTISSIMO_VIBE_LAST_RESULT__&&window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__)}
function projectName(){const value=document.getElementById('workingTitle')?.value?.trim();return value||'Untitled Direction'}
function setState(message){const node=document.getElementById('vrDawState');if(node)node.textContent=message}
function setFolderLabel(value){folderLabel=String(value||folderLabel||'');const node=document.getElementById('vrProjectFolder');if(node)node.textContent=folderLabel?`Root · ${folderLabel}`:'Project root not chosen'}
function updateProjectName(){const node=document.getElementById('vrProjectName');if(node)node.textContent=projectName()}
function text(id){return String(document.getElementById(id)?.textContent||'').trim()}
function pressedValues(selector,attribute){return Array.from(document.querySelectorAll(selector)).filter(node=>node.getAttribute('aria-pressed')==='true').map(node=>String(node.getAttribute(attribute)||'')).filter(Boolean)}
function safeSessions(){try{const parsed=JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item==='object').slice(0,MAX_RECENT_SESSIONS):[]}catch(_){return []}}
function writeSessions(items){try{localStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify(items.slice(0,MAX_RECENT_SESSIONS)))}catch(_) {}}
function currentSessionSnapshot(){
  const slider=document.getElementById('energySlider');
  const title=projectName();
  const foundation=staged?.files?.find(file=>file.role==='foundation')?.filename||'';
  const texture=staged?.files?.find(file=>file.role==='texture')?.filename||'';
  return {
    id:`${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'direction'}`,
    savedAt:Date.now(),title,
    energy:Number(slider?.value||0),energyLabel:text('energyValue'),
    mood:pressedValues('#moodGrid [data-mood]','data-mood')[0]||'',
    filters:pressedValues('#serraFilterGrid [data-serra-filter]','data-serra-filter').slice(0,4),
    resultMood:text('resultMood'),resultKey:text('resultKey'),
    variation:text('variationSummary'),chorus:text('chorusStrategy'),
    drum:text('drumFilename'),drumMeta:text('drumMeta'),
    foundation,texture,bpm:Number(staged?.bpm||0)
  };
}
function rememberCurrentSession(reason='manual'){
  const snapshot=currentSessionSnapshot();
  const existing=safeSessions().filter(item=>item.title.toLowerCase()!==snapshot.title.toLowerCase());
  snapshot.reason=reason;
  writeSessions([snapshot,...existing]);
  renderRecentSessions();
  setState(reason==='export'?'Session + MIDI remembered':'Project session remembered');
  return snapshot;
}
function sessionMeta(session){
  const parts=[];
  if(session.resultKey)parts.push(session.resultKey);
  else if(session.bpm)parts.push(`${session.bpm} BPM`);
  if(session.energyLabel&&!parts.some(part=>part.includes('BPM')))parts.push(session.energyLabel);
  if(session.drum)parts.push(session.drum);
  return parts.filter(Boolean).slice(0,3).join(' · ')||'Saved writing brief';
}
function applyPressedGroup(selector,attribute,desiredValues){
  const wanted=new Set((desiredValues||[]).map(String));
  for(const node of document.querySelectorAll(selector)){
    const value=String(node.getAttribute(attribute)||'');
    const isPressed=node.getAttribute('aria-pressed')==='true';
    const shouldPress=wanted.has(value);
    if(isPressed!==shouldPress)node.click();
  }
}
function resumeSession(session){
  const title=document.getElementById('workingTitle');
  if(title){title.value=session.title||'';title.dispatchEvent(new Event('input',{bubbles:true}))}
  const energy=document.getElementById('energySlider');
  if(energy&&Number.isFinite(Number(session.energy))){energy.value=String(Math.max(0,Math.min(100,Number(session.energy))));energy.dispatchEvent(new Event('input',{bubbles:true}));energy.dispatchEvent(new Event('change',{bubbles:true}))}
  if(session.mood)applyPressedGroup('#moodGrid [data-mood]','data-mood',[session.mood]);
  applyPressedGroup('#serraFilterGrid [data-serra-filter]','data-serra-filter',Array.isArray(session.filters)?session.filters:[]);
  updateProjectName();
  const snapshot=document.getElementById('vrSessionSnapshot');
  if(snapshot)snapshot.textContent=`Loaded brief · ${sessionMeta(session)}${session.foundation||session.texture?' · MIDI snapshot available':''}. Spin when you want a fresh direction from this brief.`;
  setState(`Resumed · ${session.title||'Untitled Direction'}`);
  document.querySelector('.vr-session')?.scrollTo?.({top:0,behavior:'smooth'});
}
function deleteSession(id){writeSessions(safeSessions().filter(item=>item.id!==id));renderRecentSessions();setState('Session removed')}
function renderRecentSessions(){
  const list=document.getElementById('vrSessionList');if(!list)return;
  const sessions=safeSessions();
  if(!sessions.length){list.innerHTML='<div class="vr-session-empty">No Desktop project sessions yet.</div>';return}
  list.innerHTML='';
  for(const session of sessions.slice(0,6)){
    const card=document.createElement('div');card.className='vr-session-card';
    const copy=document.createElement('div');copy.className='vr-session-card-copy';
    const title=document.createElement('div');title.className='vr-session-card-title';title.textContent=session.title||'Untitled Direction';
    const meta=document.createElement('div');meta.className='vr-session-card-meta';meta.textContent=sessionMeta(session);
    copy.append(title,meta);
    const actions=document.createElement('div');actions.className='vr-session-card-actions';
    const resume=document.createElement('button');resume.type='button';resume.textContent='Resume brief';resume.addEventListener('click',event=>{event.preventDefault();resumeSession(session)});
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove session';remove.addEventListener('click',event=>{event.preventDefault();deleteSession(session.id)});
    actions.append(resume,remove);card.append(copy,actions);list.appendChild(card);
  }
}

function bindDrag(node,selection){
  node.addEventListener('dragstart',event=>{if(!staged?.stageId){event.preventDefault();schedule(0);return;}event.preventDefault();api.startMidiDrag(staged.stageId,selection);setState(selection==='pair'?'Drop both MIDI in Ableton':`Drop ${selection} in Ableton`)});
  node.addEventListener('dragend',()=>setTimeout(()=>syncUi(),160));
  node.addEventListener('click',()=>{if(!staged?.stageId)schedule(0);else setState('Hold + drag to Ableton')});
}

async function chooseProjectFolder(){
  if(!canExport)return;
  try{const result=await api.chooseMidiExportFolder();if(result?.ok){setFolderLabel(result.folderLabel);setState(canProjectWorkflow?'Project root remembered':'Export folder remembered')}else if(result?.canceled)setState('Folder selection canceled')}
  catch(error){setState('Could not choose project root');console.error('[FORTISSIMO Desktop project root]',error)}
}
async function saveSelection(selection){
  if(!canExport||!staged?.stageId)return;
  setState('Saving MIDI to project…');
  try{
    const title=projectName();
    const result=await api.saveStagedMidi(staged.stageId,selection,title);
    if(result?.ok){setFolderLabel(result.folderLabel);rememberCurrentSession('export');setState(canProjectWorkflow?`${result.fileCount} MIDI saved · ${result.projectLabel||title} / FORTISSIMO MIDI`:`${result.fileCount} MIDI saved · ${title}`)}
    else if(result?.canceled)setState('Save canceled');
  }
  catch(error){setState('MIDI save failed');console.error('[FORTISSIMO Desktop project save]',error)}
}
async function openProjectFolder(){
  if(!canExport)return;
  try{const result=await api.openMidiExportFolder();if(result?.ok){setFolderLabel(result.folderLabel);setState(result.opened==='project-midi'?'Opened current FORTISSIMO MIDI folder':'Project root opened')}else setState('Choose a project root first')}
  catch(error){setState('Could not open project folder');console.error('[FORTISSIMO Desktop project folder]',error)}
}

function ensureDock(){
  let dock=document.getElementById('vrDawDock');if(dock)return dock;
  const utility=document.querySelector('.utility-row');if(!utility)return null;
  dock=document.createElement('section');dock.id='vrDawDock';dock.className='vr-daw-dock';
  dock.innerHTML=`
    <div class="vr-daw-dock-head"><span class="vr-daw-dock-label">DAW / PROJECT WORKFLOW</span><span class="vr-daw-dock-state" id="vrDawState">Waiting for direction</span></div>
    <div class="vr-project-row"><div class="vr-project-copy"><small>Current writing project</small><strong id="vrProjectName">Untitled Direction</strong></div><span class="vr-project-folder" id="vrProjectFolder">Project root not chosen</span></div>
    <div class="vr-daw-drag" id="vrDawDrag" draggable="false" aria-disabled="true"><span class="vr-daw-drag-icon">↗</span><span class="vr-daw-drag-copy"><strong>DRAG 2 MIDI TO ABLETON</strong><small>Foundation + Texture · exact current performance</small></span></div>
    <div class="vr-daw-layer-grid">
      <div class="vr-daw-layer" id="vrDawFoundation" draggable="false" aria-disabled="true">↗ DRAG FOUNDATION<small id="vrDawFoundationName">Foundation MIDI</small></div>
      <div class="vr-daw-layer" id="vrDawTexture" draggable="false" aria-disabled="true">↗ DRAG TEXTURE<small id="vrDawTextureName">Texture MIDI</small></div>
    </div>
    <div class="vr-project-actions"><button type="button" class="vr-project-btn" id="vrChooseProject">Choose Project Root</button><button type="button" class="vr-project-btn" id="vrOpenProject">Open Current MIDI Folder</button></div>
    <div class="vr-project-subactions"><button type="button" class="vr-project-btn primary" id="vrSaveBoth" disabled>Save 2 MIDI</button><button type="button" class="vr-project-btn" id="vrSaveFoundation" disabled>Save Foundation</button><button type="button" class="vr-project-btn" id="vrSaveTexture" disabled>Save Texture</button></div>
    <div class="vr-session-intel">
      <div class="vr-session-intel-head"><strong>Recent project sessions</strong><button type="button" id="vrRememberSession">Remember current</button></div>
      <div class="vr-session-snapshot" id="vrSessionSnapshot">Phase 9 remembers the writing brief and a compact snapshot of BPM, key, drum and generated MIDI names. Resuming restores the brief; it does not pretend to recreate an old performance byte-for-byte.</div>
      <div class="vr-session-list" id="vrSessionList"></div>
    </div>
    <div class="vr-daw-help">Choose one root folder once. FORTISSIMO remembers it and, in Desktop v0.8+, automatically organizes saves as <strong>Working title / FORTISSIMO MIDI</strong>. Phase 9 also keeps recent writing briefs locally on this Desktop profile.</div>`;
  utility.insertAdjacentElement('afterend',dock);
  bindDrag(dock.querySelector('#vrDawDrag'),'pair');
  bindDrag(dock.querySelector('#vrDawFoundation'),'foundation');
  bindDrag(dock.querySelector('#vrDawTexture'),'texture');
  dock.querySelector('#vrChooseProject').addEventListener('click',event=>{event.preventDefault();chooseProjectFolder()});
  dock.querySelector('#vrOpenProject').addEventListener('click',event=>{event.preventDefault();openProjectFolder()});
  dock.querySelector('#vrSaveBoth').addEventListener('click',event=>{event.preventDefault();saveSelection('pair')});
  dock.querySelector('#vrSaveFoundation').addEventListener('click',event=>{event.preventDefault();saveSelection('foundation')});
  dock.querySelector('#vrSaveTexture').addEventListener('click',event=>{event.preventDefault();saveSelection('texture')});
  dock.querySelector('#vrRememberSession').addEventListener('click',event=>{event.preventDefault();rememberCurrentSession('manual')});
  updateProjectName();renderRecentSessions();
  return dock;
}
function syncUi(state){
  const dock=ensureDock();if(!dock)return;
  const ok=Boolean(staged?.stageId);
  for(const node of [dock.querySelector('#vrDawDrag'),dock.querySelector('#vrDawFoundation'),dock.querySelector('#vrDawTexture')]){node.draggable=ok;node.setAttribute('aria-disabled',String(!ok))}
  for(const id of ['vrSaveBoth','vrSaveFoundation','vrSaveTexture'])dock.querySelector(`#${id}`).disabled=!ok||!canExport;
  updateProjectName();setFolderLabel(folderLabel);
  setState(state==='preparing'?'Preparing exact performance…':state==='error'?'MIDI needs refresh':ok?'Ready · drag, save or remember':ready()?'Preparing MIDI…':'Waiting for direction');
  if(staged?.files?.[0])dock.querySelector('#vrDawFoundationName').textContent=staged.files[0].filename||'Foundation MIDI';
  if(staged?.files?.[1])dock.querySelector('#vrDawTextureName').textContent=staged.files[1].filename||'Texture MIDI';
}
async function prepare(){
  const my=++serial;staged=null;syncUi(ready()?'preparing':null);if(!ready())return;
  try{const pair=await buildCurrentSongStarterMidiPair();if(my!==serial)return;const result=await api.stageMidiPair(pair);if(my!==serial)return;if(!result?.ok||!result.stageId)throw new Error('Desktop MIDI stage failed.');staged={...result,files:pair.files.map(f=>({filename:f.filename,role:f.role}))};syncUi();}
  catch(error){if(my!==serial)return;staged=null;syncUi('error');console.error('[FORTISSIMO Desktop MIDI]',error)}
}
function schedule(delay=100){if(timer)clearTimeout(timer);const token=++serial;staged=null;syncUi(ready()?'preparing':null);timer=setTimeout(()=>{if(token!==serial)return;timer=null;prepare()},delay)}
function install(){
  if(!ensureDock()){setTimeout(install,120);return}
  window.addEventListener('fortissimo:vibe-arrangement-updated',()=>schedule(80));
  document.getElementById('energySlider')?.addEventListener('input',()=>schedule(260),{passive:true});
  document.getElementById('workingTitle')?.addEventListener('input',updateProjectName,{passive:true});
  const key=document.getElementById('resultKey');if(key)new MutationObserver(()=>{if(ready())schedule(120)}).observe(key,{childList:true,subtree:true,characterData:true});
  if(ready())schedule(0);else syncUi();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
