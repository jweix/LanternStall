/* Optional visual QA: npm run build:wechat first; install @napi-rs/canvas separately
 * or set LANTERN_CANVAS_MODULE to its absolute module path. Not a gameplay timeline. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require(process.env.LANTERN_CANVAS_MODULE || '@napi-rs/canvas');
const { Session } = require('../shared/runtime/game-session.js');
const { App } = require('../shared/runtime/stall-app.js');
const { createRenderer } = require('../shared/rendering/scene.js');
const font = process.env.LANTERN_FONT || '/System/Library/Fonts/Hiragino Sans GB.ttc';
if (fs.existsSync(font)) { GlobalFonts.registerFromPath(font, 'PingFang SC'); GlobalFonts.registerFromPath(font, 'sans-serif'); }
const recipes = require('../shared/data/recipes.json'), ingredients = require('../shared/data/ingredients.json');
const layout = require('../shared/data/layout.json');
const root = path.resolve(__dirname, '..'), generated = path.join(root, 'platforms/wechat/game');
const index = require(path.join(generated, 'asset-index.js'));
(async () => {
  const images = Object.fromEntries(await Promise.all(Object.entries(index).map(async ([id, asset]) =>
    [id, await loadImage(path.join(generated, asset.path))])));
  const canvas = createCanvas(928, 1695), renderer = createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout });
  const session = new Session({ recipes, layout, level: 1 });
  const out = path.join(root, 'previews'); fs.mkdirSync(out, { recursive: true });
  const frames = [];
  function capture(label) {
    renderer.draw(session.view(), { width: 928, height: 1695, dpr: 1 });
    const frame = createCanvas(928, 1695); frame.getContext('2d').drawImage(canvas, 0, 0);
    frames.push({ label, frame });
  }
  // Real level, real exposed-tile clicks, real arrival/match events. .75s is
  // only this offline capture's pacing. The game's input has no cooldown.
  let accepted;
  for (const id of session.config.solution) {
    const tile = session.engine.nodes.find(n => n.id === id);
    if (!session.pointer(tile)) throw Error('Preview route could not select ' + id);
    session.advance(.3);
    accepted = session.effects.find(e => e.event.type === 'recipeAccepted');
    if (accepted) break;
    capture('Collecting'); session.advance(.45);
  }
  if (!accepted) throw Error('No recipe accepted');
  // Keep the final collecting frame and the first accepted recipe's entire chain.
  frames.splice(0, Math.max(0, frames.length - 1));
  const acceptedAt = accepted.born, trace = [];
  for (const age of [.16, .35, .42, .54, 1.20, 1.90, 1.98]) {
    session.advance(Math.max(0, acceptedAt + age - session.engine.now));
    capture('t=' + age.toFixed(2) + 's');
    trace.push({ age, now: session.engine.now, orders: session.engine.orders.map(o => ({ orderId: o.orderId, state: o.state })),
      revenue: session.engine.revenue, jobs: session.engine.jobs.map(j => ({ jobId: j.jobId, orderId: j.orderId, state: j.state })) });
  }
  const sheet = createCanvas(4 * 464, 2 * 200), ctx = sheet.getContext('2d');
  ctx.fillStyle = '#fff6e5'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  frames.forEach(({ label, frame }, i) => {
    const x = i % 4 * 464, y = Math.floor(i / 4) * 200;
    ctx.fillStyle = '#6b3b22'; ctx.font = 'bold 19px sans-serif'; ctx.fillText(label, x + 12, y + 25);
    ctx.drawImage(frame, 0, 150, 928, 330, x, y + 35, 464, 165);
  });
  fs.writeFileSync(path.join(out, 'ui-v12-handoff-states.png'), sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'ui-v12-game.png'), frames[3].frame.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'ui-v12-trace.json'), JSON.stringify({ source: 'Level 1, Engine + Session + shared renderer, real solution clicks', acceptedAt, trace }, null, 2) + '\n');
  const colours = new Session({ recipes, layout, level: 1 });
  const carrot = colours.engine.nodes.find(n => n.food === 'carrot' && colours.engine.available(n.id));
  if (!colours.pointer(carrot)) throw Error('Could not select the visible carrot');
  colours.advance(.3);
  renderer.draw(colours.view(), { width: 928, height: 1695, dpr: 1 });
  const colourPreview = createCanvas(928, 1030);
  colourPreview.getContext('2d').drawImage(canvas, 0, 0);
  fs.writeFileSync(path.join(out, 'ui-v12-received-ingredient-colours.png'), colourPreview.toBuffer('image/png'));
  const packed = new Session({ recipes, layout, level: 1 });
  for (const food of ['tomato', 'egg', 'carrot']) {
    const tile = packed.engine.nodes.find(n => n.food === food && packed.engine.available(n.id));
    if (!packed.pointer(tile)) throw Error('Could not select ' + food + ' for prep alignment');
  }
  packed.advance(.52);
  renderer.draw(packed.view(), { width: 928, height: 1695, dpr: 1 });
  const prepPreview = createCanvas(580, 195);
  prepPreview.getContext('2d').drawImage(canvas, 30, 1325, 580, 195, 0, 0, 580, 195);
  fs.writeFileSync(path.join(out, 'ui-v12-prep-left-aligned.png'), prepPreview.toBuffer('image/png'));
  // Whole-scene checks use only real engine inputs, including tools and final clear.
  const flowSession = new Session({ recipes, layout, level: 1 }), flow = [];
  function take(label) {
    renderer.draw(flowSession.view(), { width: 928, height: 1695, dpr: 1 });
    const frame = createCanvas(928, 1695); frame.getContext('2d').drawImage(canvas, 0, 0);
    flow.push({ label, frame });
  }
  take('选料');
  const stored = flowSession.engine.nodes.find(n => n.food === 'carrot' && flowSession.engine.available(n.id));
  flowSession.pointer(stored); flowSession.advance(.3); take('已收标记');
  flowSession.pointer({ x: 464, y: 1575 }); take('暂存');
  flowSession.pointer({ x: 402, y: 1356 }); take('取回');
  for (const food of ['tomato', 'egg']) {
    const n = flowSession.engine.nodes.find(n => n.food === food && flowSession.engine.available(n.id));
    flowSession.pointer(n); flowSession.advance(.3);
  }
  const match = flowSession.effects.find(e => e.event.type === 'recipeAccepted').born;
  for (const [a, label] of [[.16, '盘盖确认'], [.35, '整卡退出'], [.54, '新单落位'], [.96, '倒菜装盘'], [1.3, '出锅上移'], [1.9, '收入旁显现'], [1.98, '送达入账']]) {
    flowSession.advance(Math.max(0, match + a - flowSession.engine.now)); take(label);
  }
  const fullApp = new App({ recipes, layout, save: () => true });
  fullApp.handle('play');
  const complete = fullApp.session;
  for (const id of complete.config.solution) {
    const n = complete.engine.nodes.find(n => n.id === id);
    while (complete.engine.buffer.length + complete.engine.incoming.length >= 7) complete.advance(.01);
    if (!complete.pointer(n)) throw Error('Final visual route rejected ' + id);
    complete.advance(.01);
  }
  complete.advance(30);
  if (complete.engine.status !== 'won') throw Error('Visual route did not clear');
  renderer.draw(fullApp.view().game, { width: 928, height: 1695, dpr: 1 });
  fs.writeFileSync(path.join(out, 'ui-v12-result.png'), canvas.toBuffer('image/png'));
  const resultFrame = createCanvas(928, 1695); resultFrame.getContext('2d').drawImage(canvas, 0, 0);
  flow.push({ label: '真实通关', frame: resultFrame });
  const overview = createCanvas(4 * 232, 3 * 448), overviewCtx = overview.getContext('2d');
  overviewCtx.fillStyle = '#fff6e5'; overviewCtx.fillRect(0, 0, overview.width, overview.height);
  flow.forEach(({label, frame}, i) => {
    const x = i % 4 * 232, y = Math.floor(i / 4) * 448;
    overviewCtx.fillStyle = '#6b3b22'; overviewCtx.font = 'bold 19px sans-serif'; overviewCtx.fillText(label, x + 12, y + 20);
    overviewCtx.drawImage(frame, x, y + 27, 232, 423.75);
  });
  fs.writeFileSync(path.join(out, 'ui-v12-flow.png'), overview.toBuffer('image/png'));
  console.log('Rendered real-event gameplay, tools, handoff, cooking, delivery and result to previews/ui-v12-*.');
})();
