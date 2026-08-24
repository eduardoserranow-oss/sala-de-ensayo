(function(){
  "use strict";

  if (window.__MY_LESSONS_TUNER_MOUNTED__) return;
  window.__MY_LESSONS_TUNER_MOUNTED__ = true;

  const ORANGE = "#ff5a00";
  const INSTRUMENTS = {
    guitar: {
      label: "Guitar 6-string",
      subtitle: "Standard",
      strings: [
        { note: "E2", short: "E", freq: 82.4069, string: "6th" },
        { note: "A2", short: "A", freq: 110.0000, string: "5th" },
        { note: "D3", short: "D", freq: 146.8324, string: "4th" },
        { note: "G3", short: "G", freq: 195.9977, string: "3rd" },
        { note: "B3", short: "B", freq: 246.9417, string: "2nd" },
        { note: "E4", short: "E", freq: 329.6276, string: "1st" }
      ]
    },
    bass: {
      label: "Bass 4-string",
      subtitle: "Standard",
      strings: [
        { note: "E1", short: "E", freq: 41.2034, string: "4th" },
        { note: "A1", short: "A", freq: 55.0000, string: "3rd" },
        { note: "D2", short: "D", freq: 73.4162, string: "2nd" },
        { note: "G2", short: "G", freq: 97.9989, string: "1st" }
      ]
    },
    ukulele: {
      label: "Ukulele",
      subtitle: "Standard",
      strings: [
        { note: "G4", short: "G", freq: 391.9954, string: "4th" },
        { note: "C4", short: "C", freq: 261.6256, string: "3rd" },
        { note: "E4", short: "E", freq: 329.6276, string: "2nd" },
        { note: "A4", short: "A", freq: 440.0000, string: "1st" }
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
  let smoothingHistory = [];
  let stableTargetIndex = null;
  let stableTargetVotes = 0;
  let modalOpen = false;
  let permissionDenied = false;

  const css = document.createElement("style");
  css.id = "myLessonsTunerStylesV1";
  css.textContent = `
    .home-shell .topbar{background:#050505!important;border-bottom:1px solid rgba(255,255,255,.06)!important;box-shadow:0 10px 28px rgba(0,0,0,.18)!important;pointer-events:none!important}
    .home-shell .topbar .brand-link{pointer-events:auto!important}
    .ml-tuner-launch{pointer-events:auto!important;position:absolute;right:max(18px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);width:44px;height:44px;border:1px solid rgba(255,90,0,.92);border-radius:50%;display:grid;place-items:center;background:rgba(5,5,5,.82);color:${ORANGE};cursor:pointer;box-shadow:0 0 0 1px rgba(255,90,0,.08),0 8px 22px rgba(0,0,0,.28);transition:transform .18s ease,background .18s ease,box-shadow .18s ease;z-index:2}
    .ml-tuner-launch:hover{background:rgba(255,90,0,.10);box-shadow:0 0 0 1px rgba(255,90,0,.16),0 8px 28px rgba(255,90,0,.14)}
    .ml-tuner-launch:active{transform:translateY(-50%) scale(.95)}
    .ml-tuner-launch svg{width:23px;height:23px;display:block}
    .ml-tuner-backdrop{position:fixed;inset:0;z-index:170;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease}
    .ml-tuner-backdrop.is-open{opacity:1;visibility:visible;pointer-events:auto}
    .ml-tuner-modal{position:relative;width:min(620px,calc(100vw - 32px));max-height:min(820px,calc(100svh - 42px));overflow:auto;overscroll-behavior:contain;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(180deg,#151515 0%,#080808 100%);color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.66),0 0 0 1px rgba(255,90,0,.06);transform:translateY(16px) scale(.985);transition:transform .24s cubic-bezier(.22,1,.36,1);scrollbar-width:none}
    .ml-tuner-modal::-webkit-scrollbar{display:none}
    .ml-tuner-backdrop.is-open .ml-tuner-modal{transform:none}
    .ml-tuner-grabber{display:none;width:58px;height:5px;border-radius:999px;background:rgba(255,255,255,.26);margin:10px auto 0}
    .ml-tuner-header{display:flex;align-items:center;gap:12px;padding:20px 20px 14px}
    .ml-tuner-mark{width:42px;height:42px;border:1px solid ${ORANGE};border-radius:50%;display:grid;place-items:center;color:${ORANGE};flex:0 0 auto}
    .ml-tuner-mark svg{width:23px;height:23px}
    .ml-tuner-title{margin:0;font-size:24px;font-weight:900;letter-spacing:-.03em}
    .ml-tuner-close{margin-left:auto;width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#fff;font-size:24px;line-height:1;cursor:pointer}
    .ml-tuner-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end;padding:0 20px 16px}
    .ml-tuner-select-wrap{position:relative}
    .ml-tuner-select-label{display:block;margin:0 0 6px;color:rgba(255,255,255,.50);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .ml-tuner-select{width:100%;height:48px;appearance:none;-webkit-appearance:none;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;padding:0 42px 0 13px;font-size:16px;font-weight:800;outline:none}
    .ml-tuner-select:focus{border-color:rgba(255,90,0,.8)}
    .ml-tuner-select-wrap:after{content:"⌄";position:absolute;right:14px;bottom:11px;color:rgba(255,255,255,.72);font-size:22px;pointer-events:none}
    .ml-auto-wrap{display:flex;align-items:center;gap:10px;height:48px}
    .ml-auto-text{font-size:13px;font-weight:900;letter-spacing:.06em;color:${ORANGE}}
    .ml-switch{position:relative;width:54px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.14);padding:0;cursor:pointer;transition:background .2s ease}
    .ml-switch:before{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.22,1,.36,1)}
    .ml-switch[aria-checked="true"]{background:${ORANGE}}
    .ml-switch[aria-checked="true"]:before{transform:translateX(24px)}
    .ml-tuner-meter{position:relative;overflow:hidden;margin:0;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07);background:radial-gradient(circle at 50% 52%,rgba(255,90,0,.10),transparent 30%),linear-gradient(rgba(255,90,0,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(255,90,0,.065) 1px,transparent 1px),#090909;background-size:auto,38px 38px,38px 38px,auto;padding:26px 20px 22px;text-align:center}
    .ml-cents{min-height:28px;color:${ORANGE};font-size:15px;font-weight:900}
    .ml-note{margin-top:3px;font-size:64px;line-height:.92;font-weight:950;letter-spacing:-.05em;text-shadow:0 0 22px rgba(255,90,0,.08)}
    .ml-note-detail{margin-top:7px;color:rgba(255,255,255,.58);font-size:13px;font-weight:700}
    .ml-scale{position:relative;height:78px;margin:16px auto 0;max-width:520px}
    .ml-scale-line{position:absolute;left:34px;right:34px;top:37px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.76) 50%,rgba(255,255,255,.22))}
    .ml-scale-line:after{content:"";position:absolute;inset:-8px 0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(255,255,255,.18) calc(10% - 1px) 10%);opacity:.85}
    .ml-flat,.ml-sharp{position:absolute;top:16px;color:rgba(255,255,255,.58);font-size:34px;font-weight:700}
    .ml-flat{left:0}.ml-sharp{right:0}
    .ml-center-axis{position:absolute;top:7px;bottom:7px;left:50%;width:1px;background:rgba(255,255,255,.62);transform:translateX(-50%)}
    .ml-needle{position:absolute;top:25px;left:50%;width:26px;height:26px;border:3px solid #fff;border-radius:50%;background:#080808;box-shadow:0 0 0 2px rgba(255,90,0,.7),0 0 24px rgba(255,90,0,.25);transform:translate(-50%,0);transition:left .11s linear,border-color .16s ease,box-shadow .16s ease}
    .ml-needle.in-tune{border-color:#fff;box-shadow:0 0 0 3px ${ORANGE},0 0 30px rgba(255,90,0,.48)}
    .ml-tuner-message{margin:16px auto 0;min-height:42px;width:max-content;max-width:92%;display:flex;align-items:center;justify-content:center;padding:0 18px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.075);color:rgba(255,255,255,.82);font-size:13px;font-weight:750}
    .ml-strings-wrap{padding:18px 18px 20px}
    .ml-strings{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;max-width:560px;margin:0 auto}
    .ml-string-btn{min-width:0;border:0;background:transparent;color:#fff;padding:0;cursor:pointer;text-align:center}
    .ml-string-circle{width:48px;height:48px;margin:0 auto;border:1px solid rgba(255,90,0,.72);border-radius:50%;display:grid;place-items:center;background:#121212;font-size:18px;font-weight:900;transition:.16s ease;box-shadow:0 10px 20px rgba(0,0,0,.20)}
    .ml-string-note{margin-top:6px;color:rgba(255,255,255,.44);font-size:10px;font-weight:800}
    .ml-string-btn.is-selected .ml-string-circle{background:${ORANGE};border-color:${ORANGE};box-shadow:0 0 0 3px rgba(255,90,0,.12),0 0 24px rgba(255,90,0,.28)}
    .ml-string-btn.is-selected .ml-string-note{color:#fff}
    .ml-tuner-status{display:flex;align-items:center;gap:11px;margin:0 18px 20px;padding:14px 15px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.045)}
    .ml-status-dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;border:1px solid rgba(255,90,0,.65);color:${ORANGE};font-weight:950}
    .ml-status-copy strong{display:block;font-size:14px}.ml-status-copy span{display:block;margin-top:2px;color:rgba(255,255,255,.52);font-size:12px}
    .ml-tuner-status.is-good{border-color:rgba(255,90,0,.34);background:rgba(255,90,0,.065)}
    .ml-tuner-status.is-good .ml-status-dot{background:${ORANGE};color:#fff;border-color:${ORANGE}}
    .ml-tuner-permission{display:none;margin:0 18px 20px;padding:13px 14px;border:1px solid rgba(255,177,112,.3);border-radius:14px;background:rgba(255,90,0,.08);color:#ffd4b6;font-size:12px;line-height:1.45}
    .ml-tuner-permission.show{display:block}
    body.ml-tuner-open{overflow:hidden!important}
    @media(max-width:760px){
      .home-shell .topbar{height:86px!important}
      .ml-tuner-launch{width:42px;height:42px;right:max(14px,env(safe-area-inset-right))}
      .ml-tuner-backdrop{align-items:flex-end;padding:0;background:rgba(0,0,0,.62)}
      .ml-tuner-modal{width:100%;max-height:90svh;border-left:0;border-right:0;border-bottom:0;border-radius:24px 24px 0 0;transform:translateY(28px)}
      .ml-tuner-grabber{display:block}
      .ml-tuner-header{padding:10px 16px 12px}.ml-tuner-mark{width:38px;height:38px}.ml-tuner-title{font-size:22px}.ml-tuner-close{width:36px;height:36px}
      .ml-tuner-controls{padding:0 16px 13px;gap:10px}.ml-tuner-select{height:44px;font-size:15px}.ml-auto-wrap{height:44px}.ml-switch{width:50px;height:28px}.ml-switch:before{width:22px;height:22px}.ml-switch[aria-checked="true"]:before{transform:translateX(22px)}
      .ml-tuner-meter{padding:18px 13px 16px}.ml-note{font-size:56px}.ml-scale{height:70px;margin-top:10px}.ml-scale-line{top:34px}.ml-needle{top:22px}.ml-tuner-message{margin-top:12px}
      .ml-strings-wrap{padding:14px 12px 16px}.ml-strings{gap:4px}.ml-string-circle{width:43px;height:43px;font-size:17px}.ml-tuner-status{margin:0 12px 14px}
    }
    @media(max-width:390px){.ml-string-circle{width:39px;height:39px}.ml-string-note{font-size:9px}.ml-tuner-controls{grid-template-columns:minmax(0,1fr) auto}.ml-auto-text{display:none}}
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
  instrumentSelect.addEventListener("change", () => {
    instrumentKey = instrumentSelect.value;
    localStorage.setItem("myLessons.tuner.instrument", instrumentKey);
    selectedIndex = 0;
    smoothingHistory = [];
    stableTargetIndex = null;
    stableTargetVotes = 0;
    renderStrings();
    resetDisplay();
  });
  autoSwitch.addEventListener("click", () => {
    autoMode = !autoMode;
    autoSwitch.setAttribute("aria-checked", autoMode ? "true" : "false");
    localStorage.setItem("myLessons.tuner.auto", String(autoMode));
    stableTargetIndex = null;
    stableTargetVotes = 0;
    highlightString(selectedIndex);
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
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      },
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
    if (mediaStream){
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (audioContext){
      const ctx = audioContext;
      audioContext = null;
      try{ ctx.close(); }catch(_){ }
    }
    smoothingHistory = [];
  }

  function analyzeLoop(timestamp){
    if (!modalOpen || !analyser || !audioContext) return;
    rafId = requestAnimationFrame(analyzeLoop);
    if (timestamp - lastAnalysisAt < 72) return;
    lastAnalysisAt = timestamp;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const frequency = detectPitch(buffer, audioContext.sampleRate);
    if (!frequency){
      if (!permissionDenied) setStatus("Listening…", "Play one clear string.", false);
      return;
    }

    smoothingHistory.push(frequency);
    if (smoothingHistory.length > 5) smoothingHistory.shift();
    const smoothedFrequency = median(smoothingHistory);
    updateFromFrequency(smoothedFrequency);
  }

  function detectPitch(buffer, sampleRate){
    let mean = 0;
    for (let i = 0; i < buffer.length; i++) mean += buffer[i];
    mean /= buffer.length;

    let rms = 0;
    for (let i = 0; i < buffer.length; i++){
      const v = buffer[i] - mean;
      rms += v * v;
    }
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.008) return null;

    const minFreq = 35;
    const maxFreq = 900;
    const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
    const maxLag = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buffer.length * 0.46));
    const sampleCount = Math.min(2100, buffer.length - maxLag - 1);
    if (sampleCount < 512) return null;

    let bestLag = -1;
    let bestCorr = 0;
    const correlations = new Float32Array(maxLag + 2);

    for (let lag = minLag; lag <= maxLag; lag++){
      let ac = 0;
      let e1 = 0;
      let e2 = 0;
      for (let i = 0; i < sampleCount; i += 2){
        const a = buffer[i] - mean;
        const b = buffer[i + lag] - mean;
        ac += a * b;
        e1 += a * a;
        e2 += b * b;
      }
      const denom = Math.sqrt(e1 * e2) || 1;
      const corr = ac / denom;
      correlations[lag] = corr;
      if (corr > bestCorr){
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag < 0 || bestCorr < 0.62) return null;

    const strongThreshold = Math.max(0.68, bestCorr * 0.90);
    for (let lag = minLag + 1; lag < bestLag; lag++){
      const c = correlations[lag];
      if (c >= strongThreshold && c >= correlations[lag - 1] && c >= correlations[lag + 1]){
        bestLag = lag;
        break;
      }
    }

    const y1 = correlations[Math.max(minLag, bestLag - 1)];
    const y2 = correlations[bestLag];
    const y3 = correlations[Math.min(maxLag, bestLag + 1)];
    const denom = (y1 - 2 * y2 + y3);
    let shift = 0;
    if (Math.abs(denom) > 1e-9) shift = 0.5 * (y1 - y3) / denom;
    shift = Math.max(-1, Math.min(1, shift));
    const refinedLag = bestLag + shift;
    const freq = sampleRate / refinedLag;
    if (!Number.isFinite(freq) || freq < minFreq || freq > maxFreq) return null;
    return freq;
  }

  function updateFromFrequency(frequency){
    const instrument = INSTRUMENTS[instrumentKey];
    const candidates = instrument.strings;
    let targetIndex = selectedIndex;

    if (autoMode){
      let bestDistance = Infinity;
      candidates.forEach((item, index) => {
        const cents = Math.abs(1200 * Math.log2(frequency / item.freq));
        if (cents < bestDistance){
          bestDistance = cents;
          targetIndex = index;
        }
      });

      if (stableTargetIndex === targetIndex){
        stableTargetVotes++;
      } else {
        stableTargetIndex = targetIndex;
        stableTargetVotes = 1;
      }
      if (stableTargetVotes >= 2) selectedIndex = targetIndex;
      targetIndex = selectedIndex;
    }

    const target = candidates[targetIndex];
    let cents = 1200 * Math.log2(frequency / target.freq);

    if (autoMode && Math.abs(cents) > 650){
      const half = frequency / 2;
      const halfCents = 1200 * Math.log2(half / target.freq);
      if (Math.abs(halfCents) < Math.abs(cents)) cents = halfCents;
    }

    const boundedCents = Math.max(-50, Math.min(50, cents));
    const inTune = Math.abs(cents) <= 4;
    const rounded = Math.round(cents);

    noteEl.textContent = target.short;
    noteDetailEl.textContent = `${target.note} · ${target.string} string`;
    centsEl.textContent = `${rounded > 0 ? "+" : ""}${rounded} cents`;
    needle.style.left = `${50 + boundedCents * 0.82}%`;
    needle.classList.toggle("in-tune", inTune);
    highlightString(targetIndex);

    if (inTune){
      messageEl.textContent = "In tune";
      setStatus("In tune!", `${target.note} is centered.`, true);
    } else if (cents < 0){
      messageEl.textContent = "Tune up ↑";
      setStatus("A little flat", `${target.note}: raise the pitch.`, false);
    } else {
      messageEl.textContent = "Tune down ↓";
      setStatus("A little sharp", `${target.note}: lower the pitch.`, false);
    }
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
        if (autoMode){
          autoMode = false;
          autoSwitch.setAttribute("aria-checked", "false");
          localStorage.setItem("myLessons.tuner.auto", "false");
        }
        highlightString(index);
        resetDisplay(false);
      });
      stringsEl.appendChild(button);
    });
    highlightString(selectedIndex);
  }

  function highlightString(index){
    [...stringsEl.querySelectorAll(".ml-string-btn")].forEach((button, i) => button.classList.toggle("is-selected", i === index));
  }

  function resetDisplay(resetSelection = true){
    if (resetSelection && autoMode) selectedIndex = Math.min(selectedIndex, INSTRUMENTS[instrumentKey].strings.length - 1);
    const target = INSTRUMENTS[instrumentKey].strings[selectedIndex];
    noteEl.textContent = "—";
    noteDetailEl.textContent = `${INSTRUMENTS[instrumentKey].subtitle} · ${target.note}`;
    centsEl.textContent = "— cents";
    needle.style.left = "50%";
    needle.classList.remove("in-tune");
    messageEl.textContent = autoMode ? "Start tuning by playing any string" : `Play ${target.note}`;
    setStatus("Listening…", "Use the device microphone.", false);
    highlightString(selectedIndex);
  }

  function setStatus(title, copy, good){
    statusTitle.textContent = title;
    statusCopy.textContent = copy;
    statusEl.classList.toggle("is-good", Boolean(good));
    statusDot.textContent = good ? "✓" : "•";
  }

  function median(values){
    if (!values.length) return 0;
    const sorted = [...values].sort((a,b) => a-b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
})();
