(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DapaidangProgression = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const slots = ['lamp', 'awning', 'tables', 'ornament', 'menu', 'plate', 'wok', 'chef', 'background'];
  const names = ['灯串', '棚布', '桌椅', '摆件', '菜单牌', '餐盘', '锅具', '大厨服装', '场景背景'];
  const prices = [500, 1000, 1600, 2000, 2400, 3000, 3500, 4500, 5500];
  const themes = [
    { id: 'base', name: '初见小摊', unlock: 0, scale: 0, night: '#233e40', color: '#b95343', light: '#efbf72', wood: '#b77e4d', style: 0 },
    { id: 'warm', name: '暖红夜市', unlock: 1, scale: 1, night: '#343f40', color: '#ac433c', light: '#ffc96b', wood: '#b76e42', style: 1 },
    { id: 'bamboo', name: '竹影河岸', unlock: 20, scale: 2, night: '#254b45', color: '#788957', light: '#e7d69f', wood: '#9a8957', style: 2 },
    { id: 'sea', name: '海风夜市', unlock: 40, scale: 3, night: '#284d62', color: '#588b9a', light: '#ffe0a2', wood: '#9a8a6c', style: 3 },
    { id: 'festival', name: '秋夜灯会', unlock: 5, night: '#393c59', color: '#8c677c', light: '#f7dca2', wood: '#ad805c', style: 4 }
  ];
  const items = [];
  for (const theme of themes) slots.forEach((slot, i) => items.push({
    id: theme.id + '-' + slot, theme: theme.id, slot, name: theme.name + '·' + names[i],
    price: theme.scale ? prices[i] * theme.scale : 0,
    source: theme.id === 'base' ? 'starter' : theme.id === 'festival' ? 'event' : 'coins', unlock: theme.unlock
  }));
  items.push(
    { id: 'recipe-menu', theme: 'warm', slot: 'menu', name: '家常手绘菜单', source: 'recipe', unlock: 0, price: 0 },
    { id: 'recipe-plate', theme: 'sea', slot: 'plate', name: '好味道青花盘', source: 'recipe', unlock: 0, price: 0 }
  );
  const event = { id: 'autumn-2026', name: '秋夜灯会', start: '2026-11-13',
    books: ['初点灯火', '河岸晚风', '热锅小调', '满街暖光'],
    small: ['ornament', 'menu', 'plate', 'lamp'], large: ['awning', 'tables', 'wok', 'background'], milestones: [3, 6, 10, 14] };
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const byTheme = Object.fromEntries(themes.map(t => [t.id, t]));
  const economy = { firstWin: 150, threeWins: 150, practice: 200, ad: 200, adLimit: 3 };
  return { slots, names, themes, items, byId, byTheme, event, economy, saveKey: 'lantern-stall-v2', schema: 2 };
});
