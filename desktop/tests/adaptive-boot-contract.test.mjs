import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const splashWindow = fs.readFileSync(new URL('../splash-window.cjs', import.meta.url), 'utf8');
const splashHtml = fs.readFileSync(new URL('../splash.html', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('../forge.config.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../../assets/vibe-roulette-spin-audio-sync-v1.js', import.meta.url), 'utf8');
const wideCss = fs.readFileSync(new URL('../../assets/vibe-roulette-wide-layout-v1.css', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.1');

for (const token of [
  "require('./splash-window.cjs')",'const bootSplash = createDesktopSplash()',"setSplashStatus(bootSplash, 'Preparing secure Desktop runtime…')", "setSplashStatus(bootSplash, 'Loading live FORTISSIMO workspace…')",'mainWindow = createMainWindow({ splash: bootSplash })','handoffSplashToMain(splash, win)',"const splash = document.querySelector('.app-splash')",'if (splash) splash.remove()'
]) assert.ok(main.includes(token), `Desktop boot integration missing: ${token}`);
for (const token of ['version: app.getVersion()',"logo: splashAssetUrl('fortissimo-header-logo-v6.jpg')", "mark: splashAssetUrl('fortissimo-icon-20260824.svg')",'nodeIntegration: false','contextIsolation: true','sandbox: true','webSecurity: true','did-finish-load','mainWindow.show()']) assert.ok(splashWindow.includes(token), `Native splash contract missing: ${token}`);
for (const token of ['Developed, programmed &amp; calibrated by SERRA.','Built for the creative development of the SERRA artist team.','Santo Domingo · Dominican Republic · 2026','Desktop v${version}','Loading FORTISSIMO workspace…']) assert.ok(splashHtml.includes(token), `Splash content missing: ${token}`);
for (const token of ['fortissimo-header-logo-v6.jpg','fortissimo-icon-20260824.svg','extraResource: [dragIcon, splashLogo, splashMark]']) assert.ok(forge.includes(token), `Splash packaging asset missing: ${token}`);
for (const token of ['WIDE_LAYOUT_STYLESHEET_URL','installAdaptiveWorkspace()',"layout.className = 'vr-result-layout'", "main.className = 'vr-result-main'", "rail.className = 'vr-result-rail'", "rail.setAttribute('aria-label', 'Production and DAW tools')",'moveDesktopToolkitIntoRail(resultPanel, rail)']) assert.ok(loader.includes(token), `Adaptive workspace loader missing: ${token}`);
for (const token of ['@media (min-width:1180px)','.vr-shell{width:min(1680px,100%)','.vr-result-layout{display:grid','@media (min-width:1500px)','.eightbar-wrap{grid-template-columns:repeat(2,minmax(0,1fr))','@media (max-width:1179px)']) assert.ok(wideCss.includes(token), `Adaptive wide-screen CSS missing: ${token}`);
assert.ok(!splashWindow.includes('nodeIntegration: true'));
assert.ok(!splashWindow.includes('contextIsolation: false'));
console.log('PASS FORTISSIMO Desktop Phase 9.1 keeps adaptive workspace + native versioned boot intact.');
