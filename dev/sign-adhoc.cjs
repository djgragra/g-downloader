// garage-common: sign-adhoc 1
// electron-builder `afterPack` hook: signs the packaged macOS app ad hoc (no certificate, no Apple account).
// Without it the app keeps the linker's signature, which the build's own changes (Info.plist, resources) invalidate:
// an Apple Silicon Mac then says the app is "damaged". Does nothing on Windows and Linux.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

function signAdHoc(appPath, run = execFileSync) {
  run('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' });
}

module.exports = async function afterPack(context, run = execFileSync) {
  if (context.electronPlatformName !== 'darwin') return false;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  signAdHoc(appPath, run);
  return true;
};
module.exports.signAdHoc = signAdHoc;
