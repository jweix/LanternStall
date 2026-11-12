(async function () {
  'use strict';
  const canvas = document.getElementById('game'), status = document.getElementById('status');
  try {
    const [recipes, ingredients, layout, manifest] = await Promise.all([
      'data/recipes.json', 'data/ingredients.json', 'data/layout.json', 'asset-manifest.json'
    ].map(path => fetch('../../shared/' + path).then(r => { if (!r.ok) throw Error(path); return r.json(); })));
    const assets = manifest.assets.filter(a => ['dish', 'ingredient'].includes(a.kind) ||
      ['wok', 'cloche', 'empty-plate', 'base-scene-reference'].includes(a.id));
    const images = Object.fromEntries(await Promise.all(assets.map(asset => new Promise((resolve, reject) => {
      const image = new Image(); image.onerror = reject;
      image.onload = () => {
        if (asset.id === 'base-scene-reference') { resolve(['scene', image]); return; }
        const b = asset.bbox, sprite = document.createElement('canvas');
        sprite.width = b.w; sprite.height = b.h;
        sprite.getContext('2d').drawImage(image, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        resolve([asset.id, sprite]);
      };
      image.src = '../../shared/' + asset.path;
    }))));
    function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } }
    function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Private browsing can disable storage. */ } }
    const progress = read('lantern-progress-v1', { level: 1 });
    const settings = read('lantern-settings-v1', {});
    const session = new DapaidangSession.Session({ recipes, layout,
      level: Number.isSafeInteger(progress.level) && progress.level > 0 ? Math.min(progress.level, 10000) : 1,
      reducedMotion: !!settings.reducedMotion,
      onProgress: value => write('lantern-progress-v1', value), onSettings: value => write('lantern-settings-v1', value) });
    const renderer = DapaidangScene.createRenderer(canvas.getContext('2d'), images, { recipes, ingredients, layout });
    canvas.addEventListener('pointerdown', event => {
      const r = canvas.getBoundingClientRect();
      session.pointer({ x: (event.clientX - r.left) * 928 / r.width, y: (event.clientY - r.top) * 1695 / r.height });
    });
    document.addEventListener('visibilitychange', () => session.setHidden(document.hidden));
    session.setHidden(document.hidden);
    function frame(ms) {
      if (!document.hidden) renderer.draw(session.frame(ms), { width: 928, height: 1695, dpr: 1 });
      requestAnimationFrame(frame);
    }
    // Read-only gameplay state is useful for manual inspection and browser QA.
    window.lanternGame = { session, renderer, ready: true };
    status.textContent = '开摊啦！按订单选择亮起的食材。';
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error); status.textContent = '食材未能载入，请从项目根目录运行 npm run serve 后打开此页。';
  }
})();
