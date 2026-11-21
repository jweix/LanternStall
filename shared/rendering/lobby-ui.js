/* Live lobby hierarchy: background → scene/widgets → independent state/text. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('../data/progression.js'),require('./stall-art.js'),require('./lobby-components.js'),require('./lobby-scene.js'),require('../data/lobby-layout.js'),require('./outfit-ui.js'));
 else root.DapaidangLobby=factory(root.DapaidangProgression,root.DapaidangStallArt,root.DapaidangLobbyComponents,root.DapaidangLobbyScene,root.DapaidangLobbyLayout,root.DapaidangOutfitUI);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,Art,Components,Scenes,L,Outfits){
 'use strict';
 const SIZE=L.size,R=L,slots=['lamp','awning','tables','ornament','menu','plate','wok'];
 const slotNames={lamp:'灯串',awning:'棚布',tables:'桌饰',ornament:'摆件',menu:'招牌',plate:'餐盘',wok:'炒锅',chef:'大厨',background:'场景'};
 const navs=[['home','小摊'],['decor','装扮'],['recipes','菜谱'],['market','夜市']];
 const recipeArtNames=['番茄炒蛋','青椒肉片','双料香菇鸡','西兰花虾仁','芹菜牛肉','豆腐炒蛋'];
 function viewport(width,height,insets){const i=Object.assign({left:0,top:0,right:0,bottom:0},insets||{}),scale=Math.min((width-i.left-i.right)/SIZE.width,(height-i.top-i.bottom)/SIZE.height);return{scale,x:i.left+(width-i.left-i.right-SIZE.width*scale)/2,y:i.top+(height-i.top-i.bottom-SIZE.height*scale)/2};}
 function create(c,images,catalog){
  const U=Components.create(c,images,catalog.lobbyBodyFont,catalog.assets,catalog.createCanvas),scene=Scenes.create(c,images,catalog.assets),outfits=Outfits.create(c,U,scene);let hits=[],v;
  const text=U.words,display=U.display,round=U.round,grad=U.gradient,stroke=U.outline,check=U.check,chevron=U.chevron,meter=U.meter,sprite=U.sprite;
  const card=r=>U.skin('card',r),itemCard=card,paper=card;
  function hit(rect,action,value,label){hits.push({rect:rect.slice(),action,value,label});}
  function gridRect(g,i){return[g.x+i%g.columns*g.dx,g.y+Math.floor(i/g.columns)*g.dy,g.w,g.h];}
  function drawItem(slot,theme,r){scene.item(slot,theme,r);}
  function primary(label,r,action,value,disabled){U.button(label,r,{kind:'primary',disabled,size:r[3]>100?45:38});if(!disabled)hit(r,action,value,label);}
  function secondary(label,r,action,value,disabled,kind){U.button(label,r,{disabled,size:30,kind});if(!disabled&&action)hit(r,action,value,label);}
  function tabs(entries,selected,r,action){const w=r[2]/entries.length;entries.forEach(([id,name],i)=>{const b=[r[0]+i*w,r[1],w,r[3]];U.button(name,b,{kind:'tab',selected:id===selected,size:37});hit(b,action||'sub',id,name);});}
  function pagination(count,per,y){const max=Math.max(0,Math.ceil(count/per)-1),p=Math.min(v.page,max);secondary('上一页',[102,y,224,72],'page',-1,p===0,'page');secondary('下一页',[561,y,224,72],'page',1,p===max,'page');text((p+1)+' / '+(max+1),444,y+37,35,'#74411e','center');return p;}
  function title(name,subtitle){const boxes={decor:[285,207,322,64],recipes:[287.5,207,312,64],market:[284,207,318,64]},r=boxes[v.tab];sprite('lobby-art-title-'+v.tab,r);const clouds=[221,666,239];U.ornament(clouds[0],clouds[2],1,'decor');U.ornament(clouds[1],clouds[2],-1,'decor');if(subtitle)sprite('lobby-art-subtitle-decor',[240,282,408,32]);}
  function header(){
    if(v.tab==='home')sprite('lobby-brand-home',R.header.brandHome);
    // Warm/base already have this festoon in their environment source.
    if(!['base','warm'].includes((v.savedAppearance||v.appearance).background.id)){
      c.save();c.strokeStyle='#9d683c';c.lineWidth=2.2;c.beginPath();c.moveTo(346,-4);c.bezierCurveTo(390,140,620,100,735,-4);c.stroke();
      for(const t of [.16,.30,.44,.58,.72,.85]){const u=1-t,x=u*u*u*346+3*u*u*t*390+3*u*t*t*620+t*t*t*735,y=u*u*u*-4+3*u*u*t*140+3*u*t*t*100+t*t*t*-4;
        c.strokeStyle='#9d683c';c.beginPath();c.moveTo(x,y);c.lineTo(x,y+8);c.stroke();const g=c.createRadialGradient(x,y+12,1,x,y+12,17);g.addColorStop(0,'#ffdf8dcc');g.addColorStop(1,'#ffb73500');c.fillStyle=g;c.beginPath();c.arc(x,y+12,17,0,Math.PI*2);c.fill();c.fillStyle='#fff2b5';c.beginPath();c.ellipse(x,y+12,4.5,6,0,0,Math.PI*2);c.fill();}
      c.restore();
    }

    const id='lobby-banner-lamp',im=images[id],meta=catalog.assets?.[id];
    if(im)for(const [cx,top,w] of [[810,44,70],[860,112,41]]){
      const b=meta?.contentBounds||[0,0,im.width,im.height],h=b[3]*w/b[2];
      c.save();c.strokeStyle='#af7138';c.lineWidth=2.2;c.beginPath();c.moveTo(cx,-2);c.lineTo(cx,top+4);c.stroke();
      c.drawImage(im,...b,cx-w/2,top,w,h);c.restore();
    }
  }
  function wallet(){
    const walletRect=R.header.wallet;
    const cy=walletRect[1]+walletRect[3]/2;
    U.skin('secondary',walletRect);sprite('lobby-coin',[walletRect[0]+14,cy-28,56,56]);
    const n=v.state.coins,short=(x,u)=>x.toFixed(2).replace(/\.?0+$/,'')+u,s=n>=1e8?short(n/1e8,'亿'):n>=1e5?short(n/1e4,'万'):n.toLocaleString();text(s,walletRect[0]+walletRect[2]-24,cy,s.length>5?36:42,'#623715','right',walletRect[2]-108);hit(walletRect,'ledger',null,'金币余额 '+n);
    for(const [id,key,label] of [['sound','sound','声音设置'],['settings','settings','设置']]){const r=R.header[key],pad=16;U.skin('icon',r);sprite('lobby-icon-'+id,[r[0]+pad,r[1]+pad,r[2]-pad*2,r[3]-pad*2]);hit(r,id==='sound'?'sound':'settings',null,label);}
  }
  function footer(){
    const fy=R.footer.rect[1],dy=0;
    U.wood([0,fy,887,163]);
    navs.forEach(([id,name],i)=>{const x=R.footer.edges[i],w=R.footer.edges[i+1]-x,shift=r=>[r[0],r[1]+dy,r[2],r[3]];if(v.tab===id)sprite('lobby-nav-selected',shift(R.footer.selected[i]));else if(i)round([x,fy+33,1.5,97],'#a9602b99',1);
      U.navIcon(id,shift(R.footer.icons[i]));
      sprite('lobby-art-nav-'+id+(v.tab===id?'-selected':''),shift(R.footer.labels[i]));hit([x,fy,w,163],'tab',id,name);
    });
  }
  function banner(){const r=R.market.banner;c.save();Art.rounded(c,...r,25,'#253f3d');c.clip();const im=images['lobby-banner-environment'];if(im)c.drawImage(im,...r);c.strokeStyle='#b98036';c.lineWidth=2;c.beginPath();c.moveTo(642,402);c.lineTo(642,420);c.stroke();sprite('lobby-banner-lamp',[553,416,178,211]);display(C.event.name,261,505,82,'#fff0c5');U.art('banner-subtitle',101,576,38,'left');c.restore();stroke(r,'#ffd997',2,25);}
    function itemName(item) {
      if (item.id.startsWith('recipe-') || item.source==='rare') return item.name;
      const theme = { base: '初见', warm: '暖红', bamboo: '竹影', sea: '海风', festival: '灯会' }[item.theme];
      return theme + (slotNames[item.slot] || C.names[C.slots.indexOf(item.slot)]);
    }
    function drawPreview(appearance, rect) { scene.draw(appearance, rect); }
    function dressScene(rect = R.decor.preview) {
      scene.draw(v.appearance, rect, {camera:'preview'});
      stroke(rect, '#ffe8b7', 3, 27);
      const y=rect[1]+rect[3]-80;
      U.skin('secondary', [56,y,145,51]);
      if(v.preview||v.themePreview&&!v.themeOffer.equipped)U.art('label-preview',130.5,y+25.5,39,'center',null,true);else text('当前装扮',128,y+26,28,'#75401a','center');
    }
    function home() {
      const chapter=R.header.homeChapter;text('河畔夜市 · 第' + (Math.floor((v.nextLevel - 1) / 20) + 1) + '章',chapter[0],chapter[1],chapter[2],'#ffdf9b','center');
      U.ornament(197,chapter[1],1,'chapter',true);U.ornament(691,chapter[1],-1,'chapter',true);
      scene.draw(v.appearance,R.home.scene,{rounded:false,background:false});
      U.skin('secondary',R.home.decor);
      sprite('lobby-icon-brush',[636,R.home.decor[1]+3,48,60]);
      display('布置小摊',R.home.decor[0]+158,R.home.decor[1]+35,37,'#683b18','center');hit(R.home.decor,'tab','decor','布置小摊');
      if(v.sidebar?.available){
        const r=R.home.sidebar;U.skin('secondary',r);sprite('lobby-coin',[r[0]+14,r[1]+12,46,46]);
        if(v.sidebar.rewarded)text('今日已到账',r[0]+180,r[1]+35,31,'#683b18','center');
        else {text('复访有礼',r[0]+68,r[1]+35,31,'#683b18');text('+'+v.sidebar.amount,r[0]+r[2]-16,r[1]+35,29,'#a64a21','right');}
        hit(r,'sidebar-reward',null,'侧边栏复访有礼，'+(v.sidebar.rewarded?'今日已到账':'每日'+v.sidebar.amount+'金币'));
      }
      U.skin('wish',R.home.wish);
      const wy=R.home.wish[1];
      const wish=C.byId[v.state.wish],offer=v.themeOffers[wish.theme]||v.themeOffers.bamboo,owned=offer.complete,theme=C.byTheme[offer.id];
      const a=Object.fromEntries(C.slots.map(slot=>[slot,theme]));
      scene.draw(a,[62,wy+26,166,120],{camera:'preview'});
      display(owned?'看看珍藏新搭配':'下个套装 '+theme.name,256,wy+44,34,'#673512','left',504);
      text(owned?'去装扮页看看已获得的珍藏':v.state.coins.toLocaleString()+' / '+offer.price.toLocaleString()+' 金币',256,wy+90,27,'#734421');
      meter(owned?1:v.state.coins,owned?1:offer.price,[256,wy+125,504,20]);chevron(804,wy+86,1,14);hit(R.home.wish,'wish-open',null,'查看当前愿望');
      U.skin('primary',R.home.play);display('开张营业',R.home.play[0]+338,R.home.play[1]+44,68,'#fff0c5','center');display('第'+v.nextLevel+'关',447,R.home.play[1]+103,33,'#fff0c5','center');U.ornament(328,R.home.play[1]+103,1,null,true);U.ornament(566,R.home.play[1]+103,-1,null,true);
      hit(R.home.play,'play',null,'开张营业，第'+v.nextLevel+'关');
      display('查看关卡',R.home.map[0]+156.5,R.home.map[1]+16,31,'#fff0c5','center');hit(R.home.map,'map',null,'查看关卡');
    }
    function decor() {
      title('小摊装扮','把小摊布置成喜欢的样子');
      hits.push(...outfits.draw(v));
    }
    function gate(message, y) {
      paper([40, y, 807, 430]);
      text(message, 444, y + 128, 31, '#78451f', 'center', 740);
      primary('继续开张营业', [168, y + 238, 550, 116], 'play');
    }
    function recipes() {
      title('家常菜谱'); U.skin('tag',[300,294,287,44]);
      text('已收集 ' + Object.keys(v.state.dishes).length + ' / 20 道', 443.5, 316, 27, '#74401a', 'center');
      tabs([['recipes', '菜谱'], ['achievements', '成就'], ['photos', '相册']], v.sub.recipes, R.recipes.tabs);
      if (v.state.cleared.length < 3) { gate('首通3关，打开小摊菜谱', 565); return; }
      if (v.sub.recipes === 'recipes') {
        const lit=[],unlit=[];
        catalog.recipes.forEach(recipe=>(v.state.dishes[recipe.id]>0?lit:unlit).push(recipe));
        const ordered=lit.concat(unlit);
        const p = Math.min(v.page, Math.ceil(catalog.recipes.length / 6) - 1);
        ordered.slice(p * 6, p * 6 + 6).forEach((recipe, i) => {
          const r = gridRect(R.recipes.cards,i), count = v.state.dishes[recipe.id] || 0,name=recipe.displayName||recipe.name,n=Number(recipe.id.slice(1))-1,native=n<6&&n>=0&&recipeArtNames[n]===name,row=Math.floor(n/2);
          card(r);
          U.dish(recipe.id,native?[r[0]+(n%2?52:54),r[1]+14-row*2,285,181]:[r[0]+54,r[1]+14,285,181],!count);
          if(native)sprite('lobby-art-dish-'+n,[r[0]+(n%2?73:69),r[1]+201-row*2,290,47]);else display(name,r[0]+196,r[1]+224,44,'#653710','center',370);
          text('已做'+count+'份',r[0]+196,r[1]+268,31,'#88592e','center');
        });
        pagination(catalog.recipes.length, 6, R.recipes.pageY);
      } else if (v.sub.recipes === 'achievements') {
        const n = Object.keys(v.state.dishes).length;
        const entries = [[Math.min(n,6) + ' / 6 道菜', '家常手绘菜单', n >= 6], [Math.min(n,12) + ' / 12 道菜', '好味道青花盘', n >= 12], [Math.min(n,20) + ' / 20 道菜', '完整菜谱纪念框', n >= 20]];
        for (const theme of C.themes.filter(t => t.scale)) { const n = C.items.filter(i => i.theme === theme.id && v.state.owned.includes(i.id)).length; entries.push([theme.name + ' ' + n + ' / 9', '3件贴纸 · 6件相框 · 9件纪念照', n >= 3]); }
        entries.forEach(([a, b, done], i) => { const r = [43, 476 + i * 157, 800, 138]; itemCard(r); text(a, 74, r[1] + 41, 31); text(b, 74, r[1] + 94, 27, '#88592e'); text(done ? '已达成' : '积累中', 812, r[1] + 42, 27, done ? '#5b812c' : '#9b734b', 'right'); });
      } else {
        secondary('留住现在的小摊', [195, 476, 497, 76], 'photo', null, v.state.cleared.length < 10);
        const photos = v.state.photos.slice().reverse().concat(v.memories.map(m => ({ memory: m, id: m.id })));
        const p = Math.min(v.page, Math.max(0, Math.ceil(photos.length / 4) - 1));
        if (!photos.length) text('首通10关，留住小摊的样子', 444, 740, 31, '#91633b', 'center');
        photos.slice(p * 4, p * 4 + 4).forEach((photo, i) => {
          const r = [42 + i % 2 * 410, 582 + Math.floor(i / 2) * 377, 392, 352]; card(r);
          const equipped = photo.memory ? Object.fromEntries(C.slots.map(s => [s, photo.memory.theme + '-' + s])) : photo.equipped;
          const a = Object.fromEntries(C.slots.map(s => [s, C.byTheme[C.byId[equipped[s]].theme]]));
          if(photo.memory)drawMemory(photo.memory,[r[0]+12,r[1]+12,368,264]);else drawPreview(a, [r[0] + 12, r[1] + 12, 368, 264]);
          text(photo.memory ? photo.memory.title : photo.date, r[0] + 196, r[1] + 313, 24, '#754923', 'center', 365);
          hit(r, photo.memory ? 'memory' : 'photo-view', photo.id, photo.memory ? photo.memory.title : '查看纪念照');
        });
        pagination(photos.length, 4, R.recipes.pageY);
      }
    }
    function drawMemory(memory,r){
      const a=Object.fromEntries(C.slots.map(slot=>[slot,C.byTheme[memory.theme]]));
      if(memory.kind==='sticker'){
        const cx=r[0]+r[2]/2,cy=r[1]+r[3]/2;
        round(r,'#f9e5b8',28);c.save();c.fillStyle='#fff7de';c.beginPath();c.arc(cx,cy,r[3]*.43,0,Math.PI*2);c.fill();c.restore();
        scene.item('ornament',memory.theme,[cx-r[3]*.35,cy-r[3]*.38,r[3]*.70,r[3]*.74]);
        U.flourish(cx,cy+r[3]*.38,1,r[3]*.28);
      }else if(memory.kind==='frame'){
        U.skin('wish',r);scene.draw(a,[r[0]+18,r[1]+18,r[2]-36,r[3]-36],{camera:'preview'});
      }else scene.draw(a,r,{camera:'preview'});
    }
    function archive(){
      banner();
      const latest=v.released.lastIndexOf(true),books=[0,1,2,3].filter(i=>v.released[i]&&i<latest).reverse();
      if(!books.length){card([24,676,837,652]);display('灯火会留下每一页回忆',444,769,42);text('还没有往期活动册',444,877,35,'#875332','center');text('新一周开启后，上一册会留在这里',444,945,29,'#875332','center');text('已获得奖励和累计进度永久保留',444,1006,29,'#875332','center');secondary('回到当期活动',[214,1096,459,88],'sub','current');return;}
      books.forEach((book,i)=>{const r=[25,676+i*253,836,228],n=v.state.activity[book];card(r);display(C.event.books[book],66,r[1]+48,42,'#653710','left');text('已积累 '+n+' / 14',66,r[1]+105,31);meter(n,14,[66,r[1]+153,452,27]);secondary(n>=14?'查看已获装扮':'继续这一本',[555,r[1]+96,265,84],n>=14?'event-reward':'book',n>=14?'harvest-'+C.event.large[book]:book);});
      text('已开启的活动册永久保留',444,1540,29,'#7b461e','center');
    }
    function market() {
      title('夜市活动');
      tabs([['current', '当期'], ['archive', '往期'], ['daily', '每日']], v.sub.market, R.market.tabs);
      if (v.state.cleared.length < 5) { paper([22, 422, 843, 1170]); gate('首通5关，参加夜市活动', 643); return; }
      if (v.sub.market === 'daily') {
        paper([23, 402, 840, 1197]); text('今天开张 ' + v.daily.wins + ' 局', 68, 475, 43);
        [['每日首胜', '150 金币', v.daily.wins >= 1], ['每日完成三局', '150 金币', v.daily.wins >= 3], ['每日首次重玩', '200 金币', v.daily.practice]].forEach(([a, b, done], i) => {
          const r = [43, 550 + i * 205, 800, 187]; itemCard(r); text(a, 78, r[1] + 48, 35); text(b, 78, r[1] + 116, 31, '#98622d'); text(done ? '已入账' : '待完成', 808, r[1] + 80, 30, done ? '#5c802b' : '#957148', 'right');
        });
        text('夜市今日进度 ' + v.daily.eventWins + ' / 3', 70, 1216, 32); text('累计营业 ' + v.state.daysOpen + ' 天', 70, 1296, 32);
        text('每日奖励随通关自动入账', 444, 1430, 29, '#8b5d30', 'center'); return;
      }
      if(v.sub.market==='archive'){archive();return;}
      const active = v.state.activeBook, n = v.state.activity[active];
      banner();card(R.market.feature);
      round([295,705,2,260],'#e8bf85',1);
      const reward = C.byId['harvest-' + (n >= 14 ? C.event.large[active] : C.event.small[active])];
      drawItem(reward.slot,reward.theme,[83,693,174,291]);
      display(C.event.books[active], 331, 721, 67,'#60300d','left');
      text('进度 ' + n + ' / 14', 334, 782, 35); meter(n, 14, [332, 809, 477, 29]);
      text('奖励：'+itemName(reward),336,863,28,'#855426','left',474);
      if(v.state.owned.includes(reward.id))text('已自动获得',802,863,27,'#60802f','right');
      if (n >= 6) secondary('去装扮查看', [348, 897, 432, 82], 'event-reward', reward.id);
      else primary('继续营业攒进度', [348, 897, 432, 82], 'play');
      const other = [0, 1, 2, 3].filter(i => i !== active);
      other.forEach((book, i) => {
        const r = [R.market.rows.x,R.market.rows.y+i*R.market.rows.dy,R.market.rows.w,R.market.rows.h], count = v.state.activity[book], released = v.released[book];
        card(r);round([213,r[1]+23,2,96],'#e4b77f',1);
        U.skin('tag',[618,r[1]+35,217,66]);
        const rewardItem=C.byId['harvest-'+(count>=14?C.event.large[book]:C.event.small[book])];
        drawItem(rewardItem.slot,rewardItem.theme,[65,r[1]+12,101,119]);
        display(C.event.books[book], 235, r[1] + 36, 43,'#653710','left'); text(count + ' / 14', 238, r[1] + 79, 31);
        meter(count, 14, [238, r[1] + 96, 336, 23]);
        const status = released ? count >= 14 ? '已完成' : '选这一本' : '第' + (book + 1) + '周开放';
        if(!released)U.lock(657,r[1]+66,28);
        text(status, released?726:742, r[1] + 70, 27, '#937147', 'center');
        if (released && count < 14) hit([618, r[1] + 35, 217, 66], 'book', book, status);
      });
      U.ornament(168.5,1552.5,1,'footer');U.ornament(721.5,1552.5,-1,'footer');
      text(v.sub.market === 'archive' ? '已开启的活动册永久保留' : '闯关攒进度，奖励自动入收藏', 444, 1552.5, 29, '#7b461e', 'center');
    }
    function draw(view){v=view;hits=[];scene.backdrop((v.savedAppearance||v.appearance).background.id,[0,0,SIZE.width,SIZE.height]);if(v.tab!=='home')U.panel(v.tab);header();({home,decor,recipes,market}[v.tab]||home)();wallet();footer();return hits;}
    return{draw,backdrop:scene.backdrop,preview:drawPreview,item:drawItem,memory:drawMemory};
 }
 return{create,SIZE,R,viewport};
});
