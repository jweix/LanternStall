(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../data/board-templates.js'));
  else root.DapaidangGeometry = factory(root.DapaidangBoardTemplates);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Templates) {
  'use strict';
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - .5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - .5;
  const paintOrder = (a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
  function graph(tiles) {
    return tiles.map(n => tiles.reduce((parents, t, i) => {
      if (t.layer > n.layer && overlap(n, t)) parents.push(i);
      return parents;
    }, []));
  }
  function create(layout, shape, count, depth, variant) {
    const template = Templates[shape], b = layout.board;
    if (!template) throw Error('Unknown board shape: ' + shape);
    const rows = template.rows, cols = Math.max(...rows.map(r => r.length)), cells = [];
    rows.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') cells.push({ x, y }); }));
    if (!Number.isInteger(depth) || depth < 1 || depth > 8 || count < depth || count > cells.length * depth)
      throw Error('Shape ' + shape + ' cannot hold ' + count + ' cards in ' + depth + ' layers.');
    const cx = (cols - 1) / 2, cy = (rows.length - 1) / 2;
    cells.sort((a, z) => Math.max(Math.abs(a.x - cx), Math.abs(a.y - cy)) - Math.max(Math.abs(z.x - cx), Math.abs(z.y - cy)) ||
      Math.abs(a.x - cx) + Math.abs(a.y - cy) - Math.abs(z.x - cx) - Math.abs(z.y - cy) || a.y - z.y || a.x - z.x);
    // Allocate exact counts from bottom to top; upper cells are supported by lower cells.
    const counts = Array(depth).fill(Math.floor(count / depth));
    for (let i = 0; i < count % depth; i++) counts[i]++;
    const tiles = [];
    for (let layer = 0; layer < depth; layer++) for (let i = 0; i < counts[layer]; i++) {
      const cell = cells[i], x = variant & 1 ? cols - 1 - cell.x : cell.x;
      tiles.push({ id: 'tile-' + layer + '-' + cell.y + '-' + x, layer, region: x < cx ? 'left' : x > cx ? 'right' : 'centre',
        x: x * (b.tileW + b.gapX) + (layer % 2 ? b.lowerOffsetX : 0),
        y: cell.y * b.stepY + (layer % 2 ? b.lowerOffsetY : 0), w: b.tileW, h: b.tileH, food: '' });
    }
    const minX = Math.min(...tiles.map(t => t.x - t.w / 2)), maxX = Math.max(...tiles.map(t => t.x + t.w / 2));
    const minY = Math.min(...tiles.map(t => t.y - t.h / 2)), maxY = Math.max(...tiles.map(t => t.y + t.h / 2));
    const area = b.area || { left: 55, top: 536, width: 818, height: 791 };
    if (maxX - minX > area.width - 8 || maxY - minY > area.height - 8) throw Error('Board exceeds its drawing/touch area.');
    const dx = area.left + (area.width - maxX - minX) / 2, dy = area.top + (area.height - maxY - minY) / 2;
    for (const t of tiles) { t.x += dx; t.y += dy; }
    return tiles.sort(paintOrder);
  }
  return { create, graph, overlap, paintOrder, templates: Templates };
});
