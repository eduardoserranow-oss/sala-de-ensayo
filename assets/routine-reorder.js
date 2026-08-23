(function () {
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const STORAGE_KEYS = {
    guitar: "myLessons.guitarRoutine.v2",
    bass: "myLessons.bassRoutine.v2"
  };

  const listEl = document.getElementById("exerciseList");
  if (!listEl) return;

  const instrument = document.body.dataset.instrument || "guitar";
  const storageBase = STORAGE_KEYS[instrument];

  enhanceRows();

  const observer = new MutationObserver(() => enhanceRows());
  observer.observe(listEl, { childList: true });

  function enhanceRows() {
    const rows = [...listEl.querySelectorAll(".exercise-row")];

    rows.forEach((row, index) => {
      const card = row.querySelector(".exercise-card");
      if (!card) return;

      const number = row.querySelector(":scope > .exercise-number") || card.querySelector(".exercise-number");
      if (number) {
        number.textContent = String(index + 1);
        if (number.parentElement !== card) card.prepend(number);
      }

      if (!card.querySelector("[data-reorder-handle]")) {
        const handle = document.createElement("button");
        handle.className = "reorder-handle";
        handle.type = "button";
        handle.dataset.reorderHandle = "true";
        handle.setAttribute("aria-label", "Mover ejercicio");
        handle.textContent = "☰";
        card.appendChild(handle);
        handle.addEventListener("pointerdown", startDrag);
      }
    });
  }

  function startDrag(event) {
    const rows = [...listEl.querySelectorAll(".exercise-row")];
    if (rows.length < 2) return;

    const row = event.currentTarget.closest(".exercise-row");
    if (!row) return;

    event.preventDefault();
    const pointerId = event.pointerId;
    const handle = event.currentTarget;
    handle.setPointerCapture?.(pointerId);

    row.classList.add("is-dragging");
    listEl.classList.add("is-reordering");
    document.body.classList.add("is-reordering-exercises");

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();

      const y = moveEvent.clientY;
      const otherRows = [...listEl.querySelectorAll(".exercise-row:not(.is-dragging)")];
      const beforeRow = otherRows.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return y < rect.top + rect.height / 2;
      });

      if (beforeRow) listEl.insertBefore(row, beforeRow);
      else listEl.appendChild(row);

      renumberVisibleRows();
    };

    const finish = (finishEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      handle.releasePointerCapture?.(pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);

      row.classList.remove("is-dragging");
      listEl.classList.remove("is-reordering");
      document.body.classList.remove("is-reordering-exercises");

      persistOrderAndReload();
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  function renumberVisibleRows() {
    [...listEl.querySelectorAll(".exercise-row")].forEach((row, index) => {
      const number = row.querySelector(".exercise-number");
      if (number) number.textContent = String(index + 1);
    });
  }

  function persistOrderAndReload() {
    const session = getSession();
    const userId = session?.user?.id;
    if (!userId || !storageBase) {
      renumberVisibleRows();
      return;
    }

    const key = `${storageBase}.${userId}`;
    const saved = readJson(window.localStorage.getItem(key));
    if (!saved || !Array.isArray(saved.exercises)) {
      renumberVisibleRows();
      return;
    }

    const order = [...listEl.querySelectorAll(".exercise-row")]
      .map((row) => row.dataset.exerciseId)
      .filter(Boolean);

    const byId = new Map(saved.exercises.map((exercise) => [exercise.id, exercise]));
    const reordered = order.map((id) => byId.get(id)).filter(Boolean);

    if (reordered.length !== saved.exercises.length) {
      renumberVisibleRows();
      return;
    }

    saved.exercises = reordered;
    window.localStorage.setItem(key, JSON.stringify(saved));
    window.location.reload();
  }

  function getSession() {
    return readJson(window.localStorage.getItem(SESSION_KEY)) ||
      readJson(window.sessionStorage.getItem(SESSION_KEY));
  }

  function readJson(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }
})();
