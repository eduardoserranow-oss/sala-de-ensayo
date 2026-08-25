(function(){
  "use strict";

  if(window.FortissimoCloud) return;

  const API_URL="https://sducrbueumvxyfwwlvtf.supabase.co";
  const API_KEY="sb_publishable_4MXT0RsLnZ0GjJwH7M-NcQ_z6MzJV9a";
  const SESSION_KEY="myLessons.localSession";
  const HOME_PREFIX="myLessons.homePersonalization.v1:";
  const SOUNDGYM_PREFIX="myLessons.soundGym.";
  const ACCOUNT_PREFIX="fortissimo.accountStorage.v1:";
  const MIGRATION_SNAPSHOT_KEY="fortissimo.cloudMigrationSnapshot.v1";
  const CLOUD_RELOAD_KEY="fortissimo.cloudReloadFingerprint.v1";

  const proto=Storage.prototype;
  const previousGet=proto.getItem;
  const previousSet=proto.setItem;
  const previousRemove=proto.removeItem;
  let applyingRemote=false;
  let saveTimer=0;
  let saveInFlight=Promise.resolve();
  let bootstrapPromise=null;

  function getSession(){
    try{
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || JSON.parse(sessionStorage.getItem(SESSION_KEY));
    }catch(_){return null;}
  }

  function validCloudSession(session){
    return Boolean(session?.user?.id && session?.cloudToken);
  }

  async function rpc(name,payload){
    const response=await fetch(`${API_URL}/rest/v1/rpc/${name}`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "apikey":API_KEY,
        "Authorization":`Bearer ${API_KEY}`
      },
      body:JSON.stringify(payload||{})
    });
    if(!response.ok){
      const text=await response.text().catch(()=>"");
      throw new Error(`Cloud RPC ${name} failed: ${response.status} ${text}`);
    }
    return await response.json();
  }

  function accountScopedPrefix(userId){
    return `${ACCOUNT_PREFIX}${encodeURIComponent(String(userId||""))}:`;
  }

  function parseStored(value){
    if(value===null||value===undefined) return null;
    try{return JSON.parse(value);}catch(_){return value;}
  }

  function stringifyStored(value){
    return typeof value==="string" ? value : JSON.stringify(value);
  }

  function captureLegacySnapshot(){
    const session=getSession();
    const preferredId=String(session?.user?.id||session?.user?.email||session?.user?.username||"");
    let homePersonalization=null;

    try{
      if(preferredId){
        const exact=localStorage.getItem(HOME_PREFIX+preferredId);
        if(exact) homePersonalization=parseStored(exact);
      }
      if(!homePersonalization){
        for(let i=0;i<localStorage.length;i+=1){
          const key=localStorage.key(i);
          if(key?.startsWith(HOME_PREFIX)){
            const value=localStorage.getItem(key);
            if(value){homePersonalization=parseStored(value);break;}
          }
        }
      }
    }catch(_){ }

    const soundGymStorage={};
    try{
      const preferredScoped=preferredId ? accountScopedPrefix(preferredId) : "";
      for(let i=0;i<localStorage.length;i+=1){
        const key=localStorage.key(i);
        if(!key) continue;
        if(key.startsWith(SOUNDGYM_PREFIX)){
          soundGymStorage[key]=parseStored(localStorage.getItem(key));
          continue;
        }
        if(preferredScoped && key.startsWith(preferredScoped+SOUNDGYM_PREFIX)){
          const original=key.slice(preferredScoped.length);
          soundGymStorage[original]=parseStored(localStorage.getItem(key));
        }
      }
    }catch(_){ }

    const snapshot={};
    if(homePersonalization && typeof homePersonalization==="object") snapshot.homePersonalization=homePersonalization;
    if(Object.keys(soundGymStorage).length) snapshot.soundGymStorage=soundGymStorage;
    return snapshot;
  }

  function stashMigrationSnapshot(){
    const snapshot=captureLegacySnapshot();
    try{sessionStorage.setItem(MIGRATION_SNAPSHOT_KEY,JSON.stringify(snapshot));}catch(_){ }
    return snapshot;
  }

  function consumeMigrationSnapshot(){
    try{
      const raw=sessionStorage.getItem(MIGRATION_SNAPSHOT_KEY);
      sessionStorage.removeItem(MIGRATION_SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(_){return {};}
  }

  function currentHomeState(session){
    if(!session?.user?.id) return null;
    try{
      const raw=localStorage.getItem(HOME_PREFIX+session.user.id);
      return raw ? parseStored(raw) : null;
    }catch(_){return null;}
  }

  function collectCurrentSoundGym(session){
    const result={};
    if(!session?.user?.id) return result;
    const scoped=accountScopedPrefix(session.user.id);
    try{
      for(let i=0;i<localStorage.length;i+=1){
        const key=localStorage.key(i);
        if(!key) continue;
        if(key.startsWith(scoped+SOUNDGYM_PREFIX)){
          const original=key.slice(scoped.length);
          result[original]=parseStored(localStorage.getItem(key));
        }else if(key.startsWith(SOUNDGYM_PREFIX) && result[key]===undefined){
          result[key]=parseStored(localStorage.getItem(key));
        }
      }
    }catch(_){ }
    return result;
  }

  function buildCurrentPatch(){
    const session=getSession();
    if(!validCloudSession(session)) return null;
    const patch={};
    const home=currentHomeState(session);
    const soundGym=collectCurrentSoundGym(session);
    if(home && typeof home==="object") patch.homePersonalization=home;
    if(Object.keys(soundGym).length) patch.soundGymStorage=soundGym;
    return patch;
  }

  function hasUsefulPayload(payload){
    return Boolean(
      payload && typeof payload==="object" &&
      ((payload.homePersonalization && typeof payload.homePersonalization==="object") ||
       (payload.soundGymStorage && Object.keys(payload.soundGymStorage).length))
    );
  }

  function applyPayload(payload,session){
    if(!validCloudSession(session) || !payload || typeof payload!=="object") return false;
    let changed=false;
    applyingRemote=true;
    try{
      if(payload.homePersonalization && typeof payload.homePersonalization==="object"){
        const key=HOME_PREFIX+session.user.id;
        const next=JSON.stringify(payload.homePersonalization);
        const prev=localStorage.getItem(key);
        if(prev!==next){localStorage.setItem(key,next);changed=true;}
      }

      if(payload.soundGymStorage && typeof payload.soundGymStorage==="object"){
        const scoped=accountScopedPrefix(session.user.id);
        Object.entries(payload.soundGymStorage).forEach(([original,value])=>{
          if(!String(original).startsWith(SOUNDGYM_PREFIX)) return;
          const key=scoped+original;
          const next=stringifyStored(value);
          const prev=localStorage.getItem(key);
          if(prev!==next){localStorage.setItem(key,next);changed=true;}
        });
      }
    }finally{
      applyingRemote=false;
    }
    return changed;
  }

  async function loadState(sessionArg){
    const session=sessionArg||getSession();
    if(!validCloudSession(session)) return {ok:false,error:"no_cloud_session",payload:{}};
    const result=await rpc("fortissimo_load_state",{
      p_account_id:session.user.id,
      p_token:session.cloudToken
    });
    return result||{ok:false,payload:{}};
  }

  async function savePatch(patch,sessionArg){
    const session=sessionArg||getSession();
    if(!validCloudSession(session) || !patch || typeof patch!=="object") return {ok:false,error:"no_cloud_session"};
    return await rpc("fortissimo_save_state",{
      p_account_id:session.user.id,
      p_token:session.cloudToken,
      p_patch:patch
    });
  }

  async function afterLogin(snapshotArg){
    const session=getSession();
    if(!validCloudSession(session)) return;
    const snapshot=snapshotArg && typeof snapshotArg==="object" ? snapshotArg : consumeMigrationSnapshot();
    let loaded;
    try{loaded=await loadState(session);}catch(_){loaded=null;}
    const payload=loaded?.ok ? (loaded.payload||{}) : {};

    if(!hasUsefulPayload(payload) && hasUsefulPayload(snapshot)){
      try{
        const saved=await savePatch(snapshot,session);
        applyPayload(saved?.payload||snapshot,session);
      }catch(_){applyPayload(snapshot,session);}
      return;
    }

    if(hasUsefulPayload(payload)) applyPayload(payload,session);
  }

  async function bootstrap(options){
    const opts=options||{};
    if(bootstrapPromise && !opts.force) return bootstrapPromise;
    bootstrapPromise=(async()=>{
      const session=getSession();
      const onLoginPage=/\/login\.html$/i.test(location.pathname);

      if(session?.user && !session.cloudToken && !onLoginPage){
        stashMigrationSnapshot();
        try{localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_KEY);}catch(_){ }
        const u=new URL("login.html",location.href);
        u.searchParams.set("returnTo",location.pathname.endsWith("sound-gym.html") ? "sound-gym.html" : "./");
        u.searchParams.set("cloud","1");
        location.replace(u.href);
        return {redirecting:true};
      }

      if(!validCloudSession(session) || onLoginPage) return {ok:false};

      try{
        const loaded=await loadState(session);
        if(!loaded?.ok) return loaded;
        const payload=loaded.payload||{};
        const changed=applyPayload(payload,session);
        if(changed && opts.reloadIfChanged!==false){
          const fingerprint=simpleHash(JSON.stringify(payload));
          const previous=sessionStorage.getItem(CLOUD_RELOAD_KEY);
          if(previous!==fingerprint){
            sessionStorage.setItem(CLOUD_RELOAD_KEY,fingerprint);
            location.reload();
            return {ok:true,reloading:true};
          }
        }
        return loaded;
      }catch(error){
        console.warn("FORTISSIMO cloud sync unavailable",error);
        return {ok:false,error:"network"};
      }
    })();
    return bootstrapPromise;
  }

  function scheduleSave(){
    if(applyingRemote) return;
    const session=getSession();
    if(!validCloudSession(session)) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      const patch=buildCurrentPatch();
      if(!patch || !Object.keys(patch).length) return;
      saveInFlight=saveInFlight.catch(()=>{}).then(()=>savePatch(patch,session)).catch(error=>{
        console.warn("FORTISSIMO cloud save failed",error);
      });
    },420);
  }

  function isRelevantStorageKey(key){
    if(typeof key!=="string") return false;
    return key.startsWith(HOME_PREFIX) || key.startsWith(SOUNDGYM_PREFIX) ||
      (key.startsWith(ACCOUNT_PREFIX) && key.includes(`:${SOUNDGYM_PREFIX}`));
  }

  proto.setItem=function(key,value){
    const result=previousSet.call(this,key,value);
    if(this===localStorage && isRelevantStorageKey(key)) scheduleSave();
    return result;
  };

  proto.removeItem=function(key){
    const result=previousRemove.call(this,key);
    if(this===localStorage && isRelevantStorageKey(key)) scheduleSave();
    return result;
  };

  async function login(username,pin){
    return await rpc("fortissimo_login",{p_username:username,p_pin:pin});
  }

  async function createAccount(username,pin){
    return await rpc("fortissimo_create_account",{p_username:username,p_pin:pin});
  }

  async function logout(sessionArg){
    const session=sessionArg||getSession();
    if(!validCloudSession(session)) return;
    try{
      await rpc("fortissimo_logout",{p_account_id:session.user.id,p_token:session.cloudToken});
    }catch(_){ }
  }

  function simpleHash(input){
    let hash=2166136261;
    const text=String(input||"");
    for(let i=0;i<text.length;i+=1){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  window.FortissimoCloud={
    version:1,
    getSession,
    login,
    createAccount,
    logout,
    loadState,
    savePatch,
    bootstrap,
    afterLogin,
    captureLegacySnapshot,
    stashMigrationSnapshot,
    consumeMigrationSnapshot,
    applyPayload,
    buildCurrentPatch,
    scheduleSave
  };

  window.addEventListener("pagehide",()=>{
    const patch=buildCurrentPatch();
    const session=getSession();
    if(!patch || !validCloudSession(session)) return;
    try{
      fetch(`${API_URL}/rest/v1/rpc/fortissimo_save_state`,{
        method:"POST",
        keepalive:true,
        headers:{"Content-Type":"application/json","apikey":API_KEY,"Authorization":`Bearer ${API_KEY}`},
        body:JSON.stringify({p_account_id:session.user.id,p_token:session.cloudToken,p_patch:patch})
      });
    }catch(_){ }
  });

  document.addEventListener("click",event=>{
    if(event.target.closest?.("#logoutButton")) logout().catch(()=>{});
  },true);

  bootstrap({reloadIfChanged:true});
})();
