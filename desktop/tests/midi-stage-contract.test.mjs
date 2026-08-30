import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MIDI_STAGE_CHANNEL, MIDI_STAGE_VERSION, MAX_MIDI_FILES, normalizeMidiStagePayload } = require('../midi-stage-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const exporter = fs.readFileSync(new URL('../../assets/vibe-roulette-songstarter-export-v1.js', import.meta.url), 'utf8');

const validMidi = [0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xe0,0x4d,0x54,0x72,0x6b,0,0,0,4,0,0xff,0x2f,0];
const payload = { bpm:108, files:[
  { role:'foundation', preset:'Beautiful Rhodes', filename:'01_Foundation_Beautiful-Rhodes.mid', bytes:validMidi },
  { role:'texture', preset:'Broad Texture', filename:'02_Texture_Broad-Texture.mid', bytes:validMidi }
]};
const normalized = normalizeMidiStagePayload(payload);
assert.equal(MIDI_STAGE_CHANNEL, 'fortissimo:midi:stage');
assert.equal(MIDI_STAGE_VERSION, '1.0.0');
assert.equal(MAX_MIDI_FILES, 2);
assert.deepEqual(normalized.files.map(file => file.role), ['foundation','texture']);
assert.equal(normalized.totalBytes, validMidi.length * 2);
assert.throws(() => normalizeMidiStagePayload({...payload,files:[payload.files[0]]}), /exactly Foundation \+ Texture/);
assert.throws(() => normalizeMidiStagePayload({...payload,bpm:999}), /BPM between 30 and 300/);

for (const token of ['ipcMain.handle(MIDI_STAGE_CHANNEL','normalizeMidiStagePayload(payload)','stagedMidiBySender.set(senderId','stagedAt: Date.now()']) {
  assert.ok(main.includes(token), `Main-process MIDI stage gate missing: ${token}`);
}
for (const token of ["const BRIDGE_VERSION = '12.0.0'","'midi-stage'",'stageMidiPair: payload => ipcRenderer.invoke(MIDI_STAGE_CHANNEL','normalizeRendererMidiPayload(payload)']) {
  assert.ok(preload.includes(token), `Preload MIDI stage bridge missing: ${token}`);
}
assert.ok(!preload.includes("require('node:fs')"));
assert.equal((preload.match(/ipcRenderer\.on\(/g) || []).length, 1);
for (const token of ["files:[foundation,texture].map","role:l.role==='foundation'?'foundation':'texture'",'filename:filename(l)','bytes:layerToMidiBytes(l,{bpm})']) {
  assert.ok(exporter.includes(token), `Existing Vibe Roulette MIDI pair is not bridge-compatible: ${token}`);
}
console.log('PASS FORTISSIMO Desktop MIDI stage contract remains strict through Phase 14.1b SongStarter source.');
