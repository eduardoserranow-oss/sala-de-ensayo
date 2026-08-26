(function(){
  "use strict";

  if(window.__FORTISSIMO_ROUTINE_UX_POLISH_V1__) return;
  window.__FORTISSIMO_ROUTINE_UX_POLISH_V1__=true;

  const list=document.getElementById("exerciseList");
  const editor=document.getElementById("tabEditor");
  if(!list) return;

  const HOLD_MS=520;
  const MOVE_CANCEL_PX=12;
  let renameMenu=null;
  let activeTitle=null;

  installStyles();
  enhanceRows();
  new MutationObserver(enhanceRows).observe(list,{childList:true,subtree:true});

  // The editor normally advances the cursor to the separator immediately after
  // a note. If the user presses backspace there, move the editor cursor back to
  // the adjacent number first so the existing editor deletes the note, not the
  // separator column. The original editor still performs the actual mutation,
  // undo history, redraw and persistence.
  window.addEventListener("click",event=>{
    const button=event.target?.closest?.("#deleteNote");
    if(!button || !editor?.classList.contains("is-open")) return;

    const selected=editor.querySelector(".editor-line.is-selected");
    const body=selected?.querySelector(".editor-line-body");
    const slot=body?.querySelector(".cursor-slot");
    if(!body || !slot || slot.textContent!=="-") return;

    const before=slot.previousSibling?.textContent || "";
    const adjacentNumber=before.match(/\d+$/);
    if(!adjacentNumber) return;

    const cursorIndex=before.length;
    const noteStart=cursorIndex-adjacentNumber[0].length;
    const text=body.textContent || "";
    const rect=body.getBoundingClientRect();
    const charWidth=rect.width/Math.max(text.length,1);
    const clientX=rect.left+charWidth*(noteStart+.5);
    const clientY=rect.top+Math.max(1,rect.height/2);

    try{
      const PointerCtor=window.PointerEvent || window.MouseEvent;
      body.dispatchEvent(new PointerCtor("pointerdown",{
        bubbles:true,
        cancelable:true,
        clientX,
        clientY,
        pointerType:"mouse",
        pointerId:991
      }));
    }catch(_){ }
  },true);

  document.addEventListener("pointerdown",event=>{
    if(!renameMenu) return;
    if(event.target.closest?.(".fortissimo-rename-menu") || event.target.closest?.(".exercise-title")) return;
    closeRenameMenu();
  },true);

  window.addEventListener("resize",closeRenameMenu,{passive:true});
  window.addEventListener("scroll",closeRenameMenu,{passive:true,capture:true});

  function installStyles(){
    if(document.getElementById("fortissimoRoutineUxPolishV1")) return;
    const style=document.createElement("style");
    style.id="fortissimoRoutineUxPolishV1";
    style.textContent=`
      .exercise-title[data-fortissimo-title]{
        cursor:default!important;
        -webkit-user-select:none!important;
        user-select:none!important;
        -webkit-touch-callout:none!important;
        outline:none!important;
      }
      .exercise-title[data-fortissimo-title].is-renaming{
        cursor:text!important;
        -webkit-user-select:text!important;
        user-select:text!important;
        border-radius:8px;
        outline:1px solid rgba(255,90,0,.72)!important;
        outline-offset:5px!important;
      }
      .tab-preview[data-fortissimo-open-tab]{
        cursor:pointer!important;
        transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease!important;
        -webkit-tap-highlight-color:transparent;
      }
      .tab-preview[data-fortissimo-open-tab]:hover{
        border-color:rgba(255,90,0,.55)!important;
        box-shadow:0 0 0 1px rgba(255,90,0,.10),0 12px 28px rgba(0,0,0,.24)!important;
      }
      .tab-preview[data-fortissimo-open-tab]:active{transform:scale(.992)}
      .tab-preview[data-fortissimo-open-tab]:focus-visible{
        outline:2px solid rgba(255,90,0,.78)!important;
        outline-offset:3px!important;
      }
      .fortissimo-rename-menu{
        position:fixed;
        z-index:260;
        min-width:148px;
        padding:6px;
        border:1px solid rgba(255,255,255,.13);
        border-radius:14px;
        background:rgba(17,17,17,.97);
        box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 0 1px rgba(255,90,0,.05);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
        transform-origin:top left;
        animation:fortissimoRenameIn .14s cubic-bezier(.22,1,.36,1);
      }
      .fortissimo-rename-menu button{
        width:100%;
        min-height:42px;
        border:0;
        border-radius:10px;
        padding:0 14px;
        display:flex;
        align-items:center;
        justify-content:flex-start;
        background:transparent;
        color:#fff;
        font:800 14px/1 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        cursor:pointer;
      }
      .fortissimo-rename-menu button:hover,.fortissimo-rename-menu button:focus-visible{
        background:rgba(255,90,0,.12);
        color:#ff7a2b;
        outline:none;
      }
      @keyframes fortissimoRenameIn{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function enhanceRows(){
    [...list.querySelectorAll(".exercise-row")].forEach(row=>{
      const title=row.querySelector(".exercise-title");
      if(title) enhanceTitle(title);
      const preview=row.querySelector(".tab-preview");
      if(preview) enhancePreview(preview,row);
    });
  }

  function enhancePreview(preview,row){
    if(preview.dataset.fortissimoOpenTab) return;
    preview.dataset.fortissimoOpenTab="true";
    preview.tabIndex=0;
    preview.setAttribute("role","button");
    preview.setAttribute("aria-label","Abrir editor de tablatura");

    const open=()=>{
      const edit=row.querySelector("[data-edit-tab]");
      if(edit) edit.click();
    };

    preview.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    preview.addEventListener("keydown",event=>{
      if(event.key!=="Enter" && event.key!==" ") return;
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    preview.addEventListener("pointerdown",event=>event.stopPropagation(),true);
    preview.addEventListener("touchstart",event=>event.stopPropagation(),{capture:true,passive:true});
  }

  function enhanceTitle(title){
    if(title.dataset.fortissimoTitle) return;
    title.dataset.fortissimoTitle="true";
    title.setAttribute("contenteditable","false");
    title.setAttribute("role","button");
    title.setAttribute("aria-label",`${title.textContent.trim() || "Ejercicio"}. Mantén pulsado para renombrar.`);
    title.tabIndex=0;

    let timer=0;
    let pointerId=null;
    let startX=0;
    let startY=0;
    let armed=false;

    const clear=()=>{
      if(timer) window.clearTimeout(timer);
      timer=0;
      armed=false;
      pointerId=null;
    };

    title.addEventListener("pointerdown",event=>{
      if(title.classList.contains("is-renaming")) return;
      if(event.pointerType==="mouse" && event.button!==0) return;
      event.stopPropagation();
      closeRenameMenu();
      pointerId=event.pointerId;
      startX=event.clientX;
      startY=event.clientY;
      armed=true;
      timer=window.setTimeout(()=>{
        if(!armed) return;
        armed=false;
        if(navigator.vibrate) try{navigator.vibrate(18);}catch(_){ }
        showRenameMenu(title);
      },HOLD_MS);
    },true);

    title.addEventListener("pointermove",event=>{
      if(!armed || event.pointerId!==pointerId) return;
      if(Math.hypot(event.clientX-startX,event.clientY-startY)>MOVE_CANCEL_PX) clear();
    },true);
    title.addEventListener("pointerup",clear,true);
    title.addEventListener("pointercancel",clear,true);
    title.addEventListener("touchstart",event=>event.stopPropagation(),{capture:true,passive:true});
    title.addEventListener("click",event=>{
      if(title.classList.contains("is-renaming")) return;
      event.preventDefault();
      event.stopPropagation();
    });
    title.addEventListener("contextmenu",event=>{
      if(title.classList.contains("is-renaming")) return;
      event.preventDefault();
      event.stopPropagation();
      showRenameMenu(title);
    });
    title.addEventListener("keydown",event=>{
      if(title.classList.contains("is-renaming")){
        if(event.key==="Enter"){
          event.preventDefault();
          title.blur();
        }else if(event.key==="Escape"){
          event.preventDefault();
          const original=title.dataset.renameOriginal;
          if(original!=null) title.textContent=original;
          title.blur();
        }
        return;
      }
      if(event.key==="Enter" || event.key===" " || event.key==="F2"){
        event.preventDefault();
        showRenameMenu(title);
      }
    });
  }

  function showRenameMenu(title){
    closeRenameMenu();
    activeTitle=title;
    const menu=document.createElement("div");
    menu.className="fortissimo-rename-menu";
    menu.setAttribute("role","menu");
    menu.innerHTML='<button type="button" role="menuitem">Renombrar</button>';
    document.body.appendChild(menu);
    renameMenu=menu;

    const rect=title.getBoundingClientRect();
    const menuWidth=156;
    const left=Math.max(12,Math.min(window.innerWidth-menuWidth-12,rect.left));
    let top=rect.bottom+10;
    if(top+58>window.innerHeight) top=Math.max(12,rect.top-58);
    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;

    const button=menu.querySelector("button");
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      beginRename(title);
    });
    requestAnimationFrame(()=>button.focus({preventScroll:true}));
  }

  function beginRename(title){
    closeRenameMenu(false);
    activeTitle=title;
    title.dataset.renameOriginal=title.textContent.trim();
    title.classList.add("is-renaming");
    title.setAttribute("contenteditable","true");
    title.setAttribute("spellcheck","false");
    title.focus({preventScroll:true});

    const selection=window.getSelection?.();
    if(selection){
      const range=document.createRange();
      range.selectNodeContents(title);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const finish=()=>{
      title.removeEventListener("blur",finish);
      title.classList.remove("is-renaming");
      title.setAttribute("contenteditable","false");
      title.removeAttribute("data-rename-original");
      title.setAttribute("aria-label",`${title.textContent.trim() || "Ejercicio"}. Mantén pulsado para renombrar.`);
      activeTitle=null;
    };
    title.addEventListener("blur",finish);
  }

  function closeRenameMenu(clearActive=true){
    renameMenu?.remove();
    renameMenu=null;
    if(clearActive && activeTitle && !activeTitle.classList.contains("is-renaming")) activeTitle=null;
  }
})();