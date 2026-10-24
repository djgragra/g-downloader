import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const afterPack = require('./sign-adhoc.cjs');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const ctx = (platform) => ({ electronPlatformName: platform, appOutDir: '/out/mac-arm64', packager: { appInfo: { productFilename: 'G-Downloader' } } });

test('the macOS app is signed ad hoc and then verified, in that order', async () => {
  const calls = [];
  const done = await afterPack(ctx('darwin'), (cmd, args) => calls.push([cmd, ...args]));
  assert.equal(done, true);
  assert.deepEqual(calls[0], ['codesign', '--force', '--deep', '--sign', '-', '/out/mac-arm64/G-Downloader.app']);
  assert.deepEqual(calls[1].slice(0, 4), ['codesign', '--verify', '--deep', '--strict']);
  assert.equal(calls[1].at(-1), '/out/mac-arm64/G-Downloader.app');
});

test('a failed signature stops the build; Windows and Linux are left alone', async () => {
  await assert.rejects(() => afterPack(ctx('darwin'), () => { throw new Error('codesign failed'); }), /codesign failed/);
  for (const p of ['win32', 'linux']) {
    let called = false;
    assert.equal(await afterPack(ctx(p), () => { called = true; }), false);
    assert.equal(called, false);
  }
});

test('the hook is wired in package.json and the workflow verifies the disk images', () => {
  assert.equal(pkg.build.afterPack, 'dev/sign-adhoc.cjs');
  assert.ok(fs.existsSync(new URL('../dev/sign-adhoc.cjs', import.meta.url)));
  const wf = fs.readFileSync(new URL('../.github/workflows/build-installers.yml', import.meta.url), 'utf8');
  assert.match(wf, /CSC_IDENTITY_AUTO_DISCOVERY: "false"/);
  assert.match(wf, /Check the signature of the apps inside the macOS disk images/);
  assert.match(wf, /codesign --verify --deep --strict/);
  assert.match(wf, /hdiutil detach "\$MNT" -force/);
});
