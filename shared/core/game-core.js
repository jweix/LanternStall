/* Framework-free reference logic. Seconds throughout; no timers, rendering or DOM here. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DapaidangCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DEFAULTS={capacity:7,pickFlight:.30,rawToWok:.28,stir:.60,pour:.32,departure:.62,menuReveal:.16,cardExit:.16,cardSettle:.12,bonus:1.5};
 const subset=(a,b)=>a.every(id=>b.includes(id));
 const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.5&&Math.abs(a.y-b.y)<(a.h+b.h)/2-.5;
 const clone=value=>JSON.parse(JSON.stringify(value));
 class Engine{
  constructor(config){
   this.config=Object.assign({},DEFAULTS,config.motion||{});this.recipes=config.recipes.map(clone);this.revenue=config.initialRevenue||0;
   this.now=0;this.playTime=0;this.wonAt=null;this.status='playing';this.paused=false;this.events=[];this.sequence=0;this.tableSequence=0;this.recipeCursor=0;
   this.nodes=(config.tiles||[]).map((n,i)=>Object.assign({id:'tile-'+i,removed:false,layer:1},clone(n)));
   this.orderPlan=config.orderPlan?clone(config.orderPlan):null;this.orderCursors=[0,0,0];
   if(this.orderPlan){
    if(!Array.isArray(this.orderPlan)||this.orderPlan.length!==3||this.orderPlan.some(lane=>!Array.isArray(lane)||lane.some(id=>!this.recipes.some(r=>r.id===id))))throw Error('Invalid finite order plan.');
    // Every possible concurrent pair must be compatible, regardless of delivery timing.
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const x of this.orderPlan[a])for(const y of this.orderPlan[b]){
     const r=this.recipes.find(r=>r.id===x),s=this.recipes.find(r=>r.id===y);
     if(subset(r.ingredients,s.ingredients)||subset(s.ingredients,r.ingredients))throw Error('Conflicting finite orders.');
    }
   }
   this.buffer=[];this.incoming=[];this.queue=[];this.wok=null;this.deliveries=[];this.stashItems=[];this.tools=Object.assign({undo:1,stash:2,hint:1},config.tools||{});
   this.orders=[];for(let i=0;i<3;i++){const id=config.initialRecipes&&config.initialRecipes[i];this.orders.push(this._order(i,id));}
  }
  _emit(type,data){this.events.push(Object.assign({type,time:this.now},data||{}));}
  _order(slot,recipeId){
   if(this.orderPlan){
    recipeId=this.orderPlan[slot][this.orderCursors[slot]++];
    if(!recipeId)return{slot,table:'',recipe:null,state:'completed',exitAt:null,matchedAt:null,credited:false};
   }
   let recipe=recipeId&&this.recipes.find(r=>r.id===recipeId);
   if(!recipe){for(let attempt=0;attempt<this.recipes.length*2;attempt++){
    const candidate=this.recipes[this.recipeCursor++%this.recipes.length],collecting=this.orders.filter(o=>o.state==='collecting');
    if(collecting.every(o=>!subset(candidate.ingredients,o.recipe.ingredients)&&!subset(o.recipe.ingredients,candidate.ingredients))){recipe=candidate;break;}
   }}
   if(!recipe)throw Error('No compatible recipe; enlarge the recipe pool or change active orders.');
   this.tableSequence++;return{slot,table:String(this.tableSequence).padStart(2,'0'),recipe:clone(recipe),state:'collecting',exitAt:null,matchedAt:null,credited:false};
  }
  available(nodeId){const n=this.nodes.find(n=>n.id===nodeId);return !!n&&!n.removed&&!this.nodes.some(t=>!t.removed&&t.layer>n.layer&&overlap(n,t));}
  selectTile(nodeId){
   if(!this.available(nodeId))return{ok:false,reason:'covered-or-removed'};
   const n=this.nodes.find(n=>n.id===nodeId),result=this.putIngredient(n.food,{tileId:n.id,x:n.x,y:n.y});
   if(result.ok){n.removed=true;this._emit('layerMayReveal',{removedTileId:n.id});}return result;
  }
  putIngredient(food,source){
   if(this.status!=='playing'||this.paused)return{ok:false,reason:'not-playing'};
   if(this.buffer.length+this.incoming.length>=this.config.capacity)return{ok:false,reason:'prep-full'};
   const item={id:'item-'+(++this.sequence),food,source:source||null,arriveAt:this.now+this.config.pickFlight};
   this.incoming.push(item);this._emit('ingredientPicked',{item:clone(item)});return{ok:true,itemId:item.id};
  }
  _canMake(recipe){const rest=this.buffer.map(i=>i.food);return recipe.ingredients.every(id=>{const i=rest.indexOf(id);if(i<0)return false;rest.splice(i,1);return true;});}
  _resolve(){
   if(this.status!=='playing')return;
   let changed=true;while(changed){changed=false;
    for(const order of this.orders){if(order.state!=='collecting'||!this._canMake(order.recipe))continue;
     const items=order.recipe.ingredients.map(food=>this.buffer.splice(this.buffer.findIndex(i=>i.food===food),1)[0]);
     order.state='queued';order.matchedAt=this.now;const job={id:'job-'+(++this.sequence),slot:order.slot,table:order.table,recipe:clone(order.recipe),items};
     this.queue.push(job);this._emit('recipeAccepted',{slot:order.slot,table:order.table,recipeId:order.recipe.id,consumedItemIds:items.map(i=>i.id)});
     changed=true;break;
    }
   }this._startCook();
  }
  _startCook(){
   if(this.wok||!this.queue.length||this.status!=='playing')return;
   const job=this.queue.shift(),m=this.config;this.wok=Object.assign(job,{startAt:this.now,stirAt:this.now+m.rawToWok,pourAt:this.now+m.rawToWok+m.stir,endAt:this.now+m.rawToWok+m.stir+m.pour});
   this.orders[job.slot].state='cooking';this._emit('cookingStarted',{job:clone(this.wok)});
  }
  _nextDue(){
   return Math.min(Infinity,...this.incoming.map(i=>i.arriveAt),this.wok?this.wok.endAt:Infinity,...this.deliveries.map(d=>d.arriveAt),...this.orders.filter(o=>o.exitAt!==null).map(o=>o.exitAt));
  }
  _advanceClock(to){if(this.status==='playing')this.playTime+=to-this.now;this.now=to;}
  tick(seconds){
   if(this.paused)return;const target=this.now+Math.max(0,seconds);let guard=0;
   while(this._nextDue()<=target+1e-9){if(++guard>10000)throw Error('Event loop guard');const due=this._nextDue();this._advanceClock(due);
    const arrivals=this.incoming.filter(i=>i.arriveAt<=due+1e-9);this.incoming=this.incoming.filter(i=>i.arriveAt>due+1e-9);
    for(const item of arrivals){this.buffer.push(item);this._emit('ingredientArrived',{item:clone(item)});}if(arrivals.length)this._resolve();
    if(this.wok&&this.wok.endAt<=due+1e-9){
     const job=this.wok;this.wok=null;const delivery=Object.assign(job,{flyAt:this.now,arriveAt:this.now+this.config.departure+this.config.menuReveal});
     this.deliveries.push(delivery);this.orders[job.slot].state='delivering';this._emit('dishOut',{delivery:clone(delivery)});this._startCook();
    }
    const served=this.deliveries.filter(d=>d.arriveAt<=due+1e-9);this.deliveries=this.deliveries.filter(d=>d.arriveAt>due+1e-9);
    for(const job of served){const order=this.orders[job.slot];if(order.table!==job.table)continue;
     order.state='exiting';order.exitAt=this.now+this.config.cardExit;
     if(!order.credited&&this.status==='playing'){order.credited=true;const pay=job.recipe.payout!==undefined?job.recipe.payout:Math.round(job.recipe.basePrice*(job.recipe.ingredients.length===3?this.config.bonus:1));
      this.revenue+=pay;this._emit('dishServed',{slot:job.slot,table:job.table,recipeId:job.recipe.id,payout:pay,revenue:this.revenue});
     }
    }
    for(let slot=0;slot<3;slot++){const order=this.orders[slot];if(order.exitAt!==null&&order.exitAt<=due+1e-9){
     order.exitAt=null;if(this.status==='playing'){this.orders[slot]=this._order(slot);const next=this.orders[slot];this._emit(next.recipe?'orderReplaced':'tableCompleted',{slot,table:next.table,recipeId:next.recipe?next.recipe.id:null});this._resolve();}else order.state='completed';
    }}
    this._checkFail();
   }
   this._advanceClock(target);this._checkFail();
  }
  _checkFail(){
   if(this.status!=='playing'||this.incoming.length||this.wok||this.queue.length||this.deliveries.length)return;
   // Revenue is a record only. Win after every ingredient has been consumed
   // and the final dish has actually arrived, including any stashed ingredients.
   const emptyBoard=this.nodes.length&&this.nodes.every(n=>n.removed);
   if(emptyBoard&&!this.buffer.length&&!this.stashItems.length){this.status='won';this.wonAt=this.playTime;this._emit('levelWon',{elapsed:this.wonAt,revenue:this.revenue});return;}
   if(this.orders.some(o=>o.exitAt!==null))return;
   if(this.buffer.length>=this.config.capacity&&!this.orders.some(o=>o.state==='collecting'&&this._canMake(o.recipe))){this.status='failed';this._emit('levelFailed',{reason:'prep-full'});}
   else if(emptyBoard&&!this.stashItems.length&&!this.orders.some(o=>o.state==='collecting'&&this._canMake(o.recipe))){this.status='failed';this._emit('levelFailed',{reason:'stock-exhausted'});}
  }
  undo(){
   if(this.status!=='playing'||this.paused||this.tools.undo<1||!this.buffer.length)return false;
   const item=this.buffer.pop();if(item.source&&item.source.tileId){const n=this.nodes.find(n=>n.id===item.source.tileId);if(n)n.removed=false;}this.tools.undo--;this._emit('ingredientUndone',{item:clone(item)});return true;
  }
  stash(){
   if(this.status!=='playing'||this.paused||this.tools.stash<1||!this.buffer.length||this.stashItems.length>=2)return false;
   const item=this.buffer.pop();this.stashItems.push(item);this.tools.stash--;this._emit('ingredientStashed',{item:clone(item)});return true;
  }
  returnStash(index){
   if(this.status!=='playing'||this.paused||this.buffer.length+this.incoming.length>=this.config.capacity||!this.stashItems[index||0])return false;
   const item=this.stashItems.splice(index||0,1)[0];this.buffer.push(item);this._emit('ingredientReturned',{item:clone(item)});this._resolve();return true;
  }
  hint(){
   if(this.status!=='playing'||this.paused||this.tools.hint<1)return null;
   for(const order of this.orders.filter(o=>o.state==='collecting')){const rest=this.buffer.concat(this.incoming).map(i=>i.food);
    for(const food of order.recipe.ingredients){const i=rest.indexOf(food);if(i>=0){rest.splice(i,1);continue;}const tile=this.nodes.find(n=>n.food===food&&this.available(n.id));
     if(tile){this.tools.hint--;this._emit('hintShown',{tileId:tile.id});return tile.id;}
    }
   }return null;
  }
  pause(value){this.paused=value!==false;}
  drainEvents(){const all=this.events;this.events=[];return all;}
  snapshot(){return clone({now:this.now,playTime:this.playTime,wonAt:this.wonAt,status:this.status,paused:this.paused,revenue:this.revenue,buffer:this.buffer,incoming:this.incoming,queue:this.queue,wok:this.wok,deliveries:this.deliveries,orders:this.orders,nodes:this.nodes,tools:this.tools,stashItems:this.stashItems});}
 }
 return{Engine,DEFAULTS,subset,overlap};
});
