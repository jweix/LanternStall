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
    fs.cpSync(path.join(root, 'shared', dir), path.join(out, 'shared', dir), {
      recursive: true, filter: file => !file.endsWith('.example.js')
    });
  }
  const dataOut = path.join(out, 'shared/data');
  fs.mkdirSync(dataOut, { recursive: true });
  for (const name of fs.readdirSync(path.join(root, 'shared/data')).filter(n => n.endsWith('.js'))) {
    const source = path.join(root, 'shared/data', name);
    if (['level-config.js', 'board-templates.js'].includes(name)) {
      const data = JSON.parse(JSON.stringify(require(source), (key, value) =>
        ['greedyTarget', 'lookaheadTarget', 'toolTarget', 'toolGainTarget'].includes(key) ? undefined : value));
      if (name === 'level-config.js') {
        // Reuse identical menus in the package; definitions are copied by Levels.
        const menus = [], indices = new Map();
        for (const row of data.levels.concat(data.repeat)) {
          const key = JSON.stringify(row.orders);
          if (!indices.has(key)) { indices.set(key, menus.length); menus.push(row.orders); }
          row.orders = indices.get(key);
        }
        fs.writeFileSync(path.join(dataOut, name), 'const p=' + JSON.stringify(menus) + ',d=' + JSON.stringify(data) +
          ';for(const r of d.levels.concat(d.repeat))r.orders=p[r.orders];module.exports=d;\n');
      } else fs.writeFileSync(path.join(dataOut, name), 'module.exports=' + JSON.stringify(data) + ';\n');
    }
    else if (['game-ui.js', 'lobby-layout.js', 'lobby-font-metrics.js'].includes(name)) {
      // These exports are plain data; native packages need neither the browser
      // wrapper nor source formatting. Keep their values identical on both ends.
      fs.writeFileSync(path.join(dataOut, name), 'module.exports=' + JSON.stringify(require(source)) + ';\n');
    }
    else fs.copyFileSync(source, path.join(dataOut, name));
  }
  for (const name of ['recipes', 'ingredients', 'layout']) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'shared/data', name + '.json'), 'utf8'));
    fs.writeFileSync(path.join(dataOut, name + '.js'), 'module.exports = ' + JSON.stringify(data) + ';\n');
  }
  fs.cpSync(path.join(platform, 'src'), out, { recursive: true });
  const assets = path.join(root, 'shared/assets/runtime');
  const index = JSON.parse(fs.readFileSync(path.join(assets, 'asset-index.json'), 'utf8'));
  fs.mkdirSync(path.join(out, 'assets/fonts'), { recursive: true });
  fs.cpSync(path.join(root,'shared/assets/audio'),path.join(out,'assets/audio'),{recursive:true,filter:file=>fs.statSync(file).isDirectory()||file.endsWith('.wav')});
  for (const asset of Object.values(index)) {
    fs.copyFileSync(path.join(assets, path.basename(asset.path)), path.join(out, asset.path));
  }
  fs.writeFileSync(path.join(out, 'asset-index.js'), 'module.exports = ' + JSON.stringify(index) + ';\n');
  for (const file of ['LanternBody.ttf', 'OFL-NotoSansSC.txt']) {
    fs.copyFileSync(path.join(root, 'shared/assets/lobby/fonts', file), path.join(out, 'assets/fonts', file));
  }
  if (options.projectConfig) fs.writeFileSync(path.join(out, 'project.config.json'), JSON.stringify(options.projectConfig, null, 2) + '\n');
  function compact(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) compact(file);
      else if(entry.name.endsWith('.js')) {
        const source=fs.readFileSync(file,'utf8');
        // Retain every newline for ASI/debugging. Skip any file that could have
        // significant indentation inside a template or continued string.
        if(!source.includes('`')&&!/\\\r?\n|[\u2028\u2029]/.test(source)) fs.writeFileSync(file,source.replace(/^[\t ]+|[\t ]+$/gm,''));
      }
    }
  }
  compact(out);
  function size(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, item) => n +
      (item.isDirectory() ? size(path.join(dir, item.name)) : fs.statSync(path.join(dir, item.name)).size), 0);
  }
  const bytes = size(out);
  if (bytes >= 4 * 1024 * 1024) throw new Error(label + '超过项目设定的 4 MiB 主包预算。');
  console.log(label + '已生成：platforms/' + name + '/game/ · ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');
  return { out, bytes };
};
