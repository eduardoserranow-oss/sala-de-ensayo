const UPDATE_STATE_CHANNEL = 'fortissimo:update:state';
const UPDATE_GET_STATE_CHANNEL = 'fortissimo:update:get-state';
const UPDATE_RESTART_CHANNEL = 'fortissimo:update:restart';
const UPDATE_CONTRACT_VERSION = '1.0.0';
const UPDATE_REPOSITORY = 'eduardoserranow-oss/sala-de-ensayo';
const UPDATE_INTERVAL = '30 minutes';

const UPDATE_STATES = Object.freeze([
  'idle',
  'checking',
  'available',
  'downloaded',
  'current',
  'error',
  'disabled'
]);

function normalizeUpdateState(value = {}) {
  const state = UPDATE_STATES.includes(value.state) ? value.state : 'idle';
  return Object.freeze({
    state,
    currentVersion: String(value.currentVersion || ''),
    releaseName: String(value.releaseName || ''),
    message: String(value.message || ''),
    canRestart: state === 'downloaded' && Boolean(value.canRestart)
  });
}

module.exports = {
  UPDATE_STATE_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_CONTRACT_VERSION,
  UPDATE_REPOSITORY,
  UPDATE_INTERVAL,
  UPDATE_STATES,
  normalizeUpdateState
};
