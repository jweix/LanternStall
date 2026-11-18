(async function () {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('game'), slice = $('slice'), message = value => { $('message').textContent = value; };
  const [recipes, ingredients, layout, index] = await Promise.all(['data/recipes.json','data/ingredients.json','data/layout.json','assets/runtime/asset-index.json'].map(p=>fetch('../../../shared/'+p).then(r=>r.json())));
  const images = Object.fromEntries(await Promise.all(Object.entries(index).map(([id,asset])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve([id,image]);image.onerror=reject;image.src='../../../shared/assets/runtime/'+asset.path.split('/').pop();
  }))));
  const renderer=DapaidangScene.createRenderer(canvas.getContext('2d'),images,{recipes,ingredients,layout});
  let session, config, timeline=[], pending=[], suppress=false, lastSummary='', observed;
  const foodName=id=>ingredients.find(i=>i.id===id)?.name||id;
  function record(action){
    if(suppress)return;
    if(action.type==='tick'&&timeline.at(-1)?.type==='tick')timeline.at(-1).seconds+=action.seconds;
    else timeline.push(action);
  }
  function attach(){
    const e=session.engine;observed=e;
    for(const method of ['selectTile','undo','stash','returnStash','shuffle','tick','pause','applyRewardedRescue']){
      const original=e[method].bind(e);
      e[method]=(...args)=>{
        const was=suppress;if(method==='applyRewardedRescue')suppress=true;
        const result=original(...args);suppress=was;
        if(method==='selectTile'&&result.ok)record({type:'pick',id:args[0]});
        else if(method==='tick')record({type:'tick',seconds:args[0]});
        else if(method==='pause')record({type:'pause',value:args[0]!==false});
        else if(result&&method==='returnStash')record({type:'return',index:args[0]||0});
        else if(result&&['undo','stash','shuffle'].includes(method))record({type:method});
        else if(result&&method==='applyRewardedRescue')record({type:'ad-'+args[0]});
        return result;
      };
    }
  }
  function reset(next){
    if(session)session.dispose();
    session=new DapaidangSession.Session({recipes,layout,level:next.level,levelOptions:{definition:next.definition,seed:next.seed}});
    config=JSON.parse(JSON.stringify(next));session.config=config;session.engine=new DapaidangCore.Engine(config);
    session.engine.tools={undo:1,stash:1,shuffle:1};timeline=[];pending=[];attach();$('level').value=config.level;$('seed').value=config.seed;
    $('definition').value=JSON.stringify(config.definition,null,2);
    $('layer').replaceChildren(new Option('全部层','all'),...Array.from({length:config.metrics.layerCount},(_,i)=>new Option('第 '+(i+1)+' 层',String(i))));
    lastSummary='';message('已加载 '+config.contentId);
  }
  function load(edited){
    try{
      const n=Number($('level').value),seed=$('seed').value;
      reset(DapaidangLevels.createLevel(recipes,layout,n,{...(seed===''?{}:{seed:Number(seed)}),...(edited?{definition:JSON.parse($('definition').value)}:{})}));
    }catch(error){message(error.message);}
  }
  function settle(){
    let guard=0;
    while(Number.isFinite(session.engine._nextDue())&&guard++<1000)session.advance(Math.max(0,session.engine._nextDue()-session.engine.now));
    session.collectEvents();session.lastFrame=null;
  }
  function execute(action,stable=true){
    const e=session.engine;let ok=false;
    if(action.type==='pick')ok=session.pointer(e.nodes.find(n=>n.id===action.id));
    else if(action.type==='return')ok=e.returnStash(action.index);
    else if(action.type==='tick'){session.advance(action.seconds);return;}
    else if(action.type==='pause'){e.pause(action.value);return;}
    else if(action.type.startsWith('ad-'))ok=e.applyRewardedRescue(action.type.slice(3),e.levelId+'/lab-'+timeline.length);
    else if(['undo','stash','shuffle'].includes(action.type))ok=e[action.type]();
    if(!ok)throw Error('当前状态拒绝操作：'+JSON.stringify(action));
    if(stable)settle();else session.collectEvents();
  }
  $('load').onclick=()=>{$('seed').value='';load(false);};$('apply').onclick=()=>load(true);
  $('solve').onclick=()=>{
    const result=session.engine.continuation({tools:true,maxNodes:20000});pending=result.actions;
    message(({solved:'找到经真实引擎验证的路线',unsolvable:'该道具预算下已证明无解',unknown:'搜索预算内未知，不能判作无解'})[result.status]+'；访问 '+result.visited+' 个状态');
  };
  $('step').onclick=()=>{try{
    if(!pending.length){const id=config.solution.find(id=>!session.engine.nodes.find(n=>n.id===id).removed);if(id)pending=[{type:'pick',id}];}
    if(pending.length)execute(pending.shift());
  }catch(error){pending=[];message(error.message+'，请重新求解或重置');}};
  $('witness').onclick=()=>{try{const next=config;reset(next);for(const id of config.solution)execute({type:'pick',id});message('完整见证：'+session.engine.status+'，收入 '+session.engine.revenue);}catch(error){message(error.message);}};
  $('probe').onclick=()=>{try{
    const result=DapaidangLevels.probeLevel(config,$('policy').value,Number($('policy-seed').value));const next=config;reset(next);
    for(const id of result.route)execute({type:'pick',id});
    if((session.engine.status==='won')!==result.won)throw Error('策略模型与真实引擎不一致');
    message('策略结果：'+session.engine.status+'，取走 '+result.removed+' / '+config.tiles.length+' 张');
  }catch(error){message(error.message);}};
  canvas.addEventListener('pointerdown',event=>{if(session.engine.status==='won'){message('请用加载配置或回放按钮重置');return;}const r=canvas.getBoundingClientRect();session.pointer({x:(event.clientX-r.left)*928/r.width,y:(event.clientY-r.top)*1695/r.height});});
  function drawSlice(){
    const c=slice.getContext('2d');c.clearRect(0,0,818,791);
    const nodes=session.engine.nodes.filter(t=>!t.removed&&($('layer').value==='all'||t.layer===Number($('layer').value))).sort(DapaidangGeometry.paintOrder);
    for(const t of nodes){const x=t.x-55-t.w/2,y=t.y-536-t.h/2;c.fillStyle=session.engine.available(t.id)?'#fff1d5':'#b9a18a';c.fillRect(x+2,y+2,t.w-4,t.h-4);c.fillStyle='#60331b';c.textAlign='center';c.font='20px sans-serif';c.fillText(foodName(t.food),x+t.w/2,y+t.h/2-5);c.font='14px sans-serif';c.fillText('L'+(t.layer+1)+' · '+t.id,x+t.w/2,y+t.h/2+24);}
  }
  function snapshot(){const e=session.engine;return{status:e.status,revenue:e.revenue,removed:e.nodes.filter(t=>t.removed).length,buffer:e.buffer.map(i=>i.food),stash:e.stashItems.map(i=>i.food),orderCursors:e.orderCursors,foods:e.nodes.map(t=>t.food),toolUsed:e.toolUsed};}
  async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  $('export').onclick=async()=>{
    const result={generatorVersion:4,recipeHash:await digest(recipes),layoutHash:await digest(layout),policyVersion:2,config,timeline,budget:'free',snapshot:snapshot()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='level-'+config.level+'-trace.json';a.click();URL.revokeObjectURL(url);
  };
  $('file').onchange=async()=>{try{
    const saved=JSON.parse(await $('file').files[0].text());
    if(saved.generatorVersion!==4||saved.recipeHash!==await digest(recipes)||saved.layoutHash!==await digest(layout))throw Error('版本或配方/布局哈希不一致，请使用对应版本');
    reset(saved.config);session.engine.tools=saved.budget==='none'?{undo:0,stash:0,shuffle:0}:{undo:1,stash:1,shuffle:1};
    for(const action of saved.timeline||saved.result.actions)execute(action,!saved.timeline);
    if(saved.snapshot&&JSON.stringify(snapshot())!==JSON.stringify(saved.snapshot))throw Error('回放最终状态不一致');
    message('已复现离线记录：'+session.engine.status);
  }catch(error){message(error.message);}};
  const requested=Number(new URLSearchParams(location.search).get('level'))||1;
  reset(DapaidangLevels.createLevel(recipes,layout,requested));
  function frame(ms){
    if(session.engine!==observed){config=session.config;session.engine.tools={undo:1,stash:1,shuffle:1};timeline=[];pending=[];attach();lastSummary='';}
    session.frame(ms);
    renderer.draw(session.view(),{width:928,height:1695,dpr:1});drawSlice();
    const e=session.engine,m=config.metrics,text='第 '+config.level+' 关 · '+config.difficultyName+' · '+config.shapeName+'\n'+m.totalDishes+' 份菜 / '+m.recipeTypes+' 种菜谱 / '+m.tileCount+' 张食材 / '+m.layerCount+' 层\n开局可取 '+m.openingCount+' 张；同料最多 '+m.openingDominantCount+' 张\n'+e.status+' · 已取 '+e.nodes.filter(t=>t.removed).length+' 张 · 备菜 '+e.buffer.length+' + 在途 '+e.incoming.length+' · 收入 '+e.revenue;
    if(text!==lastSummary){$('summary').textContent=text;lastSummary=text;$('recipe-list').replaceChildren(...config.orderPlan.map((lane,i)=>{const p=document.createElement('p');p.textContent='桌 '+(i+1)+'：'+lane.map(id=>recipes.find(r=>r.id===id).name).join(' → ');return p;}));}
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>session.setHidden(document.hidden));
  window.lanternLab={get session(){return session;},get config(){return config;},get timeline(){return timeline;},load:reset};
  requestAnimationFrame(frame);
})().catch(error=>{document.getElementById('message').textContent=error.message;console.error(error);});
