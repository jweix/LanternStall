// node scripts/test-platform.cjs
const { runHostAdapterTests } = require('../tests/web-preview/host-adapter.test.cjs');

runHostAdapterTests().then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
