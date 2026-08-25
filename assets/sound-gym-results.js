(function(){
  "use strict";

  const RANK_LABELS = ["Novato","Aprendiz","Competente","Avanzado","Maestro"];
  const CONFETTI_COLORS = ["#ff6500","#2dd4bf","#f1c34d"];
  let confettiTimer = 0;

  function numberFrom(value){
    const match = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function parseSummary(summary){
    const values = {};
    summary.querySelectorAll(":scope > div").forEach(item=>{
      const key = item.querySelector("span")?.textContent?.trim().toLowerCase() || "";
      const value = item.querySelector("strong")?.textContent?.trim() || "";
      if(key) values[key] = value;
    });

    const accuracyText = values["precisión"] || values["precision"] || "0%";
    const timeText = values["tiempo promedio"] || "—";
    const scoreText = values["score"] || "0/1000";
    const masteryText = values["dominio"] || "☆☆☆";

    return {
      accuracy: Math.max(0, Math.min(100, numberFrom(accuracyText))),
      averageTime: numberFrom(timeText),
      score: Math.max(0, Math.min(1000, numberFrom(scoreText))),
      stars: Math.max(0, Math.min(3, (masteryText.match(/★/g) || []).length)),
      accuracyText,
      timeText,
      scoreText,
      masteryText
    };
  }

  function getFeedback(result){
    const {accuracy, averageTime, score, stars} = result;
    if(accuracy >= 100 && score >= 950 && averageTime > 0 && averageTime <= 5){
      return {
        index: 4,
        title: "Oído de acero",
        message: "Nivel maestro. Escuchas, decides y aciertas con una precisión extraordinaria."
      };
    }
    if(stars === 3 || accuracy >= 90){
      return {
        index: 4,
        title: "Casi maestro",
        message: "Tu oído está muy afinado. Ya percibes matices que a muchos se les escapan."
      };
    }
    if(stars === 2 || accuracy >= 80){
      return {
        index: 3,
        title: "Oído afilado",
        message: "Tienes mucha experiencia auditiva. Estás entrando en terreno avanzado."
      };
    }
    if(stars === 1 || accuracy >= 60){
      return {
        index: 2,
        title: "Buen oído",
        message: "Tienes una base sólida. Sigue entrenando para reconocer cambios cada vez más sutiles."
      };
    }
    if(accuracy >= 40){
      return {
        index: 1,
        title: "Aprendiz con potencial",
        message: "Ya reconoces diferencias claras. Tu oído está tomando forma y necesita más repetición."
      };
    }
    return {
      index: 0,
      title: "Oído por pulir",
      message: "Todavía te falta pulir precisión y confianza. Repite el ejercicio y busca escuchar antes de adivinar."
    };
  }

  function trophySvg(){
    return `
      <svg class="sg-result-trophy" viewBox="0 0 96 96" aria-hidden="true">
        <defs>
          <linearGradient id="sgTrophyGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffe29a"/>
            <stop offset=".45" stop-color="#f1c34d"/>
            <stop offset="1" stop-color="#b96d12"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#sgTrophyGold)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M31 20h34v20c0 14-7 24-17 28-10-4-17-14-17-28V20Z"/>
          <path d="M31 27H20v7c0 12 7 19 17 19M65 27h11v7c0 12-7 19-17 19"/>
          <path d="M48 68v10M36 82h24M32 86h32"/>
          <path d="M41 43v8M48 39v16M55 44v7"/>
        </g>
      </svg>`;
  }

  function rankTrack(activeIndex){
    return RANK_LABELS.map((label,index)=>
      `<span class="sg-result-skill-step${index === activeIndex ? " is-active" : ""}">${label}</span>`
    ).join("");
  }

  function formatScore(value){
    return Math.round(value).toLocaleString("en-US");
  }

  function animateScore(element, finalScore){
    if(!element) return;
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
      element.textContent = formatScore(finalScore);
      return;
    }
    const duration = 900;
    const start = performance.now();
    const tick = now=>{
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatScore(finalScore * eased);
      if(progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function launchConfetti(){
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelector(".sg-confetti-layer")?.remove();
    clearTimeout(confettiTimer);

    const layer = document.createElement("div");
    layer.className = "sg-confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    const count = window.innerWidth <= 560 ? 18 : 26;

    for(let i=0;i<count;i++){
      const piece = document.createElement("span");
      piece.className = "sg-confetti-piece";
      piece.style.left = `${3 + Math.random() * 94}%`;
      piece.style.setProperty("--confetti-color", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      piece.style.setProperty("--confetti-duration", `${720 + Math.random() * 320}ms`);
      piece.style.setProperty("--confetti-delay", `${Math.random() * 100}ms`);
      piece.style.setProperty("--confetti-drift", `${-52 + Math.random() * 104}px`);
      piece.style.setProperty("--confetti-spin", `${180 + Math.random() * 460}deg`);
      piece.style.width = `${3 + Math.random() * 3}px`;
      piece.style.height = `${9 + Math.random() * 8}px`;
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);
    confettiTimer = window.setTimeout(()=>layer.remove(), 1250);
  }

  function getGameTitle(trainer){
    return trainer.querySelector("[data-trainer-title]")?.textContent?.trim()
      || trainer.querySelector(".sg-trainer-head h2")?.textContent?.trim()
      || "Sound Gym";
  }

  function findGameCard(title){
    return [...document.querySelectorAll(".sg-game[data-title]")]
      .find(card=>card.dataset.title?.trim() === title) || null;
  }

  function clearResult(trainer){
    trainer.classList.remove("is-session-complete");
    trainer.removeAttribute("data-sg-result-visible");
    trainer.querySelector(":scope > .sg-result-card")?.remove();
  }

  function continueTraining(trainer, title){
    clearResult(trainer);
    trainer.classList.remove("show");
    const currentCard = findGameCard(title);
    const liveCards = [...document.querySelectorAll(".sg-game.is-live")];
    const currentIndex = currentCard ? liveCards.indexOf(currentCard) : -1;
    const destination = currentIndex >= 0 && liveCards[currentIndex + 1]
      ? liveCards[currentIndex + 1]
      : currentCard || document.querySelector(".sg-level-nav");
    destination?.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function repeatTraining(trainer, originalNext){
    clearResult(trainer);
    originalNext.click();
  }

  function renderResult(trainer, summary, originalNext){
    if(trainer.dataset.sgResultVisible === "1") return;
    trainer.dataset.sgResultVisible = "1";

    const result = parseSummary(summary);
    const feedback = getFeedback(result);
    const title = getGameTitle(trainer);
    const card = document.createElement("section");
    card.className = "sg-result-card";
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");

    const stars = [0,1,2].map(index=>
      `<span class="${index < result.stars ? "is-earned" : ""}" aria-hidden="true">★</span>`
    ).join("");

    card.innerHTML = `
      <span class="sg-result-eyebrow">Sesión completada</span>
      <h3>¡Buen entrenamiento!</h3>
      <p class="sg-result-game">${escapeHtml(title)}</p>

      <div class="sg-result-main">
        <div class="sg-result-block">
          <span class="sg-result-label">Dominio</span>
          <div class="sg-result-stars" aria-label="${result.stars} de 3 estrellas">${stars}</div>
          <div class="sg-result-rank">${escapeHtml(feedback.title)}</div>
          <p class="sg-result-message">${escapeHtml(feedback.message)}</p>
        </div>

        <div class="sg-result-trophy-wrap">${trophySvg()}</div>

        <div class="sg-result-block">
          <span class="sg-result-label">Score</span>
          <strong class="sg-result-score" data-result-score>0</strong>
          <span class="sg-result-score-max">de 1,000 puntos</span>
        </div>
      </div>

      <div class="sg-result-skill">
        <span class="sg-result-skill-title">Tu nivel de habilidad</span>
        <div class="sg-result-skill-track">${rankTrack(feedback.index)}</div>
      </div>

      <div class="sg-result-stats">
        <div class="sg-result-stat"><span>Precisión</span><strong>${escapeHtml(result.accuracyText)}</strong></div>
        <div class="sg-result-stat"><span>Tiempo promedio</span><strong>${escapeHtml(result.timeText)}</strong></div>
      </div>

      <div class="sg-result-actions">
        <button class="sg-result-btn sg-result-continue" type="button">Continuar entrenamiento →</button>
        <button class="sg-result-btn sg-result-repeat" type="button">↻ Repetir para mejorar score</button>
      </div>
    `;

    trainer.appendChild(card);
    trainer.classList.add("is-session-complete");
    card.querySelector(".sg-result-continue")?.addEventListener("click",()=>continueTraining(trainer,title));
    card.querySelector(".sg-result-repeat")?.addEventListener("click",()=>repeatTraining(trainer,originalNext));

    animateScore(card.querySelector("[data-result-score]"), result.score);
    launchConfetti();
    card.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function inspectTrainer(trainer){
    if(!(trainer instanceof HTMLElement)) return;
    const summary = trainer.querySelector(".sg-session-summary.show");
    const originalNext = trainer.querySelector(".sg-next.show");
    if(!summary || !originalNext) return;
    if(!/^repetir$/i.test(originalNext.textContent.trim())) return;
    renderResult(trainer, summary, originalNext);
  }

  function inspectAll(){
    document.querySelectorAll(".sg-trainer").forEach(inspectTrainer);
  }

  const observer = new MutationObserver(inspectAll);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  document.addEventListener("DOMContentLoaded", inspectAll, {once:true});
  inspectAll();
})();
