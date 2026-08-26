(function(){
  "use strict";

  const REMEMBER_KEY="myLessons.rememberLogin";
  const SESSION_KEY="myLessons.localSession";
  const LEGACY_USERS_KEY="myLessons.localPinUsers";
  const LAUNCH_VERSION="fortissimo-cloud3";

  const mountEl=document.getElementById("loginMount");
  const launchEl=document.getElementById("forteLaunch");

  let form=null;
  let userInput=null;
  let pinInput=null;
  let rememberInput=null;
  let submitButton=null;
  let createButton=null;
  let backButton=null;
  let forgotButton=null;
  let messageEl=null;
  let mode="login";
  let launchFinished=false;
  let formMounted=false;

  boot();

  async function boot(){
    // Start cloud/session work immediately, but do not create any credential
    // fields yet. This is what prevents iOS Password AutoFill from covering
    // the FORTISSIMO launch animation.
    const sessionCheck=resolveExistingSession();
    const launchPlayback=playLaunch();

    await launchPlayback;
    launchFinished=true;

    const hasRememberedSession=await sessionCheck;
    if(hasRememberedSession){
      await redirectAfterLogin();
      return;
    }

    await revealLoginAfterLaunch();
  }

  async function playLaunch(){
    if(window.ForteLaunch&&launchEl){
      await window.ForteLaunch.playFull(launchEl);
      return;
    }
    await delay(850);
  }

  async function resolveExistingSession(){
    const existing=getSession();

    // Load the cloud client silently during the animation so a new login is
    // ready the moment the launch finishes.
    const cloudReady=ensureCloud();

    if(!existing?.user?.id||!existing?.cloudToken){
      await cloudReady;
      return false;
    }

    await cloudReady;
    try{
      await window.FortissimoCloud?.bootstrap({force:true,reloadIfChanged:false});
    }catch(error){
      // Keep the remembered local session usable if the network is briefly
      // unavailable, matching the previous behavior while avoiding a stuck
      // login screen.
      console.warn("Silent session bootstrap failed",error);
    }
    return true;
  }

  async function revealLoginAfterLaunch(){
    document.body.classList.remove("login-ready");

    // Finish the launch fade before credential fields exist in the DOM.
    // iOS therefore has nothing to classify as a login while the intro plays.
    if(window.ForteLaunch&&launchEl){
      window.ForteLaunch.hide(launchEl,220);
      await delay(540);
    }else if(launchEl){
      launchEl.style.display="none";
    }

    mountLoginForm();
    await nextPaint();
    document.body.classList.add("login-ready");
  }

  function mountLoginForm(){
    if(formMounted||!mountEl) return;
    formMounted=true;
    mountEl.innerHTML=`
      <section class="login-card" aria-label="Entrar a FORTISSIMO">
        <img class="login-icon" src="assets/fortissimo-icon-192-20260824.png?v=fortissimo-icon7" alt="FORTISSIMO" />
        <h1>Entrar a FORTISSIMO</h1>
        <p>Usa tu usuario para abrir tus rutinas.</p>

        <form id="loginForm" autocomplete="off" novalidate>
          <label>
            Usuario
            <input id="loginUser" name="fortissimo_user" type="text" inputmode="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" data-form-type="other" data-lpignore="true" placeholder="Usuario" required />
          </label>

          <label>
            PIN
            <input id="loginPin" name="fortissimo_pin" class="pin-field" type="text" inputmode="numeric" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" data-form-type="other" data-lpignore="true" maxlength="4" minlength="4" pattern="[0-9]{4}" enterkeyhint="done" placeholder="0000" required />
          </label>

          <label class="remember">
            <input id="rememberLogin" type="checkbox" checked autocomplete="off" />
            Mantener sesión iniciada
          </label>

          <button id="loginSubmit" type="submit">Entrar</button>
          <button class="secondary-button" id="createAccount" type="button">Crear cuenta</button>
          <div class="pin-actions">
            <button class="link-button" id="backToLogin" type="button" hidden>Ya tengo cuenta</button>
            <button class="link-button" id="forgotPin" type="button">Olvide mi PIN</button>
          </div>
          <div class="message" id="loginMessage" aria-live="polite"></div>
        </form>
      </section>`;

    bindLoginForm();
  }

  function bindLoginForm(){
    form=document.getElementById("loginForm");
    userInput=document.getElementById("loginUser");
    pinInput=document.getElementById("loginPin");
    rememberInput=document.getElementById("rememberLogin");
    submitButton=document.getElementById("loginSubmit");
    createButton=document.getElementById("createAccount");
    backButton=document.getElementById("backToLogin");
    forgotButton=document.getElementById("forgotPin");
    messageEl=document.getElementById("loginMessage");

    if(rememberInput) rememberInput.checked=localStorage.getItem(REMEMBER_KEY)!=="false";
    if(userInput) userInput.value="";
    if(pinInput) pinInput.value="";

    // Never focus a credential field programmatically. Keyboard/AutoFill only
    // appears after the user deliberately touches a field.
    try{document.activeElement?.blur?.();}catch(_){ }

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
      if(submitButton) submitButton.disabled=false;
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
        if(existing.dataset.loaded==="1"){resolve();return;}
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",resolve,{once:true});
        return;
      }
      const script=document.createElement("script");
      script.src="assets/fortissimo-cloud-v1.js?v=cloud2";
      script.dataset.fortissimoCloud="v1";
      script.onload=()=>{script.dataset.loaded="1";resolve();};
      script.onerror=resolve;
      document.head.appendChild(script);
    });
  }

  function normalizeUsername(value){return String(value||"").trim().toLowerCase().replace(/\s+/g,"");}
  function setMessage(message){if(messageEl) messageEl.textContent=message;}
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
})();
