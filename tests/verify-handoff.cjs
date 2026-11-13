'use strict';
const assert = require('node:assert/strict');
const { Engine } = require('../shared/core/game-core.js');
const M = require('../shared/core/motion.js');
const recipes = require('../shared/data/recipes.json');
const e = new Engine({ recipes, orderPlan: [['d01', 'd09'], [], []] });
const oldOrder = e.orders[0].orderId;
for (const food of ['tomato', 'egg']) assert(e.putIngredient(food).ok);
e.tick(.3); // t=0 at recipeAccepted
assert.equal(e.buffer.length, 0);
assert.equal(e.orders[0].state, 'confirming');
assert.equal(e.jobs.length, 1);
const job = e.jobs[0];
assert.equal(job.state, 'cooking');
assert.equal(job.orderId, oldOrder);
assert.equal(e.revenue, 0);
e.tick(.279); assert.equal(e.orders[0].orderId, oldOrder);
e.tick(.001); assert.equal(e.orders[0].state, 'exiting');
e.tick(.139); assert.equal(e.orders[0].orderId, oldOrder);
e.tick(.001); assert.equal(e.orders[0].recipe.id, 'd09');
assert.equal(e.orders[0].state, 'collecting');
assert.notEqual(e.orders[0].orderId, oldOrder);
assert.equal(e.wok.jobId, job.jobId);
assert.equal(M.orderEnter(0).alpha, 1);
e.tick(.12); assert(Math.abs(M.orderEnter(.12).dy) < 1e-9);
// New menu starts receiving while the original dish is still cooking.
e.putIngredient('wood_ear'); e.tick(.3);
assert.equal(e.buffer.length, 1);
assert.equal(e.orders[0].state, 'collecting');
e.tick(.36); assert.equal(e.deliveries[0].jobId, job.jobId);
assert.equal(e.revenue, 0);
e.tick(.779); assert.equal(e.revenue, 0);
e.tick(.001); assert.equal(e.revenue, 32);
assert.equal(e.orders[0].recipe.id, 'd09');
assert.equal(e.orders[0].state, 'collecting');
assert.equal(job.state, 'served');
e._serve(job); e.tick(10); assert.equal(e.revenue, 32);
console.log('PASS single real-event chain: immediate consume, .28 confirm, .42 refresh, .54 settle, 1.20 cook, .78 deliver, once-only credit');

// Staggered handoffs exercise three independent clocks while the single wok is busy.
const concurrent = new Engine({ recipes, orderPlan: [['d01', 'd01'], ['d02', 'd02'], ['d03', 'd03']] });
for (const food of ['tomato', 'egg']) concurrent.putIngredient(food);
concurrent.tick(.3);
for (const food of ['pepper', 'pork']) concurrent.putIngredient(food);
concurrent.tick(.3);
for (const food of ['shiitake', 'chicken']) concurrent.putIngredient(food);
concurrent.tick(.12); // slot 0 refreshes at .72; slots 1 and 2 have independent deadlines.
assert.deepEqual(concurrent.orders.map(o => o.state), ['collecting', 'confirming', 'collecting']);
concurrent.tick(.18);
assert.deepEqual(concurrent.orders.map(o => o.state), ['collecting', 'exiting', 'confirming']);
concurrent.tick(.12);
assert.equal(concurrent.orders[1].state, 'collecting');
assert.equal(concurrent.queue.length, 2);
assert.equal(concurrent.revenue, 0);
concurrent.tick(.30);
assert(concurrent.orders.every(o => o.state === 'collecting'));
assert.equal(concurrent.wok.originSlot, 0);
const beforeDelivery = concurrent.orders.map(o => o.orderId);
concurrent.tick(.18); // 1.5: first dish out; second starts before delivery completes.
assert.equal(concurrent.deliveries.length, 1);
assert.equal(concurrent.wok.originSlot, 1);
assert.deepEqual(concurrent.orders.map(o => o.orderId), beforeDelivery);
concurrent.tick(10);
assert.equal(concurrent.revenue, 104);
const events = concurrent.drainEvents();
assert.deepEqual(events.filter(e => e.type === 'cookingStarted').map(e => e.job.originSlot), [0, 1, 2]);
assert.equal(new Set(events.filter(e => e.type === 'dishServed').map(e => e.jobId)).size, 3);
assert.equal(new Set(events.filter(e => e.type === 'recipeAccepted').flatMap(e => e.consumedItemIds)).size, 6);
console.log('PASS three staggered menus refresh independently with FIFO cooking and parallel delivery');

// Several generations share one slot while older jobs still cook/deliver.
const generations = new Engine({ recipes, orderPlan: [Array(5).fill('d01'), [], []] });
for (let n = 0; n < 5; n++) {
  assert(generations.putIngredient('tomato').ok); assert(generations.putIngredient('egg').ok);
  generations.tick(.3);
  assert.equal(generations.jobs.length, n + 1);
  assert.equal(generations.buffer.length, 0);
  if (n === 0) { generations.orders[0].recipe.payout = 999; generations.orders[0].table = 'changed'; }
  generations.tick(.42);
}
assert.equal(generations.jobs[0].table, '01');
assert.equal(generations.jobs[0].payout, 32);
assert.equal(generations.jobs[0].ingredients.join(','), 'tomato,egg');
assert.throws(() => { generations.jobs[0].payout = 999; }, TypeError);
assert.throws(() => { generations.jobs[0].recipe.ingredients.push('beef'); }, TypeError);
generations.tick(10);
assert.equal(generations.revenue, 160);
assert(generations.jobs.every(j => j.state === 'served'));
assert.equal(new Set(generations.jobs.map(j => j.orderId)).size, 5);
for (const job of generations.jobs) generations._serve(job);
assert.equal(generations.revenue, 160);
console.log('PASS immutable job/order/price snapshots survive five menu generations, each credited once');

const hidden = new Engine({ recipes, orderPlan: [['d01', 'd01', 'd01'], [], []] });
for (let n = 0; n < 3; n++) { hidden.putIngredient('tomato'); hidden.putIngredient('egg'); }
hidden.tick(.3);
assert.equal(hidden.jobs.length, 1); assert.equal(hidden.buffer.length, 4);
hidden.tick(.419); assert.equal(hidden.jobs.length, 1);
hidden.tick(.001); assert.equal(hidden.jobs.length, 2); assert.equal(hidden.buffer.length, 2);
hidden.tick(.42); assert.equal(hidden.jobs.length, 3); assert.equal(hidden.buffer.length, 0);
assert.deepEqual(hidden.drainEvents().filter(e => e.type === 'recipeAccepted').map(e => Number(e.time.toFixed(2))), [.3, .72, 1.14]);
console.log('PASS hidden successors cannot chain-consume before their own .42-second visibility deadline');

// Effective inventory includes prep, incoming and stash, excluding every accepted job.
const stock = new Engine({ recipes, orderPlan: [['d01'], [], []], tiles: [
  { id: 'tomato', food: 'tomato', x: 0, y: 0, w: 10, h: 10 },
  { id: 'egg', food: 'egg', x: 20, y: 0, w: 10, h: 10 },
  { id: 'ear', food: 'wood_ear', x: 40, y: 0, w: 10, h: 10 }
] });
stock.selectTile('tomato'); stock.selectTile('egg'); stock.tick(.3);
stock.orderPlan = null; // Exercise the inventory-filtered fallback refresh path.
assert.equal(stock._hasStock(recipes.find(r => r.id === 'd09')), false);
assert.equal(stock._order(0).recipe, null);
assert.equal(stock.status, 'playing');
stock.selectTile('ear'); stock.tick(.3); assert(stock.stash());
stock.putIngredient('egg'); assert.equal(stock._hasStock(recipes.find(r => r.id === 'd09')), true);
stock.tick(.3); assert.equal(stock._hasStock(recipes.find(r => r.id === 'd09')), true);
assert.equal(stock.orders[0].recipe.id, 'd09');
console.log('PASS replacement inventory counts prep/incoming/stash and excludes already-consumed kitchen materials');

const { Session } = require('../shared/runtime/game-session.js');
const layout = require('../shared/data/layout.json');
function fixtureSession() {
  const s = new Session({ recipes, layout });
  s.engine = new Engine({ recipes, orderPlan: [['d01', 'd09'], ['d02'], []] });
  for (const food of ['tomato', 'egg', 'pepper', 'pork']) s.engine.putIngredient(food);
  s.collectEvents(); s.advance(.3);
  return s;
}
for (const at of [0, .32, .43, 1.3, 1.9]) {
  const s = fixtureSession(); s.advance(at);
  const before = s.engine.snapshot();
  s.setPanel('pause'); s.advance(200);
  assert.equal(s.engine.now, before.now);
  assert.equal(s.engine.revenue, before.revenue);
  assert.deepEqual(s.engine.orders, before.orders);
  s.setPanel(null); s.advance(10);
  assert.equal(s.engine.revenue, 68);
  assert.equal(s.effects.filter(e => e.event.type === 'dishServed').length, 0, 'Expired feedback is pruned after a late frame');
}
for (const nextLevel of [1, 2]) for (const at of [0, .32, .43, 1.3]) {
  const s = fixtureSession(); s.advance(at);
  const previous = s.engine, oldJob = previous.jobs[0];
  s.restart(nextLevel);
  assert.notEqual(s.engine.levelId, previous.levelId);
  assert.equal(s.engine.jobs.length, 0); assert.equal(s.effects.length, 0);
  assert.equal(Object.keys(s.slots).length, 0);
  // A stale completion cannot settle into the new run, even with an identical jobId.
  s.engine._serve(oldJob); previous.tick(10); s.advance(10);
  assert.equal(s.engine.revenue, 0); assert.equal(s.engine.jobs.length, 0);
}
console.log('PASS pause/resume and restart/next-level isolation through confirmation, exit, cooking and delivery');

const spec = require('../shared/data/animation-spec.json');
const { DEFAULTS } = require('../shared/core/game-core.js');
const near = (a, b) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
near(DEFAULTS.orderConfirm + DEFAULTS.cardExit, spec.handoff.replacementVisibleAt);
near(DEFAULTS.orderConfirm + DEFAULTS.cardExit + DEFAULTS.cardSettle, spec.handoff.newCardStableAt);
near(DEFAULTS.rawToWok + DEFAULTS.stir + DEFAULTS.pour, spec.kitchen.normalCooking.total);
near(M.timing.orderConfirm, spec.handoff.coveredPlateConfirmation);
near(M.timing.cardExit, spec.handoff.cardExit);
near(M.timing.newCue, spec.handoff.newCueDuration);
near(M.timing.reveal, DEFAULTS.deliveryReveal);
const start = M.departurePose(0), rise = M.departurePose(.62 - 1e-9), reveal = M.departurePose(.62), end = M.departurePose(.78);
near(start.x, 837); near(start.y, 1484); near(rise.y, 1208);
assert(M.departurePose(.01).y < start.y); assert(rise.alpha < 1e-7);
near(reveal.x, 751); near(reveal.y, 198.5); near(reveal.w, 65);
near(end.x, layout.servingPoint.x); near(end.y, layout.servingPoint.y); near(end.w, 96);
near(M.departurePose(.69).alpha, 1);
for (let i = 0; i < 3; i++) assert.deepEqual(M.departurePose(.7, i), M.departurePose(.7));
assert(layout.orderPlate.lidRadius < layout.orderPlate.innerPlateRadius);
assert.equal(spec.ingredientStatus.collectedAlpha, 1);
assert.equal(spec.ingredientStatus.collectedSaturation, 1);
assert.equal(spec.ingredientStatus.collectedCheckAlpha, 1);
console.log('PASS executable timing/layout contract, fixed serving point, continuous motion, lid fit and original-colour ingredient contract');

// Burst-play full finite levels. Queue pressure cannot introduce animation locks,
// premature failure, duplicate ingredients, or losses at the .42-second boundary.
for (let level = 1; level <= 4; level++) {
  const s = new Session({ recipes, layout, level });
  let acceptedInputs = 0;
  for (const id of s.config.solution) {
    const tile = s.engine.nodes.find(n => n.id === id);
    let wait = 0;
    while (s.engine.buffer.length + s.engine.incoming.length >= 7 && wait++ < 1000) s.advance(.01);
    assert.equal(s.engine.status, 'playing');
    assert(s.pointer(tile)); acceptedInputs++;
    s.advance(.01);
  }
  s.advance(100);
  assert.equal(acceptedInputs, 40); assert.equal(s.engine.status, 'won');
  assert.equal(s.engine.revenue, s.config.metrics.expectedRevenue);
  assert.equal(new Set(s.engine.jobs.flatMap(j => j.items.map(i => i.id))).size, 40);
  assert.equal(s.engine.jobs.reduce((n, j) => n + j.ingredients.length, 0), 40);
  assert(s.engine.jobs.every(j => j.state === 'served'));
}
console.log('PASS four full difficulty levels with .01-second burst inputs, seven-slot reservations and exact once-only materials/revenue');

// Inspect shared renderer output without browser/Canvas.filter dependencies.
// The recorder implements Canvas transforms/alpha so assertions cover actual draws.
function record(view) {
  let matrix = [1, 0, 0, 1, 0, 0], stack = [], circle;
  const draws = [], labels = [], checks = [];
  const ctx = new Proxy({ globalAlpha: 1,
    save() { stack.push({ matrix: matrix.slice(), alpha: this.globalAlpha }); },
    restore() { const s = stack.pop(); matrix = s.matrix; this.globalAlpha = s.alpha; },
    setTransform(...m) { matrix = m; },
    translate(x, y) { matrix[4] += matrix[0] * x + matrix[2] * y; matrix[5] += matrix[1] * x + matrix[3] * y; },
    scale(x, y) { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    rotate(angle) { const [a, b, c, d] = matrix, co = Math.cos(angle), si = Math.sin(angle); matrix.splice(0, 4, a * co + c * si, b * co + d * si, c * co - a * si, d * co - b * si); },
    measureText(value) { return { width: value.length * 26 }; },
    createLinearGradient() { return { addColorStop() {} }; },
    drawImage(im, ...args) {
      const [x, y, w, h] = args.length === 8 ? args.slice(4) : args;
      draws.push({ id: im.id, alpha: this.globalAlpha, x: matrix[0] * (x + w / 2) + matrix[2] * (y + h / 2) + matrix[4],
        y: matrix[1] * (x + w / 2) + matrix[3] * (y + h / 2) + matrix[5], w: w * Math.hypot(matrix[0], matrix[1]), h: h * Math.hypot(matrix[2], matrix[3]) });
    },
    fillText(value) { labels.push({ value, alpha: this.globalAlpha }); },
    beginPath() { circle = null; },
    ellipse(x, y, rx, ry) { circle = { x, y, rx, ry }; },
    fill() { if (circle && this.fillStyle === '#78a94c') checks.push({ alpha: this.globalAlpha }); }
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const images = { scene: { id: 'scene', width: 928, height: 1695 } };
  for (const asset of require('../shared/asset-manifest.json').assets) {
    images[asset.id] = { id: asset.id, width: asset.bbox.w, height: asset.bbox.h };
  }
  require('../shared/rendering/scene.js').createRenderer(ctx, images, { recipes, ingredients: require('../shared/data/ingredients.json'), layout })
    .draw(view, { width: 928, height: 1695, dpr: 1 });
  assert(draws.every(d => Number.isFinite(d.alpha) && Number.isFinite(d.x) && Number.isFinite(d.y)));
  return { draws, labels, checks };
}
const visual = new Session({ recipes, layout });
visual.engine = new Engine({ recipes, orderPlan: [['d17', 'd06'], [], []] });
const beforeReceived = record(visual.view()).draws.find(d => d.id === 'carrot');
visual.engine.putIngredient('carrot'); visual.collectEvents(); visual.advance(.3);
let drawing = record(visual.view());
assert.deepEqual(drawing.draws.find(d => d.id === 'carrot'), beforeReceived, 'Received carrot keeps the exact same original image, opacity, size and position');
assert.equal(drawing.draws.find(d => d.id === 'wood_ear').alpha, 1);
assert.equal(drawing.draws.find(d => d.id === 'egg').alpha, 1);
assert.equal(drawing.checks.length, 1);
assert(drawing.checks.every(c => c.alpha === 1));
assert(!drawing.draws.some(d => d.id === 'cloche' || d.id === 'empty-plate'));
assert(drawing.labels.some(t => t.value === '1/3' && t.alpha === 1));
visual.engine.putIngredient('wood_ear'); visual.engine.putIngredient('egg'); visual.collectEvents(); visual.advance(.3); visual.advance(.16);
drawing = record(visual.view());
const lid = drawing.draws.find(d => d.id === 'cloche'), plate = drawing.draws.find(d => d.id === 'empty-plate');
near(lid.x, plate.x); near(lid.w, layout.orderPlate.lidArtWidth); near(plate.w, 211);
near(lid.w / lid.h, 346 / 140);
assert(drawing.labels.some(t => t.value === '交给大厨啦'));
visual.advance(.26); drawing = record(visual.view());
assert(!drawing.draws.some(d => d.id === 'cloche' || d.id === 'empty-plate'));
assert(drawing.labels.some(t => t.value === '豆腐炒蛋' && t.alpha === 1));
visual.advance(1.56); drawing = record(visual.view());
const servedArt = drawing.draws.find(d => d.id === 'd17');
near(servedArt.x, 735); near(servedArt.y, 188);
assert(!drawing.draws.some(d => d.id === 'cloche'));
const queuedVisual = fixtureSession(); queuedVisual.advance(1.2);
drawing = record(queuedVisual.view());
assert(drawing.draws.filter(d => ['pepper', 'pork'].includes(d.id)).every(d => d.w <= 26), 'Queued cooking must not pull old 69px prep tiles again');
console.log('PASS shared rendering: original-colour carrot and missing ingredients, opaque checks, aligned contained lid/plate, no plate on new menu, no second prep pull');

function prepSession() {
  const session = new Session({ recipes, layout });
  session.engine = new Engine({ recipes, orderPlan: [['d01', 'd09'], ['d02'], ['d11']] });
  return session;
}
function put(session, foods) {
  for (const food of foods) assert(session.engine.putIngredient(food).ok);
  session.collectEvents();
}
function aligned(session) {
  const items = session.engine.buffer.concat(session.engine.incoming);
  assert.deepEqual(items.map(item => session.slots[item.id]), items.map((_, i) => i));
  assert.equal(Object.keys(session.slots).length, items.length);
}
const prep = prepSession();
put(prep, ['tomato', 'egg']); prep.advance(.1);
put(prep, ['celery']); prep.advance(.1);
put(prep, ['carrot']); prep.advance(.1);
aligned(prep);
assert.equal(prep.slots[prep.engine.incoming[0].id], 0, 'An in-flight ingredient retargets the newly free leftmost cell');
assert.deepEqual(prep.effects.find(e => e.event.type === 'recipeAccepted').origins, [0, 1]);
prep.advance(.2); aligned(prep);
assert.deepEqual(prep.engine.buffer.map(i => i.food), ['celery', 'carrot']);
const prepDraws = record(prep.view()).draws;
near(prepDraws.find(d => d.id === 'celery' && d.y > 1398).x, M.prepSlot(0).cx);
near(prepDraws.find(d => d.id === 'carrot' && d.y > 1398).x, M.prepSlot(1).cx);
prep.pointer({ x: 464, y: 1570 }); // Stash carrot; existing cells stay packed.
put(prep, ['pepper']);
prep.pointer({ x: 672, y: 1284 }); // Returned carrot precedes in-flight pepper.
aligned(prep);
assert.deepEqual(prep.engine.buffer.map(i => i.food), ['celery', 'carrot']);
prep.advance(.3); aligned(prep);
prep.pointer({ x: 180, y: 1570 }); // Undo pepper.
aligned(prep);
assert.deepEqual(prep.engine.buffer.map(i => i.food), ['celery', 'carrot']);
for (const step of [.3, 1.6]) {
  const simultaneous = prepSession();
  put(simultaneous, ['tomato', 'egg', 'pepper', 'pork', 'celery', 'carrot']);
  simultaneous.advance(step); aligned(simultaneous);
  assert.deepEqual(simultaneous.engine.buffer.map(i => i.food), ['celery', 'carrot']);
  assert.deepEqual(simultaneous.effects.filter(e => e.event.type === 'recipeAccepted').map(e => e.origins), [[0, 1], [2, 3]], 'Simultaneous consumption preserves distinct original cells, including late frames');
}
console.log('PASS prep packs left after cooking, stash/return and undo; incoming reservations stay unique and consumed flights keep original cells');
