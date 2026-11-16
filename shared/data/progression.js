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
    { id: 'warm', name: '暖红夜市', short: '暖红', unlock: 0, total: 0, scale: 0, night: '#343f40', color: '#ac433c', light: '#ffc96b', wood: '#b76e42', style: 1 },
    { id: 'bamboo', name: '竹影河岸', short: '竹影', unlock: 1, total: 6000, scale: 2, night: '#293f38', color: '#8d9657', light: '#ead5a0', wood: '#a77b49', style: 2 },
    { id: 'sea', name: '海风夜市', short: '海风', unlock: 10, total: 12000, scale: 3, night: '#293f50', color: '#30486b', light: '#f2d6a2', wood: '#b18153', style: 3 },
    { id: 'festival', name: '秋夜灯会', short: '秋夜', unlock: 20, total: 18000, scale: 1, night: '#353944', color: '#81536a', light: '#f4c378', wood: '#b57b45', style: 4 },
    { id: 'star', name: '星河琉璃', rare: true, unlock: 0, night: '#233854', color: '#497c85', light: '#ffdfa0', wood: '#b27a43', style: 5 },
    { id: 'harvest', name: '柿灯丰年', rare: true, unlock: 0, night: '#394450', color: '#c77539', light: '#ffd48a', wood: '#b57b45', style: 6 }
  ];
  const items = [];
  for (const theme of themes) slots.forEach((slot, i) => items.push({
    id: theme.id + '-' + slot, theme: theme.id, slot, name: theme.name + '·' + names[i],
    price: Math.round((theme.total || 0) * prices[i] / 24000),
    source: theme.rare ? 'rare' : theme.id === 'base' || theme.id === 'warm' ? 'starter' : 'coins', unlock: theme.unlock
  }));
  items.push(
    { id: 'recipe-menu', theme: 'warm', slot: 'menu', name: '家常手绘菜单', source: 'recipe', unlock: 0, price: 0 },
    { id: 'recipe-plate', theme: 'sea', slot: 'plate', name: '好味道青花盘', source: 'recipe', unlock: 0, price: 0 }
  );
  const event = { id: 'autumn-2026', name: '秋夜灯会', start: '2026-11-13',
    books: ['初点灯火', '河岸晚风', '热锅小调', '满街暖光'],
    small: ['ornament', 'menu', 'plate', 'lamp'], large: ['awning', 'tables', 'wok', 'background'], milestones: [3, 6, 10, 14] };
  const starTargets = { lamp: 6, tables: 8, ornament: 10, awning: 12, menu: 14, plate: 16, wok: 18, chef: 20, background: 20 };
  for (const item of items.filter(i => i.source === 'rare')) {
    item.name = (item.theme === 'star' ? '星河' : '丰年') + names[slots.indexOf(item.slot)];
    if (item.theme === 'star') item.condition = { type: 'recipes', target: starTargets[item.slot] };
    else if (item.slot === 'chef') item.condition = { type: 'activity', target: 56 };
    else {
      const small = event.small.indexOf(item.slot), large = event.large.indexOf(item.slot);
      item.condition = { type: 'book', book: small >= 0 ? small : large, target: small >= 0 ? 6 : 14 };
    }
  }
  items.find(i => i.id === 'recipe-menu').condition = { type: 'recipes', target: 6 };
  items.find(i => i.id === 'recipe-plate').condition = { type: 'recipes', target: 12 };
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const byTheme = Object.fromEntries(themes.map(t => [t.id, t]));
  const economy = { firstWin: 150, threeWins: 150, practice: 200, ad: 200, adLimit: 3 };
  const shopThemes = themes.filter(t => t.id !== 'base' && !t.rare);
  const rareItems = items.filter(i => i.condition);
  const rareFamilies = themes.filter(t => t.rare).map(t => ({id:t.id,name:t.name,theme:t.id,
    source:t.id==='star'?'菜谱收集':'夜市活动',items:rareItems.filter(i=>i.theme===t.id).map(i=>i.id)}));
  rareFamilies.push({id:'recipe',name:'菜谱赠礼',source:'菜谱收集',items:rareItems.filter(i=>i.source==='recipe').map(i=>i.id)});
  return { slots, names, themes, items, byId, byTheme, shopThemes, rareItems, rareFamilies, event, economy, saveKey: 'lantern-stall-v2', schema: 2 };
});
