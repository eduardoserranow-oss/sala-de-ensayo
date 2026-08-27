(function(){
  "use strict";

  const modal=document.getElementById("tabEditor");
  if(!modal) return;

  const originalClose=document.getElementById("closeEditor");
  const saveButton=document.getElementById("saveEditor");
  let mounting=false;

  mountExitUI();

  const observer=new MutationObserver(()=>{
    if(mounting) return;
    mountExitUI();
  });
  observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});

  function mountExitUI(){
    mounting=true;
    try{
      const topbar=modal.querySelector(".editor-topbar");
      if(!topbar) return;

      if(originalClose){
        originalClose.classList.add("editor-original-close-hidden");
        originalClose.setAttribute("aria-hidden","true");
        originalClose.tabIndex=-1;
      }

      const menu=document.getElementById("editorMenuButton");
      if(menu&&menu.parentElement!==topbar) topbar.appendChild(menu);

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
      if(exitButton.parentElement!==topbar) topbar.appendChild(exitButton);

      ensureChoice();
    }finally{
      mounting=false;
    }
  }

  function ensureChoice(){
    if(document.getElementById("editorExitChoice")) return;
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