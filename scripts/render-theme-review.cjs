// Isolated visual review. Uses real engine wins, never reads/writes player saves.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const {App}=require('../shared/runtime/stall-app.js'),{createRenderer}=require('../shared/rendering/stall-scene.js');
const C=require('../shared/data/progression.js'),Scene=require('../shared/rendering/lobby-scene.js');
const recipes=require('../shared/data/recipes.json'),ingredients=require('../shared/data/ingredients.json'),layout=require('../shared/data/layout.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/lobby-themes');
fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath(path.join(root,'shared/assets/lobby/fonts/LanternBody.ttf'),'LanternBody');
(async()=>{
 const fixture=JSON.parse(fs.readFileSync(path.join(root,'previews/lobby-review-state.json')));
 const app=new App({recipes,layout,data:fixture.state,now:()=>fixture.now});
 // Existing 28-win review owns the nine warm parts and two earned autumn parts.
 // Continue its legitimate solution replays to fund isolated purchase review.
 for(let n=app.profile.nextLevel;n<=140;n++){
  app.start(n);const s=app.session;
  for(const id of s.config.solution){if(!s.pointer(s.engine.nodes.find(t=>t.id===id)))throw Error('Invalid route');s.advance(.3);if(s.engine.wok||s.engine.queue.length||s.engine.deliveries.length)s.advance(10);}
  s.advance(10);app.home();app.modal=null;
 }
 app.toast=null;fs.writeFileSync(path.join(out,'state.json'),JSON.stringify({now:fixture.now,state:app.profile.state}));
 let html=fs.readFileSync(path.join(root,'previews/lobby-review.html'),'utf8');
 html=html.replaceAll('../shared/','../../shared/').replaceAll('../platforms/','../../platforms/').replaceAll('../reference/','../../reference/');
 html=html.replace('lobby-review-state.json','state.json').replace('对照使用28次真实通关、9次购买得到的独立回放档案','对照使用140次真实通关、9次购买得到的独立回放档案');
 html=html.replace('const renderer=DapaidangStallScene','app.handle("tab","decor");app.handle("sub","themes");const renderer=DapaidangStallScene');
 fs.writeFileSync(path.join(out,'index.html'),html);
 const index=require('../shared/assets/runtime/asset-index.json');
 const images=Object.fromEntries(await Promise.all(Object.entries(index).map(async([id,a])=>[id,await loadImage(path.join(root,'shared/assets/runtime',path.basename(a.path)))])));
 const canvas=createCanvas(887,1774),renderer=createRenderer(canvas.getContext('2d'),images,{recipes,ingredients,layout,assets:index});
 app.handle('tab','decor');app.handle('sub','themes');
 for(const theme of ['warm','bamboo','sea','festival']){app.handle('theme',theme);renderer.draw(app.view(),{width:887,height:1774,dpr:1});fs.writeFileSync(path.join(out,theme+'.png'),canvas.toBuffer('image/png'));}
 app.handle('theme','festival');app.handle('buy-theme','festival');renderer.draw(app.view(),{width:887,height:1774,dpr:1});
 fs.writeFileSync(path.join(out,'purchase.png'),canvas.toBuffer('image/png'));
 const atlas=createCanvas(1600,1540),ctx=atlas.getContext('2d'),scene=Scene.create(ctx,images,index);
 ctx.fillStyle='#213b39';ctx.fillRect(0,0,1600,1540);
 for(const [col,theme]of ['warm','bamboo','sea','festival'].entries()){
  ctx.fillStyle='#fff1cc';ctx.font='500 28px LanternBody';ctx.textAlign='center';ctx.fillText(C.byTheme[theme].name,col*400+200,38);
  for(const [row,slot]of C.slots.entries()){
   const x=col*400+12,y=60+row*162;
   ctx.fillStyle='#ffe7be';ctx.fillRect(x,y,376,150);
   scene.item(slot,theme,[x+14,y+10,170,126]);ctx.fillStyle='#673713';ctx.font='500 25px LanternBody';ctx.textAlign='left';ctx.fillText(C.names[row],x+205,y+80);
  }
 }
 fs.writeFileSync(path.join(out,'components.png'),atlas.toBuffer('image/png'));
 console.log('Rendered 36 material thumbnails, four full sets, partial autumn purchase; '+app.profile.state.coins+' legitimately earned coins.');
})();
