(function(){
  "use strict";

  if (new URL(location.href).searchParams.get("homeEdit") !== "1") return;

  const STORAGE_KEY = "fortissimo.homeArtworkDraft.v2";
  const LIMIT = 200;
  const ZOOM_RATIO = 2.5;
  let installed = false;

  function clamp(value, min=-LIMIT, max=LIMIT){
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function readDraft(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {version:2, modules:{}};
    } catch (_) {
      return {version:2, modules:{}};
    }
  }

  function writeDraft(draft){
    draft.version = 2;
    draft.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch (_) {}
  }

  function currentMode(panel){
    return panel.querySelector("[data-mode].active")?.dataset.mode || (innerWidth <= 760 ? "mobile" : "desktop");
  }

  function currentModule(panel){
    return panel.querySelector("[data-module]")?.value || "guitar";
  }

  function legacyToZoomFine(frame){
    if (Number.isFinite(Number(frame?.zoomFine))) return clamp(frame.zoomFine);
    const legacy = Math.max(.05, Number(frame?.zoom || 122) / 100);
    const delta = Math.log(legacy / 1.22) / Math.log(ZOOM_RATIO) * LIMIT;
    return clamp(delta);
  }

  function ensureFrame(panel){
    const key = currentModule(panel);
    const mode = currentMode(panel);
    const draft = readDraft();
    draft.modules = draft.modules || {};
    draft.modules[key] = draft.modules[key] || {};
    const frame = draft.modules[key][mode] = Object.assign({x:50,y:50,zoom:122}, draft.modules[key][mode] || {});
    if (!Number.isFinite(Number(frame.panX))) frame.panX = 0;
    if (!Number.isFinite(Number(frame.panY))) frame.panY = 0;
    if (!Number.isFinite(Number(frame.zoomFine))) frame.zoomFine = legacyToZoomFine(frame);
    return {draft, key, mode, frame};
  }

  function scaleFor(frame){
    const delta = clamp(frame.zoomFine);
    return 1.22 * Math.pow(ZOOM_RATIO, delta / LIMIT);
  }

  function valueText(v){
    const n = Math.round(Number(v) || 0);
    return n > 0 ? `+${n}` : String(n);
  }

  function installStyle(){
    if (document.getElementById("homeArtworkEditorControlsV2Style")) return;
    const style = document.createElement("style");
    style.id = "homeArtworkEditorControlsV2Style";
    style.textContent = `
      .home-art-field.home-art-v2-field>span{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}
      .home-art-v2-value{min-width:52px;text-align:right;color:#ff8b45!important;font-variant-numeric:tabular-nums;font-size:11px!important;letter-spacing:.02em!important}
      .home-art-field.home-art-v2-field input[type=range]{height:30px!important;touch-action:none!important}
      .home-art-field.home-art-v2-field input[type=range]::-webkit-slider-thumb{width:22px;height:22px}
      .home-art-frame-stage{touch-action:none!important;user-select:none!important;-webkit-user-select:none!important}
      .hero-stack .routine-hero.home-standard-module>.media{
        background-position:var(--art-base-x,50%) var(--art-base-y,50%)!important;
        transform:translate3d(var(--art-pan-x,0%),calc(var(--p,0px) + var(--art-pan-y,0%)),0) scale(var(--art-scale,1.22))!important;
      }
      @media(max-width:760px){
        .hero-stack .routine-hero.home-standard-module>.media{
          transform:translate3d(var(--art-pan-x,0%),calc(var(--p,0px) + var(--art-pan-y,0%)),0) scale(var(--art-scale,1.22))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function resolveHero(doc, key){
    let hero = doc?.querySelector?.(`[data-home-module="${key}"]`);
    if (hero) return hero;
    const needles = {
      guitar:"guitar-practice.html", bass:"bass-practice.html", soundgym:"sound-gym.html",
      studypaths:"study-projects.html", referencefinder:"reference-finder.html", vibe:"vibe-roulette.html"
    };
    if (key === "vocal") return doc?.querySelector?.("#openVocal")?.closest(".routine-hero") || null;
    const needle = needles[key];
    if (!needle || !doc?.querySelectorAll) return null;
    return [...doc.querySelectorAll(".routine-hero")].find(el =>
      [...el.querySelectorAll("a[href]")].some(a => (a.getAttribute("href") || "").includes(needle))
    ) || null;
  }

  function applyToMedia(media, frame){
    if (!media) return;
    const panX = clamp(frame.panX);
    const panY = clamp(frame.panY);
    media.style.setProperty("--art-base-x", "50%", "important");
    media.style.setProperty("--art-base-y", "50%", "important");
    media.style.setProperty("--art-x", "50%", "important");
    media.style.setProperty("--art-y", "50%", "important");
    media.style.setProperty("--art-pan-x", `${panX * .35}%`, "important");
    media.style.setProperty("--art-pan-y", `${panY * .35}%`, "important");
    media.style.setProperty("--art-scale", String(scaleFor(frame)), "important");
  }

  function applyEverywhere(panel){
    const {key, frame} = ensureFrame(panel);
    const liveHero = resolveHero(document, key);
    applyToMedia(liveHero?.querySelector(":scope > .media") || liveHero?.querySelector(".media"), frame);

    const iframe = panel.querySelector("[data-preview-frame]");
    try {
      const previewHero = resolveHero(iframe?.contentDocument, key);
      const media = previewHero?.querySelector(":scope > .media") || previewHero?.querySelector(".media");
      if (media) {
        applyToMedia(media, frame);
        media.style.setProperty("--p", "0px", "important");
      }
    } catch (_) {}
  }

  function saveFrame(panel, patch){
    const {draft, key, mode, frame} = ensureFrame(panel);
    Object.assign(frame, patch);
    frame.panX = clamp(frame.panX);
    frame.panY = clamp(frame.panY);
    frame.zoomFine = clamp(frame.zoomFine);
    draft.modules[key][mode] = frame;
    writeDraft(draft);
    applyEverywhere(panel);
    return frame;
  }

  function replaceRange(panel, selector, field){
    const old = panel.querySelector(selector);
    if (!old) return null;
    const clone = old.cloneNode(true);
    clone.min = String(-LIMIT);
    clone.max = String(LIMIT);
    clone.step = "1";
    clone.dataset.v2Field = field;
    old.replaceWith(clone);

    const label = clone.closest(".home-art-field");
    label?.classList.add("home-art-v2-field");
    const title = label?.querySelector(":scope > span");
    let value = title?.querySelector(".home-art-v2-value");
    if (title && !value) {
      value = document.createElement("b");
      value.className = "home-art-v2-value";
      title.appendChild(value);
    }

    clone.addEventListener("input", () => {
      const v = clamp(clone.value);
      saveFrame(panel, {[field]: v});
      if (value) value.textContent = valueText(v);
    });
    return clone;
  }

  function syncControls(panel, controls){
    const {frame} = ensureFrame(panel);
    const values = {zoomFine:frame.zoomFine, panX:frame.panX, panY:frame.panY};
    Object.entries(controls).forEach(([field, input]) => {
      if (!input) return;
      input.value = String(clamp(values[field]));
      const out = input.closest(".home-art-field")?.querySelector(".home-art-v2-value");
      if (out) out.textContent = valueText(values[field]);
    });
    applyEverywhere(panel);
  }

  function installGestures(panel, controls){
    const iframe = panel.querySelector("[data-preview-frame]");
    if (!iframe) return;

    function attach(){
      let doc;
      try { doc = iframe.contentDocument; } catch (_) { return; }
      if (!doc || doc.documentElement.dataset.artGestureV2 === "1") return;
      doc.documentElement.dataset.artGestureV2 = "1";

      let dragStart = null;
      let pinchStart = null;

      const point = t => ({x:t.clientX, y:t.clientY});
      const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
      const midpoint = (a,b) => ({x:(a.x+b.x)/2, y:(a.y+b.y)/2});

      doc.addEventListener("touchstart", event => {
        const {frame} = ensureFrame(panel);
        if (event.touches.length === 1) {
          dragStart = {p:point(event.touches[0]), panX:Number(frame.panX)||0, panY:Number(frame.panY)||0};
          pinchStart = null;
        } else if (event.touches.length >= 2) {
          const a=point(event.touches[0]), b=point(event.touches[1]);
          pinchStart = {dist:Math.max(1,distance(a,b)), mid:midpoint(a,b), zoom:Number(frame.zoomFine)||0, panX:Number(frame.panX)||0, panY:Number(frame.panY)||0};
          dragStart = null;
        }
      }, {passive:true});

      doc.addEventListener("touchmove", event => {
        if (event.touches.length === 1 && dragStart) {
          event.preventDefault();
          const p=point(event.touches[0]);
          const w=Math.max(1, iframe.clientWidth || 390), h=Math.max(1, iframe.clientHeight || 844);
          const panX=clamp(dragStart.panX + (p.x-dragStart.p.x)/w*260);
          const panY=clamp(dragStart.panY + (p.y-dragStart.p.y)/h*260);
          saveFrame(panel,{panX,panY});
          syncControls(panel,controls);
        } else if (event.touches.length >= 2 && pinchStart) {
          event.preventDefault();
          const a=point(event.touches[0]), b=point(event.touches[1]), d=Math.max(1,distance(a,b)), mid=midpoint(a,b);
          const zoomFine=clamp(pinchStart.zoom + Math.log(d/pinchStart.dist)/Math.log(ZOOM_RATIO)*LIMIT);
          const w=Math.max(1, iframe.clientWidth || 390), h=Math.max(1, iframe.clientHeight || 844);
          const panX=clamp(pinchStart.panX + (mid.x-pinchStart.mid.x)/w*260);
          const panY=clamp(pinchStart.panY + (mid.y-pinchStart.mid.y)/h*260);
          saveFrame(panel,{zoomFine,panX,panY});
          syncControls(panel,controls);
        }
      }, {passive:false});

      doc.addEventListener("touchend", event => {
        if (!event.touches.length) { dragStart=null; pinchStart=null; }
        else if (event.touches.length === 1) {
          const {frame} = ensureFrame(panel);
          dragStart={p:point(event.touches[0]),panX:Number(frame.panX)||0,panY:Number(frame.panY)||0};
          pinchStart=null;
        }
      }, {passive:true});
    }

    iframe.addEventListener("load", () => {
      setTimeout(attach, 120);
      setTimeout(() => { attach(); syncControls(panel, controls); }, 420);
      setTimeout(() => { attach(); applyEverywhere(panel); }, 900);
    });
    setTimeout(attach, 180);
  }

  function install(panel){
    if (installed || !panel) return;
    installed = true;
    installStyle();

    const controls = {
      zoomFine: replaceRange(panel,"[data-zoom]","zoomFine"),
      panX: replaceRange(panel,"[data-x]","panX"),
      panY: replaceRange(panel,"[data-y]","panY")
    };

    const help = panel.querySelector(".home-art-help");
    if (help) help.textContent = "Zoom, Horizontal y Vertical ahora van de −200 a +200. También puedes arrastrar la imagen con un dedo y hacer pinch con dos dedos directamente sobre la vista previa. Móvil y Desktop siguen guardándose por separado.";

    const select = panel.querySelector("[data-module]");
    select?.addEventListener("change", () => setTimeout(() => syncControls(panel,controls), 80));
    panel.querySelectorAll("[data-mode]").forEach(btn => btn.addEventListener("click", () => setTimeout(() => syncControls(panel,controls), 100)));

    const reset = panel.querySelector("[data-reset]");
    reset?.addEventListener("click", () => setTimeout(() => syncControls(panel,controls), 180));

    const observer = new MutationObserver(() => {
      if (!panel.hidden) applyEverywhere(panel);
    });
    observer.observe(panel,{attributes:true,subtree:true,attributeFilter:["class","hidden"]});

    installGestures(panel,controls);
    syncControls(panel,controls);
  }

  function waitForPanel(){
    const panel = document.querySelector(".home-art-panel");
    if (panel) { install(panel); return; }
    setTimeout(waitForPanel,120);
  }

  waitForPanel();
})();