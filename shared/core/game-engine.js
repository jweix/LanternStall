/* 灯火大排档 · 可复用规则原型。无平台 API、无 DOM 依赖。 */
(function (scope) {
  'use strict';
  const FOOD = {
    tomato: { name: '番茄', sprite: 0 }, egg: { name: '鸡蛋', sprite: 1 },
    chicken: { name: '鸡肉', sprite: 2 }, mushroom: { name: '香菇', sprite: 3 },
    onion: { name: '小葱', sprite: 4 }, corn: { name: '玉米', sprite: 5 },
    butter: { name: '黄油', sprite: 6 }, noodle: { name: '面条', sprite: 7 },
    carrot: { name: '胡萝卜', sprite: 8 }
  };
  const MENU = [
    ['番茄炒蛋', ['tomato','egg'], 28],
    ['香菇鸡串', ['chicken','mushroom','onion'], 42],
    ['黄油玉米', ['corn','butter','onion'], 40],
    ['夜市炒面', ['noodle','chicken','carrot','onion'], 58],
    ['番茄蛋汤', ['tomato','egg'], 30],
    ['金玉炒蛋', ['corn','egg','butter'], 42],
    ['鸡丝拌面', ['noodle','chicken','carrot'], 44],
    ['双菇鸡煲', ['chicken','mushroom','mushroom','onion'], 60],
    ['葱香煎蛋', ['egg','onion'], 28],
    ['茄汁拌面', ['noodle','tomato','butter'], 42],
    ['时蔬小炒', ['corn','carrot','mushroom'], 42],
    ['招牌烩面', ['noodle','chicken','mushroom','carrot'], 60],
    ['葱香蛋羹', ['egg','onion'], 28],
    ['萝卜鸡丁', ['carrot','chicken','onion'], 42],
    ['香菇拌面', ['mushroom','noodle','butter'], 42],
    ['金玉炒面', ['corn','noodle','egg','onion'], 58],
    ['茄汁煎蛋', ['tomato','egg'], 28],
    ['奶香玉米', ['corn','butter','egg'], 42],
    ['葱香鸡面', ['chicken','noodle','onion'], 42],
    ['田园鸡煲', ['chicken','carrot','mushroom','onion'], 60]
  ].map((r,id) => ({id, name:r[0], ingredients:r[1], reward:r[2]}));
  const copy = value => JSON.parse(JSON.stringify(value));
  const counts = items => items.reduce((out, key) => {out[key]=(out[key]||0)+1;return out;}, {});
  function rng(seed) { let n=seed>>>0;return () => {n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}; }

  function overlap(a,b,TILE_SIZE) {return Math.min(a.x+TILE_SIZE,b.x+TILE_SIZE)-Math.max(a.x,b.x)>.5 && Math.min(a.y+TILE_SIZE,b.y+TILE_SIZE)-Math.max(a.y,b.y)>.5;}
  function makeBoard(seed,layoutVersion=4) {
    const TILE_SIZE=layoutVersion===3?15:17.4;
    const board=[];let id=0;
    for(let z=0;z<2;z++) for(let row=0;row<5;row++) for(let col=0;col<5;col++)
      board.push({id:id++,x:(layoutVersion===3?(z===0?6:2):(z===0?5.6:4.2))+col*18,y:(layoutVersion===3?(z===0?6:2):(z===0?5.6:4.2))+row*18,z,food:null});
    for(const y of (layoutVersion===3?[12,66]:[4.2,76.2])) for(const x of (layoutVersion===3?[4,22,40,58,76]:[4.2,22.2,40.2,58.2,76.2])) board.push({id:id++,x,y,z:2,food:null});
    board.forEach(a => {a.blockers=board.filter(b=>b.z>a.z&&overlap(a,b,TILE_SIZE)).map(b=>b.id);});
    const random=rng(seed), removed=new Set(), witness=[];
    while(witness.length<board.length) {
      const available=board.filter(t=>!removed.has(t.id)&&t.blockers.every(b=>removed.has(b)));
      const chosen=available[Math.floor(random()*available.length)];
      witness.push(chosen.id);removed.add(chosen.id);
    }
    const ingredients=MENU.flatMap(o=>o.ingredients);
    witness.forEach((tileId,i)=>{board[tileId].food=ingredients[i];});
    return {board,witness};
  }
  class LanternGame {
    constructor(seed=20261111, saved=null, options={}) {
      this.seed=seed;this.layoutVersion=saved?.layoutVersion??(saved&&saved.version<4?3:4);const generated=makeBoard(seed,this.layoutVersion);this.board=generated.board;this.witness=generated.witness;
      this.removed=[];this.tray=[];this.reserve=[];this.active=[0,1,2];this.queue=MENU.slice(3).map(o=>o.id);
      this.focus=0;this.capacity=7;this.moves=0;this.lastDeliveryMoves=0;this.combo=0;
      this.income=0;this.revenueTarget=options.revenueTarget||300;this.pending=[];this.deliverySerial=0;this.status='playing';this.shuffleCount=0;
      this.charges={move:1,undo:1,shuffle:1};this.adUsed=false;this.undoState=null;
      if(saved) this.restore(saved);
    }
    export() {
      const keys=['seed','removed','tray','reserve','active','queue','focus','capacity','moves','lastDeliveryMoves','combo','income','revenueTarget','pending','deliverySerial','layoutVersion','status','charges','adUsed','shuffleCount'];
      const out={version:4,boardFoods:this.board.map(t=>t.food),witness:copy(this.witness)};
      keys.forEach(k=>{out[k]=copy(this[k]);});return out;
    }
    restore(saved) {
      if(![2,3,4].includes(saved.version)||saved.seed!==this.seed)return false;
      const keys=Object.keys(this.export()).filter(k=>!['version','seed','boardFoods','witness'].includes(k));
      if(saved.version===2) {
        saved={...saved,reserve:saved.bowl||[],income:Math.max(0,(saved.coins??40)-40),revenueTarget:300,shuffleCount:0,
          charges:{move:saved.charges?.bowl??1,undo:saved.charges?.undo??1,shuffle:saved.charges?.hint??1}};
      }
      keys.forEach(k=>{if(saved[k]!==undefined)this[k]=copy(saved[k]);});
      if(Array.isArray(saved.boardFoods)&&saved.boardFoods.length===this.board.length&&saved.boardFoods.every(f=>FOOD[f]))
        saved.boardFoods.forEach((food,i)=>{this.board[i].food=food;});
      if(Array.isArray(saved.witness)&&saved.witness.length===this.board.length)this.witness=copy(saved.witness);
      this.status=this.income>=this.revenueTarget?'won':this.tray.length>=this.capacity?(this.pending.length?'waiting':'jammed'):'playing';
      this.undoState=null;return true;
    }
    available() {const removed=new Set(this.removed);return this.board.filter(t=>!removed.has(t.id)&&t.blockers.every(b=>removed.has(b)));}
    pool() {return this.tray.concat(this.reserve).map(id=>this.board[id].food);}
    progress(orderId) {
      const have=counts(this.pool()), order=MENU[orderId];let n=0;
      const ingredients=order.ingredients.map(food=>{const ready=(have[food]||0)>0;if(ready){have[food]--;n++;}return {food,ready};});
      return {n,total:ingredients.length,ingredients};
    }
    canMake(orderId) {const p=this.progress(orderId);return p.n===p.total;}
    settle() {
      const deliveries=[];
      while(this.active.length && this.status==='playing') {
        const priorities=[this.focus,...this.active.filter(id=>id!==this.focus)].filter(id=>this.active.includes(id));
        const id=priorities.find(o=>!this.pending.some(job=>job.id===o)&&this.canMake(o));if(id===undefined)break;
        const order=MENU[id],tileIds=[];
        for(const food of order.ingredients) {
          let index=this.reserve.findIndex(tileId=>this.board[tileId].food===food);
          if(index!==-1)tileIds.push(...this.reserve.splice(index,1));
          else {index=this.tray.findIndex(tileId=>this.board[tileId].food===food);tileIds.push(...this.tray.splice(index,1));}
        }
        const gap=this.moves-this.lastDeliveryMoves;
        this.combo=gap<=4?this.combo+1:1;this.lastDeliveryMoves=this.moves;
        const tip=Math.min(6,Math.max(0,this.combo-1)*2);
        const slot=this.active.indexOf(id);
        const job={key:'dish-'+this.deliverySerial++,id,name:order.name,ingredients:copy(order.ingredients),tileIds,slot,reward:order.reward,tip};
        this.pending.push(job);deliveries.push(copy(job));
        if(this.focus===id)this.focus=this.active.find(o=>!this.pending.some(job=>job.id===o))??null;
      }
      // 必须先出餐，再判断满盘；第七味配齐时仍然能成功。
      if(this.status==='playing'&&this.tray.length>=this.capacity)this.status=this.pending.length?'waiting':'jammed';
      return deliveries;
    }
    pick(tileId) {
      if(this.status!=='playing')return {ok:false,reason:'当前无法拿取'};
      if(!this.available().some(t=>t.id===tileId))return {ok:false,reason:'先拿开压在上面的食材'};
      const before=this.export();this.removed.push(tileId);this.tray.push(tileId);this.moves++;
      if(this.moves-this.lastDeliveryMoves>4)this.combo=0;
      const deliveries=this.settle();this.undoState=deliveries.length?null:before;
      return {ok:true,deliveries,food:this.board[tileId].food};
    }
    select(orderId) {if(!this.active.includes(orderId)||this.pending.some(j=>j.id===orderId))return false;this.focus=orderId;return true;}
    completeDelivery(key) {
      const index=this.pending.findIndex(job=>job.key===key);
      if(index===-1)return {ok:false,reason:'这份菜已经上桌或不存在'};
      const [job]=this.pending.splice(index,1);
      this.income+=job.reward+job.tip;this.undoState=null;
      const slot=this.active.indexOf(job.id);
      this.active.splice(slot,1);
      if(this.queue.length)this.active.splice(slot,0,this.queue.shift());
      if(this.focus===null||this.focus===job.id)this.focus=this.active.find(o=>!this.pending.some(j=>j.id===o))??null;
      this.status=this.income>=this.revenueTarget?'won':'playing';
      const deliveries=this.status==='won'?[]:this.settle();
      return {ok:true,job,deliveries};
    }
    undo() {
      if(this.status==='won'||this.charges.undo<1||!this.undoState)return {ok:false,reason:'只能撤回最近一次尚未出餐的拿取'};
      const charges=copy(this.charges), adUsed=this.adUsed, moves=this.moves, previous=this.undoState;
      this.restore(previous);this.moves=moves+1;this.combo=0;this.charges=charges;this.charges.undo--;this.adUsed=adUsed;
      return {ok:true};
    }
    moveAside() {
      if(this.status==='won'||!this.charges.move||!this.tray.length||this.reserve.length)
        return {ok:false,reason:'先把旁盘里的食材做完，再分装'};
      this.reserve.push(...this.tray.splice(0,3));
      this.charges.move--;this.status='playing';this.undoState=null;return {ok:true};
    }
    shuffle() {
      if(this.status!=='playing'||!this.charges.shuffle)return {ok:false,reason:'先腾出备菜盘，再重新理菜'};
      const random=rng(this.seed+this.moves*97+(this.shuffleCount+1)*7919), removed=new Set(this.removed),route=[];
      while(removed.size<this.board.length) {
        const available=this.board.filter(t=>!removed.has(t.id)&&t.blockers.every(b=>removed.has(b)));
        const chosen=available[Math.floor(random()*available.length)];route.push(chosen.id);removed.add(chosen.id);
      }
      const eligible=this.active.filter(id=>!this.pending.some(job=>job.id===id));
      const priorities=[this.focus,...eligible.filter(id=>id!==this.focus)].filter(id=>eligible.includes(id));
      const permutations=arr=>arr.length<2?[arr]:arr.flatMap((item,i)=>permutations(arr.filter((_,j)=>i!==j)).map(rest=>[item,...rest]));
      for(const orders of permutations(priorities)) {
        const have=counts(this.pool()),foods=[];
        for(const id of [...orders,...this.queue])for(const food of MENU[id].ingredients) {
          if(have[food])have[food]--;else foods.push(food);
        }
        if(foods.length!==route.length)continue;
        const next=new LanternGame(this.seed,this.export());
        route.forEach((id,i)=>{next.board[id].food=foods[i];});
        next.focus=orders[0]??next.focus;next.witness=[...this.removed,...route];
        while(next.pending.length)next.completeDelivery(next.pending[0].key);
        let valid=true;
        for(const id of route) {
          if(next.status==='won')break;
          if(!next.pick(id).ok){valid=false;break;}
          while(next.pending.length)next.completeDelivery(next.pending[0].key);
          if(next.status==='jammed'){valid=false;break;}
        }
        if(!valid||next.status!=='won')continue;
        route.forEach((id,i)=>{this.board[id].food=foods[i];});
        this.focus=orders[0]??this.focus;this.witness=[...this.removed,...route];
        this.charges.shuffle--;this.shuffleCount++;this.undoState=null;
        return {ok:true};
      }
      return {ok:false,reason:'盘里的食材有点挤，先分装一盘或放回一味；本次不扣次数'};
    }
    refill(kind) {
      if(this.adUsed||this.status==='won')return {ok:false,reason:'本轮视频补给已用完'};
      if(kind==='revive') {
        if(this.status!=='jammed')return {ok:false,reason:'当前无需应急加格'};
        this.capacity=8;this.status='playing';
      } else if(['move','undo','shuffle'].includes(kind)&&this.charges[kind]===0) {
        if(kind==='move'&&this.reserve.length)return {ok:false,reason:'先用完旁盘食材'};
        this.charges[kind]=1;
      } else return {ok:false,reason:'无需补充'};
      this.adUsed=true;this.undoState=null;return {ok:true};
    }

  }
  LanternGame.FOOD=FOOD;LanternGame.MENU=MENU;scope.LanternGame=LanternGame;
})(typeof globalThis!=='undefined'?globalThis:this);
