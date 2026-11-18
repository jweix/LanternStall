(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('../../../../shared/core/game-core.js'), require('../../../../shared/core/board-geometry.js'),
    require('../../../../shared/core/levels.js'), require('../../../../shared/core/level-search.js'), require('./tool-gate.js'));
  else root.DapaidangToolGateGenerator = factory(root.DapaidangCore, root.DapaidangGeometry, root.DapaidangLevels, root.DapaidangSearch, root.DapaidangToolGate);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Geometry, Levels, Search, Gate) {
  'use strict';
  const VERSION = 1, EXPERIMENT_VERSION = 2, copy = value => JSON.parse(JSON.stringify(value));
  function integer(value, min, max, name) {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw Error(name + ' must be an integer in ' + min + '..' + max);
    return value;
  }
  function fields(object, allowed, name) {
    if (!object || Array.isArray(object) || typeof object !== 'object') throw Error(name + ' must be an object.');
    for (const key of Object.keys(object)) if (!allowed.includes(key)) throw Error('Unknown ' + name + ' field: ' + key);
  }
  function normalize(input) {
    fields(input, ['mode','version','id','level','seed','orders','shape','layers','solvability','requiredTool','toolUses','gate','generation'], 'definition');
    if (input.mode !== 'tool-gate' || input.version !== VERSION || input.solvability !== 'requires-tool') throw Error('Expected mode=tool-gate, version=1, solvability=requires-tool.');
    if (input.requiredTool !== 'stash' || input.toolUses !== 1) throw Error('This generator supports exactly one stash use.');
    if (typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(input.id)) throw Error('id must contain 1–40 letters, digits, underscores or hyphens.');
    if (!Object.prototype.hasOwnProperty.call(Geometry.templates, input.shape)) throw Error('Unknown board shape.');
    fields(input.gate || {}, ['minPicks','maxPicks'], 'gate');
    fields(input.generation || {}, ['maxAttempts','maxSearchNodes'], 'generation');
    const d = { mode: 'tool-gate', version: VERSION, id: input.id,
      level: integer(input.level === undefined ? 99 : input.level, 1, 10000, 'level'),
      seed: integer(input.seed === undefined ? 0 : input.seed, 0, 0xffffffff, 'seed'),
      solvability: 'requires-tool', requiredTool: 'stash', toolUses: 1,
      orders: copy(input.orders || []), shape: input.shape, layers: integer(input.layers, 2, 8, 'layers'),
      gate: { minPicks: integer(input.gate?.minPicks === undefined ? 8 : input.gate.minPicks, 8, 10, 'gate.minPicks'),
        maxPicks: integer(input.gate?.maxPicks === undefined ? 10 : input.gate.maxPicks, 8, 10, 'gate.maxPicks') },
      generation: { maxAttempts: integer(input.generation?.maxAttempts === undefined ? 128 : input.generation.maxAttempts, 1, 512, 'generation.maxAttempts'),
        maxSearchNodes: integer(input.generation?.maxSearchNodes === undefined ? 20000 : input.generation.maxSearchNodes, 1, 100000, 'generation.maxSearchNodes') } };
    if (d.gate.minPicks > d.gate.maxPicks) throw Error('gate.minPicks cannot exceed gate.maxPicks.');
    return d;
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function hash(value) {
    let result = 2166136261;
    for (const ch of stable(value)) result = Math.imul(result ^ ch.charCodeAt(0), 16777619) >>> 0;
    return result.toString(16).padStart(8, '0');
  }
  function random(seed) { let n = seed >>> 0; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function shuffle(list, rng) {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function replay(config, actions, interval) {
    const e = new Core.Engine(config); let peak = 0, combinedPeak = 0;
    for (const a of actions) {
      let accepted = false;
      for (let tries = 0; tries < 100 && !accepted; tries++) {
        if (a.type === 'pick') accepted = e.selectTile(a.id).ok;
        else if (a.type === 'return') accepted = e.returnStash(a.index);
        else if (a.type === 'ad-stash') accepted = e.applyRewardedRescue('stash', e.levelId + '/tool-gate-' + e.rescueCount);
        else throw Error('Unsupported tool-gate witness action.');
        if (!accepted) { const due = e._nextDue(); if (!Number.isFinite(due)) break; e.tick(Math.max(0, due - e.now)); }
      }
      if (!accepted) throw Error('Tool-gate replay rejected ' + JSON.stringify(a));
      peak = Math.max(peak, e.buffer.length + e.incoming.length);
      combinedPeak = Math.max(combinedPeak, e.buffer.length + e.incoming.length + e.stashItems.length);
      if (interval === null) { e.tick(.3); e.tick(120); } else e.tick(interval);
    }
    e.tick(120);
    if (e.status !== 'won' || e.rescueCount !== 1 || !e.toolUsed.stash || e.toolUsed.undo || e.toolUsed.shuffle || e.jobs.length !== config.orderPlan.length)
      throw Error('Tool-gate witness must serve every dish using exactly one rewarded stash.');
    return { interval, status: e.status, ads: e.rescueCount, toolUsed: e.toolUsed, peak, combinedPeak,
      revenue: e.revenue, served: e.jobs.length, buffer: e.buffer.length, stash: e.stashItems.length };
  }
  function generate(recipes, layout, input) {
    const d = normalize(input), plan = Levels.createDishPlan(recipes, d);
    const geometry = Geometry.create(layout, d.shape, plan.total, d.layers, d.seed), graph = Geometry.graph(geometry);
    const initialFoods = new Set(d.orders.slice(0, 3).flatMap(id => plan.pool.find(r => r.id === id).ingredients));
    const wanted = [], later = [];
    for (const [food, n] of Object.entries(plan.ingredients)) for (let i = 0; i < n; i++) (initialFoods.has(food) ? wanted : later).push(food);
    if (!later.length) throw Error('No later-only ingredients are available for a capacity barrier; change orders.');
    const rejected = { opening: 0, proof: 0, unsolvableWithTool: 0, unknownWithTool: 0, timedReplay: 0 };
    for (let attempt = 0; attempt < d.generation.maxAttempts; attempt++) {
      const rng = random(d.seed ^ Math.imul(attempt + 1, 0x9e3779b9)), tiles = copy(geometry);
      // Bias current ingredients toward deeper cells, and randomize both foods
      // and positions within a layer. Proof and replay, rather than this bias,
      // decide whether a candidate is accepted.
      const positions = tiles.map(t => ({t, score: t.layer + rng() * .5})).sort((a, b) => a.score - b.score);
      const foods = shuffle(wanted.slice(), rng).concat(shuffle(later.slice(), rng));
      positions.forEach(({t}, i) => { t.food = foods[i]; });
      const openingCounts = {};
      tiles.forEach((t, i) => { if (!graph[i].length) openingCounts[t.food] = (openingCounts[t.food] || 0) + 1; });
      const openingCount = Object.values(openingCounts).reduce((n, c) => n + c, 0), openingMax = Math.max(...Object.values(openingCounts));
      if (openingMax > Math.ceil(openingCount * Levels.LIMITS.maxOpeningRatio)) { rejected.opening++; continue; }
      const config = { level: d.level, seed: d.seed, generatorVersion: 5, experimentVersion: EXPERIMENT_VERSION,
        experimentId: d.id, toolGateGeneratorVersion: VERSION, difficulty: 'expert', difficultyName: '道具生成 ' + d.id + '（非主线）',
        shape: d.shape, shapeName: Geometry.templates[d.shape].name, recipes: copy(plan.pool), tiles, orderPlan: copy(plan.orderPlan),
        tools: {undo:0,stash:0,shuffle:0}, rescueLimit: 1, definition: copy(d), dishPlan: copy(plan.dishes),
        ingredientCounts: copy(plan.ingredients), solution: [] };
      config.proof = Gate.firstCompletionProof(config);
      if (config.proof.status !== 'unsolvable' || config.proof.minimumPicks < d.gate.minPicks || config.proof.minimumPicks > d.gate.maxPicks) { rejected.proof++; continue; }
      const model = Search.model(config), start = Search.initial(model); start.tools = [0, 1];
      const result = Search.solve(model, start, {tools:true,maxNodes:d.generation.maxSearchNodes});
      if (result.status !== 'solved') { rejected[result.status === 'unknown' ? 'unknownWithTool' : 'unsolvableWithTool']++; continue; }
      config.witnessActions = result.actions.map(a => a.type === 'stash' ? {type:'ad-stash'} : a);
      let timings;
      try { timings = [null,.01,.05,.1].map(interval => replay(config, config.witnessActions, interval)); }
      catch (_) { rejected.timedReplay++; continue; }
      config.contentId = 'v5-TGg' + VERSION + '-' + d.id + '-' + hash([d, plan.pool, layout.board, tiles, config.witnessActions]);
      config.verification = { noTools: 'proven-unsolvable', oneStash: 'real-engine-verified', timings };
      config.metrics = { generationAttempts: attempt + 1, searchVisited: result.visited, rejected: copy(rejected),
        totalDishes: plan.totalDishes, tileCount: plan.total, layerCount: d.layers, recipeTypes: plan.pool.length,
        ingredientTypes: Object.keys(plan.ingredients).length, dominantIngredientCount: Math.max(...Object.values(plan.ingredients)),
        openingCount, openingDominantCount: openingMax, blockerCount: graph.reduce((n, p) => n + p.length, 0),
        witnessPeak: timings[0].peak, combinedPeak: timings[0].combinedPeak, expectedRevenue: timings[0].revenue };
      return config;
    }
    const error = new Error('No verified tool-gate candidate after ' + d.generation.maxAttempts + ' attempts: ' + JSON.stringify(rejected) + '. Increase the budget or change orders/shape/layers/gate.');
    error.rejected = rejected; throw error;
  }
  function verify(config, recipes, layout) {
    if (!config || config.experimentVersion !== EXPERIMENT_VERSION || config.toolGateGeneratorVersion !== VERSION) throw Error('Unsupported generated tool-gate version.');
    const fresh = generate(recipes, layout, config.definition);
    for (const field of ['contentId','tiles','orderPlan','recipes','witnessActions','proof'])
      if (stable(fresh[field]) !== stable(config[field])) throw Error('Generated tool-gate data mismatch: ' + field);
    // Return canonical, newly verified data. Imported motion/tool flags are not trusted.
    return fresh;
  }
  return { VERSION, EXPERIMENT_VERSION, normalize, generate, verify, replay };
});
