(function(){
  const KEY="fortissimo.studyPaths.roadToAfrobeats.v1";
  const blank=()=>({songs:{},completed:{}});
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY));return value&&typeof value==="object"?{songs:value.songs||{},completed:value.completed||{}}:blank()}catch(error){return blank()}}
  function write(state){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent("fortissimo:path-progress",{detail:state}));return state}
  function normalizeStage(stage){return Math.max(1,Math.min(12,Number(stage)||1))}
  function firstIncomplete(state=read()){for(let stage=1;stage<=12;stage+=1)if(!state.completed[stage])return stage;return 12}
  function isUnlocked(stage,state=read()){return normalizeStage(stage)<=firstIncomplete(state)}
  function toggleSong(stage,role){stage=normalizeStage(stage);role=role==="b"?"b":"a";const state=read();if(!isUnlocked(stage,state)||state.completed[stage])return state;state.songs[stage]=state.songs[stage]||{a:false,b:false};state.songs[stage][role]=!state.songs[stage][role];return write(state)}
  function completeStage(stage){stage=normalizeStage(stage);const state=read(),songs=state.songs[stage]||{};if(!isUnlocked(stage,state)||!songs.a||!songs.b)return state;state.completed[stage]=true;return write(state)}
  function stats(state=read()){let learned=0,completed=0;for(let stage=1;stage<=12;stage+=1){const songs=state.songs[stage]||{};if(songs.a)learned+=1;if(songs.b)learned+=1;if(state.completed[stage])completed+=1}return{learned,completed,percent:Math.round(learned/24*100),current:firstIncomplete(state),finished:completed===12}}
  window.FortissimoStudyPath={read,write,toggleSong,completeStage,isUnlocked,stats};
})();
