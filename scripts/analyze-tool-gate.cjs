'use strict';
const C = require('./level-tools/common.cjs');
const Gate = require('../platforms/web/lab/experiments/tool-gate.js');
const {replay} = require('../platforms/web/lab/experiments/tool-gate-generator.js');
function enumerateEngine(config) {
  // Independent of the compact search model: fork and settle the real engine
  // for every legal selection order. No state merging on this small fixture.
  let visited = 0, failures = 0, wins = 0, maxRemoved = 0;
  function visit(e) {
    visited++; maxRemoved = Math.max(maxRemoved, e.nodes.filter(t => t.removed).length);
    if (e.status === 'won') { wins++; return; }
    if (e.status === 'failed') { failures++; return; }
    const choices = e.nodes.filter(t => e.available(t.id));
    if (!choices.length) throw Error('Unclassified terminal engine state.');
    for (const t of choices) { const next = e.fork(); if (!next.selectTile(t.id).ok) throw Error('Unexpected rejected choice.'); C.settle(next); visit(next); }
  }
  visit(new C.Engine(config)); return { visited, failures, wins, maxRemoved };
}
function analyze() {
  const config = Gate.create(C.recipes, C.layout), e = new C.Engine(config);
  const noTools = e.continuation({ maxNodes: 20000 });
  const undo = new C.Engine({ ...config, tools: { undo: 1, stash: 0, shuffle: 0 } }).continuation({ tools: true, maxNodes: 20000 });
  const oneVideo = e.continuation({ ads: 1, maxNodes: 20000 });
  const capacity10 = new C.Engine({ ...config, motion: { capacity: 10 } }).continuation({ maxNodes: 20000 });
  const timings = [null, .01, .05, .1].map(interval => replay(config, config.witnessActions, interval));
  return { ...C.metadata(), experimentId: config.experimentId, contentId: config.contentId,
    note: 'TG01 development fixture, not a mainline level. Rewards are simulated; no real video or wallet transaction.',
    definition: config.definition, metrics: config.metrics, proof: config.proof, noTools, undoOnly: undo, oneVideo,
    minimumNoToolCapacity: { lowerBound: config.proof.minimumPicks, upperBound: capacity10.status === 'solved' ? 10 : null, witness: capacity10 },
    realEngineNoTool: enumerateEngine(config), timedWitnesses: timings, config };
}
if (require.main === module) {
  const options = C.args(process.argv.slice(2)), report = analyze();
  const out = C.path.resolve(options.out || 'reports/levels/tool-gate-TG01.json'); C.save(out, report);
  console.log(JSON.stringify({ out, experimentId: report.experimentId, proof: report.proof.rows.map(r => ({recipeId:r.recipeId,minimumPicks:r.minimumPicks})),
    noTools: report.noTools.status, undoOnly: report.undoOnly.status, oneVideo: report.oneVideo.status,
    minimumNoToolCapacity: { lower: report.minimumNoToolCapacity.lowerBound, upper: report.minimumNoToolCapacity.upperBound },
    realEngineNoTool: report.realEngineNoTool, timedWitnesses: report.timedWitnesses }, null, 2));
  if (report.noTools.status !== 'unsolvable' || report.oneVideo.status !== 'solved' || report.realEngineNoTool.wins) process.exitCode = 1;
}
module.exports = { analyze, replay, enumerateEngine };
