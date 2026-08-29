'use strict';

const MIDI_DRAG_CHANNEL = 'fortissimo:midi:drag';
const MIDI_DRAG_VERSION = '2.0.0';
const MAX_STAGE_ID_LENGTH = 180;
const MAX_STAGE_AGE_MS = 30 * 60 * 1000;
const MIDI_DRAG_SELECTIONS = Object.freeze(['pair', 'foundation', 'texture']);

function normalizeStageId(value) {
  const stageId = String(value || '').trim();
  if (!stageId || stageId.length > MAX_STAGE_ID_LENGTH) throw new Error('Invalid MIDI stage id.');
  if (!/^\d+:\d{10,17}:\d+$/.test(stageId)) throw new Error('Malformed MIDI stage id.');
  return stageId;
}

function normalizeSelection(value) {
  const selection = String(value || 'pair').trim().toLowerCase();
  if (!MIDI_DRAG_SELECTIONS.includes(selection)) throw new Error('Invalid MIDI drag selection.');
  return selection;
}

function normalizeMidiDragRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid MIDI drag request.');
  return Object.freeze({
    stageId: normalizeStageId(payload.stageId),
    selection: normalizeSelection(payload.selection)
  });
}

module.exports = Object.freeze({
  MIDI_DRAG_CHANNEL,
  MIDI_DRAG_VERSION,
  MAX_STAGE_ID_LENGTH,
  MAX_STAGE_AGE_MS,
  MIDI_DRAG_SELECTIONS,
  normalizeStageId,
  normalizeSelection,
  normalizeMidiDragRequest
});
