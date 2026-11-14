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
    const edges = {
      left: Math.max(0, finite(safe.left, 0)), right: Math.max(0, width - finite(safe.right, width)),
      bottom: Math.max(0, height - finite(safe.bottom, height))
    };
    const statusTop = Math.max(0, finite(safe.top, 0));
    // The new lobby has an intentional empty native-menu region. Let scenery
    // start below the status bar, keeping the wallet below the real capsule.
    let lobbyTop = statusTop;
    for (let n = 0; n < 5; n++) {
      const scale = Math.min((width - edges.left - edges.right) / 887, (height - edges.bottom - lobbyTop) / 1774);
      lobbyTop = Math.max(statusTop, capsuleBottom ? capsuleBottom + 8 - 114 * scale : statusTop);
    }
    return { width, height, nativeCapsule: true, dpr: Math.min(info.pixelRatio || 1, 3),
      insets: Object.assign({}, edges, { top: Math.max(statusTop, capsuleBottom ? capsuleBottom + 8 : 0) }),
      lobbyInsets: Object.assign({}, edges, { top: lobbyTop }) };

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
    write(key, value) { try { api.setStorageSync(key, value); return true; } catch (error) { console.warn('本地存档失败', error); return false; } },
    resize() {
      const g = geometry();
      canvas.width = Math.round(g.width * g.dpr);
      canvas.height = Math.round(g.height * g.dpr);
      return g;
    }
  };
}
module.exports = { createPlatform };
