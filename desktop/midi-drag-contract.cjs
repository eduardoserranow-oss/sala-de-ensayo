'use strict';

const MIDI_DRAG_CHANNEL = 'fortissimo:midi:drag';
const MIDI_DRAG_VERSION = '1.0.0';
const MAX_STAGE_ID_LENGTH = 180;
const MAX_STAGE_AGE_MS = 30 * 60 * 1000;

function normalizeStageId(value) {
  const stageId = String(value || '').trim();
  if (!stageId || stageId.length > MAX_STAGE_ID_LENGTH) throw new Error('Invalid MIDI stage id.');
  if (!/^\d+:\d{10,17}:\d+$/.test(stageId)) throw new Error('Malformed MIDI stage id.');
  return stageId;
}

function normalizeMidiDragRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid MIDI drag request.');
  return Object.freeze({ stageId: normalizeStageId(payload.stageId) });
}

module.exports = Object.freeze({
  MIDI_DRAG_CHANNEL,
  MIDI_DRAG_VERSION,
  MAX_STAGE_ID_LENGTH,
  MAX_STAGE_AGE_MS,
  normalizeStageId,
  normalizeMidiDragRequest
});
