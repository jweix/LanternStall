/* Complete base composition with in-place equipment replacement. No UI or platform APIs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./stall-art.js'),require('../data/lobby-layout.js'));else root.DapaidangLobbyScene=factory(root.DapaidangStallArt,root.DapaidangLobbyLayout);})(typeof globalThis!=='undefined'?globalThis:this,function(Art,L){
  'use strict';
  const prefixes={lamp:'lobby-lamp-',awning:'lobby-scene-awning-',chef:'lobby-scene-chef-',tables:'lobby-scene-stool-',ornament:'lobby-plant-',wok:'lobby-wok-',plate:'lobby-plate-'};
  const anchors={lamp:[.5,0],awning:[.5,0],chef:[.5,1],tables:[.5,1],ornament:[.5,1],menu:[.5,1],wok:[.5,1],plate:[.5,.5]};
  function equipmentAsset(slot,theme){if(slot==='lamp'&&theme==='base')return'lobby-bulb';return prefixes[slot]?prefixes[slot]+theme:'stall-'+theme+'-'+slot;}
  function environmentAsset(theme){return theme==='star'||theme==='harvest'?'lobby-environment-'+theme:theme==='base'||theme==='warm'?'lobby-environment-night':theme==='bamboo'?'stall-night-bamboo':theme==='sea'?'stall-night-sea':'stall-night';}
  function create(c,images,assetIndex){
    const p=L.scene;let equipmentBounds={};
    function themeOf(a,slot){return a&&a[slot]&&a[slot].id||'base';}
    function resolveEquipment(slot,theme){
      const baseAsset=equipmentAsset(slot,'base'),wanted=equipmentAsset(slot,theme);
      // Missing a skin must leave the registered base object visible.
      return {asset:images[wanted]?wanted:baseAsset,baseAsset,theme:images[wanted]?theme:'base',requestedTheme:theme};
    }
    function boxOf(layer){const r=layer.rect||p[layer.box];return r?(layer.instance===undefined?r:r[layer.instance]).slice():null;}
    function layers(a){
      return p.layers.map(spec=>{
        const node=Object.assign({},spec,{rect:boxOf(spec),anchor:(spec.anchor||[.5,.5]).slice()});
        if(node.kind==='equipment'||node.kind==='plate'){
          Object.assign(node,resolveEquipment(node.slot,themeOf(a,node.slot)));
          if(node.slot==='awning')node.anchor=[.5,1];
          if(node.basePrefix){node.baseAsset=node.basePrefix+'base';node.asset=images[node.basePrefix+node.theme]?node.basePrefix+node.theme:node.baseAsset;}
        }
        else if(node.kind==='environment'){
          node.requestedTheme=themeOf(a,'background');const wanted=environmentAsset(node.requestedTheme);
          node.asset=images[wanted]?wanted:'lobby-environment-night';node.baseAsset='lobby-environment-night';
          node.theme=images[wanted]?node.requestedTheme:'base';
        }
        return node;
      }).sort((a,b)=>a.z-b.z);
    }
    function audit(a){
      const list=layers(a);
      return {width:p.width,height:p.height,layers:list,
        missing:list.filter(n=>n.asset&&!images[n.asset]).map(n=>n.id),
        fallbacks:list.filter(n=>n.requestedTheme&&n.theme!==n.requestedTheme).map(n=>n.id)};
    }
    function registeredRect(asset,baseAsset,r,anchor,hanger){
      const im=images[asset];if(!im)return null;
      const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,b=assetIndex?.[asset]?.contentBounds||[0,0,iw,ih],s=Math.min(r[2]/b[2],r[3]/b[3]);
      const pivot=hanger?[.5,0]:anchor;
      return[r[0]+r[2]*pivot[0]-b[2]*s*pivot[0],r[1]+r[3]*pivot[1]-b[3]*s*pivot[1],b[2]*s,b[3]*s];
    }
    function visibleSprite(asset,r){const im=images[asset];if(!im)return;const b=assetIndex?.[asset]?.contentBounds||[0,0,im.naturalWidth||im.width,im.naturalHeight||im.height];c.drawImage(im,...b,...r);}
    function sprite(asset,r){Art.sprite(c,images,asset,...r);}
    function drawEquipment(node){
      const r=registeredRect(node.asset,node.baseAsset,node.rect,node.anchor,node.slot==='lamp');if(!r)return;
      if(node.slot==='wok'||node.slot==='plate')equipmentBounds[node.slot]={rect:r,theme:node.theme};
      if(node.slot==='menu'&&node.theme==='base')return;
      if(node.slot==='tables'||node.slot==='ornament'){c.save();c.fillStyle='#39231938';c.beginPath();c.ellipse(r[0]+r[2]/2,r[1]+r[3]-1,r[2]*.40,Math.max(4,r[3]*.045),0,0,Math.PI*2);c.fill();c.restore();}
      visibleSprite(node.asset,r);
    }
    function item(slot,theme,r){
      // Landscape and portrait environments share the same thumbnail window;
      // crop the view with cover rather than making one theme a narrow strip.
      if(slot==='background'){c.save();c.beginPath();c.rect(...r);c.clip();backdrop(theme,r);c.restore();return;}
      const key=resolveEquipment(slot,theme).asset,im=images[key];if(!im)return;
      // A thumbnail is centered in its own box. Scene hanger/floor registration
      // is deliberately reserved for the assembled stall, never a content card.
      const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,b=assetIndex&&assetIndex[key]&&assetIndex[key].contentBounds||[0,0,iw,ih],s=Math.min(r[2]/b[2],r[3]/b[3]);
      c.drawImage(im,b[0],b[1],b[2],b[3],r[0]+(r[2]-b[2]*s)/2,r[1]+(r[3]-b[3]*s)/2,b[2]*s,b[3]*s);
    }
    function backdrop(theme,r){
      const requested=environmentAsset(theme),key=images[requested]?requested:'lobby-environment-night',im=images[key]||images['stall-night'];if(!im)return;
      const riverside=['lobby-environment-night','stall-night','stall-night-bamboo','stall-night-sea'].includes(key),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
      // Keep the river on the far side of the wooden deck. The tall home
      // framing and the dressing camera use different source windows.
      const landscape=r[2]>r[3],sy=riverside&&landscape?ih*370/1774:0,sh=riverside&&landscape?ih*650/1774:ih,s=Math.max(r[2]/iw,r[3]/sh);
      c.drawImage(im,0,sy,iw,sh,r[0]+(r[2]-iw*s)/2,r[1]+(r[3]-sh*s)/2,iw*s,sh*s);
      if(!landscape&&iw>ih){
        // A landscape environment needs a wider middle-distance view on the
        // tall home canvas. Keep both neighbouring booths, then blend only
        // sky/deck at the edges into the same environment's full-height view.
        const scale=r[2]/iw,h=ih*scale,y=r[1]+r[3]*.205,fade=h*.10;
        c.save();c.beginPath();c.rect(r[0],y+fade,r[2],h-2*fade);c.clip();c.drawImage(im,r[0],y,r[2],h);c.restore();
        for(let i=0;i<8;i++){
          const a=(i+.5)/8,band=fade/8;
          for(const top of [true,false]){const by=top?y+i*band:y+h-(i+1)*band;c.save();c.globalAlpha=a;c.beginPath();c.rect(r[0],by,r[2],band+.1);c.clip();c.drawImage(im,r[0],y,r[2],h);c.restore();}
        }
      }
    }
    const commands={
      sprite(n){
        if(n.id==='sign'){const r=registeredRect(n.asset,n.asset,n.rect,[.5,0],false);if(r)visibleSprite(n.asset,r);return;}
        const slot=n.id==='wok-food'?'wok':n.id==='prepared-dish'?'plate':null,parent=equipmentBounds[slot],mount=parent&&p.foodMounts[slot]?.[parent.theme];
        if(!mount){sprite(n.asset,n.rect);return;}
        const r=parent.rect;sprite(n.asset,[r[0]+r[2]*mount[0],r[1]+r[3]*mount[1],r[2]*mount[2],r[3]*mount[3]]);
      },equipment:drawEquipment,
      'ground-shadow'(){c.fillStyle='#47281722';c.beginPath();c.ellipse(443,680,360,18,0,0,Math.PI*2);c.fill();},
      'lamp-glow'(n){const r=n.rect,x=r[0]+r[2]/2,y=r[1]+r[3]/2,g=c.createRadialGradient(x,y,3,x,y,83);g.addColorStop(0,'#ffcf6038');g.addColorStop(1,'#ffcf6000');c.fillStyle=g;c.beginPath();c.ellipse(x,y,83,83,0,0,Math.PI*2);c.fill();},
      plate:drawEquipment,
    };
    function draw(a,rect,options){
      options=options||{};equipmentBounds={};const list=layers(a),visible=n=>!options.onlyLayers||options.onlyLayers.includes(n.id);
      c.save();Art.rounded(c,...rect,options.rounded===false?0:27,options.background===false?'transparent':'#263f3c');c.clip();
      const environment=list.find(n=>n.kind==='environment');
      if(options.background!==false&&visible(environment))backdrop(environment.theme,rect);
      const s=Math.min(rect[2]/p.width,rect[3]/p.height),x=rect[0]+(rect[2]-p.width*s)/2,y=rect[1]+(rect[3]-p.height*s)/2;
      c.translate(x,y);c.scale(s,s);
      for(const original of list){
        const node=Object.assign({},original);
        if(node.kind==='environment'||!visible(node))continue;
        if(!commands[node.kind])throw new Error('Unknown scene layer: '+node.id);
        c.save();
        if(node.clip){const edge=p.counterFrontY;c.beginPath();if(node.clip==='counter-rear')c.rect(0,0,p.width,edge);else c.rect(0,edge,p.width,p.height-edge);c.clip();}
        commands[node.kind](node);c.restore();
      }
      c.restore();
    }
    return{draw,backdrop,item,layers,audit,registeredRect};
  }
  return{create};
});
