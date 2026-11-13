/* Optional visual QA: npm run build:wechat first; install @napi-rs/canvas separately
 * or set LANTERN_CANVAS_MODULE to its absolute module path. Not a gameplay timeline. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require(process.env.LANTERN_CANVAS_MODULE || '@napi-rs/canvas');
const { Session } = require('../shared/runtime/game-session.js');
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
  fs.writeFileSync(path.join(out, 'handoff-v16-states.png'), sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'handoff-v16-game.png'), frames[3].frame.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'handoff-v16-trace.json'), JSON.stringify({ source: 'Level 1, Engine + Session + shared renderer, real solution clicks', acceptedAt, trace }, null, 2) + '\n');
  const colours = new Session({ recipes, layout, level: 1 });
  const carrot = colours.engine.nodes.find(n => n.food === 'carrot' && colours.engine.available(n.id));
  if (!colours.pointer(carrot)) throw Error('Could not select the visible carrot');
  colours.advance(.3);
  renderer.draw(colours.view(), { width: 928, height: 1695, dpr: 1 });
  const colourPreview = createCanvas(928, 1030);
  colourPreview.getContext('2d').drawImage(canvas, 0, 0);
  fs.writeFileSync(path.join(out, 'received-ingredient-colours.png'), colourPreview.toBuffer('image/png'));
  const packed = new Session({ recipes, layout, level: 1 });
  for (const food of ['tomato', 'egg', 'carrot']) {
    const tile = packed.engine.nodes.find(n => n.food === food && packed.engine.available(n.id));
    if (!packed.pointer(tile)) throw Error('Could not select ' + food + ' for prep alignment');
  }
  packed.advance(.52);
  renderer.draw(packed.view(), { width: 928, height: 1695, dpr: 1 });
  const prepPreview = createCanvas(580, 195);
  prepPreview.getContext('2d').drawImage(canvas, 30, 1325, 580, 195, 0, 0, 580, 195);
  fs.writeFileSync(path.join(out, 'prep-left-aligned.png'), prepPreview.toBuffer('image/png'));
  console.log('Rendered real-event menu handoff and delivery to previews/handoff-v16-*.');
})();
