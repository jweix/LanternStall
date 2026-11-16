/* Independent visual inspection of the same scene graph shipped on both platforms. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const C=require('../shared/data/progression.js'),Scene=require('../shared/rendering/lobby-scene.js');
const font='/System/Library/Fonts/Hiragino Sans GB.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'LayerLabels');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=path.join(root,'previews');fs.mkdirSync(out,{recursive:true});
  const index=require('../shared/assets/runtime/asset-index.json');
  const images=Object.fromEntries(await Promise.all(Object.entries(index).map(async([id,a])=>[id,await loadImage(path.join(root,'shared/assets/runtime',path.basename(a.path)))])));
  const base=Object.fromEntries(C.slots.map(s=>[s,C.byTheme.base])),canvas=createCanvas(928,840),c=canvas.getContext('2d'),scene=Scene.create(c,images);
  const audit=scene.audit(base);if(audit.missing.length)throw Error('Missing base layers: '+audit.missing.join(','));
  const seaLamp=Object.assign({},base,{lamp:C.byTheme.sea});
  const sheet=createCanvas(1000,1036),sc=sheet.getContext('2d');sc.fillStyle='#193737';sc.fillRect(0,0,sheet.width,sheet.height);
  const groups=[['完整基础组合',base,audit.layers.map(n=>n.id)],['固定插画与前沿遮挡',base,audit.layers.filter(n=>n.group==='fixed').map(n=>n.id)],['可换装层（位置不变）',base,audit.layers.filter(n=>n.group==='equipment').map(n=>n.id)],['只替换灯具，其余层保留',seaLamp,audit.layers.map(n=>n.id)]];
  for(const [i,[title,appearance,ids]]of groups.entries()){
    c.clearRect(0,0,928,840);for(let y=0;y<840;y+=24)for(let x=0;x<928;x+=24){c.fillStyle=(x/24+y/24)%2?'#dfd5be':'#f6eedb';c.fillRect(x,y,24,24);}
    scene.draw(appearance,[0,0,928,840],{background:ids.includes('environment'),onlyLayers:ids});
    const x=i%2*500+18,y=Math.floor(i/2)*510+54;sc.drawImage(canvas,x,y,464,420);
    sc.fillStyle='#ffe9c7';sc.font='700 23px "LayerLabels",sans-serif';sc.textAlign='center';sc.fillText(title,x+232,y-18);
  }
  fs.writeFileSync(path.join(out,'lobby-layer-composition.png'),sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'lobby-layer-manifest.json'),JSON.stringify(audit,null,2)+'\n');
  fs.copyFileSync(path.join(__dirname,'lobby-layer-review.html'),path.join(out,'lobby-layer-review.html'));
  console.log('Rendered '+audit.layers.length+' registered layers, fixed groups and single-slot replacement; no player save touched');
})();
