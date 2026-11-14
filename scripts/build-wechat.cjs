'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const platform = path.join(root, 'platforms/wechat');
const out = path.join(platform, 'game');
require('./prepare-assets.cjs')();
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const dir of ['core', 'runtime', 'rendering']) {
  fs.cpSync(path.join(root, 'shared', dir), path.join(out, 'shared', dir), { recursive: true });
}
fs.mkdirSync(path.join(out, 'shared/data'), { recursive: true });
for (const name of fs.readdirSync(path.join(root, 'shared/data')).filter(n => n.endsWith('.js'))) {
  fs.copyFileSync(path.join(root, 'shared/data', name), path.join(out, 'shared/data', name));
}
for (const name of ['recipes.json', 'ingredients.json', 'layout.json']) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'shared/data', name), 'utf8'));
  // Mini Game require loads JS modules, not Node-style JSON modules.
  fs.writeFileSync(path.join(out, 'shared/data', name.replace('.json', '.js')),
    'module.exports = ' + JSON.stringify(data) + ';\n');
}
fs.cpSync(path.join(platform, 'src'), out, { recursive: true });
const bundled = path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
const python = process.env.LANTERN_PYTHON || (fs.existsSync(bundled) ? bundled : 'python3');
const result = spawnSync(python, [path.join(__dirname, 'prepare-wechat-assets.py')], { encoding: 'utf8' });
if (result.status !== 0) throw new Error('资源构建需要 Python 3 + Pillow：\n' + result.stderr);
function size(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, item) => n +
    (item.isDirectory() ? size(path.join(dir, item.name)) : fs.statSync(path.join(dir, item.name)).size), 0);
}
const bytes = size(out);
if (bytes >= 4 * 1024 * 1024) throw new Error('试玩工程超过项目设定的 4 MiB 主包预算。');
console.log('微信小游戏已生成：platforms/wechat/game/ · ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');
