import { buildCommercialAfroRhodesPlan, midiToRhodesSampleName, velocityLayerForMidiVelocity } from './vibe-roulette-rhodes-v3.js';

const BASE='https://raw.githubusercontent.com/danielpodrazka/piano/main/audio/rhodes-fm';
const PREVIEW_SECONDS=1.65;
let ctx=null;
let active=[];
const buffers=new Map();

function audioContext(){
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Audio preview is not supported on this device.');ctx=new C();}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
}
function stopSources(){for(const source of active){try{source.stop();}catch(_){}}active=[];}
export function stopAfroChordAlternativePreview(){stopSources();document.querySelectorAll('.chord-alternative-preview.is-playing').forEach(el=>el.classList.remove('is-playing'));}
async function decode(layer,midi){
  const key=`${layer}:${midi}`;if(buffers.has(key))return buffers.get(key);
  const c=audioContext();const url=`${BASE}/v${layer}/${midiToRhodesSampleName(midi)}`;
  const promise=fetch(url,{mode:'cors',cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`Preview sample failed (${r.status})`);return r.arrayBuffer();}).then(bytes=>c.decodeAudioData(bytes.slice(0)));
  buffers.set(key,promise);return promise;
}
function currentBar(){const title=document.getElementById('chordAlternativeTitle')?.textContent||'';const match=title.match(/Bar\s+(\d+)/i);return match?Number(match[1]):1;}
function previousHarmony(bar){
  const slot=Math.max(0,bar-2);const card=document.querySelector(`.slot-card[data-slot="${slot}"]`);if(!card)return null;
  const chord=(card.querySelector('.slot-value')?.textContent||'').trim();const roman=(card.querySelector('.slot-roman')?.textContent||'').trim();
  return chord&&chord!=='—'?{chord,roman}:null;
}
function previewPlan(chord,roman){
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__||{};const bar=currentBar();const prev=previousHarmony(bar);const chords=prev?[prev.chord,chord]:[chord];const romans=prev?[prev.roman,roman]:[roman];
  const energy=Number(document.getElementById('energySlider')?.value||65)/100;const bpm=Number(result.bpm||result.intent?.bpm||document.getElementById('energyValue')?.textContent?.match(/(\d+)\s*BPM/i)?.[1]||100);
  const full=buildCommercialAfroRhodesPlan(chords,{roman:romans,bars:4,beatsPerBar:4,bpm,energyTarget:energy,mood:result.mood||'connection',performancePattern:result.performancePattern||null,pass:bar>4?'A′':'A'});
  const targetIndex=chords.length-1;const targetEvents=full.events.filter(e=>e.chordIndex===targetIndex&&!/response|pickup/.test(e.role));const first=Math.min(...targetEvents.map(e=>e.startBeat));
  return {...full,totalBeats:2,events:targetEvents.map(e=>({...e,startBeat:Math.max(0,e.startBeat-first),durationBeats:Math.min(e.durationBeats,2.15)}))};
}
export async function previewAfroChordAlternative({chord='',roman='',button=null}={}){
  if(!chord)return;stopAfroChordAlternativePreview();if(button)button.classList.add('is-loading');
  try{
    const c=audioContext();const plan=previewPlan(chord,roman);const spb=60/plan.bpm;const events=plan.events;
    const decoded=await Promise.all(events.map(async e=>({event:e,buffer:await decode(velocityLayerForMidiVelocity(e.velocity),e.midi)})));
    stopAfroChordAlternativePreview();if(button){button.classList.remove('is-loading');button.classList.add('is-playing');}
    const master=c.createGain();master.gain.value=.76;master.connect(c.destination);const now=c.currentTime+.025;
    for(const {event,buffer} of decoded){const source=c.createBufferSource();const gain=c.createGain();source.buffer=buffer;gain.gain.value=Math.min(.72,Math.max(.18,event.velocity/127*.72));source.connect(gain);gain.connect(master);const start=now+event.startBeat*spb+(event.fingerOffsetSeconds||0);const duration=Math.min(PREVIEW_SECONDS,Math.max(.22,event.durationBeats*spb));source.start(start,0,duration);active.push(source);source.addEventListener('ended',()=>{active=active.filter(x=>x!==source);if(!active.length)button?.classList.remove('is-playing');},{once:true});}
    window.setTimeout(()=>{try{master.disconnect();}catch(_){}},(PREVIEW_SECONDS+.45)*1000);
  }catch(error){button?.classList.remove('is-loading','is-playing');console.warn('Chord preview failed',error);}
}
function styles(){if(document.getElementById('vr-chord-preview-style'))return;const s=document.createElement('style');s.id='vr-chord-preview-style';s.textContent=`.chord-alternative-preview-wrap{position:relative}.chord-alternative-preview-wrap>.chord-alternative-option{width:100%;padding-right:82px!important}.chord-alternative-preview{position:absolute;right:16px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:999px;border:1px solid rgba(255,122,43,.55);background:rgba(255,122,43,.09);color:#ff7a2b;font-size:18px;font-weight:900;z-index:3}.chord-alternative-preview:active,.chord-alternative-preview.is-playing{background:#ff6a1a;color:#fff;border-color:#ff6a1a}.chord-alternative-preview.is-loading{opacity:.55}.chord-alternative-preview:focus-visible{outline:2px solid #ff7a2b;outline-offset:2px}`;document.head.appendChild(s);}
function enhance(){styles();document.querySelectorAll('.chord-alternative-option:not([data-preview-enhanced])').forEach(option=>{option.dataset.previewEnhanced='1';const chord=(option.querySelector('.alternative-chord')?.textContent||'').trim();const roman=(option.querySelector('.alternative-roman')?.textContent||'').trim();const wrap=document.createElement('div');wrap.className='chord-alternative-preview-wrap';option.parentNode.insertBefore(wrap,option);wrap.appendChild(option);const play=document.createElement('button');play.type='button';play.className='chord-alternative-preview';play.dataset.chordPreview='1';play.setAttribute('aria-label',`Preview ${chord}`);play.textContent='▶';play.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();previewAfroChordAlternative({chord,roman,button:play});});wrap.appendChild(play);});}
function install(){enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',e=>{if(e.key==='Escape')stopAfroChordAlternativePreview();});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
export const CHORD_PREVIEW_INFO={version:1,durationSeconds:PREVIEW_SECONDS,instrument:'FORTISSIMO Rhodes FM',policy:'Audition only: preview never replaces the progression or records taste feedback. Candidate voicing is derived from the current bar context when available.'};
