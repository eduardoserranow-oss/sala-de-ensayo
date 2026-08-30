const STORAGE_KEY='fortissimo.desktop.fullSessions.v1';
const MAX_SESSIONS=10;

function sessionApi(){return window.__FORTISSIMO_VIBE_SESSION_V1__||null}
function safeRead(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(item=>item&&item.version==='1.0.0').slice(0,MAX_SESSIONS):[]}catch(_){return []}}
function safeWrite(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_SESSIONS)))}catch(_) {}}
function titleOf(snapshot){return String(snapshot?.title||snapshot?.result?.title||'Untitled Direction').trim()||'Untitled Direction'}
function metaOf(snapshot){const parts=[];const result=snapshot?.result||{};const bpm=Number(snapshot?.bpm||0);if(result.key)parts.push(`${result.key} ${result.mode||''}`.trim());if(bpm)parts.push(`${bpm} BPM`);if(snapshot?.selectedDrum?.originalName)parts.push(snapshot.selectedDrum.originalName);return parts.slice(0,3).join(' · ')||'Exact musical state'}
function setDockState(message){const node=document.getElementById('vrDawState');if(node)node.textContent=message}

function captureFullSession(reason='manual'){
  const api=sessionApi();if(!api?.capture)throw new Error('Full Session Recall engine is not ready.');
  const snapshot=api.capture();if(!snapshot)throw new Error('Spin a direction before saving a full session.');
  snapshot.reason=reason;
  const title=titleOf(snapshot).toLowerCase();
  const existing=safeRead().filter(item=>titleOf(item).toLowerCase()!==title);
  safeWrite([snapshot,...existing]);
  render();
  setDockState(reason==='export'?'Exact session + MIDI remembered':'Exact session remembered');
  return snapshot;
}

async function openFullSession(snapshot){
  const api=sessionApi();if(!api?.restore)throw new Error('Full Session Recall engine is not ready.');
  setDockState('Opening exact session…');
  const result=await api.restore(snapshot);
  if(!result?.ok)throw new Error(result?.error||'Could not restore session.');
  setDockState(`Opened exact session · ${titleOf(snapshot)}`);
  window.dispatchEvent(new CustomEvent('fortissimo:desktop-full-session-opened',{detail:{id:snapshot.id,title:titleOf(snapshot)}}));
}

function removeSession(id){safeWrite(safeRead().filter(item=>item.id!==id));render();setDockState('Exact session removed')}

function ensurePanel(){
  let panel=document.getElementById('vrFullSessionRecall');if(panel)return panel;
  const intel=document.querySelector('#vrDawDock .vr-session-intel');if(!intel)return null;
  panel=document.createElement('section');panel.id='vrFullSessionRecall';panel.className='vr-full-session-recall';
  panel.innerHTML=`<div class="vr-session-intel-head"><strong>Full Session Recall</strong><button type="button" id="vrRememberExactSession">Remember exact</button></div><div class="vr-session-snapshot" id="vrFullSessionStatus">Phase 10 stores the exact Vibe Roulette musical state so Open Session restores the same progression, arrangement, pianist performance data, drum choice, BPM and edits without spinning again.</div><div class="vr-session-list" id="vrFullSessionList"></div>`;
  intel.insertAdjacentElement('beforebegin',panel);
  const style=document.createElement('style');style.id='vr-full-session-recall-style';style.textContent=`.vr-full-session-recall{display:grid;gap:8px;padding-top:4px;border-top:1px solid rgba(255,255,255,.07)}.vr-full-session-recall .vr-session-card-actions button:first-child{min-width:66px}.vr-full-session-badge{font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ff995e}`;document.head.appendChild(style);
  panel.querySelector('#vrRememberExactSession').addEventListener('click',event=>{event.preventDefault();try{captureFullSession('manual')}catch(error){setDockState(error.message||String(error))}});
  return panel;
}

function render(){
  const panel=ensurePanel();if(!panel)return;
  const list=panel.querySelector('#vrFullSessionList');const sessions=safeRead();
  if(!sessions.length){list.innerHTML='<div class="vr-session-empty">No exact sessions saved yet.</div>';return}
  list.innerHTML='';
  for(const snapshot of sessions.slice(0,6)){
    const card=document.createElement('div');card.className='vr-session-card';
    const copy=document.createElement('div');copy.className='vr-session-card-copy';
    const title=document.createElement('div');title.className='vr-session-card-title';title.textContent=titleOf(snapshot);
    const meta=document.createElement('div');meta.className='vr-session-card-meta';meta.textContent=metaOf(snapshot);
    const badge=document.createElement('span');badge.className='vr-full-session-badge';badge.textContent='EXACT STATE';
    copy.append(title,meta,badge);
    const actions=document.createElement('div');actions.className='vr-session-card-actions';
    const open=document.createElement('button');open.type='button';open.textContent='Open Session';open.addEventListener('click',event=>{event.preventDefault();openFullSession(snapshot).catch(error=>setDockState(error.message||String(error)))});
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove exact session';remove.addEventListener('click',event=>{event.preventDefault();removeSession(snapshot.id)});
    actions.append(open,remove);card.append(copy,actions);list.appendChild(card);
  }
}

function install(){
  if(!ensurePanel()){setTimeout(install,120);return}
  render();
  document.getElementById('vrSaveBoth')?.addEventListener('click',()=>setTimeout(()=>{try{captureFullSession('export')}catch(_){}},900));
  window.addEventListener('fortissimo:vibe-session-restored',()=>{const node=document.getElementById('vrFullSessionStatus');if(node)node.textContent='Exact session restored. Play, drag or export from the same stored musical state.'});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

window.__FORTISSIMO_FULL_SESSION_RECALL_INFO__=Object.freeze({version:'1.0.0',storageKey:STORAGE_KEY,maxSessions:MAX_SESSIONS});