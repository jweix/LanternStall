(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('../data/progression.js'),require('./stall-art.js'),require('../data/lobby-layout.js'));
  else root.DapaidangOutfitUI=factory(root.DapaidangProgression,root.DapaidangStallArt,root.DapaidangLobbyLayout);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,Art,L){
  'use strict';
  const preview=L.decor.preview,themeList=L.decor.themeList,rareList=L.decor.rareList,ownedList=L.decor.rareList;
  function create(c,U,scene){
    let hits=[],v;
    const text=U.words;
    function hit(rect,action,value,label){hits.push({rect:rect.slice(),action,value,label});}
    function button(label,rect,action,value,disabled,kind){
      if(disabled){text(label,rect[0]+rect[2]/2,rect[1]+rect[3]/2,31,'#826344','center',rect[2]);return;}
      U.button(label,rect,{kind:kind||'primary',size:rect[3]>100?36:30});
      hit(rect,action,value,label);
    }
    function drawPreview(){
      scene.draw(v.appearance,preview,{camera:'preview'});
      U.outline(preview,'#ffe8b7',3,27);
      const family=C.byTheme[v.previewFamily],familyTrial=family&&!C.slots.every(slot=>v.state.equipped[slot]===family.id+'-'+slot),trial=v.themePreview&&!v.themeOffer.equipped||!!v.preview||familyTrial;
      const label=trial?'试穿中 · 未保存':'当前使用的装扮';
      c.save();c.shadowColor='#17343d';c.shadowBlur=6;c.shadowOffsetY=1;
      text(label,preview[0]+22,preview[1]+30,29,'#fff5d8','left',480);c.restore();
      if(trial){const r=[593,preview[1]+13,242,76];U.button('恢复当前装扮',r,{size:28});hit(r,'cancel-outfit-preview',null,'恢复当前装扮');}

    }
    function scrollArea(rect,content,requested,paint){
      const max=Math.max(0,content-rect[3]);
      const offset=Math.max(0,Math.min(max,requested));
      hit(rect,'scroll-region',{max,offset},'装扮列表，可上下滑动');
      c.save();c.beginPath();c.rect(...rect);c.clip();
      paint(offset);c.restore();
      if(max){
        const h=Math.max(48,rect[3]*rect[3]/content),y=rect[1]+(rect[3]-h)*offset/max;
        U.round([834,rect[1]+8,6,rect[3]-16],'#bc884955',3);
        U.round([834,y+8,6,h-16],'#a7622bb3',3);
      }
    }
    function clippedHit(r,rect,action,value,label){
      const top=Math.max(r[1],rect[1]),bottom=Math.min(r[1]+r[3],rect[1]+rect[3]);
      if(bottom-top>36)hit([r[0],top,r[2],bottom-top],action,value,label);
    }
    function list(items,rect,height,selected,paint,action,columns=2){
      const dy=height+12,content=Math.max(0,Math.ceil(items.length/columns)*dy-12);
      const requested=v.decorScroll===null?Math.floor(Math.max(0,items.findIndex(i=>i.id===selected))/columns)*dy:v.decorScroll||0;
      scrollArea(rect,content,requested,offset=>{
      items.forEach((item,i)=>{
        const r=[rect[0]+i%columns*401,rect[1]+Math.floor(i/columns)*dy-offset,columns===1?rect[2]:388,height];
        if(r[1]+r[3]<=rect[1]||r[1]>=rect[1]+rect[3])return;
        U.skin('card',r);paint(item,r);
        if(item.id===selected)U.outline([r[0]+3,r[1]+3,r[2]-6,r[3]-6],'#d83a22',4,27);
        clippedHit(r,rect,action,item.id,item.label||item.name);
      });
      });
    }
    function price(value,x,y){
      U.sprite('lobby-coin',[x,y-18,32,32]);text(value.toLocaleString(),x+44,y,29,'#8c4522','left');
    }
    function themes(){
      const options=C.shopThemes.map(t=>({...t,label:t.name+'，'+(v.themeOffers[t.id].complete?'已拥有':v.themeOffers[t.id].price+'金币')}));
      list(options,themeList,186,v.themePreview||v.themeOffer.equipped?v.theme:null,(theme,r)=>{
        const offer=v.themeOffers[theme.id],a=Object.fromEntries(C.slots.map(slot=>[slot,theme]));
        scene.draw(a,[r[0]+13,r[1]+25,171,151],{camera:'preview'});
        text(theme.short,r[0]+201,r[1]+49,36,'#663713','left');
        if(offer.complete){
          U.round([r[0]+198,r[1]+83,167,48],offer.equipped?'#d6e89d':'#f2d29a',24);
          text(offer.equipped?'使用中':'已拥有',r[0]+281,r[1]+107,27,offer.equipped?'#52732d':'#805122','center');

        }else{
          text(offer.owned?'已有'+offer.owned+'件抵扣':offer.unlocked?'':'首通'+offer.unlock+'关',r[0]+201,r[1]+95,26,'#885e3b','left');
          price(offer.price,r[0]+201,r[1]+150);
        }
      },'theme');
      const offer=v.themeOffer,short=C.byTheme[v.theme].short;
      let label,action='theme-details',disabled=false;
      if(!v.themePreview&&!offer.equipped){label='点选套装，预览后再换上';disabled=true;}
      else if(offer.complete){label=offer.equipped?short+' · 使用中':'换上'+short+'整套';action='equip-theme';disabled=offer.equipped;}
      else if(!offer.unlocked)label=short+' · 首通'+offer.unlock+'关解锁';
      else label=(offer.owned?'补齐':'购买')+short+' · '+offer.price.toLocaleString()+'金币';
      button(label,L.decor.cta,action,v.theme,disabled);
    }
    function rareThemes(){
      const families=C.rareFamilies.filter(f=>f.theme);
      list(families,rareList,174,v.category,(f,r)=>{
        const count=f.items.filter(id=>v.state.owned.includes(id)).length;
        scene.draw(Object.fromEntries(C.slots.map(slot=>[slot,C.byTheme[f.theme]])),[r[0]+18,r[1]+14,245,145],{camera:'preview'});
        text(f.name,r[0]+293,r[1]+47,37,'#663713','left');
        text('已收集 '+count+' / '+f.items.length,r[0]+758,r[1]+88,29,'#587b31','right');
        U.meter(count,f.items.length,[r[0]+295,r[1]+117,462,24]);
      },'rare-family',1);
      const family=families.find(f=>f.id===v.category);
      if(!family){button('点选珍藏主题，试穿整套',L.decor.cta,null,null,true);return;}
      const complete=family.items.every(id=>v.state.owned.includes(id)),equipped=family.items.every(id=>v.state.equipped[C.byId[id].slot]===id);
      if(!v.previewFamily&&!equipped){button('点选珍藏主题，试穿整套',L.decor.cta,null,null,true);return;}
      button(complete?(equipped?family.name+' · 使用中':'换上'+family.name+'整套'):'查看收集进度 · '+family.name,L.decor.cta,complete?'equip-rare-family':'rare-family-details',family.id,equipped,complete?undefined:'secondary');
    }
    function ownedRares(){
      const entries=[];let content=0,count=0;
      for(const family of C.rareFamilies){
        const items=family.items.filter(id=>v.state.owned.includes(id)).map(id=>C.byId[id]);
        if(!items.length)continue;
        entries.push({family,y:content});content+=46;count+=items.length;
        items.forEach((item,i)=>entries.push({item,x:i%2*401,y:content+Math.floor(i/2)*186}));
        content+=Math.ceil(items.length/2)*186+12;
      }
      const selected=entries.find(e=>e.item?.id===v.selection),requested=v.decorScroll===null?Math.max(0,(selected?.y||0)-46):v.decorScroll||0;
      scrollArea(ownedList,content,requested,offset=>{
        for(const entry of entries){
          const y=ownedList[1]+entry.y-offset;
          if(y+174<ownedList[1]||y>ownedList[1]+ownedList[3])continue;
          if(entry.family){text(entry.family.name,56,y+18,28,'#75401a','left');U.round([56,y+37,765,1.5],'#c18d5155',1);continue;}
          const item=entry.item,r=[ownedList[0]+entry.x,y,388,174],offer=v.rareOffers[item.id];
          U.skin('card',r);scene.item(item.slot,item.theme,[r[0]+20,r[1]+15,137,140]);
          text(item.name,r[0]+171,r[1]+47,30,'#663713','left',202);
          if(offer.equipped){U.round([r[0]+171,r[1]+84,185,44],'#d6e89d',22);text('使用中',r[0]+263,r[1]+106,26,'#52732d','center');U.outline([r[0]+3,r[1]+3,382,168],'#7c9c43',3,27);}
          else text(v.preview===item.id?'试穿中':'已拥有',r[0]+171,r[1]+106,25,'#965120','left');
          if(v.preview===item.id)U.outline([r[0]+3,r[1]+3,382,168],'#d83a22',4,27);
          clippedHit(r,ownedList,'preview-owned-rare',item.id,item.name+(offer.equipped?'，使用中':'，已拥有'));
        }
      });
      if(!count){text('暂未拥有珍藏部件',444,1195,32,'#885e3b','center');text('收集菜谱或参与夜市，达成后自动获得',444,1260,25,'#885e3b','center');}
      const item=C.byId[v.selection],offer=item&&v.rareOffers[item.id],ready=offer?.owned;
      if(ready&&offer.equipped)button('换下'+item.name,L.decor.cta,'restore-owned-rare',item.id,false,'secondary');
      else button(!ready?'点选部件，试穿后再换上':'换上'+item.name,L.decor.cta,'equip-owned-rare',item?.id,!ready||v.preview!==item.id);
    }
    function rares(){
      [['themes','珍藏主题'],['owned','拥有的']].forEach(([id,name],i)=>{const r=[40+i*403.5,1008,403.5,62];U.button(name,r,{kind:'tab',selected:v.rareMode===id,size:29});hit(r,'rare-mode',id,name);});
      if(v.rareMode==='owned')ownedRares();else rareThemes();
    }
    function draw(view){
      v=view;hits=[];
      const rare=v.sub.decor!=='themes';
      [['themes','主题套装'],['rares','珍藏装扮']].forEach(([id,name],i)=>{
        const r=[34+i*408.5,330,408.5,68];
        U.button(name,r,{kind:'tab',selected:rare?id==='rares':id==='themes',size:35});hit(r,'sub',id,name);
      });
      drawPreview();if(rare)rares();else themes();
      return hits;
    }
    return{draw};
  }
  return{create,themeList,rareList,ownedList};
});
