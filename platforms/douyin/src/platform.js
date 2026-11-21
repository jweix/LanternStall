'use strict';
// Host calls belong here, never in shared/. Coordinates use logical pixels.
function createPlatform(api, canvas) {
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  function geometry() {
    const info = api.getSystemInfoSync();
    const width = info.windowWidth, height = info.windowHeight;
    const safe = info.safeArea || {};
    let capsule = null;
    try { capsule = api.getMenuButtonLayout ? api.getMenuButtonLayout() : null; } catch (_) { /* Older hosts may omit it. */ }
    const capsuleBottom = capsule ? finite(capsule.bottom, finite(capsule.top + capsule.height, 0)) : 0;
    const edges = {
      left: Math.max(0, finite(safe.left, 0)),
      right: Math.max(0, width - finite(safe.right, width)),
      bottom: Math.max(0, height - finite(safe.bottom, height))
    };
    const statusTop = Math.max(0, finite(safe.top, finite(info.statusBarHeight, 0)));
    let lobbyTop = statusTop;
    for (let n = 0; n < 5; n++) {
      const scale = Math.min((width - edges.left - edges.right) / 887, (height - edges.bottom - lobbyTop) / 1774);
      lobbyTop = Math.max(statusTop, capsuleBottom ? capsuleBottom + 8 - 49 * scale : statusTop);
    }
    return { width, height, dpr: Math.min(Math.max(finite(info.pixelRatio, 1), 1), 3), nativeCapsule: true,
      insets: { ...edges, top: Math.max(statusTop, capsuleBottom ? capsuleBottom + 8 : 0) },
      lobbyInsets: { ...edges, top: lobbyTop } };
  }
  return {
    geometry,
    createAudio() {
      const Audio=require('./shared/runtime/feedback-audio.js');
      return Audio.create(name=>{
        if(!api.createInnerAudioContext)return {play(){},stop(){}};
        const voice=api.createInnerAudioContext();voice.src='assets/audio/'+name+'.wav';voice.volume=.45;
        if(voice.onError)voice.onError(()=>{});
        return {play:()=>voice.play(),stop:()=>voice.stop(),destroy:()=>voice.destroy()};
      });
    },
    analytics(name,fields) {
      if(!api.reportAnalytics)return;
      try{api.reportAnalytics(name,Object.fromEntries(Object.entries(fields||{}).map(([key,value])=>[key,String(value)])));}catch(_){}
    },
    resize() {
      const g = geometry();
      canvas.width = Math.round(g.width * g.dpr);
      canvas.height = Math.round(g.height * g.dpr);
      return g;
    },
    loadLobbyFonts() {
      const family = api.loadFont && api.loadFont('assets/fonts/LanternBody.ttf');
      if (api.loadFont && !family) throw new Error('界面字体加载失败');
      return { lobbyBodyFont: family || 'sans-serif' };
    },
    loadImages(index) {
      return Promise.all(Object.keys(index).map(id => new Promise((resolve, reject) => {
        const image = api.createImage();
        // Use the documented event API; do not require browser Image or DOM.
        image.addEventListener('load', () => resolve([id, image]));
        image.addEventListener('error', () => reject(new Error('图片加载失败：' + index[id].path)));
        image.src = index[id].path;
      }))).then(entries => Object.fromEntries(entries));
    },
    read(key, fallback) {
      try {
        const value = api.getStorageSync(key);
        return value === '' || value === undefined || value === null ? fallback : value;
      } catch (_) { return fallback; }
    },
    write(key, value) {
      try { api.setStorageSync(key, value); return true; }
      catch (error) { console.warn('本地存档失败', error); return false; }
    }
  };
}

function createSidebar(api, now = () => Date.now()) {
  let available = false, returned = false, enteredAt = null;
  return {
    // Called synchronously by the entry's onShow, even while images are loading.
    onShow(options) {
      returned = !!options && options.launch_from === 'homepage' && options.location === 'sidebar_card';
      enteredAt = now();
    },
    check() {
      return new Promise(resolve => {
        const done = value => { available = value; resolve(value); };
        if (typeof api.checkScene !== 'function' || typeof api.navigateToScene !== 'function') { done(false); return; }
        try {
          api.checkScene({ scene: 'sidebar', success: result => done(!!result && result.isExist === true), fail: () => done(false) });
        } catch (_) { done(false); }
      });
    },
    state() { return { available, returned, enteredAt }; },
    open() {
      if (!available) return Promise.resolve(false);
      return new Promise(resolve => {
        try { api.navigateToScene({ scene: 'sidebar', success: () => resolve(true), fail: () => resolve(false) }); }
        catch (_) { resolve(false); }
      });
    }
  };
}
module.exports = { createPlatform, createSidebar };
