(async function () {
  'use strict';
  const canvas = document.getElementById('game'), status = document.getElementById('status');
  try {
    const [recipes, ingredients, layout, index] = await Promise.all([
      'data/recipes.json', 'data/ingredients.json', 'data/layout.json', 'assets/runtime/asset-index.json'
    ].map(path => fetch('../../shared/' + path).then(r => { if (!r.ok) throw Error(path); return r.json(); })));
    const images = Object.fromEntries(await Promise.all(Object.entries(index).map(([id, asset]) => new Promise((resolve, reject) => {
      const image = new Image(); image.onerror = reject;
      image.onload = () => {
        resolve([id, image]);
      };
      image.src = '../../shared/assets/runtime/' + asset.path.split('/').pop();
    }))));
    function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } }
    function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
    const progress = read('lantern-progress-v1', { level: 1 });
    const settings = read('lantern-settings-v1', {});
    const requested = Number(new URLSearchParams(location.search).get('level'));
    const app = new DapaidangApp.App({ recipes, layout, data: read('lantern-stall-v2', null), legacy: progress, settings,
      previewLevel: Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10000) : null,
      save: value => write('lantern-stall-v2', value) });
    const renderer = DapaidangStallScene.createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout });
    canvas.addEventListener('pointerdown', event => {
      const r = canvas.getBoundingClientRect();
      const size = renderer.designSize(app.screen);
      app.pointer({ x: (event.clientX - r.left) * size.width / r.width, y: (event.clientY - r.top) * size.height / r.height });
    });
    document.addEventListener('visibilitychange', () => app.setHidden(document.hidden));
    app.setHidden(document.hidden);
    const controls = document.getElementById('controls'); let previousControls = '';
    function accessibleControls(view) {
      const list = app.hits.slice();
      if (view.screen === 'game' && !view.modal) {
        const g = view.game, buttons = DapaidangSession.buttons;
        const add = (label, rect) => list.push({ label, rect });
        if (g.panel) {
          add('继续营业', buttons.resume); add('减少动效', buttons.reduced); add('重新开摊', buttons.restart); add('回小摊', [204, 1148, 520, 68]);
        } else if (g.resultReady) {
          if (!list.some(h => h.rect[1] === layout.result.nextButton[1])) add(g.state.status === 'won' ? '下一关' : '再试一次', layout.result.nextButton);
          add('回小摊看看', layout.result.restButton);
        } else if (g.state.status === 'playing') {
          add('暂停设置', buttons.settings);
          for (const [key, title] of [['undo', '撤回'], ['stash', '暂存'], ['hint', '提示']]) add(title, buttons[key]);
          g.state.stashItems.forEach((item, i) => add('取回' + ingredients.find(f => f.id === item.food).name, buttons.stored[i]));
          for (const tile of app.session.engine.nodes.filter(n => app.session.engine.available(n.id))) {
            list.push({ label: ingredients.find(i => i.id === tile.food).name + ' · ' + tile.id, rect: [tile.x - tile.w / 2, tile.y - tile.h / 2, tile.w, tile.h] });
          }
        }
      }
      const signature = app.screen + JSON.stringify(list);
      if (signature === previousControls) return; previousControls = signature;
      controls.replaceChildren(...list.map(hit => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = hit.label;
        const [x, y, w, h] = hit.rect, size = renderer.designSize(app.screen);
        Object.assign(button.style, { left: x / size.width * 100 + '%', top: y / size.height * 100 + '%', width: w / size.width * 100 + '%', height: h / size.height * 100 + '%' });
        const invoke = event => { event.preventDefault(); app.pointer({ x: x + w / 2, y: y + h / 2 }); };
        button.addEventListener('pointerdown', invoke); button.addEventListener('click', event => { if (event.detail === 0) invoke(event); });
        return button;
      }));
    }
    function frame(ms) {
      if (!document.hidden) {
        const view = app.frame(ms), size = renderer.designSize(view.screen);
        if (canvas.width !== size.width || canvas.height !== size.height) {
          canvas.width = size.width; canvas.height = size.height; canvas.style.aspectRatio = size.width + '/' + size.height;
          canvas.style.width = 'min(92vw,420px,calc((100dvh - 40px)*' + size.width + '/' + size.height + '))';
        }
        app.hits = renderer.draw(view, { width: size.width, height: size.height, dpr: 1 }); accessibleControls(view);
        const summary = view.toast || (view.screen === 'game' ? view.game.state.status === 'won' ?
          '通关完成，本次入账 ' + (view.settlement?.credited || 0) + ' 金币；钱包 ' + view.state.coins :
          '第 ' + view.game.level + ' 关 · 本局收入 ' + view.game.state.revenue + ' · 钱包 ' + view.state.coins :
          ({ home: '小摊', decor: '装扮', recipes: '菜谱', market: '夜市' }[view.tab]) + ' · 金币余额 ' + view.state.coins + ' · 已完成 ' + view.state.cleared.length + ' 关');
        if (status.textContent !== summary) status.textContent = summary;
      }
      requestAnimationFrame(frame);
    }
    // Read-only gameplay state is useful for manual inspection and browser QA.
    window.lanternGame = { app, get session() { return app.session; }, renderer, ready: true };
    status.textContent = '小摊开张啦！闯关赚金币，给小摊换个模样。';
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error); status.textContent = '食材未能载入，请从项目根目录运行 npm run serve 后打开此页。';
  }
})();
