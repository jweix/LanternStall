/* Integration template. Supply a canvas, recipe data and a renderer from your target platform. */
(function(root){
 function createGameRuntime(options){
  const Engine=options.Engine,Motion=options.Motion,engine=new Engine(options.level),effects=[];
  let previous=null,stopped=false,paused=false,frameId=null;
  function frame(ms){if(stopped)return;const dt=previous===null?0:Math.max(0,(ms-previous)/1000);previous=ms;
   if(!paused){engine.tick(dt);for(const event of engine.drainEvents()){effects.push({event,born:event.time});if(event.type==='levelWon'&&options.onResult)options.onResult(event);}}
   options.render(engine.snapshot(),effects,Motion);frameId=options.requestFrame(frame);
  }
  frameId=options.requestFrame(frame);
  return{
   engine,
   pointer(cssX,cssY,viewport){const p=Motion.toDesign(cssX,cssY,viewport);const n=engine.nodes.slice().reverse().find(n=>engine.available(n.id)&&Math.abs(p.x-n.x)<=n.w/2&&Math.abs(p.y-n.y)<=n.h/2);return n?engine.selectTile(n.id):{ok:false,reason:'no-selectable-tile'};},
   pause(value){paused=value!==false;engine.pause(paused);previous=null;},
   stop(){stopped=true;if(options.cancelFrame)options.cancelFrame(frameId);effects.length=0;},
   removeFinishedEffects(predicate){for(let i=effects.length-1;i>=0;i--)if(predicate(effects[i],engine.now))effects.splice(i,1);}
  };
 }
 if(typeof module==='object'&&module.exports)module.exports={createGameRuntime};else root.DapaidangPlatform={createGameRuntime};
})(typeof globalThis!=='undefined'?globalThis:this);
