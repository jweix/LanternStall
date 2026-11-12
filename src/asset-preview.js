(()=>{
 const ui=new Image(),art=new Image(),ingredientAtlas=new Image(),dishImages={};ingredientAtlas.src=window.PREVIEW_ASSETS.atlas;for(const[id,asset]of Object.entries(window.PREVIEW_ASSETS.dishes)){const image=new Image();image.src=asset.src;dishImages[id]=image;}ui.src=window.APPROVED_ASSETS.ui;art.src=window.APPROVED_ASSETS.art;
 function createDesign(root,design){

 const canvas=root.querySelector('canvas'),c=canvas.getContext('2d');
 const caption=root.querySelector('.oc-caption'),pause=root.querySelector('[data-action="pause"]');

 const W=928,H=1695,TOTAL=13.2,BASE=128,TARGET=300,STOCK=40,DEPART=.62,MENU_REVEAL=.16,FLIGHT=DEPART+MENU_REVEAL;
 const ff='"HanziPen SC","Kaiti SC","STKaiti","PingFang SC",sans-serif';
 const names={mushroom:'香菇',chicken:'鸡肉',tomato:'番茄',egg:'鸡蛋',pepper:'青椒',pork:'肉片',scallion:'葱'};
 const first=['mushroom','chicken','tomato','egg','pepper','pork','scallion','mushroom','tomato','chicken','pepper','egg','pork','scallion','mushroom','chicken','tomato','scallion','pepper','egg','mushroom','pork','egg','chicken','tomato','egg','pepper','chicken','mushroom','scallion'];
 const crop={"tomato": [0, 0, 144, 136], "egg": [144, 0, 144, 136], "pepper": [288, 0, 144, 136], "pork": [432, 0, 144, 136], "chicken": [576, 0, 144, 136], "shiitake": [720, 0, 144, 136], "scallion": [864, 0, 144, 136], "broccoli": [0, 136, 144, 136], "shrimp": [144, 136, 144, 136], "beef": [288, 136, 144, 136], "celery": [432, 136, 144, 136], "tofu": [576, 136, 144, 136], "carrot": [720, 136, 144, 136], "wood_ear": [864, 136, 144, 136], "mushroom": [720, 0, 144, 136]};
 const events=[
  {cell:1,food:'chicken',start:.70,end:1.03,slot:0,dish:0},
  {cell:0,food:'mushroom',start:1.10,end:1.43,slot:1,dish:0},
  {cell:6,food:'scallion',start:1.52,end:1.85,slot:2,dish:0},
  {cell:2,food:'tomato',start:2.20,end:2.43,slot:0,dish:1},
  {cell:3,food:'egg',start:2.46,end:2.69,slot:1,dish:1},
  {cell:4,food:'pepper',start:4.20,end:4.50,slot:0,dish:2},
  {cell:5,food:'pork',start:4.60,end:4.90,slot:1,dish:2},
  {cell:0,layer:0,food:'chicken',start:6.00,end:6.30,slot:0,dish:3},
  {cell:14,food:'mushroom',start:6.40,end:6.70,slot:1,dish:3},
  {cell:13,food:'scallion',start:6.80,end:7.10,slot:2,dish:3}
 ];
 const dishes=[
  {id:'chicken',name:'香菇鸡丁',table:'01',slot:0,base:42,match:1.94,load:2.00,stir:2.28,pour:2.88,fly:3.20,ing:['chicken','mushroom','scallion']},
  {id:'egg',name:'番茄炒蛋',table:'02',slot:1,base:32,match:2.78,load:3.20,stir:3.44,pour:3.94,fly:4.26,ing:['tomato','egg']},
  {id:'pork',name:'青椒肉片',table:'03',slot:2,base:36,match:4.98,load:5.04,stir:5.30,pour:5.80,fly:6.12,ing:['pepper','pork']},
  {id:'chicken',name:'香菇鸡丁',table:'04',slot:0,base:42,match:7.18,load:7.24,stir:7.52,pour:8.12,fly:8.44,ing:['chicken','mushroom','scallion']}
 ].map(d=>({...d,mult:d.ing.length===3?1.5:1,pay:d.base*(d.ing.length===3?1.5:1),arrive:d.fly+FLIGHT,leave:d.fly+FLIGHT,next:d.fly+FLIGHT+.16}));
 const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
 const ease=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
 const saved=window.openai?.widgetState;let cols=5;
 let previewStopAt=TOTAL;let t=0,playing=design==='plate'&&!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false,last=performance.now(),clicks=0,lastCaption='',taps=[],sprites={},softSprites={},tileBgs={},scene;
 function rr(x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
 function fill(x,y,w,h,color,r=0){c.fillStyle=color;if(r){rr(x,y,w,h,r);c.fill();}else c.fillRect(x,y,w,h);}
 function ell(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();}
 function txt(s,x,y,size=30,color='#61331c',align='left',weight=600){size=Math.max(size,32);c.font=weight+' '+size+'px '+ff;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
 function stroke(x1,y1,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 function panel(x,y,w,h,r,kind='cream'){
  c.save();c.shadowColor='#51230c55';c.shadowBlur=10;c.shadowOffsetY=6;
  const g=c.createLinearGradient(x,y,x,y+h);
  if(kind==='wood'){g.addColorStop(0,'#e4aa67');g.addColorStop(.18,'#d99955');g.addColorStop(.8,'#b97439');g.addColorStop(1,'#a65f2b');}
  else{g.addColorStop(0,'#fff5db');g.addColorStop(.25,'#ffebc8');g.addColorStop(.8,'#f5d7a9');g.addColorStop(1,'#e0ae73');}
  fill(x,y,w,h,g,r);c.shadowColor='transparent';c.strokeStyle=kind==='wood'?'#f8cf94':'#fff7df';c.lineWidth=3;rr(x+2,y+2,w-4,h-6,r-2);c.stroke();
  c.restore();
 }
 function wood(x,y,w,h){
  const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#b97a43');g.addColorStop(.5,'#c4864b');g.addColorStop(1,'#a46230');fill(x,y,w,h,g,20);
  c.save();rr(x,y,w,h,20);c.clip();for(let i=0;i<47;i++){c.strokeStyle=i%3?'#e3a66b20':'#6b3a1d15';c.lineWidth=.8+(i%3)*.3;c.beginPath();const yy=y+3+i*h/47;c.moveTo(x,yy);c.bezierCurveTo(x+w*.35,yy+Math.sin(i)*5,x+w*.7,yy-4,x+w,yy+2);c.stroke();}c.restore();
 }
 function tileMetrics(w,h){
  const scale=Math.min(w/144,h/136),nativeH=136*scale,extra=Math.max(0,h-nativeH);
  return{scaleX:scale,scaleY:scale,contentWidth:144*scale,contentHeight:nativeH,fillTop:extra/2,fillBottom:extra/2,sourceWidth:144,sourceHeight:136};
 }
 function tile(id,x,y,w=144,h=136,alpha=1,rotation=0){
  const m=tileMetrics(w,h),s=m.scaleX,sw=144,sh=136;
  c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha*=alpha;rr(-w/2,-h/2,w,h,Math.min(w,h)*.18);c.clip();
  const bg=c.createLinearGradient(0,-h/2,0,h/2);bg.addColorStop(0,'#fff2d1');bg.addColorStop(.55,'#ffebc7');bg.addColorStop(1,'#eed1a0');fill(-w/2,-h/2,w,h,bg);
  if(m.fillTop<.02&&Math.abs(m.contentWidth-w)<.02){
   c.drawImage(sprites[id],-m.contentWidth/2,-m.contentHeight/2,m.contentWidth,m.contentHeight);
  }else{
   const colors=tileBgs[id]||{top:'#fff0cd',bottom:'#f3d7a9'},edge=c.createLinearGradient(0,-h/2,0,h/2);edge.addColorStop(0,colors.top);edge.addColorStop(.8,colors.bottom);edge.addColorStop(1,'#e5bf86');fill(-w/2,-h/2,w,h,edge,Math.min(w,h)*.18);
   c.strokeStyle='#fff2d6';c.lineWidth=1.5;rr(-w/2+1,-h/2+1,w-2,h-3,Math.min(w,h)*.17);c.stroke();
   c.drawImage(softSprites[id],-128*s/2,-118*s/2,128*s,118*s);
  }
  c.restore();
 }
 function icon(id,x,y,size=65){
  const sw=128,sh=118,scale=size/sw,w=sw*scale,h=sh*scale;
  c.save();c.translate(x,y);rr(-w/2,-h/2,w,h,13);c.clip();c.drawImage(sprites[id],8,9,sw,sh,-w/2,-h/2,w,h);c.restore();
 }
 function recipeToken(id,x,y,size,done=false){icon(id,x,y,size);if(done)check(x+size*.32,y+size*.31,.63);}

 function check(x,y,scale=.7){c.save();c.translate(x,y);c.scale(scale,scale);ell(0,0,15,15,'#72a33c');c.strokeStyle='#fff7dc';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(-7,0);c.lineTo(-2,5);c.lineTo(8,-6);c.stroke();c.restore();}
 const artRects={wok:[.01,.078,.48,.365],chicken:[.50,.115,.49,.33],egg:[0,.58,.49,.36],pork:[.50,.58,.50,.36]};
 function artPart(id,x,y,w,angle=0,alpha=1){
  const r=artRects[id],aw=art.naturalWidth,ah=art.naturalHeight,h=id==='wok'?w*.50:w*.49;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;c.drawImage(art,r[0]*aw,r[1]*ah,r[2]*aw,r[3]*ah,-w/2,-h/2,w,h);c.restore();
 }
 function plate(id,x,y,w=165,alpha=1){if(dishImages[id]){const b=window.PREVIEW_ASSETS.dishes[id].bbox;const scale=Math.min(w/b.w,w*.52/b.h);c.save();c.globalAlpha*=alpha;c.drawImage(dishImages[id],b.x,b.y,b.w,b.h,x-b.w*scale/2,y-b.h*scale/2,b.w*scale,b.h*scale);c.restore();}else artPart(id,x,y,w,0,alpha);}
 const BOARD={frontLeft:63,frontTop:564,frontSpan:760,gapX:8,rowStep:154,tileH:137.51111111111112,underDX:32,underDY:-24};
 function geom(cell){const w=(BOARD.frontSpan-4*BOARD.gapX)/5;return{x:BOARD.frontLeft+(cell%5)*(w+BOARD.gapX)+w/2,y:BOARD.frontTop+Math.floor(cell/5)*BOARD.rowStep+BOARD.tileH/2,w,h:BOARD.tileH};}
 const lowerCells=[0,2,3,5,7,9,10,12,13,15,17,19,20,22,23];
 const lowerFood=['chicken','mushroom','egg','tomato','pepper','pork','scallion','egg','chicken','mushroom','tomato','pepper','pork','egg','scallion'];
 const nodes=[
  ...lowerCells.map((baseCell,i)=>{const g=geom(baseCell);return{id:'under-'+i,cell:i,baseCell,layer:0,food:lowerFood[i],...g,x:g.x+BOARD.underDX,y:g.y+BOARD.underDY};}),
  ...Array.from({length:25},(_,cell)=>({id:'top-'+cell,cell,layer:1,food:first[cell],...geom(cell)}))
 ];
 let hitKey='';
 function eventNode(e){return nodes.find(n=>n.cell===e.cell&&n.layer===(e.layer===0?0:1));}
 function eventGeom(e){return eventNode(e);}
 function takenAt(n){const e=events.find(e=>eventNode(e).id===n.id);return e?e.start:Infinity;}
 function overlaps(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2-.5&&Math.abs(a.y-b.y)<(a.h+b.h)/2-.5;}
 function coverNodes(n){return n.layer===1?[]:nodes.filter(top=>top.layer>n.layer&&overlaps(n,top));}
 function revealAt(n){return n.layer===1?0:Math.max(0,...coverNodes(n).map(takenAt));}
 function selectable(n,now){return now<takenAt(n)&&now>=revealAt(n);}
 function layerSummary(now){return nodes.map(n=>({id:n.id,food:n.food,layer:n.layer,cell:n.cell,x:n.x,y:n.y,w:n.w,h:n.h,removed:now>=takenAt(n),selectable:selectable(n,now),blockedBy:coverNodes(n).filter(top=>now<takenAt(top)).map(top=>top.id),revealAt:Number.isFinite(revealAt(n))?revealAt(n):null}));}
 function board(now){
  wood(30,476,867,855);wood(53,534,822,795);
  panel(70,487,218,47,23);txt('食材台',179,510,36,'#60331b','center',700);
  txt('余 '+remaining(now)+' 份',454,511,30,'#70421d','center');panel(638,487,193,45,22);txt('三料菜 ×1.5',734.5,510,27,'#8d4c20','center');
  c.save();rr(55,536,818,791,20);c.clip();
  for(const n of nodes){
   if(now>=takenAt(n))continue;
   const free=selectable(n,now),since=now-revealAt(n),p=free?ease(since/.25):0;
   c.save();
   if(n.layer===0){c.filter=free?'none':'saturate(.38) brightness(.67)';c.globalAlpha=free?1:.92;}
   c.shadowColor=n.layer===1?'#69361248':'#512c1244';c.shadowBlur=n.layer===1?5:3;c.shadowOffsetX=2;c.shadowOffsetY=n.layer===1?5:3;
   tile(n.food,n.x,n.y,n.w,n.h);
   c.restore();
   if(n.layer===0&&free&&since>=0&&since<.65){
    c.save();c.globalAlpha=Math.sin(clamp(since/.65)*Math.PI)*.65;c.strokeStyle='#ffe4a0';c.lineWidth=3;rr(n.x-n.w/2+2,n.y-n.h/2+2,n.w-4,n.h-4,23);c.stroke();c.restore();
   }
  }
  c.restore();makeHits(now);
 }
 function makeHits(now=t){
  const visible=nodes.filter(n=>selectable(n,now)),key=visible.map(n=>n.id).join(',');if(hitKey===key)return;hitKey=key;
  const layer=root.querySelector('.oc-hit-layer');layer.replaceChildren();
  for(const n of visible){
   const b=document.createElement('button');b.type='button';b.className='oc-food-hit';b.dataset.cell=String(n.cell);b.dataset.layer=String(n.layer);b.dataset.node=n.id;
   b.setAttribute('aria-label',names[n.food]+(n.layer===0?'，下层已露出':'，上层')+'，点击验证');
   b.style.left=((n.x-n.w/2)/W*100)+'%';b.style.top=((n.y-n.h/2)/H*100)+'%';b.style.width=(n.w/W*100)+'%';b.style.height=(n.h/H*100)+'%';
   b.addEventListener('click',()=>{clicks++;taps.push({x:n.x,y:n.y,at:performance.now()});draw(t);});layer.append(b);
  }
 }

 function remaining(now){return STOCK-events.filter(e=>now>=e.start).length;}
 function revenue(now){return (nextPreview?0:BASE)+dishes.filter(d=>now>=d.arrive).reduce((n,d)=>n+d.pay,0);}
 function buffer(now){return events.filter(e=>now>=e.end&&now<dishes[e.dish].match);}
 const DELIVERY={hold:0,endY:1244,fadeStart:.40,menuEntry:.16,servedHold:0,cardExit:.16,newEntry:.12};
 function getPose(d,now){
  const elapsed=clamp((now-d.fly)/FLIGHT)*FLIGHT,start={x:837,y:1484},target={x:200+d.slot*264,y:382};
  if(elapsed<DEPART){
   const u=clamp(elapsed/DEPART),y=mix(start.y,DELIVERY.endY,u),along=(start.y-y)/(start.y-target.y),x=mix(start.x,target.x,along),f=clamp((u-DELIVERY.fadeStart)/(1-DELIVERY.fadeStart));
   return{x,y,w:mix(145,15,f),alpha:1-f,start,target,elapsed,phase:'departure'};
  }
  const u=clamp((elapsed-DEPART)/MENU_REVEAL),p=ease(u),entry={x:target.x+24,y:target.y+48};
  return{x:mix(entry.x,target.x,p),y:mix(entry.y,target.y,p),w:mix(110,180,p),alpha:ease((elapsed-DEPART)/.07),start,target,entry,elapsed,phase:'menu'};
 }
 function orderSnapshot(now){
  return [0,1,2].map(slot=>{
   const d=activeOrder(slot,now),original=dishes[slot];
   if(slot>0&&now>=original.next)return{slot,table:slot===1?'05':'06',state:'collecting',acceptsIngredients:true};
   return{slot,table:d.table,state:now>=d.leave&&now<d.next?'exiting':orderPhase(d,now),acceptsIngredients:now<d.match};
  });
 }

 function build(){
  for(const [id,r] of Object.entries(crop)){const s=document.createElement('canvas');s.width=144;s.height=136;s.getContext('2d').drawImage(ingredientAtlas,...r,0,0,144,136);sprites[id]=s;
   const raw=s.getContext('2d'),sample=y=>{const rows=[16,22,122,128].map(x=>Array.from(raw.getImageData(x,y,1,1).data)).filter(v=>v[0]>220&&v[1]>180&&v[2]>120);if(!rows.length)return y<60?'#fff0cd':'#f3d7a9';return 'rgb('+[0,1,2].map(k=>Math.round(rows.reduce((sum,v)=>sum+v[k],0)/rows.length)).join(',')+')';};tileBgs[id]={top:sample(16),bottom:sample(117)};
   const soft=document.createElement('canvas');soft.width=128;soft.height=118;const q=soft.getContext('2d');q.drawImage(s,8,9,128,118,0,0,128,118);q.globalCompositeOperation='destination-in';
   const mx=q.createLinearGradient(0,0,128,0);mx.addColorStop(0,'#fff0');mx.addColorStop(8/128,'#ffff');mx.addColorStop(120/128,'#ffff');mx.addColorStop(1,'#fff0');q.fillStyle=mx;q.fillRect(0,0,128,118);
   const my=q.createLinearGradient(0,0,0,118);my.addColorStop(0,'#fff0');my.addColorStop(8/118,'#ffff');my.addColorStop(110/118,'#ffff');my.addColorStop(1,'#fff0');q.fillStyle=my;q.fillRect(0,0,128,118);softSprites[id]=soft;
  }
  scene=document.createElement('canvas');scene.width=W;scene.height=H;const b=scene.getContext('2d');b.drawImage(ui,0,0);
  ready=true;makeHits();draw(0);
 }
 const COMPACT={orderY:244,freedHeight:62,headerBadge:{x:350,y:163,w:228,h:52}};
 function hud(now){
  const b=COMPACT.headerBadge;
  const bump=dishes.reduce((a,d)=>{const age=now-d.arrive;return Math.max(a,age>=0&&age<.42?Math.sin(age/.42*Math.PI):0);},0);
  c.save();c.translate(b.x+b.w/2,b.y+b.h/2);c.scale(1+.018*bump,1+.018*bump);c.translate(-b.x-b.w/2,-b.y-b.h/2);
  panel(b.x,b.y,b.w,b.h,23,'wood');smallText('收入',b.x+18,b.y+b.h/2,32,'#60311b','left');
  smallText(revenue(now)+'/'+currentTarget(),b.x+b.w-15,b.y+b.h/2,34,bump>.2?'#7c3a1b':'#542913','right',700);
  c.restore();
 }
 function drawMenuCard(d,now,x,y,w,h,phase,slot){
  const age=now-d.match;
  if(designOptions.arrivalGlow&&age>=0&&age<.5){c.save();c.shadowColor='#ffd170';c.shadowBlur=14*Math.sin(age/.5*Math.PI);fill(x,y,w,h,'#ffe5ac',designOptions.roundness);c.restore();}
  panel(x,y,w,h,designOptions.roundness);
  if(slot===0){c.strokeStyle='#ed9368';c.lineWidth=4;rr(x+2,y+2,w-4,h-4,designOptions.roundness-1);c.stroke();}
  const peg=['#df6745','#7da852','#608da6'][slot];panel(x+w/2-15,y-17,30,35,8);fill(x+w/2-13,y-15,26,30,peg,7);
  menuHeader(d,x,y,w,true);
  c.save();rr(x+8,y+82,w-16,h-93,20);c.clip();cardContents(d,now,x,y,w,phase,true);c.restore();
 }
 function orderBackdrop(now){
  const g=c.createLinearGradient(0,214,0,483);g.addColorStop(0,'#253b3b');g.addColorStop(.7,'#30443c');g.addColorStop(1,'#5e5139');fill(65,214,806,269,g,15);
  c.save();rr(65,214,806,269,15);c.clip();for(let i=0;i<8;i++){const x=81+i*113,y=241+(i%3)*43,glow=c.createRadialGradient(x,y,1,x,y,25);glow.addColorStop(0,'#ffcc7e20');glow.addColorStop(1,'#ffcc7e00');ell(x,y,25,25,glow);}c.restore();
  c.drawImage(ui,0,214,103,42,0,214,103,42);c.drawImage(ui,827,214,101,42,827,214,101,42);
 }

 function activeOrder(slot,now){
  if(slot===0&&now>=dishes[0].next)return dishes[3];
  return dishes[slot];
 }
 function orderPhase(d,now){
  if(now<d.match)return 'collecting';
  if(now<Math.max(d.load,d.match+.28))return 'ready';
  if(now<d.fly)return 'cooking';
  if(now<d.arrive)return 'serving';
  return 'served';
 }
 const designOptions={roundness:30,arrivalGlow:true};
 function smallText(s,x,y,size=27,color='#754323',align='center',weight=700){
  c.font=weight+' '+size+'px '+ff;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);
 }
 function bevelCard(x,y,w,h,kind='paper'){
  const r=designOptions.roundness;
  c.save();c.shadowColor='#1b160f88';c.shadowBlur=13;c.shadowOffsetY=9;
  fill(x,y+5,w,h,'#ad6e35',r);
  c.shadowColor='transparent';
  const g=c.createLinearGradient(x,y,x,y+h);
  if(kind==='paper'){g.addColorStop(0,'#fff8e4');g.addColorStop(.55,'#ffedc9');g.addColorStop(1,'#efd09a');}
  else{g.addColorStop(0,'#efbb78');g.addColorStop(.18,'#dc9c54');g.addColorStop(.86,'#ca8544');g.addColorStop(1,'#b37339');}
  fill(x,y,w,h-2,g,r);c.strokeStyle=kind==='paper'?'#fff9e8':'#ffdb9e';c.lineWidth=4;rr(x+3,y+2,w-6,h-7,r-2);c.stroke();
  c.save();rr(x+8,y+8,w-16,h-19,r-6);c.clip();
  for(let i=0;i<23;i++){const yy=y+7+i*9.2;c.strokeStyle=kind==='paper'?'#bb8e4820':'#9b5a2728';c.lineWidth=.6;c.beginPath();c.moveTo(x+9,yy);c.bezierCurveTo(x+w*.35,yy+Math.sin(i*1.6)*1.5,x+w*.7,yy+1.2,x+w-10,yy-.6);c.stroke();}
  c.restore();c.restore();
 }
 function cardClip(x,y){
  c.save();c.shadowColor='#70330b55';c.shadowBlur=4;c.shadowOffsetY=4;
  const g=c.createLinearGradient(x,y,x+27,y+37);g.addColorStop(0,'#f4b475');g.addColorStop(.36,'#d8894a');g.addColorStop(1,'#a8572a');
  fill(x-14,y,28,38,g,8);c.shadowColor='transparent';stroke(x-8,y+5,x-8,y+29,'#ffd49b',2);stroke(x-8,y+18,x+8,y+18,'#9c562d66',2);c.restore();
 }
 function coinReward(pay,x,y){
  c.save();c.shadowColor='#aa621f55';c.shadowBlur=2;c.shadowOffsetY=2;
  const g=c.createRadialGradient(x-3,y-5,1,x,y,12);g.addColorStop(0,'#fff2a0');g.addColorStop(.5,'#ffcf53');g.addColorStop(1,'#d89424');ell(x,y,11,12,g);c.shadowColor='transparent';c.strokeStyle='#fff0a6';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,7.5,8.5,0,0,7);c.stroke();c.restore();
  smallText('+'+pay,x+18,y+1,29,'#7c4527','left');
 }
 function littleSeal(label,x,y,rotation=-.14,scale=1){
  c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);
  c.strokeStyle='#cb6038';c.lineWidth=2.5;rr(-36,-18,72,36,10);c.stroke();smallText(label,0,0,26,'#bd5633');c.restore();
 }
 function sparkle(x,y,r,alpha=1){
  c.save();c.globalAlpha*=alpha;c.fillStyle='#ffe9aa';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+2,y-2,x+r,y);c.quadraticCurveTo(x+2,y+2,x,y+r);c.quadraticCurveTo(x-2,y+2,x-r,y);c.quadraticCurveTo(x-2,y-2,x,y-r);c.fill();c.restore();
 }
 function receiptProgress(n,total,x,y,w,mult){
  const left=x+(mult>1?13:35),width=mult>1?w-85:w-70;
  for(let i=0;i<total;i++){
   const xx=left+i*(width/total)+width/total/2;
   c.save();c.shadowColor='#b3843f33';c.shadowBlur=2;c.shadowOffsetY=1;
   ell(xx,y,6,6,i<n?'#d88938':'#dec29b');ell(xx-1,y-2,3.5,2.3,i<n?'#ffd989':'#f1ddba');c.restore();
  }
  if(mult>1){smallText('×1.5',x+w-15,y,24,'#ba6032','right');}
 }
 function miniPan(x,y,now,phase,id){
  c.save();c.translate(x,y);const tilt=phase==='cooking'?Math.sin(now*12)*.055:0;c.rotate(tilt);
  artPart('wok',0,6,181);
  c.save();c.translate(-18,7);c.scale(.56,.56);pieces(id,now,phase==='cooking');c.restore();c.restore();
  steam(x-16,y-15,now,.9);
 }
 function plateGeometry(x,y,w){
  const baseY=y+142,plateWidth=211;
  return{x:x+w/2,baseY,faceY:baseY+2,plateWidth,lidWidth:180,lidRadius:180*.45+4,innerPlateRadius:plateWidth*.42};
 }
 function cloche(x,faceY,w,now,lift=0){
  c.save();c.translate(x,faceY-lift);const rx=w*.45,ry=w*.235;
  c.shadowColor='#86481c25';c.shadowBlur=4;c.shadowOffsetY=2;
  ell(0,5,rx+4,9,'#ae733d40');
  const g=c.createLinearGradient(-rx,-ry,rx,8);g.addColorStop(0,'#fff8df');g.addColorStop(.40,'#ffe5ac');g.addColorStop(.77,'#e8bd73');g.addColorStop(1,'#c98e49');
  c.fillStyle=g;c.beginPath();c.moveTo(-rx,0);c.bezierCurveTo(-rx,-ry*.63,-rx*.48,-ry,0,-ry);c.bezierCurveTo(rx*.54,-ry,rx,-ry*.63,rx,0);c.quadraticCurveTo(0,14,-rx,0);c.fill();
  c.shadowColor='transparent';c.strokeStyle='#fff3cc';c.lineWidth=3;c.beginPath();c.moveTo(-rx+8,-3);c.bezierCurveTo(-rx+10,-ry*.54,-rx*.38,-ry+6,-3,-ry+5);c.stroke();
  const rim=c.createLinearGradient(0,-2,0,10);rim.addColorStop(0,'#fff1c7');rim.addColorStop(1,'#c48a47');ell(0,4,rx+4,8,rim);
  c.strokeStyle='#ffedbc';c.lineWidth=2;c.beginPath();c.ellipse(0,2,rx+2,6,0,0,Math.PI);c.stroke();
  ell(0,-ry-3,13,6,'#98522d');ell(-1,-ry-5,11,6,'#d28b4d');ell(-3,-ry-7,5,2.5,'#f0bb7c');c.restore();
  c.save();c.lineCap='round';for(let i=0;i<2;i++){
   const p=(now*.9+i*.47)%1;c.globalAlpha=Math.sin(p*Math.PI)*.44;c.strokeStyle='#b8844c';c.lineWidth=2.6;
   const xx=x+(i?1:-1)*(w*.42),yy=faceY-18-lift-p*10;c.beginPath();c.moveTo(xx,yy);c.bezierCurveTo(xx-6,yy-8,xx+6,yy-13,xx,yy-22);c.stroke();
  }c.restore();
 }

 function menuHeader(d,x,y,w,isPlate){
  if(isPlate){
   smallText(d.table+'桌',x+23,y+31,27,'#87512c','left');coinReward(d.pay,x+w-88,y+31);
   txt(d.name,x+w/2,y+66,36,'#62351e','center',700);
  }else{
   const g=c.createLinearGradient(0,y+18,0,y+50);g.addColorStop(0,'#f3d7a7');g.addColorStop(1,'#e7bd86');fill(x+14,y+17,75,31,g,15);
   smallText(d.table+'桌',x+51.5,y+33,27,'#754323');coinReward(d.pay,x+w-88,y+33);
   txt(d.name,x+w/2,y+75,38,'#63341c','center',700);
  }
 }
 function cardContents(d,now,x,y,w,phase,isPlate){
  const age=now-d.match,idx=dishes.indexOf(d),n=idx<0?0:events.filter(e=>e.dish===idx&&now>=e.end).length;
  const cy=isPlate?y+137:y+143;
  if(phase==='collecting'){
   d.ing.forEach((id,i)=>{const xx=x+w/2+(i-(d.ing.length-1)/2)*(isPlate?67:73);const done=idx>=0&&events.some(e=>e.dish===idx&&e.food===id&&now>=e.end);recipeToken(id,xx,cy,isPlate?62:67,done);});
   smallText(n+'/'+d.ing.length,x+w/2,y+204,28,'#74401f');
   return;
  }
  if(phase==='served'){
   const p=ease((now-d.arrive)/.26);
   plate(d.id,x+w/2,cy+1,isPlate?202:192);
   if(!isPlate){littleSeal('上桌',x+w-43,y+109,-.16,.72);}
   check(x+76,y+202,.65);smallText('已上桌',x+151,y+202,29,'#648c35');
   if(designOptions.arrivalGlow){sparkle(x+32,y+126,7,1-p*.6);sparkle(x+w-24,y+166,5,1-p*.6);}return;
  }
  const front=Math.max(0,1-ease(age/.15));
  if(front>0){c.save();c.globalAlpha*=front;d.ing.forEach((id,i)=>recipeToken(id,x+w/2+(i-(d.ing.length-1)/2)*73*front,cy,67*(.6+.4*front)));c.restore();}
  let inAlpha=ease(age/.12);if(now>=d.fly&&!isPlate){const p=getPose(d,now);if(p.phase==='menu')inAlpha*=1-ease((p.elapsed-DEPART)/.12);}
  c.save();c.globalAlpha*=inAlpha;
  if(isPlate){
   const pg=plateGeometry(x,y,w);emptyDish(pg.x,pg.baseY,pg.plateWidth);
   const land=Math.max(0,1-age/.18);
   const reveal=now>=d.fly?ease((now-d.fly-DEPART)/MENU_REVEAL):0;
   c.save();c.globalAlpha*=1-reveal;cloche(pg.x,pg.faceY,pg.lidWidth,now,land*22+reveal*55);c.restore();
   if(phase==='ready'){littleSeal('齐啦',x+w-39,y+103,-.17,.7);}
   smallText(phase==='ready'?'交给大厨啦':phase==='cooking'?'大厨忙活中':'香喷喷来啦',x+w/2,y+205,27,'#a9502c');
  }else{
   if(phase==='serving'){
    emptyDish(x+w/2,cy+4,173);steam(x+w/2,cy-11,now,.55);smallText('上菜喽',x+w/2,y+202,29,'#b85830');
   }else{
    miniPan(x+w/2+3,cy-2,now,phase,d.id);
    if(phase==='ready')littleSeal('齐啦',x+36,y+111,-.13,.62);
    smallText(phase==='ready'?'配齐啦！':'开炒啦',x+w/2,y+202,29,'#b85830');
   }
  }
  if(age<.38&&designOptions.arrivalGlow){const p=clamp(age/.38);sparkle(x+30-8*p,y+102-10*p,7,Math.sin(p*Math.PI));sparkle(x+w-24+8*p,y+173+10*p,6,Math.sin(p*Math.PI));}
  c.restore();
 }
 function order(slot,now){
  const d=activeOrder(slot,now),prior=dishes[slot],replaced=slot===0&&d===dishes[3];
  if(slot>0&&now>=d.next){emptyOrder(slot,now);return;}
  let a=1,dy=0;
  if(!replaced&&now>d.leave){const p=ease((now-d.leave)/(d.next-d.leave));a=1-p;dy=-45*p;}
  if(replaced){const p=ease((now-prior.next)/.12);a=1;dy=-12*(1-p);}
  const x=76+slot*264,y=244,w=248,h=226,phase=orderPhase(d,now),age=now-d.match;
  c.save();c.translate(0,dy);c.globalAlpha*=a;
  if(age>=0&&age<.40){const p=clamp(age/.4),s=1+.025*Math.sin(p*Math.PI);c.translate(x+w/2,y+h/2);c.scale(s,s);c.translate(-x-w/2,-y-h/2);}
  if(design==='ticket'&&age>=.10&&age<.34){const p=(age-.10)/.24,s=.94+.06*Math.abs(Math.cos(p*Math.PI));c.translate(x+w/2,0);c.scale(s,1);c.translate(-x-w/2,0);}
  drawMenuCard(d,now,x,y,w,h,phase,slot);c.restore();
 }
 function emptyOrder(slot,now){
  const d={id:'egg',name:slot===1?'青椒炒蛋':'香菇炒蛋',table:slot===1?'05':'06',pay:slot===1?28:30,mult:1,ing:[slot===1?'pepper':'mushroom','egg'],match:99};
  const p=ease((now-dishes[slot].next)/DELIVERY.newEntry);c.save();c.translate(0,-12*(1-p));drawMenuCard(d,now,76+slot*264,244,248,226,'collecting',slot);c.restore();
 }
 function steam(x,y,now,amount=.8){c.save();c.lineCap='round';for(let i=0;i<3;i++){const p=(now*1.3+i*.31)%1;c.globalAlpha=Math.sin(p*Math.PI)*amount*.6;c.strokeStyle='#fff1d8';c.lineWidth=3;c.beginPath();c.moveTo(x+(i-1)*20,y-p*20);c.bezierCurveTo(x-15+(i-1)*20,y-20-p*30,x+18+(i-1)*20,y-40-p*30,x+(i-1)*20,y-60-p*30);c.stroke();}c.restore();}
 function pieces(id,now,flip=0){
  for(let i=0;i<12;i++){const x=Math.sin(i*6.7+now*6)*68,y=Math.cos(i*3.7)*12-Math.max(0,Math.sin(now*15+i))*(flip?58:0);c.save();c.translate(x,y);c.rotate(i+now*4);const g=c.createLinearGradient(0,-7,0,8);g.addColorStop(0,id==='egg'?(i%3?'#ffe690':'#ff9b59'):(i%3?'#efc491':'#bd915f'));g.addColorStop(1,id==='egg'?(i%3?'#e4aa38':'#d75e39'):(i%3?'#b5773b':'#754127'));fill(-8,-6,17,13,g,4);c.restore();}
  for(let i=0;i<4;i++){c.save();c.translate(Math.sin(i*4+now)*47,Math.cos(i*5+now)*12);c.rotate(i);fill(-3,-5,6,10,'#83ad43',2);c.restore();}
 }
 function cookingMotion(d,now){
  let angle=0,dx=0,dy=0,pourProgress=0;const stirring=d&&now>=d.stir&&now<d.pour,pouring=d&&now>=d.pour&&now<d.fly;
  if(stirring){const p=(now-d.stir)/(d.pour-d.stir);angle=Math.sin(p*Math.PI*5)*.11;dx=Math.sin(p*Math.PI*5)*7;dy=-Math.max(0,Math.sin(p*Math.PI*4))*11;}
  if(pouring){pourProgress=clamp((now-d.pour)/(d.fly-d.pour));const q=Math.sin(pourProgress*Math.PI);angle=.64*q;dx=6*q;dy=-6*q;}
  return{x:762+dx,y:1416+dy,angle,stirring:!!stirring,pouring:!!pouring,pourProgress};
 }
 function emptyDish(x,y,w){
  c.save();ell(x,y+18,w*.49,w*.13,'#6c3c1840');const g=c.createLinearGradient(0,y-20,0,y+31);g.addColorStop(0,'#fff5dc');g.addColorStop(.65,'#eed3a1');g.addColorStop(1,'#c69863');ell(x,y+8,w*.5,w*.19,g);ell(x,y+2,w*.49,w*.18,'#fff0d0');c.strokeStyle='#d7b180';c.lineWidth=2;c.beginPath();c.ellipse(x,y+2,w*.42,w*.135,0,0,7);c.stroke();ell(x,y+3,w*.39,w*.11,'#e9cba0');c.restore();
 }
 function pourToDish(d,now,motion){
  const p=motion.pourProgress,fillAmount=ease((p-.12)/.76),x=837,y=1484;
  c.save();c.globalAlpha=ease(p/.12);emptyDish(x,y,145);c.restore();
  if(fillAmount>0)plate(d.id,x,y,145,fillAmount);
  const lx=95,ly=-5,sx=motion.x+lx*Math.cos(motion.angle)-ly*Math.sin(motion.angle),sy=motion.y+lx*Math.sin(motion.angle)+ly*Math.cos(motion.angle);
  for(let i=0;i<9;i++){
   const u=(p-.12-i*.025)/.48;if(u<=0||u>=1)continue;
   const xx=mix(sx,x+(i%3-1)*11,u),yy=mix(sy,y-5+(i%2)*3,u)-Math.sin(u*Math.PI)*15;
   c.save();c.translate(xx,yy);c.rotate(i+u*3);const g=c.createLinearGradient(0,-6,0,7);
   if(d.id==='egg'){g.addColorStop(0,i%3?'#ffe193':'#ff9d66');g.addColorStop(1,i%3?'#d9a338':'#cf5d37');}
   else if(i%3===0){g.addColorStop(0,d.id==='pork'?'#95bb62':'#c39b6c');g.addColorStop(1,d.id==='pork'?'#52792e':'#79502e');}
   else{g.addColorStop(0,'#efc992');g.addColorStop(1,'#b67c43');}
   fill(-7,-5,15,12,g,4);c.restore();
  }
 }
 function prepGeometry(i){return{x:55+i*76,y:1398,w:69,h:89,r:18,cx:89.5+i*76,cy:1442.5};}
 function prepCell(i,food){
  const r=prepGeometry(i);c.save();rr(r.x,r.y,r.w,r.h,r.r);c.clip();
  const g=c.createLinearGradient(0,r.y,0,r.y+r.h);
  if(food){const bg=tileBgs[food];g.addColorStop(0,bg?.top||'#fff0cd');g.addColorStop(1,bg?.bottom||'#f3d7a9');}
  else{g.addColorStop(0,'#c99158');g.addColorStop(.25,'#e4b782');g.addColorStop(1,'#f8d9a8');}
  fill(r.x,r.y,r.w,r.h,g);
  if(food){const scale=r.w/144;c.drawImage(softSprites[food],r.cx-128*scale/2,r.cy-118*scale/2,128*scale,118*scale);}
  c.restore();c.strokeStyle='#ffe9c5';c.lineWidth=2;rr(r.x,r.y,r.w,r.h,r.r);c.stroke();
 }

 function station(now){
  wood(30,1331,867,190);panel(50,1333,197,49,24,'wood');txt('备菜 '+buffer(now).length+'/7',148.5,1358,33,'#692e16','center',700);
  panel(41,1386,556,114,28);
  const prepared=buffer(now);for(let i=0;i<7;i++){const item=prepared.find(e=>e.slot===i);prepCell(i,item?.food);}
  stroke(611,1337,611,1503,'#efc693',2);
  const current=dishes.find(d=>now>=d.load&&now<d.fly);panel(337,1333,242,44,22);txt(current?'自动快炒':'凑齐自动入锅',458,1355,27,'#724122','center');
  const sg=c.createLinearGradient(0,1478,0,1515);sg.addColorStop(0,'#dbc6a8');sg.addColorStop(.4,'#8f8579');sg.addColorStop(1,'#ac957a');fill(638,1478,225,37,sg,8);fill(650,1481,202,21,'#393635',4);stroke(659,1480,841,1499,'#9e9687',5);stroke(841,1480,659,1499,'#9e9687',5);
  ell(747,1490,63,9,'#44c9fb');ell(747,1488,40,4,'#a0ecff');
  for(let i=0;i<9;i++){const x=698+i*12,h=(current?19:12)+Math.sin(now*13+i)*3;c.fillStyle='#4ed1ff';c.beginPath();c.moveTo(x-4,1490);c.quadraticCurveTo(x-3,1483,x,1490-h);c.quadraticCurveTo(x+5,1484,x+4,1490);c.fill();}
  c.save();c.beginPath();c.rect(612,1331,316,190);c.clip();
  const m=cookingMotion(current,now);
  c.save();c.translate(m.x,m.y);c.rotate(m.angle);artPart('wok',0,0,263);
  if(current&&now>=current.stir){c.save();c.translate(-20,2);if(m.pouring)c.globalAlpha*=1-ease((m.pourProgress-.10)/.80);pieces(current.id,now,m.stirring);c.restore();steam(-20,-30,now,.7);}else steam(-20,-30,now,.14);c.restore();
  if(m.pouring)pourToDish(current,now,m);c.restore();
 }
 function flight(e,now){const g=eventGeom(e),p=ease((now-e.start)/(e.end-e.start)),x=mix(g.x,89.5+e.slot*76,p),y=mix(g.y,1442.5,p)-Math.sin(p*Math.PI)*62;tile(e.food,x,y,mix(g.w,69,p),mix(g.h,89,p),1,Math.sin(p*Math.PI)*.1);}
 function rawToWok(d,now){d.ing.forEach((id,i)=>{const p=ease((now-d.load-i*.018)/(d.stir-d.load-i*.018)),x=mix(89.5+i*76,742+(i-1)*18,p),y=mix(1442.5,1405,p)-Math.sin(p*Math.PI)*42;tile(id,x,y,mix(69,24,p),mix(89,25,p),1,Math.sin(p*Math.PI)*.4);});}
 function ring(x,y,age){const p=age/.32;if(p<0||p>1)return;c.save();c.globalAlpha=1-p;c.strokeStyle='#fff1bb';c.lineWidth=5;c.beginPath();c.arc(x,y,16+p*33,0,7);c.stroke();c.restore();}
 function captionFor(now){
  if(nextPreview)return '第2关界面预览 · 点击重播可再看完整演示';
  if(taps.some(a=>performance.now()-a.at<900))return '亮牌可选 · 暗牌仍被压住';
  if(now<1.94)return '奶油底点菜单 · 食材自然融入卡面';
  if(now<dishes[0].fly)return '已放食材的整格铺满底色 · 食材保持比例';
  if(now<dishes[0].arrive)return '出锅即移动 · 实际路线更长 · 没有停顿';
  if(now<6.45)return '上桌即退单 · 紧接着补新单';
  if(now<CLEAR_AT)return '继续营业 · 冲向收入目标';
  if(resultDismissed)return '本关已完成 · 可以重播观看';
  return '通关成功 · 用时在达标时冻结';
 }
 let nextPreview=false,resultDismissed=false,dialogShown=false;
 const CLEAR_AT=dishes[3].arrive,RESULT_AT=CLEAR_AT+.60;
 const resultDialog=root.querySelector('.oc-result'),resultDetail=root.querySelector('[data-result-detail]');
 const nextButton=root.querySelector('[data-result-action="next"]'),restButton=root.querySelector('[data-result-action="rest"]');
 const resultAreas={next:{x:204,y:1054,w:520,h:128},rest:{x:294,y:1196,w:340,h:128}};
 for(const [key,b] of [['next',nextButton],['rest',restButton]]){const r=resultAreas[key];b.style.left=r.x/W*100+'%';b.style.top=r.y/H*100+'%';b.style.width=r.w/W*100+'%';b.style.height=r.h/H*100+'%';}
 function currentTarget(){return nextPreview?360:TARGET;}
 function usedTime(){const seconds=Math.ceil(CLEAR_AT);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
 function resultVisible(now){return !nextPreview&&!resultDismissed&&now>=RESULT_AT;}
 function syncClearUI(now){
  const visible=resultVisible(now);resultDialog.hidden=!visible;
  root.querySelector('.oc-hit-layer').inert=visible||(!nextPreview&&now>=CLEAR_AT);
  root.dataset.dialog=String(visible);root.dataset.level=nextPreview?'2':'1';
  if(visible){resultDetail.textContent='通关成功。本关用时'+usedTime()+'，收入322，目标300。要进入下一关吗？';}
  if(visible&&!dialogShown)nextButton.focus({preventScroll:true});
  dialogShown=visible;
 }
 function resetDemo(auto=false){
  nextPreview=false;resultDismissed=false;dialogShown=false;t=0;taps=[];playing=auto;last=performance.now();sync();draw(t);
 }
 function restAfterClear(){resultDismissed=true;playing=false;sync();draw(t);root.querySelector('[data-action="replay"]').focus({preventScroll:true});}
 nextButton.addEventListener('click',()=>{nextPreview=true;resultDismissed=false;t=0;taps=[];playing=false;last=performance.now();sync();draw(0);pause.focus({preventScroll:true});persist();});
 restButton.addEventListener('click',restAfterClear);
 resultDialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();restAfterClear();}
  if(event.key==='Tab'){const first=nextButton,last=restButton;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 });
 function victoryCoin(x,y,r){
  c.save();c.shadowColor='#c47b2440';c.shadowBlur=12;c.shadowOffsetY=8;
  const g=c.createRadialGradient(x-r*.3,y-r*.38,r*.05,x,y,r);g.addColorStop(0,'#fff2a0');g.addColorStop(.55,'#ffd56c');g.addColorStop(1,'#d5952f');ell(x,y,r,r,g);c.shadowColor='transparent';
  c.strokeStyle='#fff0b3';c.lineWidth=4;c.beginPath();c.arc(x,y,r*.79,0,7);c.stroke();smallText('￥',x,y+3,r*1.05,'#b77425','center',700);c.restore();
 }
 function victory(now){
  if(!resultVisible(now))return;
  const p=ease((now-RESULT_AT)/.34);c.save();c.globalAlpha=p;
  fill(0,0,W,H,'#24180fc2');
  c.translate(W/2,H/2);c.scale(.94+.06*p,.94+.06*p);c.translate(-W/2,-H/2);
  c.save();c.shadowColor='#130e0acc';c.shadowBlur=45;c.shadowOffsetY=20;panel(104,404,720,940,48,'wood');c.restore();
  panel(120,420,688,907,37);
  panel(184,378,560,132,43,'wood');txt('通关成功',464,445,65,'#fff1c4','center',700);
  c.strokeStyle='#eac38b88';c.lineWidth=2;c.beginPath();c.moveTo(267,733);c.lineTo(661,733);c.stroke();
  const glow=c.createRadialGradient(464,620,12,464,620,133);glow.addColorStop(0,'#ffd37866');glow.addColorStop(1,'#ffd37800');ell(464,620,133,110,glow);
  victoryCoin(410,637,34);victoryCoin(519,638,34);victoryCoin(464,607,58);
  sparkle(342,587,11,.75);sparkle(575,588,8,.85);sparkle(551,688,6,.7);sparkle(383,687,6,.7);
  smallText('本关收入',464,764,31,'#91633e');txt('¥322 / 300',464,819,59,'#a84025','center',700);
  smallText('本关用时',464,885,31,'#91633e');txt(usedTime(),464,938,66,'#6a3921','center',700);
  smallText('要继续挑战下一关吗？',464,1008,32,'#7a4c2c');
  const b=resultAreas.next;panel(b.x,b.y,b.w,b.h,34,'wood');
  const g=c.createLinearGradient(0,b.y+4,0,b.y+b.h-5);g.addColorStop(0,'#f4b96c');g.addColorStop(.6,'#e69c48');g.addColorStop(1,'#d48937');fill(b.x+5,b.y+4,b.w-10,b.h-12,g,30);c.strokeStyle='#ffe3a1';c.lineWidth=2;rr(b.x+7,b.y+6,b.w-14,b.h-16,28);c.stroke();
  txt('下一关',464,b.y+b.h/2,47,'#60301a','center',700);
  smallText('先休息一下',464,1260,32,'#8b623f');c.restore();
 }

 function draw(now){
  if(!ready)return;c.clearRect(0,0,W,H);c.drawImage(scene,0,0);
  orderBackdrop(now);
  hud(now);for(let s=0;s<3;s++)order(s,now);board(now);station(now);
  for(const e of events){if(now>=e.start-.04&&now<e.start+.28)ring(eventGeom(e).x,eventGeom(e).y,now-e.start+.04);if(now>=e.start&&now<e.end)flight(e,now);}
  for(const d of dishes){
   if(now>=d.load&&now<d.stir)rawToWok(d,now);
   if(now>=d.fly&&now<d.arrive){const p=getPose(d,now);if(p.alpha>.001)plate(d.id,p.x,p.y,p.w,p.alpha);}

  }
  taps=taps.filter(a=>performance.now()-a.at<900);for(const a of taps)ring(a.x,a.y,(performance.now()-a.at)/1000);
  victory(now);syncClearUI(now);const label=captionFor(now);if(label!==lastCaption){caption.textContent=label;lastCaption=label;}
  root.dataset.revenue=String(revenue(now));root.dataset.stock=String(remaining(now));root.dataset.buffer=String(buffer(now).length);root.dataset.columns=String(cols);root.dataset.time=now.toFixed(3);root.dataset.clicks=String(clicks);root.dataset.won=String(revenue(now)>=currentTarget());
 }
 function sync(){root.querySelectorAll('[data-cols]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.cols)===cols)));pause.textContent=nextPreview?'播放演示':playing?'暂停':'播放';}
 function persist(){window.openai?.setWidgetState?.({modelContent:{orderCardDesign:design,gridColumns:5,layerLayout:'staggered'},privateContent:{playing}})?.catch(()=>{});}
 root.querySelectorAll('[data-cols]').forEach(b=>b.addEventListener('click',()=>{cols=Number(b.dataset.cols);t=0;taps=[];playing=true;last=performance.now();makeHits();sync();draw(0);persist();}));
 pause.addEventListener('click',()=>{if(nextPreview){resetDemo(true);}else{playing=!playing;last=performance.now();sync();}persist();});
 root.querySelector('[data-action="replay"]').addEventListener('click',()=>resetDemo(true));
 root.querySelectorAll('[data-seek]').forEach(b=>b.addEventListener('click',()=>{nextPreview=false;resultDismissed=false;t=Number(b.dataset.seek);taps=[];playing=false;sync();draw(t);}));
 window.addEventListener('openai:set_globals',e=>{const n=e.detail?.globals?.widgetState?.modelContent?.gridColumns;if(n===5){cols=5;makeHits();sync();draw(t);}});
 root.animation={prepGeometry(i=0){return prepGeometry(i);},orderSnapshot(now=t){return orderSnapshot(now);},delivery(){return{...DELIVERY,departureSeconds:DEPART,menuSeconds:MENU_REVEAL,totalSeconds:FLIGHT};},tileFit(w,h){return tileMetrics(w,h);},layout(){return{...COMPACT,board:{...BOARD}};},layers(now=t){return layerSummary(now);},lid(){return plateGeometry(76,244,248);},eventOrigin(i){return eventGeom(events[i]);},seek(now){nextPreview=false;resultDismissed=false;t=now;taps=[];playing=false;sync();draw(t);},play(){if(nextPreview){resetDemo(true);}else{playing=true;last=performance.now();sync();}},setColumns(n){cols=5;t=0;taps=[];makeHits();sync();draw(0);},pose(i,now){return getPose(dishes[i],now);},cooking(i,now){return cookingMotion(dishes[i],now);},orderState(i,now){const d=dishes[i],phase=orderPhase(d,now);return{phase,showIngredients:phase==='collecting',showRecipePlate:false,titleBackdrop:false,creamBackground:true,ingredientFrame:false,accepted:phase!=='collecting',main:phase==='ready'?'配齐啦':phase==='cooking'?(design==='ticket'?'开炒啦':'大厨忙活中'):phase==='serving'?(design==='ticket'?'上菜喽':'香喷喷来啦'):phase==='served'?'好香，开饭啦':'',sub:'',design};},state(){return{time:t,ready,playing,level:nextPreview?2:1,nextLevelPreview:nextPreview,dialogVisible:resultVisible(t),elapsedSeconds:CLEAR_AT,elapsedLabel:usedTime(),design,columns:cols,frontTiles:cols*5,revenue:revenue(t),target:currentTarget(),stock:remaining(t),buffer:buffer(t).length,won:revenue(t)>=currentTarget(),clicks,duration:TOTAL,flightSeconds:FLIGHT,departureSeconds:DEPART,menuRevealSeconds:MENU_REVEAL,hiddenHoldSeconds:0,stationaryAfterPour:0,servedHoldSeconds:0,slotFill:'entire-slot',dishes:dishes.map(d=>({table:d.table,base:d.base,mult:d.mult,pay:d.pay,match:d.match,arrive:d.arrive,leave:d.leave,next:d.next,fly:d.fly,pour:d.pour,stir:d.stir})),tileWidthAt390:geom(0).w*390/W,incomeLocation:'secondary-shop-sign',freedHeight:62,foodAspectPreserved:true,visibleLayers:2,lowerOffset:{x:BOARD.underDX,y:BOARD.underDY}};}};
 function staticCloche(x,faceY,w,now,lift=0){
  c.save();c.translate(x,faceY-lift);const rx=w*.45,ry=w*.235;
  c.shadowColor='#86481c25';c.shadowBlur=4;c.shadowOffsetY=2;
  ell(0,5,rx+4,9,'#ae733d40');
  const g=c.createLinearGradient(-rx,-ry,rx,8);g.addColorStop(0,'#fff8df');g.addColorStop(.40,'#ffe5ac');g.addColorStop(.77,'#e8bd73');g.addColorStop(1,'#c98e49');
  c.fillStyle=g;c.beginPath();c.moveTo(-rx,0);c.bezierCurveTo(-rx,-ry*.63,-rx*.48,-ry,0,-ry);c.bezierCurveTo(rx*.54,-ry,rx,-ry*.63,rx,0);c.quadraticCurveTo(0,14,-rx,0);c.fill();
  c.shadowColor='transparent';c.strokeStyle='#fff3cc';c.lineWidth=3;c.beginPath();c.moveTo(-rx+8,-3);c.bezierCurveTo(-rx+10,-ry*.54,-rx*.38,-ry+6,-3,-ry+5);c.stroke();
  const rim=c.createLinearGradient(0,-2,0,10);rim.addColorStop(0,'#fff1c7');rim.addColorStop(1,'#c48a47');ell(0,4,rx+4,8,rim);
  c.strokeStyle='#ffedbc';c.lineWidth=2;c.beginPath();c.ellipse(0,2,rx+2,6,0,0,Math.PI);c.stroke();
  ell(0,-ry-3,13,6,'#98522d');ell(-1,-ry-5,11,6,'#d28b4d');ell(-3,-ry-7,5,2.5,'#f0bb7c');c.restore();
 }

 root.exportUI=function(kind){
  playing=false;c.clearRect(0,0,W,H);c.save();c.scale(2,2);let box;
  if(kind==='order-card'){panel(10,10,248,226,30);box=[0,0,536,512];}
  if(kind==='wood-button'){panel(10,10,245,90,28);box=[0,0,530,230];}
  if(kind==='income-tag'){panel(10,10,228,52,23,'wood');box=[0,0,496,152];}
  if(kind==='prep-empty'){c.translate(-45,-1388);prepCell(0);box=[0,0,178,218];}
  if(kind==='empty-plate'){emptyDish(125,70,211);box=[0,0,500,250];}
  if(kind==='cloche'){staticCloche(125,90,180,0,0);box=[0,0,500,250];}
  c.restore();const crop=document.createElement('canvas');crop.width=box[2];crop.height=box[3];crop.getContext('2d').drawImage(canvas,...box,0,0,box[2],box[3]);const data=crop.toDataURL();draw(t);return data;
 };


 root.animation.previewRecipe=function(recipe){
  nextPreview=false;resultDismissed=false;t=0;taps=[];playing=false;const ids=recipe.ingredients;
  events.splice(0,events.length,...ids.map((food,i)=>({cell:i,food,start:.4+i*.4,end:.7+i*.4,slot:i,dish:0})));
  for(let i=0;i<ids.length;i++){const n=nodes.find(n=>n.id==='top-'+i);n.food=ids[i];}
  const match=events[events.length-1].end+.09,load=match+.06,stir=load+.28,pour=stir+.60,fly=pour+.32,arrive=fly+FLIGHT;
  Object.assign(dishes[0],{id:recipe.id,name:recipe.displayName||recipe.name,ing:ids,base:recipe.basePrice,mult:recipe.multiplier,pay:recipe.payout,match,load,stir,pour,fly,arrive,leave:arrive,next:arrive+.16});
  for(let i=1;i<4;i++)Object.assign(dishes[i],{match:999,load:999,stir:999,pour:999,fly:999,arrive:999,leave:999,next:999});
  previewStopAt=dishes[0].next+.30;hitKey='';makeHits(0);last=performance.now();sync();draw(0);playing=true;
 };

 Promise.all([ui.decode(),art.decode(),ingredientAtlas.decode(),...Object.values(dishImages).map(image=>image.decode())]).then(build).catch(()=>{caption.textContent='预览未载入，请重新打开。';});sync();
 function loop(stamp){const dt=Math.min((stamp-last)/1000,.1);last=stamp;if(ready&&playing&&!document.hidden&&!root.hidden){t=Math.min(previewStopAt,t+dt);if(t>=previewStopAt){playing=false;sync();}draw(t);}else if(ready&&taps.length)draw(t);requestAnimationFrame(loop);}requestAnimationFrame(loop);

 if(globalThis.Tweak){
  const tweak=new Tweak({container:root,onChange:()=>draw(t)});
  tweak.addSlider(designOptions,'roundness',{label:'卡片圆润度',min:24,max:38,step:1,unit:'px'});
  tweak.addToggle(designOptions,'arrivalGlow',{label:'配齐与上桌的小闪光'});
 }

 }
 createDesign(document.getElementById('dd-asset-preview'),'plate');
})();




