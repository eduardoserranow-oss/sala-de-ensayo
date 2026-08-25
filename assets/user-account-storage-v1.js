(function(){
  "use strict";

  const SESSION_KEY="myLessons.localSession";
  const SOUNDGYM_PREFIX="myLessons.soundGym.";
  const ACCOUNT_PREFIX="fortissimo.accountStorage.v1:";
  const OWNER_EMAIL="eduardoserranow@gmail.com";
  const OWNER_USERNAME="serra";

  const storageProto=Storage.prototype;
  const nativeGet=storageProto.getItem;
  const nativeSet=storageProto.setItem;
  const nativeRemove=storageProto.removeItem;
  const nativeKey=storageProto.key;

  function readSession(){
    try{
      const raw=nativeGet.call(localStorage,SESSION_KEY)||nativeGet.call(sessionStorage,SESSION_KEY);
      return raw?JSON.parse(raw):null;
    }catch(_){return null;}
  }

  function getUser(){
    const user=readSession()?.user||{};
    const id=String(user.id||user.email||user.username||"guest").trim().toLowerCase();
    const username=String(user.username||"").trim().toLowerCase();
    const email=String(user.email||"").trim().toLowerCase();
    return {id:id||"guest",username,email};
  }

  function accountKey(key,userId){
    return `${ACCOUNT_PREFIX}${encodeURIComponent(userId)}:${key}`;
  }

  function shouldScope(storage,key){
    return storage===localStorage && typeof key==="string" && key.startsWith(SOUNDGYM_PREFIX);
  }

  function isOwner(user){
    return user.email===OWNER_EMAIL || user.username===OWNER_USERNAME;
  }

  function migrateLegacyForCurrentUser(){
    const user=getUser();
    if(user.id==="guest") return;
    const marker=`${ACCOUNT_PREFIX}${encodeURIComponent(user.id)}:soundgym-migrated`;
    if(nativeGet.call(localStorage,marker)==="1") return;

    // Legacy SoundGym progress used to be global. Preserve that existing data
    // only for the original owner account so a new account never inherits it.
    if(isOwner(user)){
      const legacyKeys=[];
      for(let i=0;i<localStorage.length;i+=1){
        const key=nativeKey.call(localStorage,i);
        if(typeof key==="string" && key.startsWith(SOUNDGYM_PREFIX)) legacyKeys.push(key);
      }
      legacyKeys.forEach(key=>{
        const scoped=accountKey(key,user.id);
        if(nativeGet.call(localStorage,scoped)!==null) return;
        const value=nativeGet.call(localStorage,key);
        if(value!==null) nativeSet.call(localStorage,scoped,value);
      });
    }

    nativeSet.call(localStorage,marker,"1");
  }

  migrateLegacyForCurrentUser();

  storageProto.getItem=function(key){
    if(!shouldScope(this,key)) return nativeGet.call(this,key);
    const user=getUser();
    if(user.id==="guest") return null;
    const scoped=accountKey(key,user.id);
    let value=nativeGet.call(this,scoped);
    if(value===null && isOwner(user)){
      const legacy=nativeGet.call(this,key);
      if(legacy!==null){
        nativeSet.call(this,scoped,legacy);
        value=legacy;
      }
    }
    return value;
  };

  storageProto.setItem=function(key,value){
    if(!shouldScope(this,key)) return nativeSet.call(this,key,value);
    const user=getUser();
    if(user.id==="guest") return;
    return nativeSet.call(this,accountKey(key,user.id),String(value));
  };

  storageProto.removeItem=function(key){
    if(!shouldScope(this,key)) return nativeRemove.call(this,key);
    const user=getUser();
    if(user.id==="guest") return;
    return nativeRemove.call(this,accountKey(key,user.id));
  };

  window.FortissimoAccountStorage={
    version:1,
    currentUser(){return getUser();},
    scopedKey(key){return accountKey(key,getUser().id);}
  };
})();
