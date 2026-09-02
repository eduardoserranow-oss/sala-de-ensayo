(function(){
"use strict";
const META_KEY="fortissimo.studyPaths.covers.v1",DB_NAME="fortissimo-study-path-covers",STORE="custom-covers";
function safeGet(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||"{}");return x&&typeof x==="object"?x:{}}catch(_){return{}}}
function safeSet(v){try{localStorage.setItem(META_KEY,JSON.stringify(v));window.dispatchEvent(new CustomEvent("fortissimo:path-cover",{detail:v}));return true}catch(_){return false}}
function meta(id){return safeGet()[id]||{aiCoverUrl:"",coverSource:"default",customUpdatedAt:0}}
function writeMeta(id,patch){const all=safeGet();all[id]={...meta(id),...patch};safeSet(all);return all[id]}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function putBlob(id,blob){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,"readwrite");tx.objectStore(STORE).put(blob,id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function getBlob(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
async function deleteBlob(id){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function setCustom(id,file){if(!file||!String(file.type||"").startsWith("image/"))throw new Error("Selecciona una imagen válida.");if(file.size>8*1024*1024)throw new Error("La portada debe pesar menos de 8 MB.");await putBlob(id,file);writeMeta(id,{coverSource:"custom",customUpdatedAt:Date.now()});return resolve(id)}
function setAI(id,url){writeMeta(id,{aiCoverUrl:String(url||"").trim(),coverSource:"ai"});return resolve(id)}
async function resetAI(id){await deleteBlob(id).catch(()=>{});const m=meta(id);writeMeta(id,{coverSource:m.aiCoverUrl?"ai":"default",customUpdatedAt:0});return resolve(id)}
async function resolve(id){const m=meta(id);if(m.coverSource==="custom"){try{const blob=await getBlob(id);if(blob)return{source:"custom",url:URL.createObjectURL(blob),aiCoverUrl:m.aiCoverUrl||""}}catch(_){}}if(m.aiCoverUrl)return{source:"ai",url:m.aiCoverUrl,aiCoverUrl:m.aiCoverUrl};return{source:"default",url:"",aiCoverUrl:""}}
function hasAI(id){return!!meta(id).aiCoverUrl}
window.FortissimoPathCovers={meta,resolve,setCustom,setAI,resetAI,hasAI};
})();