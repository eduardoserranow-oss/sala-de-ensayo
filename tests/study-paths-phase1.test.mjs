import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("study-paths.html", root), "utf8");
const home = await readFile(new URL("index.html", root), "utf8");

test("Study Paths is reachable from the FORTISSIMO home", () => {
  assert.match(home, /href="study-paths\.html\?v=phase1"/);
  assert.match(home, />Study Paths</);
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
