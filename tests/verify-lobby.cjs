'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { App } = require('../shared/runtime/stall-app.js');
const { createRenderer } = require('../shared/rendering/stall-scene.js');
const Lobby = require('../shared/rendering/lobby-ui.js');
const Motion = require('../shared/core/motion.js');
const C = require('../shared/data/progression.js');
const recipes = require('../shared/data/recipes.json'), ingredients = require('../shared/data/ingredients.json'), layout = require('../shared/data/layout.json');
const index = require('../shared/assets/runtime/asset-index.json');
const draws = [], labels = [], gradient = { addColorStop() {} };
const ctx = new Proxy({ globalAlpha: 1 }, { get: (o,k) => k in o ? o[k] : k === 'measureText' ? t => ({ width: String(t).length * 23 }) :
  k === 'fillText' ? t => labels.push(String(t)) : k === 'drawImage' ? (im, ...args) => draws.push({id:im.id,args}) : /create.*Gradient/.test(k) ? () => gradient : () => {} });
const images = Object.fromEntries(Object.entries(index).map(([id,a]) => [id, { id, width:a.width,height:a.height }]));
const renderer = createRenderer(ctx,images,{recipes,ingredients,layout});
const geometry = {width:390,height:844,dpr:3,insets:{top:95,bottom:34},nativeCapsule:true};
const app = new App({recipes,layout,now:()=>Date.parse('2026-11-14T12:00:00+08:00')});
function render(a=app) { draws.length=0;labels.length=0;a.hits=renderer.draw(a.view(),geometry);return a.hits; }
function tap(action,value,a=app) {
  render(a); const h=a.hits.find(h=>h.action===action&&(value===undefined||h.value===value));assert(h,'Missing live action '+action+' '+value);
  const v=renderer.coordinates(geometry,a.screen), x=h.rect[0]+h.rect[2]/2,y=h.rect[1]+h.rect[3]/2;
  assert(a.pointer(Motion.toDesign(v.x+x*v.scale,v.y+y*v.scale,v)));
}
render();assert(draws.some(d=>d.id==='lobby-scene-counter'));assert(labels.includes('0'));assert(labels.includes('第1关'));assert(!labels.includes('384'));
for(const tab of ['decor','recipes','market','home']) {
  tap('tab',tab);render();assert(draws.some(d=>d.id===(tab==='home'?'lobby-scene-counter':'lobby-content-panel')));
  assert.equal(app.hits.filter(h=>h.action==='tab'&&h.rect[1]>=1600&&['home','decor','recipes','market'].includes(h.value)).length,4);
  for(const h of app.hits){assert(h.rect.every(Number.isFinite));assert(h.rect[0]>=0&&h.rect[1]>=0);assert(h.rect[0]+h.rect[2]<=887.01&&h.rect[1]+h.rect[3]<=1774.01);}
}
tap('tab','recipes');render();assert(labels.includes('首通3关，打开小摊菜谱'));assert(!app.hits.some(h=>h.action==='recipe'));
tap('tab','market');render();assert(labels.includes('首通5关，参加夜市活动'));assert(!app.hits.some(h=>h.action==='book'));
tap('tab','decor');tap('item','warm-lamp');const before=JSON.stringify(app.profile.state);render();assert(labels.includes('购买并换上 · 500'));
tap('buy','warm-lamp');assert.equal(app.modal,null);assert.equal(JSON.stringify(app.profile.state),before);assert(app.view().toast.includes('首通1关'));
tap('category-page',1);assert.equal(app.category,'plate');render();assert(app.hits.some(h=>h.action==='category'&&h.value==='wok'));
tap('category','wok');render();assert(app.hits.some(h=>h.action==='item'&&h.value==='base-wok'));
tap('sub','chef');render();assert(app.hits.some(h=>h.action==='item'&&h.value==='base-chef'));
tap('sub','background');render();assert(app.hits.some(h=>h.action==='item'&&h.value==='base-background'));
tap('sub','themes');tap('theme','sea');const preview=app.view();assert(preview.themePreview);render();
assert(draws.some(d=>d.id==='lobby-scene-counter'));assert(draws.some(d=>d.id==='lobby-scene-chef-sea'));assert(draws.some(d=>d.id==='stall-night-sea'));
assert.equal(app.profile.state.coins,0);assert(C.slots.every(s=>app.profile.state.equipped[s]==='base-'+s));
tap('tab','home');tap('map');render();assert(app.hits.every(h=>h.action!=='tab'),'Modal blocks background navigation');tap('close');
tap('ledger');render();assert(labels.some(t=>t.includes('小摊账本')));tap('close');
tap('settings');render();assert(labels.includes('小摊设置'));tap('close');
tap('play');assert.equal(app.screen,'game');assert.deepEqual(renderer.designSize('game'),{width:928,height:1695});
assert.deepEqual(renderer.designSize('home'),{width:887,height:1774});
console.log('PASS modular lobby with live balances, four native/keyboard navigation actions, gates, all equipment groups, preview isolation and modal input blocking');

// Isolated legitimate progression, never a player save or a production demo flag.
const rich=new App({recipes,layout,now:()=>Date.parse('2026-12-12T12:00:00+08:00')});
for(let n=1;n<=45;n++){const id=rich.profile.begin(n);assert(rich.profile.settle(id,{level:n,revenue:800,dishes:recipes.map(r=>r.id)}));}
rich.tab='decor';rich.selection='warm-lamp';rich.preview='warm-lamp';rich.category='lamp';render(rich);
tap('buy','warm-lamp',rich);assert.equal(rich.modal.type,'purchase');render(rich);
const balance=rich.profile.state.coins;tap('confirm-buy','warm-lamp',rich);assert.equal(rich.profile.state.coins,balance-500);assert.equal(rich.profile.state.equipped.lamp,'warm-lamp');
rich.handle('confirm-buy','warm-lamp');assert.equal(rich.profile.state.coins,balance-500);
tap('tab','decor',rich);tap('item','bamboo-lamp',rich);render(rich);
assert(draws.some(d=>d.id==='lobby-lamp-bamboo'));assert(!draws.some(d=>d.id==='stall-body'),'Single-item preview retains the approved large composition');
tap('tab','recipes',rich);render(rich);assert(rich.hits.some(h=>h.action==='recipe'&&h.value==='d01'));assert(labels.includes('已做45份'));assert(draws.some(d=>d.id==='d01'));
tap('page',1,rich);render(rich);assert(rich.hits.some(h=>h.action==='recipe'&&h.value==='d07'));
tap('tab','market',rich);render(rich);assert(!rich.hits.some(h=>/claim|领取/.test(h.action+' '+h.label)),'Activities remain automatic rewards');
const savedBalance=rich.profile.state.coins;rich.profile.state.coins=1000000000;rich.handle('tab','home');render(rich);assert(labels.includes('10亿'));rich.profile.state.coins=savedBalance;
for(const [w,h,top,bottom] of [[320,568,20,0],[390,844,95,34],[1024,768,0,0]]) {
  const p=Lobby.viewport(w,h,{top,bottom});assert(p.x>=0&&p.y>=top);assert(p.x+887*p.scale<=w+.01&&p.y+1774*p.scale<=h-bottom+.01);
  const q=Motion.toDesign(p.x+444*p.scale,p.y+1457*p.scale,p);assert(Math.abs(q.x-444)<1e-8&&Math.abs(q.y-1457)<1e-8);
}
for(const name of ['01-小摊首页.png','02-小摊装扮.png','03-家常菜谱.png','04-夜市活动.png']) assert(fs.existsSync(require('node:path').join(__dirname,'../reference/lobby-redesign-2026-11-14',name)));
for (const entry of require('../reference/lobby-redesign-2026-11-14/reference-manifest.json')) {
  const data=fs.readFileSync(require('node:path').join(__dirname,'../reference/lobby-redesign-2026-11-14',entry.file));
  assert.equal(require('node:crypto').createHash('sha256').update(data).digest('hex'),entry.sha256);
}
console.log('PASS real purchase/equip/once-only debit, paginated recipes, automatic event rewards, all screen transforms and four in-project references');

// Production boundaries: a screen is assembled from reusable components, not
// painted controls inside a page-sized background. Reference art is read-only.
const path=require('node:path');
const assetManifest=require('../shared/assets/lobby/manifest.json');
const assetRoot=path.join(__dirname,'../shared/assets/lobby');
assert.equal(assetManifest.version,4);
assert.equal(new Set(assetManifest.assets.map(a=>a.id)).size,assetManifest.assets.length);
for(const a of assetManifest.assets){
  assert(/^source\/(ui|scene|brand|icons)\//.test(a.file));
  assert(fs.existsSync(path.join(assetRoot,a.file)));assert(index[a.id]);
  assert(!/clean|whole.page|screenshot/i.test(a.file));
}
assert(!fs.existsSync(path.join(assetRoot,'source/decor-clean.png')));
assert(!Object.keys(index).some(id=>/^lobby-(home|decor|recipes|market|foods)(-|$)/.test(id)));
for(const f of ['../scripts/prepare-lobby-assets.py','../shared/rendering/lobby-ui.js','../shared/rendering/lobby-scene.js']){
  const source=fs.readFileSync(path.join(__dirname,f),'utf8');
  assert(!/decor-clean|home-clean|lobby-foods|reference\/lobby-redesign/.test(source));
}
// A partial final page creates exactly two recipe cards, not six prepainted slots.
rich.handle('tab','recipes');rich.page=3;render(rich);
assert.equal(rich.hits.filter(h=>h.action==='recipe').length,2);
const cardSlices=draws.filter(d=>d.id==='lobby-card'&&d.args.length===8&&d.args[5]>=497&&d.args[5]<1455);
assert.equal(cardSlices.length,18,'Two cards, each with nine independently scaled slices');
assert(!draws.some(d=>d.id==='d01'),'No baked first-page dish under the last page');

const Scene=require('../shared/rendering/lobby-scene.js');
const base=Object.fromEntries(C.slots.map(s=>[s,C.byTheme.base]));
function sceneTrace(appearance){
  const records=[],fillColors=[];
  const context=new Proxy({},{get(o,k){if(k==='drawImage')return(im,...args)=>records.push({id:im.id,args});if(/create.*Gradient/.test(k))return()=>({addColorStop(){}});if(k==='fill')return()=>fillColors.push(o.fillStyle);return k in o?o[k]:()=>{};}});
  const before=JSON.stringify(appearance);Scene.create(context,images).draw(appearance,[0,0,928,840]);assert.equal(JSON.stringify(appearance),before);
  assert(!records.some(d=>/^lobby-(card|button|tab|content-panel|brand|icon)/.test(d.id)),'Scene must contain no UI');
  return{records,fillColors};
}
const baseline=sceneTrace(base),replacements={lamp:['lobby-lamp-base','lobby-lamp-sea'],awning:['lobby-scene-awning-base','lobby-scene-awning-sea'],tables:['lobby-scene-stool-base','lobby-scene-stool-sea'],chef:['lobby-scene-chef-base','lobby-scene-chef-sea'],ornament:['stall-base-ornament','stall-sea-ornament'],menu:['stall-base-menu','stall-sea-menu'],wok:['stall-base-wok','stall-sea-wok'],background:['lobby-environment-night','stall-night-sea']};
for(const [slot,ids] of Object.entries(replacements)){
  const changed=sceneTrace(Object.assign({},base,{[slot]:C.byTheme.sea}));
  assert(changed.records.some(d=>d.id===ids[1]),'Missing actual replacement for '+slot);
  assert(!changed.records.some(d=>d.id===ids[0]),'Old slot remained underneath '+slot);
  assert.deepEqual(changed.records.filter(d=>!ids.includes(d.id)),baseline.records.filter(d=>!ids.includes(d.id)),'Changing '+slot+' changed unrelated scene sprites');
}
const plate=sceneTrace(Object.assign({},base,{plate:C.byTheme.sea}));
assert.deepEqual(plate.records,baseline.records);assert(plate.fillColors.includes(C.byTheme.sea.color));assert(!baseline.fillColors.includes(C.byTheme.sea.color));
console.log('PASS semantic production assets, partial-page card count, nine independent outfit slots and immutable UI-free scene composition');
