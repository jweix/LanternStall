(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('./game-core.js'), require('./board-geometry.js'), require('../data/level-config.js'));
  else root.DapaidangLevels = factory(root.DapaidangCore, root.DapaidangGeometry, root.DapaidangLevelConfig);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Geometry, Data) {
  'use strict';
  const PROFILES = Data.profiles, LIMITS = Data.limits;
  if (Data.version !== 4 || Data.levels.some((d, i) => d.level !== i + 1)) throw Error('Configured levels must be contiguous, starting at level 1.');
  for (const [key, max] of [['maxDishes',24],['maxRecipes',6],['maxIngredients',72],['maxLayers',8]])
    if (!Number.isInteger(LIMITS[key]) || LIMITS[key] < 1 || LIMITS[key] > max) throw Error('Unsupported level limit: ' + key);
  const copy = value => JSON.parse(JSON.stringify(value));
  function random(seed) {
    let value = seed >>> 0;
    return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  function definitionFor(level) {
    if (!Number.isSafeInteger(level) || level < 1) throw Error('Invalid level number.');
    const row = Data.levels.find(d => d.level === level);
    if (row) return copy(row);
    if (level <= Data.levels.length || !Data.repeat.length) throw Error('Missing configured level ' + level);
    const index = (level - Data.levels.length - 1) % Data.repeat.length;
    const bank = Object.keys(Data.seeds || {}).map(Number).filter(n => n > Data.levels.length &&
      (n - Data.levels.length - 1) % Data.repeat.length === index).sort((a, b) => a - b);
    const selected = Data.seeds && Data.seeds[level] !== undefined ? Data.seeds[level] : bank.length ?
      Data.seeds[bank[Math.floor((level - Data.levels.length - 1) / Data.repeat.length) % bank.length]] : undefined;
    return Object.assign(copy(Data.repeat[index]), { level }, selected === undefined ? {} : { seed: selected });
  }
  function profileFor(level, override) {
    const id = override === undefined ? definitionFor(level).difficulty : override;
    const profile = PROFILES.find(p => p.id === id);
    if (!profile) throw Error('Unknown level difficulty: ' + id);
    return copy(profile);
  }
  function createDishPlan(recipes, definition) {
    const orderPlan = definition.orders;
    if (!Array.isArray(orderPlan) || orderPlan.length !== 3 || orderPlan.some(lane => !Array.isArray(lane)))
      throw Error('Level orders must contain exactly three table queues.');
    const ids = [...new Set(orderPlan.flat())], totalDishes = orderPlan.flat().length;
    if (totalDishes < 3 || totalDishes > LIMITS.maxDishes || ids.length > LIMITS.maxRecipes)
      throw Error('Configured dish/recipe count exceeds level limits.');
    const pool = ids.map(id => {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe || ![2, 3].includes(recipe.ingredients.length)) throw Error('Unknown or invalid recipe: ' + id);
      return recipe;
    });
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++)
      if (Core.subset(pool[i].ingredients, pool[j].ingredients) || Core.subset(pool[j].ingredients, pool[i].ingredients))
        throw Error('Conflicting configured recipes: ' + pool[i].id + '/' + pool[j].id);
    const unique = orderPlan.map(lane => [...new Set(lane)]);
    for (const a of unique[0]) for (const b of unique[1]) for (const c of unique[2]) {
      const menus = [a, b, c].map(id => pool.find(r => r.id === id));
      if (menus[0].ingredients.some(food => menus.slice(1).every(r => r.ingredients.includes(food))))
        throw Error('All three tables share an ingredient: ' + [a, b, c].join('/'));
    }
    const dishes = [], ingredients = {};
    orderPlan.forEach((lane, slot) => [...new Set(lane)].forEach(id => {
      const quantity = lane.filter(r => r === id).length, recipe = pool.find(r => r.id === id);
      dishes.push({ recipeId: id, slot, quantity });
      recipe.ingredients.forEach(food => { ingredients[food] = (ingredients[food] || 0) + quantity; });
    }));
    const total = Object.values(ingredients).reduce((a, b) => a + b, 0);
    if (total > LIMITS.maxIngredients || Object.keys(ingredients).length > 14) throw Error('Ingredient budget exceeds level limits.');
    if (total >= 20 && Math.max(...Object.values(ingredients)) > Math.ceil(total * LIMITS.maxIngredientRatio))
      throw Error('Configured ingredients are too concentrated.');
    return { pool, dishes, ingredients, total, totalDishes, orderPlan: copy(orderPlan) };
  }
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
      if (foods.length === plan.total) return finished(plan, cursors) && size(buffer) === 0;
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
    const graph = Geometry.graph(tiles), deepest = Math.max(...tiles.map(t => t.layer));
    let best = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const removed = new Set(), solution = [];
      for (const food of sequence.foods) {
        const free = tiles.map((n, i) => ({ n, i })).filter(({ i }) => !removed.has(i) && graph[i].every(p => removed.has(p)));
        const ranked = free.map(({ n, i }) => ({ n, i, score: rng() + (deepest - n.layer) * .75 }));
        ranked.sort((a, b) => b.score - a.score);
        const pick = ranked[0];
        pick.n.food = food; removed.add(pick.i); solution.push(pick.n.id);
      }
      const opening = tiles.filter((_, i) => !graph[i].length), counts = {};
      opening.forEach(t => { counts[t.food] = (counts[t.food] || 0) + 1; });
      const openingMax = Math.max(...Object.values(counts)), ceiling = Math.ceil(opening.length * LIMITS.maxOpeningRatio);
      let adjacent = 0;
      for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i], b = tiles[j];
        if (a.layer === b.layer && a.food === b.food && Math.hypot(a.x - b.x, a.y - b.y) < a.w * 1.1) adjacent++;
      }
      const score = openingMax * 5 + adjacent;
      if (openingMax <= ceiling && (!best || score < best.score))
        best = { score, foods: tiles.map(t => t.food), solution, openingCount: opening.length, openingMax, adjacentPairs: adjacent };
    }
    if (!best) throw Error('No placement meets the opening ingredient concentration limit.');
    tiles.forEach((t, i) => { t.food = best.foods[i]; });
    return Object.assign(best, { blockerCount: graph.reduce((n, parents) => n + parents.length, 0) });
  }
  function verifySolution(config) {
    const engine = new Core.Engine(config);
    let peak = 0;
    for (const id of config.solution) {
      if (!engine.selectTile(id).ok) throw Error('Generated route violates geometry or capacity.');
      peak = Math.max(peak, engine.buffer.length + engine.incoming.length);
      engine.tick(.3);
      if (engine.wok || engine.queue.length || engine.deliveries.length) engine.tick(120);
      engine.drainEvents();
    }
    engine.tick(120);
    if (engine.status !== 'won') throw Error('Generated route did not serve all planned dishes.');
    return { peak, revenue: engine.revenue };
  }
  function verifyBurst(config) {
    for(const interval of [.01,.05,.1]){
      const e=new Core.Engine(config);let cursor=0,guard=0;
      while(cursor<config.solution.length&&e.status==='playing'&&guard++<10000){
        if(e.selectTile(config.solution[cursor]).ok){cursor++;e.tick(interval);}
        else{
          // No selection is possible while full. Skip empty input frames on the
          // same interval grid, retaining every intervening engine deadline.
          const due=Math.min(Infinity,...e.incoming.map(i=>i.arriveAt),...e.orders.filter(o=>o.replaceAt!==null).map(o=>o.replaceAt));
          if(!Number.isFinite(due))throw Error('Continuous input route deadlocked.');
          e.tick(Math.max(1,Math.ceil((due-e.now)/interval-1e-8))*interval);
        }
      }
      e.tick(120);if(cursor!==config.tiles.length||e.status!=='won')throw Error('Continuous input route diverged.');
    }
  }
  function createLevel(recipes, layout, number, options) {
    const level = Math.max(1, Math.floor(Number(number) || 1));
    if (!Number.isSafeInteger(level)) throw Error('Invalid level number.');
    const settings = options || {}, definition = copy(settings.definition || definitionFor(level));
    const profile = settings.difficulty === undefined ? profileFor(level, definition.difficulty) : profileFor(level, settings.difficulty);
    const seed = settings.seed === undefined ? definition.seed === undefined ? Math.imul(level, 7919) >>> 0 : definition.seed : settings.seed;
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid 32-bit level seed.');
    if (definition.layers > LIMITS.maxLayers) throw Error('Configured layers exceed the global limit.');
    const plan = createDishPlan(recipes, definition);
    const tiles = Geometry.create(layout, definition.shape, plan.total, definition.layers, seed);
    let sequence, placed, verified, attempts=0, lastError;
    for(;attempts<24;attempts++){
      try{
        const salt=Math.imul(attempts,0x27d4eb2d);
        sequence=createFoodSequence(plan,profile,random(seed^0x9e3779b9^salt));
        placed=placeFoods(tiles,sequence,random(seed^0x85ebca6b^salt));
        const check={level,recipes:plan.pool,tiles,orderPlan:plan.orderPlan,solution:placed.solution};
        verified=verifySolution(check);verifyBurst(check);break;
      }catch(error){lastError=error;}
    }
    if(attempts===24)throw lastError;
    let hash = 2166136261;
    for (const ch of JSON.stringify([definition, plan.pool, layout.board],(key,value)=>['greedyTarget','lookaheadTarget','toolTarget'].includes(key)?undefined:value)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    const config = { level, seed, generatorVersion: 4, contentId: 'v4-' + level + '-' + hash.toString(16) + '-' + seed,
      difficulty: profile.id, difficultyName: profile.name, shape: definition.shape, shapeName: Geometry.templates[definition.shape].name,
      tools: {undo:0,stash:0,shuffle:0}, rescueLimit: LIMITS.rescueAdsPerRun, recipes: copy(plan.pool), tiles, orderPlan: plan.orderPlan, solution: placed.solution, dishPlan: plan.dishes,
      ingredientCounts: plan.ingredients, definition };

    config.metrics = { generationAttempts:attempts+1, totalDishes: plan.totalDishes, tileCount: plan.total, layerCount: definition.layers,
      witnessPeak: verified.peak, witnessMean: sequence.pressure.reduce((a, b) => a + b, 0) / plan.total,
      blockerCount: placed.blockerCount, recipeTypes: plan.pool.length, ingredientTypes: Object.keys(plan.ingredients).length,
      dominantIngredientCount: Math.max(...Object.values(plan.ingredients)), openingCount: placed.openingCount,
      openingDominantCount: placed.openingMax, adjacentPairs: placed.adjacentPairs,
      doubleDishes: plan.dishes.filter(d => plan.pool.find(r => r.id === d.recipeId).ingredients.length === 2).reduce((n, d) => n + d.quantity, 0),
      tripleDishes: plan.dishes.filter(d => plan.pool.find(r => r.id === d.recipeId).ingredients.length === 3).reduce((n, d) => n + d.quantity, 0),
      expectedRevenue: verified.revenue };
    return config;
  }
  function probeLevel(config, policy, seed) {
    if (!['random', 'greedy', 'unlock'].includes(policy)) throw Error('Unknown probe policy.');
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
        const unlock = graph.filter(parents => parents.includes(n.id) && parents.every(id => id === n.id || removed.has(id))).length;
        const score = policy === 'random' ? rng() : Number(match) * 100 + progress * 10 + (policy === 'unlock' ? unlock * 3 : 0) -
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
  return { createLevel, definitionFor, profileFor, createDishPlan, verifySolution, probeLevel, PROFILES, LIMITS };
});
