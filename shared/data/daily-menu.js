/* Small, deterministic daily menus. No platform clock, rewards or profile writes. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.DapaidangDailyMenu=f();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const names=['家常开胃','鲜香小炒','今晚拿手菜'],rewards=[120,160,200];
  const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0;};
  function definition(recipes,day,index){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(index)||index<0||index>2)throw Error('Invalid daily menu');
    const seed=hash(day+':'+index),pool=[];
    // Prefer a different lead dish each night; never put a subset recipe beside
    // its superset, even when their cards would initially be in another wave.
    for(let n=0;n<recipes.length&&pool.length<3;n++){
      const recipe=recipes[(seed+n*7)%recipes.length];
      if(pool.every(r=>!r.ingredients.some(f=>recipe.ingredients.includes(f))))pool.push(recipe);
    }
    if(pool.length!==3)throw Error('Daily menu needs three compatible dishes');
    const count=5+index,orders=Array.from({length:count},(_,i)=>pool[i%pool.length].id);
    const shape=['islands','pairs','ring'][index],cards=orders.reduce((n,id)=>n+recipes.find(r=>r.id===id).ingredients.length,0);
    return {level:1,difficulty:'easy',shape,layers:Math.max(2,Math.ceil(cards/(shape==='ring'?16:8))),seed,orders};
  }
  return {names,rewards,definition,hash};
});
