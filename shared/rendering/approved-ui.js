/* Visual primitives ported from dapaidang-handoff-v12-complete/src/renderer.js.
 * Geometry, colours and texture buttons follow the approved menu-feedback HTML.
 * This module never owns gameplay, timers, targets or platform APIs. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.DapaidangApprovedUI=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(c,images,manifest){
const ff='"HanziPen SC","Kaiti SC","STKaiti","PingFang SC",sans-serif';
const clamp=x=>Math.max(0,Math.min(1,x));
// Same sepia(.65), saturate(.65), brightness(.75) matrix as the delivered
// covered cards. Food pixels are prepared with this matrix at asset build time.
function tone(hex){
 const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const sep=[[.393,.769,.189],[.349,.686,.168],[.272,.534,.131]];
 const q=sep.map((row,i)=>.35*v[i]+.65*row.reduce((n,k,j)=>n+k*v[j],0));
 const l=.213*q[0]+.715*q[1]+.072*q[2];
 return '#'+q.map(x=>Math.round(Math.max(0,Math.min(1,(.65*x+.35*l)*.75))*255).toString(16).padStart(2,'0')).join('')+hex.slice(7);
}
function rr(x,y,w,h,r){
 r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);
 c.arcTo(x+w,y,x+w,y+r,r);c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);
 c.lineTo(x+r,y+h);c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath();
}
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
function smallText(s,x,y,size=27,color='#754323',align='center',weight=700){
  size=Math.max(size,32);c.font=weight+' '+size+'px '+ff;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);
 }
function sparkle(x,y,r,alpha=1){
  c.save();c.globalAlpha*=alpha;c.fillStyle='#ffe9aa';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+2,y-2,x+r,y);c.quadraticCurveTo(x+2,y+2,x,y+r);c.quadraticCurveTo(x-2,y+2,x-r,y);c.quadraticCurveTo(x-2,y-2,x,y-r);c.fill();c.restore();
 }
function check(x,y,scale=.7){c.save();c.translate(x,y);c.scale(scale,scale);ell(0,0,15,15,'#72a33c');c.strokeStyle='#fff7dc';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(-7,0);c.lineTo(-2,5);c.lineTo(8,-6);c.stroke();c.restore();}
function steam(x,y,now,amount=.8){c.save();c.lineCap='round';for(let i=0;i<3;i++){const p=(now*1.3+i*.31)%1;c.globalAlpha=Math.sin(p*Math.PI)*amount*.6;c.strokeStyle='#fff1d8';c.lineWidth=3;c.beginPath();c.moveTo(x+(i-1)*20,y-p*20);c.bezierCurveTo(x-15+(i-1)*20,y-20-p*30,x+18+(i-1)*20,y-40-p*30,x+(i-1)*20,y-60-p*30);c.stroke();}c.restore();}
function pieces(id,now,flip=0){
  for(let i=0;i<12;i++){const x=Math.sin(i*6.7+now*6)*68,y=Math.cos(i*3.7)*12-Math.max(0,Math.sin(now*15+i))*(flip?58:0);c.save();c.translate(x,y);c.rotate(i+now*4);const g=c.createLinearGradient(0,-7,0,8);g.addColorStop(0,id==='egg'?(i%3?'#ffe690':'#ff9b59'):(i%3?'#efc491':'#bd915f'));g.addColorStop(1,id==='egg'?(i%3?'#e4aa38':'#d75e39'):(i%3?'#b5773b':'#754127'));fill(-8,-6,17,13,g,4);c.restore();}
  for(let i=0;i<4;i++){c.save();c.translate(Math.sin(i*4+now)*47,Math.cos(i*5+now)*12);c.rotate(i);fill(-3,-5,6,10,'#83ad43',2);c.restore();}
 }
function emptyDish(x,y,w){
  c.save();ell(x,y+18,w*.49,w*.13,'#6c3c1840');const g=c.createLinearGradient(0,y-20,0,y+31);g.addColorStop(0,'#fff5dc');g.addColorStop(.65,'#eed3a1');g.addColorStop(1,'#c69863');ell(x,y+8,w*.5,w*.19,g);ell(x,y+2,w*.49,w*.18,'#fff0d0');c.strokeStyle='#d7b180';c.lineWidth=2;c.beginPath();c.ellipse(x,y+2,w*.42,w*.135,0,0,7);c.stroke();ell(x,y+3,w*.39,w*.11,'#e9cba0');c.restore();
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
function victoryCoin(x,y,r){
  c.save();c.shadowColor='#c47b2440';c.shadowBlur=12;c.shadowOffsetY=8;
  const g=c.createRadialGradient(x-r*.3,y-r*.38,r*.05,x,y,r);g.addColorStop(0,'#fff2a0');g.addColorStop(.55,'#ffd56c');g.addColorStop(1,'#d5952f');ell(x,y,r,r,g);c.shadowColor='transparent';
  c.strokeStyle='#fff0b3';c.lineWidth=4;c.beginPath();c.arc(x,y,r*.79,0,7);c.stroke();smallText('￥',x,y+3,r*1.05,'#b77425','center',700);c.restore();
 }
// Canvas-native components exported from the approved visual language.
// All measurements use the 928 x 1695 design canvas.
function fit(im,x,y,w,h){if(!im)throw new Error('Required image missing');const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(w/iw,h/ih);c.drawImage(im,x-iw*s/2,y-ih*s/2,iw*s,ih*s);}
function drawAsset(id,x,y,w,h){const a=manifest.assets.find(a=>a.id===id);if(!a)throw new Error('Unknown asset '+id);const im=images['overlay-'+id];if(!im)throw new Error('Missing overlay image '+id);const sx=(w||a.body.w)/a.body.w,sy=(h||a.body.h)/a.body.h;c.drawImage(im,x-a.padding*sx,y-a.padding*sy,a.width/(a.pixelRatio||2)*sx,a.height/(a.pixelRatio||2)*sy);}
function contentFit(id,x,y,w,h){
 const im=images['ingredient-'+id];if(!im)throw new Error('Missing ingredient '+id);
 fit(im,x,y,w,h);
}
function originalTextureButton(rect){
 const {id,x,y,w,h,r=26}=rect;c.save();c.shadowColor='#65351c44';c.shadowBlur=7;c.shadowOffsetY=4;fill(x,y,w,h,'#f8ddaa',r);c.shadowColor='transparent';rr(x,y,w,h,r);c.clip();c.drawImage(images['button-'+id],x,y,w,h);c.restore();
}
function oldRecipeFood(id,x,y,w=65){
 // Use actual opaque bounds. Do not shrink the transparent padding of the source PNG into the food container.
 contentFit(id,x,y,w,w*.93);
}
function restoredCard(id,x,y,w,h,covered=false){
 c.save();c.translate(x,y);if(covered)c.globalAlpha*=.97;
 c.shadowColor=covered?tone('#69361248'):'#69361248';c.shadowBlur=6;c.shadowOffsetX=2;c.shadowOffsetY=5;
 fill(-w/2,-h/2+6,w,h,covered?tone('#c39763'):'#c39763',Math.min(w,h)*.18);c.shadowColor='transparent';
 const g=c.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,covered?tone('#fff4da'):'#fff4da');g.addColorStop(.55,covered?tone('#ffe9c2'):'#ffe9c2');g.addColorStop(1,covered?tone('#efcf9f'):'#efcf9f');fill(-w/2,-h/2,w,h,g,Math.min(w,h)*.18);
 c.strokeStyle=covered?tone('#fff7df'):'#fff7df';c.lineWidth=2;rr(-w/2+1,-h/2+1,w-2,h-3,Math.min(w,h)*.17);c.stroke();
 contentFit(covered?id+'-covered':id,0,-1,w*122/144,h*108/136);c.restore();
}

function traceBoardMatte(){
 c.beginPath();c.moveTo(81,496);c.lineTo(847,496);c.ellipse(847,610,57,114,0,-Math.PI/2,0);
 c.lineTo(904,1501);c.quadraticCurveTo(904,1521,884,1521);c.lineTo(44,1521);c.quadraticCurveTo(24,1521,24,1501);c.lineTo(24,610);c.ellipse(81,610,57,114,0,Math.PI,Math.PI*1.5);c.closePath();
}
function paintInsetBoardMatte(){
 // The matte is a coating on this exact board, not a rectangular panel placed in front of it.
 c.save();traceBoardMatte();c.clip();wood(0,476,928,1045);c.restore();
}

function renderIncome(income){
 // Original layout and typography; only the plaque fill changes to the approved light cream.
 const x=350,y=163,w=228,h=52;c.save();c.shadowColor='#51230c55';c.shadowBlur=10;c.shadowOffsetY=6;
 const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#fff0cf');g.addColorStop(.5,'#ffe4b7');g.addColorStop(1,'#e8bd83');fill(x,y,w,h,g,23);
 c.shadowColor='transparent';c.strokeStyle='#fff5db';c.lineWidth=3;rr(x+2,y+2,w-4,h-6,21);c.stroke();
 c.font='700 27px '+ff;c.textBaseline='middle';c.textAlign='left';c.fillStyle='#60311b';c.fillText('收入',370,189);
 c.font='700 30px '+ff;c.textAlign='right';c.fillStyle='#542913';c.fillText(String(income),563,189);c.restore();
}
function polishedWok(now=0,working=false){
 c.save();c.translate(742,1417);
 c.save();c.translate(109,-47);c.rotate(-.63);c.shadowColor='#3f251d50';c.shadowBlur=5;c.shadowOffsetY=3;
 const hg=c.createLinearGradient(0,-12,0,12);hg.addColorStop(0,'#ffd594');hg.addColorStop(.3,'#e7a856');hg.addColorStop(1,'#a8652e');fill(-37,-12,74,24,hg,11);
 c.shadowColor='transparent';stroke(-24,-7,22,-7,'#ffe7bb9c',2);fill(-38,-10,13,20,'#a28666',4);fill(-36,-9,5,18,'#e2cba4',2);ell(29,0,3.8,3,'#805027');c.restore();
 ell(1,44,91,11,'#552e1735');
 const body=c.createLinearGradient(-90,-25,65,52);body.addColorStop(0,'#777067');body.addColorStop(.32,'#49443e');body.addColorStop(.75,'#302d2b');body.addColorStop(1,'#1c1b1b');
 c.fillStyle=body;c.beginPath();c.moveTo(-104,-3);c.bezierCurveTo(-98,29,-72,49,0,51);c.bezierCurveTo(72,49,98,29,104,-3);c.closePath();c.fill();
 const bowl=c.createRadialGradient(-36,-18,2,4,-4,111);bowl.addColorStop(0,'#70685e');bowl.addColorStop(.3,'#4c4843');bowl.addColorStop(.8,'#29282a');bowl.addColorStop(1,'#1f2022');ell(0,-4,104,39,bowl);
 c.strokeStyle='#a9947b';c.lineWidth=3.5;c.beginPath();c.ellipse(0,-4,104,39,0,0,7);c.stroke();
 c.strokeStyle='#e4cbb17d';c.lineWidth=2;c.beginPath();c.ellipse(-1,-5,101,36,0,Math.PI*1.06,Math.PI*1.82);c.stroke();
 c.strokeStyle='#716356';c.lineWidth=2;c.beginPath();c.moveTo(-91,16);c.bezierCurveTo(-63,47,62,49,93,14);c.stroke();
 const shine=c.createRadialGradient(-36,-17,1,-36,-17,52);shine.addColorStop(0,'#f5debd23');shine.addColorStop(1,'#f5debd00');ell(-36,-17,52,19,shine);
 if(working){c.save();c.translate(0,-6);pieces('chicken',now,1);c.restore();}c.restore();
 if(working)steam(742,1380,now,.5);
}
function toolButton(b,count){
 c.save();c.globalAlpha=.92;originalTextureButton(b);c.restore();
 const x=b.x+b.w-24,y=b.y+2;c.save();ell(x,y,22,16,'#e4bd88');c.strokeStyle='#f9e3bb';c.lineWidth=1.5; c.beginPath();c.ellipse(x,y,22,16,0,0,7);c.stroke();c.font='700 28px '+ff;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#633719';c.fillText('×'+count,x,y+1);c.restore();
}
function renderPrepStation(state={}){
 // A narrow recessed wood seam separates preparation without introducing another large backing panel.
 stroke(55,1331,873,1331,'#75441e55',2);stroke(55,1334,873,1334,'#f7cc8b72',1.5);
 c.font='700 32px '+ff;c.textAlign='left';c.fillStyle='#633316';c.fillText('备菜 '+((state.prepItems||[]).length+(state.reservedCount||0))+'/7',64,1360);
 c.font='700 29px '+ff;c.textAlign='center';c.fillStyle='#633316';c.fillText(state.kitchenLabel||'自动快炒',747,1359);
 paintPrepTray(state);
 stroke(613,1378,613,1503,'#86502448',2);stroke(616,1378,616,1503,'#edbc7a5c',1);
 drawAsset('stove',638,1478);drawAsset('flame',680,1466);

}
function paintPrepTray(state={}){
 c.save();c.shadowColor='#6d3c1b6b';c.shadowBlur=7;c.shadowOffsetY=3;fill(35,1380,568,126,'#915927',32);c.shadowColor='transparent';stroke(63,1382,572,1382,'#7d4b2255',2);c.restore();
 panel(41,1386,556,114,28);for(let i=0;i<7;i++)emptySlot(55+i*76,1398,69,89);(state.prepItems||[]).forEach(item=>filledPrep(item.food,item.slot));
}
function filledPrep(id,i){
 const x=55+i*76,y=1398,w=69,h=89;
 c.save();rr(x,y,w,h,18);c.clip();
 const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#fff4da');g.addColorStop(.55,'#ffe9c2');g.addColorStop(1,'#efcf9f');c.fillStyle=g;c.fillRect(x,y,w,h);
 contentFit(id,x+w/2,y+h/2,58,58);c.restore();
}
function renderOrderCard(d,i,now){
 if(!d)return;const x=76+i*264,y=244,dy=d.dy||0,s=d.scale??1;
 c.save();c.globalAlpha=d.alpha??1;c.translate(x+124,y+113+dy);c.scale(s,s);c.translate(-x-124,-y-113);
 panel(x,y,248,226,30);
 if(d.isNew){c.save();c.globalAlpha*=d.cueAlpha??.6;c.strokeStyle='#f2b75e';c.lineWidth=3;rr(x+2,y+2,244,222,29);c.stroke();c.restore();}
 drawAsset(['clip-red','clip-green','clip-blue'][i],x+109,y-17);smallText(d.table+'桌',x+20,y+31,27,'#87512c','left');drawAsset('coin',x+147,y+18);smallText('+'+d.pay,x+178,y+32,29,'#7c4527','left');txt(d.name,x+124,y+67,36,'#62351e','center',700);
 const ia=d.ingredientAlpha??(d.accepted?0:1);
 if(ia>0){c.save();c.globalAlpha*=ia;d.ing.forEach((id,j)=>{const fx=x+124+(j-(d.ing.length-1)/2)*69,fy=y+139,done=(d.done||[]).includes(id);c.save();oldRecipeFood(id,fx,fy,64);c.restore();if(done){const age=d.checkAges?.[id];const pop=age>=0&&age<.16?1+.18*Math.sin(Math.PI*age/.16):1;check(fx+20,fy+23,.70*pop);}});c.restore();}
 if(d.accepted){c.save();c.globalAlpha*=d.plateAlpha??1;emptyDish(x+124,y+139,211);cloche(x+124,y+141,180,now,d.lidLift||0);c.restore();smallText('交给大厨啦',x+124,y+204,29,'#a9502c');}
 else smallText((d.done||[]).length+'/'+d.ing.length,x+124,y+204,30,'#74401f');
 c.restore();
}
function paintNextButton(label){c.textAlign='center';c.textBaseline='middle';
 c.save();c.shadowColor='#8b4c2359';c.shadowBlur=9;c.shadowOffsetY=7;
 fill(200,1040,528,124,'#9d5628',33);
 const bg=c.createLinearGradient(0,1034,0,1154);bg.addColorStop(0,'#ffe6af');bg.addColorStop(.24,'#f8cc87');bg.addColorStop(.7,'#eab16a');bg.addColorStop(1,'#d3904c');fill(200,1032,528,124,bg,33);c.shadowColor='transparent';c.strokeStyle='#fff0c6';c.lineWidth=3;rr(204,1036,520,112,29);c.stroke();
 c.font='700 '+(label&&label.length>5?39:48)+'px '+ff;c.fillStyle='#6d351c';c.fillText(label||'下一关',464,1095);c.restore();
}
function victory(income,elapsed,options={}){
 if(!options.skipDim)fill(0,0,928,1695,'#21180fba');
 c.save();c.shadowColor='#1c100c90';c.shadowBlur=28;c.shadowOffsetY=17;
 const outer=c.createLinearGradient(112,402,813,1328);outer.addColorStop(0,'#f3c18a');outer.addColorStop(.25,'#d69a5e');outer.addColorStop(.75,'#b87740');outer.addColorStop(1,'#945724');fill(107,411,720,928,'#75401f',48);fill(103,398,720,928,outer,48);c.shadowColor='transparent';
 c.save();rr(103,398,720,928,48);c.clip();for(let i=0;i<32;i++){const yy=405+i*29;c.strokeStyle=i%2?'#fff2c724':'#81481f25';c.lineWidth=1.2;c.beginPath();c.moveTo(105,yy);c.bezierCurveTo(330,yy+6,568,yy-6,824,yy+2);c.stroke();}c.restore();
 const sheet=c.createLinearGradient(0,425,0,1303);sheet.addColorStop(0,'#fff5db');sheet.addColorStop(.45,'#ffeac5');sheet.addColorStop(1,'#f0cca0');fill(122,419,682,887,sheet,35);
 c.strokeStyle='#fff5d7';c.lineWidth=3;rr(113,407,700,911,41);c.stroke();
 // Curved wooden sign uses the same rounded silhouette as the stall brand.
 c.save();c.shadowColor='#79421b55';c.shadowBlur=10;c.shadowOffsetY=8;
 c.beginPath();c.moveTo(188,402);c.bezierCurveTo(209,355,715,355,739,402);c.bezierCurveTo(756,435,754,487,723,505);c.bezierCurveTo(641,529,285,529,204,505);c.bezierCurveTo(173,487,172,435,188,402);c.closePath();
 const sign=c.createLinearGradient(0,372,0,525);sign.addColorStop(0,'#ffe6ac');sign.addColorStop(.45,'#f0bd72');sign.addColorStop(1,'#d7924c');c.fillStyle=sign;c.fill();c.shadowColor='transparent';c.strokeStyle='#a45d2b';c.lineWidth=7;c.stroke();
 c.strokeStyle='#fff2c6';c.lineWidth=2;c.stroke();c.font='700 '+(options.won===false?49:65)+'px '+ff;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#b34423';c.fillText(options.won===false?'这次没忙过来':'通关成功',464,447);c.restore();
 victoryCoin(412,621,33);victoryCoin(517,620,33);victoryCoin(464,594,57);sparkle(344,583,9,.65);sparkle(576,584,7,.7);
 c.font='700 31px '+ff;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#875332';c.fillText('本关收入',464,729);
 c.font='700 86px '+ff;c.fillStyle='#ac4223';c.fillText('¥'+income,464,798);
 c.font='600 29px '+ff;c.fillStyle='#885c3b';c.fillText(options.receipt||'',464,863);
 stroke(302,895,626,895,'#c58c5540',2);
 c.font='600 30px '+ff;c.fillStyle='#805332';c.fillText('本关用时  '+elapsed,464,945);
 c.font='600 30px '+ff;c.fillStyle='#75462a';c.fillText(options.message||'要继续挑战下一关吗？',464,1003);
 paintNextButton(options.primaryLabel);
 c.font='600 31px '+ff;c.fillStyle='#805332';c.fillText(options.restLabel||'先休息一下',464,1245);c.restore();
}

function emptySlot(x,y,w=69,h=89){const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#c99158');g.addColorStop(.25,'#e4b782');g.addColorStop(1,'#f8d9a8');fill(x,y,w,h,g,18);c.strokeStyle='#ffe9c5';c.lineWidth=2;rr(x,y,w,h,18);c.stroke();}
return {panel,wood,emptySlot,check,steam,pieces,emptyDish,cloche,fill,ell,stroke,sparkle,
 renderPrepStation,toolButton,renderIncome,polishedWok,drawAsset,filledPrep,renderOrderCard,
 restoredCard,contentFit,originalTextureButton,paintInsetBoardMatte,traceBoardMatte,victory,ff,round:rr};
}
return {create};
});
