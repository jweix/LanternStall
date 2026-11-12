/* 视频参考版：只操作展示层，菜品入账交由规则回调。 */
(function (scope) {
  'use strict';
  class LanternCook {
    constructor(root){this.root=root;this.stage=root.querySelector('[data-cook-stage]');this.tempo=1;this.running=false;this.currentKey=null;}
    async play(order,options={}){
      if(this.running)return;
      this.running=true;this.currentKey=order.key;
      const stage=this.stage,bits=stage.querySelector('[data-cook-bits]'),label=stage.querySelector('[data-cook-label]');
      const wok=stage.querySelector('.ls-wok-wrap'),mix=stage.querySelector('[data-cooked-mix]');
      const dish=stage.querySelector('[data-dish]'),coin=stage.querySelector('[data-cook-coin]');
      const reduced=scope.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration=ms=>reduced?20:ms/this.tempo;
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,duration(ms)));
      const animate=async(el,frames,ms,delay=0)=>{
        if(reduced){Object.assign(el.style,frames[frames.length-1]);return;}
        const a=el.animate(frames,{duration:duration(ms),delay:duration(delay),easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'});
        await a.finished.catch(()=>{});
      };
      const phase=(name,text)=>{stage.dataset.phase=name;label.textContent=text;options.onPhase?.(name);};
      try{
        bits.innerHTML='';coin.textContent='';dish.style.opacity='0';
        dish.style.backgroundPosition=order.ingredients.includes('noodle')?'33.3333% 100%':order.ingredients.includes('tomato')?'66.6667% 0%':order.ingredients.includes('corn')?'0% 100%':'100% 0%';
        phase('gather','食材自动入锅');
        const stageBox=stage.getBoundingClientRect(),rootBox=this.root.querySelector('.ls-phone').getBoundingClientRect();
        const targetX=stageBox.width*.45-14,targetY=37;
        const items=order.ingredients.map((food,i)=>{
          const n=scope.LanternGame.FOOD[food].sprite,el=document.createElement('span');el.className='ls-food ls-cook-bit';
          el.style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)*(100/3)}%`;bits.appendChild(el);
          const source=options.sources?.[i];
          const sx=source?source.x+rootBox.left-stageBox.left+source.width/2-14:-55+i*14;
          const sy=source?source.y+rootBox.top-stageBox.top+source.height/2-14:45;
          const x=targetX+(i-1)*6,y=targetY+(i%2)*3;
          return {el,x,y,flight:animate(el,[{transform:`translate(${sx}px,${sy}px) scale(.8)`,opacity:1},{transform:`translate(${(sx+x)/2}px,${Math.min(sy,y)-22}px) scale(1)`,opacity:1},{transform:`translate(${x}px,${y}px) scale(.7)`,opacity:1}],250,i*35)};
        });
        await Promise.all(items.map(x=>x.flight));options.onGathered?.();
        phase('stir','大火快炒');
        await Promise.all(items.map(x=>animate(x.el,[{transform:`translate(${x.x}px,${x.y}px) scale(.7)`,opacity:1},{transform:`translate(${x.x}px,${x.y+3}px) scale(.3)`,opacity:0}],100)));
        bits.innerHTML='';
        for(let i=0;i<2;i++){
          await Promise.all([
            animate(wok,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(4px,-5px) rotate(-9deg)'},{transform:'translate(0,0) rotate(0)'}],235),
            animate(mix,[{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate(5px,-22px) rotate(12deg)',opacity:1},{transform:'translate(0,0) rotate(0)',opacity:1}],235)
          ]);
        }
        phase('season','添香翻匀');await wait(170);
        mix.style.opacity='1';
        phase('plate','出锅啦');
        await Promise.all([
          animate(mix,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(0,-9px) scale(.7)',opacity:0}],180),
          animate(dish,[{transform:'translateY(9px) scale(.7)',opacity:0},{transform:'translateY(0) scale(1.02)',opacity:1}],180)
        ]);
        await wait(150);
        phase('serve','趁热上桌');
        const target=this.root.querySelector(`[data-ticket="${order.id}"]`),box=target?.getBoundingClientRect(),now=stage.getBoundingClientRect();
        const dx=box?box.left+box.width/2-(now.left+stageBox.width/2):0;
        const dy=box?box.top+box.height*.55-(now.top+58):-60;
        await animate(dish,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.35}px,${dy*.3}px) scale(.75)`,opacity:1,offset:.35},{transform:`translate(${dx}px,${dy}px) scale(.28)`,opacity:.8,offset:.92},{transform:`translate(${dx}px,${dy}px) scale(.22)`,opacity:0}],370);
        options.onDelivered?.();
        phase('served','上桌啦');coin.textContent=`+¥${order.reward+(order.tip||0)}`;
        await animate(coin,[{transform:'translateY(6px)',opacity:0},{transform:'translateY(-2px)',opacity:1,offset:.25},{transform:'translateY(-9px)',opacity:0}],260);
      }finally{
        stage.querySelectorAll('*').forEach(el=>{el.getAnimations().forEach(a=>a.cancel());if(el!==dish&&el!==mix)el.style.removeProperty('opacity');});
        bits.innerHTML='';dish.style.opacity='0';mix.style.opacity='0';mix.style.removeProperty('transform');coin.textContent='';
        stage.dataset.phase='idle';label.textContent='凑齐自动入锅';this.running=false;this.currentKey=null;
      }
    }
  }
  scope.LanternCook=LanternCook;
})(globalThis);
