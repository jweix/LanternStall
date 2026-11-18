'use strict';
const C = require('./level-tools/common.cjs'), options = C.args(process.argv.slice(2));
const levels = C.range(options.levels || '1:100'), candidates = C.integer(options.candidates, 50, 1, 1000);
const trials = C.integer(options.trials, 64, 8, 1000), baseSeed = C.integer(options.seed, 20261118, 0, 0xffffffff);
const report = { ...C.metadata(), candidatesPerLevel: candidates, trials, boards: [] };
const data = JSON.parse(JSON.stringify(C.Data)); data.seeds ||= {};
const defaultTarget = (n, difficulty) => n <= 3 ? [.98,1] : n <= 6 ? [.9,1] : n <= 10 ? [.75,.95] :
  n <= 20 ? difficulty === 'hard' ? [.3,.55] : [.6,.85] : difficulty === 'normal' ? [.55,.8] : difficulty === 'hard' ? [.3,.55] : [.1,.35];
let outside = 0;
for (const level of levels) {
  const definition = C.Levels.definitionFor(level), target = definition.greedyTarget || defaultTarget(level, definition.difficulty);
  const random = C.rng((baseSeed + level * 7919) >>> 0), shortlist = [];
  const distance = rate => Math.max(target[0] - rate, 0, rate - target[1]);
  let rejected = 0, baseline, lastError;
  for (let i = 0; i < candidates; i++) {
    const seed = i === 0 ? definition.seed === undefined ? Math.imul(level,7919)>>>0 : definition.seed : Math.floor(random()*4294967296);
    try {
      const config = C.configFor(level, seed); let wins = 0;
      for(let t=1;t<=16;t++)wins+=Number(C.Levels.probeLevel(config,'greedy',t*997).won);
      const rate = wins/16, rank = distance(rate)*10 + Math.abs(rate-(target[0]+target[1])/2);
      if(i===0)baseline={seed,rank,config};
      shortlist.push({ seed, rank, config }); shortlist.sort((a,b)=>a.rank-b.rank);shortlist.length=Math.min(shortlist.length,12);
    } catch(error) { lastError=error.message; rejected++; if(i===0 && candidates===1)throw error; }
  }
  if(baseline&&!shortlist.some(s=>s.seed===baseline.seed))shortlist.push(baseline);
  let best;
  for (const item of shortlist) {
    let wins = 0; for(let t=1;t<=trials;t++)wins+=Number(C.Levels.probeLevel(item.config,'greedy',t*997).won);
    const rate=wins/trials,rank=distance(rate)*10+Math.abs(rate-(target[0]+target[1])/2);
    if(!best||rank<best.rank)best={...item,rate,rank};
  }
  if(!best)throw Error('No valid candidates for level '+level+': '+lastError);
  const accepted=distance(best.rate)===0;if(!accepted)outside++;
  report.boards.push({ level, seed:best.seed, target, greedyWinRate:best.rate, accepted, rejected,
    contentId:best.config.contentId, ...best.config.metrics });
  const row=data.levels.find(r=>r.level===level);
  if(row)row.seed=best.seed;else data.seeds[level]=best.seed;
  console.error('Selected '+level+' '+(best.rate*100).toFixed(1)+'% '+(accepted?'PASS':'OUTSIDE TARGET'));
}
C.save(C.path.resolve(options.out||'reports/levels/candidates.json'),report);
if(options.apply){
  if(outside&&!options['allow-outside'])throw Error(outside+' levels outside targets; config was not changed. Increase candidates or adjust the explicit design.');
  C.writeConfig(data);
}
console.log(JSON.stringify({levels:levels.length,outside,applied:!!options.apply},null,2));
