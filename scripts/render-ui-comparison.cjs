/* Optional geometry/primitive comparison; the sibling handoff is only a QA input. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const font=process.env.LANTERN_FONT||'/System/Library/Fonts/Hiragino Sans GB.ttc';
if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'PingFang SC');
const reference=process.env.LANTERN_REFERENCE_DIR||path.resolve(root,'../dapaidang-handoff-v12-complete');
const ref=require(path.join(reference,'src/renderer.js'));
const {Session}=require(path.join(root,'shared/runtime/game-session.js'));
const {Engine}=require(path.join(root,'shared/core/game-core.js'));
const {createRenderer}=require(path.join(root,'shared/rendering/scene.js'));
const recipes=require(path.join(root,'shared/data/recipes.json')),ingredients=require(path.join(root,'shared/data/ingredients.json')),layout=require(path.join(root,'shared/data/layout.json')),ui=require(path.join(root,'shared/data/game-ui.js'));
(async()=>{
 const index=require(path.join(root,'shared/assets/runtime/asset-index.json'));
 const imgs=Object.fromEntries(await Promise.all(Object.entries(index).map(async([id,a])=>[id,await loadImage(path.join(root,'shared/assets/runtime',path.basename(a.path)))])));
 const mapped={...imgs,background:imgs.scene};
 for(const i of ingredients)mapped['ingredient-'+i.id]=imgs[i.id];
 const meta=ingredients.map(i=>({...i,bbox:{x:0,y:0,w:imgs[i.id].width,h:imgs[i.id].height}}));
 const ca=createCanvas(928,1695),cb=createCanvas(928,1695);
 const original=ref.createOriginalStyleRenderer(ca.getContext('2d'),mapped,ui,meta);
 const foods=['shiitake','chicken','tomato','egg','pepper','pork','scallion','shiitake','tomato','chicken','pepper','egg','pork','scallion','wood_ear','chicken','tomato','scallion','pepper','egg','shiitake','pork','egg','chicken','tomato'];
 const lower=[0,2,3,5,7,9,10,12,13,15,17,19,20,22,23];
 function node(cell,food,layer,id){return{id,food,layer,x:63+cell%5*153.6+145.6/2+(layer?0:32),y:564+Math.floor(cell/5)*154+137.511111/2-(layer?0:24),w:145.6,h:137.511111};}
 const nodes=[...lower.map((cell,i)=>node(cell,foods[(i+5)%25],0,'under-'+i)),...foods.map((f,i)=>node(i,f,1,'top-'+i))];
 const session=new Session({recipes,layout});session.engine=new Engine({recipes,tiles:nodes,initialRecipes:['d11','d01','d02']});
 session.engine.orders[0].recipe.ingredients=['chicken','shiitake','scallion'];
 original.scene({income:0,target:300,now:0});createRenderer(cb.getContext('2d'),imgs,{recipes,ingredients,layout}).draw(session.view(),{width:928,height:1695,dpr:1});
 const a=ca.getContext('2d').getImageData(0,0,928,1695).data,b=cb.getContext('2d').getImageData(0,0,928,1695).data;
 let err=0,n=0,large=0;
 for(let y=0;y<1695;y++)for(let x=0;x<928;x++){if(x>=330&&x<600&&y>=150&&y<225)continue;for(let ch=0;ch<3;ch++){const d=Math.abs(a[(y*928+x)*4+ch]-b[(y*928+x)*4+ch]);err+=d;n++;if(d>15)large++;}}
 console.log({meanChannelDifference:err/n,channelsOver15:large/n});
 const out=createCanvas(928,882),c=out.getContext('2d');c.fillStyle='#fff6e5';c.fillRect(0,0,928,882);c.fillStyle='#6b3b22';c.font='700 20px PingFang SC';c.fillText('交付版组件',16,25);c.fillText('项目共享渲染',480,25);c.drawImage(ca,0,34,464,847.5);c.drawImage(cb,464,34,464,847.5);
 fs.writeFileSync(path.join(root,'previews/ui-v12-comparison.png'),out.toBuffer('image/png'));
 fs.writeFileSync(path.join(root,'previews/ui-v12-comparison.json'),JSON.stringify({scope:'Same runtime images and font, approved static fixture. Income region excluded because game has no target.',meanChannelDifference:err/n,channelsOver15:large/n},null,2)+'\n');
})();
