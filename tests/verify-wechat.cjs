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
console.log('PASS self-contained WeChat package, AppID, 38 images, ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');

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
const ctx = new Proxy({}, { get: (_, name) => name === 'measureText' ? value => ({ width: value.length * 26 }) :
  name === 'fillText' ? value => labels.push(value) : name === 'drawImage' ? () => { draws++; } : /create.*Gradient/.test(name) ? () => gradient : () => {} });
const handlers = {}, storage = {};
const canvas = { getContext: () => ctx };
global.wx = {
  createCanvas: () => canvas,
  createImage() {
    const image = {};
    Object.defineProperty(image, 'src', { set(value) {
      assert(fs.existsSync(path.join(root, 'game', value))); image.width = 192; image.height = 192;
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
  assert(frame); frame(0); frame(16); assert(draws > 40); assert.equal(canvas.width, 1170);
  const M = require('../shared/core/motion.js');
  const view = M.viewport(390, 844, { top: 95, bottom: 34 });
  handlers.touch({ touches: [{ clientX: view.x + 160 * view.scale, clientY: view.y + 53 * view.scale }] });
  labels = []; frame(32); assert(labels.includes('歇一会儿'), 'Native touch must open settings at the drawn coordinates');
  handlers.touch({ touches: [{ x: view.x + 464 * view.scale, y: view.y + 825 * view.scale }] });
  labels = []; frame(48); assert(!labels.includes('歇一会儿'));
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
