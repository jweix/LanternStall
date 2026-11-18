'use strict';
const assert=require('node:assert/strict'),os=require('node:os'),{spawnSync}=require('node:child_process');
const C=require('../scripts/level-tools/common.cjs'),G=require('../shared/core/board-geometry.js');
const Generator=require('../platforms/web/lab/experiments/tool-gate-generator.js');
const {enumerateEngine}=require('../scripts/analyze-tool-gate.cjs');
const basic=require('../configs/experiments/tool-gate.json'),triple=require('../configs/experiments/tool-gate-triple.json');
const sourceFile=C.path.join(C.root,'shared/data/level-config.js'),sourceBefore=C.fs.readFileSync(sourceFile,'utf8');
let verified=0;
function check(config){
 const stock={};for(const t of config.tiles)stock[t.food]=(stock[t.food]||0)+1;
 assert.deepEqual(stock,config.ingredientCounts);assert.equal(config.tiles.length,config.orderPlan.reduce((n,id)=>n+C.recipes.find(r=>r.id===id).ingredients.length,0));
 assert(config.proof.minimumPicks>=config.definition.gate.minPicks&&config.proof.minimumPicks<=config.definition.gate.maxPicks);
 assert(config.proof.minimumPicks>7);assert.equal(config.verification.noTools,'proven-unsolvable');
 for(const result of config.verification.timings){assert.equal(result.status,'won');assert.equal(result.ads,1);assert(result.peak<=7);assert(result.combinedPeak<=10);assert.equal(result.served,config.orderPlan.length);assert.equal(result.stash,0);assert.equal(result.buffer,0);}
 for(let i=0;i<config.tiles.length;i++)for(let j=i+1;j<config.tiles.length;j++)if(config.tiles[i].layer===config.tiles[j].layer)assert(!G.overlap(config.tiles[i],config.tiles[j]));
 const area=C.layout.board.area;for(const t of config.tiles){assert(t.x-t.w/2>=area.left&&t.x+t.w/2<=area.left+area.width);assert(t.y-t.h/2>=area.top&&t.y+t.h/2<=area.top+area.height);}
 assert.equal(config.tools.stash,0);assert.equal(config.rescueLimit,1);verified++;
}
for(const preset of [basic,triple])for(let i=0;i<32;i++)check(Generator.generate(C.recipes,C.layout,{...preset,seed:preset.seed+i}));
const a=Generator.generate(C.recipes,C.layout,basic),b=Generator.generate(C.recipes,C.layout,basic);
assert.deepEqual(a,b);assert.equal(Generator.verify(JSON.parse(JSON.stringify(a)),C.recipes,C.layout).contentId,a.contentId);
for(const config of [a,Generator.generate(C.recipes,C.layout,triple)]){const exact=enumerateEngine(config);assert.equal(exact.wins,0);assert(exact.failures>0);assert.equal(exact.maxRemoved,7);}
const nine={...basic,id:'TG-NINE',seed:123,layers:8,orders:['d01','d02','d03','d04','d05','d04','d05','d04','d05']};
const alternate={...basic,id:'TG-ALTERNATE',seed:123,shape:'twins',orders:['d04','d05','d08','d01','d03','d01','d03']};
check(Generator.generate(C.recipes,C.layout,nine));check(Generator.generate(C.recipes,C.layout,alternate));
for(const invalid of [
 {...basic,requiredTool:'undo'}, {...basic,toolUses:2}, {...basic,unknown:1}, {...basic,version:99},
 {...basic,seed:-1}, {...basic,seed:1.5}, {...basic,layers:9}, {...basic,shape:'__proto__'},
 {...basic,gate:{minPicks:7,maxPicks:10}}, {...basic,gate:{minPicks:10,maxPicks:8}},
 {...basic,generation:{maxAttempts:0,maxSearchNodes:20000}}, {...basic,orders:[['d01']]},
 {...basic,orders:['d01','d02','d15']}, {...basic,orders:['missing','d02','d03']}
])assert.throws(()=>Generator.generate(C.recipes,C.layout,invalid));
assert.throws(()=>Generator.generate(C.recipes,C.layout,{...basic,layers:3,orders:['d01','d02','d03']}),/later-only/);
assert.throws(()=>Generator.generate(C.recipes,C.layout,{...basic,layers:2,generation:{maxAttempts:8,maxSearchNodes:20000}}),/No verified/);
let unknown;
try{Generator.generate(C.recipes,C.layout,{...triple,generation:{maxAttempts:1,maxSearchNodes:1}});}catch(e){unknown=e;}
assert(unknown);assert.equal(unknown.rejected.unknownWithTool,1,'A bounded search miss must be rejected as unknown');
for(const field of ['tiles','witnessActions','proof']){
 const bad=JSON.parse(JSON.stringify(a));
 if(field==='tiles')bad.tiles[0].food=bad.tiles[0].food==='tomato'?'egg':'tomato';else if(field==='witnessActions')bad.witnessActions.pop();else bad.proof.minimumPicks=8;
 assert.throws(()=>Generator.verify(bad,C.recipes,C.layout),/mismatch/);
}
const injected={...a,motion:{capacity:10},tools:{stash:99},rescueLimit:99};
const canonical=Generator.verify(injected,C.recipes,C.layout);assert.equal(canonical.motion,undefined);assert.equal(canonical.tools.stash,0);assert.equal(canonical.rescueLimit,1);
assert.throws(()=>C.Levels.createLevel(C.recipes,C.layout,99,{definition:a.definition}),/experimental/);
const dir=C.fs.mkdtempSync(C.path.join(os.tmpdir(),'lantern-tool-generation-'));
try{
 const out=C.path.join(dir,'batch.json'),run=args=>spawnSync(process.execPath,[C.path.join(C.root,'scripts/generate-tool-levels.cjs'),...args],{cwd:C.root,encoding:'utf8'});
 let child=run(['--config','configs/experiments/tool-gate.json','--count','3','--out',out]);assert.equal(child.status,0,child.stderr);
 const batch=JSON.parse(C.fs.readFileSync(out,'utf8'));assert.equal(batch.kind,'lantern-tool-gate-batch');assert.equal(batch.boards.length,3);assert.deepEqual(batch.boards.map(c=>c.seed),[20261118,20261119,20261120]);
 assert.equal(batch.recipeHash,C.metadata().recipeHash);assert.equal(batch.layoutHash,C.metadata().layoutHash);assert.equal(batch.toolGateGeneratorVersion,Generator.VERSION);
 for(const c of batch.boards)assert.equal(Generator.verify(c,C.recipes,C.layout).contentId,c.contentId);
 const before=C.fs.readFileSync(out,'utf8'),badConfig=C.path.join(dir,'bad.json');
 C.fs.writeFileSync(badConfig,JSON.stringify({...triple,generation:{maxAttempts:1,maxSearchNodes:1}}));
 child=run(['--config',badConfig,'--out',out]);assert.notEqual(child.status,0);assert.match(child.stderr,/unknownWithTool/);assert.equal(C.fs.readFileSync(out,'utf8'),before,'Failed batch must preserve previous artifact');
 for(const args of [['--count','65'],['--count'],['--unknown','1'],['--out','shared/data/level-config.json']])assert.notEqual(run(args).status,0);
 assert.equal(run(['--help']).status,0);
}finally{C.fs.rmSync(dir,{recursive:true,force:true});}
assert.equal(C.fs.readFileSync(sourceFile,'utf8'),sourceBefore,'Experimental generation must not change mainline config');
console.log('PASS configurable tool generation: '+verified+' seeded boards, two presets, 14/17/18 cards, 7/8 layers and three shapes; exact ledgers, proof and four timed witnesses');
console.log('PASS deterministic regeneration/import, independent no-tool engine enumeration, bounded unknown rejection, invalid config and tampered artifact rejection');
console.log('PASS batch CLI/version hashes, seed sequence, failed-output preservation, production-path guard and mainline isolation');
