(function(){
  "use strict";

  const modal=document.getElementById("tabEditor");
  if(!modal) return;

  const originalClose=document.getElementById("closeEditor");
  const saveButton=document.getElementById("saveEditor");
  const nativeRAF=window.requestAnimationFrame.bind(window);

  installSampleFetchGuard();
  buildExitUI();
  placeTopbarControls();

  document.addEventListener("pointerdown",(event)=>{
    if(!event.target.closest?.("[data-edit-tab]")) return;
    nativeRAF(()=>{
      placeTopbarControls();
      nativeRAF(placeTopbarControls);
    });
  },true);

  window.addEventListener("resize",placeTopbarControls,{passive:true});
  window.addEventListener("orientationchange",()=>nativeRAF(placeTopbarControls),{passive:true});

  function installSampleFetchGuard(){
    if(window.__FORTISSIMO_TAB_SAMPLE_FETCH_GUARD__) return;
    window.__FORTISSIMO_TAB_SAMPLE_FETCH_GUARD__=true;

    const nativeFetch=window.fetch.bind(window);
    const queue=[];
    const maxConcurrent=3;
    let active=0;

    function isEditorSampleRequest(input){
      const url=typeof input==="string"?input:String(input?.url||"");
      return /tonejs-instruments/i.test(url);
    }

    function pump(){
      while(active<maxConcurrent&&queue.length){
        const task=queue.shift();
        active+=1;
        nativeFetch(task.input,task.init)
          .then(task.resolve,task.reject)
          .finally(()=>{active-=1;pump();});
      }
    }

    window.fetch=function(input,init){
      if(!isEditorSampleRequest(input)) return nativeFetch(input,init);
      return new Promise((resolve,reject)=>{
        queue.push({input,init,resolve,reject});
        pump();
      });
    };
  }

  function buildExitUI(){
    if(originalClose){
      originalClose.classList.add("editor-original-close-hidden");
      originalClose.setAttribute("aria-hidden","true");
      originalClose.tabIndex=-1;
    }

    let exitButton=document.getElementById("editorExitButton");
    if(!exitButton){
      exitButton=document.createElement("button");
      exitButton.id="editorExitButton";
      exitButton.className="editor-exit-inline";
      exitButton.type="button";
      exitButton.textContent="×";
      exitButton.setAttribute("aria-label","Salir del editor");
      exitButton.title="Salir";
      exitButton.addEventListener("click",openExitChoice);
    }

    if(!document.getElementById("editorExitChoice")){
      const backdrop=document.createElement("div");
      backdrop.id="editorExitChoice";
      backdrop.className="editor-exit-choice";
      backdrop.hidden=true;
      backdrop.innerHTML=`
        <section class="editor-exit-card" role="dialog" aria-modal="true" aria-labelledby="editorExitTitle">
          <h2 id="editorExitTitle">¿Guardar cambios antes de salir?</h2>
          <p>Guarda la tablatura y vuelve a entrenar, o sal sin conservar estos cambios.</p>
          <div class="editor-exit-actions">
            <button class="editor-exit-discard" type="button" data-editor-exit-discard>Olvidar</button>
            <button class="editor-exit-save" type="button" data-editor-exit-save>Guardar</button>
          </div>
        </section>`;
      modal.appendChild(backdrop);
      backdrop.querySelector("[data-editor-exit-discard]")?.addEventListener("click",discardAndExit);
      backdrop.querySelector("[data-editor-exit-save]")?.addEventListener("click",saveAndExit);
    }
  }

  function placeTopbarControls(){
    const topbar=modal.querySelector(".editor-topbar");
    if(!topbar) return;

    const menu=document.getElementById("editorMenuButton");
    if(menu&&menu.parentElement!==topbar) topbar.appendChild(menu);

    const exitButton=document.getElementById("editorExitButton");
    if(exitButton&&exitButton.parentElement!==topbar) topbar.appendChild(exitButton);
  }

  function openExitChoice(event){
    event?.preventDefault();
    event?.stopPropagation();
    const choice=document.getElementById("editorExitChoice");
    if(!choice) return;
    if(modal.classList.contains("is-arrangement-playing")) document.getElementById("playTab")?.click();
    choice.hidden=false;
    choice.querySelector("[data-editor-exit-save]")?.focus({preventScroll:true});
  }

  function hideExitChoice(){
    const choice=document.getElementById("editorExitChoice");
    if(choice) choice.hidden=true;
  }

  function saveAndExit(){
    hideExitChoice();
    saveButton?.click();
  }

  function discardAndExit(){
    hideExitChoice();
    if(!originalClose){
      modal.classList.remove("is-open");
      return;
    }
    const nativeConfirm=window.confirm;
    try{
      window.confirm=()=>true;
      originalClose.click();
    }finally{
      window.confirm=nativeConfirm;
    }
  }
})();