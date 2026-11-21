/* Reproducible visual QA from real gameplay and transactions, never player saves. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const {App}=require('../shared/runtime/stall-app.js'),{createRenderer}=require('../shared/rendering/stall-scene.js');
const recipes=require('../shared/data/recipes.json'),ingredients=require('../shared/data/ingredients.json'),layout=require('../shared/data/layout.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/retention-2026-11-21');
GlobalFonts.registerFromPath(path.join(root,'shared/assets/lobby/fonts/LanternBody.ttf'),'LanternBody');
GlobalFonts.registerFromPath(path.join(root,'shared/assets/lobby/fonts/LanternBody.ttf'),'PingFang SC');
(async()=>{
 const index=require('../shared/assets/runtime/asset-index.json'),images=Object.fromEntries(await Promise.all(Object.entries(index).map(async([id,a])=>[id,await loadImage(path.join(root,'shared/assets/runtime',path.basename(a.path)))])));
 const canvas=createCanvas(887,1774),renderer=createRenderer(canvas.getContext('2d'),images,{recipes,ingredients,layout,assets:index,lobbyBodyFont:'LanternBody',createCanvas:()=>createCanvas(1,1)});
 let now=Date.parse('2026-11-21T12:00:00+08:00'),saved;const app=new App({recipes,layout,now:()=>now,save:v=>(saved=v,true)}),shots=[];
 const shot=name=>{const size=renderer.designSize(app.screen);canvas.width=size.width;canvas.height=size.height;app.hits=renderer.draw(app.view(),{...size,dpr:1});fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png'));shots.push({name,image:canvas.toBuffer('image/png')});};
 const solve=()=>{for(const id of app.session.config.solution){const s=app.session;s.pointer(s.engine.nodes.find(n=>n.id===id));s.advance(.3);s.advance(3);}app.session.advance(5);};
 fs.mkdirSync(out,{recursive:true});shot('01-new-home');app.start(1);shot('02-first-lesson');solve();shot('03-first-gift');app.handle('first-reward');shot('04-gift-receipt');app.handle('tutorial');shot('05-lamp-trial');app.handle('equip-owned-rare','star-lamp');app.handle('tab','home');shot('06-first-change');app.handle('daily-menu');shot('07-daily-menu');app.handle('daily-play',0);shot('08-short-board');solve();shot('09-daily-receipt');app.home();app.start(2);const first=app.session.config.solution[0];app.session.pointer(app.session.engine.nodes.find(n=>n.id===first));app.session.advance(.16);app.home(true);shot('10-saved-run');
 const recovered=new App({recipes,layout,data:saved,now:()=>now,save:()=>true});if(!recovered.resume())throw Error('Resume failed');
 const sheet=createCanvas(5*310,2*656),c=sheet.getContext('2d');c.fillStyle='#193536';c.fillRect(0,0,sheet.width,sheet.height);
 for(let i=0;i<shots.length;i++){const im=await loadImage(shots[i].image),x=i%5*310,y=Math.floor(i/5)*656;c.drawImage(im,x+8,y+5,294,588);c.font='19px sans-serif';c.fillStyle='#fff0c5';c.fillText(shots[i].name,x+12,y+625);}
 fs.writeFileSync(path.join(out,'overview.png'),sheet.toBuffer('image/png'));
 console.log(JSON.stringify({out,shots:shots.length,resumed:recovered.session.engine.incoming.length===1},null,2));
})();
