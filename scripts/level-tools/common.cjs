'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const Levels = require('../../shared/core/levels.js'), { Engine } = require('../../shared/core/game-core.js');
const Search = require('../../shared/core/level-search.js');
const recipes = require('../../shared/data/recipes.json'), layout = require('../../shared/data/layout.json');
const Data = require('../../shared/data/level-config.js');
const root = path.resolve(__dirname, '../..');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const metadata = () => ({ generatorVersion: Data.version, recipeHash: hash(recipes), layoutHash: hash(layout), policyVersion: 1,
  note: '稳定决策点、真实引擎回放。策略成绩不代表真人胜率；oracle读取完整信息；lookahead仅看当前订单与可取牌。' });
function rng(seed) { let n = seed >>> 0; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); }
function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { (result.positionals ||= []).push(argv[i]); continue; }
    const name = argv[i].slice(2);
    result[name] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return result;
}
function integer(value, fallback, min, max) {
  const n = Number(value === undefined ? fallback : value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Error('Expected integer in ' + min + '..' + max + ': ' + value);
  return n;
}
function range(value = '1:60') {
  if(String(value).includes(','))return [...new Set(String(value).split(',').flatMap(range))].sort((a,b)=>a-b);
  const parts = String(value).split(':');
  const start = integer(parts[0], 1, 1, 10000), end = integer(parts[1], start, start, 10000);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
function save(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function configFor(level, seed, definition) {
  return Levels.createLevel(recipes, layout, level, { ...(seed === undefined ? {} : { seed }), ...(definition ? { definition } : {}) });
}
function settle(e) { e.tick(.3); if (e.wok || e.queue.length || e.deliveries.length || e.orders.some(o => o.replaceAt !== null)) e.tick(120); e.drainEvents(); }
function toolsFor(budget) { return budget === 'none' ? { undo: 0, stash: 0, hint: 0 } : { undo: 1, stash: 2, hint: 1 }; }
function visibleLookahead(engine, ranked) {
  // Stop at visible menus: successors and newly revealed foods are never inspected.
  const active = engine.orders.filter(o => o.state === 'collecting').map(o => o.recipe.ingredients);
  const initial = engine.buffer.map(i => i.food), roots = ranked.slice(0, 6);
  function explore(foods, menus, left, depth, made) {
    if (!depth || !left.length) return made * 100 - foods.length * 2 + Math.max(0, ...menus.map(r => r.filter(f => foods.includes(f)).length)) * 3;
    let best = -Infinity;
    for (const item of left.slice(0, 6)) {
      const next = foods.concat(item.tile.food), rest = menus.slice(); let count = made;
      if (next.length > 7) continue;
      for (let j = 0; j < rest.length; j++) if (rest[j].every(f => next.includes(f))) {
        for (const f of rest[j]) next.splice(next.indexOf(f), 1);
        rest.splice(j--, 1); count++;
      }
      if (next.length >= 7 && count === made) continue;
      best = Math.max(best, explore(next, rest, left.filter(t => t !== item), depth - 1, count));
    }
    return best === -Infinity ? -1000 + made * 100 : best;
  }
  return roots.map(item => {
    const foods=initial.concat(item.tile.food),menus=active.map(r=>r.slice());let made=0;
    for(let j=0;j<menus.length;j++)if(menus[j].every(f=>foods.includes(f))){
      for(const f of menus[j])foods.splice(foods.indexOf(f),1);
      menus.splice(j--,1);made++;
    }
    return {item,score:explore(foods,menus,roots.filter(t=>t!==item),2,made)};
  }).sort((a,b)=>b.score-a.score)[0]?.item||ranked[0];
}
function probe(config, policy = 'greedy', seed = 997, budget = 'none') {
  if (!['random', 'greedy', 'unlock', 'lookahead'].includes(policy)) throw Error('Unknown policy: ' + policy);
  if (!['none', 'free', 'ad1', 'ad2'].includes(budget)) throw Error('Unknown tool budget: ' + budget);
  const e = new Engine({ ...config, tools: toolsFor(budget) }), random = rng(seed), actions = [], used = { undo: 0, stash: 0, hint: 0, ads: 0 };
  const m = Search.model({ ...config, tiles: e.nodes }), adLimit = budget === 'ad1' ? 1 : budget === 'ad2' ? 2 : 0;
  let steps = 0, peak = 0, avoid = null, unknownRescue = false, guided = null;
  const act = action => {
    let ok;
    if (action.type === 'pick') ok = e.selectTile(action.id).ok;
    else if (action.type === 'return') ok = e.returnStash(action.index);
    else if (action.type === 'hint') ok = e.hint() === action.id;
    else if (action.type.startsWith('ad-')) ok = e.applyRewardedRescue(action.type.slice(3), e.levelId + '/probe-' + actions.length);
    else ok = e[action.type]();
    if (!ok) return false;
    actions.push(action); peak = Math.max(peak, e.buffer.length + e.incoming.length); settle(e); return true;
  };
  while (e.status !== 'won' && steps++ < config.tiles.length + 32) {
    if (e.status === 'failed' || guided?.type.startsWith('ad-')) {
      if (used.ads >= adLimit) break;
      const options = e.rescueOptions(4000, adLimit - used.ads - 1);
      if (!options.length) { unknownRescue = e.continuation({ tools: true, ads: adLimit - used.ads, maxNodes: 4000 }).status === 'unknown'; break; }
      if (!act({ type: 'ad-' + options[0].tool })) break;
      used.ads++; guided = e.continuation({ tools:true, ads:adLimit-used.ads, maxNodes:4000 }).actions[0]; continue;
    }
    const s = Search.initial(m, e);
    const ranked = e.nodes.filter(t => e.available(t.id)).map(tile => {
      const index = e.nodes.indexOf(tile), action = { type: 'pick', id: tile.id, index };
      const unlock = m.parents.filter(parents => parents.includes(index) && parents.every(p => p === index || e.nodes[p].removed)).length;
      return { tile, score: policy === 'random' ? random() : Search.score(m, s, action) +
        (policy === 'unlock' ? unlock * 3 : 0) - (tile.id === avoid ? 20 : 0) + random() };
    }).sort((a, b) => b.score - a.score);
    let pick = policy === 'lookahead' ? visibleLookahead(e, ranked) : ranked[0];
    if(guided){
      if(guided.type==='pick')pick={tile:e.nodes.find(t=>t.id===guided.id)};
      else if(act(guided)){guided=null;continue;}
      guided=null;
    }
    const returns = e.stashItems.map((item, index) => ({ index, score: Search.score(m, s, { type: 'pick', index: e.nodes.findIndex(t => t.id === item.source.tileId) }) }));
    const restore = returns.sort((a, b) => b.score - a.score)[0];
    if (restore && e.buffer.length < 7 && (restore.score >= 100 || !pick || e.nodes.every(t => t.removed))) {
      if (!act({ type: 'return', index: restore.index })) break; continue;
    }
    if (budget !== 'none' && e.buffer.length >= 5 && e.tools.hint) {
      const advice = e.continuation({ maxNodes: 4000 }), first = advice.actions[0];
      if (advice.status === 'solved' && first?.type === 'pick' && act({ type: 'hint', id: first.id })) {
        used.hint++; pick = { tile: e.nodes.find(t => t.id === first.id) };
      }
    }
    if (budget !== 'none' && e.buffer.length === 6 && pick && Search.score(m, s, { type: 'pick', index: e.nodes.indexOf(pick.tile) }) < 100) {
      if (e.tools.stash && e.stashItems.length < 2 && act({ type: 'stash' })) { used.stash++; continue; }
      if (e.tools.undo && e.buffer.at(-1)?.source?.tileId) {
        avoid = e.buffer.at(-1).source.tileId;
        if (act({ type: 'undo' })) { used.undo++; continue; }
      }
    }
    if (!pick || !act({ type: 'pick', id: pick.tile.id })) break;
  }
  e.tick(120);
  return { won: e.status === 'won', removed: e.nodes.filter(t => t.removed).length, peak, used, unknownRescue,
    actions, final: { status: e.status, buffer: e.buffer.map(t => t.food), stash: e.stashItems.map(t => t.food), revenue: e.revenue } };
}
function replay(config, actions, budget = 'none') {
  const e = new Engine({ ...config, tools: toolsFor(budget) });
  for (const action of actions) {
    let ok;
    if (action.type === 'hint') ok = e.hint() === action.id;
    else if (action.type.startsWith('ad-')) ok = e.applyRewardedRescue(action.type.slice(3), e.levelId + '/replay-' + e.rescueCount);
    else if (action.type === 'pick') ok = e.selectTile(action.id).ok;
    else if (action.type === 'return') ok = e.returnStash(action.index);
    else ok = e[action.type]();
    if (!ok) throw Error('Replay rejected ' + JSON.stringify(action)); settle(e);
  }
  e.tick(120); return e;
}
function oracle(config, options = {}) {
  const e = new Engine({...config,motion:{capacity:options.capacity||7}}), m = Search.model({ ...config, tiles:e.nodes,capacity:e.config.capacity });
  const result = Search.solve(m, Search.initial(m, e), options);
  if (result.status === 'solved' && !e.replayActions(result.actions)) throw Error('Oracle/real engine mismatch');
  return result;
}
function minimumCapacity(config,maxNodes=5000){
  let lowerBound=2,upperBound=config.metrics.witnessPeak;const searches=[];
  for(let capacity=2;capacity<upperBound;capacity++){
    const result=oracle(config,{capacity,maxNodes});searches.push({capacity,status:result.status,visited:result.visited});
    if(result.status==='solved'){upperBound=capacity;break;}
    if(result.status==='unsolvable')lowerBound=capacity+1;
  }
  return {lowerBound,upperBound,exact:lowerBound===upperBound,searches};
}
function safeChoices(engine,maxNodes=2000){
  const e=engine.fork();e.paused=false;e.tick(120);
  const choices=e.nodes.filter(t=>e.available(t.id)),counts={total:choices.length,solved:0,unsolvable:0,unknown:0};
  for(const t of choices){const next=e.fork();if(!next.selectTile(t.id).ok){counts.unsolvable++;continue;}settle(next);counts[next.continuation({maxNodes}).status]++;}
  return {...counts,lowerFraction:counts.total?counts.solved/counts.total:0,upperFraction:counts.total?(counts.solved+counts.unknown)/counts.total:0};
}
function replayTimeline(config,timeline,budget='free'){
  const e=new Engine({...config,tools:toolsFor(budget)});
  for(const a of timeline){
    let ok=true;
    if(a.type==='tick')e.tick(a.seconds);
    else if(a.type==='pause')e.pause(a.value);
    else if(a.type==='pick')ok=e.selectTile(a.id).ok;
    else if(a.type==='return')ok=e.returnStash(a.index);
    else if(a.type==='hint')ok=e.hint()===a.id;
    else if(a.type.startsWith('ad-'))ok=e.applyRewardedRescue(a.type.slice(3),e.levelId+'/timeline-'+e.rescueCount);
    else if(a.type==='undo'||a.type==='stash')ok=e[a.type]();
    else throw Error('Unknown timeline action '+a.type);
    if(!ok)throw Error('Timeline rejected '+JSON.stringify(a));
  }
  return e;
}
function snapshot(e){return {status:e.status,revenue:e.revenue,removed:e.nodes.filter(t=>t.removed).length,buffer:e.buffer.map(t=>t.food),stash:e.stashItems.map(t=>t.food),orderCursors:e.orderCursors};}
function writeConfig(data) {
  const lines = ["(function (root, factory) {", "  if (typeof module === 'object' && module.exports) module.exports = factory();", "  else root.DapaidangLevelConfig = factory();", "})(typeof globalThis !== 'undefined' ? globalThis : this, function () {", "  'use strict';",
    '  // Each orders entry is one dish; the three arrays are exact table replacement queues.',
    '  // Recipe ids and ingredients: recipes.json. Edit orders, shape, layers or difficulty, then run levels:generate and npm test.',
    '  const limits = ' + JSON.stringify(data.limits) + ';', '  const profiles = ' + JSON.stringify(data.profiles) + ';', '  const levels = ['];
  data.levels.forEach(d => lines.push('    ' + JSON.stringify(d) + ','));
  lines.push('  ];', '  // After the authored levels, cycle these capped plans; selected seeds remain individually editable.', '  const repeat = [');
  data.repeat.forEach(d => lines.push('    ' + JSON.stringify(d) + ','));
  lines.push('  ];', '  const seeds = ' + JSON.stringify(data.seeds || {}) + ';', '  return { version: 3, limits, profiles, levels, repeat, seeds };', '});', '');
  fs.writeFileSync(path.join(root, 'shared/data/level-config.js'), lines.join('\n'));
}
module.exports = { fs, path, root, Levels, Engine, Search, recipes, layout, Data, metadata, args, integer, range, save, configFor, settle, toolsFor, rng, probe, replay, replayTimeline, snapshot, oracle, minimumCapacity, safeChoices, writeConfig };
