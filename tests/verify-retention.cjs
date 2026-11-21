'use strict';
const assert=require('node:assert/strict');
const C=require('../scripts/level-tools/common.cjs'),Daily=require('../shared/data/daily-menu.js');
const {App}=require('../shared/runtime/stall-app.js'),{Profile,day}=require('../shared/core/profile.js');
const {Session}=require('../shared/runtime/game-session.js'),Audio=require('../shared/runtime/feedback-audio.js');
const P=require('../shared/data/progression.js');
const options={recipes:C.recipes,layout:C.layout};
const solve=app=>{const s=app.session;for(const id of s.config.solution){if(s.engine.nodes.find(t=>t.id===id).removed)continue;assert(s.pointer(s.engine.nodes.find(t=>t.id===id)));s.advance(.3);s.advance(3);}s.advance(5);assert.equal(s.engine.status,'won');};
let now=Date.parse('2026-11-21T12:00:00+08:00'),saved,write=true;
const app=new App({...options,now:()=>now,save:value=>{if(!write)return false;saved=value;return true;}});
app.handle('play');solve(app);assert.equal(app.profile.state.coins,355);assert(app.profile.state.owned.includes('star-lamp'));
app.handle('first-reward');assert.equal(app.modal.type,'first');app.handle('tutorial');
assert.equal(app.preview,'star-lamp');assert.equal(app.profile.state.equipped.lamp,'warm-lamp');
app.handle('equip-owned-rare','star-lamp');assert.equal(app.profile.state.equipped.lamp,'star-lamp');
assert.equal(new Profile({data:saved}).state.equipped.lamp,'star-lamp');
assert(P.slots.filter(s=>s!=='lamp').every(s=>app.profile.state.equipped[s]==='warm-'+s));
assert.equal(P.items.filter(i=>i.theme==='bamboo').reduce((n,i)=>n+i.price,0),1800);
console.log('PASS first win → permanent gift → explicit trial/equip → durable reload; exact whole-set budgets');
const skip=new App(options);skip.start(1);solve(skip);skip.handle('first-reward');skip.handle('close');assert(skip.profile.state.tutorialDone);assert(skip.profile.state.owned.includes('star-lamp'));
skip.handle('daily-play',0);solve(skip);assert.equal(skip.view().game.introduceStore,false,'Skipping the gift never hijacks later daily-menu actions');

const mainCount=app.profile.state.cleared.length;
app.handle('daily-play',0);const menu=app.menu;solve(app);
assert.equal(app.settlement.menuFirst,true);assert.equal(app.settlement.credited,120);
assert.equal(app.profile.state.cleared.length,mainCount,'Daily menus never unlock main levels');
assert.deepEqual(app.profile.menuDone(menu.day),[0]);const coins=app.profile.state.coins,dishes=JSON.stringify(app.profile.state.dishes),activity=app.profile.state.activity.slice();
app.home();app.handle('daily-play',0);solve(app);
assert.equal(app.profile.state.coins,coins+150,'The third complete game still gives its ordinary daily milestone');
assert.equal(JSON.stringify(app.profile.state.dishes),dishes);assert.deepEqual(app.profile.state.activity,activity,'Repeating a paid daily menu cannot farm event progress');
app.home();app.handle('daily-play',1);write=false;solve(app);assert.equal(app.settlement,null);const before=JSON.stringify(app.profile.state);assert.equal(app.credit(),false);assert.equal(JSON.stringify(app.profile.state),before);
write=true;assert(app.credit());const after=app.profile.state.coins;assert(app.credit());assert.equal(app.profile.state.coins,after);
assert.deepEqual(new Profile({data:saved}).menuDone(menu.day),[0,1]);
app.home();app.handle('daily-play',2);now+=86400000;solve(app);
assert(app.profile.menuDone(menu.day).includes(2),'A midnight-crossing game keeps its original menu identity');
assert.equal(app.profile.menuDone(day(now)).length,0);app.home();app.handle('daily-play',0);solve(app);assert.deepEqual(app.profile.menuDone(day(now)),[0]);
const clockGuard=new Profile({now:()=>now-86400000,data:saved});assert.equal(clockGuard.begin(1,{day:day(now-86400000),index:0}),false);
console.log('PASS daily reward/reload deduplication, independent main progression, repeat caps, atomic retry, midnight continuity and clock rollback');

// Resume while ingredients are flying and while several independent kitchen
// tasks exist. Compare actual inventories and job snapshots, then finish once.
let checkpointSave;
const live=new App({...options,save:v=>(checkpointSave=v,true)});live.start(1);
for(const id of live.session.config.solution.slice(0,5)){
 assert(live.session.act('pick',id));live.session.advance(.07);
}
live.session.saveCheckpoint();const old=live.session;
const signature=s=>JSON.stringify({now:s.engine.now,playTime:s.engine.playTime,revenue:s.engine.revenue,
 removed:s.engine.nodes.filter(n=>n.removed).map(n=>n.id),buffer:s.engine.buffer,incoming:s.engine.incoming,
 orders:s.engine.orders.map(o=>[o.planIndex,o.state,o.replaceAt]),jobs:s.engine.jobs.map(j=>[j.recipeId,j.state,j.payout,j.startAt,j.arriveAt]),
 tools:s.engine.tools,used:s.engine.toolUsed,stash:s.engine.stashItems});
const reloaded=new App({...options,data:checkpointSave,save:v=>(checkpointSave=v,true)});
assert(reloaded.resume());assert.equal(signature(reloaded.session),signature(old));
reloaded.session.setHidden(true);const frozen=reloaded.session.engine.now;reloaded.frame(900000);assert.equal(reloaded.session.engine.now,frozen);
reloaded.setHidden(false);reloaded.frame(1800000);assert.equal(reloaded.session.engine.now,frozen);solve(reloaded);assert.equal(reloaded.profile.state.coins,355);assert.equal(reloaded.profile.state.suspended,null);
const bad=JSON.parse(JSON.stringify(checkpointSave));bad.activeAttempt={id:99,level:1};bad.suspended={version:1,attempt:99,level:1,contentId:'old',elapsed:0,actions:[]};
const updated=new App({...options,data:bad});assert.equal(updated.resume(),false);assert.equal(updated.profile.state.coins,355);
console.log('PASS checkpoint replay preserves flying stock, concurrent kitchen snapshots, elapsed time and one-time settlement; old content safely restarts');

// Rescues remain earned, one per tool, even after the process is restarted.
const session=new Session(options);const tile=session.engine.nodes.find(n=>session.engine.available(n.id));session.act('pick',tile.id);session.advance(.3);
assert(session.act('ad-undo'));session.collectEvents();const restored=new Session({...options,resume:session.checkpoint()});
assert.equal(restored.engine.rescueCount,1);assert.equal(restored.engine.toolUsed.undo,true);assert.equal(restored.engine.applyRewardedRescue('undo',restored.engine.levelId+'/again'),false);
assert.throws(()=>new Session({...options,resume:{...session.checkpoint(),actions:[{type:'pick',value:'missing',at:0}]}}));
console.log('PASS earned rescue budgets survive recovery and invalid action histories are rejected');

let writable=true;const retry=new App({...options,save:()=>writable});retry.start(1);const attempt=retry.attempt,engine=retry.session.engine;
writable=false;assert.equal(retry.session.restart(1),false);assert.equal(retry.attempt,attempt);assert.equal(retry.session.engine,engine);
writable=true;solve(retry);assert.equal(retry.profile.state.coins,355,'A failed restart cannot invalidate the still-playing attempt');
assert.equal(retry.events.filter(e=>e.name==='level_start').length,1,'A new run emits only one start');
console.log('PASS failed restart preserves the playable attempt and successful reward; start events are unique');

let minimum=1,boards=0;
for(let d=0;d<60;d++)for(let i=0;i<3;i++){
 const date=day(Date.parse('2026-11-21T12:00:00+08:00')+d*86400000),def=Daily.definition(C.recipes,date,i),config=C.configFor(1,def.seed,def);
 assert.deepEqual(def,Daily.definition(C.recipes,date,i));assert(config.tiles.length<=21);assert.deepEqual(config.tools,{undo:0,stash:0,shuffle:0});
 assert.equal(C.replay(config,config.solution.map(id=>({type:'pick',id}))).status,'won');
 let wins=0;for(let t=1;t<=16;t++)wins+=C.Levels.probeLevel(config,'greedy',t*997).won;minimum=Math.min(minimum,wins/16);boards++;
}
assert(minimum>=.75);assert.notDeepEqual(Daily.definition(C.recipes,'2026-11-21',0),Daily.definition(C.recipes,'2026-11-22',0));
console.log('PASS '+boards+' dated short menus: real no-tool witnesses, <=21 cards, deterministic refresh; minimum sampled greedy '+minimum*100+'% (not human win rate)');

let plays=0,stops=0,time=0;const audio=Audio.create(()=>({play:()=>{plays++;return Promise.reject(Error('device'));},stop:()=>stops++}),()=>time);
audio.play('pick');audio.play('pick');assert.equal(plays,1);time=50;audio.play('pick');assert.equal(plays,2);audio.stop();assert(stops>=3);
const mute=new App({...options,audio,save:()=>true});mute.handle('sound');assert.equal(mute.profile.state.sound,false);assert.equal(new Profile({data:mute.profile.state}).state.sound,false);
mute.profile.options.save=()=>false;mute.handle('sound');assert.equal(mute.profile.state.sound,false);
console.log('PASS bounded audio pool, rejected playback isolation, persistent mute and failed-save rollback');
