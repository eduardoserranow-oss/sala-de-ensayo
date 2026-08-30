'use strict';

const BACKGROUND_AUDIO_VERSION = '1.0.0';

function backgroundAudioWebPreferences() {
  return Object.freeze({
    backgroundThrottling: false
  });
}

module.exports = Object.freeze({
  BACKGROUND_AUDIO_VERSION,
  backgroundAudioWebPreferences
});
