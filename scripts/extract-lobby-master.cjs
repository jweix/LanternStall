// One-time authoring: preserve original illustration pixels in logical assets.
// Production/build never reads the page references or this authoring script.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,Path2D}=require(process.env.LANTERN_CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'shared/assets/lobby/source/master'),input=path.join(root,'tmp/lobby-v6-input');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(input,{recursive:true});
const refs=['01-小摊首页.png','02-小摊装扮.png','03-家常菜谱.png','04-夜市活动.png'];
const records=[];
(async()=>{
 const pages=await Promise.all(refs.map(f=>loadImage(path.join(root,'reference/lobby-redesign-2026-11-14',f))));
 function save(name,page,box,outline,options={}){
  const [x,y,w,h]=box,cv=createCanvas(w,h),c=cv.getContext('2d');
  c.drawImage(pages[page],-x,-y);
  if(outline){const mask=createCanvas(w,h),m=mask.getContext('2d');m.translate(-x,-y);m.fill(new Path2D(outline),'evenodd');c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';}
  if(name==='prep-rack'){
   const cut=createCanvas(w,h),cx=cut.getContext('2d');cx.translate(-x,-y);cx.fill(new Path2D('M231 893 Q237 883 260 880 Q270 867 285 870 Q301 862 317 872 Q342 872 352 885 Q369 888 372 897 Q372 912 341 922 Q297 938 254 921 Q229 912 231 893 Z'));c.globalCompositeOperation='destination-out';c.drawImage(cut,0,0);c.globalCompositeOperation='source-over';
  }
  if(name==='stool-left'||name==='stool-right'){
   const im=c.getImageData(0,0,w,h),d=im.data,left=name==='stool-left',feet=left?[[135,166],[205,248],[245,278]]:[[267,302],[326,373],[371,410]];
   // Below the braces each foot is one continuous piece of plastic. Keep its
   // connected red span and soft edge; reject isolated deck/shadow fragments.
   for(let yy=(left?1126:1129)-y;yy<h;yy++){
    const keep=new Uint8Array(w);
    for(const [lo,hi]of feet){let bestStart=-1,bestEnd=-1,start=-1;
     for(let xx=Math.max(0,lo-x);xx<=Math.min(w,hi-x);xx++){
      const i=(yy*w+xx)*4,r=d[i],g=d[i+1],blue=d[i+2],red=xx<w&&d[i+3]>0&&r>60&&r>g*2.7&&r>blue*3;
      if(red&&start<0)start=xx;
      if(!red&&start>=0){if(xx-start>bestEnd-bestStart){bestStart=start;bestEnd=xx;}start=-1;}
     }
     if(bestEnd-bestStart>=3)for(let xx=Math.max(0,bestStart-1);xx<Math.min(w,bestEnd+1);xx++)keep[xx]=1;
    }
    for(let xx=0;xx<w;xx++)if(!keep[xx])d[(yy*w+xx)*4+3]=0;
   }c.putImageData(im,0,0);
  }
  if(options.ink){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const light=options.ink==='light',k=light?Math.min(d[i]-130,d[i+1]-120,d[i+2]-80)/75:((name==='page-prev'?170:180)-d[i+1])/(name==='page-prev'?30:45);d[i+3]=Math.round(d[i+3]*Math.max(0,Math.min(1,k)));}c.putImageData(im,0,0);}
  if(name==='chef'){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const px=i/4%w+x,py=Math.floor(i/4/w)+y;if((d[i+2]>d[i]*1.35&&d[i+1]>d[i]*1.2)||(py>838&&px<545))d[i+3]=0;}c.putImageData(im,0,0);}
  if(name==='steam'){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const max=Math.max(d[i],d[i+1],d[i+2]),min=Math.min(d[i],d[i+1],d[i+2]),a=d[i]>100&&(max-min)<max*.30&&d[i]>=d[i+1]*.96&&d[i]>=d[i+2]*.96?Math.max(0,Math.min(.6,(d[i]-70)/210*.6)):0;d[i]=255;d[i+1]=236;d[i+2]=211;d[i+3]=Math.round(a*255);}c.putImageData(im,0,0);}
  if(name==='cloud'){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4)d[i+3]=d[i]>150&&d[i+1]>90?Math.round(Math.min(1,(d[i+1]-80)/40)*255):0;c.putImageData(im,0,0);}
  if(name==='cloud-recipes'){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4)d[i+3]=Math.round(Math.max(0,Math.min(1,(170-d[i+2])/35))*255);c.putImageData(im,0,0);}
  if(name==='prep-rack-preview'){const im=c.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const xx=i/4%w+x,yy=Math.floor(i/4/w)+y;if(d[i+2]>d[i]*1.2&&d[i+2]>d[i+1]*.8||xx>=314&&yy>=747)d[i+3]=0;}c.putImageData(im,0,0);}
  if(name==='lamp-flower'||name==='lamp-red'||name==='banner-lamp'){
   const im=c.getImageData(0,0,w,h),d=im.data,visited=new Uint8Array(w*h),queue=[];
   const outside=i=>d[i*4+3]===0||(name==='lamp-flower'?d[i*4]>220&&d[i*4+1]>185&&d[i*4+2]>140:d[i*4+2]>d[i*4]*1.2&&d[i*4+1]>d[i*4]*1.1);
   const add=i=>{if(!visited[i]&&outside(i)){visited[i]=1;queue.push(i);}};
   for(let xx=0;xx<w;xx++){add(xx);add((h-1)*w+xx);}for(let yy=0;yy<h;yy++){add(yy*w);add(yy*w+w-1);}
   for(let n=0;n<queue.length;n++){const i=queue[n],xx=i%w,yy=Math.floor(i/w);if(xx)add(i-1);if(xx<w-1)add(i+1);if(yy)add(i-w);if(yy<h-1)add(i+w);}
   for(const i of queue)d[i*4+3]=0;c.putImageData(im,0,0);
  }
  const file=path.join(options.input?input:out,name+'.png');fs.writeFileSync(file,cv.toBuffer('image/png'));records.push({name,reference:refs[page],box,outline:!!outline,ink:options.ink||null,authoringInput:!!options.input});
 }
 // Fixed illustrated objects. Bezier silhouettes keep their original edge pixels.
 save('sign',0,[289,401,310,181],'M292 509 Q300 478 337 473 L342 463 Q348 456 355 463 L429 416 Q430 403 444 403 Q459 404 462 418 L531 463 Q541 454 550 466 L549 475 Q590 485 597 521 Q602 552 578 566 Q568 574 545 577 Q441 563 349 578 Q300 581 292 550 Z');
 save('awning',0,[71,449,746,189],'M74 559 L130 476 Q129 451 151 450 L731 450 Q756 452 754 476 L812 556 Q819 566 814 585 L810 609 Q799 634 776 635 Q749 636 735 620 Q722 636 701 635 Q673 637 658 618 Q644 637 618 635 Q591 635 576 615 Q560 636 536 635 Q511 633 495 615 Q480 637 455 635 Q431 635 415 614 Q400 635 376 635 Q349 636 334 615 Q320 635 295 635 Q269 634 254 615 Q239 635 214 635 Q188 635 174 615 Q160 634 134 632 Q110 632 98 619 Q76 618 74 590 Z');
 save('chef',0,[359,629,292,261],'M362 735 Q361 719 375 712 L390 702 Q399 702 405 712 L423 742 L421 754 L438 778 L458 783 L472 777 Q470 752 480 734 Q471 730 470 719 Q466 709 475 698 Q471 694 471 678 Q470 647 501 642 Q513 628 537 632 Q559 625 577 637 Q598 635 615 652 Q636 654 638 680 Q653 697 646 715 Q641 733 623 732 L617 757 Q625 764 615 777 L600 784 Q622 787 631 806 Q642 818 635 836 L619 860 Q609 872 586 870 L575 882 L482 889 L450 859 Q432 855 425 836 Q411 831 406 814 L413 796 L404 779 L389 760 L380 749 Z');
 // Rack, steamer, vegetables stay together: none is an equipment slot.
 save('prep-rack',0,[145,721,180,183],'M147 739 Q158 732 171 732 Q181 724 192 730 Q208 716 225 730 Q246 731 255 739 Q262 744 259 755 L259 765 Q289 761 312 767 Q317 769 315 778 L315 790 Q326 793 324 805 L323 817 L315 823 L315 870 L283 874 Q247 879 233 891 L230 900 L198 901 Q166 903 156 884 L149 858 L148 833 Z');
 save('prep-rack-preview',1,[240,674,139,104]);
 save('stool-left',0,[135,1019,145,132],'M136 1138 L148 1044 Q153 1028 179 1024 Q207 1017 241 1027 Q257 1030 263 1048 L273 1126 Q267 1131 257 1128 L244 1121 L246 1143 Q235 1151 212 1147 L207 1129 L164 1124 L160 1140 Q147 1144 136 1138 Z');
 save('stool-right',0,[267,1024,143,130],'M268 1143 L281 1049 Q287 1033 313 1030 Q339 1023 373 1033 Q392 1036 396 1058 L404 1131 Q397 1138 384 1134 L372 1124 L357 1128 L362 1148 Q351 1157 330 1153 L325 1133 L296 1128 L292 1148 Q279 1153 268 1143 Z');
 save('plant',0,[645,946,156,164],'M646 969 Q659 952 689 956 L681 947 Q718 944 733 972 Q755 947 793 960 L779 973 Q792 977 799 988 Q777 985 766 997 Q795 1004 795 1023 Q777 1011 762 1014 Q781 1032 771 1046 L779 1065 Q779 1107 737 1108 Q688 1110 675 1082 L673 1051 L687 1037 Q667 1035 666 1015 L661 1025 Q648 1009 655 991 L672 983 Z');
 save('plate-dish',0,[229,865,145,67],'M231 893 Q237 883 260 880 Q270 867 285 870 Q301 862 317 872 Q342 872 352 885 Q369 888 372 897 Q372 912 341 922 Q297 938 254 921 Q229 912 231 893 Z');
 save('prepared-food',0,[247,870,106,49],'M248 894 Q251 887 264 883 Q265 874 278 875 Q284 866 295 873 Q302 869 314 878 Q330 875 336 887 Q349 885 351 898 Q345 911 321 916 Q288 924 259 911 Z');
 save('wok',0,[372,834,219,80],'M375 847 Q391 834 422 839 Q450 832 479 840 Q506 837 532 846 L575 844 L589 851 L588 859 L537 868 Q532 890 509 900 Q476 917 432 905 Q400 896 391 874 Z');
 save('wok-food',0,[407,840,110,32],'M408 860 Q410 850 422 850 Q423 839 435 844 Q447 835 455 845 Q462 840 473 851 Q488 843 495 853 Q510 850 516 861 L505 868 Q463 875 421 866 Z');
 save('steam',0,[345,745,65,116]);
 save('fire',0,[401,894,116,27],'M402 897 L512 897 L515 917 Q458 925 403 917 Z');
 save('bulb',0,[158,631,63,65],'M173 633 L208 633 L208 647 Q221 657 219 674 Q218 694 194 694 Q172 694 164 679 Q158 662 173 647 Z');
 save('nav-home',0,[71,1630,122,70],'M74 1671 L89 1647 L89 1637 Q91 1630 100 1631 L169 1631 Q176 1630 176 1638 L176 1647 L188 1669 Q197 1685 182 1689 Q172 1693 164 1683 Q154 1694 145 1685 Q133 1695 122 1685 Q112 1694 103 1683 Q91 1695 80 1687 Z');
 save('nav-decor',0,[306,1627,77,78],'M311 1654 Q307 1641 319 1637 Q325 1626 339 1632 Q354 1626 365 1637 Q379 1634 381 1648 Q382 1658 371 1663 L370 1677 L376 1692 Q370 1704 350 1703 L318 1700 L312 1687 L319 1674 L316 1664 Z');
 save('nav-recipes',0,[511,1627,81,76],'M515 1682 L529 1636 Q533 1632 549 1633 L550 1627 L566 1627 L570 1633 L578 1636 L588 1689 Q590 1697 580 1697 L548 1693 Q515 1696 513 1686 Z');
 save('nav-market',0,[732,1622,75,86],'M764 1623 Q773 1622 774 1636 L784 1640 Q804 1651 804 1670 Q805 1690 780 1695 L777 1706 L759 1706 L757 1695 Q735 1689 735 1672 Q731 1650 756 1639 L763 1636 Z');
 save('brush',0,[636,1090,53,64],'M668 1093 Q678 1088 684 1096 Q689 1101 681 1109 L669 1126 L677 1133 L660 1152 Q649 1157 638 1147 L637 1140 L650 1121 L657 1123 Z');
 save('header-awning',0,[0,0,887,61],'M0 0 H887 V29 Q872 38 851 27 Q833 48 806 47 Q778 45 755 30 Q733 53 702 50 Q668 49 651 28 Q636 56 603 56 Q568 53 550 37 Q535 66 500 63 Q466 61 445 43 Q426 66 398 63 Q362 63 341 40 Q321 62 288 62 Q255 62 239 34 Q226 55 194 53 Q161 52 146 31 Q131 48 103 48 Q76 46 48 29 Q26 38 0 37 Z');
 // Exact art lettering on transparent assets, independent of background/control.
 const ink=(name,page,box,light=false)=>save(name,page,box,null,{ink:light?'light':'dark'});
 ink('title-decor',1,[285,201,322,74]);ink('subtitle-decor',1,[240,286,408,39]);ink('title-recipes',2,[257,227,378,84]);ink('title-market',3,[284,218,318,75]);
 ink('label-play',0,[288,1392,324,79],true);ink('label-decor',0,[698,1104,140,39]);ink('label-map',0,[363,1557,169,35],true);
 ink('page-prev',2,[163,1478,118,43]);ink('page-next',2,[617,1478,120,43]);ink('label-preview',1,[81,856,99,39]);
 for(const [i,name]of ['lamp','awning','tables','ornament','menu'].entries())ink('category-'+name,1,[84+i*160,951,94,44]);
 for(const [i,name]of ['home','decor','recipes','market'].entries()){
  const x=[78,294,509,722][i];
  ink('nav-label-'+name, i===0?1:0,[x,1707,116,43],true);
  ink('nav-label-'+name+'-selected',i,[x,i===2?1675:1707,116,43]);
 }
 for(const [i,name]of ['番茄炒蛋','青椒肉片','双料香菇鸡','西兰花虾仁','芹菜牛肉','豆腐炒蛋'].entries()){ink('dish-name-'+i,2,[i%2?525:111,Math.floor(i/2)*317+698,290,47]);}
 for(let i=0;i<6;i++){
  const x=i%2?507:99,y=514+Math.floor(i/2)*317;
  save('dish-'+i,2,[x-3,y-3,285,181],`M${x+140} ${y} C${x+216} ${y} ${x+280} ${y+34} ${x+280} ${y+89} C${x+278} ${y+139} ${x+214} ${y+175} ${x+140} ${y+175} C${x+61} ${y+175} ${x} ${y+141} ${x} ${y+90} C${x} ${y+40} ${x+63} ${y} ${x+140} ${y} Z`);
 }
 // Original rope strips, ornamental clouds and icon silhouettes are reusable objects.
 save('rope',0,[280,47,23,109],'M285 48 L297 48 L297 131 Q305 133 302 147 L296 155 L283 153 L281 139 L287 132 Z');
 save('lantern-rope',0,[80,118,18,90],'M84 118 L94 118 L94 193 L98 202 L96 208 L81 208 L80 202 L84 194 Z');
 save('brand-compact',1,[262,47,363,122],'M264 103 Q270 81 301 73 Q365 45 440 48 Q518 47 580 74 Q621 83 625 111 Q625 144 597 156 Q584 164 562 163 Q443 146 324 165 Q289 171 272 148 Q263 136 264 103 Z');
 save('coin',0,[678,119,51,48],'M700 120 C733 116 740 158 707 166 C675 174 666 126 700 120 Z');
 save('sound',0,[40,69,47,39],null,{ink:'dark'});save('settings',0,[128,66,44,45],null,{ink:'dark'});
 save('cloud',0,[301,1480,53,26],null,{ink:'light'});
 save('title-cloud',1,[177,230,87,37],null,{ink:'dark'});
 save('cloud-recipes',2,[126,286,88,37]);save('cloud-market',3,[187,244,69,31],null,{ink:'dark'});
 save('lamp-red',0,[23,194,134,189],'M76 202 Q89 197 106 204 L109 217 Q156 232 154 274 Q155 313 109 328 L107 338 L112 373 Q95 381 76 374 L81 338 L76 328 Q25 316 24 274 Q22 233 72 218 Z');
 save('lamp-flower',3,[87,706,166,291],'M158 708 Q169 701 180 708 Q190 715 185 728 L183 738 L195 742 L194 755 Q251 773 251 827 Q253 882 198 903 L197 917 L181 924 L195 985 Q172 997 145 986 L158 924 L145 918 L145 906 Q89 891 89 843 Q80 793 132 764 L144 756 L145 741 L157 737 L156 730 Q146 714 158 708 Z');
 save('banner-lamp',3,[553,426,178,239],'M632 426 L650 426 L648 444 L654 455 L663 457 L665 470 Q726 486 724 533 Q721 579 666 600 L665 618 L673 660 L622 662 L632 618 L628 601 Q554 588 555 535 Q552 487 611 471 L612 456 L630 452 Z');
 ink('banner-title',3,[85,488,352,82],true);ink('banner-subtitle',3,[100,581,341,38],true);
 for(const [i,name]of ['初点灯火','河岸晚风','热锅小调','满街暖光'].entries())ink('book-'+i,3,i===0?[331,709,254,67]:[235,1072+(i-1)*155,187,43]);
 const tabTexts=[['摊位',1,[99,364,89,42],true],['大厨',1,[303,365,85,41]],['场景',1,[506,365,86,41]],['主题',1,[710,365,86,41]],['菜谱',2,[140,402,98,46],true],['成就',2,[400,405,99,44]],['相册',2,[660,405,99,44]],['当期',3,[137,335,99,46],true],['往期',3,[398,338,101,43]],['每日',3,[679,338,101,43]]];
 for(const [label,page,box,light]of tabTexts){ink('tab-'+label,page,box,light);}
 // Tight rectangular inputs sent to imagegen to remove content from ONE surface.
 for(const [name,page,box]of [
 ['primary',0,[112,1373,662,177]],['secondary',0,[609,1085,255,84]],['card',2,[41,495,394,308]],
 ['tab-active',1,[33,342,220,86]],['tab-normal',1,[447,343,204,83]],['wish',0,[29,1180,828,172]],
 ['nav-base',0,[0,1611,887,163]],['nav-selected',0,[20,1624,215,137]],
 ['panel-decor',1,[0,170,887,1438]],['panel-recipes',2,[0,188,887,1393]],['panel-market',3,[0,185,887,1427]],
 ['banner',3,[24,426,837,239]],['counter',0,[76,620,735,499]]
 ])save(name,page,box,null,{input:true});
 fs.writeFileSync(path.join(out,'extraction.json'),JSON.stringify({method:'原稿逻辑对象像素保留；路径只定义透明边界。空白控件与遮挡补底使用单独imagegen编辑。',assets:records},null,2)+'\n');
 console.log('Prepared '+records.length+' logical art/input objects.');
})();
