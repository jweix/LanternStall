(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./scene.js'), require('../core/motion.js'), require('../data/progression.js'), require('./stall-art.js'), require('./approved-ui.js'), require('../data/game-ui.js'), require('./lobby-ui.js'),require('./lobby-components.js'));
  else root.DapaidangStallScene = factory(root.DapaidangScene, root.DapaidangMotion, root.DapaidangProgression, root.DapaidangStallArt, root.DapaidangApprovedUI, root.DapaidangGameUI, root.DapaidangLobby,root.DapaidangLobbyComponents);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, M, C, Art, Approved, UI, Lobby, Components) {
  'use strict';
  function createRenderer(c, images, catalog) {
    let hits, view;
    const lobby = Lobby.create(c, images, catalog);
    const ui = Approved.create(c, images, UI);
    const shop=Components.create(c,images,catalog.lobbyBodyFont,catalog.assets);
    const game=Game.createRenderer(c,images,Object.assign({},catalog,{settingsWords:shop.words,sceneBackdrop:lobby.backdrop}));
    const ink = '#60331b', cream = '#fff5db', muted = '#754323';
    function box(x, y, w, h, color, r) {
      if ([cream, '#f7e6c5', '#efd09b', '#f1d7a9'].includes(color)) {
        ui.panel(x, y, w, h, r || 26);
        if (color === '#efd09b' || color === '#f1d7a9') { c.strokeStyle = '#d58b40'; c.lineWidth = 4; ui.round(x + 3, y + 3, w - 6, h - 6, r || 26); c.stroke(); }
      } else Art.rounded(c, x, y, w, h, r || 20, color);
    }
    function label(t, x, y, size, color, align, width) {
      size = Math.max(26, size);
      const family=view.screen==='game'?ui.ff:'"'+(catalog.lobbyBodyFont||'LanternBody')+'",'+ui.ff;
      c.font = (size >= 30 ? '700 ' : '600 ') + size + 'px ' + family;
      let value = String(t); if (width) while (value.length > 1 && c.measureText(value).width > width) value = value.slice(0, -2) + '…';
      c.fillStyle = color || ink; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(value, x, y);
    }
    function button(t, rect, action, value, primary, disabled) {
      const [x, y, w, h] = rect;
      if(primary&&view.screen!=='game')shop.button(t,rect,{kind:'primary',disabled,size:35});
      else {Art.button(c, rect, primary, disabled);label(t, x + w / 2, y + h / 2, h > 100 ? 37 : 29, disabled ? '#8b7058' : ink, 'center', w - 22);}
      if (!disabled) hits.push({ rect, action, value, label: t });
    }
    function image(id, x, y, w, h) { const im = images[id]; if (!im) return; M.drawContained(c, im, null, x, y, w, h); }
    function pages(count, per, y) {
      const max = Math.max(0, Math.ceil(count / per) - 1), p = Math.min(view.page, max);
      button('上一页', [100, y, 230, 82], 'page', -1, false, p <= 0);
      label((p + 1) + ' / ' + (max + 1), 464, y + 40, 28, muted, 'center');
      button('下一页', [598, y, 230, 82], 'page', 1, false, p >= max); return p;
    }
    function appearance(equipped) { return Object.fromEntries(C.slots.map(slot => [slot, C.byTheme[C.byId[equipped[slot]].theme]])); }
    function modal() {
      const m = view.modal; if (!m) return;
      hits = [];
      if(m.type==='settings'){
        const layout=ui.settingsPanel(view.state.reducedMotion,{words:shop.words});
        hits.push({rect:layout.toggle,action:'reduced',label:'动效',role:'switch',checked:!view.state.reducedMotion},{rect:layout.close,action:'close',label:'关闭'});return;
      }
      ui.panel(55, 263, 818, 1170, 48, 'wood');
      box(68, 276, 792, 1144, cream, 38); button('关闭', [687, 306, 134, 80], 'close');
      if (m.type === 'purchase') {
        const item = C.byId[m.item]; label('把它带回小摊', 116, 440, 47); label(item.name, 116, 545, 36);
        lobby.preview(view.appearance, [112, 590, 704, 423]);
        label('价格 ' + item.price.toLocaleString() + ' 金币', 116, 1057, 34);
        label('购买后余额 ' + (view.state.coins - item.price).toLocaleString(), 116, 1120, 29, '#927052');
        button('确认购买并装备', [145, 1240, 638, 111], 'confirm-buy', item.id, true);
      } else if (m.type === 'purchase-theme') {
        const offer=view.themeOffers[m.theme];
        label((offer.owned?'补齐':'购买')+offer.name,116,440,44);
        lobby.preview(appearance(Object.fromEntries(C.slots.map(slot=>[slot,m.theme+'-'+slot]))),[112,505,704,350]);
        label('整套价值',116,910,29,muted);label(offer.total.toLocaleString(),806,910,31,ink,'right');
        label('已有'+offer.owned+'件抵扣',116,965,29,muted);label('－'+offer.deduction.toLocaleString(),806,965,31,ink,'right');
        label('本次支付',116,1030,34);label(offer.price.toLocaleString()+' 金币',806,1030,38,'#b64123','right');
        if(!offer.unlocked){label('首通'+offer.unlock+'关后开放',116,1120,31,muted);button('继续开张营业',[145,1240,638,111],'play',null,true);}
        else {
          button('确认购买并换上 · '+offer.price.toLocaleString(),[145,1240,638,111],'confirm-buy-theme',m.theme,true,view.state.coins<offer.price);
          button('设为下个套装愿望',[280,1138,368,67],'wish-theme',m.theme,false);
        }
      } else if(m.type==='rare-family-progress'){
        const family=C.rareFamilies.find(f=>f.id===m.family),owned=family.items.filter(id=>view.state.owned.includes(id)).length;
        label(family.name+' · 收集进度',116,440,42);
        label('已收集 '+owned+' / '+family.items.length+' 件',116,520,30,muted);
        family.items.forEach((id,i)=>{
          const item=C.byId[id],offer=view.rareOffers[id],r=[112+i%2*365,578+Math.floor(i/2)*126,337,118];
          shop.skin('card',r);lobby.item(item.slot,item.theme,[r[0]+12,r[1]+15,72,87]);
          label(C.names[C.slots.indexOf(item.slot)],r[0]+96,r[1]+25,27,ink,'left',225);
          label(offer.owned?'已获得':offer.description,r[0]+96,r[1]+55,24,offer.owned?'#587b31':muted,'left',224);
          shop.meter(offer.value,offer.target,[r[0]+96,r[1]+85,136,15]);
          label(offer.value+'/'+offer.target,r[0]+316,r[1]+91,23,offer.owned?'#587b31':muted,'right');
        });
        const source=view.rareOffers[family.items[0]].source;
        button(source==='recipes'?'去收集菜谱':'去参加夜市',[145,1240,638,111],'tab',source,true);
      } else if (m.type === 'rare-details') {
        const item=C.byId[m.item],offer=view.rareOffers[m.item];
        label(item.name,116,440,44);
        lobby.item(item.slot,item.theme,[240,520,448,350]);
        label(offer.equipped?'使用中':offer.owned?'已获得':offer.description,116,945,32,ink,'left',690);
        label(offer.owned?'只更换这一部件，其余装扮保持原样':'当前进度 '+offer.value+' / '+offer.target,116,1006,29,muted);
        button('试穿这件',[145,1080,638,82],'preview-rare-item',item.id,false);
        button(offer.owned?(offer.equipped?'这件正在使用':'换上这件 · '+item.name):offer.source==='recipes'?'去查看菜谱':'去参加夜市',[145,1240,638,111],offer.owned?'equip':'tab',offer.owned?item.id:offer.source,true,offer.equipped);
      } else if (m.type === 'first') {
        label('第一锅，赚到了！', 116, 456, 49); label('金币已经存进小摊钱包。', 116, 575, 33);
        label('暖红整套已拥有，看看下个套装愿望。', 116, 642, 30); lobby.preview(view.appearance, [112, 700, 704, 423]);
        button('去看看主题套装', [127, 1235, 674, 116], 'tutorial', null, true);
      } else if (m.type === 'leave') {
        label('返回首页？', 116, 480, 47); label('本关尚未完成，返回后需重新开局。', 116, 625, 31); label('已保存的金币与装扮都会留下。', 116, 693, 31);
        button('留在本关', [145, 1058, 638, 110], 'close', null, true); button('返回首页', [145, 1210, 638, 110], 'leave');
      } else if (m.type === 'ledger') {
        label('小摊账本', 116, 440, 49); label('余额 ' + view.state.coins.toLocaleString() + ' 金币', 116, 525, 37);
        const entries = view.state.ledger.slice().reverse(), p = pages(entries.length, 7, 1295);
        entries.slice(p * 7, p * 7 + 7).forEach((l, i) => { label(l.label, 116, 628 + i * 86, 27, ink, 'left', 470); label((l.amount > 0 ? '+' : '') + l.amount, 806, 628 + i * 86, 30, '#9c633c', 'right'); });
        if (!entries.length) label('第一笔收入，会从通关开始。', 116, 700, 31);
      } else if (m.type === 'map') {
        const chapter = view.page; label('第 ' + (chapter + 1) + ' 章 · 夜市小炒', 116, 440, 44);
        for (let i = 0; i < 20; i++) { const n = chapter * 20 + i + 1; button(String(n), [112 + i % 4 * 180, 550 + Math.floor(i / 4) * 128, 158, 104], 'level', n, n === view.nextLevel, n > view.nextLevel); }
        button('上一章', [116, 1240, 260, 95], 'page', -1, false, chapter <= 0); button('下一章', [552, 1240, 260, 95], 'page', 1, false, (chapter + 1) * 20 >= view.nextLevel);
      } else if (m.type === 'recipe') {
        const r = catalog.recipes.find(r => r.id === m.id), count = view.state.dishes[r.id] || 0;
        label(count ? (r.displayName||r.name) : '等待端上桌的家常', 116, 440, 40, ink, 'left', 660); lobby.dish(r.id,[225,560,478,305]);
        r.ingredients.forEach((id, i) => { image(id, 210 + i * 175, 905, 110, 110); label(catalog.ingredients.find(f => f.id === id).name, 265 + i * 175, 1060, 29, ink, 'center'); });
        label('累计制作 ' + count + ' 份', 116, 1175, 35); label('1份初次上桌 · 30份拿手家常 · 100份小摊招牌', 116, 1255, 24, '#977150');
      } else if (m.type === 'memory') {
        const memory = view.memories.find(item => item.id === m.id); if (!memory) return;
        label(memory.title, 116, 460, 40, ink, 'left', 660);
        lobby.memory(memory,[112,570,704,520]);
        label(memory.description, 116, 1190, 31); label('这一页经营回忆，已经永久留下。', 116, 1260, 29, '#987050');
      } else if (m.type === 'photo' || m.type === 'delete-photo') {
        const photo = view.state.photos.find(p => p.id === m.id); if (!photo) return;
        label(m.type === 'delete-photo' ? '删除这张纪念照？' : '小摊经营纪念照', 116, 460, 45);
        lobby.preview(appearance(photo.equipped), [112, 570, 704, 520]); label(photo.date + ' · 已完成' + photo.level + '关', 116, 1170, 30);
        button(m.type === 'delete-photo' ? '确认删除' : '删除这张照片', [145, 1240, 638, 100], m.type === 'delete-photo' ? 'confirm-delete' : 'delete-photo', photo.id);
      }
    }
    function coordinates(geometry, screen) {
      return screen === 'game' ? M.viewport(geometry.width, geometry.height, geometry.insets) : Lobby.viewport(geometry.width, geometry.height, geometry.lobbyInsets || geometry.insets);
    }
    function draw(v, geometry) {
      view = v; hits = [];
      const isGame = v.screen === 'game';
      if (isGame) game.draw(v.game, geometry);
      c.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
      if (!isGame) { c.fillStyle = '#193536'; c.fillRect(0, 0, geometry.width, geometry.height); }
      const vp = coordinates(geometry, v.screen), size = isGame ? { width: 928, height: 1695 } : Lobby.SIZE;
      c.save(); c.translate(vp.x, vp.y); c.scale(vp.scale, vp.scale); c.beginPath(); c.rect(0, 0, size.width, size.height); c.clip();
      if (!isGame) hits = lobby.draw(v, geometry);
      else if (v.game.resultReady && v.game.state.status === 'won' && !v.game.panel) {
        if (!v.state.tutorialDone && v.state.cleared.length === 1) hits.push({ rect: catalog.layout.result.nextButton, action: 'leave', label: '回店挑灯串' });
        if (v.adAvailable && v.settlement && !v.settlement.adTaken && v.daily.ads < 3) button('可选视频 · 补贴200', [230, 1342, 468, 85], 'ad');
      }
      if (v.modal) {
        c.fillStyle = '#21180fba'; c.fillRect(0, 0, size.width, size.height);
        // Existing modal business and layout are retained under a uniform inset.
        if (!isGame) { c.save(); c.translate(0, 77); c.scale(887 / 928, 887 / 928); }
        modal();
        if (!isGame) { c.restore(); hits = hits.map(h => Object.assign({}, h, { rect: [h.rect[0] * 887 / 928, 77 + h.rect[1] * 887 / 928, h.rect[2] * 887 / 928, h.rect[3] * 887 / 928] })); }
      }
      if (v.toast) {
        const y = isGame ? 1450 : 1538;
        box(58, y, size.width - 116, 65, '#f5dba9', 20); label(v.toast, size.width / 2, y + 33, 25, ink, 'center', size.width - 150);
      }
      c.restore(); return hits;
    }
    return { draw, coordinates, designSize: screen => screen === 'game' ? { width: 928, height: 1695 } : Lobby.SIZE };
  }
  return { createRenderer };
});
