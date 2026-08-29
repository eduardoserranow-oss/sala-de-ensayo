(function () {
  "use strict";

  // Compatibility shim only.
  // The old implementation owned document-capture clicks, called
  // stopImmediatePropagation(), and stopped Guitar/Bass wheels after 1.25 s.
  // That prevented wheel-fix-v2.js from receiving the same user gesture and
  // therefore blocked the shared roulette sound on iPhone.
  //
  // Wheel behavior now stays with routine-practice-v2.js, while
  // wheel-fix-v2.js is the single timing/audio authority for Guitar/Bass.
  window.__FORTISSIMO_LEGACY_WHEEL_REVEAL_DISABLED__ = true;
})();
