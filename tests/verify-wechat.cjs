'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../platforms/wechat');
const config = require('../platforms/wechat/project.config.json');
assert.equal(config.appid, 'wx09cfd51ad5bcdb2f'); assert.equal(config.compileType, 'game');
assert.equal(config.miniprogramRoot, 'game/');
assert(fs.existsSync(path.join(root, 'game/game.js')), 'Run npm run build:wechat first');
const index = require('../platforms/wechat/game/asset-index.js');
assert.equal(Object.keys(index).length, 38);
assert(!Object.keys(index).some(id => id.endsWith('-collected')), 'WeChat must reuse original ingredient sprites for received icons');
for (const asset of Object.values(index)) assert(fs.existsSync(path.join(root, 'game', asset.path)));
let bytes = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      bytes += fs.statSync(full).size;
      assert(!/preview-assets|approved-assets|\.html$|\.mp4$|\.pdf$/.test(entry.name));
      if (entry.name.endsWith('.js')) assert(!/require\(['"][^'"]+\.json['"]\)/.test(fs.readFileSync(full, 'utf8')),
        'WeChat require must load JavaScript data modules');
    }
  }
}
walk(path.join(root, 'game')); assert(bytes < 4 * 1024 * 1024);
console.log('PASS self-contained WeChat package, AppID, 38 original-colour images, ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');

const { createPlatform } = require('../platforms/wechat/src/platform.js');
const partial = createPlatform({
  getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3,
    safeArea: { top: 47 } }), getMenuButtonBoundingClientRect: () => ({})
}, {});
assert.deepEqual(partial.geometry().insets, { left: 0, right: 0, top: 47, bottom: 0 });
console.log('PASS incomplete simulator safe-area and capsule data never produce NaN');

const gradient = { addColorStop() {} };
let draws = 0;
let labels = [];
let imageDraws = [], checks = [];
const alphaStack = [];
const ctx = new Proxy({ globalAlpha: 1 }, { get: (target, name) => name in target ? target[name] :
  name === 'save' ? () => alphaStack.push(target.globalAlpha) :
  name === 'restore' ? () => { target.globalAlpha = alphaStack.pop(); } :
  name === 'measureText' ? value => ({ width: value.length * 26 }) :
  name === 'fillText' ? value => labels.push(value) :
  name === 'fill' ? () => { if (target.fillStyle === '#78a94c') checks.push(target.globalAlpha); } :
  name === 'drawImage' ? image => { draws++; imageDraws.push({ path: image.path, alpha: target.globalAlpha }); } :
  /create.*Gradient/.test(name) ? () => gradient : () => {} });
const handlers = {}, storage = {};
const canvas = { getContext: () => ctx };
global.wx = {
  createCanvas: () => canvas,
  createImage() {
    const image = {};
    Object.defineProperty(image, 'src', { set(value) {
      assert(fs.existsSync(path.join(root, 'game', value))); image.path = value; image.width = 192; image.height = 192;
      queueMicrotask(() => image.onload());
    } }); return image;
  },
  getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3,
    safeArea: { left: 0, top: 47, right: 390, bottom: 810 } }),
  getMenuButtonBoundingClientRect: () => ({ bottom: 87 }),
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  onHide: fn => { handlers.hide = fn; }, onShow: fn => { handlers.show = fn; },
  onWindowResize: fn => { handlers.resize = fn; }, onTouchStart: fn => { handlers.touch = fn; },
  onMouseDown: fn => { handlers.mouse = fn; }
};
let frame;
global.requestAnimationFrame = fn => { frame = fn; return 1; };
require('../platforms/wechat/game/game.js');
setImmediate(() => {
  assert(frame); frame(0); frame(16); assert(draws >= 8); assert.equal(canvas.width, 1170);
  assert(labels.includes('小摊') && labels.includes('装扮') && labels.includes('菜谱') && labels.includes('夜市'));
  const M = require('../shared/core/motion.js');
  const view = M.viewport(390, 844, { top: 95, bottom: 34 });
  handlers.touch({ touches: [{ clientX: view.x + 464 * view.scale, clientY: view.y + 1340 * view.scale }] });
  frame(20); assert(storage['lantern-stall-v2'].activeAttempt, 'Native home button must start and durably identify a game');
  handlers.touch({ touches: [{ clientX: view.x + 160 * view.scale, clientY: view.y + 53 * view.scale }] });
  labels = []; frame(32); assert(labels.includes('歇一会儿'), 'Native touch must open settings at the drawn coordinates');
  handlers.touch({ touches: [{ x: view.x + 464 * view.scale, y: view.y + 825 * view.scale }] });
  labels = []; frame(48); assert(!labels.includes('歇一会儿'));
  const level = require('../shared/core/levels.js').createLevel(require('../shared/data/recipes.json'), require('../shared/data/layout.json'), 1);
  const carrot = level.tiles.find(n => n.food === 'carrot' && n.layer === 1);
  handlers.touch({ touches: [{ x: view.x + carrot.x * view.scale, y: view.y + carrot.y * view.scale }] });
  frame(148); frame(248); frame(348);
  labels = []; imageDraws = []; checks = []; frame(448);
  assert(labels.includes('1/3'), 'Native ingredient touch must update the collecting menu');
  const carrots = imageDraws.filter(d => d.path === 'assets/carrot.png');
  assert(carrots.length >= 2 && carrots.every(d => d.alpha === 1), 'Menu and board must reuse the opaque original orange carrot');
  assert(checks.length > 0 && checks.every(alpha => alpha === 1), 'Received marker stays an opaque green check');
  console.log('PASS WeChat native touch receives carrot with original sprite/opacity, green check and 1/3 progress');
  handlers.hide(); frame(300000); handlers.show(); frame(600000); handlers.resize();
  for (const [w, h, top, bottom] of [[320, 568, 20, 0], [390, 844, 95, 34]]) {
    const v = M.viewport(w, h, { top, bottom });
    assert(v.x >= -1e-6 && v.y >= top - 1e-6);
    assert(v.x + 928 * v.scale <= w + 1e-6);
    assert(v.y + 1695 * v.scale <= h - bottom + 1e-6);
    const point = M.toDesign(v.x + 150 * v.scale, v.y + 600 * v.scale, v);
    assert(Math.abs(point.x - 150) < 1e-6 && Math.abs(point.y - 600) < 1e-6);
  }
  delete global.wx; delete global.requestAnimationFrame;
  console.log('PASS WeChat entry boots without DOM, draws, handles lifecycle/resize and safe-area transforms');
});
