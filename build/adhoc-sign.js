// Ondertekent de app ad-hoc (zonder Apple-account) zodat hij op Apple Silicon start.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
exports.default = async ctx => {
  if (process.platform !== 'darwin' || ctx.electronPlatformName !== 'darwin') return;
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
