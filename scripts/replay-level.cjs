'use strict';
const C=require('./level-tools/common.cjs'),options=C.args(process.argv.slice(2));
if(options.case){
  const saved=JSON.parse(C.fs.readFileSync(C.path.resolve(options.case),'utf8'));
  const current=C.metadata();
  if(saved.generatorVersion!==current.generatorVersion||saved.recipeHash!==current.recipeHash||saved.layoutHash!==current.layoutHash)throw Error('Case version/hash differs; replay with the matching source revision.');
  const engine=saved.timeline?C.replayTimeline(saved.config,saved.timeline,saved.budget):C.replay(saved.config,saved.result.actions,saved.budget);
  if(saved.snapshot&&JSON.stringify(C.snapshot(engine))!==JSON.stringify(saved.snapshot))throw Error('Timeline snapshot differs');
  if(saved.result&&(engine.status!==saved.result.final.status||engine.revenue!==saved.result.final.revenue))throw Error('Replay differs from saved outcome.');
  console.log(JSON.stringify({reproduced:true,level:saved.config.level,status:engine.status,revenue:engine.revenue}));
}else{
  const level=C.integer(options.level,1,1,10000),config=C.configFor(level,options.seed===undefined?undefined:C.integer(options.seed,0,0,0xffffffff));
  const result=C.probe(config,options.policy||'greedy',C.integer(options['policy-seed'],997,0,0xffffffff),options.budget||'none');
  const file=C.path.resolve(options.out||'reports/levels/replay.json');
  C.save(file,{...C.metadata(),config,policy:options.policy||'greedy',policySeed:Number(options['policy-seed']||997),budget:options.budget||'none',result});
  console.log(JSON.stringify({file,level,won:result.won,removed:result.removed,used:result.used}));
}
