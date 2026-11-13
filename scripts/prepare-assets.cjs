'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = function prepareAssets() {
  const bundled = path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
  const python = process.env.LANTERN_PYTHON || (fs.existsSync(bundled) ? bundled : 'python3');
  const result = spawnSync(python, [path.join(__dirname, 'prepare-runtime-assets.py')], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('资源构建需要 Python 3 + Pillow：\n' + result.stderr);
  process.stdout.write(result.stdout);
};
if (require.main === module) module.exports();
