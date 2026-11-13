'use strict';
const assert = require('node:assert/strict');
const { Engine } = require('../shared/core/game-core.js');
const { createLevel } = require('../shared/core/levels.js');
const { Session } = require('../shared/runtime/game-session.js');
const recipes = require('../shared/data/recipes.json');
const layout = require('../shared/data/layout.json');

for (let level = 1; level <= 100; level++) {
  const config = createLevel(recipes, layout, level), engine = new Engine(config);
  assert.equal(engine.revenue, 0);
  assert.equal(config.tiles.length, 40);
  assert.deepEqual(config, createLevel(recipes, layout, level));
  for (const id of config.solution) {
    assert(engine.available(id), 'Solution must respect geometric occlusion');
    assert(engine.selectTile(id).ok);
    engine.tick(.3);
    if (engine.wok || engine.queue.length || engine.deliveries.length) engine.tick(10);
    assert(engine.buffer.length + engine.incoming.length <= 7);
  }
  engine.tick(10);
  assert.equal(engine.status, 'won', 'Level ' + level + ' must be winnable');
  assert.equal(config.solution.length, 40);
  assert(engine.nodes.every(n => n.removed));
  assert.equal(engine.buffer.length + engine.stashItems.length, 0);
}
console.log('PASS 100 deterministic decks consume all 40 ingredients and serve every dish');

let saved = 0;
const s = new Session({ recipes, layout, onProgress: () => saved++ });
const first = s.engine.nodes.find(n => s.engine.available(n.id));
s.pointer(first); assert.equal(s.engine.incoming.length, 1);
s.frame(0); s.setHidden(true); s.frame(300000);
assert.equal(s.engine.now, 0);
s.setHidden(false); s.frame(600000); assert.equal(s.engine.now, 0);
s.frame(600100); assert(Math.abs(s.engine.now - .1) < 1e-6);
s.restart(1);
for (const id of s.config.solution) {
  const tile = s.engine.nodes.find(n => n.id === id);
  assert(s.pointer(tile)); s.advance(.3);
  if (s.engine.wok || s.engine.queue.length || s.engine.deliveries.length) s.advance(10);
}
assert.equal(s.engine.status, 'won'); assert.equal(saved, 1);
const time = s.engine.wonAt, revenue = s.engine.revenue;
s.advance(100); assert.equal(s.engine.playTime, time); assert.equal(s.engine.revenue, revenue); assert.equal(saved, 1);
s.pointer({ x: 464, y: 1118 });
assert.equal(s.level, 2); assert.equal(s.engine.revenue, 0); assert.equal(s.effects.length, 0);
for (const key of ['buffer', 'incoming', 'queue', 'deliveries', 'stashItems']) assert.equal(s.engine[key].length, 0);
assert.equal(s.engine.wok, null);
console.log('PASS lifecycle, result, progress and complete next-level reset');

s.pointer({ x: 160, y: 53 }); assert.equal(s.panel, 'pause');
s.advance(5); assert.equal(s.engine.now, 0);
s.pointer({ x: 464, y: 950 }); assert.equal(s.reducedMotion, true);
s.pointer({ x: 464, y: 825 }); assert.equal(s.panel, null);
s.advance(.1); assert.equal(s.engine.now, .1);
console.log('PASS pause and reduced-motion settings preserve gameplay');

// Pick rapidly into all seven slots, without any arrival yet.
s.restart(1);
for (let i = 0; i < 7; i++) s.pointer(s.engine.nodes.find(n => s.engine.available(n.id)));
assert.equal(s.engine.incoming.length, 7);
assert.equal(new Set(s.engine.incoming.map(i => s.slots[i.id])).size, 7);
const before = s.engine.nodes.filter(n => n.removed).length;
assert.equal(s.pointer(s.engine.nodes.find(n => s.engine.available(n.id))), false);
assert.equal(s.engine.nodes.filter(n => n.removed).length, before);
console.log('PASS rapid touches reserve seven unique slots and reject an eighth');

const pair = () => new Engine({ recipes, initialRecipes: ['d01', 'd02', 'd03'], initialRevenue: 9999,
  tiles: [{ id: 'a', food: 'tomato', x: 0, y: 0, w: 10, h: 10 },
    { id: 'b', food: 'egg', x: 20, y: 0, w: 10, h: 10 }] });
const final = pair();
final.tick(10); assert.equal(final.status, 'playing', 'Revenue alone never completes a level');
assert.equal('target' in final.snapshot(), false);
final.selectTile('a'); final.tick(.3); assert(final.stash());
final.selectTile('b'); final.tick(.3);
assert(final.nodes.every(n => n.removed)); assert.equal(final.status, 'playing', 'Stash must still be used');
assert(final.returnStash()); assert.equal(final.status, 'playing');
final.tick(1.2); assert.equal(final.status, 'playing', 'Empty board and prep must wait for delivery');
assert.equal(final.revenue, 9999);
final.tick(.779); assert.equal(final.status, 'playing');
final.tick(.001); assert.equal(final.status, 'won'); assert.equal(final.revenue, 10031);
assert.equal(final.drainEvents().filter(e => e.type === 'levelWon').length, 1);
console.log('PASS revenue never wins; stash, cooking and final delivery must all complete');

const failed = new Engine({ recipes, initialRecipes: ['d01', 'd02', 'd03'],
  tiles: [{ id: 'only', food: 'tomato', x: 0, y: 0, w: 10, h: 10 }] });
failed.selectTile('only'); failed.tick(.3);
assert.equal(failed.status, 'failed');
assert.equal(failed.drainEvents().filter(e => e.type === 'levelFailed')[0].reason, 'stock-exhausted');
console.log('PASS unfinished leftovers fail without a revenue requirement');
