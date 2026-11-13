(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../core/motion.js'));
  else root.DapaidangScene = factory(root.DapaidangMotion);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';

  function createRenderer(c, images, catalog) {
    const W = 928, H = 1695;
    const ingredients = Object.fromEntries(catalog.ingredients.map(i => [i.id, i]));
    const colors = { tomato: '#ffdbbd', egg: '#ffe6ae', pepper: '#e1edbd', pork: '#f8d5c7',
      chicken: '#f8deca', shiitake: '#ecd4b1', scallion: '#e2ecc1', broccoli: '#d7e6b3',
      shrimp: '#ffdbca', beef: '#e8c9b1', celery: '#e1ecc8', tofu: '#fff0cc', carrot: '#ffddb0', wood_ear: '#e4cfb4' };

    function round(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    }
    function fill(x, y, w, h, color, r) {
      c.fillStyle = color;
      if (r) { round(x, y, w, h, r); c.fill(); } else c.fillRect(x, y, w, h);
    }
    function text(value, x, y, size, color, align) {
      c.font = 'bold ' + size + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = color || '#6b3b22'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
      c.fillText(String(value), x, y);
    }
    function ellipse(x, y, rx, ry, color) {
      c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    }
    function panel(x, y, w, h, wood, radius) {
      c.save(); c.shadowColor = '#4e220b55'; c.shadowBlur = 8; c.shadowOffsetY = 5;
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, wood ? '#edb775' : '#fff7df');
      g.addColorStop(.65, wood ? '#cb8a4b' : '#ffe7be');
      g.addColorStop(1, wood ? '#a96833' : '#e5b77f');
      fill(x, y, w, h, g, radius || 28); c.shadowColor = 'transparent';
      c.strokeStyle = '#fff0cc'; c.lineWidth = 3;
      round(x + 2, y + 2, w - 4, h - 5, radius || 28); c.stroke(); c.restore();
    }
    function art(id, x, y, w, h, alpha) {
      const im = images[id]; if (!im) return;
      c.save(); c.globalAlpha *= alpha === undefined ? 1 : M.clamp(alpha);
      M.drawContained(c, im, null, x - w / 2, y - h / 2, w, h); c.restore();
    }
    function tile(food, x, y, w, h, dark, rotation) {
      c.save(); c.translate(x, y); c.rotate(rotation || 0);
      c.shadowColor = '#63330d44'; c.shadowBlur = 4; c.shadowOffsetY = 4;
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#fff3d8'); g.addColorStop(1, colors[food] || '#efd0a5');
      fill(-w / 2, -h / 2, w, h, g, Math.min(w, h) * .19);
      c.shadowColor = 'transparent';
      art(food, 0, 0, w * .86, h * .85);
      c.strokeStyle = '#fff1d3'; c.lineWidth = 2;
      round(-w / 2 + 1, -h / 2 + 1, w - 2, h - 3, Math.min(w, h) * .19); c.stroke();
      if (dark) fill(-w / 2, -h / 2, w, h, '#162c276b', Math.min(w, h) * .19);
      c.restore();
    }
    function check(x, y) {
      ellipse(x, y, 12, 12, '#78a94c'); c.strokeStyle = '#fff9df'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 1, y + 5); c.lineTo(x + 7, y - 5); c.stroke();
    }
    function wood(x, y, w, h) {
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#bc824d'); g.addColorStop(1, '#9e602e'); fill(x, y, w, h, g, 25);
      for (let i = 0; i < 44; i++) fill(x + 8, y + 8 + i * (h - 16) / 44, w - 16, 1.3, '#f4c28a15');
    }
    function age(view, type, predicate) {
      for (let i = view.effects.length - 1; i >= 0; i--) {
        const e = view.effects[i];
        if (e.event.type === type && (!predicate || predicate(e.event))) return view.state.now - e.born;
      }
      return Infinity;
    }
    function ring(x, y, a) {
      if (a < 0 || a > .65) return;
      c.save(); c.globalAlpha = 1 - a / .65; c.strokeStyle = '#fff0ae'; c.lineWidth = 4;
      round(x - 70, y - 66, 140, 132, 25); c.stroke(); c.restore();
    }
    function coveredPlate(x, pose) {
      const r = catalog.layout.orderPlate;
      // Visible PNG anchors: plate face and lid rim share the same centre.
      // Rim radius 85 is smaller than the plate's inner radius 88.62.
      art('empty-plate', x, r.baseY + r.plateArtCenterOffsetY, r.width, 100);
      art('cloche', x, r.faceY + r.lidArtCenterOffsetY - pose.lidLift, r.lidArtWidth, 100);
    }
    function orders(view) {
      const s = view.state, layout = catalog.layout.orders;
      for (const order of s.orders) {
        const x = layout.firstX + order.slot * layout.stepX, y = layout.y, r = order.recipe;
        const accepted = order.matchedAt !== null, matchedAge = accepted ? s.now - order.matchedAt : 0;
        const entryY = order.bornAt > 0 ? M.orderEnter(s.now - order.bornAt).dy : 0;
        const pose = accepted ? M.handoffPose(matchedAge) : { alpha: 1, dy: 0, scale: 1 };
        pose.dy += entryY;
        c.save();
        c.globalAlpha *= pose.alpha;
        c.translate(x + 124, y + 113 + (view.reducedMotion ? 0 : pose.dy));
        c.scale(view.reducedMotion ? 1 : pose.scale, view.reducedMotion ? 1 : pose.scale);
        c.translate(-x - 124, -y - 113);
        panel(x, y, 248, 226, false, 30);
        fill(x + 110, y - 16, 28, 32, ['#d97343', '#81a94c', '#6597a5'][order.slot], 8);
        if (!r) {
          text('本桌已上齐', x + 124, 352, 30, '#96643f');
          c.restore(); continue;
        }
        text(order.table + '桌', x + 22, 277, 26, '#855334', 'left');
        text('● +' + r.payout, x + 226, 277, 26, '#aa6729', 'right');
        let size = 35;
        c.font = 'bold ' + size + 'px sans-serif';
        while (c.measureText(r.displayName || r.name).width > 226 && size > 23) { size--; c.font = 'bold ' + size + 'px sans-serif'; }
        text(r.displayName || r.name, x + 124, 316, size);
        const materialAlpha = accepted ? pose.ingredientsAlpha : 1;
        if (materialAlpha > .001) {
          c.save(); c.globalAlpha *= materialAlpha;
          const remaining = s.buffer.map(i => i.food);
          let collected = 0;
          r.ingredients.forEach((id, i) => {
            const xx = x + 124 + (i - (r.ingredients.length - 1) / 2) * 71 * materialAlpha;
            const index = remaining.indexOf(id), done = accepted || index >= 0;
            if (index >= 0) remaining.splice(index, 1);
            if (done) collected++;
            art(id, xx, 383, 65, 67);
            if (done) check(xx + 20, 405);
          });
          text(collected + '/' + r.ingredients.length, x + 124, 447, 29, '#84512e');
          c.restore();
        }
        if (accepted) {
          c.save(); c.globalAlpha *= pose.plateAlpha;
          coveredPlate(x + 124, pose);
          text('交给大厨啦', x + 124, 447, 29, '#a9502c'); c.restore();
        }
        const newAge = s.now - order.bornAt;
        if (order.bornAt > 0 && newAge < M.timing.newCue) {
          c.save(); c.globalAlpha *= .55 * (1 - M.clamp(newAge / M.timing.newCue));
          c.strokeStyle = '#f2b75e'; c.lineWidth = 3;
          round(x + 5, y + 5, 238, 216, 26); c.stroke(); c.restore();
        }
        c.restore();
      }
    }
    function board(view) {
      const s = view.state;
      wood(30, 476, 867, 855); wood(53, 534, 822, 795);
      panel(70, 487, 218, 47, false, 23); text('食材台', 179, 510, 36);
      text('余 ' + s.nodes.filter(n => !n.removed).length + ' 份', 454, 511, 30);
      panel(638, 487, 193, 45, false, 22); text('三料菜 ×1.5', 734, 510, 27, '#945121');
      c.save(); round(55, 536, 818, 791, 20); c.clip();
      for (const n of s.nodes) {
        if (n.removed) continue;
        const free = !s.nodes.some(t => !t.removed && t.layer > n.layer &&
          Math.abs(t.x - n.x) < (t.w + n.w) / 2 - .5 && Math.abs(t.y - n.y) < (t.h + n.h) / 2 - .5);
        tile(n.food, n.x, n.y, n.w, n.h, !free);
        if (free && n.layer === 0) {
          const a = age(view, 'layerMayReveal'); if (a < .65) ring(n.x, n.y, a);
        }
        const hint = age(view, 'hintShown', e => e.tileId === n.id);
        if (hint < 2 && free) {
          c.strokeStyle = '#fff09d'; c.lineWidth = 7;
          round(n.x - n.w / 2 - 2, n.y - n.h / 2 - 2, n.w + 4, n.h + 4, 26); c.stroke();
        }
      }
      c.restore();
      if (s.stashItems.length) {
        panel(614, 1250, 222, 77, true, 19);
        s.stashItems.forEach((i, n) => {
          art(i.food, 672 + n * 106, 1284, 56, 52); text('取回', 672 + n * 106, 1314, 18);
        });
      }
    }
    function steam(x, y, now, amount) {
      c.save(); c.strokeStyle = '#fff0cd'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const p = (now * .85 + i / 3) % 1;
        c.globalAlpha = Math.sin(p * Math.PI) * amount;
        const xx = x + (i - 1) * 27, yy = y - p * 45;
        c.beginPath(); c.moveTo(xx, yy); c.bezierCurveTo(xx - 14, yy - 14, xx + 14, yy - 22, xx, yy - 37); c.stroke();
      } c.restore();
    }
    function station(view) {
      const s = view.state, job = s.wok;
      wood(30, 1331, 867, 194);
      panel(50, 1336, 196, 43, true, 22); text('备菜 ' + (s.buffer.length + s.incoming.length) + '/7', 148, 1358, 29);
      panel(337, 1333, 242, 44, false, 22);
      text(job ? (s.queue.length ? '快炒中 · 待' + s.queue.length : '快炒中') : '自动快炒', 458, 1355, 28);
      panel(42, 1386, 555, 115, false, 27);
      for (let i = 0; i < 7; i++) {
        const r = M.prepSlot(i);
        if (!s.buffer.some(item => view.slots[item.id] === i)) fill(r.x, r.y, r.w, r.h, '#dbae73', 18);
      }
      for (const item of s.buffer) {
        const r = M.prepSlot(view.slots[item.id]); tile(item.food, r.cx, r.cy, r.w, r.h);
      }
      fill(638, 1478, 225, 37, '#a79c89', 8); fill(650, 1481, 202, 18, '#393735', 4);
      ellipse(747, 1490, 65, 9, '#45c9fa');
      for (let i = 0; i < 9; i++) {
        const h = (job ? 19 : 12) + (view.reducedMotion ? 0 : Math.sin(s.now * 13 + i) * 3);
        const x = 698 + i * 12;
        c.fillStyle = '#67dcff'; c.beginPath(); c.moveTo(x - 5, 1490);
        c.quadraticCurveTo(x - 3, 1483, x, 1490 - h); c.quadraticCurveTo(x + 5, 1484, x + 5, 1490); c.fill();
      }
      const stir = job && s.now >= job.stirAt && s.now < job.pourAt;
      const pour = job && s.now >= job.pourAt;
      const p = job ? (s.now - (pour ? job.pourAt : job.stirAt)) / (pour ? job.endAt - job.pourAt : job.pourAt - job.stirAt) : 0;
      const pose = job && !view.reducedMotion ? M.wokPose(p, pour) : { angle: 0, dx: 0, dy: 0 };
      c.save(); c.translate(762 + pose.dx, 1416 + pose.dy); c.rotate(pose.angle);
      art('wok', 0, 0, 263, 136);
      if (job) {
        job.recipe.ingredients.forEach((id, i) => {
          const bounce = stir && !view.reducedMotion ? Math.max(0, Math.sin(p * Math.PI * 4 + i * .7)) * 58 : 0;
          art(id, -40 + i * 22, 5 - bounce, 26, 24, pour ? 1 - M.ease(p) : M.ease((s.now - job.startAt) / .28));
        });
      }
      c.restore(); steam(740, 1374, s.now, job ? .5 : .14);
      if (pour) {
        art('empty-plate', 837, 1484, 145, 65);
        const u = M.ease(p);
        // Start at the transformed rim rather than teleporting a finished plate.
        const rim = { x: 762 + pose.dx + Math.cos(pose.angle) * 60,
          y: 1416 + pose.dy + Math.sin(pose.angle) * 60 };
        job.recipe.ingredients.forEach((id, i) => {
          art(id, M.mix(rim.x + i * 4, 837 + (i - 1) * 10, u),
            M.mix(rim.y, 1484, u) - Math.sin(u * Math.PI) * 20, 20, 18, 1 - u);
        });
        art(job.recipe.id, 837, 1484, 145, 145 * .70, u);
      }
    }
    function effects(view) {
      const s = view.state;
      for (const item of s.incoming) {
        const n = s.nodes.find(n => item.source && n.id === item.source.tileId);
        if (!n) continue;
        const pose = M.pickPose(n, view.slots[item.id], (s.now - item.arriveAt + .3) / .3);
        tile(item.food, pose.x, pose.y, pose.w, pose.h, false, view.reducedMotion ? 0 : pose.rotation);
      }
      for (const delivery of s.deliveries) {
        const p = M.departurePose(s.now - delivery.flyAt);
        art(delivery.recipeId, view.reducedMotion ? 735 : p.x, view.reducedMotion ? 188 : p.y, p.w, p.w * .70, p.alpha);
      }
      for (const effect of view.effects) {
        const a = s.now - effect.born, event = effect.event;
        if (event.type === 'recipeAccepted' && a < M.timing.acceptedFlight) {
          event.items.forEach((item, i) => {
            const slot = effect.origins[i], p = M.acceptedPose(slot, i, a, event.queued), origin = M.prepSlot(slot);
            c.save(); c.globalAlpha *= p.alpha;
            tile(item.food, view.reducedMotion ? origin.cx : p.x, view.reducedMotion ? origin.cy : p.y, p.w, p.h, false, view.reducedMotion ? 0 : p.rotation);
            c.restore();
          });
        }
        if (event.type === 'dishServed' && a < M.timing.reward) {
          if (a < M.timing.servedExit) {
            const p = M.servedPose(a); art(event.recipeId, p.x, p.y, p.w, p.w * .70, p.alpha);
          }
          c.save(); c.globalAlpha *= 1 - M.ease(a / M.timing.reward);
          text('+' + event.payout, 625, 220 - (view.reducedMotion ? 0 : a * 45), 32, '#ffdf8d'); c.restore();
        }
        if (event.type === 'ingredientPicked' && a < .32 && event.item.source) {
          const p = M.ring(a); c.save(); c.globalAlpha = p.alpha;
          c.strokeStyle = '#fff3c4'; c.lineWidth = 5; c.beginPath();
          c.arc(event.item.source.x, event.item.source.y, p.r, 0, Math.PI * 2); c.stroke(); c.restore();
        }
      }
    }
    function hud(view) {
      const s = view.state, bump = view.reducedMotion ? 1 : M.hud(age(view, 'dishServed'));
      c.save(); c.translate(464, 189); c.scale(bump, bump);
      panel(-114, -26, 228, 52, true, 23); text('收入 ' + s.revenue, 0, 0, 29); c.restore();
      panel(25, 15, 80, 80, false, 25); text('音效', 65, 53, 23);
      panel(120, 15, 80, 80, false, 25); text('设置', 160, 53, 23);
      for (const [i, id] of ['undo', 'stash', 'hint'].entries()) {
        const x = 65 + i * 272;
        panel(x, 1530, 255, 95, false, 35);
        text(['↶ 撤回', '▣ 暂存', '☀ 提示'][i], x + 115, 1570, 40);
        text('剩余 ' + s.tools[id] + ' 次', x + 128, 1605, 20, '#9c713f');
      }
      text('第 ' + view.level + ' 摊 · ' + (view.difficultyName || '家常') + ' · 按菜谱备菜', 464, 1664, 25, '#fff1d1');
      if (view.toast) { panel(124, 1150, 680, 66, false, 24); text(view.toast, 464, 1183, 27); }
    }
    function overlay(view) {
      const s = view.state;
      if (!view.panel && !view.resultReady) return;
      fill(0, 0, W, H, '#1b1b15bf');
      if (view.panel) {
        panel(104, 520, 720, 720, true, 45); panel(120, 536, 688, 688, false, 36);
        text(view.panel === 'pause' ? '歇一会儿' : '夜市等你回来', 464, 625, 56);
        text('按订单选料，配齐就自动开炒', 464, 700, 29, '#91633f');
        panel(204, 770, 520, 110, true, 30); text(view.panel === 'rest' && s.status !== 'playing' ? '查看本关结果' : '继续营业', 464, 825, 39);
        if (view.panel === 'pause') {
          panel(204, 900, 520, 100, false, 30); text('减少动效：' + (view.reducedMotion ? '开' : '关'), 464, 950, 34);
        }
        panel(204, 1030, 520, 100, false, 30); text('重新开摊', 464, 1080, 36);
        return;
      }
      panel(104, 404, 720, 940, true, 48); panel(120, 420, 688, 907, false, 37);
      panel(184, 378, 560, 132, true, 43);
      const won = s.status === 'won'; text(won ? '通关成功' : '这次没忙过来', 464, 445, won ? 65 : 50, '#fff1c4');
      ellipse(464, 623, 68, 68, '#ffd05c'); text('¥', 464, 625, 74, '#b27824');
      text('本关收入', 464, 764, 31, '#91633e'); text(s.revenue + ' 金币', 464, 819, 59, '#a84025');
      text('本关用时', 464, 885, 31, '#91633e');
      const seconds = Math.ceil(s.wonAt === null ? s.playTime : s.wonAt);
      text(String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'), 464, 938, 66);
      text(won ? '下一摊，也要热气腾腾！' : '留意配方，给备菜栏留点空位', 464, 1008, 29, '#94623c');
      panel(204, 1054, 520, 128, true, 34); text(won ? '下一关' : '再试一次', 464, 1118, 47);
      text('先休息一下', 464, 1260, 32, '#8b623f');
    }
    function draw(view, geometry) {
      const g = geometry, v = M.viewport(g.width, g.height, g.insets);
      c.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); fill(0, 0, g.width, g.height, '#1b3937');
      c.save(); c.translate(v.x, v.y); c.scale(v.scale, v.scale);
      c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.drawImage(images.scene, 0, 0, W, H);
      // The historical image contains baked text and cards: every dynamic area
      // is covered before live rendering. It is never used as a stretched UI.
      fill(50, 215, 828, 270, '#293e37');
      wood(30, 476, 867, 1160);
      orders(view); board(view); station(view); effects(view); hud(view); overlay(view);
      c.restore();
    }
    return { draw };
  }
  return { createRenderer };
});
