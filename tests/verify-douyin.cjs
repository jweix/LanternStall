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
for (const name of ['game-ui', 'lobby-layout', 'lobby-font-metrics']) assert.deepEqual(
  require(path.join(root, 'shared/data', name + '.js')), require('../shared/data/' + name + '.js'), 'Native UI data differs: ' + name);
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
// Native Canvas throws a getter-only DOMException for negative arcTo radii.
// A permissive no-op or raster mock would miss the original 44×5 underline bug.
const strictArc = (...args) => { if (args[4] < 0) throw new DOMException('Negative arcTo radius: ' + args[4], 'IndexSizeError'); };
const tinyContext = new Proxy({}, { get: (o,k) => k in o ? o[k] : k === 'arcTo' ? strictArc :
  k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
const panel = require('../shared/rendering/approved-ui.js').create(tinyContext, {}, {}).panel;
for (const [w,h,r] of [[44,5,2],[2,2,1],[100,20,1],[100,20,0],[0,0,0]])
  assert.doesNotThrow(() => panel(0,0,w,h,r), 'Thin and tiny panels must not issue invalid Canvas geometry');
assert.deepEqual(createPlatform({ getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, safeArea: { top: 47 } }),
  getMenuButtonLayout: () => ({}) }, {}).geometry().insets, { left: 0, right: 0, top: 47, bottom: 0 });
assert.equal(createPlatform({ getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, statusBarHeight: 24 }),
  getMenuButtonLayout: () => { throw Error('unsupported'); } }, {}).geometry().insets.top, 24);
const absent = createSidebar({}); absent.check(); assert.deepEqual(absent.state(), { available: false, returned: false, enteredAt: null });
const incomplete = createSidebar({ checkScene: o => o.success({}), navigateToScene() {} });
incomplete.check(); assert.equal(incomplete.state().available, false);
for (const checkScene of [o => o.fail({}), o => o.success(null), () => { throw Error('unsupported'); }]) {
  const failed = createSidebar({ checkScene, navigateToScene() {} });
  failed.check(); assert.equal(failed.state().available, false);
}
const stores = new Map([['zero', 0], ['false', false]]);
const storagePlatform = createPlatform({ getStorageSync: k => stores.get(k), setStorageSync: () => { throw Error('full'); } }, {});
assert.equal(storagePlatform.read('zero', 123), 0); assert.equal(storagePlatform.read('false', true), false);
assert.equal(storagePlatform.read('missing', 123), 123);
assert.throws(() => createPlatform({ loadFont: () => null }, {}).loadLobbyFonts(), /字体加载失败/);

const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(options = {}) {
  const handlers = {}, storage = {}, labels = [], errors = [], warnings = [], draws = [];
  if (options.data) storage['lantern-stall-v2'] = JSON.parse(JSON.stringify(options.data));
  let app, frame, failImage = options.failImage, failWrite = !!options.failWrite, navigateOK = true,
    wallClock = options.now || Date.parse('2026-11-18T10:00:00+08:00');
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] :
    k === 'measureText' ? s => ({ width: String(s).length * 23 }) :
    k === 'arcTo' ? strictArc :
    k === 'fillText' ? s => labels.push(String(s)) : k === 'drawImage' ? im => draws.push(im.path) :
    /create.*Gradient/.test(k) ? () => gradient : () => {} });
  const canvas = { getContext: () => ctx };
  let info = { windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeArea: { left: 0, top: 47, right: 390, bottom: 810 } };
  const api = {
    getLaunchOptionsSync: () => options.launch || {},
    createCanvas: () => canvas,
    getSystemInfoSync: () => info, getMenuButtonLayout: () => ({ top: 55, height: 32 }),
    loadFont: file => { assert(fs.existsSync(path.join(root, file))); return 'douyin-LanternBody'; },
    createImage() {
      assert(handlers.show, 'onShow must be registered synchronously before loading images');
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
    checkScene: o => { if (options.deferCheck) handlers.sceneCheck = o; else o.success({ isExist: options.sidebarSupport !== false }); },
    navigateToScene: o => { assert.equal(o.scene, 'sidebar'); handlers.navigations = (handlers.navigations || 0) + 1; (navigateOK ? o.success : o.fail)({}); }
  };
  if (options.noSidebarAPI) { delete api.checkScene; delete api.navigateToScene; }
  const nativeRequire = createRequire(path.join(root, 'game.js'));
  const realApp = nativeRequire('./shared/runtime/stall-app.js').App;
  const context = { tt: api, Date: class extends Date { static now() { return wallClock; } }, requestAnimationFrame: fn => { frame = fn; return 1; },
    console: { error: e => errors.push(e), warn: e => warnings.push(e) },
    require: name => name === './shared/runtime/stall-app.js' ? { App: class extends realApp { constructor(o) { super(o); app = this; } } } : nativeRequire(name) };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'game.js'), 'utf8'), context, { filename: 'douyin/game.js' });
  let ms = 0;
  const render = (time = ++ms) => {
    assert(frame); labels.length = 0; frame(time);
    for (const label of labels) for (const char of label) if (/[\u3400-\u9fff]/.test(char))
      assert(require('../shared/assets/lobby/fonts/coverage.json').body.includes(char), 'Missing font glyph ' + char);
    return labels;
  };
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
  h.handlers.show({}); h.handlers.hide();
  await tick(); assert(h.app); assert(h.app.hidden, 'Hide during asset load must persist');
  h.render(0); assert(!h.draws.length, 'Hidden startup must not render the lobby');
  h.handlers.show({}); h.render(0);
  assert.equal(h.canvas.width, 1170); assert(h.draws.includes('assets/lobby-scene-counter.png'));
  assert(!h.app.view().sidebar.returned);
  h.tap('settings'); h.tap('sidebar-reward');
  h.tap('sidebar'); await tick(); assert.equal(h.handlers.navigations, 1);
  assert.equal(h.app.modal, null, 'Close the guide before navigating');
  assert.equal(h.app.profile.state.coins, 0, 'Navigation success is not evidence of a sidebar return');
  h.handlers.hide(); h.handlers.show({ launch_from: 'other', location: 'other' }); h.render();
  assert(!h.app.view().sidebar.returned, 'Warm entry must replace cold-start sidebar state');
  h.setNavigateOK(false); h.tap('sidebar-reward'); h.tap('sidebar'); await tick(); h.render(); assert(h.labels.includes('暂时无法打开，请重试'));
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

  const sidebarVisit = { launch_from: 'homepage', location: 'sidebar_card', scene: '021036' };
  const cold = harness({ launch: sidebarVisit }); await tick(); cold.render();
  assert.equal(cold.app.profile.state.coins, 200); assert.equal(cold.storage['lantern-stall-v2'].sidebarRewardDay, '2026-11-18');
  assert.equal(cold.app.modal.type, 'sidebar', 'A newly credited cold visit opens the illustrated reward confirmation');
  assert(cold.labels.includes('复访奖励到账')); assert(cold.labels.includes('首页示意')); assert(cold.labels.includes('侧边栏示意'));
  assert(cold.draws.includes('assets/lobby-nav-home.png'), 'The guide illustrates this game with its own storefront icon');
  const accept = cold.app.hits.find(h => h.label === '开心收下'); assert(accept);
  cold.touch(accept.rect[0] + accept.rect[2] / 2, accept.rect[1] + accept.rect[3] / 2); cold.render();
  assert.equal(cold.app.modal, null); assert.equal(cold.app.profile.state.coins, 200, 'Acknowledging the reward does not issue another grant');
  assert(cold.app.hits.some(h => h.action === 'sidebar-reward'), 'Reward entry is visible directly on the homepage');
  cold.handlers.show(sidebarVisit); cold.render(); assert.equal(cold.app.modal, null, 'Duplicate visits do not reopen the reward celebration');
  cold.tap('sidebar-reward'); assert(cold.labels.includes('复访奖励到账')); assert(!cold.app.hits.some(h => h.action === 'sidebar'));
  cold.handlers.show(sidebarVisit); cold.render(); assert.equal(cold.app.profile.state.coins, 200);
  assert.equal(cold.app.profile.state.ledger.filter(l => l.label === '侧边栏每日复访').length, 1);
  const coldReload = harness({ launch: sidebarVisit, data: cold.storage['lantern-stall-v2'] }); await tick(); coldReload.render();
  assert.equal(coldReload.app.profile.state.coins, 200, 'Reload cannot repeat the reward');
  assert.equal(coldReload.app.modal, null, 'An already-credited day does not automatically reopen on reload');
  const replaced = harness({ launch: sidebarVisit }); replaced.handlers.show({}); await tick(); replaced.render();
  assert.equal(replaced.app.profile.state.coins, 0, 'Latest warm entry replaces cold launch data during asset loading');
  replaced.handlers.show(sidebarVisit); replaced.render(); assert.equal(replaced.app.profile.state.coins, 200);
  const early = harness(); early.handlers.show(sidebarVisit); await tick(); early.render();
  assert.equal(early.app.profile.state.coins, 200, 'A sidebar show event received while images load must survive startup');
  const deferred = harness({ launch: sidebarVisit, deferCheck: true }); await tick(); deferred.render();
  assert.equal(deferred.app.profile.state.coins, 0); assert(!deferred.app.hits.some(h => h.action === 'sidebar-reward'));
  deferred.handlers.sceneCheck.success({ isExist: true }); await tick(); deferred.render();
  assert.equal(deferred.app.profile.state.coins, 200, 'Async capability check finishes the cold-start reward');
  for (const opts of [{ sidebarSupport: false }, { noSidebarAPI: true }]) {
    const unsupported = harness({ ...opts, launch: sidebarVisit }); await tick(); unsupported.render();
    assert(!unsupported.app.hits.some(h => h.action === 'sidebar-reward')); assert.equal(unsupported.app.profile.state.coins, 0);
  }
  for (const invalid of [{ scene: '021036' }, { launch_from: 'homepage' }, { location: 'sidebar_card' }, {}]) {
    const other = harness({ launch: invalid }); await tick(); other.render(); assert.equal(other.app.profile.state.coins, 0);
  }
  const failedReward = harness({ launch: sidebarVisit, failWrite: true });
  const oldWarn = console.warn; console.warn = () => {};
  try { await tick(); } finally { console.warn = oldWarn; }
  failedReward.render(); assert.equal(failedReward.app.profile.state.coins, 0); assert(!failedReward.storage['lantern-stall-v2']);
  failedReward.tap('sidebar-reward'); assert(failedReward.app.hits.some(h => h.action === 'sidebar-retry'));
  failedReward.setFailWrite(false); failedReward.tap('sidebar-retry');
  assert.equal(failedReward.app.profile.state.coins, 200); assert.equal(failedReward.app.profile.state.ledger.length, 1);
  cold.tap('close'); cold.elapse(86400000); cold.render();
  assert.equal(cold.app.profile.state.coins, 200, 'A new calendar day in the foreground does not itself prove a new visit');
  cold.handlers.show({}); cold.render(); assert.equal(cold.app.profile.state.coins, 200);
  cold.handlers.show({ ...sidebarVisit, scene: '181036' }); cold.render();
  assert.equal(cold.app.profile.state.coins, 400, 'Do not restrict eligibility to a specific host scene number');
  cold.elapse(-86400000); cold.handlers.show(sidebarVisit); cold.render(); assert.equal(cold.app.profile.state.coins, 400);
  cold.elapse(86400000); cold.tap('close'); cold.tap('play'); const activeAttempt = cold.app.profile.state.activeAttempt;
  cold.elapse(86400000); cold.handlers.hide(); cold.handlers.show(sidebarVisit); cold.render();
  assert.equal(cold.app.profile.state.coins, 600); assert.deepEqual(cold.app.profile.state.activeAttempt, activeAttempt);
  assert.equal(cold.app.screen, 'game', 'A sidebar return during a level never replaces the current game');
  assert.equal(cold.app.modal, null, 'Gameplay is not covered by an automatic reward dialog');
  cold.elapse(86400000);
  cold.app.home(true); cold.render(); assert.equal(cold.app.modal.type, 'sidebar', 'A gameplay reward is presented on returning home');
  assert(cold.labels.includes('复访奖励到账')); assert.equal(cold.app.modal.receipt.credited, 200);
  assert(!cold.app.view().sidebar.rewarded, 'An older receipt is still presented after midnight without granting the new day');
  cold.tap('close'); cold.render(); assert.equal(cold.app.modal, null); assert.equal(cold.app.profile.state.coins, 600);
  console.log('PASS sidebar homepage guide, cold/warm attribution, async capability, automatic daily reward, save retry and durable deduplication');

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
