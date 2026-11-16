// Explicit source-authoring only. Runtime export remains manifest-only.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,Path2D}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'shared/assets/lobby'),master=path.join(folder,'source/master');
(async()=>{
 const exports=JSON.parse(fs.readFileSync(path.join(folder,'generation-v6.json'))).outputs;
 for(const a of exports){const dest=path.join(folder,a.file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(a.source))fs.copyFileSync(a.source,dest);else if(!fs.existsSync(dest))throw Error('Missing authored source: '+a.file);}
 const ref=await loadImage(path.join(root,'reference/lobby-redesign-2026-11-14/01-小摊首页.png'));
 function softenHoles(canvas,holes,ox,oy){const cx=canvas.getContext('2d'),im=cx.getImageData(0,0,canvas.width,canvas.height);for(const [x,y,w,h]of holes){const l=x-ox-2,t=y-oy-2,r=l+w+4,b=t+h+4;for(let yy=Math.max(0,Math.floor(t-8));yy<Math.min(canvas.height,b+8);yy++)for(let xx=Math.max(0,Math.floor(l-8));xx<Math.min(canvas.width,r+8);xx++){const distance=Math.hypot(Math.max(l-xx,0,xx-r),Math.max(t-yy,0,yy-b));if(distance<8)im.data[(yy*canvas.width+xx)*4+3]*=distance/8;}}cx.putImageData(im,0,0);}
 const cv=createCanvas(887,1774),c=cv.getContext('2d'),env=await loadImage(path.join(folder,'source/scene/v6/env.png'));
 c.drawImage(env,0,0,887,1774);
 // Preserve all unobstructed environment pixels; inpainting supplies occluded areas only.
 const keep=createCanvas(887,1774),k=keep.getContext('2d');k.drawImage(ref,0,0);
 // Object bounds include hidden rear posts, stool holes and the decor button;
 // these must not survive as fragments in a different preview camera.
 const excluded=[[0,0,887,63],[18,42,181,89],[661,109,212,70],[715,44,153,55],[136,35,615,319],[19,120,140,262],[728,120,140,262],[285,334,320,45],
  [68,447,752,194],[287,398,314,185],[91,620,70,295],[228,620,36,278],[687,620,43,278],[724,620,73,295],[148,625,117,44],[634,625,162,44],
  [155,628,69,72],[673,628,69,72],[354,626,302,270],[143,719,184,187],[227,863,149,72],[369,832,225,96],[342,742,71,122],[75,875,740,246],
  [131,1016,153,143],[264,1021,149,139],[641,943,163,174],[605,1083,263,89],[26,1177,837,177],[109,1367,668,184],[355,1551,183,50],[0,1608,887,166]];
 const pixels=k.getImageData(0,0,887,1774),d=pixels.data;
 for(let y=0;y<1774;y++)for(let x=0;x<887;x++){
  let alpha=1;for(const [bx,by,bw,bh]of excluded){const dx=Math.max(bx-x,0,x-bx-bw),dy=Math.max(by-y,0,y-by-bh),dist=Math.hypot(dx,dy);alpha=Math.min(alpha,Math.min(1,dist/10));}d[(y*887+x)*4+3]=Math.round(alpha*255);
 }
 k.putImageData(pixels,0,0);c.drawImage(keep,0,0);
 fs.writeFileSync(path.join(folder,'source/scene/v6/environment-preserved.png'),cv.toBuffer('image/png'));
 // The generated underlay restores only wood hidden by equipment in the master.
 const cc=createCanvas(735,499),ct=cc.getContext('2d'),counter=await loadImage(path.join(folder,'source/scene/v6/counter.png'));ct.drawImage(counter,0,0,735,499);
 ct.drawImage(ref,231,672,29,47,155,0,29,268);ct.drawImage(ref,692,704,33,70,616,0,33,268);
 ct.drawImage(ref,110,700,30,60,84,12,65,18);ct.drawImage(ref,110,700,30,60,616,12,47,18);
 const support=createCanvas(735,499);support.getContext('2d').drawImage(cc,0,0);
 const wood=createCanvas(735,499),wc=wood.getContext('2d');wc.drawImage(ref,-76,-620);
 const mask=createCanvas(735,499),m=mask.getContext('2d');m.translate(-76,-620);
 m.fill(new Path2D('M96 623 Q122 635 155 624 L154 878 Q161 881 159 902 L149 914 L98 914 L95 903 Z M730 623 Q761 634 791 622 L792 901 L781 913 L732 912 L724 900 L730 879 Z M96 888 Q76 897 77 923 Q77 944 98 951 L99 1069 Q86 1076 87 1093 Q87 1114 115 1115 L777 1115 Q800 1111 800 1090 L799 956 Q815 946 811 922 Q811 898 790 889 L774 914 L113 913 Z'));
 m.fillRect(230,623,31,265);m.fillRect(691,623,36,265);m.fillRect(150,630,111,33);m.fillRect(691,630,48,33);
 const homeHoles=[[135,1019,145,132],[267,1024,143,130],[645,946,156,164],[229,865,145,67],[372,834,219,93],[608,1084,257,87],[145,721,180,183],[158,631,63,65],[676,631,63,65]];
 m.resetTransform();for(const [x,y,w,h]of homeHoles)m.clearRect(x-78,y-622,w+4,h+4);softenHoles(mask,homeHoles,76,620);
 wc.globalCompositeOperation='destination-in';wc.drawImage(mask,0,0);const wi=wc.getImageData(0,0,735,499);for(let yy=0;yy<255;yy++)for(let xx=0;xx<735;xx++){const i=(yy*735+xx)*4;if(wi.data[i]<wi.data[i+1]&&wi.data[i+2]>wi.data[i]*1.1)wi.data[i+3]=0;}wc.putImageData(wi,0,0);ct.drawImage(wood,0,0);ct.globalCompositeOperation='destination-in';ct.drawImage(support,0,0);ct.globalCompositeOperation='source-over';
 fs.writeFileSync(path.join(folder,'source/scene/v6/counter-preserved.png'),cc.toBuffer('image/png'));
 // The supplied preview uses a lower, wider counter projection. Preserve that
 // authored structure rather than stretching the home structure to fit it.
 const decorRef=await loadImage(path.join(root,'reference/lobby-redesign-2026-11-14/02-小摊装扮.png')),dc=createCanvas(503,312),dx=dc.getContext('2d');dx.drawImage(counter,0,0,503,312);
 dx.drawImage(ref,231,672,29,47,91,0,20,166);dx.drawImage(ref,692,704,33,70,415,0,22,166);
 const previewSupport=createCanvas(503,312);previewSupport.getContext('2d').drawImage(dc,0,0);
 const dw=createCanvas(503,312),dwx=dw.getContext('2d');dwx.drawImage(decorRef,-193,-588);const dm=createCanvas(503,312),dmx=dm.getContext('2d');dmx.translate(-193,-588);
 dmx.fill(new Path2D('M206 589 L246 590 L245 755 L234 772 L207 769 Z M634 590 L674 590 L674 767 L639 768 Z M208 752 L679 752 Q696 757 696 779 Q695 794 682 798 L684 877 Q694 883 690 894 L677 901 L213 901 Q195 897 194 884 L205 877 L205 802 Q193 795 193 781 Q192 761 208 752 Z'));
 dmx.fillRect(283,590,21,166);dmx.fillRect(608,590,22,166);
 const previewHoles=[[240,674,139,104],[315,747,85,41],[397,728,136,57],[240,837,90,85],[330,839,90,84],[552,792,116,122],[54,851,150,51],[229,590,71,124],[595,590,71,124]];
 dmx.resetTransform();for(const [x,y,w,h]of previewHoles)dmx.clearRect(x-195,y-590,w+4,h+4);softenHoles(dm,previewHoles,193,588);
 dwx.globalCompositeOperation='destination-in';dwx.drawImage(dm,0,0);const di=dwx.getImageData(0,0,503,312);for(let yy=0;yy<164;yy++)for(let xx=0;xx<503;xx++){const i=(yy*503+xx)*4;if(di.data[i]<di.data[i+1]&&di.data[i+2]>di.data[i]*1.1)di.data[i+3]=0;}dwx.putImageData(di,0,0);dx.drawImage(dw,0,0);dx.globalCompositeOperation='destination-in';dx.drawImage(previewSupport,0,0);dx.globalCompositeOperation='source-over';fs.writeFileSync(path.join(folder,'source/scene/v6/counter-preview.png'),dc.toBuffer('image/png'));
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json')));
 function asset(id,file,w,h,extra={}){let a=manifest.assets.find(a=>a.id===id);const item={id,file,kind:file.includes('/ui/')?'ui':file.includes('/icons/')?'icon':'scene',maxSize:[w,h],...extra};if(a)Object.assign(a,item);else{a=item;manifest.assets.push(a);}for(const key of ['crop','slice','trim','format','truecolor'])if(!(key in item))delete a[key];return a;}
 const generatedUI=[['lobby-button-primary','primary',670,185],['lobby-button-secondary','secondary',255,84],['lobby-card','card',394,308],['lobby-tab-active','tab-active',283,86],['lobby-tab-normal','tab-normal',283,86],['lobby-wish-panel','wish',831,176],['lobby-nav-base','nav-base',887,163],['lobby-nav-selected','nav-selected',215,137],['lobby-content-panel','panel-decor',640,1037],['lobby-panel-recipes','panel-recipes',640,1005],['lobby-panel-market','panel-market',640,1030]];
 for(const [id,name,w,h]of generatedUI)asset(id,'source/ui/v6/'+name+'.png',w,h,{trim:true,cleanAlpha:true,...(['lobby-content-panel','lobby-panel-recipes','lobby-panel-market','lobby-nav-base'].includes(id)?{format:'jpeg-shape'}:{})});
 asset('lobby-banner-environment','source/scene/v6/banner.png',837,239,{format:'jpeg'});
 asset('lobby-environment-night','source/scene/v6/environment-final.png',887,1774,{format:'jpeg'});
 asset('lobby-scene-counter','source/scene/v6/counter-preserved.png',735,499);
 asset('lobby-counter-preview','source/scene/v6/counter-preview.png',503,312);
 function original(id,name,kind='scene',extra={}){
  const record=require(path.join(master,'extraction.json')).assets.find(a=>a.name===name),file='source/'+kind+'/v6/'+name+'.png';fs.mkdirSync(path.dirname(path.join(folder,file)),{recursive:true});fs.copyFileSync(path.join(master,name+'.png'),path.join(folder,file));return asset(id,file,record.box[2],record.box[3],extra);
 }
 for(const [id,name]of [['lobby-scene-chef','chef'],['lobby-scene-awning','awning'],['lobby-scene-stool','stool-left'],['lobby-stool-right','stool-right'],['lobby-stall-sign','sign'],['lobby-prep-rack','prep-rack'],['lobby-plant','plant'],['lobby-plated-dish','plate-dish'],['lobby-wok','wok'],['lobby-bulb','bulb'],['lobby-lamp-base','lamp-red'],['lobby-lamp-warm','lamp-flower']])original(id,name);
 for(const [id,name]of [['lobby-prepared-food','prepared-food'],['lobby-wok-food','wok-food'],['lobby-steam','steam'],['lobby-fire','fire']])original(id,name);
 original('lobby-prep-rack-preview','prep-rack-preview');
 original('lobby-banner-lamp','banner-lamp');
 // Preserve the original leaves, rim and decoration; only its UI-occluded base
 // is taken from the edited underlay.
 const plant=await loadImage(path.join(master,'plant.png')),under=await loadImage(path.join(folder,'source/scene/v6/plant-complete.png')),pc=createCanvas(156,164),px=pc.getContext('2d');
 px.drawImage(under,0,0,156,164);px.clearRect(0,0,156,132);const front=createCanvas(156,164),pf=front.getContext('2d');pf.drawImage(plant,0,0);const pi=pf.getImageData(0,0,156,164);for(let yy=130;yy<164;yy++)for(let xx=0;xx<156;xx++)pi.data[(yy*156+xx)*4+3]*=Math.max(0,(138-yy)/8);pf.putImageData(pi,0,0);px.drawImage(front,0,0);
 fs.writeFileSync(path.join(folder,'source/scene/v6/plant-preserved.png'),pc.toBuffer('image/png'));asset('lobby-plant','source/scene/v6/plant-preserved.png',156,164);
 asset('lobby-plate','source/scene/v6/plate-empty.png',145,67,{trim:true,cleanAlpha:true});asset('lobby-wok','source/scene/v6/wok-empty.png',219,80,{trim:true,cleanAlpha:true});
 original('lobby-header-awning','header-awning','brand');original('lobby-rope','rope','brand');
 original('lobby-brand-compact','brand-compact','brand');
 original('lobby-lantern-rope','lantern-rope','brand');
 for(const name of ['coin','sound','settings','brush','cloud','title-cloud'])original(name==='coin'?'lobby-coin':'lobby-icon-'+name,name,'icons');
 for(const name of ['cloud-recipes','cloud-market'])original('lobby-icon-'+name,name,'icons');
 for(const name of ['home','decor','recipes','market']){original('lobby-nav-'+name,'nav-'+name,'icons');for(const suffix of ['','-selected'])original('lobby-art-nav-'+name+suffix,'nav-label-'+name+suffix,'brand');}
 for(const name of ['title-decor','subtitle-decor','title-recipes','title-market','label-play','label-decor','label-map'])original('lobby-art-'+name,name,'brand');
 for(const name of ['banner-title','banner-subtitle','book-0','book-1','book-2','book-3'])original('lobby-art-'+name,name,'brand');
 original('lobby-art-label-preview','label-preview','brand');
 for(const name of ['page-prev','page-next','category-lamp','category-awning','category-tables','category-ornament','category-menu']){
  const im=await loadImage(path.join(master,name+'.png')),page=name.startsWith('page-');
  for(const state of [false,true]){const cv=createCanvas(im.width,im.height),cx=cv.getContext('2d');cx.drawImage(im,0,0);cx.globalCompositeOperation='source-in';cx.fillStyle=page?(state?'#9d7a4c':'#683511'):(state?'#c2301e':'#70401c');cx.fillRect(0,0,im.width,im.height);const id=name+(state?(page?'-disabled':'-selected'):''),file='source/brand/v6/'+id+'.png';fs.writeFileSync(path.join(folder,file),cv.toBuffer('image/png'));asset('lobby-art-'+id,file,im.width,im.height);}
 }
 for(let i=0;i<6;i++){original('lobby-dish-'+i,'dish-'+i);original('lobby-art-dish-'+i,'dish-name-'+i,'brand');}
 // Page lettering remains individual transparent labels, never a strip of controls.
 const tabIds={'摊位':'stall','大厨':'chef','场景':'background','主题':'themes','菜谱':'recipes','成就':'achievements','相册':'photos','当期':'current','往期':'archive','每日':'daily'};
 for(const label of ['摊位','大厨','场景','主题','菜谱','成就','相册','当期','往期','每日']){
  const im=await loadImage(path.join(master,'tab-'+label+'.png'));
  for(const selected of [false,true]){
   const cv=createCanvas(im.width,im.height),cx=cv.getContext('2d');cx.drawImage(im,0,0);cx.globalCompositeOperation='source-in';cx.fillStyle=selected?'#fff1c8':'#66320f';cx.fillRect(0,0,im.width,im.height);
   const name='tab-'+tabIds[label]+(selected?'-selected':''),file='source/brand/v6/'+name+'.png';fs.writeFileSync(path.join(folder,file),cv.toBuffer('image/png'));asset('lobby-art-'+name,file,im.width,im.height);
  }
 }
 manifest.version=5;manifest.fonts.display.runtime=false;manifest.fonts.body.runtime=true;manifest.fonts.body.weight=500;manifest.generation.v6={mode:'原稿逻辑对象提取 + built-in image_gen 局部补底/空白底面',provenance:'generation-v6.json',extraction:'source/master/extraction.json'};
 manifest.assets=manifest.assets.filter(a=>!['lobby-steamer','lobby-plated-dish','lobby-wood-grain'].includes(a.id)&&!/[\u3400-\u9fff]/.test(a.id));
 // Later transparent-object repairs stay authoritative if source authoring is
 // repeated. Normal builds still read only the independent manifest.
 const repairs=path.join(folder,'generation-v8.json');
 if(fs.existsSync(repairs))for(const a of JSON.parse(fs.readFileSync(repairs)).assets)asset(a.id,a.file,...a.maxSize,{trim:true,cleanAlpha:true});
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Authored '+manifest.assets.length+' independent production components.');
})();
