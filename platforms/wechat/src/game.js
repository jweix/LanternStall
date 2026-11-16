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
if (wx.onWindowResize) wx.onWindowResize(() => { if(session)session.pointerCancel();geometry = platform.resize(); if (!renderer) loading(); });
function point(x,y){return session&&renderer&&Number.isFinite(x)&&Number.isFinite(y)?Motion.toDesign(x,y,renderer.coordinates(geometry,session.screen)):null;}
function pointer(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || hidden) return;
  if (session) session.pointer(Motion.toDesign(x, y,
    renderer.coordinates(geometry, session.screen)));
  else if (loadFailed) start();
}
let lastTouchAt = -Infinity;
let lastPoint=null;
function coordinates(t){return[t.clientX===undefined?t.x:t.clientX,t.clientY===undefined?t.y:t.clientY];}
function down(x,y,gestures){lastPoint=point(x,y);if(lastPoint&&!hidden){if(gestures)session.pointerStart(lastPoint);else session.pointer(lastPoint);}else pointer(x,y);}
function move(x,y){const p=point(x,y);if(p&&!hidden){lastPoint=p;session.pointerMove(p);}}
function end(x,y){const p=point(x,y)||lastPoint;if(p&&!hidden&&session)session.pointerEnd(p);lastPoint=null;}
wx.onTouchStart(event => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  lastTouchAt = Date.now();
  down(...coordinates(touch),!!wx.onTouchEnd);
});
if(wx.onTouchMove)wx.onTouchMove(e=>{const t=e.touches&&e.touches[0];if(t)move(...coordinates(t));});
if(wx.onTouchEnd)wx.onTouchEnd(e=>{const t=e.changedTouches&&e.changedTouches[0];if(t)end(...coordinates(t));else end();});
if(wx.onTouchCancel)wx.onTouchCancel(()=>{lastPoint=null;if(session)session.pointerCancel();});
// Desktop WeChat and some simulator modes emit mouse events instead of touch.
// Suppress the synthetic mouse event after touch to avoid selecting twice.
if (wx.onMouseDown) wx.onMouseDown(event => {
  if (Date.now() - lastTouchAt < 500 || (event.button !== undefined && event.button !== 0)) return;
  down(...coordinates(event),!!wx.onMouseUp);
});
if(wx.onMouseMove)wx.onMouseMove(e=>{if(session&&session.gesture)move(...coordinates(e));});
if(wx.onMouseUp)wx.onMouseUp(e=>end(...coordinates(e)));
function start() {
  loadFailed = false; lastStatus = '正在准备夜市食材…'; loading();
  platform.loadImages(index).then(images => {
    const settings = platform.read('lantern-settings-v1', {});
    const progress = platform.read('lantern-progress-v1', { level: 1 });
    session = new App({ recipes, layout, data: platform.read('lantern-stall-v2', null), legacy: progress, settings,
      save: value => platform.write('lantern-stall-v2', value) });
    session.setHidden(hidden);
    renderer = createRenderer(canvas.getContext('2d'), images, Object.assign({ recipes, ingredients, layout, assets:index }, platform.loadLobbyFonts()));
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
