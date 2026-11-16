/* Optional, isolated wardrobe playtest profiles. Never uses the player save key. */
(function(root){
  'use strict';
  root.DapaidangOutfitPlaytest=function(mode){
    if(!['starter','collection'].includes(mode))return null;
    const C=root.DapaidangProgression,complete=mode==='collection';
    return {
      key:'lantern-outfit-playtest-v9-'+mode,
      title:complete?'珍藏全览体验档':'选购与解锁体验档',
      data:{
        version:C.schema,coins:complete?40000:10000,
        cleared:Array.from({length:20},(_,i)=>i+1),
        dishes:Object.fromEntries(Array.from({length:complete?20:8},(_,i)=>['d'+String(i+1).padStart(2,'0'),1])),
        activity:[6,0,0,0],tutorialDone:true,
        owned:complete?C.items.map(i=>i.id):C.slots.map(slot=>'warm-'+slot),
        equipped:Object.fromEntries(C.slots.map(slot=>[slot,(complete?'star':'warm')+'-'+slot])),
        wish:'bamboo-lamp'
      }
    };
  };
})(typeof globalThis!=='undefined'?globalThis:this);
