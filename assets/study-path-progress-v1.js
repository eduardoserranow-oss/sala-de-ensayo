(function(){
  "use strict";
  const KEY="fortissimo.studyPaths.roadToAfrobeats.v1";
  const HISTORY_KEY="fortissimo.studyPaths.roadToAfrobeats.history.v1";
  const MAX_HISTORY=12;
  const blank=()=>({songs:{},completed:{}});
  function emit(name,detail){try{window.dispatchEvent(new CustomEvent(name,{detail}))}catch(_){}}
  function storageError(error,operation){emit("fortissimo:storage-error",{area:"study-paths",operation,error:String(error?.message||error||"Storage error")})}
  function safeGet(key){try{return localStorage.getItem(key)}catch(error){storageError(error,"read");return null}}
  function safeSet(key,value){try{localStorage.setItem(key,value);return true}catch(error){storageError(error,"write");return false}}
  function normalize(value){
    if(!value||typeof value!=="object")return blank();
    const songs={},completed={};
    for(let stage=1;stage<=12;stage+=1){
      const source=value.songs?.[stage]||value.songs?.[String(stage)]||{};
      if(source.a||source.b)songs[stage]={a:!!source.a,b:!!source.b};
      if(value.completed?.[stage]||value.completed?.[String(stage)])completed[stage]=true;
    }
    return{songs,completed};
  }
  function read(){
    try{return normalize(JSON.parse(safeGet(KEY)||"null"))}
    catch(error){storageError(error,"parse-progress");return blank()}
  }
  function readHistory(){
    try{
      const value=JSON.parse(safeGet(HISTORY_KEY)||"[]");
      return Array.isArray(value)?value.filter(item=>item&&item.state).slice(0,MAX_HISTORY):[];
    }catch(error){storageError(error,"parse-progress-history");return[]}
  }
  function remember(reason){
    const history=readHistory(),state=read();
    if(history[0]&&JSON.stringify(history[0].state)===JSON.stringify(state))return true;
    history.unshift({at:Date.now(),reason:String(reason||"Actualizar progreso"),state});
    return safeSet(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_HISTORY)));
  }
  function write(state,options={}){
    const value=normalize(state);
    if(options.backup!==false&&!remember(options.reason))return read();
    if(!safeSet(KEY,JSON.stringify(value)))return read();
    emit("fortissimo:path-progress",value);
    return value;
  }
  function canUndo(){return readHistory().length>0}
  function undo(){
    const history=readHistory(),snapshot=history.shift();
    if(!snapshot)return false;
    if(!safeSet(KEY,JSON.stringify(normalize(snapshot.state))))return false;
    safeSet(HISTORY_KEY,JSON.stringify(history));
    emit("fortissimo:path-progress",normalize(snapshot.state));
    return true;
  }
  function normalizeStage(stage){return Math.max(1,Math.min(12,Number(stage)||1))}
  function firstIncomplete(state=read()){for(let stage=1;stage<=12;stage+=1)if(!state.completed[stage])return stage;return 12}
  function isUnlocked(stage,state=read()){return normalizeStage(stage)<=firstIncomplete(state)}
  function toggleSong(stage,role){
    stage=normalizeStage(stage);role=role==="b"?"b":"a";
    const state=read();
    if(!isUnlocked(stage,state)||state.completed[stage])return state;
    state.songs[stage]=state.songs[stage]||{a:false,b:false};
    state.songs[stage][role]=!state.songs[stage][role];
    return write(state,{reason:`Cambiar estado de canción ${role.toUpperCase()}`});
  }
  function completeStage(stage){
    stage=normalizeStage(stage);
    const state=read(),songs=state.songs[stage]||{};
    if(!isUnlocked(stage,state)||!songs.a||!songs.b)return state;
    state.completed[stage]=true;
    return write(state,{reason:`Completar Stage ${String(stage).padStart(2,"0")}`});
  }
  function stats(state=read()){
    let learned=0,completed=0;
    for(let stage=1;stage<=12;stage+=1){
      const songs=state.songs[stage]||{};
      if(songs.a)learned+=1;if(songs.b)learned+=1;if(state.completed[stage])completed+=1;
    }
    return{learned,completed,percent:Math.round(learned/24*100),current:firstIncomplete(state),finished:completed===12};
  }
  function loadPolish(){
    if(!document.querySelector('link[data-study-polish="v1"]')){
      const link=document.createElement("link");
      link.rel="stylesheet";link.href="assets/study-paths-polish-v1.css?v=phase10";link.dataset.studyPolish="v1";
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-study-polish="v1"]')){
      const script=document.createElement("script");
      script.src="assets/study-paths-polish-v1.js?v=phase10";script.dataset.studyPolish="v1";script.defer=true;
      document.head.appendChild(script);
    }
  }
  loadPolish();
  window.FortissimoStudyPath={read,write,toggleSong,completeStage,isUnlocked,stats,canUndo,undo};
})();
