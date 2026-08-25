(function(){
  "use strict";

  const REMEMBER_KEY="myLessons.rememberLogin";
  const SESSION_KEY="myLessons.localSession";
  const LEGACY_USERS_KEY="myLessons.localPinUsers";
  const LAUNCH_VERSION="fortissimo-cloud2";

  const form=document.getElementById("loginForm");
  const userInput=document.getElementById("loginUser");
  const pinInput=document.getElementById("loginPin");
  const rememberInput=document.getElementById("rememberLogin");
  const submitButton=document.getElementById("loginSubmit");
  const createButton=document.getElementById("createAccount");
  const backButton=document.getElementById("backToLogin");
  const forgotButton=document.getElementById("forgotPin");
  const messageEl=document.getElementById("loginMessage");
  const launchEl=document.getElementById("forteLaunch");

  let mode="login";
  let launchFinished=false;

  if(rememberInput) rememberInput.checked=localStorage.getItem(REMEMBER_KEY)!=="false";
  form?.addEventListener("submit",handleSubmit);
  createButton?.addEventListener("click",()=>{
    mode="create";
    submitButton.textContent="Crear cuenta";
    createButton.hidden=true;
    backButton.hidden=false;
    forgotButton.hidden=true;
    setMessage("Crea un usuario y un PIN de 4 números. Esa misma cuenta funcionará en todos tus dispositivos.");
  });
  backButton?.addEventListener("click",()=>{
    mode="login";
    submitButton.textContent="Entrar";
    createButton.hidden=false;
    backButton.hidden=true;
    forgotButton.hidden=false;
    setMessage("");
  });
  forgotButton?.addEventListener("click",()=>{
    setMessage("La recuperación segura de PIN todavía no está habilitada. No crees otra cuenta si quieres conservar tu progreso.");
  });
  pinInput?.addEventListener("input",()=>{
    pinInput.value=pinInput.value.replace(/\D/g,"").slice(0,4);
  });

  boot();

  async function boot(){
    await ensureCloud();
    if(userInput) userInput.value="";

    if(window.ForteLaunch&&launchEl) await window.ForteLaunch.playFull(launchEl);
    else await delay(850);
    launchFinished=true;

    const existing=getSession();
    if(existing?.user?.id&&existing?.cloudToken){
      await window.FortissimoCloud?.bootstrap({force:true,reloadIfChanged:false});
      await redirectAfterLogin();
      return;
    }

    document.body.classList.add("login-ready");
    window.ForteLaunch?.hide(launchEl,220);
  }

  async function handleSubmit(event){
    event.preventDefault();
    const username=normalizeUsername(userInput?.value);
    const pin=String(pinInput?.value||"").trim();
    if(!username){setMessage("Escribe tu usuario.");return;}
    if(!/^\d{4}$/.test(pin)){setMessage("El PIN debe tener 4 números.");return;}

    const remember=rememberInput?.checked!==false;
    localStorage.setItem(REMEMBER_KEY,remember?"true":"false");
    submitButton.disabled=true;
    setMessage(mode==="create"?"Creando tu cuenta...":"Entrando...");

    try{
      await ensureCloud();
      let legacySnapshot=window.FortissimoCloud?.consumeMigrationSnapshot?.() || {};
      if(!Object.keys(legacySnapshot).length){
        legacySnapshot=window.FortissimoCloud?.captureLegacySnapshot?.() || {};
      }

      let result=mode==="create"
        ? await window.FortissimoCloud.createAccount(username,pin)
        : await window.FortissimoCloud.login(username,pin);

      if(mode==="login" && !result?.ok && result?.error==="invalid_credentials" && legacyLocalMatches(username,pin)){
        result=await window.FortissimoCloud.createAccount(username,pin);
      }

      if(!result?.ok){
        if(result?.error==="username_exists") setMessage("Ese usuario ya existe. Vuelve a Entrar con su PIN.");
        else if(result?.error==="invalid_username") setMessage("Usa letras, números, punto, guion o guion bajo.");
        else if(result?.error==="temporarily_locked") setMessage("Demasiados intentos. Espera unos minutos antes de volver a intentar.");
        else setMessage(mode==="create"?"No se pudo crear la cuenta.":"Usuario o PIN incorrecto.");
        return;
      }

      saveSession(result.user,result.token,remember);
      await window.FortissimoCloud.afterLogin(legacySnapshot);
      setMessage("Listo. Tu cuenta y progreso están sincronizados.");
      await beginPostLoginHandoff();
      await redirectAfterLogin();
    }catch(error){
      console.warn("Cloud login failed",error);
      setMessage("No pude conectar con tu cuenta ahora mismo. Revisa tu conexión e inténtalo de nuevo.");
    }finally{
      submitButton.disabled=false;
    }
  }

  function legacyLocalMatches(username,pin){
    try{
      const users=JSON.parse(localStorage.getItem(LEGACY_USERS_KEY)||"{}");
      const user=users?.[username];
      return Boolean(user && String(user.pin||"")===pin);
    }catch(_){return false;}
  }

  function saveSession(user,cloudToken,remember){
    const storageId=makeStorageUserId(user);
    const session={
      user:{
        id:storageId,
        username:user.username,
        email:user.email||user.username,
        role:user.role||"user"
      },
      cloudAccountId:user.id,
      cloudToken,
      createdAt:new Date().toISOString(),
      mode:"fortissimo-cloud"
    };
    const target=remember?localStorage:sessionStorage;
    const other=remember?sessionStorage:localStorage;
    target.setItem(SESSION_KEY,JSON.stringify(session));
    other.removeItem(SESSION_KEY);
  }

  function makeStorageUserId(user){
    const basis=user?.role==="owner" && user?.email ? user.email : (user?.username||user?.email||"");
    let hash=0;
    for(let i=0;i<basis.length;i+=1){hash=((hash<<5)-hash+basis.charCodeAt(i))|0;}
    return "local-"+Math.abs(hash).toString(36);
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY))||JSON.parse(sessionStorage.getItem(SESSION_KEY));}
    catch(_){return null;}
  }

  async function beginPostLoginHandoff(){
    if(!window.ForteLaunch||!launchEl||!launchFinished) return;
    document.body.classList.remove("login-ready");
    await window.ForteLaunch.playHandoff(launchEl);
  }

  async function redirectAfterLogin(){
    try{
      sessionStorage.setItem("forte.launchHandoff.v3","true");
      sessionStorage.setItem("myLessons.splashSeen.v2","true");
      sessionStorage.setItem("forte.smoothSplashSeen.v1","true");
    }catch(_){ }

    const url=new URL(location.href);
    const returnTo=url.searchParams.get("returnTo")||"./";
    const nextUrl=new URL(returnTo,location.href);
    nextUrl.searchParams.set("v",LAUNCH_VERSION);
    nextUrl.searchParams.set("handoff","1");
    location.replace(nextUrl.href);
  }

  async function ensureCloud(){
    if(window.FortissimoCloud) return;
    await new Promise(resolve=>{
      const existing=document.querySelector('script[data-fortissimo-cloud="v1"]');
      if(existing){
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",resolve,{once:true});
        return;
      }
      const script=document.createElement("script");
      script.src="assets/fortissimo-cloud-v1.js?v=cloud2";
      script.dataset.fortissimoCloud="v1";
      script.onload=resolve;
      script.onerror=resolve;
      document.head.appendChild(script);
    });
  }

  function normalizeUsername(value){return String(value||"").trim().toLowerCase().replace(/\s+/g,"");}
  function setMessage(message){if(messageEl) messageEl.textContent=message;}
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
})();
