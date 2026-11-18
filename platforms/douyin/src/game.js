'use strict';
const { createRewardedRescue } = require('./rewarded-video.js');
const adConfig = require('./ad-config.js');
const rewardedRescue = createRewardedRescue(tt, adConfig.rewardedRescueUnitId);
const { createPlatform, createSidebar } = require('./platform.js');
const sidebar = createSidebar(tt);
let hidden = false, app = null, lifecycleReady = false;
try { if (tt.getLaunchOptionsSync) sidebar.onShow(tt.getLaunchOptionsSync()); } catch (_) { /* onShow remains authoritative. */ }
// Register before loading shared modules/assets, so cold and warm starts are seen.
tt.onShow(options => {
  hidden = false;
  sidebar.onShow(options);
  if (lifecycleReady) { cancel(); resize(); }
  if (app) app.setHidden(false);
});
tt.onHide(() => { hidden = true; if (lifecycleReady) cancel(); if (app) app.setHidden(true); });

const { App } = require('./shared/runtime/stall-app.js');
const { createRenderer } = require('./shared/rendering/stall-scene.js');
const Motion = require('./shared/core/motion.js');
const recipes = require('./shared/data/recipes.js');
const ingredients = require('./shared/data/ingredients.js');
const layout = require('./shared/data/layout.js');
const index = require('./asset-index.js');

const canvas = tt.createCanvas();
const platform = createPlatform(tt, canvas);
let geometry = platform.resize(), renderer, loadingAssets = false, loadFailed = false;
let lastStatus = '正在准备夜市食材…';
function loading() {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
  ctx.fillStyle = '#183b3b'; ctx.fillRect(0, 0, geometry.width, geometry.height);
  ctx.fillStyle = '#ffedc5'; ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif'; ctx.fillText('灯火大排档', geometry.width / 2, geometry.height / 2 - 30);
  ctx.font = '14px sans-serif'; ctx.fillText(lastStatus, geometry.width / 2, geometry.height / 2 + 12);
}
function resize() {
  cancel();
  geometry = platform.resize();
  if (!renderer) loading();
}
if (tt.onWindowResize) tt.onWindowResize(resize);
function point(t) {
  if (!app || !renderer || !t) return null;
  const x = t.clientX === undefined ? t.x : t.clientX, y = t.clientY === undefined ? t.y : t.clientY;
  return Number.isFinite(x) && Number.isFinite(y) ? Motion.toDesign(x, y, renderer.coordinates(geometry, app.screen)) : null;
}
let lastTouchAt = -Infinity, activePointer = null, lastPoint = null;
function down(t, gestures) {
  if (hidden || activePointer !== null) return;
  if (loadFailed) { start(); return; }
  const p = point(t); if (!p) return;
  activePointer = t.identifier === undefined ? 'primary' : t.identifier; lastPoint = p;
  if (gestures) app.pointerStart(p);
  else { app.pointer(p); activePointer = null; lastPoint = null; }
}
function owns(t) { return t && (t.identifier === undefined ? 'primary' : t.identifier) === activePointer; }
function move(t) {
  const p = point(t); if (!hidden && activePointer !== null && owns(t) && p) { lastPoint = p; app.pointerMove(p); }
}
function end(t) {
  if (activePointer === null || t && !owns(t)) return;
  const p = point(t) || lastPoint;
  if (app && p && !hidden) app.pointerEnd(p);
  activePointer = null; lastPoint = null;
}
function cancel() { activePointer = null; lastPoint = null; if (app) app.pointerCancel(); }
tt.onTouchStart(e => { lastTouchAt = Date.now(); const t = e.changedTouches && e.changedTouches[0] || e.touches && e.touches[0]; if (t) down(t, !!tt.onTouchEnd); });
if (tt.onTouchMove) tt.onTouchMove(e => { const t = (e.touches || []).find(owns); if (t) move(t); });
if (tt.onTouchEnd) tt.onTouchEnd(e => { const touches = e.changedTouches || []; const t = touches.find(owns); if (t || !touches.length) end(t); });
if (tt.onTouchCancel) tt.onTouchCancel(cancel);
if (tt.onMouseDown) tt.onMouseDown(e => { if (Date.now() - lastTouchAt >= 500 && (e.button === undefined || e.button === 0)) down(e, !!tt.onMouseUp); });
if (tt.onMouseMove) tt.onMouseMove(move);
if (tt.onMouseUp) tt.onMouseUp(end);

function start() {
  if (loadingAssets) return;
  loadingAssets = true; loadFailed = false; lastStatus = '正在准备夜市食材…'; loading();
  platform.loadImages(index).then(images => {
    renderer = createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout, assets: index, ...platform.loadLobbyFonts() });
    app = new App({ recipes, layout, rewardedRescue, data: platform.read('lantern-stall-v2', null),
      legacy: platform.read('lantern-progress-v1', { level: 1 }), settings: platform.read('lantern-settings-v1', {}),
      save: value => platform.write('lantern-stall-v2', value), sidebar });
    app.setHidden(hidden); sidebar.check();
    function frame(ms) {
      // onWindowResize is not present on every host; also observe size on resume.
      if (!hidden) app.hits = renderer.draw(app.frame(ms), geometry);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }).catch(error => {
    console.error(error); loadFailed = true; app = null; renderer = null;
    lastStatus = '食材加载失败，轻触屏幕重试'; loading();
  }).finally(() => { loadingAssets = false; });
}
lifecycleReady = true;
start();
