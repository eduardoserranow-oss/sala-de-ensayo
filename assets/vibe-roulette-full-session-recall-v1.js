const STORAGE_KEY='fortissimo.desktop.fullSessions.v1';
const MAX_SESSIONS=24;

function sessionApi(){return window.__FORTISSIMO_VIBE_SESSION_V1__||null}
function safeRead(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(item=>item&&item.version==='1.0.0').slice(0,MAX_SESSIONS):[]}catch(_){return []}}
function safeWrite(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_SESSIONS)))}catch(_) {}}
function titleOf(snapshot){return String(snapshot?.title||snapshot?.result?.title||'Untitled Direction').trim()||'Untitled Direction'}
function projectKey(snapshot){return titleOf(snapshot).toLowerCase()}
function versionNameOf(snapshot){return String(snapshot?.projectVersion?.name||'Version 1').trim()||'Version 1'}
function createdAtOf(snapshot){return Number(snapshot?.projectVersion?.createdAt||snapshot?.savedAt||0)}
function metaOf(snapshot){const parts=[];const result=snapshot?.result||{};const bpm=Number(snapshot?.bpm||0);if(result.key)parts.push(`${result.key} ${result.mode||''}`.trim());if(bpm)parts.push(`${bpm} BPM`);if(snapshot?.selectedDrum?.originalName)parts.push(snapshot.selectedDrum.originalName);return parts.slice(0,3).join(' · ')||'Exact musical state'}
function setDockState(message){const node=document.getElementById('vrDawState');if(node)node.textContent=message}
function newId(prefix='version'){return `${Date.now()}-${prefix}-${Math.random().toString(36).slice(2,8)}`}
function countProjectVersions(items,title){const key=String(title||'').trim().toLowerCase();return items.filter(item=>projectKey(item)===key).length}
function normalizeVersion(snapshot,index=0){if(snapshot?.projectVersion?.name)return snapshot;const copy={...snapshot};copy.projectVersion={name:`Version ${index+1}`,createdAt:Number(snapshot?.savedAt||Date.now()),source:'phase10-migration'};return copy}
function normalizedSessions(){const raw=safeRead();const projectCounts=new Map();return raw.map(item=>{const key=projectKey(item);const count=(projectCounts.get(key)||0)+1;projectCounts.set(key,count);return normalizeVersion(item,count-1)})}

function captureFullSession(reason='manual'){
  const api=sessionApi();if(!api?.capture)throw new Error('Full Session Recall engine is not ready.');
  const snapshot=api.capture();if(!snapshot)throw new Error('Spin a direction before saving a full session.');
  const items=normalizedSessions();
  const title=titleOf(snapshot);
  const versionNumber=countProjectVersions(items,title)+1;
  snapshot.reason=reason;
  snapshot.projectVersion={name:`Version ${versionNumber}`,createdAt:Date.now(),source:reason};
  safeWrite([snapshot,...items]);
  render();
  setDockState(reason==='export'?`${snapshot.projectVersion.name} + MIDI remembered`:`${snapshot.projectVersion.name} remembered`);
  return snapshot;
}

async function openFullSession(snapshot){
  const api=sessionApi();if(!api?.restore)throw new Error('Full Session Recall engine is not ready.');
  setDockState(`Opening ${versionNameOf(snapshot)}…`);
  const result=await api.restore(snapshot);
  if(!result?.ok)throw new Error(result?.error||'Could not restore session.');
  setDockState(`Opened ${titleOf(snapshot)} · ${versionNameOf(snapshot)}`);
  window.dispatchEvent(new CustomEvent('fortissimo:desktop-full-session-opened',{detail:{id:snapshot.id,title:titleOf(snapshot),versionName:versionNameOf(snapshot)}}));
}

function removeSession(id){safeWrite(normalizedSessions().filter(item=>item.id!==id));render();setDockState('Project version removed')}
function duplicateSession(id){const items=normalizedSessions();const source=items.find(item=>item.id===id);if(!source)return;const title=titleOf(source);const versionNumber=countProjectVersions(items,title)+1;const copy=JSON.parse(JSON.stringify(source));copy.id=newId('duplicate');copy.savedAt=Date.now();copy.reason='duplicate';copy.projectVersion={name:`Version ${versionNumber}`,createdAt:Date.now(),source:'duplicate',duplicatedFrom:source.id};safeWrite([copy,...items]);render();setDockState(`Duplicated as ${copy.projectVersion.name}`)}
function renameVersion(id){const items=normalizedSessions();const source=items.find(item=>item.id===id);if(!source)return;const current=versionNameOf(source);const next=window.prompt('Rename this project version',current);if(next==null)return;const clean=String(next).trim().slice(0,48);if(!clean)return;source.projectVersion={...(source.projectVersion||{}),name:clean,renamedAt:Date.now()};safeWrite(items);render();setDockState(`Version renamed · ${clean}`)}

function ensurePanel(){
  let panel=document.getElementById('vrFullSessionRecall');if(panel)return panel;
  const intel=document.querySelector('#vrDawDock .vr-session-intel');if(!intel)return null;
  panel=document.createElement('section');panel.id='vrFullSessionRecall';panel.className='vr-full-session-recall';
  panel.innerHTML=`<div class="vr-session-intel-head"><strong>Project Versions</strong><button type="button" id="vrRememberExactSession">Remember exact</button></div><div class="vr-session-snapshot" id="vrFullSessionStatus">Phase 11 keeps multiple exact versions of the same Working Title. Open, duplicate, rename or remove a version without regenerating the musical state.</div><div class="vr-session-list" id="vrFullSessionList"></div>`;
  intel.insertAdjacentElement('beforebegin',panel);
  const style=document.createElement('style');style.id='vr-full-session-recall-style';style.textContent=`.vr-full-session-recall{display:grid;gap:8px;padding-top:4px;border-top:1px solid rgba(255,255,255,.07)}.vr-full-session-recall .vr-session-card-actions{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end}.vr-full-session-recall .vr-session-card-actions button{min-width:0}.vr-full-session-badge{font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ff995e}.vr-project-version-name{font-size:9px;font-weight:900;color:#fff;margin-top:2px}.vr-project-group{display:grid;gap:6px;padding-top:4px}.vr-project-group-title{font-size:8px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:rgba(255,255,255,.42);padding:4px 1px}`;document.head.appendChild(style);
  panel.querySelector('#vrRememberExactSession').addEventListener('click',event=>{event.preventDefault();try{captureFullSession('manual')}catch(error){setDockState(error.message||String(error))}});
  return panel;
}

function render(){
  const panel=ensurePanel();if(!panel)return;
  const list=panel.querySelector('#vrFullSessionList');const sessions=normalizedSessions();
  if(!sessions.length){list.innerHTML='<div class="vr-session-empty">No project versions saved yet.</div>';return}
  list.innerHTML='';
  const groups=new Map();for(const snapshot of sessions){const key=projectKey(snapshot);if(!groups.has(key))groups.set(key,{title:titleOf(snapshot),items:[]});groups.get(key).items.push(snapshot)}
  for(const group of [...groups.values()].slice(0,8)){
    const wrap=document.createElement('section');wrap.className='vr-project-group';
    const groupTitle=document.createElement('div');groupTitle.className='vr-project-group-title';groupTitle.textContent=`${group.title} · ${group.items.length} version${group.items.length===1?'':'s'}`;wrap.appendChild(groupTitle);
    for(const snapshot of group.items.slice(0,6)){
      const card=document.createElement('div');card.className='vr-session-card';
      const copy=document.createElement('div');copy.className='vr-session-card-copy';
      const version=document.createElement('div');version.className='vr-project-version-name';version.textContent=versionNameOf(snapshot);
      const meta=document.createElement('div');meta.className='vr-session-card-meta';meta.textContent=metaOf(snapshot);
      const badge=document.createElement('span');badge.className='vr-full-session-badge';badge.textContent='EXACT STATE';
      copy.append(version,meta,badge);
      const actions=document.createElement('div');actions.className='vr-session-card-actions';
      const open=document.createElement('button');open.type='button';open.textContent='Open';open.addEventListener('click',event=>{event.preventDefault();openFullSession(snapshot).catch(error=>setDockState(error.message||String(error)))});
      const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='Duplicate';duplicate.addEventListener('click',event=>{event.preventDefault();duplicateSession(snapshot.id)});
      const rename=document.createElement('button');rename.type='button';rename.textContent='Rename';rename.addEventListener('click',event=>{event.preventDefault();renameVersion(snapshot.id)});
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove project version';remove.addEventListener('click',event=>{event.preventDefault();removeSession(snapshot.id)});
      actions.append(open,duplicate,rename,remove);card.append(copy,actions);wrap.appendChild(card);
    }
    list.appendChild(wrap);
  }
}

function install(){
  if(!ensurePanel()){setTimeout(install,120);return}
  const migrated=normalizedSessions();if(migrated.length)safeWrite(migrated);
  render();
  document.getElementById('vrSaveBoth')?.addEventListener('click',()=>setTimeout(()=>{try{captureFullSession('export')}catch(_){}},900));
  window.addEventListener('fortissimo:vibe-session-restored',()=>{const node=document.getElementById('vrFullSessionStatus');if(node)node.textContent='Exact project version restored. Play, drag or export from the same stored musical state.'});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

window.__FORTISSIMO_FULL_SESSION_RECALL_INFO__=Object.freeze({version:'2.0.0',storageKey:STORAGE_KEY,maxSessions:MAX_SESSIONS,capability:'project-version-history'});