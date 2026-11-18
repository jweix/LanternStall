'use strict';
const C = require('./level-tools/common.cjs');
const Generator = require('../platforms/web/lab/experiments/tool-gate-generator.js');
function run(argv) {
  const options = C.args(argv);
  for (const key of Object.keys(options)) if (!['config','count','seed','out','help'].includes(key)) throw Error('Unknown option: ' + key);
  for (const [key,value] of Object.entries(options)) if (key!=='help' && value===true) throw Error('Missing value for --' + key);
  if (options.help) {
    console.log('npm run levels:generate:tool-gate -- --config configs/experiments/tool-gate.json --count 3 --seed 20261118 --out reports/levels/generated-tool-gates.json');
    return;
  }
  const source = C.path.resolve(options.config || 'configs/experiments/tool-gate.json');
  const definition = Generator.normalize(JSON.parse(C.fs.readFileSync(source, 'utf8')));
  const count = C.integer(options.count, 1, 1, 64), seed = C.integer(options.seed, definition.seed, 0, 0xffffffff);
  const out = C.path.resolve(options.out || 'reports/levels/generated-tool-gates.json');
  if (!out.endsWith('.json') || out === source || ['shared','platforms/douyin','platforms/wechat'].some(p => out.startsWith(C.path.join(C.root,p) + C.path.sep)))
    throw Error('Output must be a separate .json development artifact outside shared/native source directories.');
  const boards = [];
  for (let i = 0; i < count; i++) {
    const currentSeed = (seed + i) >>> 0;
    try { boards.push(Generator.generate(C.recipes, C.layout, {...definition,seed:currentSeed})); }
    catch (error) { throw Error('Seed ' + currentSeed + ': ' + error.message + ' No batch output was written.'); }
  }
  const distinct = new Set(boards.map(c => JSON.stringify(c.tiles.map(t => [t.x,t.y,t.layer,t.food])))).size;
  const report = { kind:'lantern-tool-gate-batch', schemaVersion:1, ...C.metadata(),
    toolGateGeneratorVersion:Generator.VERSION, note:'Experimental generation only; no mainline config, wallet or real ad changes.',
    sourceDefinition:{...definition,seed}, count, distinctLayouts:distinct, boards };
  C.save(out, report);
  console.log(JSON.stringify({out,count,distinctLayouts:distinct,boards:boards.map(c=>({id:c.experimentId,seed:c.seed,contentId:c.contentId,
    cards:c.metrics.tileCount,shape:c.shape,layers:c.metrics.layerCount,minimumFirstDishPicks:c.proof.minimumPicks,
    attempts:c.metrics.generationAttempts,visited:c.metrics.searchVisited,oneStash:c.verification.oneStash}))},null,2));
  return report;
}
if (require.main === module) { try { run(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode=1; } }
module.exports = {run};
