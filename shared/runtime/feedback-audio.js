/* Platform-independent voice pool. Adapters provide the actual audio device. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.DapaidangAudio=f();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const names=['pick','match','cook','coin','win','soft'];
  function create(createVoice,now=()=>Date.now()){
    const pools={},last={};let cursor=0;
    return {
      play(name){
        if(!names.includes(name)||now()-(last[name]??-Infinity)<45)return;
        last[name]=now();
        try{const pool=pools[name]||=([]);if(pool.length<2)pool.push(createVoice(name));
          const voice=pool[cursor++%pool.length];voice.stop();const playing=voice.play();if(playing?.catch)playing.catch(()=>{});
        }catch(_){} // Audio failure must never block input, persistence or rewards.
      },
      stop(){for(const pool of Object.values(pools))for(const voice of pool)try{voice.stop();}catch(_){}},
      dispose(){this.stop();for(const pool of Object.values(pools))for(const voice of pool)try{voice.destroy?.();}catch(_){}},
    };
  }
  return {create,names};
});
