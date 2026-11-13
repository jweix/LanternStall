'use strict';
const assert = require('node:assert/strict');
const { Engine, subset, overlap } = require('../shared/core/game-core.js');
const { createLevel, probeLevel, PROFILES } = require('../shared/core/levels.js');
const recipes = require('../shared/data/recipes.json');
const layout = require('../shared/data/layout.json');
const tally = list => list.reduce((counts, id) => { counts[id] = (counts[id] || 0) + 1; return counts; }, {});
function replay(config, route) {
  const engine = new Engine(config);
  let peak = 0;
  for (const id of route) {
    assert(engine.available(id));
    assert(engine.selectTile(id).ok);
    peak = Math.max(peak, engine.buffer.length + engine.incoming.length);
    assert(peak <= 7);
    engine.tick(.3);
    if (engine.wok || engine.queue.length || engine.deliveries.length) engine.tick(10);
  }
  engine.tick(10);
  return { engine, peak };
}
const initialData = JSON.stringify({ recipes, layout });
const coverage = new Set();
for (const profile of PROFILES) {
  for (let level = 1; level <= 100; level++) {
    const options = { difficulty: profile.id, seed: level * 137 };
    const config = createLevel(recipes, layout, level, options);
    assert.deepEqual(config, createLevel(recipes, layout, level, options));
    assert.equal(config.recipes.length, profile.recipeCount);
    assert.equal(config.tiles.length, 40);
    assert.equal(config.tiles.filter(t => t.layer === 1).length, 25);
    assert.equal(config.tiles.filter(t => t.layer === 0).length, 15);
    assert.equal(new Set(config.tiles.map(t => t.id)).size, 40);
    assert.equal(new Set(config.solution).size, 40);
    const plannedIngredients = {}, plannedDishes = {};
    for (const dish of config.dishPlan) {
      coverage.add(dish.recipeId);
      plannedDishes[dish.recipeId] = dish.quantity;
      const recipe = recipes.find(r => r.id === dish.recipeId);
      for (const food of recipe.ingredients) plannedIngredients[food] = (plannedIngredients[food] || 0) + dish.quantity;
      assert.equal(config.orderPlan[dish.slot].filter(id => id === dish.recipeId).length, dish.quantity);
    }
    assert.deepEqual(tally(config.orderPlan.flat()), plannedDishes);
    assert.deepEqual(config.ingredientCounts, plannedIngredients);
    assert.deepEqual(tally(config.tiles.map(t => t.food)), plannedIngredients);
    assert.equal(Object.values(plannedIngredients).reduce((a, b) => a + b), 40);
    // Every future menu is safe against any other table's current menu.
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      for (const x of new Set(config.orderPlan[a])) for (const y of new Set(config.orderPlan[b])) {
        const r = recipes.find(r => r.id === x), s = recipes.find(r => r.id === y);
        assert(!subset(r.ingredients, s.ingredients) && !subset(s.ingredients, r.ingredients));
      }
    }
    const { engine, peak } = replay(config, config.solution);
    assert.equal(engine.status, 'won');
    assert.equal(peak, config.metrics.witnessPeak);
    assert(peak <= profile.prepLimit);
    assert.deepEqual(engine.tools, { undo: 1, stash: 2, hint: 1 });
    assert(engine.nodes.every(n => n.removed));
    assert.equal(engine.buffer.length + engine.incoming.length + engine.stashItems.length, 0);
    const served = engine.drainEvents().filter(e => e.type === 'dishServed');
    assert.deepEqual(tally(served.map(e => e.recipeId)), plannedDishes);
    const revenue = config.dishPlan.reduce((n, d) => n + d.quantity * recipes.find(r => r.id === d.recipeId).payout, 0);
    assert.equal(engine.revenue, revenue);
    assert.equal(config.metrics.expectedRevenue, revenue);
  }
}
assert.equal(coverage.size, 20);
assert.equal(JSON.stringify({ recipes, layout }), initialData);
console.log('PASS 400 seeded decks: exact dishes/materials, geometric witness, seven slots, no tools, exact payouts');

// Check the probe's simplified inventory model against the actual timed engine.
let comparisons = 0;
for (const profile of PROFILES) for (let level = 1; level <= 8; level++) {
  const config = createLevel(recipes, layout, level, { difficulty: profile.id });
  for (const policy of ['random', 'greedy']) for (const seed of [997, 1994, 2991]) {
    const result = probeLevel(config, policy, seed), { engine, peak } = replay(config, result.route);
    assert.equal(engine.status === 'won', result.won);
    assert.equal(peak, result.peak);
    comparisons++;
  }
}
console.log('PASS ' + comparisons + ' policy traces agree with real cooking, deliveries and menu replacement');

// Broad, reproducible regression bands; these are bot scores, not human win rates.
const rates = [], randomRates = [];
for (const profile of PROFILES) {
  let wins = 0, randomWins = 0;
  for (let level = 1; level <= 50; level++) {
    const config = createLevel(recipes, layout, level, { difficulty: profile.id });
    for (let trial = 1; trial <= 16; trial++) {
      wins += Number(probeLevel(config, 'greedy', trial * 997).won);
      randomWins += Number(probeLevel(config, 'random', trial * 997).won);
    }
  }
  rates.push(wins / 800); randomRates.push(randomWins / 800);
}
assert(rates[0] >= .95);
assert(rates[1] < rates[0] - .15);
assert(rates[2] < rates[1] - .1);
assert(rates[3] < rates[2] - .03);
assert(randomRates[0] > randomRates[1] + .25);
console.log('PASS difficulty ladder: greedy bot win rates ' + rates.map(n => (n * 100).toFixed(2) + '%').join(' / '));

const finite = new Engine({ recipes, orderPlan: [['d01'], [], []],
  tiles: [{ id: 'a', food: 'tomato', x: 0, y: 0, w: 10, h: 10 },
    { id: 'b', food: 'egg', x: 20, y: 0, w: 10, h: 10 },
    { id: 'c', food: 'tomato', x: 40, y: 0, w: 10, h: 10 }] });
finite.selectTile('a'); finite.selectTile('b'); finite.tick(10);
assert(finite.orders.every(o => o.state === 'completed' && o.recipe === null));
assert.equal(finite.revenue, 32);
finite.tick(100); assert.equal(finite.revenue, 32);
finite.selectTile('c'); finite.tick(10); assert.equal(finite.status, 'failed');
assert.throws(() => new Engine({ recipes, orderPlan: [['d01'], ['d15'], []] }), /Conflicting/);
assert.throws(() => new Engine({ recipes, orderPlan: [['missing'], [], []] }), /Invalid/);
assert.throws(() => createLevel(recipes, layout, 1, { difficulty: 'invalid' }), /Unknown/);
const a = createLevel(recipes, layout, 4, { seed: 42 }), b = createLevel(recipes, layout, 4, { seed: 43 });
assert.notDeepEqual(a.tiles, b.tiles);
assert.equal(a.difficulty, 'expert');
for (const t of a.tiles.filter(t => t.layer === 0)) assert(a.tiles.some(top => top.layer > t.layer && overlap(t, top)));
console.log('PASS finite menus never invent extra orders; conflicts, seeds and difficulty inputs are checked');
