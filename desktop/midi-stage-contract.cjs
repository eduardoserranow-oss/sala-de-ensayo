'use strict';

const MIDI_STAGE_CHANNEL = 'fortissimo:midi:stage';
const MIDI_STAGE_VERSION = '1.0.0';
const MAX_MIDI_FILES = 2;
const MAX_MIDI_FILE_BYTES = 2 * 1024 * 1024;
const MAX_MIDI_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_ROLES = new Set(['foundation', 'texture']);

function normalizeBpm(value) {
  const bpm = Number(value);
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) {
    throw new Error('Desktop MIDI stage requires a BPM between 30 and 300.');
  }
  return bpm;
}

function normalizeFilename(value) {
  const filename = String(value || '').trim();
  if (!filename || filename.length > 160) throw new Error('Invalid MIDI filename.');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error('MIDI filename must not contain a path.');
  }
  if (!/^[A-Za-z0-9_.#-]+\.mid$/i.test(filename)) {
    throw new Error('MIDI filename must be a simple .mid filename.');
  }
  return filename;
}

function normalizePreset(value) {
  return String(value || '').trim().slice(0, 160);
}

function normalizeBytes(value) {
  const source = Array.isArray(value)
    ? value
    : ArrayBuffer.isView(value)
      ? Array.from(value)
      : null;

  if (!source || source.length < 14) throw new Error('MIDI bytes are missing or too short.');
  if (source.length > MAX_MIDI_FILE_BYTES) throw new Error('MIDI file exceeds the Desktop stage limit.');

  const bytes = Buffer.allocUnsafe(source.length);
  for (let index = 0; index < source.length; index += 1) {
    const byte = Number(source[index]);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('MIDI bytes must contain only byte values.');
    bytes[index] = byte;
  }

  if (bytes.toString('ascii', 0, 4) !== 'MThd') throw new Error('Desktop stage accepts Standard MIDI Files only.');
  if (bytes.readUInt32BE(4) !== 6) throw new Error('Unsupported MIDI header length.');
  if (bytes.readUInt16BE(8) !== 0) throw new Error('FORTISSIMO Desktop currently accepts MIDI format 0 only.');
  if (bytes.readUInt16BE(10) !== 1) throw new Error('FORTISSIMO Desktop currently accepts one-track MIDI files only.');
  if (bytes.toString('ascii', 14, 18) !== 'MTrk') throw new Error('MIDI track chunk is missing.');

  return bytes;
}

function normalizeMidiStagePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid Desktop MIDI stage payload.');
  }

  const sourceFiles = Array.isArray(payload.files) ? payload.files : [];
  if (sourceFiles.length !== MAX_MIDI_FILES) {
    throw new Error('FORTISSIMO Desktop requires exactly Foundation + Texture MIDI.');
  }

  const seenRoles = new Set();
  let totalBytes = 0;
  const files = sourceFiles.map(file => {
    if (!file || typeof file !== 'object' || Array.isArray(file)) throw new Error('Invalid staged MIDI file.');
    const role = String(file.role || '').trim().toLowerCase();
    if (!ALLOWED_ROLES.has(role) || seenRoles.has(role)) throw new Error('Desktop MIDI roles must be Foundation + Texture exactly once.');
    seenRoles.add(role);

    const bytes = normalizeBytes(file.bytes);
    totalBytes += bytes.length;
    if (totalBytes > MAX_MIDI_TOTAL_BYTES) throw new Error('Combined MIDI payload exceeds the Desktop stage limit.');

    return {
      role,
      preset: normalizePreset(file.preset),
      filename: normalizeFilename(file.filename),
      bytes
    };
  });

  if (!seenRoles.has('foundation') || !seenRoles.has('texture')) {
    throw new Error('Desktop MIDI stage requires Foundation + Texture.');
  }

  return {
    version: MIDI_STAGE_VERSION,
    bpm: normalizeBpm(payload.bpm),
    totalBytes,
    files
  };
}

module.exports = Object.freeze({
  MIDI_STAGE_CHANNEL,
  MIDI_STAGE_VERSION,
  MAX_MIDI_FILES,
  MAX_MIDI_FILE_BYTES,
  MAX_MIDI_TOTAL_BYTES,
  normalizeMidiStagePayload
});
