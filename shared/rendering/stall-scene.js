(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./scene.js'), require('../core/motion.js'), require('../data/progression.js'), require('./stall-art.js'), require('./approved-ui.js'), require('../data/game-ui.js'), require('./lobby-ui.js'));
  else root.DapaidangStallScene = factory(root.DapaidangScene, root.DapaidangMotion, root.DapaidangProgression, root.DapaidangStallArt, root.DapaidangApprovedUI, root.DapaidangGameUI, root.DapaidangLobby);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, M, C, Art, Approved, UI, Lobby) {
  'use strict';
  function createRenderer(c, images, catalog) {
    const game = Game.createRenderer(c, images, catalog); let hits, view;
    const lobby = Lobby.create(c, images, catalog);
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
      ui.panel(55, 263, 818, 1170, 48, 'wood');
      box(68, 276, 792, 1144, cream, 38); button('关闭', [687, 306, 134, 80], 'close');
      if (m.type === 'purchase') {
        const item = C.byId[m.item]; label('把它带回小摊', 116, 440, 47); label(item.name, 116, 545, 36);
        lobby.preview(view.appearance, [112, 590, 704, 423]);
        label('价格 ' + item.price.toLocaleString() + ' 金币', 116, 1057, 34);
        label('购买后余额 ' + (view.state.coins - item.price).toLocaleString(), 116, 1120, 29, '#927052');
        button('确认购买并装备', [145, 1240, 638, 111], 'confirm-buy', item.id, true);
      } else if (m.type === 'first') {
        label('第一锅，赚到了！', 116, 456, 49); label('金币已经存进小摊钱包。', 116, 575, 33);
        label('挑一串灯，让今晚更亮一点。', 116, 642, 33); lobby.preview(view.appearance, [112, 700, 704, 423]);
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
        lobby.preview(appearance(Object.fromEntries(C.slots.map(slot => [slot, memory.theme + '-' + slot]))), [112, 570, 704, 520]);
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
