(function () {
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const HOLD_TO_REORDER_MS = 100;
  const SCROLL_CANCEL_PX = 12;
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
        const handle = document.createElement("span");
        handle.className = "reorder-handle";
        handle.dataset.reorderHandle = "true";
        handle.setAttribute("aria-hidden", "true");
        handle.textContent = "☰";
        card.appendChild(handle);
      }

      if (!card.dataset.reorderPressReady) {
        card.dataset.reorderPressReady = "true";
        card.addEventListener("pointerdown", beginPressToReorder, { passive: false });
      }
    });
  }

  function beginPressToReorder(event) {
    const rows = [...listEl.querySelectorAll(".exercise-row")];
    if (rows.length < 2) return;
    if (shouldIgnorePress(event)) return;

    const row = event.currentTarget.closest(".exercise-row");
    if (!row) return;

    const pointerId = event.pointerId;
    const pressTarget = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const originalOrder = getCurrentOrder();
    let active = false;
    let cancelled = false;

    pressTarget.setPointerCapture?.(pointerId);

    const holdTimer = window.setTimeout(() => {
      if (cancelled) return;
      active = true;
      row.classList.add("is-dragging");
      listEl.classList.add("is-reordering");
      document.body.classList.add("is-reordering-exercises");
    }, HOLD_TO_REORDER_MS);

    const cleanup = () => {
      window.clearTimeout(holdTimer);
      pressTarget.releasePointerCapture?.(pointerId);
      pressTarget.removeEventListener("pointermove", move);
      pressTarget.removeEventListener("pointerup", finish);
      pressTarget.removeEventListener("pointercancel", cancel);
    };

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;

      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!active && distance > SCROLL_CANCEL_PX) {
        cancelled = true;
        cleanup();
        return;
      }

      if (!active) return;
      moveEvent.preventDefault();
      reorderAtY(row, moveEvent.clientY);
      renumberVisibleRows();
    };

    const finish = (finishEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      cleanup();

      if (!active) return;

      row.classList.remove("is-dragging");
      listEl.classList.remove("is-reordering");
      document.body.classList.remove("is-reordering-exercises");

      const newOrder = getCurrentOrder();
      if (newOrder.join("|") === originalOrder.join("|")) {
        renumberVisibleRows();
        return;
      }

      persistOrderAndReload();
    };

    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cancelled = true;
      cleanup();

      row.classList.remove("is-dragging");
      listEl.classList.remove("is-reordering");
      document.body.classList.remove("is-reordering-exercises");
      renumberVisibleRows();
    };

    pressTarget.addEventListener("pointermove", move, { passive: false });
    pressTarget.addEventListener("pointerup", finish);
    pressTarget.addEventListener("pointercancel", cancel);
  }

  function shouldIgnorePress(event) {
    return Boolean(event.target.closest([
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "[contenteditable='true']",
      ".routine-switch",
      ".edit-tab-btn",
      ".delete-exercise-btn",
      ".exercise-actions",
      ".tab-editor",
      ".tab-editor-modal"
    ].join(",")));
  }

  function reorderAtY(row, y) {
    const otherRows = [...listEl.querySelectorAll(".exercise-row:not(.is-dragging)")];
    const beforeRow = otherRows.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });

    if (beforeRow) listEl.insertBefore(row, beforeRow);
    else listEl.appendChild(row);
  }

  function getCurrentOrder() {
    return [...listEl.querySelectorAll(".exercise-row")]
      .map((row) => row.dataset.exerciseId || "")
      .filter(Boolean);
  }

  function cancelTextSelection() {
    const selection = window.getSelection?.();
    if (selection?.removeAllRanges) {
      selection.removeAllRanges();
    }
  }

  function renumberVisibleRows() {
    cancelTextSelection();
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
