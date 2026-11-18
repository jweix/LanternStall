'use strict';
const assert=require('node:assert/strict'),os=require('node:os'),{spawnSync}=require('node:child_process');
const C=require('../scripts/level-tools/common.cjs'),{Session}=require('../shared/runtime/game-session.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const tutorial=C.configFor(1);
assert.equal(C.oracle(tutorial,{maxNodes:0}).status,'unknown');
assert.equal(C.oracle(tutorial,{maxNodes:1000}).status,'solved');
assert.deepEqual(C.minimumCapacity(tutorial,1000).upperBound,2);
assert.equal(C.minimumCapacity(tutorial,1000).exact,true);
assert.equal(C.safeChoices(new C.Engine(tutorial),1000).lowerFraction,1);
for(const n of [1,10,20,40,64]){
 const c=C.configFor(n),e=new C.Engine(c),before=e.tools.hint;
 assert.equal(e.hint(1),null);assert.equal(e.tools.hint,before,'Unknown advice cannot consume a hint');
 const answer=e.hint();
 if(answer){assert(e.available(answer));assert.equal(e.tools.hint,before-1);assert(e.drainEvents().some(ev=>ev.type==='hintShown'&&ev.verified));}
 const m=C.Search.model(c),s=C.Search.initial(m);
 assert.equal(m.bits.length,c.tiles.length);assert.equal(m.full,(1n<<BigInt(c.tiles.length))-1n);
 if(c.tiles.length===72){assert.notEqual(m.bits[64],m.bits[0]);assert.notEqual(m.bits[71],m.bits[7]);}
}
console.log('PASS bounded oracle: solved/unsolvable/unknown, capacity bounds, safe choices, hints and 72-bit identity');
const forged=new C.Engine(tutorial),forgedBefore=forged.tools.hint;
forged.continuation=()=>({status:'solved',actions:[{type:'pick',id:tutorial.solution[0]}]});
assert.equal(forged.hint(),null);assert.equal(forged.tools.hint,forgedBefore,'An incomplete solver route cannot charge a verified hint');
const flying=new C.Engine(tutorial);flying.selectTile(tutorial.solution[0]);
const flyingHint=flying.hint();if(flyingHint){assert(flying.available(flyingHint));assert(flying.drainEvents().some(e=>e.type==='hintShown'&&e.verified));}
console.log('PASS hint route validation begins at the actual in-flight state, not just a settled projection');

for(const n of [1,5,20,64])for(const policy of ['random','greedy','unlock','lookahead'])for(const budget of ['none','free','ad1','ad2']){
 const config=C.configFor(n),p=C.probe(config,policy,997,budget),e=C.replay(config,p.actions,budget);
 assert.equal(e.status,p.final.status);assert.equal(e.revenue,p.final.revenue);assert.deepEqual(e.buffer.map(i=>i.food),p.final.buffer);
 assert(p.used.ads<=(budget==='ad2'?2:budget==='ad1'?1:0));
}
console.log('PASS four policies × four real tool budgets replay deterministically');

function failing(){
 const ids=['d01','d02','d04'],foods=[...Array(4).fill('tomato'),...Array(4).fill('egg'),...Array(3).fill('pepper'),...Array(3).fill('pork'),'broccoli','shrimp'];
 const config={level:901,recipes:ids.map(id=>C.recipes.find(r=>r.id===id)),orderPlan:[Array(4).fill('d01'),Array(3).fill('d02'),['d04']],
  tiles:foods.map((food,i)=>({id:'f'+i,food,x:i*20,y:0,w:10,h:10,layer:0}))};
 const e=new C.Engine(config);
 for(const tile of e.nodes.filter(t=>t.food==='tomato'||t.food==='pepper'))assert(e.selectTile(tile.id).ok);
 e.tick(.3);assert.equal(e.status,'failed');return{e,config};
}
const {e}=failing();assert(e.rescueOptions().some(o=>o.tool==='stash'));
const snapshot=JSON.stringify(e.snapshot());e.rescueOptions();assert.equal(JSON.stringify(e.snapshot()),snapshot,'Advice must be read-only');
assert(!e.applyRewardedRescue('stash','other-run/id'));assert(e.applyRewardedRescue('stash',e.levelId+'/1'));
assert.equal(e.status,'playing');assert.equal(e.rescueCount,1);assert.equal(e.stashItems.length,1);
assert(!e.applyRewardedRescue('stash',e.levelId+'/1'));
assert(e.selectTile(e.nodes.find(t=>t.food==='shrimp').id).ok);e.tick(.3);assert.equal(e.status,'failed');
assert(e.applyRewardedRescue('stash',e.levelId+'/2'));assert.equal(e.rescueCount,2);assert.equal(e.stashItems.length,2);
assert(e.selectTile(e.nodes.find(t=>t.food==='broccoli').id).ok);e.tick(.3);assert.equal(e.status,'failed');
assert.deepEqual(e.rescueOptions(),[]);assert(!e.applyRewardedRescue('undo',e.levelId+'/3'));
const bad=new C.Engine({recipes:C.recipes,orderPlan:[['d01'],[],[]],tiles:Array.from({length:7},(_,i)=>({id:'bad'+i,food:'tomato',x:i*20,y:0,w:10,h:10}))});
for(const tile of bad.nodes)bad.selectTile(tile.id);bad.tick(.3);assert.deepEqual(bad.rescueOptions(),[]);
console.log('PASS verified rescue: no fake benefit, two-ad cap, stash capacity, duplicate and cross-run receipts');

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
const report=JSON.parse(C.fs.readFileSync(C.path.join(dir,'analysis.json')));assert.equal(report.boards.length,2);assert.equal(report.boards[0].scores.length,4);assert.equal(report.generatorVersion,3);
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
