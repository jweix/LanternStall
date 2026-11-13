(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DapaidangMotion=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p;
 const ease=v=>{v=clamp(v);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;};
 const timing={pick:.30,rawToWok:.28,stir:.60,pour:.32,departure:.62,reveal:.16,holdAfterPour:0,servedHold:0,orderConfirm:.28,cardExit:.14,newSettle:.12,newCue:.75,acceptedFlight:.20,servedExit:.16,reward:.45,hudPulse:.42,resultDelay:.60,resultEnter:.34};
 function contain(iw,ih,x,y,w,h){const s=Math.min(w/iw,h/ih);return{x:x+(w-iw*s)/2,y:y+(h-ih*s)/2,w:iw*s,h:ih*s,scaleX:s,scaleY:s};}
 function viewport(width,height,insets){const i=Object.assign({left:0,right:0,top:0,bottom:0},insets||{}),s=Math.min((width-i.left-i.right)/928,(height-i.top-i.bottom)/1695);return{scale:s,x:i.left+(width-i.left-i.right-928*s)/2,y:i.top+(height-i.top-i.bottom-1695*s)/2};}
 function toDesign(x,y,v){return{x:(x-v.x)/v.scale,y:(y-v.y)/v.scale};}
 function prepSlot(i){return{x:55+i*76,y:1398,w:69,h:89,r:18,cx:89.5+i*76,cy:1442.5};}
 function pickPose(from,slot,p){const to=prepSlot(slot),u=ease(p);return{x:mix(from.x,to.cx,u),y:mix(from.y,to.cy,u)-Math.sin(u*Math.PI)*62,w:mix(from.w,69,u),h:mix(from.h,89,u),rotation:Math.sin(u*Math.PI)*.1};}
 // Fixed serving point belongs to the income area, never to a mutable menu slot.
 function departurePose(elapsed){const start={x:837,y:1484},target={x:735,y:188},total=timing.departure+timing.reveal;
  elapsed=clamp(elapsed/total)*total;
  if(elapsed<timing.departure){const u=clamp(elapsed/timing.departure),y=mix(start.y,1208,u),along=(start.y-y)/(start.y-target.y),f=clamp((u-.4)/.6);return{x:mix(start.x,target.x,along),y,w:mix(145,15,f),alpha:1-f,phase:'departure'};}
  const u=clamp((elapsed-timing.departure)/timing.reveal),p=ease(u);return{x:mix(751,target.x,p),y:mix(198.5,target.y,p),w:mix(65,96,p),alpha:ease((elapsed-timing.departure)/.07),phase:'serving-point'};
 }
 function orderExit(age){const p=ease(age/timing.cardExit);return{alpha:1-p,dy:-34*p,scale:1-.065*p};}
 function orderEnter(age){const p=ease(age/timing.newSettle);return{alpha:1,dy:-10*(1-p)};}
 function handoffPose(age){const exit=orderExit(age-timing.orderConfirm);return{alpha:exit.alpha,dy:exit.dy-(age<timing.orderConfirm?3*Math.sin(clamp(age/timing.orderConfirm)*Math.PI):0),scale:exit.scale,ingredientsAlpha:1-ease(age/.11),plateAlpha:ease(age/.12),lidLift:10*(1-ease(age/.16))};}
 function acceptedPose(slot,index,age,queued){const from=prepSlot(slot),p=ease((age-index*.012)/(timing.acceptedFlight-index*.012));return{x:mix(from.cx,queued?458:742+(index-1)*18,p),y:mix(from.cy,queued?1355:1405,p)-Math.sin(p*Math.PI)*38,w:mix(69,22,p),h:mix(89,24,p),alpha:1-clamp((p-.75)/.25),rotation:Math.sin(p*Math.PI)*.3};}
 function servedPose(age){const p=ease(age/timing.servedExit);return{x:735+20*p,y:188-8*p,w:96*(1-.08*p),alpha:1-p};}
 function hud(age){return age<0||age>timing.hudPulse?1:1+.018*Math.sin(age/timing.hudPulse*Math.PI);}
 function modal(age){const p=ease(age/timing.resultEnter);return{alpha:p,scale:.94+.06*p};}
 function ring(age){const p=clamp(age/.32);return{r:16+p*33,alpha:1-p,lineWidth:5};}
 function wokPose(p,pouring){p=clamp(p);if(pouring){const a=Math.sin(p*Math.PI);return{angle:.64*a,dx:6*a,dy:-6*a};}return{angle:Math.sin(p*Math.PI*5)*.11,dx:Math.sin(p*Math.PI*5)*7,dy:-Math.max(0,Math.sin(p*Math.PI*4))*11};}
 function drawContained(ctx,image,bbox,x,y,w,h){const b=bbox||{x:0,y:0,w:image.naturalWidth||image.width,h:image.naturalHeight||image.height},r=contain(b.w,b.h,x,y,w,h);ctx.drawImage(image,b.x,b.y,b.w,b.h,r.x,r.y,r.w,r.h);return r;}
 return{clamp,mix,ease,timing,contain,viewport,toDesign,prepSlot,pickPose,departurePose,orderExit,orderEnter,handoffPose,acceptedPose,servedPose,hud,modal,ring,wokPose,drawContained};
});
