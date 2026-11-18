'use strict';
const assert = require('node:assert/strict'), C = require('../scripts/level-tools/common.cjs');
const Gate = require('../platforms/web/lab/experiments/tool-gate.js'), { analyze } = require('../scripts/analyze-tool-gate.cjs');
const report = analyze(), config = report.config;
assert.deepEqual(report.proof.rows.map(r => r.minimumPicks), [10, 12, 14]);
assert.equal(report.proof.status, 'unsolvable');
assert.equal(report.noTools.status, 'unsolvable'); assert.equal(report.undoOnly.status, 'unsolvable');
assert.equal(report.oneVideo.status, 'solved');
assert.deepEqual(report.realEngineNoTool, { visited: 255, failures: 128, wins: 0, maxRemoved: 7 });
assert.equal(report.minimumNoToolCapacity.lowerBound, 10); assert.equal(report.minimumNoToolCapacity.upperBound, 10);
for (const result of report.timedWitnesses) {
  assert.equal(result.status, 'won'); assert.equal(result.ads, 1);
  assert.deepEqual(result.toolUsed, { undo: false, stash: true, shuffle: false });
  assert.equal(result.peak, 7); assert.equal(result.combinedPeak, 10); assert.equal(result.served, 7);
  assert.equal(result.revenue, 260); assert.equal(result.buffer, 0); assert.equal(result.stash, 0);
}
assert.equal(new C.Engine(config).continuation({maxNodes:0}).status, 'unknown', 'Budget exhaustion never proves impossibility');
assert.throws(() => C.Levels.createLevel(C.recipes, C.layout, 99, {definition:config.definition}), /experimental/);
const flat = {...config, tiles:config.tiles.map((t,i)=>({...t,layer:0,x:i*160}))};
assert.equal(Gate.firstCompletionProof(flat).status, 'unknown', 'A bound within seven cannot certify impossibility');
assert.equal(new C.Engine(flat).continuation({maxNodes:20000}).status, 'solved');
assert.throws(() => Gate.firstCompletionProof({...config,tiles:config.tiles.map(t=>({...t,removed:true}))}), /fresh deck/);
const failed = new C.Engine(config), route = C.Levels.probeLevel(config,'greedy',997).route;
for (const id of route) { assert(failed.selectTile(id).ok); C.settle(failed); }
assert.equal(failed.status,'failed'); assert.equal(failed.jobs.length,0); assert.equal(failed.buffer.length,7);
assert(failed.applyRewardedRescue('stash',failed.levelId+'/test-video'));
assert.equal(failed.buffer.length,4); assert.equal(failed.stashItems.length,3); assert.equal(failed.status,'playing');
const rescue = failed.continuation({maxNodes:20000}); assert.equal(rescue.status,'solved');
assert(failed.replayActions(rescue.actions)); assert.equal(failed.rescueCount,1); assert.equal(failed.revenue,260);
console.log('PASS TG01: capacity proof 10/12/14 > 7, exact real-engine enumeration 255 states/128 failures/no wins');
console.log('PASS TG01: one rewarded move-out wins, all ingredients served, stable and .01/.05/.1 input replay; exact no-tool capacity 10');
console.log('PASS TG01: full-buffer failure → one move-out → continuation → win; unknown, flat-board counterexample and mainline isolation');
