/* Platform-neutral components. An image owns its edge/highlight/shadow once. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./stall-art.js'),require('../data/lobby-layout.js'),require('../data/lobby-font-metrics.js'));else root.DapaidangLobbyComponents=factory(root.DapaidangStallArt,root.DapaidangLobbyLayout,root.DapaidangLobbyFontMetrics);})(typeof globalThis!=='undefined'?globalThis:this,function(Art,L,FontMetrics){
 'use strict';
 const fallback='"Hiragino Sans GB","PingFang SC","Microsoft YaHei",sans-serif';
 const tabIds={'摊位':'stall','大厨':'chef','场景':'background','主题':'themes','菜谱':'recipes','成就':'achievements','相册':'photos','当期':'current','往期':'archive','每日':'daily'};
 const lettering={'小摊装扮':'title-decor','把小摊布置成喜欢的样子':'subtitle-decor','家常菜谱':'title-recipes','夜市活动':'title-market','开张营业':'label-play','布置小摊':'label-decor','查看关卡':'label-map','番茄炒蛋':'dish-0','青椒肉片':'dish-1','双料香菇鸡':'dish-2','西兰花虾仁':'dish-3','芹菜牛肉':'dish-4','豆腐炒蛋':'dish-5','秋夜灯会':'banner-title','初点灯火':'book-0','河岸晚风':'book-1','热锅小调':'book-2','满街暖光':'book-3'};
 function create(c,images,bodyFont,assetIndex,createCanvas){
  const family='"'+(bodyFont||'LanternBody')+'",'+fallback;
  const grayDishes={};
  function round(r,color,radius){Art.rounded(c,...r,radius===undefined?24:radius,color);}
  function gradient(r,colors){const g=c.createLinearGradient(0,r[1],0,r[1]+r[3]);colors.forEach((s,i)=>g.addColorStop(i/(colors.length-1),s));return g;}
  function centeredText(s,x,y,size){let low=Infinity,high=-Infinity;for(const char of s){const b=FontMetrics.bounds[char.codePointAt(0)];if(b){low=Math.min(low,b[0]);high=Math.max(high,b[1]);}}c.textBaseline='alphabetic';c.fillText(s,x,y+(Number.isFinite(low)?(low+high)*size/(2*FontMetrics.unitsPerEm):0));}
  function words(value,x,y,size,color,align,max){c.save();c.font='500 '+size+'px '+family;let s=String(value);if(max&&c.measureText(s).width>max){while(s.length>1&&c.measureText(s+'…').width>max)s=s.slice(0,-1);s+='…';}c.textAlign=align||'left';c.fillStyle=color||'#653715';centeredText(s,x,y,size);c.restore();}
  function dishImage(id,unlit){
   const im=images[id];if(!im||!unlit||!createCanvas)return im;
   // Cache only the illustration; native canvases need no filter support or
   // extra packaged images, and the card/name retain their original colours.
   if(!grayDishes[id]){
    const gray=createCanvas();gray.width=im.naturalWidth||im.width;gray.height=im.naturalHeight||im.height;
    const ctx=gray.getContext('2d');ctx.drawImage(im,0,0);
    const pixels=ctx.getImageData(0,0,gray.width,gray.height),data=pixels.data;
    for(let i=0;i<data.length;i+=4)data[i]=data[i+1]=data[i+2]=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
    ctx.putImageData(pixels,0,0);grayDishes[id]=gray;
   }
   return grayDishes[id];
  }
  function sprite(id,r,unlit){const im=unlit?dishImage(id,true):images[id];if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(r[2]/iw,r[3]/ih);c.drawImage(im,r[0]+(r[2]-iw*s)/2,r[1]+(r[3]-ih*s)/2,iw*s,ih*s);}
  function art(id,x,y,height,align,max,visible){const key='lobby-art-'+id,im=images[key];if(!im)return false;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(height/ih,max?max/iw:Infinity),w=iw*s,h=ih*s,b=visible&&assetIndex&&assetIndex[key]&&assetIndex[key].contentBounds||[0,0,iw,ih];c.drawImage(im,x-(b[0]+(align==='left'?0:align==='right'?b[2]:b[2]/2))*s,y-(b[1]+b[3]/2)*s,w,h);return true;}
  function display(value,x,y,size,color,align,max){if(lettering[value]&&art(lettering[value],x,y,size,align,max))return;c.save();c.font='500 '+size+'px '+family;let s=String(value);if(max&&c.measureText(s).width>max){while(s.length>1&&c.measureText(s+'…').width>max)s=s.slice(0,-1);s+='…';}c.textAlign=align||'center';c.fillStyle=color||'#63320f';if(color==='#fff0c5'){c.shadowColor='#8d3b1d';c.shadowOffsetY=2;c.shadowBlur=1;}centeredText(s,x,y,size);c.restore();}
  function skin(name,r){if(name==='tag'){round(r,gradient(r,['#ffe5b2','#f2cb8d']),Math.min(r[3]/2,20));outline(r,'#ffeccb',1.5,Math.min(r[3]/2,20));return;}const spec=L.skins[name],im=spec&&images[spec.id];if(!im){round(r,gradient(r,['#fff0ce','#ecc28c']),Math.min(r[3]/2,26));return;}
   const sw=im.naturalWidth||im.width,sh=im.naturalHeight||im.height;
   const [l0,t0,r0,b0]=spec.slice,l=Math.min(l0,sw/2),rr=Math.min(r0,sw/2),t=Math.min(t0,sh/2),b=Math.min(b0,sh/2);
   const capsule=/^(primary|secondary)/.test(name),fit=Math.min(spec.cornerScale||1,r[2]/(l+rr),r[3]/(t+b),capsule?r[3]/sh:1),dl=l*fit,dr=rr*fit,dt=t*fit,db=b*fit;
   const xs=[0,l,sw-rr,sw],ys=[0,t,sh-b,sh],xd=[r[0],r[0]+dl,r[0]+r[2]-dr,r[0]+r[2]],yd=[r[1],r[1]+dt,r[1]+r[3]-db,r[1]+r[3]];
   for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(xs[x+1]>xs[x]&&ys[y+1]>ys[y]&&xd[x+1]>xd[x]&&yd[y+1]>yd[y]){
    // Shared source pixels overlap at joins, avoiding subpixel sampling seams
    // in both browser canvas and the native Mini Game canvas.
    const sx=xs[x]-(x?.6:0),sy=ys[y]-(y?.6:0),ex=xs[x+1]+(x<2?.6:0),ey=ys[y+1]+(y<2?.6:0),fx=(xd[x+1]-xd[x])/(xs[x+1]-xs[x]),fy=(yd[y+1]-yd[y])/(ys[y+1]-ys[y]);
    c.drawImage(im,sx,sy,ex-sx,ey-sy,xd[x]-(x?.6*fx:0),yd[y]-(y?.6*fy:0),(ex-sx)*fx,(ey-sy)*fy);
   }
  }
  function surface(id,r){const im=images[id];if(!im)return;const shape=assetIndex&&assetIndex[id]&&assetIndex[id].shape;c.save();if(shape&&shape.length){c.beginPath();shape.forEach(([x,y],i)=>{const px=r[0]+x*r[2],py=r[1]+y*r[3];if(i)c.lineTo(px,py);else c.moveTo(px,py);});c.closePath();c.clip();}c.drawImage(im,...r);c.restore();}
  function wood(r){surface('lobby-nav-base',r);}
  function panel(tab){surface(tab==='recipes'?'lobby-panel-recipes':tab==='market'?'lobby-panel-market':'lobby-content-panel',[0,172,887,1439]);}
  function dish(id,r,unlit){const n=Number(id.slice(1))-1,master='lobby-dish-'+n;if(images[master]&&n<6){sprite(master,r,unlit);return;}const im=dishImage(id,unlit);if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,sx=iw*.068,sy=ih*.115,sw=iw*.864,sh=ih*.77,s=Math.min(r[2]/sw,r[3]/sh);c.drawImage(im,sx,sy,sw,sh,r[0]+(r[2]-sw*s)/2,r[1]+(r[3]-sh*s)/2,sw*s,sh*s);}
  function navIcon(name,r){sprite('lobby-nav-'+name,r);}
  function outline(r,color,width,radius){c.save();c.strokeStyle=color;c.lineWidth=width||3;Art.rounded(c,...r,radius||24,'transparent');c.stroke();c.restore();}
  function check(x,y,size){c.save();c.strokeStyle='#4b7a18';c.lineWidth=Math.max(5,size*.32);c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x-size*.6,y);c.lineTo(x-size*.05,y+size*.5);c.lineTo(x+size,y-size*.65);c.stroke();c.restore();}
  function lock(x,y,size){c.save();c.strokeStyle='#8d5a27';c.lineWidth=size*.16;c.beginPath();c.arc(x,y-size*.12,size*.27,Math.PI,0);c.stroke();round([x-size*.43,y-size*.10,size*.86,size*.7],'#8d5a27',size*.10);c.fillStyle='#f2cd92';c.beginPath();c.arc(x,y+size*.17,size*.09,0,Math.PI*2);c.fill();round([x-size*.045,y+size*.17,size*.09,size*.18],'#f2cd92',1);c.restore();}
  function chevron(x,y,d,size,color){c.save();c.strokeStyle=color||'#a1622e';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x-d*size/2,y-size);c.lineTo(x+d*size/2,y);c.lineTo(x-d*size/2,y+size);c.stroke();c.restore();}
  function flourish(x,y,flip,width){
    c.save();c.translate(x,y);c.scale((flip||1)*width/112,width/112);
    c.strokeStyle='#f7ce80';c.fillStyle='#f7ce80';c.lineWidth=2.5;c.lineCap='round';
    c.beginPath();c.moveTo(-54,7);c.bezierCurveTo(-18,-8,9,20,35,0);c.bezierCurveTo(50,-12,23,-21,23,-7);c.bezierCurveTo(23,2,34,1,32,-5);c.stroke();
    c.beginPath();c.moveTo(31,1);c.bezierCurveTo(42,5,44,-13,54,-10);c.bezierCurveTo(50,0,42,10,31,1);c.fill();c.restore();
  }
  function ornament(x,y,flip,color,small){
    if(small){flourish(x,y,flip,color==='chapter'?112:48);return;}
    const id=color==='recipes'?'lobby-icon-cloud-recipes':color==='market'?'lobby-icon-cloud-market':'lobby-icon-title-cloud',im=images[id];if(!im)return;c.save();c.translate(x,y);c.scale(flip||1,1);const w=color==='footer'?53:color==='recipes'?88:color==='market'?69:87,h=color==='footer'?37*53/87:color==='market'?31:37;c.drawImage(im,-w/2,-h/2,w,h);c.restore();
  }
  function meter(n,max,r){round(r,gradient(r,['#bd874c','#e4b779']),r[3]/2);const p=Math.min(1,Math.max(0,n/max));if(p){const q=[r[0],r[1],Math.max(r[3],r[2]*p),r[3]];round(q,gradient(q,['#fff39b','#ffca34','#f2a514']),r[3]/2);}outline(r,'#fff0c7',1.5,r[3]/2);}
  function button(label,r,state){state=state||{};skin(state.kind==='primary'?(state.disabled?'secondaryDisabled':'primary'):state.kind==='tab'?(state.selected?'tabActive':'tabNormal'):state.kind==='page'?(state.disabled?'tabDisabled':'tabNormal'):(state.disabled?'secondaryDisabled':'secondary'),r);const color=state.disabled?'#917455':state.kind==='primary'||state.kind==='tab'&&state.selected?'#fff0c5':'#683b18',cy=r[1]+r[3]/2-2;if(state.kind==='page'&&art('page-'+(label==='上一页'?'prev':'next')+(state.disabled?'-disabled':''),r[0]+r[2]/2,cy,43,'center',r[2]-28,true))return;if(state.kind==='tab'&&art('tab-'+(tabIds[label]||label)+(state.selected?'-selected':''),r[0]+r[2]/2,cy,state.size||39,'center',r[2]-28,true))return;display(label,r[0]+r[2]/2,cy,state.size||32,color,'center',r[2]-28);}
  return{round,gradient,words,display,sprite,art,skin,wood,panel,dish,navIcon,flourish,outline,check,lock,chevron,ornament,meter,button};
 }
 return{create};
});
