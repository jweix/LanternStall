'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Both native platforms ship the same code, image manifest and font bytes.
module.exports = function buildMiniGame(name, label, options = {}) {
  const platform = path.join(root, 'platforms', name);
  const out = path.join(platform, 'game');
  if (options.prepare !== false) require('./prepare-assets.cjs')();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const dir of ['core', 'runtime', 'rendering']) {
    fs.cpSync(path.join(root, 'shared', dir), path.join(out, 'shared', dir), { recursive: true });
  }
  const dataOut = path.join(out, 'shared/data');
  fs.mkdirSync(dataOut, { recursive: true });
  for (const name of fs.readdirSync(path.join(root, 'shared/data')).filter(n => n.endsWith('.js'))) {
    fs.copyFileSync(path.join(root, 'shared/data', name), path.join(dataOut, name));
  }
  for (const name of ['recipes', 'ingredients', 'layout']) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'shared/data', name + '.json'), 'utf8'));
    fs.writeFileSync(path.join(dataOut, name + '.js'), 'module.exports = ' + JSON.stringify(data) + ';\n');
  }
  fs.cpSync(path.join(platform, 'src'), out, { recursive: true });
  const assets = path.join(root, 'shared/assets/runtime');
  const index = JSON.parse(fs.readFileSync(path.join(assets, 'asset-index.json'), 'utf8'));
  fs.mkdirSync(path.join(out, 'assets/fonts'), { recursive: true });
  for (const asset of Object.values(index)) {
    fs.copyFileSync(path.join(assets, path.basename(asset.path)), path.join(out, asset.path));
  }
  fs.writeFileSync(path.join(out, 'asset-index.js'), 'module.exports = ' + JSON.stringify(index) + ';\n');
  for (const file of ['LanternBody.ttf', 'OFL-NotoSansSC.txt']) {
    fs.copyFileSync(path.join(root, 'shared/assets/lobby/fonts', file), path.join(out, 'assets/fonts', file));
  }
  if (options.projectConfig) fs.writeFileSync(path.join(out, 'project.config.json'), JSON.stringify(options.projectConfig, null, 2) + '\n');
  function size(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, item) => n +
      (item.isDirectory() ? size(path.join(dir, item.name)) : fs.statSync(path.join(dir, item.name)).size), 0);
  }
  const bytes = size(out);
  if (bytes >= 4 * 1024 * 1024) throw new Error(label + '超过项目设定的 4 MiB 主包预算。');
  console.log(label + '已生成：platforms/' + name + '/game/ · ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');
  return { out, bytes };
};
