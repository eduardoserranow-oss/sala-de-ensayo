(function () {
  "use strict";

  const SESSION_KEY = "myLessons.localSession";
  const HOLD_TO_REORDER_MS = 120;
  const POINTER_SCROLL_CANCEL_PX = 14;
  const TOUCH_SCROLL_CANCEL_PX = 34;
  const AUTO_SCROLL_EDGE_PX = 86;
  const AUTO_SCROLL_STEP_PX = 18;
  const STORAGE_KEYS = {
    guitar: "myLessons.guitarRoutine.v2",
    bass: "myLessons.bassRoutine.v2"
  };

  const listEl = document.getElementById("exerciseList");
  if (!listEl) return;

  const instrument = document.body.dataset.instrument || "guitar";
  const storageBase = STORAGE_KEYS[instrument];
  let suppressClickUntil = 0;

  document.addEventListener("click", (event) => {
    if (Date.now() > suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

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

      let handle = card.querySelector("[data-reorder-handle]");
      if (!handle) {
        handle = document.createElement("span");
        handle.textContent = "☰";
        card.appendChild(handle);
      }

      handle.className = "reorder-handle";
      handle.dataset.reorderHandle = "true";
      handle.setAttribute("aria-hidden", "true");
      handle.setAttribute("tabindex", "-1");

      if (!card.dataset.reorderPressReady) {
        card.dataset.reorderPressReady = "true";
        card.addEventListener("pointerdown", beginPointerPressToReorder, { passive: false });
        card.addEventListener("touchstart", beginTouchPressToReorder, { passive: false });
      }
    });
  }

  function beginPointerPressToReorder(event) {
    if (event.pointerType === "touch") return;
    if (shouldIgnorePress(event)) return;

    const row = event.currentTarget.closest(".exercise-row");
    if (!row || listEl.querySelectorAll(".exercise-row").length < 2) return;

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
      activateDrag(row);
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
      if (!active && distance > POINTER_SCROLL_CANCEL_PX) {
        cancelled = true;
        cleanup();
        return;
      }

      if (!active) return;
      moveEvent.preventDefault();
      autoScroll(moveEvent.clientY);
      reorderAtY(row, moveEvent.clientY);
      renumberVisibleRows();
    };

    const finish = (finishEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      cleanup();
      if (active) finishDrag(row, originalOrder);
    };

    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cancelled = true;
      cleanup();
      cancelDrag(row);
    };

    pressTarget.addEventListener("pointermove", move, { passive: false });
    pressTarget.addEventListener("pointerup", finish);
    pressTarget.addEventListener("pointercancel", cancel);
  }

  function beginTouchPressToReorder(event) {
    if (event.touches.length !== 1) return;
    if (shouldIgnorePress(event)) return;

    const row = event.currentTarget.closest(".exercise-row");
    if (!row || listEl.querySelectorAll(".exercise-row").length < 2) return;

    const touch = event.changedTouches[0] || event.touches[0];
    const touchId = touch.identifier;
    const startX = touch.clientX;
    const startY = touch.clientY;
    const originalOrder = getCurrentOrder();
    let active = false;
    let cancelled = false;

    const holdTimer = window.setTimeout(() => {
      if (cancelled) return;
      active = true;
      activateDrag(row);
    }, HOLD_TO_REORDER_MS);

    const cleanup = () => {
      window.clearTimeout(holdTimer);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", cancel);
    };

    const move = (moveEvent) => {
      const activeTouch = findTouch(moveEvent.touches, touchId) || findTouch(moveEvent.changedTouches, touchId);
      if (!activeTouch) return;

      const distance = Math.hypot(activeTouch.clientX - startX, activeTouch.clientY - startY);
      if (!active && distance > TOUCH_SCROLL_CANCEL_PX) {
        cancelled = true;
        cleanup();
        return;
      }

      if (!active) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      autoScroll(activeTouch.clientY);
      reorderAtY(row, activeTouch.clientY);
      renumberVisibleRows();
    };

    const finish = (finishEvent) => {
      if (!findTouch(finishEvent.changedTouches, touchId)) return;
      cleanup();
      if (active) finishDrag(row, originalOrder);
    };

    const cancel = (cancelEvent) => {
      if (!findTouch(cancelEvent.changedTouches, touchId)) return;
      cancelled = true;
      cleanup();
      cancelDrag(row);
    };

    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", finish, { passive: false });
    document.addEventListener("touchcancel", cancel, { passive: false });
  }

  function shouldIgnorePress(event) {
    const target = event.target;
    if (!target?.closest) return false;
    if (target.closest("[data-reorder-handle]")) return false;

    return Boolean(target.closest([
      "a",
      "button:not([data-reorder-handle])",
      "input",
      "textarea",
      "select",
      "[contenteditable='true']",
      ".routine-switch",
      ".edit-tab-btn",
      ".delete-exercise-btn",
      ".exercise-actions",
      ".preview-actions",
      ".tab-editor",
      ".tab-editor-modal"
    ].join(",")));
  }

  function activateDrag(row) {
    cancelTextSelection();
    row.classList.add("is-dragging");
    listEl.classList.add("is-reordering");
    document.body.classList.add("is-reordering-exercises");
  }

  function finishDrag(row, originalOrder) {
    suppressClickUntil = Date.now() + 500;
    row.classList.remove("is-dragging");
    listEl.classList.remove("is-reordering");
    document.body.classList.remove("is-reordering-exercises");

    const newOrder = getCurrentOrder();
    if (newOrder.join("|") === originalOrder.join("|")) {
      renumberVisibleRows();
      return;
    }

    persistOrderAndReload();
  }

  function cancelDrag(row) {
    row.classList.remove("is-dragging");
    listEl.classList.remove("is-reordering");
    document.body.classList.remove("is-reordering-exercises");
    renumberVisibleRows();
  }

  function findTouch(touchList, touchId) {
    return [...touchList].find((touch) => touch.identifier === touchId) || null;
  }

  function autoScroll(y) {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (y < AUTO_SCROLL_EDGE_PX) {
      window.scrollBy(0, -AUTO_SCROLL_STEP_PX);
    } else if (y > viewportHeight - AUTO_SCROLL_EDGE_PX) {
      window.scrollBy(0, AUTO_SCROLL_STEP_PX);
    }
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
