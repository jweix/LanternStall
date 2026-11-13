'use strict';
const { performance } = require('node:perf_hooks');
const { createLevel, probeLevel, PROFILES } = require('../shared/core/levels.js');
const recipes = require('../shared/data/recipes.json');
const layout = require('../shared/data/layout.json');
const boards = Number(process.argv[2] || 50), trials = Number(process.argv[3] || 16);
if (!Number.isSafeInteger(boards) || boards < 1 || boards > 10000 ||
    !Number.isSafeInteger(trials) || trials < 1 || trials > 1000) throw Error('Use: npm run analyze:levels -- [boards:1..10000] [trials:1..1000]');
const report = { generatorVersion: 2, boardsPerDifficulty: boards, trialsPerBoardAndPolicy: trials,
  note: '策略模拟会等烹饪、送达、补单全部完成；不使用道具。胜率仅用于固定策略对比，不代表真人胜率。', difficulties: [] };
for (const profile of PROFILES) {
  let greedy = 0, random = 0, witnessPeak = 0, witnessMean = 0, blockers = 0, types = 0, maxMs = 0;
  const start = performance.now();
  for (let level = 1; level <= boards; level++) {
    const before = performance.now(), config = createLevel(recipes, layout, level, { difficulty: profile.id });
    maxMs = Math.max(maxMs, performance.now() - before);
    witnessPeak += config.metrics.witnessPeak; witnessMean += config.metrics.witnessMean;
    blockers += config.metrics.blockerCount; types += config.metrics.ingredientTypes;
    for (let trial = 1; trial <= trials; trial++) {
      greedy += Number(probeLevel(config, 'greedy', trial * 997).won);
      random += Number(probeLevel(config, 'random', trial * 997).won);
    }
  }
  const round = n => Math.round(n * 10000) / 10000;
  report.difficulties.push({ id: profile.id, name: profile.name, recipeTypes: profile.recipeCount,
    doubleDishes: (40 - profile.tripleDishes * 3) / 2, tripleDishes: profile.tripleDishes,
    ingredientTypesMean: round(types / boards), blockerCountMean: round(blockers / boards),
    witnessPeakMean: round(witnessPeak / boards), witnessOccupancyMean: round(witnessMean / boards),
    greedyWinRate: round(greedy / (boards * trials)), randomWinRate: round(random / (boards * trials)),
    maxGenerationMs: round(maxMs), analysisMs: round(performance.now() - start) });
}
console.log(JSON.stringify(report, null, 2));
