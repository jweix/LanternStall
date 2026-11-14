/* Pure scene compositor. No UI frames, controls, snapshots or player mutation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./stall-art.js'),require('../data/lobby-layout.js'));else root.DapaidangLobbyScene=factory(root.DapaidangStallArt,root.DapaidangLobbyLayout);})(typeof globalThis!=='undefined'?globalThis:this,function(Art,L){
  'use strict';
  function create(c,images){
    function sprite(id,r){Art.sprite(c,images,id,...r);}
    function backdrop(theme,r){const key=theme==='base'?'lobby-environment-night':theme==='bamboo'?'stall-night-bamboo':theme==='sea'?'stall-night-sea':'stall-night';const im=images[key]||images['stall-night'];if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.max(r[2]/iw,r[3]/ih);c.drawImage(im,r[0]+(r[2]-iw*s)/2,r[1]+(r[3]-ih*s)/2,iw*s,ih*s);if(theme==='festival'){c.fillStyle='#54456622';c.fillRect(...r);}}
    function item(slot,theme,r){
      const map={lamp:'lobby-lamp-'+theme,awning:'lobby-scene-awning-'+theme,chef:'lobby-scene-chef-'+theme,tables:'lobby-scene-stool-'+theme};
      if(map[slot]&&images[map[slot]])sprite(map[slot],r);else Art.item(c,images,slot,theme,r);
    }
    function draw(a,rect,options){
      options=options||{};const p=L.scene; c.save();Art.rounded(c,...rect,options.rounded===false?0:27,options.background===false?'transparent':'#263f3c');c.clip();
      if(options.background!==false)backdrop(a.background.id,rect);
      const s=Math.min(rect[2]/p.width,rect[3]/p.height),x=rect[0]+(rect[2]-p.width*s)/2,y=rect[1]+(rect[3]-p.height*s)/2;
      c.translate(x,y);c.scale(s,s);
      c.fillStyle='#4728173b';c.beginPath();c.ellipse(464,754,360,42,0,0,Math.PI*2);c.fill();
      // Counter is fixed architecture. Character and every outfit slot are real
      // independent sprites, including the default outfit.
      sprite('lobby-scene-counter',p.counter);
      c.save();c.beginPath();c.rect(0,0,p.width,554);c.clip();item('chef',a.chef.id,p.chef);c.restore();
      item('awning',a.awning.id,p.awning);
      sprite('stall-sign',p.sign);
      c.save();c.fillStyle='#82401d';c.font='700 39px "Hiragino Sans GB","PingFang SC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('家常现炒',464,211);c.restore();
      for(const r of p.lamps){c.save();const g=c.createRadialGradient(r[0]+r[2]/2,r[1]+r[3]/2,3,r[0]+r[2]/2,r[1]+r[3]/2,83);g.addColorStop(0,'#ffcf6038');g.addColorStop(1,'#ffcf6000');c.fillStyle=g;c.beginPath();c.ellipse(r[0]+r[2]/2,r[1]+r[3]/2,83,83,0,0,Math.PI*2);c.fill();c.restore();item('lamp',a.lamp.id,r);}
      sprite('scallion',[180,471,84,77]);sprite('tomato',[151,482,65,66]);
      c.save();c.fillStyle=a.plate.id==='base'?'#fff0ce':a.plate.color;c.beginPath();c.ellipse(p.plate[0]+87,p.plate[1]+53,78,28,0,0,Math.PI*2);c.fill();c.restore();sprite('d01',p.plate);
      item('wok',a.wok.id,p.wok);for(const [i,id] of ['chicken','shiitake','scallion','chicken'].entries())sprite(id,[p.wok[0]+44+i*24,p.wok[1]+49+(i%2)*6,34,30]);
      item('menu',a.menu.id,p.menu);
      item('ornament',a.ornament.id,p.ornament);
      p.stools.forEach(r=>item('tables',a.tables.id,r));
      c.restore();
    }
    return{draw,backdrop,item};
  }
  return{create};
});
