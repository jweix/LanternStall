(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('../core/motion.js'), require('../core/board-geometry.js'), require('./stall-art.js'), require('./approved-ui.js'), require('../data/game-ui.js'));
  else root.DapaidangScene = factory(root.DapaidangMotion, root.DapaidangGeometry, root.DapaidangStallArt, root.DapaidangApprovedUI, root.DapaidangGameUI);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M, Geometry, Art, Approved, UI) {
  'use strict';
  function createRenderer(c, images, catalog) {
    const mapped = Object.assign({}, images);
    for (const food of catalog.ingredients) {
      mapped['ingredient-' + food.id] = images[food.id];
      mapped['ingredient-' + food.id + '-covered'] = images[food.id + '-covered'];
    }
    const ui = Approved.create(c, mapped, UI), W = 928, H = 1695;
    let appearance;
    function text(value, x, y, size, color, align) {
      c.font = '700 ' + size + 'px ' + ui.ff; c.fillStyle = color || '#633316';
      c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillText(String(value), x, y);
    }
    function art(id, x, y, w, h, alpha) {
      if (!images[id]) return;
      c.save(); c.globalAlpha *= alpha === undefined ? 1 : M.clamp(alpha);
      M.drawContained(c, images[id], null, x - w / 2, y - h / 2, w, h); c.restore();
    }
    function outfitAsset(slot) {
      const theme=appearance?.[slot]?.id||'warm';
      const prefix={awning:'lobby-scene-awning-',lamp:'lobby-lamp-',tables:'lobby-scene-stool-',plate:'lobby-plate-',wok:'lobby-wok-',chef:'lobby-scene-chef-'};
      return prefix[slot]+theme;
    }
    function meal(id,x,y,w,h,alpha) {
      if(!appearance?.plate.rare){art(id,x,y,w,h,alpha);return;}
      art(outfitAsset('plate'),x,y,w,h,alpha);
      c.save();c.beginPath();c.ellipse(x,y-h*.07,w*.33,h*.23,0,0,Math.PI*2);c.clip();
      art(id,x,y-h*.025,w*.94,h*.94,alpha);c.restore();
    }
    function age(view, type, predicate) {
      for (let i = view.effects.length - 1; i >= 0; i--) {
        const e = view.effects[i];
        if (e.event.type === type && (!predicate || predicate(e.event))) return view.state.now - e.born;
      }
      return Infinity;
    }
    function tile(food, pose, covered) {
      c.save(); c.translate(pose.x, pose.y); c.rotate(pose.rotation || 0);
      ui.restoredCard(food, 0, 0, pose.w, pose.h, covered); c.restore();
    }
    function orders(view) {
      const s = view.state, layout = catalog.layout.orders;
      for (const o of s.orders) {
        const position=M.orderPosition(o,s.orders,s.now,view.reducedMotion);
        if(position===null)continue;
        const x = layout.firstX + o.slot * layout.stepX, r = o.recipe;
        const accepted = o.matchedAt !== null;
        const pose = accepted ? M.handoffPose(s.now - o.matchedAt) : { alpha: 1, dy: 0, scale: 1 };
        pose.dy += o.bornAt > 0 ? M.orderEnter(s.now - o.bornAt).dy : 0;
        const remaining = s.buffer.map(i => i.food), done = [], checkAges = {};
        for (const food of r.ingredients) {
          const i = remaining.indexOf(food);
          if (accepted || i >= 0) {
            done.push(food); if (i >= 0) remaining.splice(i, 1);
            checkAges[food] = view.reducedMotion ? Infinity : age(view, 'ingredientArrived', e => e.item.food === food);
          }
        }
        const newAge = s.now - o.bornAt;
        c.save();c.translate((position-o.slot)*layout.stepX,0);
        ui.renderOrderCard({ table: o.table, name: r.displayName || r.name, pay: r.payout, ing: r.ingredients,
          done, checkAges, accepted, alpha: pose.alpha, dy: view.reducedMotion ? 0 : pose.dy,
          scale: view.reducedMotion ? 1 : pose.scale, ingredientAlpha: accepted ? pose.ingredientsAlpha : 1,
          plateAlpha: pose.plateAlpha, lidLift: view.reducedMotion ? 0 : pose.lidLift,
          isNew: o.bornAt > 0 && newAge < M.timing.newCue, cueAlpha: .75 * (1 - M.clamp(newAge / M.timing.newCue)) }, o.slot, s.now);
        if (appearance && appearance.menu.id !== 'base') ui.stroke(x + 18, 255, x + 230, 255, appearance.menu.color, 4);
        c.restore();
      }
    }
    function board(view) {
      const s = view.state;
      ui.paintInsetBoardMatte();
      // The approved ellipse is a coating inside the original wooden rim.
      // Decorations tint only that coating, without changing its geometry.
      if (appearance && appearance.tables.id !== 'base') {
        c.save(); ui.traceBoardMatte(); c.clip(); c.globalAlpha = .13;
        ui.fill(0, 496, 928, 1025, appearance.tables.wood); c.restore();
      }
      ui.panel(63, 487, 218, 47, 23); text('食材台', 172, 510, 36, '#60331b');
      text('余 ' + s.nodes.filter(n => !n.removed).length + ' 份', 454, 511, 29, '#603719');
      c.save(); c.globalAlpha *= .93; ui.panel(638, 487, 193, 45, 22); c.restore();
      text('三料菜 ×1.5', 734.5, 510, 26, '#8d4c20');
      c.save(); ui.round(55, 536, 818, 791, 20); c.clip();
      for (const n of s.nodes.slice().sort(Geometry.paintOrder)) {
        if (n.removed) continue;
        const free = !s.nodes.some(t => !t.removed && t.layer > n.layer && Geometry.overlap(t, n));
        tile(n.food, n, !free);
        if (free) {
          const a = age(view, 'layerMayReveal', e => {
            const t = s.nodes.find(t => t.id === e.removedTileId);
            return t && t.layer > n.layer && Geometry.overlap(t, n);
          });
          if (a < .65 && !view.reducedMotion) {
            c.save(); c.globalAlpha *= Math.sin(M.clamp(a / .65) * Math.PI) * .65;
            c.strokeStyle = '#ffe4a0'; c.lineWidth = 3;
            ui.round(n.x - n.w / 2 + 2, n.y - n.h / 2 + 2, n.w - 4, n.h - 4, 23); c.stroke(); c.restore();
          }
        }
        if (free && age(view, 'hintShown', e => e.tileId === n.id) < 2) {
          c.strokeStyle = '#fff09d'; c.lineWidth = 7;
          ui.round(n.x - n.w / 2 - 2, n.y - n.h / 2 - 2, n.w + 4, n.h + 4, 26); c.stroke();
        }
      }
      c.restore();
    }
    function pour(job, p, pose) {
      const x = 837, y = 1412, amount = M.ease((p - .12) / .76);
      c.save(); c.globalAlpha *= M.ease(p / .12);
      if(appearance?.plate.rare)art(outfitAsset('plate'),x,y,145,86);else ui.emptyDish(x, y, 145);
      c.restore();
      if (appearance && appearance.plate.id !== 'base') {
        c.strokeStyle = appearance.plate.color; c.lineWidth = 3;
        c.beginPath(); c.ellipse(x, y + 2, 69, 25, 0, 0, Math.PI * 2); c.stroke();
      }
      meal(job.recipeId, x, y, 145, 145 * .68, amount);
      const sx = pose.x + 95 * Math.cos(pose.angle) + 5 * Math.sin(pose.angle);
      const sy = pose.y + 95 * Math.sin(pose.angle) - 5 * Math.cos(pose.angle);
      for (let i = 0; i < 9; i++) {
        const u = (p - .12 - i * .025) / .48;
        if (u <= 0 || u >= 1) continue;
        c.save(); c.translate(M.mix(sx, x + (i % 3 - 1) * 11, u), M.mix(sy, y - 5 + i % 2 * 3, u) - Math.sin(u * Math.PI) * 15);
        c.rotate(i + u * 3);
        const g = c.createLinearGradient(0, -6, 0, 7);
        const egg = job.recipeId === 'd01';
        g.addColorStop(0, egg ? i % 3 ? '#ffe193' : '#ff9d66' : i % 3 ? '#efc992' : job.recipeId === 'd02' ? '#95bb62' : '#c39b6c');
        g.addColorStop(1, egg ? i % 3 ? '#d9a338' : '#cf5d37' : i % 3 ? '#b67c43' : job.recipeId === 'd02' ? '#52792e' : '#79502e');
        ui.fill(-7, -5, 15, 12, g, 4); c.restore();
      }
    }
    function station(view) {
      const s = view.state, job = s.wok;
      ui.renderPrepStation({ prepItems: s.buffer.map(i => ({ food: i.food, slot: view.slots[i.id] })),
        reservedCount: s.incoming.length,
        kitchenLabel: job ? s.queue.length ? '快炒中 · 待' + s.queue.length : '快炒中' : '自动快炒' });
      // Retrieval lives in the unused centre of the prep heading, never over live tiles.
      s.stashItems.forEach((item, i) => {
        const [x, y, w, h] = UI.buttons.stored[i];
        ui.panel(x, y, w, h, 12); art(item.food, x + 24, y + h / 2, 30, 30);
        text('取回', x + 72, y + h / 2, 21);
      });
      c.save(); c.beginPath(); c.rect(612, 1317, 316, 204); c.clip();
      const stir = job && s.now >= job.stirAt && s.now < job.pourAt, pouring = job && s.now >= job.pourAt;
      const p = job ? M.clamp((s.now - (pouring ? job.pourAt : job.stirAt)) /
        (pouring ? job.endAt - job.pourAt : job.pourAt - job.stirAt)) : 0;
      const m = job && (stir || pouring) && !view.reducedMotion ? M.wokPose(p, pouring) : { angle: 0, dx: 0, dy: 0 };
      const pose = { x: 742 + m.dx, y: 1417 + m.dy, angle: m.angle };
      c.save(); c.translate(pose.x, pose.y); c.rotate(pose.angle); c.translate(-742, -1417);
      ui.polishedWok(s.now, false, appearance?.wok);
      if (appearance && appearance.wok.id !== 'base' && !appearance.wok.rare) {
        c.strokeStyle = appearance.wok.color; c.lineWidth = 4; c.beginPath(); c.ellipse(742, 1413, 104, 39, 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      if (job) {
        c.save(); c.translate(pose.x, pose.y); c.rotate(pose.angle); c.translate(0, -6);
        c.globalAlpha *= pouring ? 1 - M.ease((p - .10) / .80) : M.ease((s.now - job.startAt) / .16);
        ui.pieces(job.recipeId === 'd01' ? 'egg' : 'chicken', view.reducedMotion ? 0 : s.now, stir && !view.reducedMotion);
        c.restore(); ui.steam(pose.x, pose.y - 35, view.reducedMotion ? 0 : s.now, .45);
      }
      if (pouring) pour(job, p, pose);
      c.restore();
      if (appearance?.chef.rare)art(outfitAsset('chef'),891,1320,70,90);
      else if (appearance && appearance.chef.id !== 'base') Art.chef(c, 894, 1306, .3, appearance.chef);
    }
    function effects(view) {
      const s = view.state;
      for (const item of s.incoming) {
        const n = s.nodes.find(n => item.source && n.id === item.source.tileId);
        if (!n) continue;
        const p = M.pickPose(n, view.slots[item.id], (s.now - item.arriveAt + .3) / .3);
        if (view.reducedMotion) p.rotation = 0;
        tile(item.food, p);
      }
      for (const delivery of s.deliveries) {
        const p = M.departurePose(s.now - delivery.flyAt);
        meal(delivery.recipeId, view.reducedMotion ? 735 : p.x, view.reducedMotion ? 188 : p.y, p.w, p.w * .68, p.alpha);
      }
      for (const effect of view.effects) {
        const a = s.now - effect.born, event = effect.event;
        if (event.type === 'recipeAccepted' && a < M.timing.acceptedFlight) event.items.forEach((item, i) => {
          const p = M.acceptedPose(effect.origins[i], i, a, event.queued);
          c.save(); c.globalAlpha *= p.alpha; if (view.reducedMotion) p.rotation = 0; tile(item.food, p); c.restore();
        });
        if (event.type === 'dishServed' && a < M.timing.reward) {
          if (a < M.timing.servedExit) { const p = M.servedPose(a); meal(event.recipeId, p.x, p.y, p.w, p.w * .68, p.alpha); }
          c.save(); c.globalAlpha *= 1 - M.ease(a / M.timing.reward);
          text('+' + event.payout, 625, 220 - (view.reducedMotion ? 0 : a * 45), 32, '#ffdf8d');
          ui.sparkle(594, 204 - (view.reducedMotion ? 0 : a * 20), 6, 1 - M.clamp(a / .45)); c.restore();
        }
        if (event.type === 'ingredientPicked' && a < .32 && event.item.source) {
          const p = M.ring(a); c.save(); c.globalAlpha *= p.alpha;
          c.strokeStyle = '#fff1bb'; c.lineWidth = 5; c.beginPath();
          c.arc(event.item.source.x, event.item.source.y, p.r, 0, Math.PI * 2); c.stroke(); c.restore();
        }
      }
    }
    function hud(view) {
      const s = view.state, bump = view.reducedMotion ? 1 : M.hud(age(view, 'dishServed'));
      c.save(); c.translate(464, 189); c.scale(bump, bump); c.translate(-464, -189); ui.renderIncome(s.revenue); c.restore();
      for (const id of ['sound', 'settings', 'undo', 'stash', 'shuffle']) {
        const [x, y, w, h] = UI.buttons[id], rect = { id, x, y, w, h, r: id === 'sound' || id === 'settings' ? 22 : 26 };
        if (id === 'sound' || id === 'settings') ui.originalTextureButton(rect); else ui.toolButton(rect, s.toolUsed[id]?'已用':s.tools[id]>0?'×1':'视频');
      }
    }
    function decorations() {
      if (!appearance) return;
      const id=appearance.background.id,env=id==='star'||id==='harvest'?'lobby-environment-'+id:
        id==='bamboo'||id==='sea'?'stall-night-'+id:id==='festival'?'stall-night':'lobby-environment-night',im=images[env];
      if(im){
        // Use the home camera at the game width, anchored to the same top.
        // The game frame reveals only its upper strip; never reframe the scene.
        c.save();c.beginPath();c.rect(30,0,868,471);c.clip();
        if(catalog.sceneBackdrop){c.scale(W/887,W/887);catalog.sceneBackdrop(id,[0,0,887,1774]);}
        else{const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,scale=Math.max(W/iw,W*2/ih);c.drawImage(im,(W-iw*scale)/2,(W*2-ih*scale)/2,iw*scale,ih*scale);}
        c.restore();
      }
      const roof=images[outfitAsset('awning')];
      if(roof){const w=roof.naturalWidth||roof.width,h=roof.naturalHeight||roof.height,s=928/w;c.drawImage(roof,0,84-h*s,928,h*s);}
      art('lobby-brand-logo',464,130,480,147);
      for(const x of [87,841])art(outfitAsset('lamp'),x,163,98,160);
      art(outfitAsset('tables'),65,1696,145,140);
      const cloth=images['lobby-cloth-'+appearance.tables.id]||images['lobby-cloth-warm'];
      if(cloth){const iw=cloth.naturalWidth||cloth.width,ih=cloth.naturalHeight||cloth.height;
        c.save();c.beginPath();c.rect(590,1628,338,67);c.clip();
        if(appearance.tables.rare)c.drawImage(cloth,0,ih*.3,iw,ih*.25,590,1628,338,338*ih*.25/iw);
        else c.drawImage(cloth,590,1628,338,67);c.restore();}
    }
    function overlay(view) {
      const s = view.state;
      if (!view.panel && !view.resultReady) return;
      if (view.panel) {
        ui.fill(0, 0, W, H, '#21180fba');
        ui.settingsPanel(view.reducedMotion,{inGame:true,homeEnabled:view.homeEnabled,result:view.panel==='rest'&&s.status!=='playing',words:catalog.settingsWords});return;
      }
      const won = s.status === 'won', seconds = Math.ceil(s.wonAt === null ? s.playTime : s.wonAt);
      const elapsed = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      const pose = M.modal(won ? s.now - s.wonAt - M.timing.resultDelay : age(view, 'levelFailed'));
      c.save(); if (!view.reducedMotion) c.globalAlpha *= pose.alpha;
      ui.fill(0, 0, W, H, '#21180fba'); c.restore();
      c.save(); if (!view.reducedMotion) { c.globalAlpha *= pose.alpha; c.translate(464, 850); c.scale(pose.scale, pose.scale); c.translate(-464, -850); }
      const receipt=won&&view.saveError?'存档未成功，点按钮重试结算':Number.isFinite(view.wallet)?'钱包累计 '+view.wallet.toLocaleString():'';
      ui.victory(s.revenue, elapsed, { skipDim: true, won, receipt,
        message: won ? '要继续挑战下一关吗？' : '留意配方，给备菜栏留点空位',
        primaryLabel: won ? view.introduceStore ? '回店点亮第一盏灯' : '下一关' : view.rescueOffer ? view.adPending ? '视频加载中…' : view.rescueOffer.free ? view.rescueOffer.tool === 'stash' ? '移出三张继续' : '撤回一步继续' : view.rescueOffer.tool === 'stash' ? '看视频移出三张' : '看视频撤回一步' : '再试一次',
        restLabel: view.homeEnabled ? '回小摊看看' : '先休息一下' });
      if (!won && view.rescueOffer) text('免费再试', 464, 1192, 31, '#805332');
      c.restore();
    }
    function draw(view, geometry) {
      appearance = view.appearance || null;
      const g = geometry, v = M.viewport(g.width, g.height, g.insets);
      c.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); ui.fill(0, 0, g.width, g.height, '#1b3937');
      c.save(); c.translate(v.x, v.y); c.scale(v.scale, v.scale); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.drawImage(images.scene, 0, 0, W, H);
      decorations(); hud(view); orders(view); board(view); station(view); effects(view);
      if (view.toast) { ui.panel(124, 1150, 680, 66, 24); text(view.toast, 464, 1183, 27); }
      overlay(view); c.restore();
    }
    return { draw };
  }
  return { createRenderer };
});
