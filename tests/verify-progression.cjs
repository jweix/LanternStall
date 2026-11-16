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
assert(profile.themeOffer('warm').complete); assert.equal(profile.state.coins, 786); assert.equal(profile.state.equipped.lamp, 'warm-lamp');
assert.equal(profile.purchaseTheme('bamboo'),false,'A bundle cannot overdraw the wallet');
assert.equal(profile.purchase('warm-lamp'), false); assert.equal(profile.purchase('warm-awning'), false);
assert.equal(profile.purchase('festival-lamp'), false); assert.equal(profile.equip('sea-lamp'), false);
assert(profile.equip('base-lamp')); assert.equal(profile.state.coins, 786);
const restored = new Profile({ data: saved, now: () => now });
assert.equal(restored.state.coins, 786); assert(restored.state.owned.includes('warm-lamp')); assert.equal(restored.nextLevel, 2);
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
assert.equal(corrupt.coins, 0); assert.equal(corrupt.equipped.lamp, 'warm-lamp'); assert.deepEqual(corrupt.activity, [0, 0, 0, 0]);
console.log('PASS atomic storage failure/retry, legacy unlock migration and malformed save recovery');

now = Date.parse('2026-11-13T10:00:00+08:00');
const event = new Profile({ now: () => now, legacy: { level: 6 } });
for (let d = 0; d < 5; d++) { for (let i = 0; i < 3; i++) finish(event, 1); now += 86400000; }
assert.equal(event.state.activity[0], 14); assert(event.state.owned.includes('harvest-ornament')); assert(event.state.owned.includes('harvest-awning'));
assert.equal(event.selectBook(3), false);
assert.equal(event.state.activity[1], 0);
for (let book = 1; book <= 3; book++) {
  now = Date.parse('2026-11-13T10:00:00+08:00') + book * 7 * 86400000;
  assert(event.selectBook(book));
  for (let d = 0; d < 5; d++) { for (let i = 0; i < 3; i++) finish(event, 1); now += 86400000; }
}
assert.deepEqual(event.state.activity, [14, 14, 14, 14]); assert(event.state.owned.includes('harvest-chef'));
assert.equal(event.state.owned.filter(id => id.startsWith('harvest-')).length, 9);
assert.equal(event.state.daily.eventWins <= 3, true);
const collection = new Profile({ now: () => now, legacy: { level: 11 } });
finish(collection, 11, 800, recipes.map(r => r.id));
assert(collection.state.owned.includes('recipe-menu')); assert(collection.state.owned.includes('recipe-plate'));
assert.equal(collection.memories().filter(m => m.id === 'warm-3').length, 0, 'Recipe gifts do not inflate a paid theme collection');
assert(collection.photo()); const photo = JSON.parse(JSON.stringify(collection.state.photos[0]));
assert(collection.equip('recipe-plate')); assert.equal(photo.equipped.plate, 'warm-plate');
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
assert.equal(app.profile.state.equipped.lamp, 'warm-lamp'); assert.equal(app.profile.state.coins, 786); assert(app.profile.state.tutorialDone);
const reload = new App({ recipes, layout, data: appSave, now: () => now });
assert.equal(reload.view().appearance.lamp.id, 'warm'); reload.handle('play'); assert.equal(reload.session.level, 2);
reload.session.pointer(reload.session.engine.nodes.find(n => reload.session.engine.available(n.id)));
reload.home(); assert.equal(reload.modal.type, 'leave'); reload.handle('leave'); assert.equal(reload.screen, 'home');
assert.equal(reload.profile.state.coins, 786); reload.handle('play'); assert.equal(reload.session.engine.revenue, 0);
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
assert(['小摊', '装扮', '菜谱', '夜市'].every(name => app.hits.some(h => h.action === 'tab' && h.label === name)), 'Artwork navigation must retain semantic actions for keyboard and touch');
const firstUi = new App({ recipes, layout, now: () => now }); firstUi.handle('play'); solve(firstUi);
firstUi.hits = renderer.draw(firstUi.view(), { width: 928, height: 1695, dpr: 1 });
assert(firstUi.pointer({ x: 464, y: 1118 })); assert.equal(firstUi.screen, 'home'); assert.equal(firstUi.modal.type, 'first');
firstUi.hits = renderer.draw(firstUi.view(), { width: 928, height: 1695, dpr: 1 });
const tutorialHit = firstUi.hits.find(h => h.action === 'tutorial'); assert(tutorialHit);
assert(firstUi.pointer({ x: tutorialHit.rect[0] + tutorialHit.rect[2] / 2, y: tutorialHit.rect[1] + tutorialHit.rect[3] / 2 })); assert.equal(firstUi.tab, 'decor'); assert.equal(firstUi.theme, 'bamboo');
assert.equal(firstUi.modal, null);
const savedOutfit = JSON.stringify(app.profile.state.equipped), savedCoins = app.profile.state.coins;
app.handle('tab', 'decor'); app.handle('sub', 'themes'); app.handle('theme', 'sea');
assert(app.view().themePreview); assert(C.slots.every(slot => app.view().appearance[slot].id === 'sea'));
assert.equal(JSON.stringify(app.profile.state.equipped), savedOutfit); assert.equal(app.profile.state.coins, savedCoins);
app.handle('sub','rares');app.handle('rare-family','star');const fullRareAppearance=JSON.stringify(app.view().appearance);
app.handle('item','star-lamp');assert.equal(JSON.stringify(app.view().appearance),fullRareAppearance,'Opening part details keeps the complete preview');
app.handle('preview-rare-item','star-lamp'); assert.equal(app.view().themePreview, false); assert.equal(app.view().appearance.lamp.id, 'star');
assert.equal(app.view().appearance.awning.id, app.profile.appearance().awning.id, 'A single-item preview must not replace unrelated slots');
assert.equal(JSON.stringify(app.profile.state.equipped),savedOutfit);assert.equal(app.profile.state.coins,savedCoins);
app.handle('tab', 'home'); assert.equal(JSON.stringify(app.profile.state.equipped), savedOutfit);
assert.equal(C.items.filter(i => i.theme === 'bamboo').reduce((s, i) => s + i.price, 0), 6000);
console.log('PASS all four shared Canvas screens, bounded hit coordinates and catalog price budget');

// Bundles retain discounts for legacy pieces, atomically purchase/equip, and never sell rare items.
const legacyOwned={version:2,coins:100000,cleared:Array.from({length:41},(_,i)=>i+1),owned:['bamboo-lamp']};
const bundles=new Profile({data:legacyOwned,now:()=>now});
assert.equal(bundles.purchase('bamboo-awning'),false,'Ordinary components have no single-piece commerce');
assert.equal(bundles.themeOffer('bamboo').price,5875);assert.equal(bundles.themeOffer('bamboo').owned,1);
const bundleBefore=JSON.stringify(bundles.state);let bundleWrites=0;
bundles.options.save=()=>{bundleWrites++;return false;};
assert.equal(bundles.purchaseTheme('bamboo'),false);assert.equal(JSON.stringify(bundles.state),bundleBefore);
bundles.options.save=()=>{bundleWrites++;return true;};const beforeBundleBalance=bundles.state.coins;
assert(bundles.purchaseTheme('bamboo'));assert.equal(bundleWrites,2);
assert.equal(bundles.state.coins,beforeBundleBalance-5875);
assert(C.slots.every(slot=>bundles.state.equipped[slot]==='bamboo-'+slot));
assert.equal(bundles.purchaseTheme('bamboo'),false,'Repeated confirmation cannot charge twice');
assert(bundles.equip('base-chef'));const freeBalance=bundles.state.coins;
assert(bundles.equipTheme('bamboo'));assert.equal(bundles.state.coins,freeBalance);
assert.equal(bundles.equipTheme('sea'),false);assert.equal(bundles.themeOffer('star'),null);
assert.equal(bundles.purchaseTheme('star'),false);assert.equal(bundles.themeOffer('base'),null);
const legacyAutumn=new Profile({data:{...legacyOwned,owned:['festival-ornament','festival-awning']}});
assert.equal(legacyAutumn.themeOffer('festival').owned,2);
assert.equal(legacyAutumn.themeOffer('festival').price,15750,'Legacy autumn gifts retain their allocated credit');
assert(legacyAutumn.purchaseTheme('festival'));
assert(new Profile({data:legacyAutumn.state}).themeOffer('festival').complete);
const rare=new Profile({data:{version:2,coins:5000,dishes:Object.fromEntries(recipes.slice(0,8).map(r=>[r.id,1])),activity:[6,0,0,0]}});
assert(rare.state.owned.includes('star-lamp'));assert(rare.state.owned.includes('star-tables'));
assert(rare.state.owned.includes('harvest-ornament'));assert(!rare.state.owned.includes('star-background'));
assert.equal(rare.rareOffer('star-awning').value,8);assert.equal(rare.rareOffer('star-awning').target,12);
const beforeRare=JSON.stringify(rare.state.equipped),coins=rare.state.coins;
assert(rare.equip('star-lamp'));assert.equal(rare.state.coins,coins);
for(const slot of C.slots.filter(s=>s!=='lamp'))assert.equal(rare.state.equipped[slot],JSON.parse(beforeRare)[slot]);
assert.equal(rare.equip('star-background'),false);assert.equal(rare.equipRareFamily('star'),false);
assert(rare.equipTheme('warm'));assert(C.slots.every(slot=>rare.state.equipped[slot]==='warm-'+slot));
assert(rare.state.owned.includes('star-lamp'),'Changing a whole set never deletes rare ownership');
const collector=new Profile({data:{version:2,dishes:Object.fromEntries(recipes.map(r=>[r.id,1]))}});
assert(collector.equipRareFamily('star'));assert(C.slots.every(slot=>collector.state.equipped[slot]==='star-'+slot));
console.log('PASS whole-set commerce, legacy credits, atomic rollback, duplicate protection, automatic rare unlocks, independent rare equip and full-set reset');

const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const browserContext={DapaidangProgression:C};vm.createContext(browserContext);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../platforms/web/src/outfit-playtest.js'),'utf8'),browserContext);
const fixture=browserContext.DapaidangOutfitPlaytest;
assert.equal(fixture(null),null);assert.equal(fixture('invalid'),null);
const starterFixture=fixture('starter'),collectionFixture=fixture('collection');
assert.notEqual(starterFixture.key,C.saveKey);assert.notEqual(collectionFixture.key,C.saveKey);assert.notEqual(starterFixture.key,collectionFixture.key);
const snapshot=JSON.stringify(starterFixture.data),testProfile=new Profile({data:starterFixture.data});
assert(testProfile.purchaseTheme('bamboo'));assert.equal(testProfile.state.coins,4000);
assert.equal(JSON.stringify(starterFixture.data),snapshot,'Hydration and purchase do not mutate fixture source or another profile');
assert.equal(fixture('starter').data.coins,10000);
assert(new Profile({data:collectionFixture.data}).equipRareFamily('harvest'));
console.log('PASS optional wardrobe fixtures use isolated save keys, fresh objects and the real purchase/equip rules');

const restoration=new Profile({data:{...rare.state,baseTheme:'warm'}});
assert(restoration.equip('star-lamp'));assert(restoration.equip('star-tables'));
const restorationBefore=JSON.stringify(restoration.state),savedOther={...restoration.state.equipped};
restoration.options.save=()=>false;assert.equal(restoration.restorePart('star-lamp'),false);assert.equal(JSON.stringify(restoration.state),restorationBefore,'A failed restore does not alter the saved outfit');
restoration.options.save=()=>true;assert(restoration.restorePart('star-lamp'));assert.equal(restoration.state.equipped.lamp,'warm-lamp');
for(const slot of C.slots.filter(s=>s!=='lamp'))assert.equal(restoration.state.equipped[slot],savedOther[slot]);
assert.equal(restoration.state.coins,JSON.parse(restorationBefore).coins);assert.equal(restoration.restorePart('star-lamp'),false);
const restoredReload=new Profile({data:restoration.state});assert.equal(restoredReload.state.equipped.lamp,'warm-lamp');assert.equal(restoredReload.state.equipped.tables,'star-tables');
assert.equal(new Profile({data:bundles.state}).state.baseTheme,'bamboo','Normal set selection remains the restore destination after reload');
console.log('PASS single-slot restore, reload, save-failure rollback and preservation of coins/other equipped pieces');
