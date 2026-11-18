'use strict';
const C=require('./level-tools/common.cjs'),options=C.args(process.argv.slice(2));
const levels=C.range(options.levels||'1:100'),candidates=C.integer(options.candidates,100,1,1000);
const trials=C.integer(options.trials,64,8,1000),baseSeed=C.integer(options.seed,20261118,0,0xffffffff);
const report={...C.metadata(),candidatesPerLevel:candidates,trials,boards:[]},data=JSON.parse(JSON.stringify(C.Data));data.seeds||={};
const distance=(rate,target)=>Math.max(target[0]-rate,0,rate-target[1]);
let outside=0;
for(const level of levels){
 const definition=C.Levels.definitionFor(level),target=definition.greedyTarget||(level===1?[.98,1]:[0,.08]);
 const lookaheadTarget=definition.lookaheadTarget||(level<4?[0,1]:[0,Math.max(.12,target[1]+.08)]);
 const toolTarget=definition.toolTarget||(level<4?[0,1]:[.2,.7]);
 const random=C.rng((baseSeed+level*7919)>>>0),shortlist=[];let baseline,rejected=0,lastError;
 function measure(config,count,coarse){
  let wins=0,lookahead=0,free=0;
  for(let t=1;t<=count;t++)wins+=Number(C.Levels.probeLevel(config,'greedy',t*997).won);
  const aux=coarse?8:count;
  for(let t=1;t<=aux;t++){lookahead+=Number(C.probe(config,'lookahead',t*997,'none').won);free+=Number(C.probe(config,'greedy',t*997,'free').won);}
  const rate=wins/count,lookaheadRate=lookahead/aux,freeRate=free/aux;
  const error=distance(rate,target)+(level>=4?distance(lookaheadRate,lookaheadTarget)+distance(freeRate,toolTarget)+Math.max(0,.15-(freeRate-rate)):0);
  return {rate,lookaheadRate,freeRate,error,rank:error*10+Math.abs(rate-(target[0]+target[1])/2)+(level>=4?Math.abs(freeRate-.45)*.2:0)};
 }
 for(let i=0;i<candidates;i++){
  const seed=i===0?definition.seed??(Math.imul(level,7919)>>>0):Math.floor(random()*4294967296);
  try{const config=C.configFor(level,seed),item={seed,config,...measure(config,16,true)};
   if(i===0)baseline=item;shortlist.push(item);shortlist.sort((a,b)=>a.rank-b.rank);shortlist.length=Math.min(shortlist.length,32);
  }catch(error){lastError=error.message;rejected++;if(i===0&&candidates===1)throw error;}
 }
 if(baseline&&!shortlist.some(s=>s.seed===baseline.seed))shortlist.push(baseline);
 let best;
 for(const item of shortlist){const measured={...item,...measure(item.config,trials,false)};if(!best||measured.rank<best.rank)best=measured;}
 if(!best)throw Error('No valid candidates for level '+level+': '+lastError);
 const accepted=best.error===0;if(!accepted)outside++;
 report.boards.push({level,seed:best.seed,target,lookaheadTarget,toolTarget,greedyWinRate:best.rate,lookaheadWinRate:best.lookaheadRate,freeWinRate:best.freeRate,accepted,rejected,contentId:best.config.contentId,...best.config.metrics});
 const row=data.levels.find(r=>r.level===level);if(row)row.seed=best.seed;else data.seeds[level]=best.seed;
 console.error('Selected '+level+' greedy '+(best.rate*100).toFixed(1)+'%, lookahead '+(best.lookaheadRate*100).toFixed(1)+'%, tools '+(best.freeRate*100).toFixed(1)+'% '+(accepted?'PASS':'OUTSIDE TARGET'));
}
C.save(C.path.resolve(options.out||'reports/levels/candidates.json'),report);
if(options.check&&outside)throw Error(outside+' levels failed difficulty checks.');
if(options.apply){if(outside&&!options['allow-outside'])throw Error(outside+' levels outside targets; config was not changed. Increase candidates or revise the design.');C.writeConfig(data);}
console.log(JSON.stringify({levels:levels.length,outside,applied:!!options.apply},null,2));
