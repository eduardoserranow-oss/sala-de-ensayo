import { buildCurrentSongStarterMidiPair } from './vibe-roulette-songstarter-export-v1.js';

const api=window.fortissimoDesktop;
const canDrag=Boolean(api?.isDesktop&&api?.capabilities?.includes('midi-stage')&&api?.capabilities?.includes('midi-drag')&&typeof api.stageMidiPair==='function'&&typeof api.startMidiDrag==='function');
if(!canDrag)throw new Error('FORTISSIMO Desktop MIDI bridge is unavailable.');

document.documentElement.classList.add('fortissimo-desktop');
document.body.classList.add('fortissimo-desktop');

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
.vr-daw-dock-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vr-daw-dock-label{font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:#ff8a45}.vr-daw-dock-state{font-size:10px;color:rgba(255,255,255,.48)}
.vr-daw-drag{min-height:66px;width:100%;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid rgba(255,90,0,.7);border-radius:14px;background:#15100d;color:#ffad7c;font-weight:950;font-size:14px;letter-spacing:.02em;cursor:grab;user-select:none;-webkit-user-select:none;transition:.16s ease}.vr-daw-drag:hover{background:#1c120d;border-color:#ff6b1a;transform:translateY(-1px)}.vr-daw-drag:active{cursor:grabbing;transform:scale(.995)}.vr-daw-drag[aria-disabled=true]{opacity:.48;cursor:default;transform:none}.vr-daw-drag-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(255,90,0,.14);font-size:18px}.vr-daw-drag-copy{display:grid;gap:3px;text-align:left}.vr-daw-drag-copy small{font-size:10px;font-weight:700;color:rgba(255,255,255,.48)}
.vr-daw-files{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vr-daw-file{padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025);font-size:10px;color:rgba(255,255,255,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vr-daw-help{text-align:center;color:rgba(255,255,255,.42);font-size:10px;line-height:1.4}
body.fortissimo-desktop #vrPhase6Export,body.fortissimo-desktop #vrNativeMidiDrag{display:none!important}
`;
document.head.appendChild(style);

let staged=null,serial=0,timer=null;
function ready(){return Boolean(window.__FORTISSIMO_VIBE_LAST_RESULT__&&window.__FORTISSIMO_VIBE_LAST_ARRANGEMENT__)}
function ensureDock(){
  let dock=document.getElementById('vrDawDock');if(dock)return dock;
  const utility=document.querySelector('.utility-row');if(!utility)return null;
  dock=document.createElement('section');dock.id='vrDawDock';dock.className='vr-daw-dock';
  dock.innerHTML=`<div class="vr-daw-dock-head"><span class="vr-daw-dock-label">DAW EXPORT</span><span class="vr-daw-dock-state" id="vrDawState">Waiting for direction</span></div><div class="vr-daw-drag" id="vrDawDrag" draggable="false" aria-disabled="true"><span class="vr-daw-drag-icon">↗</span><span class="vr-daw-drag-copy"><strong>DRAG MIDI TO ABLETON</strong><small>Foundation + Texture · 2 MIDI files</small></span></div><div class="vr-daw-files"><div class="vr-daw-file" id="vrDawFoundation">01 · Foundation MIDI</div><div class="vr-daw-file" id="vrDawTexture">02 · Texture MIDI</div></div><div class="vr-daw-help">Click and hold the orange MIDI block, then drag it directly onto Ableton's Arrangement or Session view.</div>`;
  utility.insertAdjacentElement('afterend',dock);
  const drag=dock.querySelector('#vrDawDrag');
  drag.addEventListener('dragstart',event=>{if(!staged?.stageId){event.preventDefault();schedule(0);return;}event.preventDefault();api.startMidiDrag(staged.stageId);dock.querySelector('#vrDawState').textContent='Drop in Ableton';});
  drag.addEventListener('dragend',()=>setTimeout(()=>syncUi(),160));
  drag.addEventListener('click',()=>{if(!staged?.stageId)schedule(0);else dock.querySelector('#vrDawState').textContent='Hold + drag this block to Ableton';});
  return dock;
}
function syncUi(state){
  const dock=ensureDock();if(!dock)return;
  const drag=dock.querySelector('#vrDawDrag'),label=dock.querySelector('#vrDawState');
  const ok=Boolean(staged?.stageId);drag.draggable=ok;drag.setAttribute('aria-disabled',String(!ok));
  label.textContent=state==='preparing'?'Preparing exact performance…':state==='error'?'MIDI needs refresh':ok?'Ready to drag':ready()?'Preparing MIDI…':'Waiting for direction';
  if(staged?.files?.[0])dock.querySelector('#vrDawFoundation').textContent=`01 · ${staged.files[0].filename||'Foundation MIDI'}`;
  if(staged?.files?.[1])dock.querySelector('#vrDawTexture').textContent=`02 · ${staged.files[1].filename||'Texture MIDI'}`;
}
async function prepare(){
  const my=++serial;staged=null;syncUi(ready()?'preparing':null);if(!ready())return;
  try{const pair=await buildCurrentSongStarterMidiPair();if(my!==serial)return;const result=await api.stageMidiPair(pair);if(my!==serial)return;if(!result?.ok||!result.stageId)throw new Error('Desktop MIDI stage failed.');staged={...result,files:pair.files.map(f=>({filename:f.filename,role:f.role}))};syncUi();}
  catch(error){if(my!==serial)return;staged=null;syncUi('error');console.error('[FORTISSIMO Desktop MIDI]',error);}
}
function schedule(delay=100){if(timer)clearTimeout(timer);const token=++serial;staged=null;syncUi(ready()?'preparing':null);timer=setTimeout(()=>{if(token!==serial)return;timer=null;prepare();},delay)}
function install(){if(!ensureDock()){setTimeout(install,120);return;}window.addEventListener('fortissimo:vibe-arrangement-updated',()=>schedule(80));document.getElementById('energySlider')?.addEventListener('input',()=>schedule(260),{passive:true});const key=document.getElementById('resultKey');if(key)new MutationObserver(()=>{if(ready())schedule(120)}).observe(key,{childList:true,subtree:true,characterData:true});if(ready())schedule(0);else syncUi();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
