'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../platforms/douyin/game');
assert(fs.existsSync(path.join(root, 'game.js')), 'Run npm run build:douyin first');
const config = require(path.join(root, 'project.config.json'));
assert(config.appid === '' || /^tt[a-zA-Z0-9]+$/.test(config.appid));
assert.equal(require(path.join(root, 'game.json')).deviceOrientation, 'portrait');
const index = require(path.join(root, 'asset-index.js'));
assert.deepEqual(index, require('../shared/assets/runtime/asset-index.json'));
let bytes = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      bytes += fs.statSync(full).size;
      assert(!/preview-assets|approved-assets|\.html$|\.mp4$|\.pdf$/.test(entry.name));
      if (entry.name.endsWith('.js')) assert(!/require\(['"][^'"]+\.json['"]\)/.test(fs.readFileSync(full, 'utf8')));
    }
  }
}
walk(root); assert(bytes < 4 * 1024 * 1024);
for (const asset of Object.values(index)) {
  assert(/^[\x20-\x7e]+$/.test(asset.path));
  assert(fs.readFileSync(path.join(root, asset.path)).equals(
    fs.readFileSync(path.resolve(__dirname, '../shared/assets/runtime', path.basename(asset.path)))), 'Image bytes differ: ' + asset.path);
}
for (const name of ['LanternBody.ttf', 'OFL-NotoSansSC.txt']) assert.deepEqual(
  fs.readFileSync(path.join(root, 'assets/fonts', name)), fs.readFileSync(path.resolve(__dirname, '../shared/assets/lobby/fonts', name)));
console.log('PASS self-contained Douyin package, shared image/font bytes, ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');

const { createPlatform, createSidebar } = require('../platforms/douyin/src/platform.js');
assert.deepEqual(createPlatform({ getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, safeArea: { top: 47 } }),
  getMenuButtonLayout: () => ({}) }, {}).geometry().insets, { left: 0, right: 0, top: 47, bottom: 0 });
assert.equal(createPlatform({ getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, statusBarHeight: 24 }),
  getMenuButtonLayout: () => { throw Error('unsupported'); } }, {}).geometry().insets.top, 24);
const absent = createSidebar({}); absent.check(); assert.deepEqual(absent.state(), { available: false, returned: false });
const incomplete = createSidebar({ checkScene: o => o.success({}), navigateToScene() {} });
incomplete.check(); assert.equal(incomplete.state().available, false);
const stores = new Map([['zero', 0], ['false', false]]);
const storagePlatform = createPlatform({ getStorageSync: k => stores.get(k), setStorageSync: () => { throw Error('full'); } }, {});
assert.equal(storagePlatform.read('zero', 123), 0); assert.equal(storagePlatform.read('false', true), false);
assert.equal(storagePlatform.read('missing', 123), 123);
assert.throws(() => createPlatform({ loadFont: () => null }, {}).loadLobbyFonts(), /字体加载失败/);

const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(options = {}) {
  const handlers = {}, storage = {}, labels = [], errors = [], warnings = [], draws = [];
  if (options.data) storage['lantern-stall-v2'] = JSON.parse(JSON.stringify(options.data));
  let app, frame, failImage = options.failImage, failWrite = false, navigateOK = true, wallClock = Date.now();
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] :
    k === 'measureText' ? s => ({ width: String(s).length * 23 }) :
    k === 'fillText' ? s => labels.push(String(s)) : k === 'drawImage' ? im => draws.push(im.path) :
    /create.*Gradient/.test(k) ? () => gradient : () => {} });
  const canvas = { getContext: () => ctx };
  let info = { windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeArea: { left: 0, top: 47, right: 390, bottom: 810 } };
  const api = {
    getLaunchOptionsSync: () => ({ launch_from: 'homepage', location: 'sidebar_card' }),
    createCanvas: () => canvas,
    getSystemInfoSync: () => info, getMenuButtonLayout: () => ({ top: 55, height: 32 }),
    loadFont: file => { assert(fs.existsSync(path.join(root, file))); return 'douyin-LanternBody'; },
    createImage() {
      const listeners = {}, image = { addEventListener: (name, fn) => { listeners[name] = fn; } };
      Object.defineProperty(image, 'src', { set(src) {
        assert(fs.existsSync(path.join(root, src))); image.path = src; image.width = 192; image.height = 192;
        const fail = failImage; failImage = false;
        queueMicrotask(() => listeners[fail ? 'error' : 'load']());
      } }); return image;
    },
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { if (failWrite) throw Error('full'); storage[key] = JSON.parse(JSON.stringify(value)); },
    onShow: fn => { assert(!handlers.show); handlers.show = fn; }, onHide: fn => { handlers.hide = fn; },
    onWindowResize: fn => { handlers.resize = fn; },
    onTouchStart: fn => { handlers.down = fn; }, onTouchMove: fn => { handlers.move = fn; },
    onTouchEnd: fn => { handlers.end = fn; }, onTouchCancel: fn => { handlers.cancel = fn; },
    onMouseDown: fn => { handlers.mouseDown = fn; }, onMouseMove: fn => { handlers.mouseMove = fn; }, onMouseUp: fn => { handlers.mouseUp = fn; },
    checkScene: o => o.success({ isExist: true }),
    navigateToScene: o => { assert.equal(o.scene, 'sidebar'); handlers.navigations = (handlers.navigations || 0) + 1; (navigateOK ? o.success : o.fail)({}); }
  };
  const nativeRequire = createRequire(path.join(root, 'game.js'));
  const realApp = nativeRequire('./shared/runtime/stall-app.js').App;
  const context = { tt: api, Date: class extends Date { static now() { return wallClock; } }, requestAnimationFrame: fn => { frame = fn; return 1; },
    console: { error: e => errors.push(e), warn: e => warnings.push(e) },
    require: name => name === './shared/runtime/stall-app.js' ? { App: class extends realApp { constructor(o) { super(o); app = this; } } } : nativeRequire(name) };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'game.js'), 'utf8'), context, { filename: 'douyin/game.js' });
  let ms = 0;
  const render = (time = ++ms) => { assert(frame); labels.length = 0; frame(time); return labels; };
  const M = require('../shared/core/motion.js'), Lobby = require('../shared/rendering/lobby-ui.js');
  const p = (x, y, identifier = 1) => {
    const g = createPlatform(api, canvas).geometry();
    const vp = app.screen === 'game' ? M.viewport(g.width, g.height, g.insets) : Lobby.viewport(g.width, g.height, g.lobbyInsets);
    return { identifier, clientX: vp.x + x * vp.scale, clientY: vp.y + y * vp.scale };
  };
  function touch(x, y) { const t = p(x, y); handlers.down({ touches: [t], changedTouches: [t] }); handlers.end({ changedTouches: [t] }); }
  function tap(action, value) {
    render(); const h = app.hits.find(h => h.action === action && (value === undefined || h.value === value));
    assert(h, 'Missing Douyin hit ' + action); touch(h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2); render();
  }
  return { handlers, storage, canvas, labels, errors, warnings, draws, render, p, touch, tap,
    get app() { return app; }, setFailWrite: value => { failWrite = value; }, setNavigateOK: value => { navigateOK = value; },
    elapse: ms => { wallClock += ms; },
    setInfo: value => { info = value; } };
}

(async () => {
  const h = harness();
  h.handlers.show({ launch_from: 'homepage', location: 'sidebar_card' }); h.handlers.hide();
  await tick(); assert(h.app); assert(h.app.hidden, 'Hide during asset load must persist');
  h.render(0); assert(!h.draws.length, 'Hidden startup must not render the lobby');
  h.handlers.show({ launch_from: 'homepage', location: 'sidebar_card' }); h.render(0);
  assert.equal(h.canvas.width, 1170); assert(h.draws.includes('assets/lobby-scene-counter.png'));
  assert(h.app.view().sidebar.returned);
  h.tap('settings'); assert(h.labels.includes('已从侧边栏返回'));
  for (const label of h.labels) for (const char of label) if (/[\u3400-\u9fff]/.test(char))
    assert(require('../shared/assets/lobby/fonts/coverage.json').body.includes(char), 'Missing font glyph ' + char);
  h.tap('sidebar'); await tick(); assert.equal(h.handlers.navigations, 1);
  h.handlers.hide(); h.handlers.show({ launch_from: 'other', location: 'other' }); h.render();
  assert(!h.app.view().sidebar.returned, 'Warm entry must replace cold-start sidebar state');
  h.setNavigateOK(false); h.tap('sidebar'); await tick(); h.render(); assert(h.labels.includes('暂时无法打开，请重试'));
  h.tap('close');
  h.setFailWrite(true);
  const warn = console.warn;
  try { console.warn = () => {}; h.tap('play'); } finally { console.warn = warn; }
  assert.equal(h.app.screen, 'home'); assert(!h.storage['lantern-stall-v2']);
  h.setFailWrite(false); h.tap('play'); assert.equal(h.app.screen, 'game'); assert(h.storage['lantern-stall-v2'].activeAttempt);
  const session = h.app.session;
  h.render(100); h.render(200);
  const playingTime = session.engine.now;
  h.handlers.hide(); h.render(300000); h.handlers.show({}); h.render(600000);
  assert.equal(session.engine.now, playingTime, 'Background time is excluded while playing');
  // Complete the real engine's witness through native touch coordinates.
  const witness = session.config.solution;
  assert(Array.isArray(witness) && witness.length === session.config.tiles.length);
  let ms = 601000;
  for (const step of witness) {
    const id = typeof step === 'string' ? step : step.id;
    const tile = session.engine.nodes.find(n => n.id === id);
    assert(tile && session.engine.available(id));
    h.touch(tile.x, tile.y);
    for (let n = 0; n < 9; n++) h.render(ms += 100);
  }
  for (let n = 0; n < 200 && session.engine.status === 'playing'; n++) h.render(ms += 100);
  assert.equal(session.engine.status, 'won'); assert.equal(h.storage['lantern-stall-v2'].coins, 355);
  const saved = JSON.stringify(h.storage);
  for (let n = 0; n < 20; n++) h.render(ms += 100);
  assert.equal(JSON.stringify(h.storage), saved, 'Delivery settlement must only persist once');
  h.handlers.hide(); const time = session.engine.now; h.render(ms += 300000);
  h.handlers.show({}); h.render(ms += 300000); assert.equal(session.engine.now, time, 'Background time is excluded');
  h.setInfo({ windowWidth: 320, windowHeight: 568, pixelRatio: 2, safeArea: { top: 20 } });
  h.handlers.resize(); h.render(); assert.equal(h.canvas.width, 640);
  assert.equal(h.errors.length, 0);
  console.log('PASS Douyin native touch completes level one, saves 355 once, handles safe area, lifecycle, sidebar and storage failure');
  const restored = harness({ data: h.storage['lantern-stall-v2'] }); await tick(); restored.render();
  assert.equal(restored.app.profile.state.coins, 355); assert.equal(restored.app.profile.nextLevel, 2);
  assert.equal(restored.app.screen, 'home'); assert.equal(restored.app.session, null);

  const wardrobe = harness({ data: { version: 2, dishes: Object.fromEntries(require('../shared/data/recipes.json').map(r => [r.id, 1])) } });
  await tick(); wardrobe.render(); wardrobe.tap('tab', 'decor'); wardrobe.tap('sub', 'rares'); wardrobe.tap('rare-mode', 'owned');
  const region = wardrobe.app.hits.find(h => h.action === 'scroll-region'); assert(region.value.max > 0);
  const beforeDrag = JSON.stringify(wardrobe.storage), x = region.rect[0] + 80, y = region.rect[1] + 180;
  const primary = wardrobe.p(x, y, 7), secondary = wardrobe.p(x + 40, y + 20, 9), moved = wardrobe.p(x, y - 140, 7);
  wardrobe.handlers.down({ touches: [primary], changedTouches: [primary] });
  wardrobe.handlers.down({ touches: [primary, secondary], changedTouches: [secondary] });
  wardrobe.handlers.end({ changedTouches: [secondary] }); assert(wardrobe.app.gesture, 'Another finger must not end the active drag');
  wardrobe.handlers.move({ touches: [moved] }); wardrobe.handlers.end({ changedTouches: [moved] }); wardrobe.render();
  assert(wardrobe.app.decorScroll > 0); assert.equal(JSON.stringify(wardrobe.storage), beforeDrag);
  wardrobe.handlers.down({ touches: [primary] }); wardrobe.handlers.cancel(); assert.equal(wardrobe.app.gesture, null);
  console.log('PASS Douyin touch identifiers preserve native list dragging without spending or equipping; reloaded progress is durable');

  const retry = harness({ failImage: true }); await tick(); assert(!retry.app); assert.equal(retry.errors.length, 1);
  const t = { clientX: 100, clientY: 100 };
  retry.handlers.down({ touches: [t] }); retry.handlers.down({ touches: [t] });
  await tick(); retry.render(); assert(retry.app, 'Failed asset loading can be retried without parallel startup');
  // Real native mouse support works when no synthetic touch preceded it.
  const homeHit = retry.app.hits.find(h => h.action === 'settings'), m = retry.p(homeHit.rect[0] + 10, homeHit.rect[1] + 10);
  delete m.identifier; retry.elapse(600); retry.handlers.mouseDown({ ...m, button: 0 }); retry.handlers.mouseUp(m); retry.render();
  assert.equal(retry.app.modal.type, 'settings');
  console.log('PASS Douyin DOM-free entry retries resource failure and supports simulator mouse input');
})().catch(error => { console.error(error); process.exitCode = 1; });
