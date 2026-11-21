/* Component layout in design units. Images contain no page layout or state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DapaidangLobbyLayout=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return {
    size:{width:887,height:1774},
    header:{sound:[24,49,77,77],settings:[110,49,78,77],wallet:[208,49,278,77],brandHome:[107,152,650,140],brandCompact:[511,50,357,77],homeChapter:[444,337,40]},
    body:[0,174,887,1428],
    footer:{rect:[0,1611,887,163],count:4,edges:[0,241,445,660,887],selected:[[24,1626,210,134],[237,1625,205,134],[449,1625,205,134],[660,1626,205,134]],icons:[[71,1630,122,70],[306,1627,77,78],[511,1627,81,76],[732,1622,75,86]],labels:[[78,1707,116,43],[294,1707,116,43],[509,1707,116,43],[722,1707,116,43]]},
    home:{scene:[0,378,887,740],wish:[30,1216,831,172],play:[112,1412,670,141],map:[291,1565,305,32],decor:[610,1122,252,70],sidebar:[30,1122,310,70],daily:[350,1122,242,70]},
    decor:{preview:[35,414,817,578],themePreview:[35,440,817,710],themeTabs:[40,1172,807,76],main:[34,330,817,68],categories:[40,1008,807,62],themeList:[38,1014,804,466],rareList:[38,1086,804,394],list:[38,1086,804,394],cards:{x:38,y:1014,w:388,h:186,dx:401,dy:198,columns:2},cta:[110,1500,668,88]},
    recipes:{tabs:[53,354,782,73],cards:{x:42,y:476,w:392,h:302,dx:410,dy:319,columns:2,perPage:6},pageY:1488},
    market:{tabs:[39,301,812,84],banner:[24,402,837,239],feature:[24,665,837,333],rows:{x:25,y:1022,w:836,h:137,dy:149}},
    skins:{'content-panel':{id:'lobby-content-panel',slice:[28,170,28,45]},card:{id:'lobby-card',slice:[28,24,28,24]},icon:{id:'lobby-card',slice:[44,44,44,44],cornerScale:.6},primary:{id:'lobby-button-primary',slice:[96,40,96,40]},primaryDisabled:{id:'lobby-button-primary-disabled',slice:[96,40,96,40]},secondary:{id:'lobby-button-secondary',slice:[46,28,46,28]},secondaryDisabled:{id:'lobby-button-secondary-disabled',slice:[46,28,46,28]},tabActive:{id:'lobby-tab-active',slice:[30,23,30,23]},tabNormal:{id:'lobby-tab-normal',slice:[30,23,30,23]},tabDisabled:{id:'lobby-tab-normal-disabled',slice:[30,23,30,23]},wish:{id:'lobby-wish-panel',slice:[45,40,45,40]}},
    scene:{
      width:887,height:740,counter:[76,224,735,450],chef:[376,219,258,232],counterFrontY:444,
      awning:[71,30,746,204],sign:[286,30,316,174],lamps:[[149,230,98,172],[640,230,98,172]],
      wok:[376,400,220,81],plate:[238,429,148,68],ornament:[638,556,151,165],menu:[678,402,60,70],
      stools:[[142,593,148,136],[281,595,146,134]],
      foodMounts:{wok:{star:[.16,.07,.50,.40],harvest:[.16,.07,.50,.40]},plate:{star:[.15,.17,.70,.65],harvest:[.15,.17,.70,.65]}},
      // One physical rig is fitted into both home and preview windows.
      // All skins replace nodes in this complete base composition. Their own
      // dimensions cannot move another node or change the painter's order.
      layers:[
        {id:'environment',name:'夜市环境',z:0,kind:'environment',slot:'background',group:'environment'},
        {id:'ground-shadow',name:'摊位落地阴影',z:10,kind:'ground-shadow',group:'fixed'},
        {id:'counter-rear',name:'柜台后层与立柱',z:20,kind:'sprite',asset:'lobby-scene-counter',box:'counter',clip:'counter-rear',group:'fixed'},
        {id:'chef',name:'大厨',z:30,kind:'equipment',slot:'chef',box:'chef',anchor:[.5,1],group:'equipment'},
        {id:'counter-front',name:'柜台前沿遮挡',z:40,kind:'sprite',asset:'lobby-scene-counter',box:'counter',clip:'counter-front',group:'fixed'},
        {id:'awning',name:'棚布',z:50,kind:'equipment',slot:'awning',box:'awning',anchor:[.5,0],group:'equipment'},
        {id:'sign',name:'家常牌匾',z:60,kind:'sprite',asset:'lobby-stall-sign',box:'sign',group:'fixed'},
        {id:'lamp-glow-left',name:'左灯光晕',z:70,kind:'lamp-glow',box:'lamps',instance:0,group:'fixed'},
        {id:'lamp-glow-right',name:'右灯光晕',z:71,kind:'lamp-glow',box:'lamps',instance:1,group:'fixed'},
        {id:'lamp-left',name:'左灯具',z:95,kind:'equipment',slot:'lamp',box:'lamps',instance:0,anchor:[.5,0],group:'equipment'},
        {id:'lamp-right',name:'右灯具',z:96,kind:'equipment',slot:'lamp',box:'lamps',instance:1,anchor:[.5,0],group:'equipment'},
        {id:'prep-shelf',name:'完整备菜架／蒸笼／青菜／番茄静物组',z:90,kind:'sprite',asset:'lobby-prep-rack',rect:[155,316,218,162],group:'fixed'},
        {id:'plate',name:'餐盘底面',z:100,kind:'plate',slot:'plate',box:'plate',group:'equipment'},
        {id:'prepared-dish',name:'台面成品菜',z:101,kind:'sprite',asset:'lobby-prepared-food',rect:[257,434,108,50],group:'fixed'},
        {id:'cooking-steam',name:'锅上热气',z:110,kind:'sprite',asset:'lobby-steam',rect:[345,311,65,116],group:'fixed'},
        {id:'stove-flame',name:'炉火',z:111,kind:'sprite',asset:'lobby-fire',rect:[404,473,114,27],group:'fixed'},
        {id:'wok',name:'炒锅',z:120,kind:'equipment',slot:'wok',box:'wok',anchor:[.5,1],group:'equipment'},
        {id:'wok-food',name:'锅内食物',z:121,kind:'sprite',asset:'lobby-wok-food',rect:[411,407,110,32],group:'fixed'},
        {id:'menu',name:'菜单牌',z:130,kind:'equipment',slot:'menu',box:'menu',anchor:[.5,1],group:'equipment'},
        {id:'ornament',name:'前景摆件',z:140,kind:'equipment',slot:'ornament',box:'ornament',anchor:[.5,1],group:'equipment'},
        {id:'stool-left',name:'左凳子',z:150,kind:'equipment',slot:'tables',box:'stools',instance:0,anchor:[.5,1],group:'equipment'},
        {id:'stool-right',name:'右凳子',z:151,kind:'equipment',slot:'tables',box:'stools',instance:1,basePrefix:'lobby-stool-right-',anchor:[.5,1],group:'equipment'}
      ]
    }
  };
});
