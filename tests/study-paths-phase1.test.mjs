import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("study-paths.html", root), "utf8");
const stagePage = await readFile(new URL("study-stage.html", root), "utf8");
const progressEngine = await readFile(new URL("assets/study-path-progress-v1.js", root), "utf8");
const projectsPage = await readFile(new URL("study-projects.html", root), "utf8");
const projectPage = await readFile(new URL("study-project.html", root), "utf8");
const projectsEngine = await readFile(new URL("assets/study-projects-v1.js", root), "utf8");
const home = await readFile(new URL("index.html", root), "utf8");

test("Study Paths is reachable from the FORTISSIMO home", () => {
  assert.match(home, /href="study-projects\.html\?v=phase5"/);
  assert.match(home, />Study Paths</);
  assert.match(home, /data-home-module="studypaths"/);
});

test("Road to Afrobeats contains the complete 12-stage, 24-song plan", () => {
  assert.equal((page.match(/\["[^"]+","[^"]+","[^"]+","[^"]+","[^"]+"\]/g) || []).length, 12);
  assert.match(page, /The Thrill Is Gone/);
  assert.match(page, /Gravity/);
  assert.match(page, /Joro/);
  assert.match(page, /Calm Down/);
});

test("The page uses the shared FORTISSIMO product navigation", () => {
  assert.match(page, /fortissimo-app-header/);
  assert.match(page, /assets\/internal-navigation-v1\.js/);
  assert.match(page, /href="index\.html\?internal=1&return=studypaths"/);
});

test("Home personalization keeps Study Paths immediately after Vocal", async () => {
  const personalization = await readFile(new URL("assets/home-personalization-v1.js", root), "utf8");
  assert.match(personalization, /\["guitar","bass","vocal","studypaths","soundgym"/);
  assert.match(personalization, /studypaths:"Study Paths"/);
});

test("Phase 2 exposes the visual route, current stage and overall progress", () => {
  assert.match(page, /STAGE 01 OF 12/);
  assert.match(page, /0 \/ 24 canciones aprendidas/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /Raíces occidentales/);
  assert.match(page, /Ritmo y armonía moderna/);
  assert.match(page, /Raíces africanas → Afrobeats/);
  assert.match(page, /isCurrent=number===stats\.current/);
});

test("Phase 3 makes all stages open their individual detail screen", () => {
  assert.match(page, /href="study-stage\.html\?stage=\$\{number\}"/);
  assert.match(stagePage, /const stages=\[/);
  assert.equal((stagePage.match(/\{title:"/g) || []).length, 12);
  assert.match(stagePage, /La conexión A → B/);
  assert.match(stagePage, /Qué estudiar/);
  assert.match(stagePage, /itunes\.apple\.com\/search/);
  assert.match(stagePage, /study-stage\.html\?stage=\$\{index\+2\}/);
});

test("Phase 4 saves manual mastery and unlocks stages sequentially", () => {
  assert.match(progressEngine, /localStorage\.setItem/);
  assert.match(progressEngine, /function toggleSong/);
  assert.match(progressEngine, /function completeStage/);
  assert.match(progressEngine, /!songs\.a\|\|!songs\.b/);
  assert.match(stagePage, /class="mastery-button"/);
  assert.match(stagePage, /class="complete-button"/);
  assert.match(stagePage, /Completa las dos canciones primero/);
  assert.match(page, /FortissimoStudyPath\.stats/);
  assert.match(page, /aria-disabled="true"/);
});

test("Phase 5 organizes Study Paths into independent projects", () => {
  assert.match(projectsPage, /Tus proyectos/);
  assert.match(projectsPage, /Road to Afrobeats/);
  assert.match(projectsPage, /\+ Nuevo proyecto/);
  assert.match(projectsPage, /data-edit/);
  assert.match(projectsPage, /data-duplicate/);
  assert.match(projectsPage, /data-archive/);
  assert.match(projectsPage, /data-restore/);
  assert.match(projectsEngine, /function create/);
  assert.match(projectsEngine, /function update/);
  assert.match(projectsEngine, /function duplicate/);
  assert.match(projectsEngine, /function archive/);
  assert.match(projectPage, /En la Fase 6 podrás construir sus etapas/);
  assert.match(page, /href="study-projects\.html"/);
});
