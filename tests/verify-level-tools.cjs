'use strict';
const assert=require('node:assert/strict'),os=require('node:os'),{spawnSync}=require('node:child_process');
const C=require('../scripts/level-tools/common.cjs'),{Session}=require('../shared/runtime/game-session.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const tutorial=C.configFor(1);
assert.equal(C.oracle(tutorial,{maxNodes:0}).status,'unknown');
assert.equal(C.oracle(tutorial,{maxNodes:1000}).status,'solved');
assert.equal(C.minimumCapacity(tutorial,1000).upperBound,3);assert.equal(C.minimumCapacity(tutorial,1000).exact,true);
assert.equal(C.safeChoices(new C.Engine(tutorial),1000).lowerFraction,1);
for(const n of [1,10,20,40,64]){
 const c=C.configFor(n),m=C.Search.model(c);assert.equal(m.full,(1n<<BigInt(c.tiles.length))-1n);
 if(c.tiles.length===72){assert.notEqual(m.bits[64],m.bits[0]);assert.notEqual(m.bits[71],m.bits[7]);}
}
console.log('PASS bounded oracle: solved/unsolvable/unknown, capacity bounds, safe choices and 72-bit identity');
for(const n of [1,5,20,64])for(const policy of ['random','greedy','unlock','lookahead'])for(const budget of ['none','free','ad1','ad2','ad3']){
 const config=C.configFor(n),p=C.probe(config,policy,997,budget),e=C.replay(config,p.actions,budget);
 assert.equal(e.status,p.final.status);assert.equal(e.revenue,p.final.revenue);assert.deepEqual(e.buffer.map(i=>i.food),p.final.buffer);
 assert(p.used.ads<=(budget.startsWith('ad')?Number(budget.slice(2)):0));
 for(const tool of ['undo','stash','shuffle'])assert(p.used[tool]<=1);
}
console.log('PASS four policies × five real tool budgets replay deterministically without oracle guidance');
function failing(){
 const ids=['d01','d02','d04'],foods=[...Array(4).fill('tomato'),...Array(4).fill('egg'),...Array(3).fill('pepper'),...Array(3).fill('pork'),'broccoli','shrimp'];
 const config={level:901,seed:42,tools:{undo:0,stash:0,shuffle:0},recipes:ids.map(id=>C.recipes.find(r=>r.id===id)),orderPlan:['d01','d02','d04','d01','d02','d01','d02','d01'],
  tiles:foods.map((food,i)=>({id:'f'+i,food,x:i*20,y:0,w:10,h:10,layer:0}))};
 const e=new C.Engine(config);
 for(const tile of e.nodes.filter(t=>t.food==='tomato'||t.food==='pepper'))assert(e.selectTile(tile.id).ok);
 e.tick(.3);assert.equal(e.status,'failed');return{e,config};
}
const {e,config:toolConfig}=failing();assert(e.rescueOptions().some(o=>o.tool==='stash'));assert(!e.rescueOptions().some(o=>o.tool==='shuffle'),'Shuffle cannot release a full buffer');
const before=JSON.stringify(e.snapshot()),first=e.buffer.slice(0,3).map(i=>i.id);e.rescueOptions();assert.equal(JSON.stringify(e.snapshot()),before);
assert(!e.applyRewardedRescue('stash','other-run/id'));assert(e.applyRewardedRescue('stash',e.levelId+'/1'));
assert.equal(e.status,'playing');assert.equal(e.rescueCount,1);assert.deepEqual(e.stashItems.map(i=>i.id),first);assert.equal(e.buffer.length,4);
assert(!e.applyRewardedRescue('stash',e.levelId+'/1'));assert(!e.applyRewardedRescue('stash',e.levelId+'/2'),'Move-three is once per run');
const positions=e.nodes.map(n=>[n.id,n.x,n.y,n.layer,n.removed]),removedFoods=e.nodes.filter(n=>n.removed).map(n=>n.food),held=e.buffer.concat(e.stashItems).map(i=>i.food);
const remaining=e.nodes.filter(n=>!n.removed).map(n=>n.food).sort();
assert(e.applyRewardedRescue('shuffle',e.levelId+'/2'));assert.deepEqual(e.nodes.map(n=>[n.id,n.x,n.y,n.layer,n.removed]),positions);
assert.deepEqual(e.nodes.filter(n=>!n.removed).map(n=>n.food).sort(),remaining);assert.deepEqual(e.nodes.filter(n=>n.removed).map(n=>n.food),removedFoods);assert.deepEqual(e.buffer.concat(e.stashItems).map(i=>i.food),held);
assert(!e.applyRewardedRescue('shuffle',e.levelId+'/3'));const last=e.buffer.at(-1);assert(e.applyRewardedRescue('undo',e.levelId+'/3'));assert(!e.nodes.find(n=>n.id===last.source.tileId).removed);assert.equal(e.rescueCount,3);assert.deepEqual(e.rescueOptions(),[]);
assert(e.returnStash(1));assert.equal(e.stashItems.length,2);
assert(!e.events.some(e=>e.type==='hintShown'||e.type==='rescueSuggestedAction'),'Rewards must not leak an oracle route');
const a=new C.Engine({...toolConfig,tools:{undo:1,stash:1,shuffle:1}}),b=new C.Engine({...toolConfig,tools:{undo:1,stash:1,shuffle:1}});
assert(a.shuffle());assert(b.shuffle());assert.deepEqual(a.nodes,b.nodes,'Shuffle must replay deterministically');assert(!a.shuffle());
const inFlight=new C.Engine(toolConfig);inFlight.selectTile(inFlight.nodes[0].id);assert.deepEqual(inFlight.rescueOptions(),[],'Tools wait for incoming items');
// Exact undo/move model agrees with the real engine, including usage flags and three independent returns.
for(const type of ['stash','undo']){const x=failing().e;x.tools[type]=1;const m=C.Search.model({nodes:x.nodes,recipes:x.recipes,orderPlan:x.orderPlan}),s=C.Search.initial(m,x);const next=C.Search.apply(m,s,{type});assert(x[type]());assert.deepEqual(next.buffer.map(i=>m.tiles[i].food),x.buffer.map(i=>i.food));assert.deepEqual(next.stash.map(i=>m.tiles[i].food),x.stashItems.map(i=>i.food));}
console.log('PASS classic tools: first three aside/retrievable, last card restored, board-only shuffle, once-only limits and reward receipt isolation');

// Event processing must be independent of frame chunking.
for(const n of [1,20,64]){
 const config=C.configFor(n),a=new C.Engine(config),b=new C.Engine(config);
 for(const id of config.solution.slice(0,Math.min(6,config.solution.length))){assert(a.selectTile(id).ok);assert(b.selectTile(id).ok);a.tick(.3);for(let i=0;i<30;i++)b.tick(.01);}
 a.tick(40);for(let i=0;i<400;i++)b.tick(.1);
 assert.equal(a.revenue,b.revenue);assert.deepEqual(a.buffer.map(t=>t.food),b.buffer.map(t=>t.food));assert.deepEqual(a.orders.map(o=>o.recipe?.id),b.orders.map(o=>o.recipe?.id));
 assert(Math.abs(a.playTime-b.playTime)<1e-7);
}
console.log('PASS large/small frame chunks preserve kitchen, inventory and menu outcomes');

const dir=C.fs.mkdtempSync(C.path.join(os.tmpdir(),'lantern-level-tools-'));
const config=C.configFor(20),result=C.probe(config,'random',997),file=C.path.join(dir,'case.json');
C.save(file,{...C.metadata(),config,budget:'none',result});
const run=(script,args)=>spawnSync(process.execPath,[C.path.join(C.root,'scripts',script),...args],{cwd:C.root,encoding:'utf8'});
let child=run('replay-level.cjs',['--case',file]);assert.equal(child.status,0,child.stderr);
const te=new C.Engine(tutorial),timeline=[{type:'pick',id:tutorial.solution[0]},{type:'pause',value:true},{type:'tick',seconds:60},{type:'pause',value:false},{type:'tick',seconds:.3}];
const timelineEngine=C.replayTimeline(tutorial,timeline);assert.equal(timelineEngine.now,.3);
const timedFile=C.path.join(dir,'timed.json');C.save(timedFile,{...C.metadata(),config:tutorial,budget:'free',timeline,snapshot:C.snapshot(timelineEngine)});
child=run('replay-level.cjs',['--case',timedFile]);assert.equal(child.status,0,child.stderr);
child=run('analyze-levels.cjs',['--levels','1,64','--trials','2','--policies','greedy','--tools','--solve','--nodes','100','--cases','--quiet','--out',C.path.join(dir,'analysis.json')]);assert.equal(child.status,0,child.stderr);
const report=JSON.parse(C.fs.readFileSync(C.path.join(dir,'analysis.json')));assert.equal(report.boards.length,2);assert.equal(report.boards[0].scores.length,5);assert.equal(report.generatorVersion,5);
const sourceBefore=C.fs.readFileSync(C.path.join(C.root,'shared/data/level-config.js'),'utf8');
child=run('generate-levels.cjs',['--levels','1:3','--candidates','1','--trials','8','--out',C.path.join(dir,'candidates.json')]);assert.equal(child.status,0,child.stderr);
assert.equal(C.fs.readFileSync(C.path.join(C.root,'shared/data/level-config.js'),'utf8'),sourceBefore,'Candidate analysis cannot mutate config without --apply');
assert.throws(()=>C.range('1:10001'));assert.throws(()=>C.range('0:1'));assert.deepEqual(C.range('1,3:4'),[1,3,4]);
C.fs.rmSync(dir,{recursive:true,force:true});
console.log('PASS CLI reports/cases, timed replay, hash/version guards, non-mutating candidates and range validation');

async function integration(){
 const disabled=new Session({recipes:C.recipes,layout:C.layout});disabled.engine=failing().e;disabled.collectEvents();assert.equal(disabled.rescueOffer,null);
 let complete;
 const s=new Session({recipes:C.recipes,layout:C.layout,rewardedRescue:()=>new Promise(resolve=>{complete=resolve;})});s.engine=failing().e;s.collectEvents();assert(s.rescueOffer);
 const time=s.engine.playTime,promise=s.requestRescue();assert(s.adPending);s.advance(100);assert.equal(s.engine.playTime,time);
 complete(true);assert(await promise);assert.equal(s.engine.status,'playing');assert.equal(s.adPending,false);assert.equal(s.engine.rescueCount,1);
 s.engine=failing().e;s.collectEvents();const cancelled=s.requestRescue();complete(false);assert.equal(await cancelled,false);assert.equal(s.engine.rescueCount,0);
 s.engine=failing().e;s.collectEvents();const stale=s.requestRescue(),old=s.engine;s.restart(1);complete(true);assert.equal(await stale,false);assert.equal(old.rescueCount,0);assert.equal(s.engine.rescueCount,0);
 s.engine=failing().e;s.collectEvents();const disposed=s.requestRescue();s.dispose();complete(true);assert.equal(await disposed,false);
 console.log('PASS session callback completion/cancel/restart/dispose isolation and excluded advertising time');
 for(const platform of ['douyin','wechat']){
  const {createRewardedRescue}=require('../platforms/'+platform+'/src/rewarded-video.js');let closed,error,shows=0;
  const ad={load:()=>Promise.resolve(),show:()=>{shows++;return Promise.resolve();},onClose:fn=>{closed=fn;},offClose:()=>{},onError:fn=>{error=fn;},offError:()=>{}};
  assert.equal(createRewardedRescue({},''),undefined);
  const play=createRewardedRescue({createRewardedVideoAd:()=>ad},'real-unit');await flush();await flush();assert(play.available());
  let done=false;const first=play().then(r=>(done=true,r));await flush();assert.equal(done,false,'show success is not a reward');const oldClose=closed;closed({isEnded:false});assert.equal(await first,false);
  await flush();await flush();const second=play();await flush();oldClose({isEnded:true});let secondDone=false;second.then(()=>{secondDone=true;});await flush();assert.equal(secondDone,false,'Old callbacks cannot complete a later request');closed({isEnded:true});assert.equal(await second,true);
  await flush();await flush();const third=play();await flush();error({errCode:1004});assert.equal(await third,false);assert.equal(shows,3);
 }
 console.log('PASS both native ad adapters: empty config hidden, preload, true completion only, early close, error and duplicate callbacks');
}
integration().catch(error=>{console.error(error);process.exitCode=1;});
