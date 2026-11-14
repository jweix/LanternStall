/* Modular alpha-preserving 2.5D art; no platform APIs or DOM. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.DapaidangStallArt=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const font='"HanziPen SC","Kaiti SC","STKaiti","PingFang SC",sans-serif';
function rounded(c,x,y,w,h,r,color){r=Math.min(r,w/2,h/2);c.fillStyle=color;c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function words(c,t,x,y,size,color){c.font='700 '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(t,x,y);}
function gradient(c,y,h,colors){const g=c.createLinearGradient(0,y,0,y+h);colors.forEach(([p,color])=>g.addColorStop(p,color));return g;}
function button(c,rect,primary,disabled){
 const [x,y,w,h]=rect,r=Math.min(26,h*.25);c.save();c.shadowColor='#65351c55';c.shadowBlur=8;c.shadowOffsetY=6;
 rounded(c,x,y+7,w,h-4,r,'#9d5628');c.shadowColor='transparent';
 const colors=primary?[[0,'#ffe6af'],[.24,'#f8cc87'],[.7,'#eab16a'],[1,'#d3904c']]:[[0,'#fff5db'],[.25,'#ffebc8'],[.8,'#f5d7a9'],[1,'#e0ae73']];
 rounded(c,x,y,w,h,r,gradient(c,y,h,colors));c.strokeStyle='#fff7df';c.lineWidth=2.5;c.beginPath();c.moveTo(x+r,y+4);c.lineTo(x+w-r,y+4);c.quadraticCurveTo(x+w-4,y+4,x+w-4,y+r);c.stroke();
 if(disabled)rounded(c,x,y,w,h,r,'#ad927b44');c.restore();
}
function sprite(c,images,id,x,y,w,h,shadow){
 const im=images[id];if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(w/iw,h/ih);c.save();
 if(shadow){c.shadowColor='#40231566';c.shadowBlur=8;c.shadowOffsetY=5;}
 c.drawImage(im,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s);c.restore();
}
function item(c,images,slot,theme,box){
 const [x,y,w,h]=box;const bg=images['stall-night-'+theme]?'stall-night-'+theme:'stall-night';sprite(c,images,slot==='background'?bg:'stall-'+theme+'-'+slot,x,y,w,h,true);
 const accent={warm:'#b67b45',bamboo:'#6c875c',sea:'#5e8995',festival:'#9b6f8d'}[theme];
 if(accent&&(slot==='wok'||slot==='plate')){
  c.save();c.strokeStyle=accent;c.lineWidth=Math.max(1.5,w*.023);c.beginPath();
  c.ellipse(x+w*.48,y+h*(slot==='wok'?.66:.51),w*(slot==='wok'?.30:.32),h*(slot==='wok'?.22:.36),0,.18,Math.PI*1.94);c.stroke();c.restore();
 }
}
function chef(c,x,y,s,theme,images){
 if(images){sprite(c,images,'stall-'+theme.id+'-chef',x-50*s,y-72*s,100*s,158*s);return;}
 c.save();c.translate(x,y);c.scale(s,s);rounded(c,-33,3,66,80,20,gradient(c,3,80,[[0,'#efc68b'],[.25,theme.color],[1,'#823e2b']]));
 ellipse(c,0,-8,29,32,gradient(c,-40,64,[[0,'#ffe2b6'],[1,'#d99c65']]));rounded(c,-33,-42,66,17,5,'#fff0d2');
 for(const dx of [-20,0,20])ellipse(c,dx,-48,18,19,'#fff5e0');ellipse(c,-9,-10,2.5,3.5,'#66452d');ellipse(c,9,-10,2.5,3.5,'#66452d');c.restore();
}
function scene(c,images,a,box,options){
 const [x,y,w,h]=box,o=options||{};c.save();rounded(c,x,y,w,h,26,'#263b3b');c.clip();
 const backdrop=images['stall-night-'+a.background.id]||images['stall-night'];if(backdrop){const s=Math.max(w/backdrop.width,h/backdrop.height);c.drawImage(backdrop,x+(w-backdrop.width*s)/2,y+(h-backdrop.height*s)/2,backdrop.width*s,backdrop.height*s);}
 if(a.background.id==='festival'){c.save();c.globalAlpha=.15;rounded(c,x,y,w,h*.64,25,a.background.night);c.restore();}
 // One uniform transform preserves every sprite's proportions in previews and photos.
 const s=Math.min(w/928,h/790);c.translate(x+(w-928*s)/2,y+(h-790*s)/2);c.scale(s,s);
 ellipse(c,474,701,364,45,'#40261645');
 sprite(c,images,'stall-'+a.chef.id+'-chef',540,326,138,224);
 sprite(c,images,'stall-body',126,176,676,546,true);
 sprite(c,images,'stall-'+a.awning.id+'-awning',85,130,758,220,true);
 sprite(c,images,'stall-sign',287,64,354,180,true);words(c,'家常现炒',464,170,43,'#8c3b20');
 if(a.awning.style>=2){c.save();c.globalAlpha=.7;for(const xx of [193,313,433,553,673])rounded(c,xx,254,4,38,2,'#fff2b0');c.restore();}
 for(const xx of [144,714]){
  const glow=c.createRadialGradient(xx+34,321,2,xx+34,321,102);glow.addColorStop(0,'#ffdc8a44');glow.addColorStop(1,'#ffdc8a00');ellipse(c,xx+34,321,102,102,glow);
  sprite(c,images,'stall-'+a.lamp.id+'-lamp',xx,244,69,152,true);
 }
 if(a.lamp.style>0)for(const xx of [303,464,625]){ellipse(c,xx,305,7,9,a.lamp.light);rounded(c,xx-2,288,4,9,1,'#996332');}
 // Each equipment slot is independent, so one preview cannot replace a whole skin.
 for(const [i,id]of ['tomato','egg','shiitake'].entries())sprite(c,images,id,260+i*61,476,55,50);
 item(c,images,'wok',a.wok.id,[641,471,122,90]);
 sprite(c,images,'stall-'+a.tables.id+'-tables',61,548,320,224,true);
 item(c,images,'plate',a.plate.id,[137,581,125,74]);sprite(c,images,'d01',147,586,105,59);
 sprite(c,images,'stall-'+a.menu.id+'-menu',691,574,126,167,true);words(c,'今日家常',754,631,18,'#794323');words(c,'热乎上桌',754,663,17,'#99643a');
 sprite(c,images,'stall-'+a.ornament.id+'-ornament',565,605,111,144,true);
 if(a.tables.style>1)ellipse(c,206,632,54,5,a.tables.color+'66');
 if(o.wallet!==undefined){button(c,[339,237,250,54],false,false);words(c,'金币 '+o.wallet.toLocaleString(),464,265,29,'#60331b');}
 c.restore();
}
function icon(c,images,name,box,theme){
 const map={home:'awning',decor:'chef',recipes:'menu',market:'lamp',photo:'menu',map:'menu'};item(c,images,map[name]||name,theme||'warm',box);
 if(name==='recipes'){const [x,y,w,h]=box;for(let i=0;i<3;i++)rounded(c,x+w*.32,y+h*(.30+i*.12),w*(i===2?.21:.34),Math.max(1,h*.023),1,'#a6794e');}
}
return{scene,chef,rounded,ellipse,sprite,item,icon,button,font};
});
