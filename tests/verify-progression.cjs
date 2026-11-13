'use strict';
const assert = require('node:assert/strict');
const { Profile, hydrate } = require('../shared/core/profile.js');
const { App } = require('../shared/runtime/stall-app.js');
const { createRenderer } = require('../shared/rendering/stall-scene.js');
const C = require('../shared/data/progression.js');
const recipes = require('../shared/data/recipes.json'), ingredients = require('../shared/data/ingredients.json'), layout = require('../shared/data/layout.json');
let now = Date.parse('2026-11-13T10:00:00+08:00'), saved;
const profile = new Profile({ now: () => now, save: s => { saved = JSON.parse(JSON.stringify(s)); } });
const finish = (p, level, revenue = 800, dishes = ['d01']) => p.settle(p.begin(level), { level, revenue, dishes });
assert.equal(profile.begin(2), false);
let attempt = profile.begin(1), receipt = profile.settle(attempt, { level: 1, revenue: 636, dishes: ['d01', 'd01'] });
assert.equal(receipt.credited, 786); assert.equal(saved.coins, 786); assert.equal(profile.state.dishes.d01, 2);
assert.equal(profile.settle(attempt, { level: 1, revenue: 636, dishes: ['d01'] }), false);
assert.equal(profile.state.coins, 786);
assert(profile.purchase('warm-lamp')); assert.equal(profile.state.coins, 286); assert.equal(profile.state.equipped.lamp, 'warm-lamp');
assert.equal(profile.purchase('warm-lamp'), false); assert.equal(profile.purchase('warm-awning'), false);
assert.equal(profile.purchase('festival-lamp'), false); assert.equal(profile.equip('sea-lamp'), false);
assert(profile.equip('base-lamp')); assert.equal(profile.state.coins, 286);
const restored = new Profile({ data: saved, now: () => now });
assert.equal(restored.state.coins, 286); assert(restored.state.owned.includes('warm-lamp')); assert.equal(restored.nextLevel, 2);
receipt = finish(profile, 1); assert.equal(receipt.credited, 200); assert.equal(profile.state.dishes.d01, 3);
receipt = finish(profile, 1); assert.equal(receipt.credited, 150); assert.equal(profile.state.dishes.d01, 3);
receipt = finish(profile, 1); assert.equal(receipt.credited, 0); assert.equal(profile.state.daily.wins, 4);
now += 86400000;
receipt = finish(profile, 1); assert.equal(receipt.credited, 350); assert.equal(profile.state.daysOpen, 2);
now -= 86400000;
assert.equal(finish(profile, 1).credited, 0, 'Clock rollback must not reopen daily grants');
console.log('PASS wallet: first clear, daily grants, replay cap, duplicate settlement, purchases, equip, reload and clock rollback');

let writes = 0;
const broken = new Profile({ now: () => now, save: () => { writes++; return false; } });
assert.equal(broken.begin(1), false); assert.equal(broken.state.nextAttempt, 1); assert.equal(broken.state.coins, 0);
broken.options.save = () => true; const id = broken.begin(1); broken.options.save = () => false;
assert.equal(broken.settle(id, { level: 1, revenue: 636, dishes: ['d01'] }), false);
assert.equal(broken.state.coins, 0); assert(broken.state.activeAttempt);
broken.options.save = () => true;
assert.equal(broken.settle(id, { level: 1, revenue: 636, dishes: ['d01'] }).credited, 786);
const migrated = new Profile({ legacy: { level: 21 }, now: () => now });
assert.equal(migrated.nextLevel, 21); assert.equal(migrated.state.coins, 0); assert.equal(migrated.state.cleared.length, 20);
const corrupt = hydrate({ version: 2, coins: -5, owned: ['wrong', 'sea-lamp'], equipped: { lamp: 'sea-wok' }, dishes: { evil: 1, d01: -1 }, activity: [999, -1] });
assert.equal(corrupt.coins, 0); assert.equal(corrupt.equipped.lamp, 'base-lamp'); assert.deepEqual(corrupt.activity, [0, 0, 0, 0]);
console.log('PASS atomic storage failure/retry, legacy unlock migration and malformed save recovery');

now = Date.parse('2026-11-13T10:00:00+08:00');
const event = new Profile({ now: () => now, legacy: { level: 6 } });
for (let d = 0; d < 5; d++) { for (let i = 0; i < 3; i++) finish(event, 1); now += 86400000; }
assert.equal(event.state.activity[0], 14); assert(event.state.owned.includes('festival-ornament')); assert(event.state.owned.includes('festival-awning'));
assert.equal(event.selectBook(3), false);
assert.equal(event.state.activity[1], 0);
for (let book = 1; book <= 3; book++) {
  now = Date.parse('2026-11-13T10:00:00+08:00') + book * 7 * 86400000;
  assert(event.selectBook(book));
  for (let d = 0; d < 5; d++) { for (let i = 0; i < 3; i++) finish(event, 1); now += 86400000; }
}
assert.deepEqual(event.state.activity, [14, 14, 14, 14]); assert(event.state.owned.includes('festival-chef'));
assert.equal(event.state.owned.filter(id => id.startsWith('festival-')).length, 9);
assert.equal(event.state.daily.eventWins <= 3, true);
const collection = new Profile({ now: () => now, legacy: { level: 11 } });
finish(collection, 11, 800, recipes.map(r => r.id));
assert(collection.state.owned.includes('recipe-menu')); assert(collection.state.owned.includes('recipe-plate'));
assert.equal(collection.memories().filter(m => m.id === 'warm-3').length, 0, 'Recipe gifts do not inflate a paid theme collection');
assert(collection.photo()); const photo = JSON.parse(JSON.stringify(collection.state.photos[0]));
assert(collection.equip('recipe-plate')); assert.equal(photo.equipped.plate, 'base-plate');
assert(collection.removePhoto(photo.id)); assert.equal(collection.state.photos.length, 0);
console.log('PASS time-gated activity books, daily activity cap, permanent archive, nine event rewards, recipe rewards and immutable photo outfits');

function solve(app) {
  const session = app.session;
  for (const tileId of session.config.solution) {
    assert(session.pointer(session.engine.nodes.find(n => n.id === tileId)));
    session.advance(.3); if (session.engine.wok || session.engine.queue.length || session.engine.deliveries.length) session.advance(10);
  }
  session.advance(10); assert.equal(session.engine.status, 'won');
}
let appSave;
const app = new App({ recipes, layout, now: () => now, save: s => { appSave = s; } });
app.handle('play'); solve(app);
assert.equal(app.settlement.credited, 786); assert.equal(appSave.coins, 786); assert.equal(app.profile.state.dishes.d01 > 0, true);
app.session.advance(100); assert.equal(appSave.coins, 786);
app.home(); assert.equal(app.screen, 'home'); assert.equal(app.modal.type, 'first');
app.handle('tutorial'); app.handle('buy', 'warm-lamp'); app.handle('confirm-buy', 'warm-lamp');
assert.equal(app.profile.state.equipped.lamp, 'warm-lamp'); assert.equal(app.profile.state.coins, 286); assert(app.profile.state.tutorialDone);
const reload = new App({ recipes, layout, data: appSave, now: () => now });
assert.equal(reload.view().appearance.lamp.id, 'warm'); reload.handle('play'); assert.equal(reload.session.level, 2);
reload.session.pointer(reload.session.engine.nodes.find(n => reload.session.engine.available(n.id)));
reload.home(); assert.equal(reload.modal.type, 'leave'); reload.handle('leave'); assert.equal(reload.screen, 'home');
assert.equal(reload.profile.state.coins, 286); reload.handle('play'); assert.equal(reload.session.engine.revenue, 0);
reload.session.frame(0); reload.setHidden(true); reload.session.frame(300000); const frozen = reload.session.engine.now;
reload.setHidden(false); reload.session.frame(600000); assert.equal(reload.session.engine.now, frozen);
const sandbox = new App({ recipes, layout, previewLevel: 4, now: () => now }); solve(sandbox); assert.equal(sandbox.profile.state.coins, 0); assert(sandbox.settlement.sandbox);
console.log('PASS real engine → first clear → wallet → home → buy/equip → persisted reload → next level; abandon, pause and sandbox isolation');

const gradient = { addColorStop() {} }, texts = [];
const ctx = new Proxy({ globalAlpha: 1 }, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? v => ({ width: v.length * 25 }) : k === 'fillText' ? v => texts.push(v) : /create.*Gradient/.test(k) ? () => gradient : () => {} });
const images = Object.fromEntries(Object.keys(require('../shared/assets/runtime/asset-index.json')).map(id => [id, { width: 100, height: 80 }]));
const renderer = createRenderer(ctx, images, { recipes, ingredients, layout });
for (const tab of ['home', 'decor', 'recipes', 'market']) {
  app.handle('tab', tab); app.hits = renderer.draw(app.view(), { width: 390, height: 844, dpr: 3, insets: { top: 95, bottom: 34 } });
  assert.equal(app.hits.filter(h => h.action === 'tab').length >= 4, true);
  for (const h of app.hits) assert(h.rect.every(Number.isFinite));
}
assert(texts.includes('小摊') && texts.includes('装扮') && texts.includes('菜谱') && texts.includes('夜市'));
const firstUi = new App({ recipes, layout, now: () => now }); firstUi.handle('play'); solve(firstUi);
firstUi.hits = renderer.draw(firstUi.view(), { width: 928, height: 1695, dpr: 1 });
assert(firstUi.pointer({ x: 464, y: 1118 })); assert.equal(firstUi.screen, 'home'); assert.equal(firstUi.modal.type, 'first');
firstUi.hits = renderer.draw(firstUi.view(), { width: 928, height: 1695, dpr: 1 });
assert(firstUi.pointer({ x: 464, y: 1290 })); assert.equal(firstUi.tab, 'decor'); assert.equal(firstUi.selection, 'warm-lamp');
assert.equal(firstUi.modal, null);
assert.equal(C.items.filter(i => i.theme === 'warm').reduce((s, i) => s + i.price, 0), 24000);
console.log('PASS all four shared Canvas screens, bounded hit coordinates and catalog price budget');
