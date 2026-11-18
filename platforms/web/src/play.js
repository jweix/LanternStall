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
    const params=new URLSearchParams(location.search),requested=Number(params.get('level'));
    const playtest=DapaidangOutfitPlaytest(params.get('wardrobe')),saveKey=playtest?playtest.key:'lantern-stall-v2';
    const app = new DapaidangApp.App({ recipes, layout, data: read(saveKey, playtest?playtest.data:null), legacy: progress, settings,
      previewLevel: Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10000) : null,
      save: value => write(saveKey, value) });
    if(playtest){
      document.body.classList.add('outfit-playtest');
      canvas.style.width='min(92vw,420px,calc((100dvh - 70px)*887/1774))';
      app.tab='decor';app.sub.decor=params.get('wardrobe')==='collection'?'rares':'themes';
      app.category='series';
      app.theme=params.get('wardrobe')==='collection'?'warm':'bamboo';
      app.previewTheme=params.get('wardrobe')!=='collection';
      document.getElementById('outfit-playtest').hidden=false;
      document.getElementById('outfit-playtest-note').textContent=playtest.title+'：金币与装扮仅保存在此体验档，原游戏进度独立保留。';
      document.getElementById('reset-outfit-playtest').addEventListener('click',()=>{
        if(write(saveKey,playtest.data))location.reload();
        else status.textContent='体验档未能保存，请重试';
      });
      for(const link of document.querySelectorAll('nav[aria-label="难度试玩"] a'))link.href+='&wardrobe='+params.get('wardrobe');
      if(params.get('tab')==='home')app.handle('tab','home');
    }
    const bodyFace = new FontFace('LanternBody', 'url(../../shared/assets/lobby/fonts/LanternBody.ttf)', {weight:'500'});
    await bodyFace.load();document.fonts.add(bodyFace);
    const renderer = DapaidangStallScene.createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout, assets:index, lobbyBodyFont: 'LanternBody' });
    document.addEventListener('visibilitychange', () => app.setHidden(document.hidden));
    app.setHidden(document.hidden);
    const controls = document.getElementById('controls'); let previousControls = '';
    DapaidangWebInput.bind(app,canvas,controls,()=>renderer.designSize(app.screen));
    function accessibleControls(view) {
      const list = app.hits.slice();
      if (view.screen === 'game' && !view.modal) {
        const g = view.game, buttons = DapaidangSession.buttons;
        const add = (label, rect, state) => list.push(Object.assign({ label, rect },state));
        if (g.panel) {
          add('动效',buttons.reduced,{role:'switch',checked:!g.reducedMotion});add(g.panel==='rest'&&g.state.status!=='playing'?'查看本关结果':'继续营业',buttons.resume);add('重新开摊',buttons.restart);if(g.homeEnabled)add('返回首页',buttons.home);
        } else if (g.resultReady) {
          if (!list.some(h => h.rect[1] === layout.result.nextButton[1])) add(g.state.status === 'won' ? '下一关' : g.rescueOffer ? '看视频继续备菜' : '再试一次', layout.result.nextButton);
          if (g.rescueOffer) add('免费再试', buttons.rescueRetry);
          add('回小摊看看', g.rescueOffer ? buttons.rescueHome : layout.result.restButton);
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
      const focused=controls.contains(document.activeElement)?document.activeElement.textContent:null;
      controls.replaceChildren(...list.map(hit => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = hit.label;
        button.dataset.action=hit.action||'';
        if(hit.role){button.setAttribute('role',hit.role);button.setAttribute('aria-checked',String(hit.checked));}
        const [x, y, w, h] = hit.rect, size = renderer.designSize(app.screen);
        Object.assign(button.style, { left: x / size.width * 100 + '%', top: y / size.height * 100 + '%', width: w / size.width * 100 + '%', height: h / size.height * 100 + '%' });
        const invoke = event => { event.preventDefault(); app.pointer({ x: x + w / 2, y: y + h / 2 }); };
        button.addEventListener('click', event => { if (event.detail === 0) invoke(event); });
        return button;
      }));
      if(focused){const next=Array.from(controls.children).find(b=>b.textContent===focused)||controls.querySelector('[data-action="scroll-region"]');if(next)next.focus({preventScroll:true});}
    }
    function frame(ms) {
      if (!document.hidden) {
        const view = app.frame(ms), size = renderer.designSize(view.screen);
        if (canvas.width !== size.width || canvas.height !== size.height) {
          canvas.width = size.width; canvas.height = size.height; canvas.style.aspectRatio = size.width + '/' + size.height;
          canvas.style.width = 'min(92vw,420px,calc((100dvh - '+(playtest?70:40)+'px)*' + size.width + '/' + size.height + '))';
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
