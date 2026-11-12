/* 浏览器原型的宿主存档适配。平台 API 只放在各自工程中。 */
(function (host) {
  'use strict';
  const ownSnapshots = new Set();
  host.LanternPlatform = {
    loadGame() {
      return host.openai?.widgetState?.privateContent?.game ?? null;
    },
    saveGame(game, modelContent) {
      try {
        ownSnapshots.add(JSON.stringify(game));
        if (ownSnapshots.size > 64) ownSnapshots.delete(ownSnapshots.values().next().value);
        return Promise.resolve(host.openai?.setWidgetState?.({
          modelContent,
          privateContent: { game }
        })).catch(() => {});
      } catch (_) {
        // 存档宿主不可用时，当前原型仍可继续操作。
        return Promise.resolve();
      }
    },
    onGameChanged(listener) {
      const handler = event => {
        const game = event.detail?.globals?.widgetState?.privateContent?.game;
        if (game && !ownSnapshots.has(JSON.stringify(game))) listener(game);
      };
      host.addEventListener('openai:set_globals', handler);
      return () => host.removeEventListener('openai:set_globals', handler);
    }
  };
})(globalThis);
