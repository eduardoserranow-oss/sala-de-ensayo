import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contract = require('../update-contract.cjs');
const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../../.github/workflows/fortissimo-desktop-release.yml', import.meta.url), 'utf8');

assert.equal(contract.UPDATE_STATE_CHANNEL, 'fortissimo:update:state');
assert.equal(contract.UPDATE_GET_STATE_CHANNEL, 'fortissimo:update:get-state');
assert.equal(contract.UPDATE_RESTART_CHANNEL, 'fortissimo:update:restart');
assert.equal(contract.UPDATE_CONTRACT_VERSION, '1.0.0');
assert.equal(contract.UPDATE_REPOSITORY, 'eduardoserranow-oss/sala-de-ensayo');
assert.equal(contract.UPDATE_INTERVAL, '30 minutes');

const downloaded = contract.normalizeUpdateState({
  state: 'downloaded',
  currentVersion: '0.5.0',
  releaseName: 'v0.5.1',
  canRestart: true
});
assert.equal(downloaded.state, 'downloaded');
assert.equal(downloaded.canRestart, true);
assert.equal(Object.isFrozen(downloaded), true);

const invalid = contract.normalizeUpdateState({ state: 'anything', canRestart: true });
assert.equal(invalid.state, 'idle');
assert.equal(invalid.canRestart, false);

assert.ok(main.includes("UpdateSourceType.ElectronPublicUpdateService"));
assert.ok(main.includes("repo: UPDATE_REPOSITORY"));
assert.ok(main.includes("notifyUser: false"));
assert.ok(main.includes("autoUpdater.quitAndInstall()"));
assert.ok(main.includes("if (!updateState.canRestart || updateState.state !== 'downloaded') return;"));
assert.ok(main.includes("if (!isAllowedIpcSender(event)) return;"));
assert.ok(main.includes("process.argv.includes('--squirrel-firstrun') ? 12000 : 2500"));
assert.ok(preload.includes('fortissimoDesktopUpdateReady'));
assert.ok(preload.includes('Restart FORTISSIMO'));
assert.ok(preload.includes("'auto-update'"));

for (const token of [
  'permissions:',
  'contents: write',
  'desktop/package.json',
  'npm run make',
  'FORTISSIMO-Setup.exe',
  '*-full.nupkg',
  'RELEASES',
  'gh release create',
  'v${VERSION}'
]) {
  assert.ok(workflow.includes(token), `Desktop release workflow missing: ${token}`);
}

console.log('PASS FORTISSIMO Desktop Phase 5 updater contract: official public update source, background download, trusted restart IPC, compact update-ready UX and versioned GitHub Release publishing.');
