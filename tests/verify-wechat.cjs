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
assert.deepEqual(index, require('../shared/assets/runtime/asset-index.json'));
for (const id of ['lobby-brand-logo','lobby-card','lobby-button-primary','lobby-scene-counter','lobby-scene-chef-base']) assert(index[id], 'New shared skin ' + id);
assert(!Object.keys(index).some(id => id.endsWith('-collected')), 'WeChat must reuse original ingredient sprites for received icons');
for (const asset of Object.values(index)) {
  assert(/^[\x20-\x7e]+$/.test(asset.path),'Runtime resource paths use the same portable ASCII names on both platforms');
  assert(fs.existsSync(path.join(root, 'game', asset.path)));
}
for (const asset of Object.values(index)) {
  const shared = path.resolve(__dirname, '../shared/assets/runtime', path.basename(asset.path));
  assert.deepEqual(fs.readFileSync(shared), fs.readFileSync(path.join(root, 'game', asset.path)), 'Web and WeChat ship identical image bytes');
}
for (const name of ['LanternBody.ttf','OFL-NotoSansSC.txt']) {
  assert.deepEqual(fs.readFileSync(path.resolve(__dirname,'../shared/assets/lobby/fonts',name)),
    fs.readFileSync(path.join(root,'game/assets/fonts',name)),'Web and WeChat ship identical fonts/licenses');
}
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
console.log('PASS self-contained WeChat package, AppID, identical web/WeChat images, ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB');

const sourceLevels=require('../shared/core/levels.js'),nativeLevels=require('../platforms/wechat/game/shared/core/levels.js');
const expectedNativeData=JSON.parse(JSON.stringify(require('../shared/data/level-config.js'),(key,value)=>['greedyTarget','lookaheadTarget','toolTarget'].includes(key)?undefined:value));
assert.deepEqual(require('../platforms/wechat/game/shared/data/level-config.js'),expectedNativeData,'Menu pooling preserves the full native catalog');
for(const n of [1,18,64]){
 const recipes=require('../shared/data/recipes.json'),layout=require('../shared/data/layout.json');
 const source=sourceLevels.createLevel(recipes,layout,n),native=nativeLevels.createLevel(recipes,layout,n);
 assert.deepEqual(native.tiles,source.tiles);assert.deepEqual(native.solution,source.solution);assert.equal(native.contentId,source.contentId,'Offline target stripping cannot change native content identity');
}
console.log('PASS native/web level geometry, ingredients, witness and content identity agree');

const { createPlatform } = require('../platforms/wechat/src/platform.js');
const partial = createPlatform({
  getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3,
    safeArea: { top: 47 } }), getMenuButtonBoundingClientRect: () => ({})
}, {});
assert.deepEqual(partial.geometry().insets, { left: 0, right: 0, top: 47, bottom: 0 });
const fontPaths=[];
const fontPlatform=createPlatform({loadFont(file){fontPaths.push(file);return 'native-'+path.basename(file,'.ttf');}},{});
assert.deepEqual(fontPlatform.loadLobbyFonts(),{lobbyBodyFont:'native-LanternBody'});
assert.deepEqual(fontPaths,['assets/fonts/LanternBody.ttf']);
assert.throws(()=>createPlatform({loadFont:()=>null},{}).loadLobbyFonts(),/字体加载失败/);
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
  name === 'fill' ? () => { if (target.fillStyle === '#72a33c') checks.push(target.globalAlpha); } :
  name === 'drawImage' ? image => { draws++; imageDraws.push({ path: image.path, alpha: target.globalAlpha }); } :
  /create.*Gradient/.test(name) ? () => gradient : () => {} });
const handlers = {}, storage = {};
// Own a full rare series without advancing levels, so native list gestures
// and one-tap equipment can be checked before playing the same first level.
storage['lantern-stall-v2']={version:2,dishes:Object.fromEntries(require('../shared/data/recipes.json').map(r=>[r.id,1]))};
const canvas = { getContext: () => ctx };
global.wx = {
  loadFont(file){assert(fs.existsSync(path.join(root,'game',file)));return 'native-'+path.basename(file,'.ttf');},
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
  onTouchMove: fn => { handlers.move = fn; },onTouchEnd:fn=>{handlers.end=fn;},onTouchCancel:fn=>{handlers.cancel=fn;},
  onMouseDown: fn => { handlers.mouse = fn; }
};
let frame;
global.requestAnimationFrame = fn => { frame = fn; return 1; };
require('../platforms/wechat/game/game.js');
setImmediate(() => {
  assert(frame); frame(0); frame(16); assert(draws > 0); assert.equal(canvas.width, 1170);
  assert(imageDraws.some(d => d.path === 'assets/lobby-scene-counter.png'), 'Native entry must draw the approved new lobby skin');
  const M = require('../shared/core/motion.js');
  const view = M.viewport(390, 844, { top: 95, bottom: 34 });
  const nativeGeometry=createPlatform(wx,canvas).geometry();
  const homeView = require('../shared/rendering/lobby-ui.js').viewport(390, 844, nativeGeometry.lobbyInsets);
  const LL=require('../shared/data/lobby-layout.js'),OL=require('../shared/rendering/outfit-ui.js');
  const homeHeader=LL.header;
  assert(homeView.y + homeHeader.wallet[1]*homeView.scale >= 95-.001, 'Native wallet clears the real capsule');
  const nativePoint=(x,y)=>({clientX:homeView.x+x*homeView.scale,clientY:homeView.y+y*homeView.scale});
  handlers.touch({touches:[nativePoint(340,1680)]});labels=[];frame(17);
  assert(labels.includes('主题套装')&&labels.includes('珍藏装扮'));
  handlers.touch({touches:[nativePoint(646,LL.decor.main[1]+34)]});labels=[];frame(17.5);
  assert(labels.includes('星河琉璃')&&labels.includes('柿灯丰年')&&!labels.includes('全部'));
  handlers.touch({touches:[nativePoint(210,OL.rareList[1]+80)]});handlers.end({changedTouches:[nativePoint(210,OL.rareList[1]+80)]});labels=[];frame(17.6);
  assert(labels.includes('试穿中 · 未保存'),'Locked rare family can be previewed through native touch');
  assert(!labels.includes('星河灯串'),'Theme cards show collection progress, not component lists');
  handlers.touch({touches:[nativePoint(650,LL.decor.categories[1]+31)]});labels=[];frame(17.7);
  assert(labels.includes('星河灯串')&&!labels.includes('星河锅具'));
  const storedBeforeScroll=JSON.stringify(storage);
  handlers.touch({touches:[nativePoint(180,OL.ownedList[1]+180)]});handlers.move({touches:[nativePoint(180,OL.ownedList[1]+40)]});handlers.end({changedTouches:[nativePoint(180,OL.ownedList[1]+40)]});
  labels=[];frame(18);assert(labels.includes('星河菜单牌'),'Native drag reaches another owned-item row');
  assert.equal(JSON.stringify(storage),storedBeforeScroll,'Native dragging never buys or equips an item');
  handlers.touch({touches:[nativePoint(210,OL.ownedList[1]+110)]});handlers.end({changedTouches:[nativePoint(210,OL.ownedList[1]+110)]});labels=[];frame(18.5);
  assert.equal(JSON.stringify(storage),storedBeforeScroll,'Native card tap previews without changing the save');
  assert(labels.includes('恢复当前装扮')&&labels.includes('换上星河桌椅'),'Native preview offers the same explicit equip action as themes');
  handlers.touch({touches:[nativePoint(LL.decor.cta[0]+LL.decor.cta[2]/2,LL.decor.cta[1]+LL.decor.cta[3]/2)]});labels=[];frame(18.6);
  assert.equal(storage['lantern-stall-v2'].equipped.tables,'star-tables','Only the native equip button saves the selected component');assert.equal(storage['lantern-stall-v2'].coins,0);
  handlers.touch({touches:[nativePoint(180,OL.ownedList[1]+180)]});handlers.cancel();
  handlers.touch({touches:[nativePoint(130,1680)]});frame(19);
  console.log('PASS WeChat touch move/end/cancel scroll the shared outfit list without spending or equipping');
  handlers.touch({ touches: [{ clientX: homeView.x + 447 * homeView.scale, clientY: homeView.y + 1450 * homeView.scale }] });
  frame(20); assert(storage['lantern-stall-v2'].activeAttempt, 'Native home button must start and durably identify a game');
  handlers.touch({ touches: [{ clientX: view.x + 160 * view.scale, clientY: view.y + 53 * view.scale }] });
  labels = []; frame(32); assert(labels.includes('设置'), 'Native touch must open settings at the drawn coordinates');
  handlers.touch({ touches: [{ x: view.x + 464 * view.scale, y: view.y + (require('../shared/data/game-ui.js').buttons.resume[1]+49) * view.scale }] });
  labels = []; frame(48); assert(!labels.includes('设置'));
  const level = require('../shared/core/levels.js').createLevel(require('../shared/data/recipes.json'), require('../shared/data/layout.json'), 1);
  const preview = new (require('../shared/core/game-core.js').Engine)(level);
  const tomato = level.tiles.find(n => n.food === 'tomato' && preview.available(n.id));
  handlers.touch({ touches: [{ x: view.x + tomato.x * view.scale, y: view.y + tomato.y * view.scale }] });
  frame(148); frame(248); frame(348);
  labels = []; imageDraws = []; checks = []; frame(448);
  assert(labels.includes('1/2'), 'Native ingredient touch must update the collecting menu');
  const tomatoes = imageDraws.filter(d => d.path === 'assets/tomato.png');
  assert(tomatoes.length >= 2 && tomatoes.every(d => d.alpha === 1), 'Menu and board must reuse the opaque original red tomato');
  assert(checks.length > 0 && checks.every(alpha => alpha === 1), 'Received marker stays an opaque green check');
  console.log('PASS WeChat native touch receives tomato with original sprite/opacity, green check and 1/2 progress');
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
