'use strict';

const MIDI_EXPORT_FOLDER_CHANNEL = 'fortissimo:midi:export-folder';
const MIDI_EXPORT_SAVE_CHANNEL = 'fortissimo:midi:save';
const MIDI_EXPORT_OPEN_CHANNEL = 'fortissimo:midi:open-folder';
const DESKTOP_TOOLKIT_VERSION = '1.0.0';
const MIDI_SELECTIONS = Object.freeze(['pair', 'foundation', 'texture']);

function normalizeMidiSelection(value) {
  const selection = String(value || 'pair').trim().toLowerCase();
  if (!MIDI_SELECTIONS.includes(selection)) throw new Error('Invalid MIDI selection.');
  return selection;
}

function normalizeToolkitRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid Desktop toolkit request.');
  const stageId = String(payload.stageId || '').trim();
  if (!/^\d+:\d{10,17}:\d+$/.test(stageId)) throw new Error('Malformed MIDI stage id.');
  return Object.freeze({ stageId, selection: normalizeMidiSelection(payload.selection) });
}

module.exports = Object.freeze({
  MIDI_EXPORT_FOLDER_CHANNEL,
  MIDI_EXPORT_SAVE_CHANNEL,
  MIDI_EXPORT_OPEN_CHANNEL,
  DESKTOP_TOOLKIT_VERSION,
  MIDI_SELECTIONS,
  normalizeMidiSelection,
  normalizeToolkitRequest
});
