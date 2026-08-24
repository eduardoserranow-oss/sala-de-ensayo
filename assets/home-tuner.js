(function(){
  "use strict";

  if (window.__MY_LESSONS_TUNER_MOUNTED__) return;
  window.__MY_LESSONS_TUNER_MOUNTED__ = true;

  const ORANGE = "#ff5a00";
  const A4 = 440;
  const INSTRUMENTS = {
    guitar: {
      label: "Guitar 6-string",
      subtitle: "Standard",
      playback: "acoustic",
      minFreq: 70,
      maxFreq: 700,
      strings: [
        { note: "E2", short: "E", freq: 82.4069, midi: 40, string: "6th" },
        { note: "A2", short: "A", freq: 110.0000, midi: 45, string: "5th" },
        { note: "D3", short: "D", freq: 146.8324, midi: 50, string: "4th" },
        { note: "G3", short: "G", freq: 195.9977, midi: 55, string: "3rd" },
        { note: "B3", short: "B", freq: 246.9417, midi: 59, string: "2nd" },
        { note: "E4", short: "E", freq: 329.6276, midi: 64, string: "1st" }
      ]
    },
    bass: {
      label: "Bass 4-string",
      subtitle: "Standard",
      playback: "bass1",
      minFreq: 35,
      maxFreq: 280,
      strings: [
        { note: "E1", short: "E", freq: 41.2034, midi: 28, string: "4th" },
        { note: "A1", short: "A", freq: 55.0000, midi: 33, string: "3rd" },
        { note: "D2", short: "D", freq: 73.4162, midi: 38, string: "2nd" },
        { note: "G2", short: "G", freq: 97.9989, midi: 43, string: "1st" }
      ]
    },
    ukulele: {
      label: "Ukulele",
      subtitle: "Standard",
      playback: "bright",
      minFreq: 220,
      maxFreq: 750,
      strings: [
        { note: "G4", short: "G", freq: 391.9954, midi: 67, string: "4th" },
        { note: "C4", short: "C", freq: 261.6256, midi: 60, string: "3rd" },
        { note: "E4", short: "E", freq: 329.6276, midi: 64, string: "2nd" },
        { note: "A4", short: "A", freq: 440.0000, midi: 69, string: "1st" }
      ]
    }
  };

  let instrumentKey = localStorage.getItem("myLessons.tuner.instrument") || "guitar";
  if (!INSTRUMENTS[instrumentKey]) instrumentKey = "guitar";
  let autoMode = localStorage.getItem("myLessons.tuner.auto") !== "false";
  let selectedIndex = 0;
  let audioContext = null;
  let analyser = null;
  let mediaStream = null;
  let sourceNode = null;
  let rafId = 0;
  let lastAnalysisAt = 0;
  let pitchHistory = [];
  let centsHistory = [];
  let stableTargetIndex = null;
  let stableTargetVotes = 0;
  let modalOpen = false;
  let permissionDenied = false;
  let referenceGateUntil = 0;

  const css = document.createElement("style");
  css.id = "myLessonsTunerStylesV3";
  css.textContent = `
    .home-shell .topbar{background:#050505!important;border-bottom:1px solid rgba(255,255,255,.06)!important;box-shadow:0 10px 28px rgba(0,0,0,.18)!important;pointer-events:none!important;padding-top:max(10px,env(safe-area-inset-top))!important;height:calc(68px + env(safe-area-inset-top))!important}
    .home-shell .topbar .brand-link{pointer-events:auto!important}
    .ml-tuner-launch{pointer-events:auto!important;position:absolute;right:max(18px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 13px);width:36px;height:36px;border:1px solid rgba(255,90,0,.90);border-radius:50%;display:grid;place-items:center;background:rgba(5,5,5,.82);color:${ORANGE};cursor:pointer;box-shadow:0 0 0 1px rgba(255,90,0,.06),0 6px 18px rgba(0,0,0,.24);transition:transform .18s ease,background .18s ease,box-shadow .18s ease;z-index:2}
    .ml-tuner-launch:hover{background:rgba(255,90,0,.10);box-shadow:0 0 0 1px rgba(255,90,0,.14),0 8px 24px rgba(255,90,0,.12)}
    .ml-tuner-launch:active{transform:scale(.95)}
    .ml-tuner-launch svg{width:19px;height:19px;display:block}
    .ml-tuner-backdrop{position:fixed;inset:0;z-index:170;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.56);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease}
    .ml-tuner-backdrop.is-open{opacity:1;visibility:visible;pointer-events:auto}
    .ml-tuner-modal{position:relative;width:min(700px,calc(100vw - 32px));max-height:min(860px,calc(100svh - 38px));overflow:auto;overscroll-behavior:contain;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(180deg,#151515 0%,#080808 100%);color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.66),0 0 0 1px rgba(255,90,0,.06);transform:translateY(14px) scale(.988);transition:transform .24s cubic-bezier(.22,1,.36,1);scrollbar-width:none}
    .ml-tuner-modal::-webkit-scrollbar{display:none}
    .ml-tuner-backdrop.is-open .ml-tuner-modal{transform:none}
    .ml-tuner-grabber{display:none;width:58px;height:5px;border-radius:999px;background:rgba(255,255,255,.26);margin:10px auto 0}
    .ml-tuner-header{display:flex;align-items:center;gap:12px;padding:20px 22px 14px}
    .ml-tuner-mark{width:42px;height:42px;border:1px solid ${ORANGE};border-radius:50%;display:grid;place-items:center;color:${ORANGE};flex:0 0 auto}
    .ml-tuner-mark svg{width:23px;height:23px}
    .ml-tuner-title{margin:0;font-size:24px;font-weight:900;letter-spacing:-.03em}
    .ml-tuner-close{margin-left:auto;width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#fff;font-size:24px;line-height:1;cursor:pointer}
    .ml-tuner-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:end;padding:0 22px 18px}
    .ml-tuner-select-wrap{position:relative}
    .ml-tuner-select-label{display:block;margin:0 0 6px;color:rgba(255,255,255,.50);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .ml-tuner-select{width:100%;height:50px;appearance:none;-webkit-appearance:none;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;padding:0 42px 0 13px;font-size:16px;font-weight:800;outline:none}
    .ml-tuner-select:focus{border-color:rgba(255,90,0,.8)}
    .ml-tuner-select-wrap:after{content:"⌄";position:absolute;right:14px;bottom:11px;color:rgba(255,255,255,.72);font-size:22px;pointer-events:none}
    .ml-auto-wrap{display:flex;align-items:center;gap:10px;height:50px}
    .ml-auto-text{font-size:13px;font-weight:900;letter-spacing:.06em;color:${ORANGE}}
    .ml-switch{position:relative;width:54px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.14);padding:0;cursor:pointer;transition:background .2s ease}
    .ml-switch:before{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.22,1,.36,1)}
    .ml-switch[aria-checked="true"]{background:${ORANGE}}
    .ml-switch[aria-checked="true"]:before{transform:translateX(24px)}
    .ml-tuner-meter{position:relative;overflow:hidden;margin:0;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07);background:radial-gradient(circle at 50% 52%,rgba(255,90,0,.10),transparent 30%),linear-gradient(rgba(255,90,0,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(255,90,0,.065) 1px,transparent 1px),#090909;background-size:auto,42px 42px,42px 42px,auto;padding:30px 24px 28px;text-align:center}
    .ml-cents{min-height:28px;color:${ORANGE};font-size:15px;font-weight:900}
    .ml-note{margin-top:4px;font-size:78px;line-height:.90;font-weight:950;letter-spacing:-.05em;text-shadow:0 0 22px rgba(255,90,0,.08)}
    .ml-note-detail{margin-top:10px;color:rgba(255,255,255,.58);font-size:14px;font-weight:700}
    .ml-scale{position:relative;height:92px;margin:22px auto 0;max-width:600px}
    .ml-scale-line{position:absolute;left:38px;right:38px;top:45px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.76) 50%,rgba(255,255,255,.22))}
    .ml-scale-line:after{content:"";position:absolute;inset:-9px 0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(255,255,255,.18) calc(10% - 1px) 10%);opacity:.85}
    .ml-flat,.ml-sharp{position:absolute;top:21px;color:rgba(255,255,255,.58);font-size:34px;font-weight:700}
    .ml-flat{left:0}.ml-sharp{right:0}
    .ml-center-axis{position:absolute;top:4px;bottom:4px;left:50%;width:1px;background:rgba(255,255,255,.62);transform:translateX(-50%)}
    .ml-needle{position:absolute;top:32px;left:50%;width:28px;height:28px;border:3px solid #fff;border-radius:50%;background:#080808;box-shadow:0 0 0 2px rgba(255,90,0,.7),0 0 24px rgba(255,90,0,.25);transform:translate(-50%,0);transition:left .095s linear,border-color .16s ease,box-shadow .16s ease}
    .ml-needle.in-tune{border-color:#fff;box-shadow:0 0 0 3px ${ORANGE},0 0 32px rgba(255,90,0,.52)}
    .ml-tuner-message{margin:18px auto 0;min-height:44px;width:max-content;max-width:92%;display:flex;align-items:center;justify-content:center;padding:0 20px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.075);color:rgba(255,255,255,.82);font-size:13px;font-weight:750}
    .ml-strings-wrap{padding:24px 22px 22px;background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)}
    .ml-strings{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;max-width:600px;margin:0 auto}
    .ml-string-btn{min-width:0;border:0;background:transparent;color:#fff;padding:0;cursor:pointer;text-align:center;touch-action:manipulation}
    .ml-string-circle{width:54px;height:54px;margin:0 auto;border:1px solid rgba(255,90,0,.72);border-radius:50%;display:grid;place-items:center;background:#121212;font-size:20px;font-weight:900;transition:.16s ease;box-shadow:0 10px 20px rgba(0,0,0,.20)}
    .ml-string-note{margin-top:7px;color:rgba(255,255,255,.44);font-size:10px;font-weight:800}
    .ml-string-btn.is-selected .ml-string-circle{background:${ORANGE};border-color:${ORANGE};box-shadow:0 0 0 3px rgba(255,90,0,.12),0 0 24px rgba(255,90,0,.28)}
    .ml-string-btn.is-selected .ml-string-note{color:#fff}
    .ml-tuner-status{display:flex;align-items:center;gap:11px;margin:0 20px 22px;padding:14px 15px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.045)}
    .ml-status-dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;border:1px solid rgba(255,90,0,.65);color:${ORANGE};font-weight:950}
    .ml-status-copy strong{display:block;font-size:14px}.ml-status-copy span{display:block;margin-top:2px;color:rgba(255,255,255,.52);font-size:12px}
    .ml-tuner-status.is-good{border-color:rgba(255,90,0,.34);background:rgba(255,90,0,.065)}
    .ml-tuner-status.is-good .ml-status-dot{background:${ORANGE};color:#fff;border-color:${ORANGE}}
    .ml-tuner-permission{display:none;margin:0 20px 22px;padding:13px 14px;border:1px solid rgba(255,177,112,.3);border-radius:14px;background:rgba(255,90,0,.08);color:#ffd4b6;font-size:12px;line-height:1.45}
    .ml-tuner-permission.show{display:block}
    body.ml-tuner-open{overflow:hidden!important}
    @media(max-width:760px){
      .home-shell .topbar{height:calc(62px + env(safe-area-inset-top))!important;padding-top:env(safe-area-inset-top)!important}
      .home-shell .brand-logo{height:42px!important;max-width:148px!important}
      .ml-tuner-launch{width:34px;height:34px;right:max(14px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 14px)}
      .ml-tuner-launch svg{width:18px;height:18px}
      .ml-tuner-backdrop{align-items:flex-end;padding:0;background:rgba(0,0,0,.62)}
      .ml-tuner-modal{width:100%;max-height:94svh;border-left:0;border-right:0;border-bottom:0;border-radius:26px 26px 0 0;transform:translateY(28px)}
      .ml-tuner-grabber{display:block}
      .ml-tuner-header{padding:11px 18px 12px}.ml-tuner-mark{width:40px;height:40px}.ml-tuner-title{font-size:23px}.ml-tuner-close{width:36px;height:36px}
      .ml-tuner-controls{padding:0 18px 16px;gap:12px}.ml-tuner-select{height:46px;font-size:15px}.ml-auto-wrap{height:46px}.ml-switch{width:50px;height:28px}.ml-switch:before{width:22px;height:22px}.ml-switch[aria-checked="true"]:before{transform:translateX(22px)}
      .ml-tuner-meter{padding:24px 16px 22px}.ml-note{font-size:72px}.ml-scale{height:84px;margin-top:16px}.ml-scale-line{top:41px}.ml-needle{top:28px}.ml-tuner-message{margin-top:16px}
      .ml-strings-wrap{padding:20px 14px 18px}.ml-strings{gap:6px}.ml-string-circle{width:48px;height:48px;font-size:18px}.ml-tuner-status{margin:0 14px 16px}
    }
    @media(max-width:390px){.ml-string-circle{width:43px;height:43px}.ml-string-note{font-size:9px}.ml-auto-text{display:none}.ml-tuner-controls{grid-template-columns:minmax(0,1fr) auto}.ml-note{font-size:66px}}
  `;
  document.head.appendChild(css);

  const topbar = document.querySelector(".home-shell .topbar") || document.querySelector(".topbar");
  if (!topbar) return;

  const iconSvg = `
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M11 7v8a5 5 0 0 0 10 0V7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M16 20v5M12.5 25h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M6.5 10H4M28 10h-2.5M7.5 16H5.4M26.6 16h-2.1M9 4.8 7.2 3M23 4.8 24.8 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`;

  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "ml-tuner-launch";
  launch.setAttribute("aria-label", "Abrir afinador");
  launch.innerHTML = iconSvg;
  topbar.appendChild(launch);

  const backdrop = document.createElement("div");
  backdrop.className = "ml-tuner-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = `
    <section class="ml-tuner-modal" role="dialog" aria-modal="true" aria-label="Tuner">
      <div class="ml-tuner-grabber" aria-hidden="true"></div>
      <header class="ml-tuner-header">
        <span class="ml-tuner-mark">${iconSvg}</span>
        <h2 class="ml-tuner-title">Tuner</h2>
        <button class="ml-tuner-close" type="button" aria-label="Cerrar afinador">×</button>
      </header>
      <div class="ml-tuner-controls">
        <label class="ml-tuner-select-wrap">
          <span class="ml-tuner-select-label">Instrument</span>
          <select class="ml-tuner-select" aria-label="Seleccionar instrumento">
            <option value="guitar">Guitar 6-string</option>
            <option value="bass">Bass 4-string</option>
            <option value="ukulele">Ukulele</option>
          </select>
        </label>
        <div class="ml-auto-wrap">
          <span class="ml-auto-text">AUTO</span>
          <button class="ml-switch" type="button" role="switch" aria-label="Detección automática" aria-checked="true"></button>
        </div>
      </div>
      <div class="ml-tuner-meter">
        <div class="ml-cents">— cents</div>
        <div class="ml-note">—</div>
        <div class="ml-note-detail">Standard</div>
        <div class="ml-scale" aria-hidden="true">
          <span class="ml-flat">♭</span>
          <span class="ml-sharp">♯</span>
          <div class="ml-scale-line"></div>
          <div class="ml-center-axis"></div>
          <div class="ml-needle"></div>
        </div>
        <div class="ml-tuner-message">Start tuning by playing any string</div>
      </div>
      <div class="ml-strings-wrap"><div class="ml-strings"></div></div>
      <div class="ml-tuner-status">
        <span class="ml-status-dot">•</span>
        <span class="ml-status-copy"><strong>Listening…</strong><span>Use the device microphone.</span></span>
      </div>
      <div class="ml-tuner-permission">Microphone access is required for the tuner. Allow microphone permission in Safari/Chrome and open the tuner again.</div>
    </section>`;
  document.body.appendChild(backdrop);

  const modal = backdrop.querySelector(".ml-tuner-modal");
  const closeBtn = backdrop.querySelector(".ml-tuner-close");
  const instrumentSelect = backdrop.querySelector(".ml-tuner-select");
  const autoSwitch = backdrop.querySelector(".ml-switch");
  const centsEl = backdrop.querySelector(".ml-cents");
  const noteEl = backdrop.querySelector(".ml-note");
  const noteDetailEl = backdrop.querySelector(".ml-note-detail");
  const needle = backdrop.querySelector(".ml-needle");
  const messageEl = backdrop.querySelector(".ml-tuner-message");
  const stringsEl = backdrop.querySelector(".ml-strings");
  const statusEl = backdrop.querySelector(".ml-tuner-status");
  const statusDot = backdrop.querySelector(".ml-status-dot");
  const statusTitle = backdrop.querySelector(".ml-status-copy strong");
  const statusCopy = backdrop.querySelector(".ml-status-copy span");
  const permissionEl = backdrop.querySelector(".ml-tuner-permission");

  instrumentSelect.value = instrumentKey;
  autoSwitch.setAttribute("aria-checked", autoMode ? "true" : "false");
  renderStrings();
  resetDisplay();

  launch.addEventListener("click", openTuner);
  closeBtn.addEventListener("click", closeTuner);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeTuner();
  });
  modal.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalOpen) closeTuner();
  });
  instrumentSelect.addEventListener("change", async () => {
    instrumentKey = instrumentSelect.value;
    localStorage.setItem("myLessons.tuner.instrument", instrumentKey);
    selectedIndex = 0;
    resetTracking();
    renderStrings();
    resetDisplay();
    if (modalOpen && mediaStream){
      try{ analyser.fftSize = 4096; }catch(_){ }
    }
  });
  autoSwitch.addEventListener("click", () => {
    autoMode = !autoMode;
    autoSwitch.setAttribute("aria-checked", autoMode ? "true" : "false");
    localStorage.setItem("myLessons.tuner.auto", String(autoMode));
    resetTracking();
    highlightString(selectedIndex);
    resetDisplay(false);
  });

  async function openTuner(){
    modalOpen = true;
    permissionDenied = false;
    permissionEl.classList.remove("show");
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("ml-tuner-open");
    resetDisplay();
    try{
      await startAudio();
      setStatus("Listening…", "Play one string at a time.", false);
      analyzeLoop();
    }catch(error){
      permissionDenied = true;
      permissionEl.classList.add("show");
      setStatus("Microphone unavailable", "Allow microphone access to use the tuner.", false);
      console.warn("My Lessons tuner microphone error:", error);
    }
  }

  function closeTuner(){
    modalOpen = false;
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ml-tuner-open");
    stopAudio();
  }

  async function startAudio(){
    stopAudio();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      video: false
    });
    mediaStream = stream;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx({ latencyHint: "interactive" });
    if (audioContext.state === "suspended") await audioContext.resume();
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    sourceNode.connect(analyser);
  }

  function stopAudio(){
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    try{ sourceNode?.disconnect(); }catch(_){ }
    sourceNode = null;
    analyser = null;
    if (mediaStream){ mediaStream.getTracks().forEach(track => track.stop()); mediaStream = null; }
    if (audioContext){ const ctx = audioContext; audioContext = null; try{ ctx.close(); }catch(_){ } }
    resetTracking();
  }

  function analyzeLoop(timestamp){
    if (!modalOpen || !analyser || !audioContext) return;
    rafId = requestAnimationFrame(analyzeLoop);
    if (performance.now() < referenceGateUntil) return;
    const interval = instrumentKey === "bass" ? 92 : 68;
    if (timestamp - lastAnalysisAt < interval) return;
    lastAnalysisAt = timestamp;

    const raw = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(raw);
    const instrument = INSTRUMENTS[instrumentKey];
    const prepared = prepareAnalysisBuffer(raw, audioContext.sampleRate, instrumentKey === "bass" ? 2 : 1);
    const frequency = detectPitchYin(prepared.buffer, prepared.sampleRate, instrument.minFreq, instrument.maxFreq);
    if (!frequency){
      if (!permissionDenied) setStatus("Listening…", "Play one clear string.", false);
      return;
    }

    pitchHistory.push(frequency);
    if (pitchHistory.length > 5) pitchHistory.shift();
    updateFromFrequency(median(pitchHistory));
  }

  function prepareAnalysisBuffer(buffer, sampleRate, decimation){
    if (decimation <= 1) return { buffer, sampleRate };
    const length = Math.floor(buffer.length / decimation);
    const result = new Float32Array(length);
    for (let i = 0; i < length; i++){
      let sum = 0;
      for (let j = 0; j < decimation; j++) sum += buffer[i * decimation + j] || 0;
      result[i] = sum / decimation;
    }
    return { buffer: result, sampleRate: sampleRate / decimation };
  }

  function detectPitchYin(buffer, sampleRate, minFreq, maxFreq){
    let mean = 0;
    for (let i = 0; i < buffer.length; i++) mean += buffer[i];
    mean /= buffer.length;
    let rms = 0;
    for (let i = 0; i < buffer.length; i++){ const v = buffer[i] - mean; rms += v * v; }
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.0075) return null;

    const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
    const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buffer.length * 0.48));
    if (maxTau <= minTau + 2) return null;
    const yin = new Float32Array(maxTau + 1);
    const limit = buffer.length - maxTau;
    for (let tau = 1; tau <= maxTau; tau++){
      let sum = 0;
      for (let i = 0; i < limit; i += 2){ const d = (buffer[i] - mean) - (buffer[i + tau] - mean); sum += d * d; }
      yin[tau] = sum;
    }
    let running = 0;
    yin[0] = 1;
    for (let tau = 1; tau <= maxTau; tau++){ running += yin[tau]; yin[tau] = running ? yin[tau] * tau / running : 1; }
    const threshold = instrumentKey === "bass" ? 0.14 : 0.12;
    let tauEstimate = -1;
    for (let tau = minTau; tau < maxTau; tau++){
      if (yin[tau] < threshold){ while (tau + 1 < maxTau && yin[tau + 1] < yin[tau]) tau++; tauEstimate = tau; break; }
    }
    if (tauEstimate < 0){
      let best = Infinity;
      for (let tau = minTau; tau <= maxTau; tau++){ if (yin[tau] < best){ best = yin[tau]; tauEstimate = tau; } }
      if (best > 0.24) return null;
    }
    const x0 = tauEstimate > 1 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 <= maxTau ? tauEstimate + 1 : tauEstimate;
    const s0 = yin[x0], s1 = yin[tauEstimate], s2 = yin[x2];
    const denom = 2 * (2 * s1 - s2 - s0);
    let betterTau = tauEstimate;
    if (Math.abs(denom) > 1e-9) betterTau += (s2 - s0) / denom;
    const freq = sampleRate / betterTau;
    if (!Number.isFinite(freq) || freq < minFreq * 0.82 || freq > maxFreq * 1.18) return null;
    return freq;
  }

  function updateFromFrequency(frequency){
    const instrument = INSTRUMENTS[instrumentKey];
    const candidates = instrument.strings;
    let targetIndex = selectedIndex;
    if (autoMode){
      let bestPitchDistance = Infinity, bestAbsoluteDistance = Infinity, bestIndex = selectedIndex;
      candidates.forEach((item, index) => {
        const pitchDistance = Math.abs(shortestPitchClassCents(frequency, item.freq));
        const absoluteDistance = Math.abs(1200 * Math.log2(frequency / item.freq));
        if (pitchDistance < bestPitchDistance - 0.6 || (Math.abs(pitchDistance - bestPitchDistance) <= 0.6 && absoluteDistance < bestAbsoluteDistance)){
          bestPitchDistance = pitchDistance; bestAbsoluteDistance = absoluteDistance; bestIndex = index;
        }
      });
      if (stableTargetIndex === bestIndex) stableTargetVotes++; else { stableTargetIndex = bestIndex; stableTargetVotes = 1; }
      if (stableTargetVotes >= 2 || selectedIndex >= candidates.length) selectedIndex = bestIndex;
      targetIndex = selectedIndex;
    }
    const target = candidates[targetIndex];
    let cents = autoMode ? shortestPitchClassCents(frequency, target.freq) : shortestOctaveCents(frequency, target.freq);
    if (!Number.isFinite(cents)) return;
    centsHistory.push(cents);
    if (centsHistory.length > 5) centsHistory.shift();
    cents = median(centsHistory);
    if (Math.abs(cents) < 1.0) cents = 0;
    const inTune = Math.abs(cents) <= 3;
    const displayCents = Math.max(-50, Math.min(50, cents));
    const rounded = Math.round(displayCents);
    noteEl.textContent = target.short;
    noteDetailEl.textContent = `${target.note} · ${target.string} string`;
    centsEl.textContent = `${rounded > 0 ? "+" : ""}${rounded} cents`;
    needle.style.left = `${50 + displayCents * 0.82}%`;
    needle.classList.toggle("in-tune", inTune);
    highlightString(targetIndex);
    if (inTune){ messageEl.textContent = "In tune"; setStatus("In tune!", `${target.note} is centered.`, true); }
    else if (cents < 0){ messageEl.textContent = "Tune up ↑"; setStatus("A little flat", `${target.note}: raise the pitch.`, false); }
    else { messageEl.textContent = "Tune down ↓"; setStatus("A little sharp", `${target.note}: lower the pitch.`, false); }
  }

  function shortestPitchClassCents(freq, targetFreq){
    let cents = 1200 * Math.log2(freq / targetFreq);
    while (cents > 600) cents -= 1200;
    while (cents < -600) cents += 1200;
    return cents;
  }
  function shortestOctaveCents(freq, targetFreq){
    let ratioFreq = freq;
    while (ratioFreq > targetFreq * Math.SQRT2) ratioFreq /= 2;
    while (ratioFreq < targetFreq / Math.SQRT2) ratioFreq *= 2;
    return 1200 * Math.log2(ratioFreq / targetFreq);
  }

  function renderStrings(){
    const instrument = INSTRUMENTS[instrumentKey];
    const count = instrument.strings.length;
    stringsEl.style.gridTemplateColumns = `repeat(${count},minmax(0,1fr))`;
    stringsEl.innerHTML = "";
    instrument.strings.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ml-string-btn";
      button.setAttribute("aria-label", `${item.note}, ${item.string} string`);
      button.innerHTML = `<span class="ml-string-circle">${item.short}</span><span class="ml-string-note">${item.note}</span>`;
      button.addEventListener("click", () => {
        selectedIndex = index;
        stableTargetIndex = index;
        stableTargetVotes = 0;
        highlightString(index);
        playReferenceTone(item, instrument.playback);
        if (!autoMode) resetDisplay(false);
      });
      stringsEl.appendChild(button);
    });
    highlightString(selectedIndex);
  }

  function playReferenceTone(item, style){
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const play = () => {
      referenceGateUntil = performance.now() + 780;
      setStatus(`Reference ${item.note}`, "AUTO stays on while the cue plays.", false);
      const now = ctx.currentTime;
      const params = soundParams(style);
      const duration = Math.max(0.75, params.decay + 0.35);
      const osc = ctx.createOscillator(), overtone = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), overtoneGain = ctx.createGain(), body = ctx.createBiquadFilter();
      osc.type = item.freq < 100 ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(item.freq, now);
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(item.freq * 2, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(params.cutoff, now);
      filter.Q.value = params.q;
      body.type = "peaking";
      body.frequency.value = params.body;
      body.Q.value = params.q;
      body.gain.value = params.bodyGain;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(params.gain, now + .012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      overtoneGain.gain.setValueAtTime(0.0001, now);
      overtoneGain.gain.exponentialRampToValueAtTime(params.gain * .13, now + .006);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * .55, .75));
      osc.connect(filter); filter.connect(body); body.connect(gain); gain.connect(ctx.destination);
      overtone.connect(overtoneGain); overtoneGain.connect(ctx.destination);
      osc.start(now); overtone.start(now);
      osc.stop(now + duration + .03); overtone.stop(now + Math.min(duration * .55, .78));
      window.setTimeout(() => { if (modalOpen && performance.now() >= referenceGateUntil) setStatus("Listening…", "Play one string at a time.", false); }, 820);
    };
    if (ctx.state === "suspended") ctx.resume().then(play).catch(()=>{}); else play();
  }

  function getOrCreateAudioContext(){
    if (audioContext) return audioContext;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor({ latencyHint: "interactive" });
    return audioContext;
  }

  function soundParams(style){
    const table = {
      acoustic:{cutoff:3800,q:.5,body:210,bodyGain:3,gain:.18,decay:1.25},
      bass1:{cutoff:1450,q:.7,body:105,bodyGain:5,gain:.24,decay:1.6},
      bright:{cutoff:5000,q:.55,body:450,bodyGain:2,gain:.15,decay:1.0}
    };
    return table[style] || table.acoustic;
  }

  function highlightString(index){ [...stringsEl.querySelectorAll(".ml-string-btn")].forEach((button, i) => button.classList.toggle("is-selected", i === index)); }
  function resetDisplay(resetSelection = true){
    if (resetSelection && autoMode) selectedIndex = Math.min(selectedIndex, INSTRUMENTS[instrumentKey].strings.length - 1);
    const target = INSTRUMENTS[instrumentKey].strings[selectedIndex];
    noteEl.textContent = "—";
    noteDetailEl.textContent = `${INSTRUMENTS[instrumentKey].subtitle} · A4 ${A4} Hz`;
    centsEl.textContent = "— cents";
    needle.style.left = "50%";
    needle.classList.remove("in-tune");
    messageEl.textContent = autoMode ? "Start tuning by playing any string" : `Play ${target.note}`;
    setStatus("Listening…", "Use the device microphone.", false);
    highlightString(selectedIndex);
  }
  function setStatus(title, copy, good){ statusTitle.textContent = title; statusCopy.textContent = copy; statusEl.classList.toggle("is-good", Boolean(good)); statusDot.textContent = good ? "✓" : "•"; }
  function resetTracking(){ pitchHistory = []; centsHistory = []; stableTargetIndex = null; stableTargetVotes = 0; }
  function median(values){ if (!values.length) return 0; const sorted = [...values].sort((a,b) => a-b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
})();
