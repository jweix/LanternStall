// node scripts/test-game.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
for (const file of ['shared/core/game-engine.js', 'tests/core/game-engine.test.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
console.log(JSON.stringify(context.runGameTests(context.LanternGame), null, 2));
