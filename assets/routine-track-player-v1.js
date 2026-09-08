(function () {
  "use strict";

  const TRACKS = [
    { label: "85 BPM - HIP HOP", src: "assets/hiphop-85.mp3" },
    { label: "80BPM - JAZZ", src: "assets/jazz-80.mp3" },
    { label: "100 BPM - HIP HOP", src: "assets/hiphop-100.mp3" },
    { label: "100BPM - JAZZ", src: "assets/jazz-100.mp3" },
    { label: "120 BPM - HIP HOP", src: "assets/hiphop-120.mp3" },
    { label: "120BPM - JAZZ", src: "assets/jazz-120.mp3" }
  ];

  const tracksEl = document.getElementById("backingTracks");
  if (!tracksEl) return;

  const audio = new Audio();
  audio.preload = "metadata";

  let activeIndex = null;
  let player = null;
  let playPauseButton = null;
  let titleEl = null;
  let progressEl = null;
  let currentTimeEl = null;
  let durationEl = null;

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function ensurePlayer() {
    if (player) return player;

    player = document.createElement("section");
    player.className = "routine-track-player";
    player.setAttribute("aria-label", "Reproductor de backing track");
    player.innerHTML = `
      <div class="routine-player-now">
        <span class="routine-player-kicker">BACKING TRACK</span>
        <strong class="routine-player-title">—</strong>
      </div>
      <div class="routine-player-controls">
        <button class="routine-player-button routine-player-playpause" type="button" aria-label="Reproducir">▶</button>
        <button class="routine-player-button routine-player-next" type="button" aria-label="Siguiente pista">⏭</button>
      </div>
      <div class="routine-player-timeline">
        <span class="routine-player-time routine-player-current">0:00</span>
        <input class="routine-player-progress" type="range" min="0" max="1000" value="0" step="1" aria-label="Posición de reproducción" />
        <span class="routine-player-time routine-player-duration">0:00</span>
      </div>
      <div class="routine-player-hint">Barra espaciadora: Play / Pausa</div>`;

    tracksEl.insertAdjacentElement("afterend", player);
    playPauseButton = player.querySelector(".routine-player-playpause");
    titleEl = player.querySelector(".routine-player-title");
    progressEl = player.querySelector(".routine-player-progress");
    currentTimeEl = player.querySelector(".routine-player-current");
    durationEl = player.querySelector(".routine-player-duration");

    playPauseButton.addEventListener("click", togglePlayback);
    player.querySelector(".routine-player-next").addEventListener("click", playNext);
    progressEl.addEventListener("input", () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(progressEl.value) / 1000) * audio.duration;
      syncTimeline();
    });

    return player;
  }

  function getTrackButton(index) {
    return tracksEl.querySelector(`[data-track="${index}"]`);
  }

  function syncTrackButtons() {
    tracksEl.querySelectorAll("[data-track]").forEach((button) => {
      const isActive = Number(button.dataset.track) === activeIndex;
      button.classList.toggle("is-playing", isActive && !audio.paused);
      button.classList.toggle("is-selected", isActive);
      button.setAttribute("aria-pressed", isActive && !audio.paused ? "true" : "false");
    });
  }

  function syncPlayer() {
    if (activeIndex === null) return;
    ensurePlayer();
    const playing = !audio.paused;
    titleEl.textContent = TRACKS[activeIndex].label;
    playPauseButton.textContent = playing ? "❚❚" : "▶";
    playPauseButton.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
    player.classList.toggle("is-playing", playing);
    syncTrackButtons();
    syncTimeline();
  }

  function syncTimeline() {
    if (!player) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    currentTimeEl.textContent = formatTime(current);
    durationEl.textContent = formatTime(duration);
    progressEl.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
  }

  function selectTrack(index, autoplay) {
    const track = TRACKS[index];
    if (!track) return;

    ensurePlayer();
    const changed = activeIndex !== index;
    activeIndex = index;

    if (changed) {
      audio.pause();
      audio.src = track.src;
      audio.currentTime = 0;
      audio.load();
    }

    titleEl.textContent = track.label;
    syncPlayer();

    if (autoplay) {
      audio.play().catch(() => syncPlayer());
    }
  }

  function togglePlayback() {
    if (activeIndex === null) return;
    if (audio.paused) audio.play().catch(() => syncPlayer());
    else audio.pause();
  }

  function playNext() {
    if (activeIndex === null) return;
    selectTrack((activeIndex + 1) % TRACKS.length, true);
  }

  tracksEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-track]");
    if (!button || !tracksEl.contains(button)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const index = Number(button.dataset.track);
    if (!Number.isInteger(index) || !TRACKS[index]) return;

    if (activeIndex === index) togglePlayback();
    else selectTrack(index, true);
  }, true);

  window.addEventListener("keydown", (event) => {
    if (activeIndex === null || event.repeat) return;
    if (event.code !== "Space" && event.key !== " ") return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    togglePlayback();
  }, true);

  audio.addEventListener("play", syncPlayer);
  audio.addEventListener("pause", syncPlayer);
  audio.addEventListener("loadedmetadata", syncTimeline);
  audio.addEventListener("durationchange", syncTimeline);
  audio.addEventListener("timeupdate", syncTimeline);
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    syncPlayer();
  });

  const observer = new MutationObserver(() => {
    if (activeIndex === null) return;
    syncTrackButtons();
  });
  observer.observe(tracksEl, { childList: true, subtree: true });
})();