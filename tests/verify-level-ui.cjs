'use strict';
const assert=require('node:assert/strict'),C=require('../scripts/level-tools/common.cjs');
const M=require('../shared/core/motion.js'),Scene=require('../shared/rendering/scene.js'),Geometry=require('../shared/core/board-geometry.js');
const {Session}=require('../shared/runtime/game-session.js'),ingredients=require('../shared/data/ingredients.json');
const assetIndex=require('../shared/assets/runtime/asset-index.json');
const images=Object.fromEntries(Object.keys(assetIndex).map(id=>[id,{id,width:160,height:160}]));
function recorder(){
 let matrix=[1,0,0,1,0,0],stack=[],draws=[];
 const transform=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 const ctx=new Proxy({globalAlpha:1},{get:(t,k)=>k in t?t[k]:
  k==='save'?()=>stack.push({matrix:matrix.slice(),alpha:t.globalAlpha}):
  k==='restore'?()=>{const s=stack.pop();matrix=s.matrix;t.globalAlpha=s.alpha;}:
  k==='setTransform'?(...v)=>{matrix=v;}:
  k==='translate'?(x,y)=>{matrix=transform(matrix,[1,0,0,1,x,y]);}:
  k==='scale'?(x,y)=>{matrix=transform(matrix,[x,0,0,y,0,0]);}:
  k==='rotate'?r=>{matrix=transform(matrix,[Math.cos(r),Math.sin(r),-Math.sin(r),Math.cos(r),0,0]);}:
  k==='measureText'?s=>({width:String(s).length*25}):
  k==='drawImage'?(image,...args)=>{const a=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],image.width,image.height];const x=a[0]+a[2]/2,y=a[1]+a[3]/2;draws.push({id:image.id,x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5],alpha:t.globalAlpha});}:
  /create.*Gradient/.test(k)?()=>({addColorStop(){}}):()=>{}});
 return{ctx,draws};
}
let checks=0;
for(const level of [1,2,3,4,5,6,20,41,64])for(const geometry of [{width:320,height:568,dpr:1,insets:{top:20,bottom:0}},{width:390,height:844,dpr:1,insets:{top:95,bottom:34}},{width:928,height:1695,dpr:1}]){
 const s=new Session({recipes:C.recipes,layout:C.layout,level}),r=recorder(),renderer=Scene.createRenderer(r.ctx,images,{recipes:C.recipes,ingredients,layout:C.layout});
 renderer.draw(s.view(),geometry);
 const viewport=M.viewport(geometry.width,geometry.height,geometry.insets);
 const board=r.draws.filter(d=>ingredients.some(f=>d.id===f.id||d.id===f.id+'-covered')).map(d=>({...d,p:M.toDesign(d.x,d.y,viewport)})).filter(d=>d.p.y>=536&&d.p.y<=1327);
 const tiles=s.engine.nodes.slice().sort(Geometry.paintOrder);
 assert.equal(board.length,tiles.length,'Every actual board tile is drawn once');
 board.forEach((d,i)=>{const t=tiles[i];assert.equal(d.id,t.food+(s.engine.available(t.id)?'':'-covered'));assert(Math.abs(d.p.x-t.x)<t.w/2);assert(Math.abs(d.p.y-t.y)<t.h/2);assert(Number.isFinite(d.x)&&Number.isFinite(d.y));});
 const free=s.engine.nodes.find(n=>s.engine.available(n.id));
 const screen={x:viewport.x+free.x*viewport.scale,y:viewport.y+free.y*viewport.scale};
 assert(s.pointer(M.toDesign(screen.x,screen.y,viewport)));assert(s.engine.nodes.find(n=>n.id===free.id).removed);
 const notFree=s.engine.nodes.find(n=>!n.removed&&!s.engine.available(n.id));
 if(notFree){s.pointer(notFree);assert.equal(s.engine.nodes.find(n=>n.id===notFree.id).removed,false,'A covered card cannot be picked through its upper card');}
 checks++;
}
console.log('PASS '+checks+' real shared-renderer cases: six silhouettes, layer paint order, original/covered sprites, finite geometry and inverse touch transforms');
