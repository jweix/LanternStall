'use strict';
const assert=require('node:assert/strict'),{Engine}=require('../shared/core/game-core.js'),recipes=require('../shared/data/recipes.json');
const plan=['d01','d02','d04','d03','d05','d09','d10'];
const tiles=plan.flatMap(id=>recipes.find(r=>r.id===id).ingredients).map((food,i)=>({id:'q'+i,food,x:i*20,y:0,w:10,h:10,layer:0}));
const seen=new Set();let terminals=0;
function visit(e){
 const done=e.jobs.map(j=>j.planIndex).sort((a,b)=>a-b),key=done.join(',');if(seen.has(key))return;seen.add(key);
 const expected=plan.map((_,i)=>i).filter(i=>!done.includes(i)).slice(0,3),active=e.orders.filter(o=>o.recipe).sort((a,b)=>a.planIndex-b.planIndex);
 assert.deepEqual(active.map(o=>o.planIndex),expected,'Only the first three unfinished entries are active');
 assert.equal(e.orderCursor,Math.min(plan.length,done.length+3));assert.equal(new Set(done).size,done.length);
 if(!expected.length){assert.equal(e.status,'won');assert.equal(e.revenue,plan.reduce((n,id)=>n+recipes.find(r=>r.id===id).payout,0));terminals++;return;}
 for(const order of active){const next=e.fork();for(const food of order.recipe.ingredients){const t=next.nodes.find(t=>t.food===food&&next.available(t.id));assert(t);assert(next.selectTile(t.id).ok);}next.tick(.3);next.tick(120);visit(next);}
}
visit(new Engine({recipes,orderPlan:plan,tiles}));assert(terminals>0);
console.log('PASS global FIFO exhaustive completion choices: '+seen.size+' states, continuous three-card window and monotonic 3→2→1→0 tail');
const concurrent=new Engine({recipes,orderPlan:['d01','d02','d03','d04','d05','d09']});
for(const food of ['shiitake','chicken'])concurrent.putIngredient(food);concurrent.tick(.3);
assert.equal(concurrent.orders[2].nextIndex,3);
for(const food of ['tomato','egg'])concurrent.putIngredient(food);concurrent.tick(.3);
assert.equal(concurrent.orders[0].nextIndex,4);assert.equal(concurrent.orderCursor,5);
concurrent.tick(.12);assert.equal(concurrent.orders[2].recipe.id,'d04');assert.equal(concurrent.orders[0].state,'confirming');
concurrent.tick(.3);assert.equal(concurrent.orders[0].recipe.id,'d05');assert.equal(concurrent.orders.filter(o=>o.recipe).length,3);
console.log('PASS successors reserved in completion order across independently timed handoffs');
const hidden=new Engine({recipes,orderPlan:['d01','d02','d03','d04','d05']});
for(const food of ['tomato','egg','pepper','pork','broccoli','shrimp'])hidden.putIngredient(food);
hidden.tick(.3);assert.deepEqual(hidden.jobs.map(j=>j.planIndex),[0,1]);assert.equal(hidden.buffer.length,2);
hidden.tick(.419);assert.equal(hidden.jobs.length,2);hidden.tick(.001);assert.deepEqual(hidden.jobs.map(j=>j.planIndex),[0,1,3]);
assert.equal(hidden.orders[1].recipe.id,'d05');assert.equal(hidden.orderCursor,5);
assert.throws(()=>new Engine({recipes,orderPlan:[['d01'],['d02'],['d04']]}),/flat/);
console.log('PASS hidden successors cannot consume early; simultaneous handoffs never duplicate or skip global entries');
