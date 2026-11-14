/* Live lobby hierarchy: background → scene/widgets → independent state/text. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('../data/progression.js'),require('./stall-art.js'),require('./lobby-components.js'),require('./lobby-scene.js'),require('../data/lobby-layout.js'));
 else root.DapaidangLobby=factory(root.DapaidangProgression,root.DapaidangStallArt,root.DapaidangLobbyComponents,root.DapaidangLobbyScene,root.DapaidangLobbyLayout);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,Art,Components,Scenes,L){
 'use strict';
 const SIZE=L.size,R=L,slots=['lamp','awning','tables','ornament','menu','plate','wok'];
 const slotNames={lamp:'灯串',awning:'棚布',tables:'桌饰',ornament:'摆件',menu:'招牌',plate:'餐盘',wok:'炒锅',chef:'大厨',background:'场景'};
 const navs=[['home','小摊'],['decor','装扮'],['recipes','菜谱'],['market','夜市']];
 function viewport(width,height,insets){const i=Object.assign({left:0,top:0,right:0,bottom:0},insets||{}),scale=Math.min((width-i.left-i.right)/SIZE.width,(height-i.top-i.bottom)/SIZE.height);return{scale,x:i.left+(width-i.left-i.right-SIZE.width*scale)/2,y:i.top+(height-i.top-i.bottom-SIZE.height*scale)/2};}
 function create(c,images,catalog){
  const U=Components.create(c,images),scene=Scenes.create(c,images);let hits=[],v;
  const text=U.words,round=U.round,grad=U.gradient,stroke=U.outline,check=U.check,chevron=U.chevron,meter=U.meter,sprite=U.sprite;
  const card=r=>U.skin('card',r),itemCard=card,paper=card;
  function hit(rect,action,value,label){hits.push({rect:rect.slice(),action,value,label});}
  function gridRect(g,i){return[g.x+i%g.columns*g.dx,g.y+Math.floor(i/g.columns)*g.dy,g.w,g.h];}
  function drawItem(slot,theme,r){scene.item(slot,theme,r);}
  function primary(label,r,action,value,disabled){U.button(label,r,{kind:'primary',disabled,size:r[3]>100?45:32});if(!disabled)hit(r,action,value,label);}
  function secondary(label,r,action,value,disabled){U.button(label,r,{disabled,size:30});if(!disabled&&action)hit(r,action,value,label);}
  function tabs(entries,selected,r,action){const w=r[2]/entries.length;entries.forEach(([id,name],i)=>{const b=[r[0]+i*w,r[1],w,r[3]];U.button(name,b,{kind:'tab',selected:id===selected,size:37});hit(b,action||'sub',id,name);});}
  function pagination(count,per,y){const max=Math.max(0,Math.ceil(count/per)-1),p=Math.min(v.page,max);secondary('上一页',[102,y,224,72],'page',-1,p===0);secondary('下一页',[561,y,224,72],'page',1,p===max);text((p+1)+' / '+(max+1),444,y+37,35,'#74411e','center');return p;}
  function title(name,subtitle){text(name,444,250,72,'#633614','center');U.ornament(195,250,1);U.ornament(692,250,-1);if(subtitle)text(subtitle,444,308,29,'#7b431b','center');}
  function header(){
    sprite('lobby-header-awning',[0,0,887,57]);
    c.save();c.strokeStyle='#b57839';c.lineWidth=8;c.lineCap='round';const b=v.tab==='home'?R.header.brandHome:R.header.brandCompact;for(const t of [.23,.75]){c.beginPath();c.moveTo(b[0]+b[2]*t,45);c.lineTo(b[0]+b[2]*t,b[1]+25);c.stroke();}c.restore();
    sprite('lobby-brand-logo',v.tab==='home'?R.header.brandHome:R.header.brandCompact);
    if(v.tab==='home'){drawItem('lamp','base',[23,194,135,190]);drawItem('lamp','base',[731,194,135,190]);}
  }
  function wallet(){
    U.skin('secondary',R.header.wallet);sprite('lobby-coin',[677,120,49,49]);
    const n=v.state.coins,short=(x,u)=>x.toFixed(2).replace(/\.?0+$/,'')+u,s=n>=1e8?short(n/1e8,'亿'):n>=1e5?short(n/1e4,'万'):n.toLocaleString();text(s,842,144,s.length>5?33:40,'#623715','right',124);hit(R.header.wallet,'ledger',null,'金币余额 '+n);
    for(const [id,key,label] of [['sound','sound','声音设置'],['settings','settings','设置']]){U.skin('secondary',R.header[key]);const r=R.header[key];sprite('lobby-icon-'+id,[r[0]+16,r[1]+16,r[2]-32,r[3]-32]);hit(r,id==='sound'?'sound':'settings',null,label);}
  }
  function footer(){
    U.wood(R.footer.rect);const w=R.footer.rect[2]/4;
    navs.forEach(([id,name],i)=>{const x=i*w,r=[x+10,1620,w-20,139];if(v.tab===id)U.skin('card',r);else if(i)round([x,1642,2,100],'#b3743c',1);
      if(id==='decor')sprite('lobby-scene-chef-base',[x+67,1631,88,76]);else Art.icon(c,images,id,[x+67,1631,88,76]);
      text(name,x+w/2,1725,36,'#643719','center');hit([x,1611,w,163],'tab',id,name);
    });
  }
  function banner(){const r=R.market.banner;c.save();Art.rounded(c,...r,25,'#253f3d');c.clip();scene.backdrop('base',r);round(r,'#152e3650',25);drawItem('lamp','base',[622,443,190,213]);text(C.event.name,66,531,59,'#fff0cc');text('点亮河岸，收集夜市好物',68,597,28,'#fff0ce');c.restore();}
    function itemName(item) {
      if (item.id.startsWith('recipe-')) return item.name;
      const theme = { base: '初见', warm: '暖红', bamboo: '竹影', sea: '海风', festival: '灯会' }[item.theme];
      return theme + (slotNames[item.slot] || C.names[C.slots.indexOf(item.slot)]);
    }
    function drawPreview(appearance, rect) { scene.draw(appearance, rect); }
    function dressScene() {
      scene.draw(v.appearance, R.decor.preview);
      stroke(R.decor.preview, '#ffe8b7', 3, 27);
      U.skin('secondary', [56,850,145,51]);
      text(v.preview || v.themePreview ? '预览中' : '当前装扮',128,876,25,'#75401a','center');
    }
    function home() {
      text('河畔夜市 · 第' + (Math.floor((v.nextLevel - 1) / 20) + 1) + '章',444,357,34,'#fff1c9','center');
      scene.draw(v.appearance,R.home.scene,{rounded:false,background:false});
      secondary('布置小摊',R.home.decor,'tab','decor');
      card(R.home.wish);
      const wish=C.byId[v.state.wish],owned=v.state.owned.includes(wish.id);
      drawItem(wish.slot,wish.theme,[83,1209,149,114]);
      text(owned?'看看小摊的新搭配':'下个愿望 '+itemName(wish),274,1225,33,'#673512','left',518);
      text(owned?'去装扮页挑一件喜欢的':v.state.coins.toLocaleString()+' / '+wish.price.toLocaleString(),274,1270,29,'#734421');
      meter(owned?1:v.state.coins,owned?1:wish.price,[274,1294,490,25]);chevron(804,1256,1,14);hit(R.home.wish,'wish-open',null,'查看当前愿望');
      U.skin('primary',R.home.play);text('开张营业',447,1436,69,'#fff0c5','center');text('第'+v.nextLevel+'关',447,1498,34,'#fff0c5','center');
      hit(R.home.play,'play',null,'开张营业，第'+v.nextLevel+'关');
      text('查看关卡',437,1571,31,'#fff0cf','center');chevron(530,1571,1,10);hit(R.home.map,'map',null,'查看关卡');
    }
    function decor() {
      title('小摊装扮','把小摊布置成喜欢的样子');
      const main = v.sub.decor === 'chef' ? 'chef' : v.sub.decor === 'background' ? 'background' : v.sub.decor === 'themes' ? 'themes' : 'scene';
      tabs([['scene', '摊位'], ['chef', '大厨'], ['background', '场景'], ['themes', '主题']], main, R.decor.main);
      dressScene(R.decor.preview);
      U.skin('card',R.decor.categories);
      let categories = main === 'scene' ? slots : main === 'chef' ? ['chef'] : ['background'];
      let items;
      if (main === 'themes') {
        const entries = C.themes.filter(t => t.id !== 'base').map(t => [t.id, t.name.slice(0, 2)]);
        tabs(entries, v.theme, [40, 943, 807, 64], 'theme');
        items = C.items.filter(i => i.theme === v.theme && !i.id.startsWith('recipe-'));
      } else {
        const category = categories.includes(v.category) ? v.category : categories[0];
        const start = categories.length > 5 && (v.categoryPage || 0) ? 5 : 0;
        const visible = categories.slice(start, start + 5), w = (categories.length > 5 ? 735 : 807) / visible.length;
        visible.forEach((id, i) => {
          const x = 40 + i * w;
          text(slotNames[id], x + w / 2, 973, 34, id === category ? '#c5331c' : '#70401c', 'center');
          if (id === category) round([x + w * .3, 998, w * .4, 7], '#d43823', 4);
          hit([x, 939, w, 72], 'category', id, slotNames[id]);
        });
        if (categories.length > 5) {
          chevron(817, 972, start ? -1 : 1, 12);
          hit([782, 939, 65, 74], 'category-page', start ? 0 : 1, start ? '前面部位' : '餐盘与炒锅');
        }
        items = C.items.filter(i => i.slot === category);
      }
      const p = Math.min(v.page, Math.max(0, Math.ceil(items.length / 4) - 1));
      const shown = items.slice(p * 4, p * 4 + 4);
      const selected = C.byId[v.selection] || items.find(i => v.state.equipped[i.slot] === i.id) || items[0];
      shown.forEach((item, i) => {
        const r = gridRect(R.decor.cards,i);
        itemCard(r); drawItem(item.slot, item.theme, [r[0] + 15, r[1] + 15, 140, 140]);
        const owned = v.state.owned.includes(item.id), equipped = v.state.equipped[item.slot] === item.id;
        text(itemName(item), r[0] + 168, r[1] + 54, 31, '#663713', 'left', 218);
        let status = equipped ? '使用中' : owned ? '已拥有' : item.source === 'coins' ? v.state.cleared.length < item.unlock ? '首通' + item.unlock + '关' : '金币 ' + item.price : item.source === 'event' ? '夜市奖励' : '菜谱奖励';
        const badge = [r[0] + 167, r[1] + 91, 211, 49];
        round(badge, equipped ? '#d7e797' : '#f2cd91', 24);
        text(status, badge[0] + badge[2] / 2, badge[1] + 26, 25, equipped ? '#50781f' : '#825323', 'center', 204);
        if (equipped) check(badge[0] + 18, badge[1] + 25, 10);
        if (selected?.id === item.id) stroke([r[0] + 3, r[1] + 3, r[2] - 6, r[3] - 6], '#d83a22', 5, 27);
        hit(r, 'item', item.id, item.name + '，' + status);
      });
      // The reference has four cards. A compact pager keeps every existing item reachable.
      const max = Math.ceil(items.length / 4);
      if (max > 1) {
        chevron(291, 1401, -1, 9); text((p + 1) + ' / ' + max, 444, 1401, 23, '#885023', 'center'); chevron(597, 1401, 1, 9);
        if (p) hit([239, 1378, 100, 47], 'page', -1, '上一组物品');
        if (p + 1 < max) hit([547, 1378, 100, 47], 'page', 1, '下一组物品');
      }
      if (selected) {
        const owned = v.state.owned.includes(selected.id), equipped = v.state.equipped[selected.slot] === selected.id;
        if (v.themePreview) primary('选一件，看看搭配', R.decor.cta, 'item', selected.id);
        else if (owned) primary(equipped && !v.preview ? '已换上' + itemName(selected) : '换上' + itemName(selected), R.decor.cta, 'equip', selected.id, equipped && !v.preview);
        else if (selected.source === 'coins') primary('购买并换上 · ' + selected.price, R.decor.cta, 'buy', selected.id);
        else primary(selected.source === 'event' ? '到夜市看看' : '查看菜谱收藏', R.decor.cta, 'tab', selected.source === 'event' ? 'market' : 'recipes');
        if (!v.themePreview && selected.source === 'coins' && !owned) { text('设为愿望', 444, 1587, 23, '#875023', 'center'); hit([40, 1566, 807, 38], 'wish', selected.id, '设为愿望'); }
      }
    }
    function gate(message, y) {
      paper([40, y, 807, 430]);
      text(message, 444, y + 128, 31, '#78451f', 'center', 740);
      primary('继续开张营业', [168, y + 238, 550, 116], 'play');
    }
    function recipes() {
      title('家常菜谱'); U.skin('secondary',[280,322,327,50]);
      text('已收集 ' + Object.keys(v.state.dishes).length + ' / 20 道', 444, 348, 29, '#74401a', 'center');
      tabs([['recipes', '菜谱'], ['achievements', '成就'], ['photos', '相册']], v.sub.recipes, R.recipes.tabs);
      if (v.state.cleared.length < 3) { gate('首通3关，打开小摊菜谱', 565); return; }
      if (v.sub.recipes === 'recipes') {
        const p = Math.min(v.page, Math.ceil(catalog.recipes.length / 6) - 1);
        catalog.recipes.slice(p * 6, p * 6 + 6).forEach((recipe, i) => {
          const r = gridRect(R.recipes.cards,i), count = v.state.dishes[recipe.id] || 0;
          card(r);
          if(count) sprite(recipe.id,[r[0]+37,r[1]+17,318,180]);
          else { text('？',r[0]+196,r[1]+106,73,'#c99a5f','center');text('待上桌',r[0]+196,r[1]+169,25,'#9b734a','center'); }
          text(count?recipe.displayName||recipe.name:'未点亮的家常菜',r[0]+196,r[1]+230,34,'#653710','center',370);
          text(count?'已做'+count+'份':'首次做成后点亮',r[0]+196,r[1]+272,28,'#88592e','center');
          hit(r, 'recipe', recipe.id, (count ? recipe.name : '未点亮菜谱') + '，已做' + count + '份');
        });
        pagination(catalog.recipes.length, 6, 1460);
      } else if (v.sub.recipes === 'achievements') {
        const n = Object.keys(v.state.dishes).length;
        const entries = [[n + ' / 6 道菜', '家常手绘菜单', n >= 6], [n + ' / 12 道菜', '好味道青花盘', n >= 12], [n + ' / 20 道菜', '完整菜谱纪念框', n >= 20]];
        for (const theme of C.themes.filter(t => t.scale)) { const n = C.items.filter(i => i.theme === theme.id && v.state.owned.includes(i.id)).length; entries.push([theme.name + ' ' + n + ' / 9', '3件贴纸 · 6件相框 · 9件纪念照', n >= 3]); }
        entries.forEach(([a, b, done], i) => { const r = [43, 500 + i * 157, 800, 138]; itemCard(r); text(a, 74, r[1] + 41, 31); text(b, 74, r[1] + 94, 27, '#88592e'); text(done ? '已达成' : '积累中', 812, r[1] + 42, 27, done ? '#5b812c' : '#9b734b', 'right'); });
      } else {
        secondary('留住现在的小摊', [195, 498, 497, 76], 'photo', null, v.state.cleared.length < 10);
        const photos = v.state.photos.slice().reverse().concat(v.memories.map(m => ({ memory: m, id: m.id })));
        const p = Math.min(v.page, Math.max(0, Math.ceil(photos.length / 4) - 1));
        if (!photos.length) text('首通10关，留住小摊的样子', 444, 740, 31, '#91633b', 'center');
        photos.slice(p * 4, p * 4 + 4).forEach((photo, i) => {
          const r = [42 + i % 2 * 410, 603 + Math.floor(i / 2) * 377, 392, 352]; card(r);
          const equipped = photo.memory ? Object.fromEntries(C.slots.map(s => [s, photo.memory.theme + '-' + s])) : photo.equipped;
          const a = Object.fromEntries(C.slots.map(s => [s, C.byTheme[C.byId[equipped[s]].theme]]));
          drawPreview(a, [r[0] + 12, r[1] + 12, 368, 264]);
          text(photo.memory ? photo.memory.title : photo.date, r[0] + 196, r[1] + 313, 24, '#754923', 'center', 365);
          hit(r, photo.memory ? 'memory' : 'photo-view', photo.id, photo.memory ? photo.memory.title : '查看纪念照');
        });
        pagination(photos.length, 4, 1460);
      }
    }
    function market() {
      title('夜市活动');
      tabs([['current', '当期'], ['archive', '往期'], ['daily', '每日']], v.sub.market, R.market.tabs);
      if (v.state.cleared.length < 5) { paper([22, 422, 843, 1170]); gate('首通5关，参加夜市活动', 643); return; }
      if (v.sub.market === 'daily') {
        paper([23, 422, 840, 1177]); text('今天开张 ' + v.daily.wins + ' 局', 68, 495, 43);
        [['每日首胜', '150 金币', v.daily.wins >= 1], ['每日完成三局', '150 金币', v.daily.wins >= 3], ['每日首次重玩', '200 金币', v.daily.practice]].forEach(([a, b, done], i) => {
          const r = [43, 570 + i * 215, 800, 187]; itemCard(r); text(a, 78, r[1] + 48, 35); text(b, 78, r[1] + 116, 31, '#98622d'); text(done ? '已入账' : '待完成', 808, r[1] + 80, 30, done ? '#5c802b' : '#957148', 'right');
        });
        text('夜市今日进度 ' + v.daily.eventWins + ' / 3', 70, 1290, 32); text('累计营业 ' + v.state.daysOpen + ' 天', 70, 1370, 32);
        text('每日奖励随通关自动入账', 444, 1504, 29, '#8b5d30', 'center'); return;
      }
      const active = v.state.activeBook, n = v.state.activity[active];
      banner();card(R.market.feature);
      round([295,727,2,260],'#e8bf85',1);
      const colors = ['warm', 'bamboo', 'sea', 'festival'];
      drawItem('lamp', colors[active], [71, 714, 198, 294]);
      text(C.event.books[active], 334, 753, 49);
      text('进度 ' + n + ' / 14', 334, 804, 35); meter(n, 14, [332, 831, 477, 29]);
      const reward = C.byId['festival-' + (n >= 14 ? C.event.large[active] : C.event.small[active])];
      text(n >= 14 ? '奖励已自动加入收藏' : '奖励：' + itemName(reward), 336, 888, 29, '#855426', 'left', 474);
      if (n >= 6) primary('查看已获奖励', [348, 919, 432, 90], 'event-reward', reward.id);
      else primary('继续营业攒进度', [348, 919, 432, 90], 'play');
      const other = [0, 1, 2, 3].filter(i => i !== active);
      other.forEach((book, i) => {
        const r = [R.market.rows.x,R.market.rows.y+i*R.market.rows.dy,R.market.rows.w,R.market.rows.h], count = v.state.activity[book], released = v.released[book];
        card(r);round([213,r[1]+23,2,96],'#e4b77f',1);
        U.skin('secondary',[618,r[1]+35,217,66]);
        drawItem('lamp', colors[book], [65, r[1] + 12, 101, 119]);
        text(C.event.books[book], 206, r[1] + 42, 35); text(count + ' / 14', 206, r[1] + 80, 28);
        meter(count, 14, [206, r[1] + 104, 365, 21]);
        const status = released ? count >= 14 ? '已完成' : '选这一本' : '第' + (book + 1) + '周开放';
        text(status, 726, r[1] + 70, 27, '#937147', 'center');
        if (released && count < 14) hit([618, r[1] + 35, 217, 66], 'book', book, status);
      });
      U.wood([24,1527,839,63]);
      text(v.sub.market === 'archive' ? '已开启的活动册永久保留' : '闯关攒进度，奖励自动入收藏', 444, 1560, 29, '#7b461e', 'center');
    }
    function draw(view){v=view;hits=[];scene.backdrop(v.appearance.background.id,[0,0,SIZE.width,SIZE.height]);if(v.tab!=='home')U.skin('content-panel',R.body);header();({home,decor,recipes,market}[v.tab]||home)();wallet();footer();return hits;}
    return{draw,preview:drawPreview};
 }
 return{create,SIZE,R,viewport};
});
