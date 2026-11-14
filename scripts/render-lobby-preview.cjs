// Offline visual QA uses real engine completions and real purchases. No player save is modified.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require(process.env.LANTERN_CANVAS_MODULE || '@napi-rs/canvas');
const { App } = require('../shared/runtime/stall-app.js');
const { createRenderer } = require('../shared/rendering/stall-scene.js');
const C = require('../shared/data/progression.js');
const recipes = require('../shared/data/recipes.json'), ingredients = require('../shared/data/ingredients.json'), layout = require('../shared/data/layout.json');
const font = process.env.LANTERN_FONT || '/System/Library/Fonts/Hiragino Sans GB.ttc';
if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, 'PingFang SC');
(async () => {
  const generated = path.resolve(__dirname, '../platforms/wechat/game'), out = path.resolve(__dirname, '../previews');
  const index = require(path.join(generated, 'asset-index.js'));
  const images = Object.fromEntries(await Promise.all(Object.entries(index).map(async ([id, a]) => [id, await loadImage(path.join(generated, a.path))])));
  let now = Date.parse('2026-11-13T10:00:00+08:00');
  const app = new App({ recipes, layout, now: () => now });
  for (let n = 1; n <= 28; n++) {
    now = Date.parse('2026-11-13T10:00:00+08:00') + Math.floor((n - 1) / 4) * 86400000;
    app.start(n);
    for (const id of app.session.config.solution) {
      const s = app.session;
      if (!s.pointer(s.engine.nodes.find(t => t.id === id))) throw Error('Invalid route');
      s.advance(.3); if (s.engine.wok || s.engine.queue.length || s.engine.deliveries.length) s.advance(10);
    }
    app.session.advance(10); app.home(); app.modal = null;
  }
  let purchaseView;
  for (const item of C.items.filter(i => i.theme === 'warm' && i.source === 'coins')) {
    app.handle('tab', 'decor'); app.handle('item', item.id); app.handle('buy', item.id);
    if (item.slot === 'background') purchaseView = app.view();
    app.handle('confirm-buy', item.id);
    if (!app.profile.state.owned.includes(item.id)) throw Error('Could not buy ' + item.id);
  }
  app.profile.photo(); app.toast = null; app.modal = null;
  fs.mkdirSync(out, { recursive: true });
  const canvas = createCanvas(887, 1774), renderer = createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout });
  const sheet = createCanvas(1536, 800), ctx = sheet.getContext('2d'); ctx.fillStyle = '#173638'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  for (const [i, tab] of ['home', 'decor', 'recipes', 'market'].entries()) {
    app.handle('tab', tab); app.hits = renderer.draw(app.view(), { width: 887, height: 1774, dpr: 1 });
    const png = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(out, 'lobby-v4-' + tab + '.png'), png);
    ctx.drawImage(await loadImage(png), 12 + i * 384, 56, 360, 720);
    ctx.font = 'bold 23px "PingFang SC"'; ctx.fillStyle = '#ffebc9'; ctx.textAlign = 'center'; ctx.fillText(['小摊', '装扮', '菜谱', '夜市'][i], 192 + i * 384, 36);
  }
  fs.writeFileSync(path.join(out, 'lobby-v4-overview.png'), sheet.toBuffer('image/png'));
  renderer.draw(purchaseView, { width: 887, height: 1774, dpr: 1 });
  fs.writeFileSync(path.join(out, 'lobby-v4-purchase.png'), canvas.toBuffer('image/png'));
  const looks = createCanvas(1536, 800), lc = looks.getContext('2d'); lc.fillStyle = '#253b3b'; lc.fillRect(0, 0, 1536, 800);
  app.handle('tab', 'decor'); app.handle('sub', 'themes');
  for (const [i, theme] of ['warm', 'bamboo', 'sea', 'festival'].entries()) {
    app.handle('theme', theme); renderer.draw(app.view(), { width: 887, height: 1774, dpr: 1 });
    const frozen = await loadImage(canvas.toBuffer('image/png'));
    lc.drawImage(frozen, i * 384 + 12, 56, 360, 720); lc.font = '700 23px "PingFang SC"'; lc.fillStyle = '#ffebc9'; lc.textAlign = 'center'; lc.fillText(C.byTheme[theme].name, i * 384 + 192, 36);
  }
  fs.writeFileSync(path.join(out, 'lobby-v4-themes.png'), looks.toBuffer('image/png'));
  canvas.width = 928; canvas.height = 1695;
  app.start(29); renderer.draw(app.view(), { width: 928, height: 1695, dpr: 1 });
  fs.writeFileSync(path.join(out, 'lobby-v4-game.png'), canvas.toBuffer('image/png'));
  // A component audit makes accidental baked sibling controls visible.
  const sourceManifest = require('../shared/assets/lobby/manifest.json');
  const audit = createCanvas(1440, 6 * 252 + 65), ac = audit.getContext('2d');
  ac.fillStyle='#173638';ac.fillRect(0,0,audit.width,audit.height);
  ac.font='700 25px "PingFang SC"';ac.textAlign='left';ac.fillStyle='#ffebc9';ac.fillText('生产资源拆分：每格一个逻辑对象，格线仅用于检查',22,39);
  for (const [i,a] of sourceManifest.assets.entries()) {
    const x=i%4*360+12,y=Math.floor(i/4)*252+65;
    for(let yy=0;yy<206;yy+=16)for(let xx=0;xx<336;xx+=16){ac.fillStyle=(xx/16+yy/16)%2?'#e1d6bf':'#f4ecda';ac.fillRect(x+xx,y+yy,16,16);}
    const im=images[a.id],sc=Math.min(302/im.width,177/im.height);
    ac.drawImage(im,x+(336-im.width*sc)/2,y+(206-im.height*sc)/2,im.width*sc,im.height*sc);
    ac.fillStyle='#ffebc9';ac.font='17px sans-serif';ac.fillText(a.id,x+3,y+234);
  }
  fs.writeFileSync(path.join(out,'lobby-v4-components.png'),audit.toBuffer('image/png'));
  console.log('Rendered four tabs and equipped real gameplay; 28 engine wins, 9 purchases, balance=' + app.profile.state.coins);
})();
