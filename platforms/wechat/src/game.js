'use strict';
const { App } = require('./shared/runtime/stall-app.js');
const { createRenderer } = require('./shared/rendering/stall-scene.js');
const Motion = require('./shared/core/motion.js');
const recipes = require('./shared/data/recipes.js');
const ingredients = require('./shared/data/ingredients.js');
const layout = require('./shared/data/layout.js');
const index = require('./asset-index.js');
const { createPlatform } = require('./platform.js');

const canvas = wx.createCanvas();
const platform = createPlatform(wx, canvas);
let geometry = platform.resize(), session, renderer, hidden = false;
let lastStatus = '正在准备夜市食材…';
let loadFailed = false;
function loading() {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
  ctx.fillStyle = '#183b3b'; ctx.fillRect(0, 0, geometry.width, geometry.height);
  ctx.fillStyle = '#ffedc5'; ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif'; ctx.fillText('灯火大排档', geometry.width / 2, geometry.height / 2 - 30);
  ctx.font = '14px sans-serif'; ctx.fillText(lastStatus, geometry.width / 2, geometry.height / 2 + 12);
}
wx.onHide(() => { hidden = true; if (session) session.setHidden(true); });
wx.onShow(() => { hidden = false; if (session) session.setHidden(false); });
if (wx.onWindowResize) wx.onWindowResize(() => { geometry = platform.resize(); if (!renderer) loading(); });
function pointer(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || hidden) return;
  if (session) session.pointer(Motion.toDesign(x, y,
    renderer.coordinates(geometry, session.screen)));
  else if (loadFailed) start();
}
let lastTouchAt = -Infinity;
wx.onTouchStart(event => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  lastTouchAt = Date.now();
  pointer(touch.clientX === undefined ? touch.x : touch.clientX,
    touch.clientY === undefined ? touch.y : touch.clientY);
});
// Desktop WeChat and some simulator modes emit mouse events instead of touch.
// Suppress the synthetic mouse event after touch to avoid selecting twice.
if (wx.onMouseDown) wx.onMouseDown(event => {
  if (Date.now() - lastTouchAt < 500 || (event.button !== undefined && event.button !== 0)) return;
  pointer(event.x === undefined ? event.clientX : event.x, event.y === undefined ? event.clientY : event.y);
});
function start() {
  loadFailed = false; lastStatus = '正在准备夜市食材…'; loading();
  platform.loadImages(index).then(images => {
    const settings = platform.read('lantern-settings-v1', {});
    const progress = platform.read('lantern-progress-v1', { level: 1 });
    session = new App({ recipes, layout, data: platform.read('lantern-stall-v2', null), legacy: progress, settings,
      save: value => platform.write('lantern-stall-v2', value) });
    session.setHidden(hidden);
    renderer = createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout });
    function frame(ms) {
      if (!hidden) session.hits = renderer.draw(session.frame(ms), geometry);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }).catch(error => {
    console.error(error); loadFailed = true;
    lastStatus = '食材加载失败，轻触屏幕重试'; loading();
  });
}
start();
