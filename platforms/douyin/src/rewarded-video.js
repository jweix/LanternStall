'use strict';
// Only onClose({isEnded:true}) completes a reward. show/load promises are not rewards.
function createRewardedRescue(host, adUnitId) {
  if (!adUnitId || typeof host.createRewardedVideoAd !== 'function') return undefined;
  let ad;
  try { ad = host.createRewardedVideoAd({ adUnitId }); } catch (_) { return undefined; }
  if (!ad || ['show','load','onClose','offClose','onError','offError'].some(k => typeof ad[k] !== 'function')) return undefined;
  let ready = false, loading = false, pending = null;
  function preload() {
    if (loading || pending || ready) return;
    loading = true;
    Promise.resolve().then(() => ad.load()).then(() => { ready = true; }, () => { ready = false; }).finally(() => { loading = false; });
  }
  function play() {
    if (pending || !ready) { preload(); return Promise.resolve(false); }
    ready = false;
    return new Promise(resolve => {
      const token = { resolve }; pending = token;
      const close = result => finish(result?.isEnded === true);
      const error = () => finish(false);
      function finish(completed) {
        if (pending !== token) return;
        pending = null; ad.offClose(close); ad.offError(error); resolve(completed); preload();
      }
      ad.onClose(close); ad.onError(error);
      Promise.resolve().then(() => ad.show()).catch(error);
    });
  }
  play.available = () => { if (!ready) preload(); return ready; };
  preload(); return play;
}
module.exports = { createRewardedRescue };
