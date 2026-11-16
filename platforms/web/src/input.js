/* Browser events only; gesture decisions and list offsets belong to shared App. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DapaidangWebInput=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function bind(app,canvas,controls,designSize){
  const host=canvas.parentElement;let pointerId=null;
  function point(e){const r=canvas.getBoundingClientRect(),s=designSize();return{x:(e.clientX-r.left)*s.width/r.width,y:(e.clientY-r.top)*s.height/r.height};}
  host.addEventListener('pointerdown',e=>{if(e.button!==0||pointerId!==null)return;app.pointerStart(point(e));if(app.gesture){pointerId=e.pointerId;host.setPointerCapture(pointerId);}e.preventDefault();});
  host.addEventListener('pointermove',e=>{if(e.pointerId===pointerId)app.pointerMove(point(e));});
  host.addEventListener('pointerup',e=>{if(e.pointerId!==pointerId)return;app.pointerEnd(point(e));pointerId=null;});
  const cancel=()=>{pointerId=null;app.pointerCancel();};
  host.addEventListener('pointercancel',cancel);host.addEventListener('lostpointercapture',cancel);
  host.addEventListener('wheel',e=>{const s=designSize(),r=canvas.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?r.height:1;if(app.scroll(point(e),e.deltaY*unit*s.height/r.height))e.preventDefault();},{passive:false});
  controls.addEventListener('keydown',e=>{if(!['item','scroll-region'].includes(e.target.dataset.action))return;const delta={ArrowDown:92,ArrowUp:-92,PageDown:352,PageUp:-352,Home:-1e6,End:1e6}[e.key];if(delta!==undefined&&app.scroll(null,delta))e.preventDefault();});
 }
 return{bind};
});
