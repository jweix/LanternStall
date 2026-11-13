(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./game-core.js'));
  else root.DapaidangLevels = factory(root.DapaidangCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';

  // All profiles retain 25 upper + 15 lower cards and the same seven-slot rule.
  const PROFILES = [
    { id: 'easy', name: '入门', tripleDishes: 4, tripleRecipes: 1, recipeCount: 3, prepLimit: 3, bury: 0, mixing: 0 },
    { id: 'normal', name: '家常', tripleDishes: 8, tripleRecipes: 2, recipeCount: 4, prepLimit: 4, bury: .35, mixing: 1 },
    { id: 'hard', name: '忙碌', tripleDishes: 10, tripleRecipes: 3, recipeCount: 5, prepLimit: 6, bury: .75, mixing: 2 },
    { id: 'expert', name: '挑战', tripleDishes: 12, tripleRecipes: 5, recipeCount: 6, prepLimit: 7, bury: 1, mixing: 3 }
  ];
  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  function shuffle(items, rng) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function profileFor(level, override) {
    // First four introduce the ladder; later chapters include a recovery stage.
    const index = level <= 4 ? level - 1 : [1, 2, 1, 2, 3][(level - 5) % 5];
    const profile = override === undefined ? PROFILES[index] : PROFILES.find(p => p.id === override);
    if (!profile) throw Error('Unknown level difficulty: ' + override);
    return profile;
  }
  function compatible(a, b) {
    return !Core.subset(a.ingredients, b.ingredients) && !Core.subset(b.ingredients, a.ingredients);
  }
  function createDishPlan(recipes, profile, level, rng) {
    const anchor = recipes[(level - 1) % recipes.length];
    const candidates = [];
    for (let attempt = 0; attempt < 64; attempt++) {
      const pool = [anchor];
      for (const recipe of shuffle(recipes.filter(r => r !== anchor), rng)) {
        const length = recipe.ingredients.length;
        const target = length === 3 ? profile.tripleRecipes : profile.recipeCount - profile.tripleRecipes;
        if (pool.filter(r => r.ingredients.length === length).length >= target ||
            !pool.every(r => compatible(r, recipe))) continue;
        pool.push(recipe);
      }
      if (pool.length !== profile.recipeCount) continue;
      const variety = new Set(pool.flatMap(r => r.ingredients)).size;
      candidates.push({ pool, score: (profile.mixing === 0 ? -variety : variety) + rng() * 2 });
    }
    if (!candidates.length) throw Error('Need a compatible recipe pool with both recipe lengths.');
    candidates.sort((a, b) => b.score - a.score);
    const pool = shuffle(candidates[0].pool, rng);
    const quantities = pool.map(() => 1);
    // Solve 2 * doubleDishes + 3 * tripleDishes = 40 before placing any food.
    for (const length of [2, 3]) {
      const slots = pool.map((r, i) => r.ingredients.length === length ? i : -1).filter(i => i >= 0);
      const total = length === 3 ? profile.tripleDishes : (40 - 3 * profile.tripleDishes) / 2;
      for (let n = slots.length; n < total; n++) quantities[slots[(n - slots.length) % slots.length]]++;
    }
    const workloads = [0, 0, 0], orderPlan = [[], [], []];
    const dishes = pool.map((r, i) => {
      const slot = i < 3 ? i : workloads.indexOf(Math.min(...workloads));
      workloads[slot] += quantities[i] * r.ingredients.length;
      orderPlan[slot].push(...Array(quantities[i]).fill(r.id));
      return { recipeId: r.id, slot, quantity: quantities[i] };
    });
    const ingredients = {};
    dishes.forEach((d, i) => pool[i].ingredients.forEach(food => {
      ingredients[food] = (ingredients[food] || 0) + d.quantity;
    }));
    return { pool, dishes, ingredients, orderPlan: orderPlan.map(lane => shuffle(lane, rng)) };
  }

  function createGeometry(layout, profile, rng) {
    const b = layout.board;
    const geometry = cell => ({
      x: b.left + cell % b.cols * (b.tileW + b.gapX) + b.tileW / 2,
      y: b.top + Math.floor(cell / b.cols) * b.stepY + b.tileH / 2,
      w: b.tileW, h: b.tileH
    });
    const top = Array.from({ length: b.cols * b.rows }, (_, cell) =>
      Object.assign(geometry(cell), { id: 'top-' + cell, layer: 1, food: '' }));
    const cells = top.map((_, cell) => {
      const lower = Object.assign(geometry(cell), { id: 'under-' + cell, layer: 0, food: '' });
      lower.x += b.lowerOffsetX; lower.y += b.lowerOffsetY;
      const blockers = top.filter(t => Core.overlap(lower, t)).length;
      // Edges need fewer removals; interior cards can have four blockers.
      return { lower, score: blockers * (profile.bury * 2 - 1) + rng() * .9 };
    }).sort((a, b) => b.score - a.score);
    return cells.slice(0, b.lowerCells.length).map(c => c.lower).concat(top);
  }
  // A small, animation-free inventory model for constructive generation and probes.
  // The final witness is checked against the real Engine, including all deliveries.
  function activeRecipes(plan, cursors) {
    return plan.orderPlan.map((lane, slot) => plan.pool.find(r => r.id === lane[cursors[slot]]));
  }
  function consume(plan, cursors, buffer) {
    const rest = Object.assign({}, buffer), nextCursors = cursors.slice();
    let matched = 0, changed = true;
    while (changed) {
      changed = false;
      const active = activeRecipes(plan, nextCursors);
      for (let slot = 0; slot < 3; slot++) {
        const recipe = active[slot];
        if (!recipe || !recipe.ingredients.every(food => rest[food] > 0)) continue;
        for (const food of recipe.ingredients) rest[food]--;
        nextCursors[slot]++; matched++; changed = true; break;
      }
    }
    return { buffer: rest, cursors: nextCursors, matched };
  }
  const size = buffer => Object.values(buffer).reduce((a, b) => a + b, 0);
  function missing(plan, cursors, buffer) {
    return Math.min(Infinity, ...activeRecipes(plan, cursors).filter(Boolean).map(r =>
      r.ingredients.filter(food => !buffer[food]).length));
  }
  const finished = (plan, cursors) => plan.orderPlan.every((lane, i) => cursors[i] === lane.length);
  function createFoodSequence(plan, profile, rng) {
    const stock = Object.assign({}, plan.ingredients), foods = [], pressure = [], rejected = new Set();
    const foodIds = Object.keys(stock);
    let visited = 0;
    function search(cursors, buffer) {
      if (++visited > 20000) throw Error('Ingredient scheduling exceeded its bounded search budget.');
      if (foods.length === 40) return finished(plan, cursors) && size(buffer) === 0;
      const held = size(buffer), choices = [];
      const key = cursors.join(',') + ':' + foodIds.map(food => buffer[food] || 0).join(',');
      if (rejected.has(key)) return false;
      for (const food of foodIds) {
        if (!stock[food] || held >= profile.prepLimit) continue;
        const next = consume(plan, cursors, Object.assign({}, buffer, { [food]: (buffer[food] || 0) + 1 }));
        const after = size(next.buffer), need = missing(plan, next.cursors, next.buffer);
        if (!finished(plan, next.cursors) ? after + need > profile.prepLimit : after !== 0) continue;
        // Prefer immediate matches for easy; interleave unfinished and future
        // dishes for higher tiers. Backtrack if a later menu would strand food.
        const score = profile.mixing === 0 ? next.matched * 20 - need * 3 + rng() :
          after * 4 - next.matched * (3 + profile.mixing * 2) + rng() * 3;
        choices.push({ food, next, score });
      }
      choices.sort((a, b) => b.score - a.score);
      for (const pick of choices) {
        pressure.push(held + 1); foods.push(pick.food); stock[pick.food]--;
        if (search(pick.next.cursors, pick.next.buffer)) return true;
        stock[pick.food]++; foods.pop(); pressure.pop();
      }
      rejected.add(key); return false;
    }
    if (!search([0, 0, 0], {})) throw Error('Cannot schedule planned ingredients within prep capacity.');
    return { foods, pressure };
  }
  function placeFoods(tiles, sequence, rng) {
    const graph = tiles.map(n => tiles.filter(t => t.layer > n.layer && Core.overlap(n, t)).map(t => t.id));
    const removed = new Set(), solution = [];
    for (const food of sequence.foods) {
      const free = tiles.map((n, i) => ({ n, i })).filter(({ n, i }) =>
        !removed.has(n.id) && graph[i].every(id => removed.has(id)));
      const ranked = free.map(({ n }) => ({ n, score: rng() + (n.layer === 0 ? 1 : 0) }));
      ranked.sort((a, b) => b.score - a.score);
      const node = ranked[0].n;
      node.food = food; removed.add(node.id); solution.push(node.id);
    }
    return { solution, blockerCount: graph.reduce((n, parents) => n + parents.length, 0) };
  }
  function verifySolution(config) {
    const engine = new Core.Engine(config);
    let peak = 0;
    for (const id of config.solution) {
      if (!engine.selectTile(id).ok) throw Error('Generated route violates geometry or capacity.');
      peak = Math.max(peak, engine.buffer.length + engine.incoming.length);
      engine.tick(.3);
      // Wait only in the witness/probe; player input remains fully nonblocking.
      if (engine.wok || engine.queue.length || engine.deliveries.length) engine.tick(10);
      engine.drainEvents();
    }
    engine.tick(10);
    if (engine.status !== 'won') throw Error('Generated route did not serve all planned dishes.');
    return { peak, revenue: engine.revenue };
  }
  function createLevel(recipes, layout, number, options) {
    const level = Math.max(1, Math.floor(Number(number) || 1));
    if (!Number.isSafeInteger(level)) throw Error('Invalid level number.');
    const settings = options || {}, profile = profileFor(level, settings.difficulty);
    const seed = settings.seed === undefined ? Math.imul(level, 7919) >>> 0 : Number(settings.seed) >>> 0;
    const rng = random(seed), plan = createDishPlan(recipes, profile, level, rng);
    const tiles = createGeometry(layout, profile, rng), sequence = createFoodSequence(plan, profile, rng);
    const placed = placeFoods(tiles, sequence, rng);
    const config = { level, seed, generatorVersion: 2, difficulty: profile.id, difficultyName: profile.name,
      recipes: plan.pool, tiles, orderPlan: plan.orderPlan, solution: placed.solution,
      dishPlan: plan.dishes, ingredientCounts: plan.ingredients };
    const verified = verifySolution(config);
    config.metrics = { witnessPeak: verified.peak, witnessMean: sequence.pressure.reduce((a, b) => a + b, 0) / 40,
      blockerCount: placed.blockerCount, recipeTypes: plan.pool.length, ingredientTypes: Object.keys(plan.ingredients).length,
      doubleDishes: plan.dishes.filter((d, i) => plan.pool[i].ingredients.length === 2).reduce((n, d) => n + d.quantity, 0),
      tripleDishes: profile.tripleDishes, expectedRevenue: verified.revenue };
    return config;
  }

  // Deterministic, bounded policy probes, not estimates of human win probability.
  function probeLevel(config, policy, seed) {
    if (policy !== 'random' && policy !== 'greedy') throw Error('Unknown probe policy.');
    const rng = random(seed), removed = new Set(), route = [], plan = { pool: config.recipes, orderPlan: config.orderPlan };
    const graph = config.tiles.map(n => config.tiles.filter(t => t.layer > n.layer && Core.overlap(n, t)).map(t => t.id));
    let buffer = {}, cursors = [0, 0, 0], peak = 0;
    for (let step = 0; step < config.tiles.length; step++) {
      const held = size(buffer);
      if (held >= 7) return { won: false, removed: step, peak, route };
      const choices = config.tiles.map((n, i) => ({ n, i })).filter(({ n, i }) =>
        !removed.has(n.id) && graph[i].every(id => removed.has(id))).map(({ n, i }) => {
        const picked = Object.assign({}, buffer, { [n.food]: (buffer[n.food] || 0) + 1 });
        const next = consume(plan, cursors, picked), active = activeRecipes(plan, cursors).filter(Boolean);
        const match = active.some(r => r.ingredients.every(food => picked[food] > 0));
        const progress = Math.max(0, ...active.map(r => r.ingredients.includes(n.food) ?
          r.ingredients.filter(f => buffer[f] > 0).length / r.ingredients.length : 0));
        // Only current orders and exposed cards inform this greedy policy.
        const score = policy === 'random' ? rng() : Number(match) * 100 + progress * 10 -
          (buffer[n.food] || 0) * 4 + rng();
        return { n, i, next, score };
      });
      if (!choices.length) return { won: false, removed: step, peak, route };
      choices.sort((a, b) => b.score - a.score);
      const pick = choices[0]; removed.add(pick.n.id); route.push(pick.n.id);
      peak = Math.max(peak, held + 1); buffer = pick.next.buffer; cursors = pick.next.cursors;
    }
    return { won: finished(plan, cursors) && size(buffer) === 0, removed: removed.size, peak, route };
  }
  return { createLevel, profileFor, verifySolution, probeLevel, PROFILES };
});
