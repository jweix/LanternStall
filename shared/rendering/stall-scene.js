(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./scene.js'), require('../core/motion.js'), require('../data/progression.js'), require('./stall-art.js'), require('./approved-ui.js'), require('../data/game-ui.js'));
  else root.DapaidangStallScene = factory(root.DapaidangScene, root.DapaidangMotion, root.DapaidangProgression, root.DapaidangStallArt, root.DapaidangApprovedUI, root.DapaidangGameUI);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, M, C, Art, Approved, UI) {
  'use strict';
  function createRenderer(c, images, catalog) {
    const game = Game.createRenderer(c, images, catalog); let hits, view;
    const ui = Approved.create(c, images, UI);
    const ink = '#60331b', cream = '#fff5db', muted = '#754323';
    function box(x, y, w, h, color, r) {
      if ([cream, '#f7e6c5', '#efd09b', '#f1d7a9'].includes(color)) {
        ui.panel(x, y, w, h, r || 26);
        if (color === '#efd09b' || color === '#f1d7a9') { c.strokeStyle = '#d58b40'; c.lineWidth = 4; ui.round(x + 3, y + 3, w - 6, h - 6, r || 26); c.stroke(); }
      } else Art.rounded(c, x, y, w, h, r || 20, color);
    }
    function label(t, x, y, size, color, align, width) {
      size = Math.max(26, size);
      c.font = (size >= 30 ? '700 ' : '600 ') + size + 'px ' + ui.ff;
      let value = String(t); if (width) while (value.length > 1 && c.measureText(value).width > width) value = value.slice(0, -2) + '…';
      c.fillStyle = color || ink; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(value, x, y);
    }
    function button(t, rect, action, value, primary, disabled) {
      const [x, y, w, h] = rect; Art.button(c, rect, primary, disabled);
      label(t, x + w / 2, y + h / 2, h > 100 ? 37 : 29, disabled ? '#8b7058' : ink, 'center', w - 22);
      if (!disabled) hits.push({ rect, action, value, label: t });
    }
    function line(t, y) { label(t, 62, y, 28, muted); }
    function image(id, x, y, w, h) { const im = images[id]; if (!im) return; M.drawContained(c, im, null, x, y, w, h); }
    function meter(n, max, x, y, w) { box(x, y, w, 12, '#b98956', 6); if (n) { const g = c.createLinearGradient(x, y, x, y + 12); g.addColorStop(0, '#ffe6a2'); g.addColorStop(1, '#d99235'); box(x, y, Math.max(12, w * Math.min(n / max, 1)), 12, g, 6); } }
    function subnav(entries, selected, y, action) {
      const w = 824 / entries.length;
      entries.forEach(([id, name], i) => button(name, [52 + i * w, y, w - 10, 83], action || 'sub', id, selected === id));
    }
    function pages(count, per, y) {
      const max = Math.max(0, Math.ceil(count / per) - 1), p = Math.min(view.page, max);
      button('上一页', [100, y, 230, 82], 'page', -1, false, p <= 0);
      label((p + 1) + ' / ' + (max + 1), 464, y + 40, 28, muted, 'center');
      button('下一页', [598, y, 230, 82], 'page', 1, false, p >= max); return p;
    }
    function header(title, subtitle) {
      ui.originalTextureButton({ id: 'settings', x: 123, y: 20, w: 76, h: 70, r: 22 });
      hits.push({ rect: [123, 20, 76, 70], action: 'settings', label: '设置' });
      ui.panel(350, 163, 228, 52, 23); ui.drawAsset('coin', 365, 176);
      label(view.state.coins.toLocaleString(), 551, 189, 30, ink, 'right', 142);
      hits.push({ rect: [350, 163, 228, 52], action: 'ledger', label: '金币 ' + view.state.coins.toLocaleString() });
      ui.panel(177, 242, 574, 72, 29);
      label(title, 464, 276, 41, ink, 'center', 540);
      if (subtitle) label(subtitle, 464, 331, 26, view.tab === 'home' ? '#fff0cf' : muted, 'center', 820);
    }
    function footer() {
      ui.panel(16, 1505, 896, 178, 31, 'wood');
      [['home', '小摊', '开摊与愿望'], ['decor', '装扮', '给小摊换装'], ['recipes', '菜谱', '留下好味道'], ['market', '夜市', '本周与往期']].forEach(([id, name, sub], i) => {
        const x = 24 + i * 226;
        if (view.tab === id) Art.button(c, [x, 1522, 204, 139], true, false);
        Art.icon(c, images, id, [x + 64, 1529, 76, 73]);
        label(name, x + 102, 1630, 36, view.tab === id ? '#7a361e' : '#60331b', 'center');
        hits.push({ rect: [x, 1523, 204, 132], action: 'tab', value: id, label: name });
      });
    }
    function home() {
      header('我的灯火小摊', '沿河巷 · 第 ' + (Math.floor(view.state.cleared.length / 20) + 1) + ' 章');
      ui.panel(23, 343, 882, 702, 35, 'wood');
      Art.scene(c, images, view.appearance, [32, 352, 864, 683]);
      button('布置小摊', [67, 949, 230, 76], 'tab', 'decor');
      button('拍张纪念照', [630, 949, 230, 76], 'photo', null, false, view.state.cleared.length < 10);
      const wish = C.byId[view.state.wish], owned = view.state.owned.includes(wish.id);
      box(48, 1053, 832, 186, cream, 30); label('下一件想得到的东西', 76, 1092, 25, '#9b7552');
      label(owned ? '试试另一种搭配吧' : wish.name, 76, 1144, 34, ink, 'left', 560);
      label(owned ? '到装扮页，挑选新的愿望' : view.state.coins.toLocaleString() + ' / ' + wish.price.toLocaleString() + ' 金币', 76, 1198, 25, '#8b6445');
      button('去看看', [672, 1098, 174, 91], 'wish-open', null, true);
      button('开摊 · 第 ' + view.nextLevel + ' 关', [100, 1275, 728, 130], 'play', null, true);
      button('查看关卡', [334, 1420, 260, 66], 'map');
    }
    function itemList(items, y, per) {
      const p = pages(items.length, per, 1387), visible = items.slice(p * per, (p + 1) * per);
      visible.forEach((item, i) => {
        const x = 54 + i % 2 * 420, yy = y + Math.floor(i / 2) * 126, owned = view.state.owned.includes(item.id);
        box(x, yy, 398, 112, item.id === view.selection ? '#efd09b' : cream, 20);
        Art.item(c, images, item.slot, item.theme, [x + 12, yy + 10, 76, 90]);
        label(item.name, x + 99, yy + 36, 26, ink, 'left', 280);
        const status = owned ? (view.state.equipped[item.slot] === item.id ? '已装备' : '已拥有 · 免费换装') : item.source === 'coins' ? (view.state.cleared.length < item.unlock ? '首通' + item.unlock + '关开放' : item.price.toLocaleString() + ' 金币') : item.source === 'event' ? '秋夜灯会活动获得' : '点亮菜谱获得';
        label(status, x + 99, yy + 79, 26, '#875332', 'left', 280);
        if (view.state.equipped[item.slot] === item.id) ui.check(x + 376, yy + 17, .66);
        hits.push({ rect: [x, yy, 398, 112], action: 'item', value: item.id, label: item.name });
      });
    }
    function decor() {
      header('小摊装扮', '先试装，喜欢的再留下 · 已拥有的可免费换回');
      subnav([['scene', '场景'], ['kitchen', '厨房'], ['chef', '大厨'], ['themes', '主题']], view.sub.decor, 354);
      ui.panel(45, 456, 838, 520, 28, 'wood');
      Art.scene(c, images, view.appearance, [52, 463, 824, 505]);
      let items;
      if (view.sub.decor === 'themes') {
        subnav(C.themes.filter(t => ['warm', 'bamboo', 'sea', 'festival'].includes(t.id)).map(t => [t.id, t.name]), view.theme, 990, 'theme');
        items = C.items.filter(i => i.theme === view.theme && !i.id.startsWith('recipe-'));
        const n = items.filter(i => view.state.owned.includes(i.id)).length;
        label('主题收藏 ' + n + '/9', 770, 1108, 26, muted, 'right');
      } else {
        const slots = view.sub.decor === 'scene' ? ['lamp', 'awning', 'tables', 'ornament', 'menu', 'background'] : view.sub.decor === 'kitchen' ? ['plate', 'wok'] : ['chef'];
        if (!slots.includes(view.category)) view.category = slots[0];
        subnav(slots.map(s => [s, C.names[C.slots.indexOf(s)]]), view.category, 990, 'category');
        items = C.items.filter(i => i.slot === view.category);
      }
      const selected = C.byId[view.selection] || (view.sub.decor === 'themes' ? items[0] : items.find(i => i.id === view.state.equipped[view.category])) || items[0];
      if (selected) {
        label(view.themePreview ? C.byTheme[view.theme].name + ' · 整套预览' : selected.name + (view.preview ? ' · 试装中' : ''), 62, 1108, 30, ink, 'left', view.sub.decor === 'themes' ? 570 : 800);
        if (view.themePreview) button('选一件，看看搭配', [56, 1145, 520, 92], 'item', selected.id, true);
        else if (view.state.owned.includes(selected.id)) button('换上这一件', [56, 1145, 520, 92], 'equip', selected.id, true);
        else if (selected.source === 'coins') button('购买并装备 · ' + selected.price, [56, 1145, 520, 92], 'buy', selected.id, true);
        else button(selected.source === 'event' ? '到夜市获取' : '查看菜谱收藏', [56, 1145, 520, 92], 'tab', selected.source === 'event' ? 'market' : 'recipes', true);
        if (!view.themePreview && selected.source === 'coins' && !view.state.owned.includes(selected.id)) button('设为愿望', [596, 1145, 272, 92], 'wish', selected.id);
      }
      itemList(items, 1255, 2);
    }
    function recipes() {
      header('小摊家常菜谱', '点亮 ' + Object.keys(view.state.dishes).length + ' / 20 道 · 好味道会慢慢积累');
      subnav([['recipes', '菜谱'], ['achievements', '成就'], ['photos', '相册']], view.sub.recipes, 354);
      if (view.state.cleared.length < 3) { line('首通3关后打开菜谱，之前的制作记录已经记下。', 470); button('继续开摊', [160, 610, 608, 110], 'play', null, true); return; }
      if (view.sub.recipes === 'recipes') {
        const p = pages(catalog.recipes.length, 6, 1387);
        catalog.recipes.slice(p * 6, p * 6 + 6).forEach((recipe, i) => {
          const x = 54 + i % 2 * 420, y = 463 + Math.floor(i / 2) * 297, count = view.state.dishes[recipe.id] || 0;
          box(x, y, 398, 280, cream, 27);
          ui.drawAsset(count ? 'clip-green' : 'clip-blue', x + 184, y - 12);
          if (count) image(recipe.id, x + 55, y + 18, 288, 151); else label('待上桌', x + 199, y + 92, 40, '#b29b78', 'center');
          label(count ? recipe.displayName || recipe.name : '未点亮的家常菜', x + 199, y + 197, 29, ink, 'center', 364);
          label(count ? count + '份 · ' + (count >= 100 ? '小摊招牌' : count >= 30 ? '拿手家常' : '初次上桌') : '首次做成并结算即点亮', x + 199, y + 245, 23, '#977151', 'center');
          hits.push({ rect: [x, y, 398, 280], action: 'recipe', value: recipe.id, label: recipe.name });
        });
      } else if (view.sub.recipes === 'achievements') {
        const n = Object.keys(view.state.dishes).length;
        const entries = [[n + '/6 道菜', '家常手绘菜单', n >= 6], [n + '/12 道菜', '好味道青花盘', n >= 12], [n + '/20 道菜', '完整菜谱纪念框', n >= 20]];
        for (const theme of C.themes.filter(t => t.scale)) {
          const owned = C.items.filter(i => i.theme === theme.id && i.source === 'coins' && view.state.owned.includes(i.id)).length;
          entries.push([theme.name + ' ' + owned + '/9', '3件贴纸 · 6件相框 · 9件纪念照', owned >= 3]);
        }
        entries.forEach(([title, desc, done], i) => { const y = 463 + i * 145; box(54, y, 820, 126, cream); label(title, 82, y + 38, 31); label(desc, 82, y + 87, 26, '#805332'); label(done ? '已达成' : '积累中', 838, y + 38, 26, '#805332', 'right'); if (done) ui.check(718, y + 38, .7); });
      } else {
        button('留住现在的小摊', [130, 463, 668, 90], 'photo', null, true, view.state.cleared.length < 10);
        if (!view.state.photos.length && !view.memories.length) { line('首通10关后可以拍照，照片会保留当时的装扮。', 590); line('主题收藏、章节与菜谱纪念也会留在这里。', 644); }
        const photos = view.state.photos.slice().reverse().concat(view.memories.map(m => ({ memory: m, id: m.id }))), p = pages(photos.length, 4, 1387);
        photos.slice(p * 4, p * 4 + 4).forEach((photo, i) => {
          const x = 54 + i % 2 * 420, y = 558 + Math.floor(i / 2) * 338;
          box(x, y, 398, 318, cream);
          const outfit = photo.memory ? Object.fromEntries(C.slots.map(slot => [slot, photo.memory.theme + '-' + slot])) : photo.equipped;
          Art.scene(c, images, appearance(outfit), [x + 12, y + 12, 374, 230]);
          label(photo.memory ? photo.memory.title : photo.date + ' · 第' + photo.level + '次成长', x + 199, y + 281, 23, ink, 'center', 370);
          hits.push({ rect: [x, y, 398, 318], action: photo.memory ? 'memory' : 'photo-view', value: photo.id, label: photo.memory ? photo.memory.title : '查看照片' });
        });
      }
    }
    function appearance(equipped) { return Object.fromEntries(C.slots.map(slot => [slot, C.byTheme[C.byId[equipped[slot]].theme]])); }
    function market() {
      header('灯火夜市', '闯关累计进度 · 已开启的活动册永久保留');
      subnav([['current', '当期'], ['archive', '往期'], ['daily', '每日']], view.sub.market, 354);
      if (view.state.cleared.length < 5) { line('首通5关后参加夜市活动。', 470); button('继续开摊', [160, 610, 608, 110], 'play', null, true); return; }
      if (view.sub.market === 'daily') {
        label('今天开摊 ' + view.daily.wins + ' 局', 62, 479, 43, ink);
        [['每日首胜', '150 金币', view.daily.wins >= 1], ['每日完成三局', '150 金币', view.daily.wins >= 3], ['每日首次重玩', '200 金币', view.daily.practice]].forEach(([title, reward, done], i) => {
          const y = 548 + i * 166; box(54, y, 820, 144, cream); label(title, 82, y + 43, 32); label(reward, 82, y + 99, 27, '#875332'); label(done ? '已自动入账' : '待完成', 840, y + 70, 27, '#805332', 'right'); if (done) ui.check(634, y + 70, .75);
        });
        line('夜市今日进度 ' + view.daily.eventWins + '/3', 1072); line('累计营业 ' + view.state.daysOpen + ' 天 · 不要求连续登录', 1142); line('每日奖励按北京时间更新，失败不消耗金币。', 1212);
        return;
      }
      label(C.event.name, 62, 480, 43, ink); line(view.sub.market === 'archive' ? '活动册一直在这里，选中后接着攒。' : '四册集齐，得到秋夜大厨服装。', 526);
      C.event.books.forEach((name, i) => {
        const y = 574 + i * 183, n = view.state.activity[i], active = view.state.activeBook === i;
        box(54, y, 820, 161, active ? '#f1d7a9' : cream, 25);
        Art.icon(c, images, 'market', [70, y + 16, 60, 102], i === 0 ? 'warm' : ['base', 'bamboo', 'sea', 'festival'][i]);
        label(name, 147, y + 36, 34); label(n + '/14 · ' + (n >= 14 ? '本册已完成' : active ? '正在累计' : '选择后累计'), 147, y + 83, 26, '#875332');
        meter(n, 14, 147, y + 127, 449);
        button(view.released[i] ? active ? '已选中' : '选这一本' : '第' + (i + 1) + '周开放', [628, y + 39, 214, 84], 'book', i, active, !view.released[i]);
      });
      line('3进度贴纸 · 6进度小件 · 10进度相框 · 14进度大件', 1332);
      line('每天前三次可参与通关各+1，奖励自动进入收藏。', 1392);
    }
    function modal() {
      const m = view.modal; if (!m) return;
      hits = []; c.fillStyle = '#21180fba'; c.fillRect(0, 0, 928, 1695);
      ui.panel(55, 263, 818, 1170, 48, 'wood');
      box(68, 276, 792, 1144, cream, 38); button('关闭', [687, 306, 134, 80], 'close');
      if (m.type === 'purchase') {
        const item = C.byId[m.item]; label('把它带回小摊', 116, 440, 47); label(item.name, 116, 545, 36);
        Art.scene(c, images, view.appearance, [112, 610, 704, 370]);
        label('价格 ' + item.price.toLocaleString() + ' 金币', 116, 1057, 34);
        label('购买后余额 ' + (view.state.coins - item.price).toLocaleString(), 116, 1120, 29, '#927052');
        button('确认购买并装备', [145, 1240, 638, 111], 'confirm-buy', item.id, true);
      } else if (m.type === 'first') {
        label('第一锅，赚到了！', 116, 456, 49); label('金币已经存进小摊钱包。', 116, 575, 33);
        label('挑一串灯，让今晚更亮一点。', 116, 642, 33); Art.scene(c, images, view.appearance, [112, 720, 704, 370]);
        button('去挑第一串灯 · 500金币', [127, 1235, 674, 116], 'tutorial', null, true);
      } else if (m.type === 'leave') {
        label('回小摊歇一会儿？', 116, 480, 47); label('本关尚未完成，离开后会重新开局。', 116, 625, 31); label('已保存的金币与装扮都会留下。', 116, 693, 31);
        button('继续本关', [145, 1058, 638, 110], 'close', null, true); button('回到小摊', [145, 1210, 638, 110], 'leave');
      } else if (m.type === 'settings') {
        label('小摊设置', 116, 470, 49); label('当前使用本机存档', 116, 605, 33); label('音乐与音效素材尚未接入', 116, 675, 29, '#977454');
        button('减少动效：' + (view.state.reducedMotion ? '开' : '关'), [135, 820, 658, 110], 'reduced');
        label('金币、装扮和收藏会自动保存。', 116, 1053, 30); label('更换设备暂不支持同步。', 116, 1120, 30);
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
        label(count ? r.name : '等待端上桌的家常', 116, 440, 40, ink, 'left', 660); image(r.id, 225, 560, 478, 305);
        r.ingredients.forEach((id, i) => { image(id, 210 + i * 175, 905, 110, 110); label(catalog.ingredients.find(f => f.id === id).name, 265 + i * 175, 1060, 29, ink, 'center'); });
        label('累计制作 ' + count + ' 份', 116, 1175, 35); label('1份初次上桌 · 30份拿手家常 · 100份小摊招牌', 116, 1255, 24, '#977150');
      } else if (m.type === 'memory') {
        const memory = view.memories.find(item => item.id === m.id); if (!memory) return;
        label(memory.title, 116, 460, 40, ink, 'left', 660);
        Art.scene(c, images, appearance(Object.fromEntries(C.slots.map(slot => [slot, memory.theme + '-' + slot]))), [112, 570, 704, 520]);
        label(memory.description, 116, 1190, 31); label('这一页经营回忆，已经永久留下。', 116, 1260, 29, '#987050');
      } else if (m.type === 'photo' || m.type === 'delete-photo') {
        const photo = view.state.photos.find(p => p.id === m.id); if (!photo) return;
        label(m.type === 'delete-photo' ? '删除这张纪念照？' : '小摊经营纪念照', 116, 460, 45);
        Art.scene(c, images, appearance(photo.equipped), [112, 570, 704, 520]); label(photo.date + ' · 已完成' + photo.level + '关', 116, 1170, 30);
        button(m.type === 'delete-photo' ? '确认删除' : '删除这张照片', [145, 1240, 638, 100], m.type === 'delete-photo' ? 'confirm-delete' : 'delete-photo', photo.id);
      }
    }
    function draw(v, geometry) {
      view = v; hits = [];
      if (v.screen === 'game') game.draw(v.game, geometry);
      const viewport = M.viewport(geometry.width, geometry.height, geometry.insets);
      c.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
      if (v.screen !== 'game') { c.fillStyle = '#1d3939'; c.fillRect(0, 0, geometry.width, geometry.height); }
      c.save(); c.translate(viewport.x, viewport.y); c.scale(viewport.scale, viewport.scale); c.beginPath(); c.rect(0, 0, 928, 1695); c.clip();
      if (v.screen !== 'game') {
        c.drawImage(images.scene, 0, 0, 928, 1695);
        if (v.tab !== 'home') { ui.panel(24, 237, 880, 1260, 44, 'wood'); ui.wood(36, 249, 856, 1235); }
        ({ home, decor, recipes, market }[v.tab] || home)(); footer();
      }
      else if (v.game.resultReady && v.game.state.status === 'won' && !v.game.panel) {
        if (!v.state.tutorialDone && v.state.cleared.length === 1) hits.push({ rect: catalog.layout.result.nextButton, action: 'leave', label: '回店挑灯串' });
        if (v.adAvailable && v.settlement && !v.settlement.adTaken && v.daily.ads < 3) button('可选视频 · 补贴200', [230, 1342, 468, 85], 'ad');
      }
      modal();
      if (v.toast) { box(94, 1450, 740, 65, '#f5dba9', 20); label(v.toast, 464, 1483, 25, ink, 'center', 704); }
      c.restore(); return hits;
    }
    return { draw };
  }
  return { createRenderer };
});
