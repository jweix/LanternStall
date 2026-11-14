/* Stateless production UI primitives. Every background is one independent skin. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./stall-art.js'),require('../data/lobby-layout.js'));else root.DapaidangLobbyComponents=factory(root.DapaidangStallArt,root.DapaidangLobbyLayout);})(typeof globalThis!=='undefined'?globalThis:this,function(Art,L){
  'use strict';
  const font='"Hiragino Sans GB","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  function create(c,images){
    function round(r,color,radius){Art.rounded(c,...r,radius||24,color);}
    function gradient(r,colors){const g=c.createLinearGradient(0,r[1],0,r[1]+r[3]);colors.forEach((s,i)=>g.addColorStop(i/(colors.length-1),s));return g;}
    function words(value,x,y,size,color,align,max){c.save();c.font='700 '+size+'px '+font;let s=String(value);if(max&&c.measureText(s).width>max){while(s.length>1&&c.measureText(s+'…').width>max)s=s.slice(0,-1);s+='…';}c.textAlign=align||'left';c.textBaseline='middle';c.fillStyle=color||'#653715';c.fillText(s,x,y);c.restore();}
    function sprite(id,r){const image=images[id];if(!image)return;const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,s=Math.min(r[2]/iw,r[3]/ih);c.drawImage(image,r[0]+(r[2]-iw*s)/2,r[1]+(r[3]-ih*s)/2,iw*s,ih*s);}
    function skin(name,r){const spec=L.skins[name],im=spec&&images[spec.id];if(!im){round(r,gradient(r,['#fff0ce','#ecc28c']),24);return;}
      const sw=im.naturalWidth||im.width,sh=im.naturalHeight||im.height;
      const [l0,t0,r0,b0]=spec.slice,l=Math.min(l0,sw/2),rr=Math.min(r0,sw/2),t=Math.min(t0,sh/2),b=Math.min(b0,sh/2);
      const fit=Math.min(1,r[2]/(l+rr),r[3]/(t+b)),dl=l*fit,dr=rr*fit,dt=t*fit,db=b*fit;
      const xs=[0,l,sw-rr,sw],ys=[0,t,sh-b,sh],xd=[r[0],r[0]+dl,r[0]+r[2]-dr,r[0]+r[2]],yd=[r[1],r[1]+dt,r[1]+r[3]-db,r[1]+r[3]];
      for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(xs[x+1]>xs[x]&&ys[y+1]>ys[y]&&xd[x+1]>xd[x]&&yd[y+1]>yd[y])c.drawImage(im,xs[x],ys[y],xs[x+1]-xs[x],ys[y+1]-ys[y],xd[x],yd[y],xd[x+1]-xd[x],yd[y+1]-yd[y]);
    }
    function wood(r){c.save();round(r,gradient(r,['#efb16b','#d28e49','#a8652d']),27);c.clip();if(images['lobby-wood-grain']){c.globalAlpha=.16;for(let y=r[1];y<r[1]+r[3];y+=128)for(let x=r[0];x<r[0]+r[2];x+=128)c.drawImage(images['lobby-wood-grain'],x,y,128,128);c.globalAlpha=1;}c.strokeStyle='#ffe2aa';c.lineWidth=3;Art.rounded(c,r[0]+4,r[1]+4,r[2]-8,r[3]-8,24,'transparent');c.stroke();c.restore();}
    function outline(r,color,width,radius){c.save();c.strokeStyle=color;c.lineWidth=width||3;Art.rounded(c,...r,radius||24,'transparent');c.stroke();c.restore();}
    function check(x,y,size){c.save();c.strokeStyle='#5e8527';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(x-size/2,y);c.lineTo(x,y+size/2);c.lineTo(x+size,y-size/2);c.stroke();c.restore();}
    function chevron(x,y,d,size){c.save();c.strokeStyle='#a1622e';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(x-d*size/2,y-size);c.lineTo(x+d*size/2,y);c.lineTo(x-d*size/2,y+size);c.stroke();c.restore();}
    function ornament(x,y,flip){c.save();c.translate(x,y);c.scale(flip||1,1);c.strokeStyle='#bd7a39';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-25,0);c.bezierCurveTo(-6,14,18,8,18,-4);c.bezierCurveTo(18,-18,-6,-18,-4,-4);c.stroke();c.restore();}
    function meter(n,max,r){round(r,gradient(r,['#ba8047','#f0ce96']),r[3]/2);const p=Math.min(1,Math.max(0,n/max));if(p){const q=[r[0],r[1],Math.max(r[3],r[2]*p),r[3]];round(q,gradient(q,['#fff2a1','#ffca38','#eea316']),r[3]/2);}outline(r,'#ffeac3',2,r[3]/2);}
    function button(label,r,state){state=state||{};skin(state.kind==='primary'?'primary':state.kind==='tab'?(state.selected?'tabActive':'tabNormal'):'secondary',r);if(state.disabled){c.save();round(r,'#a98b6c66',Math.min(40,r[3]/2));c.restore();}words(label,r[0]+r[2]/2,r[1]+r[3]/2,state.size||32,state.disabled?(state.kind==='primary'?'#fff0cf':'#987b58'):state.kind==='primary'||state.kind==='tab'&&state.selected?'#fff0cf':'#683b18','center',r[2]-28);}
    return{round,gradient,words,sprite,skin,wood,outline,check,chevron,ornament,meter,button};
  }
  return{create};
});
