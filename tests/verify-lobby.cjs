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
const fontCoverage=require('../shared/assets/lobby/fonts/coverage.json');
// A theme must change the actual environment, including small composed previews.
const environmentIds=['lobby-environment-night','stall-night-bamboo','stall-night-sea','stall-night'];
const environmentHashes=environmentIds.map(id=>require('node:crypto').createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'../shared/assets/runtime',require('node:path').basename(index[id].path)))).digest('hex'));
assert.equal(new Set(environmentHashes).size,4,'Each ordinary theme needs its own authored background');

const draws = [], labels = [], gradient = { addColorStop() {} };
const ctx = new Proxy({ globalAlpha: 1 }, { get: (o,k) => k in o ? o[k] : k === 'measureText' ? t => ({ width: String(t).length * 23 }) :
  k === 'fillText' ? t => labels.push(String(t)) : k === 'drawImage' ? (im, ...args) => draws.push({id:im.id,args}) : /create.*Gradient/.test(k) ? () => gradient : () => {} });
const images = Object.fromEntries(Object.entries(index).map(([id,a]) => [id, { id, width:a.width,height:a.height }]));
function grayCanvas(){
  const surface={},context={drawImage(im){surface.id=im.id+'-unlit';},getImageData(){return{data:new Uint8ClampedArray([255,0,0,191,0,255,0,0])};},putImageData(pixels){surface.pixels=Array.from(pixels.data);}};
  surface.getContext=()=>context;return surface;
}
const renderer = createRenderer(ctx,images,{recipes,ingredients,layout,assets:index,createCanvas:grayCanvas});
const geometry = {width:390,height:844,dpr:3,insets:{top:95,bottom:34},nativeCapsule:true};
const app = new App({recipes,layout,now:()=>Date.parse('2026-11-14T12:00:00+08:00')});
function render(a=app) { draws.length=0;labels.length=0;a.hits=renderer.draw(a.view(),geometry);for(const label of labels)for(const char of label)if(/[\u3400-\u9fff]/.test(char))for(const family of ['body'])assert(fontCoverage[family].includes(char),'Missing packaged '+family+' glyph: '+char);return a.hits; }
function tap(action,value,a=app) {
  render(a); const h=a.hits.find(h=>h.action===action&&(value===undefined||h.value===value));assert(h,'Missing live action '+action+' '+value);
  const v=renderer.coordinates(geometry,a.screen), x=h.rect[0]+h.rect[2]/2,y=h.rect[1]+h.rect[3]/2;
  assert(a.pointer(Motion.toDesign(v.x+x*v.scale,v.y+y*v.scale,v)));
}
render();assert(draws.some(d=>d.id==='lobby-scene-counter'));assert(labels.includes('0'));assert(labels.includes('第1关'));assert(!labels.includes('384'));
assert(!draws.some(d=>d.id==='lobby-header-awning'||d.id==='lobby-brand-logo'),'Home has the approved open night-sky header');assert(draws.some(d=>d.id==='lobby-brand-home'),'Independent gold wordmark is drawn over the pure environment');
for(const key of ['sound','settings','wallet'])assert(app.hits.some(h=>h.rect.every((n,i)=>n===Lobby.R.header[key][i])),'Home utilities retain their original compact positions: '+key);
for(const tab of ['decor','recipes','market','home']) {
  tap('tab',tab);render();assert(!draws.some(d=>d.id==='lobby-header-awning'||d.id==='lobby-brand-compact'),'No page uses the old canopy or compact brand');
  assert.equal(draws.some(d=>d.id==='lobby-brand-home'),tab==='home','Only the homepage shows the gold brand');
  assert.equal(app.hits.filter(h=>h.action==='tab'&&h.rect[1]===Lobby.R.footer.rect[1]&&['home','decor','recipes','market'].includes(h.value)).length,4);
  for(const h of app.hits){assert(h.rect.every(Number.isFinite));assert(h.rect[0]>=0&&h.rect[1]>=0);assert(h.rect[0]+h.rect[2]<=887.01&&h.rect[1]+h.rect[3]<=1774.01);}
}
tap('tab','recipes');render();assert(labels.includes('首通3关，打开小摊菜谱'));assert(!app.hits.some(h=>h.action==='recipe'));
tap('tab','market');render();assert(labels.includes('首通5关，参加夜市活动'));
tap('tab','decor');render();assert.deepEqual(app.hits.filter(h=>h.action==='sub').map(h=>h.value),['themes','rares']);
assert(app.hits.some(h=>h.action==='theme'&&h.value==='warm'));assert(labels.includes('已拥有')||labels.includes('使用中'));
assert(!app.hits.some(h=>h.action==='buy'||h.action==='category-page'),'No single-piece shop remains');
tap('theme','bamboo');const before=JSON.stringify(app.profile.state);render();assert(labels.some(t=>t.includes('首通1关解锁')));
tap('theme-details','bamboo');assert.equal(app.modal.type,'purchase-theme');tap('close');assert.equal(app.theme,'bamboo');
assert.equal(JSON.stringify(app.profile.state),before,'Trial and cancellation never alter wallet or inventory');
tap('sub','rares');render();assert(app.hits.some(h=>h.action==='rare-family'&&h.value==='star'));assert(!labels.includes('全部'));
assert.deepEqual(app.hits.filter(h=>h.action==='rare-mode').map(h=>h.value),['themes','owned']);
assert(!app.hits.some(h=>h.action==='category'),'Rare series are scrollable cards, not an ever-growing tab bar');
const trialBefore=JSON.stringify(app.profile.state);
tap('rare-family','star');render();assert.equal(app.previewFamily,'star');assert(C.slots.every(slot=>app.view().appearance[slot].id==='star'));
assert(!app.hits.some(h=>h.action==='equip-rare-family'),'Unowned full-family trials cannot equip');
assert.equal(JSON.stringify(app.profile.state),trialBefore,'Full rare trial cannot grant locked items, charge coins or save equipment');
const familyAppearance=JSON.stringify(app.view().appearance);
assert(!app.hits.some(h=>h.action==='item'||h.action==='equip-owned-rare'),'Theme cards do not expand a component shop');
tap('rare-family-details','star');assert.equal(app.modal.type,'rare-family-progress');render();assert(labels.includes('收集进度')||labels.some(t=>t.includes('收集进度')));tap('close');
assert.equal(JSON.stringify(app.view().appearance),familyAppearance);assert.equal(JSON.stringify(app.profile.state),trialBefore);
tap('rare-mode','owned');render();assert.equal(app.previewFamily,null);assert(labels.includes('暂未拥有珍藏部件'));assert(!app.hits.some(h=>h.action==='equip-owned-rare'));
app.handle('equip-owned-rare','star-lamp');assert.equal(JSON.stringify(app.profile.state),trialBefore,'Locked items never equip through the owned action');
tap('rare-mode','themes');tap('rare-family','harvest');assert(C.slots.every(slot=>app.view().appearance[slot].id==='harvest'));assert.equal(JSON.stringify(app.profile.state),trialBefore);
tap('tab','home');tap('map');render();assert(app.hits.every(h=>h.action!=='tab'));tap('close');
tap('ledger');render();assert(labels.some(t=>t.includes('小摊账本')));tap('close');
tap('settings');render();assert(labels.includes('设置')&&labels.includes('动效')&&!labels.some(s=>s.includes('素材尚未接入')));assert(app.hits.some(h=>h.role==='switch'&&h.checked===!app.profile.state.reducedMotion));const beforeMotion=app.profile.state.reducedMotion;tap('reduced');render();assert.equal(app.profile.state.reducedMotion,!beforeMotion);assert(app.hits.some(h=>h.role==='switch'&&h.checked===beforeMotion));tap('reduced');tap('close');
tap('play');assert.equal(app.screen,'game');render();
const gameEnvironment=draws.find(d=>['lobby-environment-night','stall-night-bamboo','stall-night-sea','stall-night'].includes(d.id)&&d.args.length===8);
assert(gameEnvironment,'Game draws the selected scene environment');assert.equal(gameEnvironment.args[1],0,'Game keeps the home background top origin');assert.equal(gameEnvironment.args[3],images[gameEnvironment.id].height,'Game uses the same full source as the homepage');assert.deepEqual(gameEnvironment.args.slice(-4),[0,0,887,1774],'Game reuses the full-height home camera under the game-width transform');assert.deepEqual(renderer.designSize('game'),{width:928,height:1695});
assert.deepEqual(renderer.designSize('home'),{width:887,height:1774});
console.log('PASS theme/rare navigation, locked trials, coherent cancellation, isolated inventory and modal input blocking');

const rich=new App({recipes,layout,now:()=>Date.parse('2026-12-12T12:00:00+08:00')});
for(let n=1;n<=45;n++){const id=rich.profile.begin(n);assert(rich.profile.settle(id,{level:n,revenue:800,dishes:recipes.map(r=>r.id)}));}
rich.handle('tab','decor');tap('theme','bamboo',rich);render(rich);
assert(draws.some(d=>d.id==='lobby-scene-chef-bamboo'));
const richBefore=JSON.stringify(rich.profile.state);tap('theme-details','bamboo',rich);tap('close',undefined,rich);assert.equal(JSON.stringify(rich.profile.state),richBefore);
tap('theme-details','bamboo',rich);const balance=rich.profile.state.coins;tap('confirm-buy-theme','bamboo',rich);
assert.equal(rich.profile.state.coins,balance-6000);assert(C.slots.every(slot=>rich.profile.state.equipped[slot]==='bamboo-'+slot));
rich.handle('confirm-buy-theme','bamboo');assert.equal(rich.profile.state.coins,balance-6000);
tap('sub','rares',rich);tap('rare-family','star',rich);tap('rare-mode','owned',rich);const wear=JSON.stringify(rich.profile.state.equipped),rareCoins=rich.profile.state.coins;
const beforeItemTrial=JSON.stringify(rich.profile.state);tap('preview-owned-rare','star-lamp',rich);
assert.equal(JSON.stringify(rich.profile.state),beforeItemTrial,'Owned card taps preview without saving');assert.equal(rich.view().appearance.lamp.id,'star');
tap('cancel-outfit-preview',undefined,rich);assert.equal(JSON.stringify(rich.profile.state),beforeItemTrial);assert.equal(JSON.stringify(rich.profile.state.equipped),wear);assert.equal(rich.view().appearance.lamp.id,'bamboo');
tap('preview-owned-rare','star-lamp',rich);tap('equip-owned-rare','star-lamp',rich);
assert.equal(rich.profile.state.equipped.lamp,'star-lamp');for(const slot of C.slots.filter(s=>s!=='lamp'))assert.equal(rich.profile.state.equipped[slot],JSON.parse(wear)[slot]);
assert.equal(rich.profile.state.coins,rareCoins);assert.equal(rich.modal,null);assert.equal(rich.previewFamily,null);assert.equal(rich.view().appearance.awning.id,'bamboo');
tap('preview-owned-rare','star-lamp',rich);render(rich);assert(rich.hits.some(h=>h.action==='restore-owned-rare'));assert(labels.includes('换下星河灯串'));assert(!labels.some(t=>t.includes('点击试穿')||t.includes('可免费换上')));const mixedBefore={...rich.profile.state.equipped};tap('restore-owned-rare','star-lamp',rich);assert.equal(rich.profile.state.equipped.lamp,'bamboo-lamp');assert.equal(rich.profile.state.coins,rareCoins);for(const slot of C.slots.filter(s=>s!=='lamp'))assert.equal(rich.profile.state.equipped[slot],mixedBefore[slot]);
const originalSave=rich.profile.options.save;rich.profile.options.save=()=>false;const failedBefore=JSON.stringify(rich.profile.state);tap('preview-owned-rare','star-awning',rich);assert.equal(JSON.stringify(rich.profile.state),failedBefore);tap('equip-owned-rare','star-awning',rich);assert.equal(JSON.stringify(rich.profile.state),failedBefore);assert.equal(rich.preview,'star-awning');rich.profile.options.save=originalSave;rich.toast=null;
tap('rare-mode','themes',rich);tap('rare-family','star',rich);render(rich);assert(rich.hits.some(h=>h.action==='equip-rare-family'));tap('equip-rare-family','star',rich);
assert(C.slots.every(slot=>rich.profile.state.equipped[slot]==='star-'+slot));
render(rich);assert(labels.includes('星河琉璃 · 使用中')&&!rich.hits.some(h=>h.action==='equip-rare-family'),'Rare set confirms the saved equipped state like regular sets and parts');
rich.handle('tab','home');const equippedAppearance=JSON.stringify(rich.view().appearance);tap('tab','decor',rich);render(rich);
assert.equal(rich.sub.decor,'themes');assert(!rich.view().themePreview);assert.equal(JSON.stringify(rich.view().appearance),equippedAppearance,'Opening wardrobe keeps the saved outfit until an explicit preview');
assert(labels.includes('点选套装，预览后再换上'));
rich.handle('tab','recipes');render(rich);assert(rich.hits.some(h=>h.action==='recipe'&&h.value==='d01'));assert(labels.includes('已做45份'));
const partial=new App({recipes,layout,data:{version:2,cleared:[1,2,3],dishes:{d01:2,d02:2,d06:5}}});partial.handle('tab','recipes');
for(let page=0;page<4;page++){
  partial.page=page;render(partial);
  for(const recipe of recipes.slice(page*6,page*6+6)){
    const count=partial.profile.state.dishes[recipe.id]||0,n=Number(recipe.id.slice(1))-1,id=n<6?'lobby-dish-'+n:recipe.id;
    assert(partial.hits.some(h=>h.action==='recipe'&&h.label===(recipe.displayName||recipe.name)+'，已做'+count+'份'));
    assert(draws.some(d=>d.id===id+(count?'':'-unlit')),'Every recipe keeps its own illustration, gray only before its first serving');
    assert(labels.includes('已做'+count+'份'));
  }
  assert(!labels.some(t=>['？','待上桌','未点亮的家常菜','首次做成后点亮'].includes(t)));
  if(!page)for(let n=0;n<6;n++)assert(draws.some(d=>d.id==='lobby-art-dish-'+n),'Unlit names keep the same lettering as lit names');
}
partial.handle('recipe','d03');render(partial);assert(labels.includes('双料香菇鸡'));assert(draws.some(d=>d.id==='lobby-dish-2-unlit'));
rich.handle('tab','market');render(rich);assert(!rich.hits.some(h=>/claim|领取/.test(h.action+' '+h.label)));
const savedBalance=rich.profile.state.coins;rich.profile.state.coins=1000000000;rich.handle('tab','home');render(rich);assert(labels.includes('10亿'));rich.profile.state.coins=savedBalance;
for(const [w,h,top,bottom] of [[320,568,20,0],[390,844,95,34],[1024,768,0,0]]) {
 const p=Lobby.viewport(w,h,{top,bottom});assert(p.x>=0&&p.y>=top);assert(p.x+887*p.scale<=w+.01&&p.y+1774*p.scale<=h-bottom+.01);
 const q=Motion.toDesign(p.x+444*p.scale,p.y+1457*p.scale,p);assert(Math.abs(q.x-444)<1e-8&&Math.abs(q.y-1457)<1e-8);
}
for(const entry of require('../reference/lobby-redesign-2026-11-14/reference-manifest.json')) {
 const data=fs.readFileSync(require('node:path').join(__dirname,'../reference/lobby-redesign-2026-11-14',entry.file));
 assert.equal(require('node:crypto').createHash('sha256').update(data).digest('hex'),entry.sha256);
}
rich.handle('tab','decor');rich.handle('sub','rares');rich.handle('rare-mode','owned');render(rich);
const outfitList=require('../shared/rendering/outfit-ui.js').ownedList,inside={x:outfitList[0]+150,y:outfitList[1]+100},profileBeforeScroll=JSON.stringify(rich.profile.state);
assert(rich.pointerStart(inside));rich.pointerMove({x:inside.x,y:inside.y-130});rich.pointerEnd({x:inside.x,y:inside.y-130});
assert.equal(rich.selection,null);assert.equal(rich.decorScroll,130);render(rich);
assert.equal(JSON.stringify(rich.profile.state),profileBeforeScroll);
for(const h of rich.hits.filter(h=>h.action==='preview-owned-rare'))assert(h.rect[1]>=outfitList[1]&&h.rect[1]+h.rect[3]<=outfitList[1]+outfitList[3]);
assert.equal(rich.scroll({x:444,y:1584},100),false);assert(rich.scroll(inside,1e6));render(rich);
assert.equal(rich.decorScroll,rich.hits.find(h=>h.action==='scroll-region').value.max);
assert(rich.hits.some(h=>h.action==='preview-owned-rare'&&h.value==='recipe-plate'),'Gift parts remain available in the owned groups');
// Future series use the same bounded vertical list, with no new filter tabs.
rich.handle('rare-mode','themes');const familyCount=C.rareFamilies.length;
for(let n=0;n<8;n++)C.rareFamilies.push({...C.rareFamilies[0],id:'future-'+n,name:'星河琉璃'});
render(rich);const seriesRegion=rich.hits.find(h=>h.action==='scroll-region');assert(seriesRegion.value.max>0);
rich.scroll({x:200,y:1100},1e6);render(rich);assert(rich.hits.some(h=>h.action==='rare-family'&&h.value==='future-7'));assert(!rich.hits.some(h=>h.action==='category'));
C.rareFamilies.splice(familyCount);rich.handle('rare-mode','owned');render(rich);
render(rich);rich.pointerStart(inside);rich.setHidden(true);rich.pointerEnd(inside);assert.equal(rich.gesture,null);rich.setHidden(false);
rich.handle('sub','themes');render(rich);assert.deepEqual(rich.hits.filter(h=>h.action==='theme').map(h=>h.value),['warm','bamboo','sea','festival']);
assert(!rich.hits.some(h=>h.action==='item'),'Theme cards contain sets, not component purchase offers');
console.log('PASS atomic set purchase, rare-only component equip, clipped scrolling, drag-vs-tap and portable viewport transforms');
const poor=new App({recipes,layout,data:{...rich.profile.state,coins:10000,owned:C.slots.map(s=>'warm-'+s),equipped:Object.fromEntries(C.slots.map(s=>[s,'warm-'+s]))}});
poor.handle('tab','decor');tap('theme','sea',poor);render(poor);
assert(labels.includes('购买海风 · 12,000金币'));assert(!labels.some(t=>t.includes('还差')));
tap('theme-details','sea',poor);render(poor);assert(labels.includes('12,000 金币'));assert(!labels.some(t=>t.includes('还差')||t.includes('购买后余额')));
assert(!poor.hits.some(h=>h.action==='confirm-buy-theme'),'Insufficient balance still shows full price but cannot confirm a purchase');
const poorBefore=JSON.stringify(poor.profile.state);poor.handle('confirm-buy-theme','sea');assert.equal(JSON.stringify(poor.profile.state),poorBefore);

// Production boundaries: a screen is assembled from reusable components, not
// painted controls inside a page-sized background. Reference art is read-only.
const path=require('node:path');
const assetManifest=require('../shared/assets/lobby/manifest.json');
const assetRoot=path.join(__dirname,'../shared/assets/lobby');
assert.equal(assetManifest.version,5);
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
const cardSlices=draws.filter(d=>d.id==='lobby-card'&&d.args.length===8&&d.args[5]>=Lobby.R.recipes.cards.y-1&&d.args[5]<1455);
assert.equal(cardSlices.length,18,'Two cards, each with nine independently scaled slices');
assert(!draws.some(d=>d.id==='d01'||d.id==='lobby-dish-0'),'No baked first-page dish under the last page');

const Scene=require('../shared/rendering/lobby-scene.js');
// Card illustrations fit their visible pixels, independent of scene hangers.
for(const theme of ['base','warm','bamboo','sea','festival'])for(const r of [[25,1049,140,140],[83,715,174,291],[65,1070,101,119]]){
 const painted=[],context={drawImage:(im,...args)=>painted.push(args)},thumbnails=Scene.create(context,images,index);thumbnails.item('lamp',theme,r);
 assert.equal(painted.length,1);const [x,y,w,h]=painted[0].slice(-4);
 assert(x>=r[0]-.01&&y>=r[1]-.01&&x+w<=r[0]+r[2]+.01&&y+h<=r[1]+r[3]+.01,'Lamp escapes its content box: '+theme);
 assert(Math.abs(y+h/2-r[1]-r[3]/2)<.01,'Lamp visible height must be centered in each card');
}
console.log('PASS every lamp thumbnail stays centered inside outfit and event card bounds');
const Components=require('../shared/rendering/lobby-components.js');
const grayDraws=[];let grayCreates=0;
const dishComponents=Components.create({drawImage:(im,...args)=>grayDraws.push({im,args})},images,'LanternBody',index,()=>{grayCreates++;return grayCanvas();});
for(const id of ['d01','d07']){
 const rect=[10,20,285,181],original=images[id==='d01'?'lobby-dish-0':id];
 dishComponents.dish(id,rect);const lit=grayDraws.at(-1);dishComponents.dish(id,rect,true);const gray=grayDraws.at(-1);
 assert.equal(lit.im,original);assert.deepEqual(gray.im.pixels,[76,76,76,191,150,150,150,0],'Grayscale preserves per-pixel alpha');
 assert.equal(gray.im.width,original.width);assert.equal(gray.im.height,original.height);assert.deepEqual(gray.args,lit.args,'Lit and unlit dishes use exactly the same frame and crop');
 dishComponents.dish(id,rect,true);assert.equal(grayDraws.at(-1).im,gray.im,'Gray dishes reuse the cached canvas');
 dishComponents.dish(id,rect);assert.equal(grayDraws.at(-1).im,original,'Lighting a recipe returns to its unchanged source image');
}
assert.equal(grayCreates,2,'Only the two requested illustrations allocate gray canvases');
function textPositions(fullMetrics){const positioned=[],context=new Proxy({},{get(o,k){if(k==='measureText')return()=>fullMetrics?{width:90,actualBoundingBoxAscent:999,actualBoundingBoxDescent:999}:{width:90};if(k==='fillText')return(t,x,y)=>positioned.push([t,x,y,o.textBaseline]);return k in o?o[k]:()=>{};}});const u=Components.create(context,images,'LanternBody',index);u.words('786',832,144,36);u.words('奖励：灯会棚布',336,885,28);u.words('已自动获得',802,885,23);return positioned;}
assert.deepEqual(textPositions(true),textPositions(false),'Native width-only metrics and browser ink metrics must use identical font geometry');
assert(textPositions(false).every(p=>p[3]==='alphabetic'&&Number.isFinite(p[2])));
for(const id of ['stall','chef','background','themes','recipes','achievements','photos','current','archive','daily'])for(const suffix of ['', '-selected']){
 const drawn=[],context={drawImage:(im,...args)=>drawn.push(args)},u=Components.create(context,images,'LanternBody',index),key='tab-'+id+suffix,b=index['lobby-art-'+key].contentBounds,im=images['lobby-art-'+key];
 u.art(key,200,300,39,'center',180,true);const [x,y,w,h]=drawn[0],scale=h/im.height;
 assert(Math.abs(y+(b[1]+b[3]/2)*scale-300)<.01,'Tab visible pixels must be centered, including transparent padding');
}
console.log('PASS platform-independent font baselines and all visible tab-label centers');
const base=Object.fromEntries(C.slots.map(s=>[s,C.byTheme.base]));
function sceneTrace(appearance){
  const records=[],fillColors=[];
  const context=new Proxy({},{get(o,k){if(k==='drawImage')return(im,...args)=>records.push({id:im.id,args});if(/create.*Gradient/.test(k))return()=>({addColorStop(){}});if(k==='fill')return()=>fillColors.push(o.fillStyle);return k in o?o[k]:()=>{};}});
  const before=JSON.stringify(appearance);Scene.create(context,images).draw(appearance,[0,0,928,840]);assert.equal(JSON.stringify(appearance),before);
  assert(!records.some(d=>/^lobby-(card|button|tab|content-panel|brand|icon)/.test(d.id)),'Scene must contain no UI');
  return{records,fillColors};
}
const baseline=sceneTrace(base),replacements={lamp:['lobby-bulb','lobby-lamp-sea'],awning:['lobby-scene-awning-base','lobby-scene-awning-sea'],tables:['lobby-scene-stool-base','lobby-scene-stool-sea','lobby-stool-right-base','lobby-stool-right-sea'],chef:['lobby-scene-chef-base','lobby-scene-chef-sea'],ornament:['lobby-plant-base','lobby-plant-sea'],menu:['stall-base-menu','stall-sea-menu'],wok:['lobby-wok-base','lobby-wok-sea'],plate:['lobby-plate-base','lobby-plate-sea'],background:['lobby-environment-night','stall-night-sea']};
for(const [slot,ids] of Object.entries(replacements)){
  const changed=sceneTrace(Object.assign({},base,{[slot]:C.byTheme.sea}));
  assert(changed.records.some(d=>d.id===ids[1]),'Missing actual replacement for '+slot);
  assert(!changed.records.some(d=>d.id===ids[0]),'Old slot remained underneath '+slot);
  assert.deepEqual(changed.records.filter(d=>!ids.includes(d.id)),baseline.records.filter(d=>!ids.includes(d.id)),'Changing '+slot+' changed unrelated scene sprites');
}
const plate=sceneTrace(Object.assign({},base,{plate:C.byTheme.sea}));
assert(plate.records.some(d=>d.id==='lobby-plate-sea'));assert(!plate.records.some(d=>d.id==='lobby-plate-base'));
console.log('PASS semantic production assets, partial-page card count, nine independent outfit slots and immutable UI-free scene composition');

// A skin replaces its registered node; it cannot rebuild or prune the base scene.
const compositor=Scene.create(ctx,images),baseLayers=compositor.layers(base);
assert.equal(new Set(baseLayers.map(n=>n.id)).size,baseLayers.length);
assert(baseLayers.every((n,i)=>!i||n.z>baseLayers[i-1].z));
for(const id of ['environment','counter-rear','chef','counter-front','awning','sign','lamp-left','lamp-right','prep-shelf','plate','prepared-dish','cooking-steam','stove-flame','wok','wok-food','menu','ornament','stool-left','stool-right'])assert(baseLayers.some(n=>n.id===id),'Missing reference-scene element: '+id);
assert.equal(baseLayers.find(n=>n.id==='prep-shelf').asset,'lobby-prep-rack','Complete original rack/steamer/vegetables stay in one fixed illustration group');
const homeLamp=Lobby.R.scene.lamps[0],rackLeft=baseLayers.find(n=>n.id==='prep-shelf').rect[0];
assert(homeLamp[0]+homeLamp[2]*.65<rackLeft+baseLayers.find(n=>n.id==='prep-shelf').rect[2]*.32,'The complete rack retains its left connection rail while its steamer clears the narrow tassel');
assert(homeLamp[2]>=94&&homeLamp[3]>=165,'Home lanterns retain the approved slightly reduced size');
assert.equal(Lobby.R.footer.rect[1]+Lobby.R.footer.rect[3],1774,'Navigation reaches the design canvas bottom');
assert(!Lobby.R.scene.previewRects,'Home and previews use one physical scene rig');
assert.equal(Lobby.R.scene.lamps[1][0]+homeLamp[0]+homeLamp[2],Lobby.R.scene.width,'Home lanterns remain symmetric');
for(const theme of ['warm','bamboo','sea','festival']){
 const drawn=sceneTrace(Object.assign({},base,{lamp:C.byTheme[theme]})).records.find(d=>d.id==='lobby-lamp-'+theme);
 assert(drawn.args.slice(-4)[2]>=Lobby.R.scene.chef[2]*.31,'Actual visible lamp width must stay large relative to the chef: '+theme);
}
const z=id=>baseLayers.find(n=>n.id===id).z;
assert(z('lamp-left')>z('prep-shelf')&&z('lamp-right')>z('prep-shelf'),'Prep props never paint over equipped lanterns');
assert(z('counter-rear')<z('chef')&&z('chef')<z('counter-front'),'Counter front must occlude the chef naturally');
assert(z('stove-flame')<z('wok')&&z('wok')<z('wok-food'));
for(const slot of C.slots){
  const changed=compositor.layers(Object.assign({},base,{[slot]:C.byTheme.sea}));
  assert.deepEqual(changed.map(n=>[n.id,n.z,n.rect,n.anchor]),baseLayers.map(n=>[n.id,n.z,n.rect,n.anchor]),'Skin changed placement/order for '+slot);
  assert.deepEqual(changed.filter(n=>n.slot!==slot),baseLayers.filter(n=>n.slot!==slot),'Skin removed or modified another layer: '+slot);
}
const missingSkin=Object.assign({},images);delete missingSkin['lobby-lamp-sea'];
const fallback=Scene.create(ctx,missingSkin).audit(Object.assign({},base,{lamp:C.byTheme.sea}));
assert.deepEqual(fallback.missing,[]);assert.deepEqual(fallback.fallbacks,['lamp-left','lamp-right']);
assert(fallback.layers.filter(n=>n.slot==='lamp').every(n=>n.asset==='lobby-bulb'));
const alternateSizes=Object.assign({},images,{'lobby-lamp-sea':{width:300,height:90},'lobby-scene-stool-sea':{width:80,height:240}});
const aligned=Scene.create(ctx,alternateSizes),lampRect=[159,257,74,110],stoolRect=[141,669,146,151];
const l0=aligned.registeredRect('lobby-lamp-base','lobby-lamp-base',lampRect,[.5,0]),l1=aligned.registeredRect('lobby-lamp-sea','lobby-lamp-base',lampRect,[.5,0]);
assert.equal(l0[1],l1[1]);assert.equal(l0[0]+l0[2]/2,l1[0]+l1[2]/2,'Lamp hanger moved with skin aspect ratio');
const s0=aligned.registeredRect('lobby-scene-stool-base','lobby-scene-stool-base',stoolRect,[.5,1]),s1=aligned.registeredRect('lobby-scene-stool-sea','lobby-scene-stool-base',stoolRect,[.5,1]);
assert.equal(s0[1]+s0[3],s1[1]+s1[3],'Stool floor contact moved with skin aspect ratio');
console.log('PASS complete base layer inventory, explicit occlusion, nine in-place skin replacements, missing-skin fallback and fixed hanger/floor anchors');
for(const theme of ['star','harvest'])for(const [slot,food] of [['wok','lobby-wok-food'],['plate','lobby-prepared-food']]){
 const trace=sceneTrace(Object.assign({},base,{[slot]:C.byTheme[theme]})).records,parent=trace.find(d=>d.id==='lobby-'+slot+'-'+theme).args.slice(-4),child=trace.find(d=>d.id===food).args.slice(-4);
 assert(child[0]>=parent[0]&&child[1]>=parent[1]&&child[0]+child[2]<=parent[0]+parent[2]&&child[1]+child[3]<=parent[1]+parent[3],'Food must fit inside the rendered rare '+slot+' for '+theme);
 assert(child[2]<parent[2]*.75,'Rare vessel rim remains visible');
}
console.log('PASS rare plate and wok food follow their actual vessel bounds');

const homeLayout=Lobby.R.home;
assert(homeLayout.wish[1]+homeLayout.wish[3]+24<=homeLayout.play[1],'Wish card and opening action retain a visible gap');
assert(homeLayout.decor[1]+homeLayout.decor[3]+24<=homeLayout.wish[1],'Decor button and wish card need a real gap, including their hit rectangles');
for(const t of ['warm','bamboo','sea','festival','star','harvest']){
 const roof=compositor.layers(Object.fromEntries(C.slots.map(slot=>[slot,C.byTheme[t]]))).find(n=>n.id==='awning');
 const r=compositor.registeredRect(roof.asset,roof.baseAsset,roof.rect,roof.anchor,false);
 assert(r[1]+r[3]>=Lobby.R.scene.counter[1],'No sky gap between any roof and its support posts: '+t);
}
console.log('PASS consistent headers/navigation, nonoverlapping home actions, durable single-part restoration and connected roofs');
