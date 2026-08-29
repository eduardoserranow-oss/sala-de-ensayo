import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8');
const login = fs.readFileSync(new URL('../../assets/login-auth.js', import.meta.url), 'utf8');
const cloud = fs.readFileSync(new URL('../../assets/fortissimo-cloud-v1.js', import.meta.url), 'utf8');

for (const token of [
  "const PERSISTENT_PARTITION = 'persist:fortissimo-main'",
  'partition: PERSISTENT_PARTITION',
  'session.fromPartition(PERSISTENT_PARTITION, { cache: true })',
  'installPermissionGuard(desktopSession)'
]) {
  assert.ok(main.includes(token), `Persistent Electron session contract missing: ${token}`);
}

for (const token of [
  "const BRIDGE_VERSION = '4.0.0'",
  "'persistent-session'",
  "sessionPersistence: 'remember-login'"
]) {
  assert.ok(preload.includes(token), `Desktop session bridge contract missing: ${token}`);
}

for (const token of [
  'const REMEMBER_KEY="myLessons.rememberLogin"',
  'const SESSION_KEY="myLessons.localSession"',
  'rememberInput.checked=localStorage.getItem(REMEMBER_KEY)!=="false"',
  'const target=remember?localStorage:sessionStorage',
  'target.setItem(SESSION_KEY,JSON.stringify(session))',
  'cloudToken'
]) {
  assert.ok(login.includes(token), `Web login persistence contract missing: ${token}`);
}

for (const token of [
  'fortissimo_login',
  'fortissimo_logout',
  'fortissimo_load_state',
  'cloudToken'
]) {
  assert.ok(cloud.includes(token), `Shared FORTISSIMO cloud account contract missing: ${token}`);
}

assert.ok(!main.includes('clearStorageData('), 'Desktop must not clear remembered login on normal close.');
assert.ok(!main.includes('clearCache('), 'Desktop must not clear the persistent profile on normal close.');

console.log('PASS FORTISSIMO Desktop session contract remains intact through Phase 4: remembered login persists in an isolated Electron profile and reuses the existing FORTISSIMO cloud account flow.');
