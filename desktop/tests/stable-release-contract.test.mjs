import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const preload=fs.readFileSync(new URL('../preload.cjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../main.cjs',import.meta.url),'utf8');
const splash=fs.readFileSync(new URL('../splash-window.cjs',import.meta.url),'utf8');
const splashHtml=fs.readFileSync(new URL('../splash.html',import.meta.url),'utf8');
const forge=fs.readFileSync(new URL('../forge.config.js',import.meta.url),'utf8');
const iconBuilder=fs.readFileSync(new URL('../prepare-native-assets.cjs',import.meta.url),'utf8');
const originalIcon=fs.readFileSync(new URL('../../assets/forte-flex-favicon.svg',import.meta.url),'utf8');

assert.equal(pkg.version,'0.12.0');
assert.equal(pkg.devDependencies.sharp,'0.34.3');
assert.ok(pkg.scripts.make.includes('prepare:native-assets'));
assert.ok(pkg.scripts.package.includes('prepare:native-assets'));
assert.ok(pkg.scripts.start.includes('prepare:native-assets'));
assert.ok(preload.includes("const BRIDGE_VERSION = '12.0.0'"));
assert.ok(preload.includes("'stable-desktop-release'"));
assert.ok(preload.includes('desktop-workspace12'));
assert.ok(preload.includes('project-versions12'));

assert.ok(splash.includes('const MIN_SPLASH_VISIBLE_MS = 8000'));
assert.ok(splash.includes("mark: splashAssetUrl('forte-flex-favicon.svg')"));
assert.ok(splash.includes('holdMs: String(MIN_SPLASH_VISIBLE_MS)'));
assert.ok(splashHtml.includes('@keyframes bootProgress'));
assert.ok(splashHtml.includes('Preparing audio and project workspace…'));
assert.ok(splashHtml.includes('Loading native MIDI workflow…'));
assert.ok(splashHtml.includes('Restoring FORTISSIMO workspace…'));

assert.ok(originalIcon.includes('viewBox="0 0 1024 1024"'));
assert.ok(originalIcon.includes('fill="#fff"'));
assert.ok(iconBuilder.includes("sourceSvg = path.join(root, 'assets', 'forte-flex-favicon.svg')"));
assert.ok(iconBuilder.includes("outputIco = path.join(root, 'assets', 'forte-favicon.ico')"));
assert.ok(iconBuilder.includes("outputPng = path.join(root, 'assets', 'fortissimo-desktop-icon.png')"));
assert.ok(iconBuilder.includes('sizes = [16, 24, 32, 48, 64, 128, 256]'));
assert.ok(forge.includes('setupIcon: windowsIcon'));
assert.ok(forge.includes("const windowsIcon = path.resolve(__dirname, '..', 'assets', 'forte-favicon.ico')"));
assert.ok(forge.includes("const splashMark = path.resolve(__dirname, '..', 'assets', 'forte-flex-favicon.svg')"));

for(const token of ['nodeIntegration: false','contextIsolation: true','sandbox: true','webSecurity: true','backgroundThrottling: false'])assert.ok(main.includes(token),`Stable shell security/audio contract missing ${token}`);
assert.ok(!main.includes('child_process'));
assert.ok(!preload.includes("require('node:fs')"));

console.log('PASS FORTISSIMO Desktop Phase 12 stable release: eight-second boot, original brand icon, secure shell and prior native workflow preserved.');
