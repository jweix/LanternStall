'use strict';
// Every wx API stays in this platform directory. The shared game uses logical px.
function createPlatform(api, canvas) {
  function geometry() {
    const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
    const width = info.windowWidth, height = info.windowHeight;
    const safe = info.safeArea || { left: 0, top: 0, right: width, bottom: height };
    let capsule = null;
    try { capsule = api.getMenuButtonBoundingClientRect ? api.getMenuButtonBoundingClientRect() : null; } catch (_) { /* Some runtimes omit it. */ }
    const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const capsuleBottom = capsule ? finite(capsule.bottom, finite(capsule.top + capsule.height, 0)) : 0;
    return { width, height, dpr: Math.min(info.pixelRatio || 1, 3), insets: {
      left: Math.max(0, finite(safe.left, 0)), right: Math.max(0, width - finite(safe.right, width)),
      top: Math.max(finite(safe.top, 0), capsuleBottom ? capsuleBottom + 8 : 0),
      bottom: Math.max(0, height - finite(safe.bottom, height))
    } };
  }
  return {
    geometry,
    loadImages(index) {
      return Promise.all(Object.keys(index).map(id => new Promise((resolve, reject) => {
        const image = api.createImage();
        image.onload = () => resolve([id, image]);
        image.onerror = () => reject(new Error('图片加载失败：' + index[id].path));
        image.src = index[id].path;
      }))).then(entries => Object.fromEntries(entries));
    },
    read(key, fallback) { try { return api.getStorageSync(key) || fallback; } catch (_) { return fallback; } },
    write(key, value) { try { api.setStorageSync(key, value); } catch (error) { console.warn('本地存档失败', error); } },
    resize() {
      const g = geometry();
      canvas.width = Math.round(g.width * g.dpr);
      canvas.height = Math.round(g.height * g.dpr);
      return g;
    }
  };
}
module.exports = { createPlatform };
