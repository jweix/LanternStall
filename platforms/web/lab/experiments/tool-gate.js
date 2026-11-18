(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('../../../../shared/core/game-core.js'), require('../../../../shared/core/board-geometry.js'),
    require('../../../../shared/core/levels.js'), require('../../../../shared/core/level-search.js'));
  else root.DapaidangToolGate = factory(root.DapaidangCore, root.DapaidangGeometry, root.DapaidangLevels, root.DapaidangSearch);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Geometry, Levels, Search) {
  'use strict';
  // Development-only fixture. It is never loaded by the main game or native builds.
  const definition = {
    level: 99, difficulty: 'expert', shape: 'islands', layers: 7, seed: 0,
    solvability: 'requires-tool', requiredTool: 'stash',
    orders: ['d01', 'd02', 'd03', 'd04', 'd05', 'd04', 'd05'],
    // Bottom to top; each row assigns the left and right island's material.
    foodsByLayer: [
      ['shiitake', 'chicken'], ['pepper', 'pork'], ['tomato', 'egg'],
      ['broccoli', 'shrimp'], ['celery', 'beef'], ['broccoli', 'shrimp'], ['celery', 'beef']
    ]
  };
  const countBits = bits => { let n = 0; for (; bits; bits &= bits - 1n) n++; return n; };
  function firstCompletionProof(config, capacity = 7) {
    // Before the first recipe consumes anything, every selected tile occupies
    // capacity. This bound also covers overlapping flights and delayed menus.
    if (!Number.isInteger(capacity) || capacity < 1 || !config.tiles.length || !config.orderPlan.length || config.tiles.some(t => t.removed))
      throw Error('First-completion proof requires a fresh deck and positive capacity.');
    const graph = Geometry.graph(config.tiles), closures = [];
    function closure(i) {
      if (closures[i] === undefined) closures[i] = graph[i].reduce((bits, p) => bits | closure(p), 1n << BigInt(i));
      return closures[i];
    }
    const rows = config.orderPlan.slice(0, 3).map(recipeId => {
      const recipe = config.recipes.find(r => r.id === recipeId);
      if (!recipe || new Set(recipe.ingredients).size !== recipe.ingredients.length) throw Error('Unsupported initial recipe.');
      const choices = recipe.ingredients.map(food => config.tiles.map((t, i) => t.food === food ? i : -1).filter(i => i >= 0));
      if (choices.some(list => !list.length)) throw Error('Initial recipe lacks ingredients.');
      let minimumPicks = Infinity, best = 0n;
      function enumerate(depth, mask) {
        if (depth === choices.length) { const n = countBits(mask); if (n < minimumPicks) { minimumPicks = n; best = mask; } return; }
        for (const i of choices[depth]) enumerate(depth + 1, mask | closure(i));
      }
      enumerate(0, 0n);
      return { recipeId, minimumPicks, requiredTileIds: config.tiles.filter((_, i) => best & (1n << BigInt(i))).map(t => t.id) };
    });
    const minimumPicks = Math.min(...rows.map(r => r.minimumPicks));
    return { method: 'first-completion-ancestor-union', capacity, minimumPicks, rows,
      status: minimumPicks > capacity ? 'unsolvable' : 'unknown',
      scope: 'Fresh deck, before first dish, no tools; independent of input timing. A bound within capacity does not prove solvability.' };
  }
  function create(recipes, layout) {
    const plan = Levels.createDishPlan(recipes, definition), tiles = Geometry.create(layout, definition.shape, plan.total, definition.layers, definition.seed);
    for (let layer = 0; layer < definition.layers; layer++)
      tiles.filter(t => t.layer === layer).sort((a, b) => a.x - b.x).forEach((t, i) => { t.food = definition.foodsByLayer[layer][i]; });
    const actual = {};
    for (const t of tiles) actual[t.food] = (actual[t.food] || 0) + 1;
    if (Object.keys(actual).length !== Object.keys(plan.ingredients).length || Object.keys(plan.ingredients).some(f => actual[f] !== plan.ingredients[f]))
      throw Error('Tool-gate materials must exactly match the configured menu.');
    let hash = 2166136261;
    for (const ch of JSON.stringify([definition, plan.pool, layout.board])) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    const config = { level: definition.level, seed: definition.seed, generatorVersion: 5,
      experimentId: 'TG01', experimentVersion: 1, contentId: 'v5-TG01-' + hash.toString(16),
      difficulty: 'expert', difficultyName: '道具验证 TG01（非主线）', shape: definition.shape, shapeName: '七层双岛',
      recipes: plan.pool, tiles, orderPlan: plan.orderPlan, tools: { undo: 0, stash: 0, shuffle: 0 }, rescueLimit: 1,
      definition: JSON.parse(JSON.stringify(definition)), dishPlan: plan.dishes, ingredientCounts: plan.ingredients, solution: [] };
    config.proof = firstCompletionProof(config);
    if (config.proof.status !== 'unsolvable') throw Error('Tool-gate fixture lost its no-tool impossibility proof.');
    const model = Search.model(config), start = Search.initial(model); start.tools = [0, 1];
    const solved = Search.solve(model, start, { tools: true, maxNodes: 20000 });
    if (solved.status !== 'solved') throw Error('Tool-gate fixture lacks a one-move-out witness.');
    config.witnessActions = solved.actions.map(a => a.type === 'stash' ? { type: 'ad-stash' } : a);
    const engine = new Core.Engine(config);
    if (!engine.replayActions(config.witnessActions) || engine.rescueCount !== 1) throw Error('Tool-gate real-engine witness failed.');
    const graph = Geometry.graph(tiles), opening = tiles.filter((_, i) => !graph[i].length), openingCounts = {};
    for (const t of opening) openingCounts[t.food] = (openingCounts[t.food] || 0) + 1;
    config.metrics = { totalDishes: plan.totalDishes, tileCount: plan.total, layerCount: definition.layers,
      recipeTypes: plan.pool.length, ingredientTypes: Object.keys(actual).length,
      dominantIngredientCount: Math.max(...Object.values(actual)), openingCount: opening.length,
      openingDominantCount: Math.max(...Object.values(openingCounts)), blockerCount: graph.reduce((n, p) => n + p.length, 0),
      expectedRevenue: engine.revenue };
    return config;
  }
  return { definition, create, firstCompletionProof };
});
