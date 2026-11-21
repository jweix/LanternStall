'use strict';
const assert=require('node:assert/strict');
const C=require('../scripts/level-tools/common.cjs'),Geometry=require('../shared/core/board-geometry.js');
const original=JSON.stringify({recipes:C.recipes,layout:C.layout,data:C.Data});
const full=process.argv.includes('--full'),samples=full?10000:400,coverage=new Set(),shapes=new Set(),sizes=new Set();
const tally=list=>list.reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
function check(config){
 const expected={},dishes={};
 config.orderPlan.forEach(id=>{dishes[id]=(dishes[id]||0)+1;for(const f of C.recipes.find(r=>r.id===id).ingredients)expected[f]=(expected[f]||0)+1;coverage.add(id);});
 assert.deepEqual(config.ingredientCounts,expected);assert.deepEqual(tally(config.tiles.map(t=>t.food)),expected);
 assert.equal(config.tiles.length,Object.values(expected).reduce((a,b)=>a+b,0));assert.equal(config.solution.length,config.tiles.length);
 assert.equal(new Set(config.solution).size,config.tiles.length);assert(config.tiles.length<=72);assert(config.metrics.totalDishes<=24);assert(config.recipes.length<=6);
 assert.equal(config.tiles.length,config.metrics.totalDishes*2+config.metrics.tripleDishes);
 assert.equal(config.metrics.totalDishes,config.orderPlan.length);
 assert.equal(config.generatorVersion,5);assert.equal(config.metrics.openingCount,config.tiles.filter((_,i)=>!Geometry.graph(config.tiles)[i].length).length);
 assert(config.metrics.openingDominantCount<=Math.ceil(config.metrics.openingCount*.3));
 if(config.tiles.length>=20)assert(config.metrics.dominantIngredientCount<=Math.ceil(config.tiles.length*.2));
 const area=C.layout.board.area;
 for(const t of config.tiles){assert(t.x-t.w/2>=area.left);assert(t.x+t.w/2<=area.left+area.width);assert(t.y-t.h/2>=area.top);assert(t.y+t.h/2<=area.top+area.height);}
 for(let a=0;a<config.tiles.length;a++)for(let b=a+1;b<config.tiles.length;b++)if(config.tiles[a].layer===config.tiles[b].layer)assert(!Geometry.overlap(config.tiles[a],config.tiles[b]));
 const engine=new C.Engine(config);let peak=0;
 for(const id of config.solution){assert(engine.available(id));assert(engine.selectTile(id).ok);peak=Math.max(peak,engine.buffer.length+engine.incoming.length);assert(peak<=7);C.settle(engine);}
 engine.tick(120);assert.equal(engine.status,'won');assert.equal(peak,config.metrics.witnessPeak);
 assert.deepEqual(engine.jobs.map(j=>j.planIndex).sort((a,b)=>a-b),config.orderPlan.map((_,i)=>i),'Every global entry is completed exactly once');assert.deepEqual(tally(engine.jobs.map(j=>j.recipeId)),dishes);assert(engine.jobs.every(j=>j.state==='served'));
 assert.equal(new Set(engine.jobs.flatMap(j=>j.items.map(i=>i.id))).size,config.tiles.length);
 const revenue=config.orderPlan.reduce((n,id)=>n+C.recipes.find(r=>r.id===id).payout,0);
 assert.equal(engine.revenue,revenue);assert.equal(config.metrics.expectedRevenue,revenue);
 assert.deepEqual(engine.tools,{undo:0,stash:0,shuffle:0});assert.equal(engine.buffer.length+engine.incoming.length+engine.stashItems.length,0);
 shapes.add(config.shape);sizes.add(config.tiles.length);
}
for(let i=0;i<samples;i++){
 const level=i%120+1,options=i<120?{}:{seed:Math.imul(i+1,137)>>>0};
 const config=C.Levels.createLevel(C.recipes,C.layout,level,options);check(config);
 if(i<120)assert.deepEqual(config,C.Levels.createLevel(C.recipes,C.layout,level,options));
}
// Every supported silhouette remains valid even if it is not in this authored chapter.
check(C.configFor(1,42,{...C.Levels.definitionFor(1),shape:'pairs'}));
assert.equal(coverage.size,20);assert.equal(shapes.size,6);for(const n of [11,18,28,32,40,58,64])assert(sizes.has(n),'Missing card count '+n);
const triple=require('../shared/data/daily-menu.js').definition(C.recipes,'2027-01-31',1).orders.slice(0,3);
assert(triple.every(id=>C.recipes.find(r=>r.id===id).ingredients.length===3));
check(C.configFor(1,42,{...C.Levels.definitionFor(1),shape:'lantern',layers:8,orders:Array.from({length:24},(_,i)=>triple[i%3])}));
assert.equal(JSON.stringify({recipes:C.recipes,layout:C.layout,data:C.Data}),original);
console.log('PASS '+samples+' variable decks: exact configured menus/materials, 11–72 cards, six shapes, 2–8 layers, no-tool witnesses and payouts');

// Explore every reachable stable state of the eleven-card tutorial; memoize equivalent histories.
const tutorial=C.configFor(1),seen=new Set();let terminals=0;
function allTutorial(engine){
 const key=JSON.stringify([engine.nodes.map(n=>n.removed),engine.buffer.map(i=>i.food).sort(),[engine.orderCursor,engine.orders.map(o=>o.recipe?o.planIndex:null)]]);
 if(seen.has(key))return;seen.add(key);assert.notEqual(engine.status,'failed');
 if(engine.status==='won'){terminals++;return;}
 for(const tile of engine.nodes.filter(n=>engine.available(n.id))){const next=engine.fork();assert(next.selectTile(tile.id).ok);C.settle(next);allTutorial(next);}
}
allTutorial(new C.Engine(tutorial));assert(terminals>0);assert.equal(tutorial.tiles.length,11);assert.equal(tutorial.metrics.totalDishes,5);assert.equal(tutorial.metrics.expectedRevenue,205);
console.log('PASS tutorial exhaustive stable-state reachability: '+seen.size+' states, every terminal wins');

// Compare the independent inventory model against timed real-engine traces, step by step.
let compared=0;
for(const n of [1,2,3,5,10,14,20,21,40,44,60,64])for(const policy of ['random','greedy','unlock'])for(const seed of [997,1994,2991]){
 const config=C.configFor(n),result=C.Levels.probeLevel(config,policy,seed),engine=C.replay(config,result.route.map(id=>({type:'pick',id})));
 assert.equal(engine.status==='won',result.won);assert.equal(engine.nodes.filter(n=>n.removed).length,result.removed);compared++;
 const m=C.Search.model(config);let state=C.Search.initial(m);
 const e=new C.Engine(config);
 for(const id of result.route){const index=config.tiles.findIndex(t=>t.id===id);state=C.Search.apply(m,state,{type:'pick',id,index});assert(e.selectTile(id).ok);C.settle(e);
  assert.deepEqual(tally(state.buffer.map(i=>m.tiles[i].food)),tally(e.buffer.map(i=>i.food)));
  assert.deepEqual(state.active,e.orders.filter(o=>o.recipe).map(o=>o.planIndex).sort((a,b)=>a-b));assert.equal(state.cursor,e.orderCursor);
 }
}
console.log('PASS '+compared+' policy traces and per-step search states agree with the real engine');

// Witnesses must also survive rapid inputs that wait only for capacity, not cooking.
for(const n of [1,2,3,4,10,18,20,40,60,64])for(const interval of [.01,.05,.1]){
 const config=C.configFor(n),e=new C.Engine(config);let cursor=0,guard=0;
 while(cursor<config.solution.length&&e.status==='playing'&&guard++<30000){if(e.selectTile(config.solution[cursor]).ok)cursor++;e.tick(interval);assert(e.buffer.length+e.incoming.length<=7);}
 e.tick(120);assert.equal(cursor,config.tiles.length,'Fast witness stopped at level '+n);assert.equal(e.status,'won','Fast witness failed at level '+n);
}
console.log('PASS fast-input witnesses across variable counts, all eight layers and 72-card boundary');

let lastD=0,lastN=0;
for(let n=1;n<=60;n++){const c=C.configFor(n);assert(c.metrics.totalDishes>=lastD);lastD=c.metrics.totalDishes;lastN=c.tiles.length;}
for(let n=61;n<=120;n++)assert.equal(C.configFor(n).metrics.totalDishes,24);
assert.deepEqual(C.Levels.definitionFor(1).orders,['d01','d02','d14','d01','d02']);
assert.throws(()=>C.configFor(1,42,{...C.Levels.definitionFor(1),orders:['missing','d02','d04']}),/recipe/);
assert.throws(()=>C.configFor(1,42,{...C.Levels.definitionFor(1),orders:['d01','d15','d02']}),/Conflicting/);
assert.throws(()=>C.configFor(1,42,{...C.Levels.definitionFor(1),orders:[['d01'],['d02'],['d14']]}),/flat/);
assert.throws(()=>C.configFor(1,42,{...C.Levels.definitionFor(1),shape:'missing'}),/shape/);
assert.throws(()=>C.configFor(1,42,{...C.Levels.definitionFor(1),layers:9}),/layers/);
assert.throws(()=>C.configFor(1,-1),/seed/);
assert.throws(()=>C.Levels.createLevel(C.recipes,C.layout,1,{difficulty:'invalid'}),/difficulty/);
console.log('PASS editable plans: growth caps, unknown recipes, flat lists and subset conflicts, shape/depth/seed validation');

// These are bot regression bands over fixed authored content, not human success targets.
const stages=[[1,1],[2,2],[3,3],[4,5],[6,8],[9,20]],rates=[];
for(const [a,b] of stages){let wins=0,count=0;for(let n=a;n<=b;n++){const c=C.configFor(n);for(let t=1;t<=32;t++){wins+=Number(C.Levels.probeLevel(c,'greedy',t*997).won);count++;}}rates.push(wins/count);}
assert.equal(rates[0],1);assert(rates[1]>=.9);assert(rates[2]>=.8);
assert(rates[3]>=.8);assert(rates[4]>=.6);assert(rates[5]>=.55);
assert(C.configFor(8).definition.greedyTarget[0]>C.configFor(7).definition.greedyTarget[0],'A relief board follows the first challenge');
console.log('PASS paced fixed-content bot bands: '+rates.map(n=>(n*100).toFixed(2)+'%').join(' / '));
