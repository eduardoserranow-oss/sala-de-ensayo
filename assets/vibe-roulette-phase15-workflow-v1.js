import { SeamlessEightBarLoopTransport, buildSeamlessEightBarPerformance } from './vibe-roulette-seamless-loop-v1.js';
import { velocityLayerForMidiVelocity } from './vibe-roulette-rhodes-v3.js';
import { buildCommercialFourBarPlan } from './vibe-roulette-groove.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const proto=SeamlessEightBarLoopTransport.prototype;

function sectionArrangement(chords=[],roman=[],transport){
  const cleanChords=(chords||[]).map(String).filter(Boolean);
  const cleanRoman=(roman||[]).map(String).filter(Boolean);
  return {
    bars:8,beatsPerBar:4,totalBeats:32,
    bpm:Number(transport?.performance?.bpm||transport?.options?.bpm||96),
    performancePattern:transport?.options?.performancePattern||transport?.performance?.performancePattern||null,
    emotionFilters:transport?.options?.emotionFilters||transport?.performance?.emotionFilters||[],
    firstPass:{chords:cleanChords,roman:cleanRoman},
    secondPass:{chords:cleanChords,roman:cleanRoman}
  };
}

async function decodePerformance(transport,performance){
  await transport.preview.sampleBank.preload(performance);
  const unique=new Map();
  for(const event of performance.events){
    const layer=velocityLayerForMidiVelocity(event.velocity);
    unique.set(`${layer}:${event.midi}`,[layer,event.midi]);
  }
  const decoded=new Map();
  await Promise.all([...unique.entries()].map(async([key,[layer,midi]])=>{
    decoded.set(key,await transport.preview.sampleBank.decode(transport.ctx,layer,midi));
  }));
  return decoded;
}

function currentBeat(transport){
  if(!transport?.ctx||!transport?.originTime||!transport?.performance)return 0;
  const spb=60/transport.performance.bpm;
  const elapsed=(transport.ctx.currentTime-transport.originTime)/spb;
  return ((elapsed%32)+32)%32;
}
function nextBarBoundary(transport){
  const beat=currentBeat(transport),spb=60/transport.performance.bpm;
  const nextBeat=Math.ceil((beat+0.06)/4)*4;
  const delta=((nextBeat-beat)%32+32)%32||4;
  return transport.ctx.currentTime+delta*spb;
}
function restartLookahead(transport,token){
  if(transport.timer)window.clearInterval(transport.timer);
  const checkMs=Math.max(650,Math.min(2200,transport.cycleSeconds*250));
  transport.timer=window.setInterval(()=>transport.fillLookahead(token),checkMs);
}
function setSectionUi(mode){
  if(typeof window==='undefined')return;
  window.__FORTISSIMO_ACTIVE_SECTION__=mode;
  document.dispatchEvent(new CustomEvent('fortissimo:vibe-section-change',{detail:{mode}}));
}

if(!proto.__fortissimoPhase15Patched){
  proto.__fortissimoPhase15Patched=true;
  const baseStart=proto.start;
  const baseStop=proto.stop;
  const basePause=proto.pause;
  proto.start=async function(arrangement,options={}){
    if(typeof window!=='undefined')window.__FORTISSIMO_VIBE_TRANSPORT__=this;
    this.__sectionMode='main';this.__pendingSectionTimer&&clearTimeout(this.__pendingSectionTimer);this.__pendingSectionTimer=null;
    const out=await baseStart.call(this,arrangement,options);
    if(out){this.__mainPerformance=out;this.__mainDecoded=new Map(this.decoded);this.__mainArrangement=arrangement;this.__mainOptions={...this.options};setSectionUi('main');}
    return out;
  };
  proto.stop=function(){
    if(this.__pendingSectionTimer)clearTimeout(this.__pendingSectionTimer);this.__pendingSectionTimer=null;
    const out=baseStop.call(this);this.__sectionMode='main';setSectionUi('main');return out;
  };
  proto.pause=function(){
    if(this.__pendingSectionTimer)clearTimeout(this.__pendingSectionTimer);this.__pendingSectionTimer=null;
    return basePause.call(this);
  };
  proto.switchToSection=async function(chords=[],options={}){
    if(!this.running||!this.performance||!this.ctx)throw new Error('Start Play Chords first so the section can join the shared transport.');
    const roman=options.roman||[];
    const arrangement=sectionArrangement(chords,roman,this);
    const performance=buildSeamlessEightBarPerformance(arrangement,{
      ...(this.options||{}),bpm:this.performance.bpm,energyTarget:this.performance.energy,
      mood:options.mood||this.performance.mood,emotionFilters:options.emotionFilters||this.performance.emotionFilters,
      performancePattern:options.performancePattern||this.performance.performancePattern,
      performanceSeed:`section|${roman.join('-')}|${chords.join('-')}`
    });
    const decoded=await decodePerformance(this,performance);
    if(!this.running)return null;
    const boundary=nextBarBoundary(this);const wait=Math.max(0,(boundary-this.ctx.currentTime)*1000);
    if(this.__pendingSectionTimer)clearTimeout(this.__pendingSectionTimer);
    this.emit('playing',{activePass:'Section queued · changes on next bar',sectionMode:'queued'});
    return new Promise(resolve=>{
      this.__pendingSectionTimer=window.setTimeout(()=>{
        if(!this.running){resolve(null);return;}
        this.preview?.stop();
        this.performance=performance;this.decoded=decoded;this.__sectionMode='chorus';
        this.chain=this.preview.createChain(this.ctx,this.performance.energy);
        const spb=60/this.performance.bpm;this.cycleSeconds=32*spb;this.originTime=boundary;this.pauseOffsetSeconds=0;
        const token=this.token;this.nextCycleStart=boundary;
        this.scheduleCycle(boundary,token,{notBefore:boundary});this.nextCycleStart+=this.cycleSeconds;
        this.scheduleCycle(this.nextCycleStart,token);this.nextCycleStart+=this.cycleSeconds;
        restartLookahead(this,token);setSectionUi('chorus');
        this.emit('playing',{activePass:'CHORUS / SECTION',sectionMode:'chorus',quantized:true});resolve(performance);
      },wait);
    });
  };
  proto.returnToMain=async function(){
    if(!this.running||!this.__mainPerformance||!this.ctx)return null;
    const performance=this.__mainPerformance;let decoded=this.__mainDecoded;
    if(!decoded?.size)decoded=await decodePerformance(this,performance);
    const boundary=nextBarBoundary(this);const wait=Math.max(0,(boundary-this.ctx.currentTime)*1000);
    if(this.__pendingSectionTimer)clearTimeout(this.__pendingSectionTimer);
    this.emit('playing',{activePass:'Main queued · returns on next bar',sectionMode:'queued'});
    return new Promise(resolve=>{
      this.__pendingSectionTimer=window.setTimeout(()=>{
        if(!this.running){resolve(null);return;}
        this.preview?.stop();this.performance=performance;this.decoded=new Map(decoded);this.__sectionMode='main';
        this.chain=this.preview.createChain(this.ctx,this.performance.energy);
        const spb=60/this.performance.bpm;this.cycleSeconds=32*spb;this.originTime=boundary;this.pauseOffsetSeconds=0;
        const token=this.token;this.nextCycleStart=boundary;
        this.scheduleCycle(boundary,token,{notBefore:boundary});this.nextCycleStart+=this.cycleSeconds;
        this.scheduleCycle(this.nextCycleStart,token);this.nextCycleStart+=this.cycleSeconds;
        restartLookahead(this,token);setSectionUi('main');
        this.emit('playing',{activePass:'A + A′',sectionMode:'main',quantized:true});resolve(performance);
      },wait);
    });
  };
  proto.getCurrentPerformance=function(){return this.performance||this.__mainPerformance||null;};
}

function installStyles(){
  if(document.getElementById('vr-phase15-styles'))return;
  const s=document.createElement('style');s.id='vr-phase15-styles';s.textContent=`
  #spinBtn{background:transparent!important;color:#ff7a2b!important;border:1px solid rgba(255,90,0,.7)!important;box-shadow:none!important;letter-spacing:.08em}.loop-panel{border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:12px;background:rgba(255,255,255,.025)}#loopBtn{background:#ff5a00!important;border-color:#ff5a00!important;color:#fff!important;box-shadow:0 10px 28px rgba(255,90,0,.16)}
  #drumPanel{border-color:rgba(255,52,52,.35)!important;background:linear-gradient(180deg,rgba(255,38,38,.055),rgba(255,255,255,.018))!important;box-shadow:inset 3px 0 0 rgba(255,52,52,.7)}#drumPanel .drum-kicker{color:#ff5353!important}#drumPanel .drum-mute[aria-pressed="true"]{border-color:#ff3d3d!important;background:rgba(255,40,40,.16)!important;color:#fff!important}#drumPanel input[type="range"]{accent-color:#ff3d3d!important}.vr-drum-details-toggle{border:0;background:transparent;color:rgba(255,255,255,.52);font-weight:800;font-size:12px;padding:5px 0;text-align:left}.vr-drum-details{display:contents}
  .chorus.is-section-active{border-color:rgba(255,90,0,.32)!important;box-shadow:0 0 0 1px rgba(255,90,0,.1)}.chorus-chord.is-active-section-chord{border-color:#ff5a00!important;box-shadow:0 0 18px rgba(255,90,0,.22);color:#fff!important}.vr-section-hint{margin:8px 0 0;color:rgba(255,255,255,.5);font-size:11px;line-height:1.4}
  .vr-grid{align-items:start}.vr-session{align-self:start}.result-head{margin-bottom:8px}
  @media(min-width:980px){.vr-grid{grid-template-columns:minmax(300px,.78fr) minmax(560px,1.45fr)!important;gap:22px!important}.vr-session{position:sticky;top:96px;max-height:calc(100vh - 120px);overflow:auto;padding-right:6px}.vr-panel:not(.vr-session){min-width:0}.eightbar-wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px}.loop-panel{position:sticky;top:88px;z-index:8;background:#0c0c0c}}
  @media(max-width:760px){.vr-shell{padding-left:12px!important;padding-right:12px!important}.vr-panel{padding:16px!important}.vr-top{margin-bottom:12px!important}.vr-session .saved-box{display:none}.vr-session .studio-prompt{font-size:12px;line-height:1.4}.loop-panel{margin:10px 0 12px}.loop-status{font-size:11px!important}.meta-row,.vibe-runtime-tags{gap:5px!important}.meta-row .chip,.vibe-runtime-tag{font-size:9px!important;min-height:24px!important}.drum-file-row,.drum-meta{display:none!important}#drumPanel.vr-details-open .drum-file-row,#drumPanel.vr-details-open .drum-meta{display:flex!important}.vr-drum-details-toggle{display:block!important}.drum-controls{gap:8px!important}.drum-control{min-height:44px!important}.primary-actions,.utility-row{gap:8px!important}.chorus{padding:16px!important}.feedback-box{padding:16px!important}}
  `;document.head.appendChild(s);
}
function renamePlayback(){
  const btn=document.getElementById('loopBtn');if(!btn)return;
  const apply=()=>{const current=btn.textContent||'';const wanted=/Pause/i.test(current)?'⏸ Pause':'▶ Play Chords';if(current!==wanted)btn.textContent=wanted;};apply();new MutationObserver(apply).observe(btn,{childList:true,subtree:true,characterData:true});
  const vol=document.getElementById('drumVolumeToggle');if(vol)vol.textContent='Volume';
  const spin=document.getElementById('spinBtn');if(spin)spin.textContent='SPIN NEW DIRECTION';
}
function compactDrums(){
  const panel=document.getElementById('drumPanel');if(!panel||panel.querySelector('.vr-drum-details-toggle'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='vr-drum-details-toggle';btn.textContent='Details +';
  panel.querySelector('.drum-kicker')?.insertAdjacentElement('afterend',btn);
  btn.addEventListener('click',()=>{const open=panel.classList.toggle('vr-details-open');btn.textContent=open?'Details −':'Details +';});
}
function movePlaybackUp(){
  const resultPanel=document.querySelector('.vr-grid > .vr-panel:not(.vr-session)');const loop=document.querySelector('.loop-panel');const wrap=document.getElementById('eightbarWrap');if(resultPanel&&loop&&wrap&&loop.nextElementSibling!==wrap){wrap.insertAdjacentElement('beforebegin',loop);}
}
function chorusPlan(){
  const result=window.__FORTISSIMO_VIBE_LAST_RESULT__;const chords=result?.chorusVariation?.chords||[...document.querySelectorAll('#chorusChords .chorus-chord')].map(el=>el.textContent.trim()).filter(Boolean);
  try{return buildCommercialFourBarPlan(chords);}catch(_){return[];}
}
function updateSectionHighlight(){
  const t=window.__FORTISSIMO_VIBE_TRANSPORT__;const chorus=document.querySelector('.chorus');const chords=[...document.querySelectorAll('#chorusChords .chorus-chord')];
  chords.forEach(el=>el.classList.remove('is-active-section-chord'));
  if(!t?.running||window.__FORTISSIMO_ACTIVE_SECTION__!=='chorus'){chorus?.classList.remove('is-section-active');return;}
  chorus?.classList.add('is-section-active');document.querySelectorAll('.slot-card.is-active-chord').forEach(el=>el.classList.remove('is-active-chord'));
  const beat=currentBeat(t)%16;const plan=chorusPlan();let active=plan[0];for(const item of plan){if(beat>=item.startBeat)active=item;}
  if(active)chords[active.index]?.classList.add('is-active-section-chord');
}
function installSectionTransport(){
  const btn=document.getElementById('playChorusBtn');if(!btn||btn.dataset.phase15==='1')return;btn.dataset.phase15='1';
  const hint=document.createElement('div');hint.className='vr-section-hint';hint.textContent='Uses the same BPM, click and Afro drum transport. Changes are quantized to the next bar.';btn.closest('.action-row')?.insertAdjacentElement('afterend',hint);
  const paint=()=>{btn.textContent=window.__FORTISSIMO_ACTIVE_SECTION__==='chorus'?'↩ Return to main':'▶ Play Section';};paint();document.addEventListener('fortissimo:vibe-section-change',paint);
  btn.addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    try{
      let t=window.__FORTISSIMO_VIBE_TRANSPORT__;
      if(!t?.running){const main=document.getElementById('loopBtn');if(!main||main.disabled)return;main.click();for(let i=0;i<50&&!window.__FORTISSIMO_VIBE_TRANSPORT__?.running;i+=1)await new Promise(r=>setTimeout(r,80));t=window.__FORTISSIMO_VIBE_TRANSPORT__;}
      if(!t?.running)throw new Error('Play Chords could not start the shared transport.');
      if(window.__FORTISSIMO_ACTIVE_SECTION__==='chorus'){await t.returnToMain();return;}
      const result=window.__FORTISSIMO_VIBE_LAST_RESULT__;const chords=result?.chorusVariation?.chords||[];const roman=result?.chorusVariation?.roman||[];
      if(!chords.length)throw new Error('No section progression is loaded yet.');
      await t.switchToSection(chords,{roman,mood:result?.mood,emotionFilters:result?.emotionFilters,performancePattern:result?.performancePattern});
    }catch(error){const box=document.getElementById('errorBox');if(box){box.textContent=error.message||String(error);box.classList.add('show');}}
  },true);
  window.setInterval(updateSectionHighlight,32);
}
function install(){installStyles();renamePlayback();compactDrums();movePlaybackUp();installSectionTransport();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);}

export const PHASE15_INFO={version:1,principle:'Generate, audition and refine are visually distinct. Section changes share the master BPM and uninterrupted drum transport.'};
