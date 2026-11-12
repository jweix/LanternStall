(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./game-core.js'));
  else root.DapaidangLevels = factory(root.DapaidangCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';

  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  // Build a finite deck around a legal, simulated route. This is a playable
  // prototype generator, not a claim that the difficulty is production-balanced.
  function createLevel(recipes, layout, number) {
    const level = Math.max(1, Math.floor(Number(number) || 1));
    const rng = random(level * 7919);
    const offset = (level - 1) % recipes.length;
    const candidates = recipes.slice(offset).concat(recipes.slice(0, offset));
    const pool = [candidates[0]];
    const compatible = r => pool.every(p => !Core.subset(r.ingredients, p.ingredients) && !Core.subset(p.ingredients, r.ingredients));
    // Each prototype level has a compatible trio with both recipe lengths.
    // This makes an exact 40-ingredient deck possible and avoids dead stock.
    pool.push(candidates.find(r => r.ingredients.length !== pool[0].ingredients.length && compatible(r)));
    pool.push(candidates.find(compatible));
    const b = layout.board;
    const geometry = cell => ({
      x: b.left + cell % b.cols * (b.tileW + b.gapX) + b.tileW / 2,
      y: b.top + Math.floor(cell / b.cols) * b.stepY + b.tileH / 2,
      w: b.tileW, h: b.tileH
    });
    const tiles = b.lowerCells.map((cell, i) => {
      const g = geometry(cell);
      return Object.assign(g, { id: 'under-' + i, layer: 0,
        x: g.x + b.lowerOffsetX, y: g.y + b.lowerOffsetY, food: '' });
    }).concat(Array.from({ length: b.cols * b.rows }, (_, cell) =>
      Object.assign(geometry(cell), { id: 'top-' + cell, layer: 1, food: '' })));
    const config = { recipes: pool, tiles };
    const planner = new Core.Engine(config);
    const solution = [];
    let turn = 0;
    while (planner.status === 'playing') {
      if (turn > 22) throw new Error('Cannot construct a winning deck.');
      const remaining = tiles.length - solution.length;
      let order = planner.orders[turn++ % 3];
      if (remaining <= 5) order = planner.orders.find(o =>
        o.recipe.ingredients.length <= remaining && remaining - o.recipe.ingredients.length !== 1);
      if (!order) throw new Error('Cannot use the final ingredients.');
      for (const food of order.recipe.ingredients) {
        const free = planner.nodes.filter(n => planner.available(n.id));
        if (!free.length) throw new Error('Not enough tiles for the planned recipes.');
        const node = free[Math.floor(rng() * free.length)];
        node.food = food;
        tiles.find(n => n.id === node.id).food = food;
        solution.push(node.id);
        planner.selectTile(node.id);
        planner.tick(.3);
      }
      planner.tick(3);
    }
    if (planner.status !== 'won') throw new Error('Generated deck is not solvable.');
    return Object.assign(config, { level, solution });
  }

  return { createLevel };
});
