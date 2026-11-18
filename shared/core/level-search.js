(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./board-geometry.js'));
  else root.DapaidangSearch = factory(root.DapaidangGeometry);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Geometry) {
  'use strict';
  // Stable decision points only. The real Engine remains the timed replay oracle.
  function model(config) {
    const tiles = config.tiles || config.nodes, recipes = config.recipes;
    if (!config.orderPlan || !tiles || tiles.length > 72) throw Error('Search requires a finite deck of at most 72 cards.');
    return { tiles, recipes, plan: config.orderPlan, menus: config.orderPlan.map(id=>recipes.find(r=>r.id===id)),
      parents: Geometry.graph(tiles), bits: tiles.map((_, i) => 1n << BigInt(i)), full: (1n << BigInt(tiles.length)) - 1n,
      capacity: config.capacity || 7 };
  }
  function initial(m, engine) {
    const index = item => m.tiles.findIndex(t => t.id === item.source?.tileId);
    const buffer = engine ? engine.buffer.map(index) : [], stash = engine ? engine.stashItems.map(index) : [];
    if (buffer.concat(stash).some(i => i < 0)) throw Error('Search cannot model injected ingredients.');
    return { removed: m.tiles.reduce((bits, t, i) => t.removed ? bits | m.bits[i] : bits, 0n), buffer, stash,
      active: engine ? engine.orders.filter(o=>o.recipe).map(o=>o.planIndex).sort((a,b)=>a-b) : Array.from({length:Math.min(3,m.plan.length)},(_,i)=>i), cursor:engine?engine.orderCursor:Math.min(3,m.plan.length),
      tools: engine ? [engine.tools.undo, engine.tools.stash] : [0, 0], used: engine ? [engine.toolUsed.undo, engine.toolUsed.stash] : [false,false], ads: 0 };
  }
  function consume(m, s) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const index of s.active.slice()) {
        const recipe = m.menus[index];
        if (!recipe || !recipe.ingredients.every(food => s.buffer.some(i => m.tiles[i].food === food))) continue;
        for (const food of recipe.ingredients) s.buffer.splice(s.buffer.findIndex(i => m.tiles[i].food === food), 1);
        s.active.splice(s.active.indexOf(index),1);if(s.cursor<m.plan.length)s.active.push(s.cursor++); changed = true;
      }
    }
    s.active.sort((a,b)=>a-b);return s;
  }
  const clone = s => ({ removed: s.removed, buffer: s.buffer.slice(), stash: s.stash.slice(), active:s.active.slice(),cursor:s.cursor, tools: s.tools.slice(), used: s.used.slice(), ads: s.ads });
  const won = (m, s) => s.removed === m.full && !s.buffer.length && !s.stash.length && !s.active.length&&s.cursor===m.plan.length;
  const available = (m, s, i) => !(s.removed & m.bits[i]) && m.parents[i].every(p => s.removed & m.bits[p]);
  function actions(m, s, useTools) {
    const list = [];
    if (s.buffer.length < m.capacity) {
      for (let i = 0; i < m.tiles.length; i++) if (available(m, s, i)) list.push({ type: 'pick', id: m.tiles[i].id, index: i });
      s.stash.forEach((_, index) => list.push({ type: 'return', index }));
    }
    if (useTools && !s.used[0] && s.buffer.length && s.tools[0]) list.push({type:'undo'});
    if (useTools && !s.used[1] && s.buffer.length>=3 && s.tools[1] && !s.stash.length) list.push({type:'stash'});
    if (s.ads > 0 && s.buffer.length) {
      if (!s.used[0]) list.push({ type: 'ad-undo' });
      if (!s.used[1] && s.buffer.length >= 3 && !s.stash.length) list.push({ type: 'ad-stash' });
    }
    return list;
  }
  function apply(m, state, action) {
    const s = clone(state), type = action.type;
    if (type === 'pick') { s.removed |= m.bits[action.index]; s.buffer.push(action.index); consume(m, s); }
    else if (type === 'return') { s.buffer.push(s.stash.splice(action.index, 1)[0]); consume(m, s); }
    else if (type === 'undo' || type === 'ad-undo') {
      s.removed &= ~m.bits[s.buffer.pop()];s.used[0]=true;
      if (type === 'undo') s.tools[0]--; else s.ads--;
    } else if (type === 'stash' || type === 'ad-stash') {
      s.stash.push(...s.buffer.splice(0, 3));s.used[1]=true;
      if (type === 'stash') s.tools[1]--; else s.ads--;
    } else throw Error('Unknown search action.');
    return s;
  }
  function score(m, s, action) {
    if (action.type === 'return') return 15;
    if (action.type !== 'pick') return s.buffer.length >= m.capacity - 1 ? 12 : -25;
    const food = m.tiles[action.index].food, foods = s.buffer.map(i => m.tiles[i].food), picked = foods.concat(food);
    const active = s.active.map(i=>m.menus[i]);
    const match = active.some(r => r.ingredients.every(f => picked.includes(f)));
    const progress = Math.max(0, ...active.map(r => r.ingredients.includes(food) ? r.ingredients.filter(f => foods.includes(f)).length / r.ingredients.length : 0));
    return Number(match) * 100 + progress * 10 - foods.filter(f => f === food).length * 4;
  }
  function solve(m, start, options) {
    const opts = options || {}, budget = opts.maxNodes === undefined ? 5000 : opts.maxNodes;
    const root = clone(start); root.ads = opts.ads === undefined ? root.ads : opts.ads;
    const seen = new Set(), path = [];
    let visited = 0, exhausted = false;
    function search(s) {
      if (won(m, s)) return true;
      if (++visited > budget) { exhausted = true; return false; }
      const key = [s.removed.toString(16), s.cursor,s.active, s.buffer, s.stash, opts.tools ? s.tools : '', s.used, s.ads].join('|');
      if (seen.has(key)) return false;
      const choices = actions(m, s, !!opts.tools).sort((a, b) => score(m, s, b) - score(m, s, a));
      for (const action of choices) {
        path.push(action);
        if (search(apply(m, s, action))) return true;
        path.pop(); if (exhausted) return false;
      }
      seen.add(key); return false;
    }
    const solved = search(root);
    return { status: solved ? 'solved' : exhausted || opts.shuffle ? 'unknown' : 'unsolvable', visited, actions: solved ? path.slice() : [] };
  }
  return { model, initial, consume, clone, won, available, actions, apply, score, solve };
});
