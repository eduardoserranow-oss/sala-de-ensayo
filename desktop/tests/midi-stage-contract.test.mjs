import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MIDI_STAGE_CHANNEL,
  MIDI_STAGE_VERSION,
  MAX_MIDI_FILES,
  normalizeMidiStagePayload
} = require('../midi-stage-contract.cjs');

const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const exporter = fs.readFileSync(new URL('../../assets/vibe-roulette-songstarter-export-v1.js', import.meta.url), 'utf8');

const validMidi = [
  0x4d,0x54,0x68,0x64, 0x00,0x00,0x00,0x06,
  0x00,0x00, 0x00,0x01, 0x01,0xe0,
  0x4d,0x54,0x72,0x6b, 0x00,0x00,0x00,0x04,
  0x00,0xff,0x2f,0x00
];

const payload = {
  bpm: 108,
  files: [
    { role:'foundation', preset:'Beautiful Rhodes', filename:'01_Foundation_Beautiful-Rhodes.mid', bytes:validMidi },
    { role:'texture', preset:'Broad Texture', filename:'02_Texture_Broad-Texture.mid', bytes:validMidi }
  ]
};

const normalized = normalizeMidiStagePayload(payload);
assert.equal(MIDI_STAGE_CHANNEL, 'fortissimo:midi:stage');
assert.equal(MIDI_STAGE_VERSION, '1.0.0');
assert.equal(MAX_MIDI_FILES, 2);
assert.equal(normalized.bpm, 108);
assert.equal(normalized.files.length, 2);
assert.deepEqual(normalized.files.map(file => file.role), ['foundation','texture']);
assert.equal(normalized.files[0].bytes.toString('ascii',0,4), 'MThd');
assert.equal(normalized.files[1].bytes.toString('ascii',14,18), 'MTrk');
assert.equal(normalized.totalBytes, validMidi.length * 2);

assert.throws(() => normalizeMidiStagePayload({...payload,files:[payload.files[0]]}), /exactly Foundation \+ Texture/);
assert.throws(() => normalizeMidiStagePayload({...payload,files:[payload.files[0],{...payload.files[1],role:'foundation'}]}), /roles must be Foundation \+ Texture/);
assert.throws(() => normalizeMidiStagePayload({...payload,files:[{...payload.files[0],filename:'..\\evil.mid'},payload.files[1]]}), /must not contain a path/);
assert.throws(() => normalizeMidiStagePayload({...payload,files:[{...payload.files[0],bytes:[1,2,3,4,5,6,7,8,9,10,11,12,13,14]},payload.files[1]]}), /Standard MIDI Files only/);
assert.throws(() => normalizeMidiStagePayload({...payload,bpm:999}), /BPM between 30 and 300/);

for (const token of [
  'isAllowedIpcSender(event)',
  'ipcMain.handle(MIDI_STAGE_CHANNEL',
  'normalizeMidiStagePayload(payload)',
  'stagedMidiBySender.set(senderId',
  'stageId,',
  'stagedAt: Date.now()'
]) assert.ok(main.includes(token), `Main-process MIDI stage gate missing: ${token}`);

for (const token of [
  "const BRIDGE_VERSION = '4.0.0'",
  "'midi-stage'",
  'stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL',
  'normalizeRendererMidiPayload(payload)'
]) assert.ok(preload.includes(token), `Preload MIDI stage bridge missing: ${token}`);

assert.ok(!preload.includes("require('node:fs')"), 'Renderer bridge must never gain filesystem access.');
assert.ok(!preload.includes('ipcRenderer.on('), 'Renderer bridge must not expose raw IPC listeners.');

for (const token of [
  "files=[foundation,texture].map",
  "role:layer.role==='foundation'?'foundation':'texture'",
  'filename:layerExportName(layer)',
  'bytes:layerToMidiBytes(layer,{bpm})',
  'if(!pair?.files||pair.files.length!==2)'
]) assert.ok(exporter.includes(token), `Existing Vibe Roulette MIDI pair is not bridge-compatible: ${token}`);

console.log('PASS FORTISSIMO Desktop MIDI stage contract remains strict through Phase 4: Foundation + Texture are validated in memory before any native filesystem or drag operation.');
