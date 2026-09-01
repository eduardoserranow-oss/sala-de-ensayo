import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root=new URL("../",import.meta.url);
const projects=await readFile(new URL("assets/study-projects-v1.js",root),"utf8");
const progress=await readFile(new URL("assets/study-path-progress-v1.js",root),"utf8");
const polish=await readFile(new URL("assets/study-paths-polish-v1.js",root),"utf8");
const css=await readFile(new URL("assets/study-paths-polish-v1.css",root),"utf8");

test("Phase 10 keeps a reversible project history",()=>{
  assert.match(projects,/HISTORY_KEY/);
  assert.match(projects,/function undo\(/);
  assert.match(projects,/canUndo,undo,undoLabel/);
});

test("AI and legacy stages always receive persistent IDs",()=>{
  assert.match(projects,/id:String\(stage\?\.id\|\|idFallback\|\|makeId\("stage"\)\)/);
  assert.match(projects,/needsMigration/);
});

test("Study Paths storage failures are surfaced without replacing previous data",()=>{
  assert.match(projects,/fortissimo:storage-error/);
  assert.match(progress,/fortissimo:storage-error/);
  assert.match(polish,/No pudimos guardar este cambio/);
});

test("Official progress and project screens load the shared Phase 10 polish",()=>{
  assert.match(projects,/study-paths-polish-v1\.css\?v=phase10/);
  assert.match(progress,/study-paths-polish-v1\.css\?v=phase10/);
  assert.match(projects,/study-paths-polish-v1\.js\?v=phase10/);
  assert.match(progress,/study-paths-polish-v1\.js\?v=phase10/);
});

test("iPhone and accessibility safeguards are present",()=>{
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/font-size:16px!important/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(polish,/visualViewport/);
  assert.match(polish,/navigator\.onLine/);
});
