(function(){
  'use strict';
  const root=document.getElementById('lantern-stall-preview'),$=selector=>root.querySelector(selector);
  const FOOD=LanternGame.FOOD,MENU=LanternGame.MENU,saved=LanternPlatform.loadGame();
  let game=new LanternGame(saved?.seed||20261111,saved),modal=null,lastFocus=null,processing=null,pendingRestore=null;
  let demoRunning=false,stopDemo=false;
  const cook=new LanternCook(root),jobSources=new Map();
  const tools={move:{name:'先搁一盘',detail:'移出前 3 味',symbol:'▱'},undo:{name:'放回一味',detail:'撤回上一步',symbol:'↶'},shuffle:{name:'重新理菜',detail:'重排台上食材',symbol:'⤨'}};
  const sprite=food=>{const n=FOOD[food].sprite;return `<span class="ls-food" aria-hidden="true" style="background-position:${n%3*50}% ${Math.floor(n/3)*(100/3)}%"></span>`;};
  function say(text){$('[data-message]').textContent=text;}
  function persist(){if(!demoRunning)LanternPlatform.saveGame(game.export(),{game:'灯火大排档',income:game.income,revenueTarget:game.revenueTarget,status:game.status});}
  function renderOrders(){
    $('[data-orders]').innerHTML=game.active.map((id,slot)=>{
      const order=MENU[id],job=game.pending.find(job=>job.id===id),current=job?.key===cook.currentKey;
      const ingredients=job?order.ingredients.map(food=>({food,ready:true})):game.progress(id).ingredients;
      const state=job?(current?'正在快炒':'等候入锅'):'';
      return `<article class="ls-ticket ${game.focus===id?'focused':''} ${current?'cooking':''}" data-ticket="${id}"><button type="button" class="ls-ticket-select cursor-interaction" data-order="${id}" aria-pressed="${game.focus===id}" aria-label="优先制作${order.name}" ${job||demoRunning?'disabled':''}><div class="ls-ticket-meta"><span>${String(slot+1).padStart(2,'0')} 桌</span><strong>+¥${order.reward}</strong></div><h2>${order.name}</h2><div class="ls-recipe">${ingredients.map(part=>`<span class="ls-ingredient ${part.ready?'ready':''}" aria-label="${FOOD[part.food].name}${part.ready?'已备好':'尚缺'}">${sprite(part.food)}</span>`).join('')}</div><span class="ls-ticket-state">${state}</span></button></article>`;
    }).join('');
  }
  function renderBoard(){
    const available=new Set(game.available().map(t=>t.id)),removed=new Set(game.removed),field=$('[data-tile-field]');
    const needed=game.focus===null?[]:game.progress(game.focus).ingredients.filter(p=>!p.ready).map(p=>p.food);
    root.style.setProperty('--ls-tile-size',game.layoutVersion===3?'15%':'17.4%');field.innerHTML='';
    for(const t of game.board){
      const ghost=removed.has(t.id),el=document.createElement(ghost?'span':'button');
      if(!ghost){el.type='button';el.dataset.tile=t.id;el.disabled=demoRunning||!available.has(t.id)||game.status!=='playing';el.setAttribute('aria-label',`${FOOD[t.food].name}${available.has(t.id)?'，可拿取':'，被上层食材遮住'}`);}
      else el.setAttribute('aria-hidden','true');
      el.className=`ls-tile ${ghost?'ghost':`cursor-interaction ${available.has(t.id)?'':'covered'} ${available.has(t.id)&&needed.includes(t.food)?'wanted':''}`}`;
      el.style.cssText=`left:${t.x}%;top:${t.y}%;z-index:${t.z+1};--tile-angle:${((t.id*7)%3-1)*.35}deg`;el.innerHTML=sprite(t.food);field.appendChild(el);
    }
  }
  function renderTray(){
    const slot=id=>id===undefined?'<div class="ls-slot" aria-label="空格"></div>':`<div class="ls-slot filled" data-slot-id="${id}" aria-label="${FOOD[game.board[id].food].name}">${sprite(game.board[id].food)}</div>`;
    $('[data-tray-count]').textContent=`${game.tray.length} / ${game.capacity}`;
    $('[data-tray]').className='ls-tray'+(game.tray.length>=game.capacity-2?' danger':'')+(game.capacity===8?' extended':'');
    $('[data-tray]').innerHTML=Array.from({length:game.capacity},(_,i)=>slot(game.tray[i])).join('');
    $('[data-reserve]').hidden=!game.reserve.length;$('[data-reserve-slots]').innerHTML=[0,1,2].map(i=>slot(game.reserve[i])).join('');
  }
  function render(){
    root.dataset.demo=String(demoRunning);root.dataset.cooking=String(!!processing);root.dataset.pending=game.pending.length;
    $('[data-income]').textContent=game.income;$('[data-goal]').textContent=game.revenueTarget;
    $('[data-meter]').style.width=Math.min(100,game.income/game.revenueTarget*100)+'%';
    $('.ls-meter').setAttribute('aria-valuemax',game.revenueTarget);$('.ls-meter').setAttribute('aria-valuenow',game.income);
    renderOrders();renderBoard();renderTray();
    $('[data-tools]').innerHTML=Object.entries(tools).map(([kind,tool])=>{
      const exhausted=game.charges[kind]===0;
      const disabled=demoRunning||game.status==='won'||(exhausted&&game.adUsed)||(kind==='move'&&(game.reserve.length>0||(!exhausted&&!game.tray.length)))||(kind==='undo'&&!exhausted&&!game.undoState)||(kind==='shuffle'&&game.status!=='playing');
      return `<button type="button" class="ls-tool cursor-interaction" data-action="${kind}" ${disabled?'disabled':''} aria-label="${tool.name}，${exhausted?'视频补充':tool.detail}"><span class="ls-tool-symbol" aria-hidden="true">${tool.symbol}</span><span><b>${tool.name}</b><small>${exhausted?(game.adUsed?'本轮已用':'▷ 视频补充'):tool.detail}</small></span></button>`;
    }).join('');
    const demo=$('[data-action="demo"]');demo.textContent=demoRunning?'■':'▶';demo.disabled=!!processing&&!demoRunning;demo.setAttribute('aria-label',demoRunning?'结束演示':'播放操作与出餐演示');
    $('[data-bottom-mark]').textContent=demoRunning?'· 演示中：连续选料，自动快炒 ·':'· 灯火亮着，热饭等你 ·';
    if(!modal&&!demoRunning){if(game.status==='jammed')showJam();else if(game.status==='won'&&!game.pending.length)showWin();}
  }
  function openModal(content,type){lastFocus=document.activeElement;modal=type;$('[data-overlay]').innerHTML=`<div class="ls-modal" role="dialog" aria-modal="true" aria-labelledby="ls-dialog-title">${content}</div>`;$('[data-overlay]').hidden=false;$('[data-overlay]').querySelector('button')?.focus();}
  function closeModal(){modal=null;$('[data-overlay]').hidden=true;$('[data-overlay]').innerHTML='';if(lastFocus?.isConnected)lastFocus.focus();else $('[data-action="rules"]').focus();}
  function showRules(){openModal(`<h2 id="ls-dialog-title">今晚怎么开张</h2><ul><li>按小票图标拿亮牌，放进七格备菜盘。</li><li>配齐自动入锅：快炒、调味、装盘、送上桌。</li><li>锅里在炒时，可以继续拿食材。</li><li>收入达到 ¥${game.revenueTarget} 就达标，不限出餐份数。</li><li>先搁一盘：把前三味移到旁盘，仍能下锅。</li><li>放回一味：撤回尚未凑成菜的拿取。</li><li>重新理菜：只重排剩余食材，牌位不动。</li></ul><p>左上角 ▶ 可播放连续配菜演示；演示结束后恢复原局面。视频补给仍为模拟交互。</p><div class="ls-modal-actions"><button type="button" class="primary" data-action="cancel">明白，开火</button></div>`,'rules');}
  function showJam(){
    const move=game.charges.move>0&&!game.reserve.length,undo=game.charges.undo>0&&game.undoState;
    openModal(`<h2 id="ls-dialog-title">备菜盘有点挤</h2><p>先腾点地方，接着炒。</p><div class="ls-modal-detail">${move?'先搁一盘，把前面三味分到旁盘。':undo?'放回刚拿的一味，再想一手。':!game.adUsed?'视频补给可以临时多加一格。':'这轮补给已用完，再摆一摊试试。'}</div><div class="ls-modal-actions"><button type="button" data-action="restart">重新出摊</button>${move?'<button type="button" class="primary" data-action="move">先搁一盘</button>':undo?'<button type="button" class="primary" data-action="undo">放回一味</button>':!game.adUsed?'<button type="button" class="primary" data-ad="revive">▷ 加一个盘格</button>':''}</div>`,'jam');
  }
  function showWin(){openModal(`<h2 id="ls-dialog-title">今夜生意，达标啦</h2><div class="ls-result-value">¥${game.income}</div><div class="ls-result-label">今夜营业收入 · 目标 ¥${game.revenueTarget}</div><div class="ls-modal-detail">一锅接一锅，热乎饭都上桌啦。</div><div class="ls-modal-actions"><button type="button" data-action="restart">再摆一摊</button><button type="button" class="primary" data-action="night">下一晚预演</button></div>`,'won');}
  function showAd(kind){const text=kind==='revive'?'备菜盘多一格':tools[kind].name+'次数 +1';openModal(`<h2 id="ls-dialog-title">歇口气，补个给</h2><p>完整观看视频，获得 ${text}。</p><div class="ls-modal-detail">交互演示 · 未接入真实广告<br>取消保留现场，完整观看回调后发奖。</div><div class="ls-modal-actions"><button type="button" data-action="ad-cancel">暂时不用</button><button type="button" class="primary" data-ad-complete="${kind}">模拟完整观看</button></div>`,'ad');}
  function localRect(el){if(!el)return null;const a=el.getBoundingClientRect(),b=$('.ls-phone').getBoundingClientRect();return {x:a.x-b.x,y:a.y-b.y,width:a.width,height:a.height};}
  function fly(from,food,destination){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const a=localRect(from),b=destination||localRect($('[data-tray]'));
    if(!a||!b)return;const el=document.createElement('span'),n=FOOD[food].sprite;el.className='ls-flight ls-food';
    el.style.cssText=`left:${a.x}px;top:${a.y}px;--dx:${b.x-a.x}px;--dy:${b.y-a.y}px;background-position:${n%3*50}% ${Math.floor(n/3)*(100/3)}%`;
    $('[data-flying]').appendChild(el);setTimeout(()=>el.remove(),350);
  }
  function take(id,element){
    const slots=new Map([...root.querySelectorAll('[data-slot-id]')].map(el=>[Number(el.dataset.slotId),localRect(el)]));
    const empty=$('[data-tray]').querySelector('.ls-slot:not(.filled)'),destination=localRect(empty)||localRect($('[data-tray]'));
    slots.set(id,destination);
    const result=game.pick(id);if(!result.ok){say(result.reason);return;}
    if(element)fly(element,game.board[id].food,destination);
    for(const job of result.deliveries)jobSources.set(job.key,job.tileIds.map(tileId=>slots.get(tileId)));
    say(result.deliveries.length?'材料配齐，等候入锅。':'食材已放进备菜盘。');
    render();persist();void pumpCooking();
  }
  function pumpCooking(){
    if(processing)return processing;
    if(!game.pending.length)return Promise.resolve();
    const current=game;
    processing=(async()=>{
      try{
        while(game===current&&current.pending.length){
          const job=current.pending[0];
          await cook.play(job,{sources:jobSources.get(job.key),onPhase(){renderOrders();},onDelivered(){
            const result=current.completeDelivery(job.key);jobSources.delete(job.key);
            if(result.ok){say(`${job.name}上桌，收入 +¥${job.reward+job.tip}`);render();persist();}
          }});
        }
      }finally{processing=null;render();if(pendingRestore){const state=pendingRestore;pendingRestore=null;restoreState(state);}else if(game!==current&&game.pending.length)void pumpCooking();}
    })();
    render();return processing;
  }
  async function playDemo(){
    if(demoRunning){stopDemo=true;return;}
    if(processing)return;
    const original=game;game=new LanternGame();demoRunning=true;stopDemo=false;jobSources.clear();render();
    try{
      for(const id of game.witness.slice(0,8)){
        if(stopDemo)break;
        const el=$(`[data-tile="${id}"]`);el?.classList.add('demo-target');
        await new Promise(resolve=>setTimeout(resolve,280));if(stopDemo)break;
        take(id,el);await new Promise(resolve=>setTimeout(resolve,160));
      }
      while(processing)await processing;
    }finally{
      demoRunning=false;game=original;jobSources.clear();render();say('演示结束，原来的备菜盘已恢复。');
      if(pendingRestore){const state=pendingRestore;pendingRestore=null;restoreState(state);}
    }
  }
  function restart(next){const goal=game.revenueTarget;closeModal();game=new LanternGame(next?game.seed+1:game.seed,null,{revenueTarget:next?Math.min(720,goal+120):goal});jobSources.clear();say('新一摊已摆好，按小票开始配菜。');render();persist();}
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;const action=button.dataset.action;
    if(action==='demo'){await playDemo();return;}
    if(demoRunning)return;
    if(button.dataset.tile!==undefined){take(Number(button.dataset.tile),button);return;}
    if(button.dataset.order!==undefined){game.select(Number(button.dataset.order));render();persist();return;}
    if(button.dataset.ad){showAd(button.dataset.ad);return;}
    if(button.dataset.adComplete){const result=game.refill(button.dataset.adComplete);closeModal();if(!result.ok)say(result.reason);render();persist();return;}
    if(action==='rules'){showRules();return;}
    if(action==='cancel'||action==='ad-cancel'){closeModal();if(game.status==='jammed')showJam();return;}
    if(action==='restart'||action==='night'){restart(action==='night');return;}
    if(tools[action]){
      if(game.charges[action]===0){showAd(action);return;}if(modal)closeModal();
      const result=action==='move'?game.moveAside():action==='undo'?game.undo():game.shuffle();
      if(!result.ok)say(result.reason);render();persist();
      if(action==='shuffle'&&result.ok){$('[data-tile-field]').classList.add('mixing');setTimeout(()=>$('[data-tile-field]').classList.remove('mixing'),350);}
    }
  });
  root.addEventListener('keydown',event=>{
    if(!modal)return;
    if(event.key==='Escape'&&['rules','ad'].includes(modal)){event.preventDefault();closeModal();if(game.status==='jammed')showJam();}
    if(event.key==='Tab'){const buttons=[...$('[data-overlay]').querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}}
  });
  function restoreState(state){
    if(![2,3,4].includes(state?.version)||JSON.stringify(state)===JSON.stringify(game.export()))return;
    if(processing||demoRunning){pendingRestore=state;return;}
    game=new LanternGame(state.seed,state);if(modal)closeModal();say('上次的摊位已经接着摆好。');render();void pumpCooking();
  }
  LanternPlatform.onGameChanged(restoreState);render();void pumpCooking();
  if(globalThis.Tweak){const t=new Tweak({container:$('[data-cook-stage]'),onChange(){}});t.addSlider(cook,'tempo',{label:'快炒速度',min:.7,max:1.4,step:.1});}
})();
