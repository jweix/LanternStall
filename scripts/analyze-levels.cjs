'use strict';
const C = require('./level-tools/common.cjs');
const options = C.args(process.argv.slice(2));
const levels = C.range(options.levels || '1:' + (options.positionals?.[0] || 60));
const trials = C.integer(options.trials || options.positionals?.[1], 16, 1, 1000);
const policies = String(options.policies || (options.suite === 'full' ? 'random,greedy,unlock,lookahead' : 'random,greedy,unlock')).split(',');
const budgets = options.tools || options.suite === 'full' ? ['none', 'free', 'ad1', 'ad2'] : ['none'];
const out = C.path.resolve(options.out || 'reports/levels/analysis.json');
const report = { ...C.metadata(), trialsPerBoard: trials, policies, budgets, boards: [], summary: [] };
for (const level of levels) {
  const start = performance.now(), config = C.configFor(level), row = { level, seed: config.seed, contentId: config.contentId,
    difficulty: config.difficulty, shape: config.shape, ...config.metrics, scores: [] };
  for (const policy of policies) for (const budget of policy === 'random' ? ['none'] : budgets) {
    let wins = 0, ads = 0, unknown = 0, removed = 0;
    const failures = [];
    for (let trial = 1; trial <= trials; trial++) {
      const result = C.probe(config, policy, trial * 997, budget);
      wins += Number(result.won); ads += result.used.ads; unknown += Number(result.unknownRescue); removed += result.removed;
      if (!result.won && failures.length < 1 && options.cases) {
        const file = C.path.join(C.path.dirname(out), 'cases', level + '-' + policy + '-' + budget + '.json');
        C.save(file, { ...C.metadata(), config, policy, policySeed: trial * 997, budget, result }); failures.push(file);
      }
    }
    row.scores.push({ policy, budget, winRate: wins / trials, adsMean: ads / trials, unknownRescues: unknown,
      removedMean: removed / trials, failureCases: failures });
  }
  if(options.solve){const maxNodes=C.integer(options.nodes,5000,1,1000000);row.oracle=C.oracle(config,{maxNodes});row.minimumCapacity=C.minimumCapacity(config,maxNodes);row.safeChoices=C.safeChoices(new C.Engine(config),Math.min(maxNodes,2000));}
  row.analysisMs = Math.round(performance.now() - start); report.boards.push(row);
  if (!options.quiet) console.error('Analyzed level ' + level + ': ' + config.tiles.length + ' cards');
}
for (const difficulty of C.Levels.PROFILES) {
  const rows = report.boards.filter(r => r.difficulty === difficulty.id); if (!rows.length) continue;
  const rates = rows.map(r => r.scores.find(s => s.policy === 'greedy' && s.budget === 'none')?.winRate).filter(n => n !== undefined).sort((a, b) => a - b);
  report.summary.push({ difficulty: difficulty.id, boards: rows.length, greedyMean: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    greedyMin: rates[0], greedyMedian: rates[Math.floor(rates.length / 2)], greedyMax: rates.at(-1),
    meanCards: rows.reduce((n, r) => n + r.tileCount, 0) / rows.length });
}
C.save(out, report);
const csv = ['level,difficulty,shape,dishes,cards,layers,policy,budget,winRate,unknownRescues'];
for (const r of report.boards) for (const s of r.scores) csv.push([r.level,r.difficulty,r.shape,r.totalDishes,r.tileCount,r.layerCount,s.policy,s.budget,s.winRate,s.unknownRescues].join(','));
C.fs.writeFileSync(out.replace(/\.json$/, '') + '.csv', csv.join('\n') + '\n');
console.log(JSON.stringify({ out, ...report.summary.length && { summary: report.summary } }, null, 2));
