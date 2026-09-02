(function(){
"use strict";
const KEY="fortissimo.studyPaths.progress.v2";
const ACTIVE_KEY="fortissimo.studyPaths.activeProject.v1";
const LEGACY_KEY="fortissimo.studyPaths.roadToAfrobeats.v1";
const ROAD_ID="road-to-afrobeats";
const DEFAULT_CHECKS=["Partes / vocabulario","Tocar con el master","Sonido / articulación","Grabar y revisar"];
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){try{window.dispatchEvent(new CustomEvent("fortissimo:storage-error",{detail:{area:"study-paths-progress",error:String(e)}}))}catch(_){ }return false}}
function readAll(){try{const v=JSON.parse(safeGet(KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(_){return{}}}
function writeAll(v){if(safeSet(KEY,JSON.stringify(v))){window.dispatchEvent(new CustomEvent("fortissimo:path-progress",{detail:v}));return v}return null}
function freshSong(){return{learned:false,checks:{}}}
function freshStage(){return{a:freshSong(),b:freshSong(),completed:false}}
function ensure(projectId,stages=[]){const all=readAll();let p=all[projectId];if(!p||typeof p!=="object")p={stages:{},updatedAt:0};(stages||[]).forEach((s,i)=>{const id=String(s?.id||`stage-${i+1}`);if(!p.stages[id])p.stages[id]=freshStage();["a","b"].forEach(r=>{p.stages[id][r]=p.stages[id][r]||freshSong();p.stages[id][r].checks=p.stages[id][r].checks||{}});p.stages[id].completed=!!p.stages[id].completed});all[projectId]=p;return{all,p}}
function save(projectId,p,all){p.updatedAt=Date.now();all[projectId]=p;writeAll(all);if(projectId===ROAD_ID)syncLegacy(p);return p}
function migrateLegacy(stages){const all=readAll();if(all[ROAD_ID])return;let legacy;try{legacy=JSON.parse(safeGet(LEGACY_KEY)||"null")}catch(_){legacy=null}if(!legacy)return;const p={stages:{},updatedAt:Date.now()};(stages||[]).forEach((s,i)=>{const n=i+1,id=String(s?.id||`stage-${n}`),songs=legacy.songs?.[n]||{};p.stages[id]={a:{learned:!!songs.a,checks:{}},b:{learned:!!songs.b,checks:{}},completed:!!legacy.completed?.[n]}});all[ROAD_ID]=p;writeAll(all)}
function syncLegacy(p){const stages=(window.FortissimoProjects?.roadStages||[]),legacy={songs:{},completed:{}};stages.forEach((s,i)=>{const x=p.stages[String(s.id)]||freshStage();legacy.songs[i+1]={a:!!x.a.learned,b:!!x.b.learned};legacy.completed[i+1]=!!x.completed});safeSet(LEGACY_KEY,JSON.stringify(legacy))}
function get(projectId,stages=[]){if(projectId===ROAD_ID)migrateLegacy(stages);return ensure(projectId,stages).p}
function stageState(projectId,stage,stages=[]){const p=get(projectId,stages);return p.stages[String(stage.id)]||freshStage()}
function currentIndex(projectId,stages=[]){const p=get(projectId,stages);for(let i=0;i<stages.length;i++){if(!p.stages[String(stages[i].id)]?.completed)return i}return Math.max(0,stages.length-1)}
function isUnlocked(projectId,index,stages=[]){return index<=currentIndex(projectId,stages)}
function stats(projectId,stages=[]){const p=get(projectId,stages);let learned=0,completed=0;(stages||[]).forEach(s=>{const x=p.stages[String(s.id)]||freshStage();if(x.a.learned)learned++;if(x.b.learned)learned++;if(x.completed)completed++});const totalSongs=stages.length*2,current=currentIndex(projectId,stages);return{learned,completed,totalSongs,totalStages:stages.length,current:stages.length?current+1:0,finished:stages.length>0&&completed===stages.length,percent:totalSongs?Math.round(learned/totalSongs*100):0}}
function toggleCheck(projectId,stageId,role,key,stages=[]){const {all,p}=ensure(projectId,stages),x=p.stages[String(stageId)]||(p.stages[String(stageId)]=freshStage()),r=role==="b"?"b":"a";x[r].checks[key]=!x[r].checks[key];return save(projectId,p,all)}
function toggleLearned(projectId,stageId,role,stages=[]){const {all,p}=ensure(projectId,stages),x=p.stages[String(stageId)]||(p.stages[String(stageId)]=freshStage()),r=role==="b"?"b":"a";if(x.completed)return p;x[r].learned=!x[r].learned;return save(projectId,p,all)}
function completeStage(projectId,index,stages=[]){if(!isUnlocked(projectId,index,stages))return get(projectId,stages);const {all,p}=ensure(projectId,stages),s=stages[index];if(!s)return p;const x=p.stages[String(s.id)]||(p.stages[String(s.id)]=freshStage());if(!x.a.learned||!x.b.learned)return p;x.completed=true;setActive(projectId);return save(projectId,p,all)}
function setActive(id){safeSet(ACTIVE_KEY,String(id||ROAD_ID));window.dispatchEvent(new CustomEvent("fortissimo:active-path",{detail:{id}}))}
function active(){return safeGet(ACTIVE_KEY)||ROAD_ID}
window.FortissimoPathProgress={DEFAULT_CHECKS,get,stageState,currentIndex,isUnlocked,stats,toggleCheck,toggleLearned,completeStage,setActive,active};
function loadScript(src,done){if(document.querySelector(`script[src^="${src}"]`)){done?.();return}const s=document.createElement("script");s.src=src;s.onload=()=>done?.();document.head.appendChild(s)}
function loadLibraryCoverUI(){const path=(location.pathname||"").toLowerCase();if(!path.endsWith("/study-projects.html")&&!path.endsWith("study-projects.html"))return;const mount=()=>loadScript("assets/study-path-covers-library-v1.js?v=cover1");if(window.FortissimoPathCovers)mount();else loadScript("assets/study-path-covers-v1.js?v=cover1",mount)}
function loadUserSettings(){const path=(location.pathname||"").toLowerCase();if(!path.includes("study-"))return;loadScript("assets/study-path-user-settings-v1.js?v=cloud-title-cover-20260902")}
function bootExtras(){loadLibraryCoverUI();loadUserSettings()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootExtras,{once:true});else bootExtras();
})();