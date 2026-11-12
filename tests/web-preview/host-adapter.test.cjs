const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'platforms/web-preview/src/host-adapter.js'), 'utf8');

function fixture(openai) {
  const handlers = new Map();
  const host = {
    openai,
    addEventListener(name, handler) { handlers.set(name, handler); },
    removeEventListener(name, handler) {
      if (handlers.get(name) === handler) handlers.delete(name);
    }
  };
  vm.runInNewContext(source, host);
  return { adapter: host.LanternPlatform, handlers };
}

async function runHostAdapterTests() {
  const passed = [];
  const check = async (name, fn) => { await fn(); passed.push(name); };
  const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
  await check('普通浏览器无宿主时仍可读取和保存', async () => {
    const { adapter } = fixture();
    assert.equal(adapter.loadGame(), null);
    await adapter.saveGame({ version: 2 }, { served: 0 });
  });
  await check('保留宿主已有版本 2 存档', () => {
    const game = { version: 2, seed: 42, served: 3, coins: 150 };
    const { adapter } = fixture({ widgetState: { privateContent: { game } } });
    same(adapter.loadGame(), game);
  });
  await check('版本 3 收入与理菜映射存档不被宿主适配改写', async () => {
    let saved;
    const game={version:3,seed:42,income:298,revenueTarget:300,reserve:[3],boardFoods:['tomato','egg'],charges:{move:0,undo:1,shuffle:0}};
    const {adapter}=fixture({widgetState:{privateContent:{game}},setWidgetState(payload){saved=payload;}});
    same(adapter.loadGame(),game);
    await adapter.saveGame(game,{game:'灯火大排档',income:298,revenueTarget:300});
    same(saved.privateContent.game,game);
  });
  await check('版本 4 待出餐队列可由宿主完整保存与恢复', async () => {
    let saved;
    const game={version:4,seed:42,income:28,revenueTarget:300,pending:[{key:'dish-1',id:1,ingredients:['chicken','mushroom','onion'],reward:42,tip:2}],deliverySerial:2};
    const {adapter}=fixture({widgetState:{privateContent:{game}},setWidgetState(payload){saved=payload;}});
    same(adapter.loadGame(),game);
    await adapter.saveGame(game,{game:'灯火大排档',income:28,revenueTarget:300});
    same(saved.privateContent.game,game);
  });
  await check('保存结构兼容宿主的公开摘要与私有存档', async () => {
    let saved;
    const { adapter } = fixture({ setWidgetState(payload) { saved = payload; } });
    const game = { version: 2, seed: 42, served: 3 };
    const summary = { game: '灯火排挡', served: 3 };
    await adapter.saveGame(game, summary);
    same(saved, { modelContent: summary, privateContent: { game } });
  });
  await check('宿主异步存档失败不会中断游戏', async () => {
    const { adapter } = fixture({ setWidgetState() { return Promise.reject(new Error('offline')); } });
    await adapter.saveGame({ version: 2 }, {});
  });
  await check('连续操作时忽略本页存档回声，保留外部恢复事件', async () => {
    const {adapter,handlers}=fixture({setWidgetState(){}});
    const received=[];
    adapter.onGameChanged(state=>received.push(state));
    const first={version:4,income:0,pending:[{key:'dish-0'}]},second={version:4,income:28,pending:[]};
    await adapter.saveGame(first,{});await adapter.saveGame(second,{});
    const emit=game=>handlers.get('openai:set_globals')({detail:{globals:{widgetState:{privateContent:{game}}}}});
    emit(first);emit(second);assert.equal(received.length,0);
    const external={version:4,income:42,pending:[]};emit(external);same(received,[external]);
  });
  await check('宿主同步存档失败不会中断游戏', async () => {
    const { adapter } = fixture({ setWidgetState() { throw new Error('unavailable'); } });
    await adapter.saveGame({ version: 2 }, {});
  });
  await check('宿主恢复事件只传递存档且可取消订阅', () => {
    const { adapter, handlers } = fixture();
    const received = [];
    const unsubscribe = adapter.onGameChanged(state => received.push(state));
    const handler = handlers.get('openai:set_globals');
    handler({ detail: { globals: { theme: 'dark' } } });
    assert.equal(received.length, 0);
    const game = { version: 2, seed: 12, served: 7 };
    handler({ detail: { globals: { widgetState: { privateContent: { game } } } } });
    same(received, [game]);
    unsubscribe();
    assert.equal(handlers.size, 0);
  });
  // 同时确认拆分后的脚本均可解析；页面本身不在纯规则环境中执行。
  for (const file of ['shared/core/game-engine.js', 'platforms/web-preview/src/cook-animation.js', 'platforms/web-preview/src/app.js']) {
    new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  }
  return { passed: passed.length, cases: passed };
}

module.exports = { runHostAdapterTests };
