(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DapaidangBoardTemplates = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Cells grow symmetrically from the centre of each silhouette. A 0 stays empty on every layer.
  return {
    pairs: { name: '教学双行', rows: ['1111', '1111'] },
    islands: { name: '双岛', rows: ['11011', '11011'] },
    ring: { name: '中空回环', rows: ['11111', '10001', '10001', '10001', '11111'] },
    bridge: { name: '阶梯桥', rows: ['11011', '11011', '11111', '10001'] },
    lantern: { name: '灯笼', rows: ['01110', '11111', '11111', '11111', '01110'] },
    twins: { name: '双峰', rows: ['11011', '11011', '11011', '11011'] }
  };
});
