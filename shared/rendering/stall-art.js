(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DapaidangStallArt = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function rounded(c, x, y, w, h, r, color) {
    c.fillStyle = color; c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.fill();
  }
  function ellipse(c, x, y, rx, ry, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  function words(c, t, x, y, size, color) { c.font = 'bold ' + size + 'px "PingFang SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(t, x, y); }
  function header(c, a) {
    rounded(c, 190, 32, 548, 126, 32, '#855236'); rounded(c, 201, 40, 526, 105, 27, '#efc788');
    Array.from('灯火大排档').forEach((letter, i) => words(c, letter, 278 + i * 92, 89 - Math.sin(i / 4 * Math.PI) * 8, 63, '#73442b'));
    for (let i = 0; i < 2; i++) {
      const x = 107 + i * 715; ellipse(c, x, 134, 29, 37, a.lamp.light);
      rounded(c, x - 3, 168, 6, 20, 2, a.lamp.color);
    }
  }
  function chef(c, x, y, scale, theme) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    rounded(c, -33, 3, 66, 80, 20, theme.color); ellipse(c, 0, -8, 29, 32, '#eec594');
    rounded(c, -33, -42, 66, 17, 5, '#fff0d2');
    for (const dx of [-20, 0, 20]) ellipse(c, dx, -48, 18, 19, '#fff5e0');
    ellipse(c, -9, -10, 2.5, 3.5, '#66452d'); ellipse(c, 9, -10, 2.5, 3.5, '#66452d');
    rounded(c, -15, 18, 30, 48, 5, '#f2d6a4'); c.restore();
  }
  function scene(c, images, a, box, options) {
    const [x, y, w, h] = box, o = options || {};
    c.save(); c.translate(x, y); c.scale(w / 928, h / 790);
    const g = c.createLinearGradient(0, 0, 0, 790); g.addColorStop(0, a.background.night); g.addColorStop(1, '#53635b');
    rounded(c, 0, 0, 928, 790, 25, g);
    for (let i = 0; i < 7; i++) {
      rounded(c, i * 157 - 40, 120 + i % 3 * 40, 125, 360, 8, i % 2 ? '#1e3639' : '#30494a');
      for (let j = 0; j < 3; j++) rounded(c, i * 157 - 14, 170 + j * 72 + i % 3 * 40, 17, 28, 2, '#d4b57238');
    }
    ellipse(c, 792, 65, 25, 25, '#e6d9b2');
    if (a.background.style >= 2) {
      c.fillStyle = a.background.style === 3 ? '#5a8b9b' : '#547f77'; c.fillRect(0, 478, 928, 130);
      for (let i = 0; i < 7; i++) rounded(c, i * 148, 520 + i % 2 * 25, 91, 3, 1, '#e7d5ad45');
    }
    c.fillStyle = '#798071'; c.beginPath(); c.moveTo(0, 790); c.lineTo(130, 550); c.lineTo(798, 550); c.lineTo(928, 790); c.fill();
    c.strokeStyle = '#ad9c7450'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(40, 600 + i * 40); c.lineTo(888, 600 + i * 40); c.stroke(); }
    c.strokeStyle = '#ae9366'; c.lineWidth = 3; c.beginPath(); c.moveTo(36, 75); c.quadraticCurveTo(464, 215, 892, 75); c.stroke();
    const lanterns = a.lamp.style === 0 ? 5 : 7;
    for (let i = 0; i < lanterns; i++) {
      const lx = 90 + i * 748 / (lanterns - 1), ly = 104 + Math.sin(i / (lanterns - 1) * Math.PI) * 42;
      c.save(); c.shadowColor = a.lamp.light; c.shadowBlur = 32;
      if (a.lamp.style === 2) rounded(c, lx - 20, ly, 40, 54, 8, a.lamp.light);
      else ellipse(c, lx, ly + 25, 23, 31, a.lamp.light);
      c.restore(); rounded(c, lx - 2, ly + 55, 4, 18, 1, '#e8bf74');
    }
    rounded(c, 199, 190, 530, 104, 24, '#765039'); rounded(c, 208, 197, 512, 85, 19, '#efce91');
    words(c, '灯火大排档', 464, 240, 59, '#71452f');
    c.save(); c.beginPath(); c.moveTo(176, 306); c.lineTo(752, 306); c.lineTo(793, 370); c.lineTo(135, 370); c.closePath(); c.clip();
    c.fillStyle = a.awning.color; c.fillRect(135, 306, 658, 64);
    c.fillStyle = '#f0d4a1'; for (let i = 0; i < 8; i++) c.fillRect(153 + i * 86, 306, a.awning.style === 2 ? 11 : 39, 64);
    c.restore(); rounded(c, 135, 365, 658, 18, 7, a.awning.color);
    rounded(c, 171, 385, 586, 217, 10, a.tables.wood); rounded(c, 196, 396, 535, 145, 8, '#8b603c');
    ['tomato', 'egg', 'pepper', 'shiitake'].forEach((id, i) => {
      const image = images[id]; if (image) { const scale = Math.min(62 / image.width, 64 / image.height); c.drawImage(image, 222 + i * 76, 419, image.width * scale, image.height * scale); }
    });
    chef(c, 656, 465, 1, a.chef);
    rounded(c, 149, 545, 630, 75, 12, '#dfac70'); rounded(c, 149, 563, 630, 61, 10, a.tables.wood);
    words(c, '热锅现炒  ·  越忙越香', 464, 588, 26, '#ffe7bc');
    ellipse(c, 275, 681, 140, 47, '#544f3e'); ellipse(c, 275, 666, 140, 47, a.tables.wood); ellipse(c, 275, 656, 135, 42, '#d4ac78');
    ellipse(c, 271, 652, 54, 20, a.plate.color); ellipse(c, 271, 649, 47, 17, '#fff0d3');
    const dish = images.d01; if (dish) c.drawImage(dish, 235, 625, 72, 49);
    for (const xx of [125, 390]) { rounded(c, xx, 710, 57, 24, 9, a.tables.color); rounded(c, xx + 12, 734, 9, 26, 2, '#6b513a'); }
    if (a.ornament.style) {
      rounded(c, 710, 648, 67, 65, 12, a.ornament.color); ellipse(c, 744, 642, 31, 19, '#91a47d');
      for (const dx of [-18, 0, 18]) ellipse(c, 744 + dx, 619 - Math.abs(dx) / 2, 9, 18, '#91a47d');
    } else { rounded(c, 704, 669, 69, 47, 8, '#c69464'); ellipse(c, 728, 691, 12, 12, '#695a43'); }
    rounded(c, 558, 646, 126, 75, 8, a.menu.color); words(c, '今日家常', 621, 668, 19, '#fff0d0'); words(c, '热乎上桌', 621, 697, 18, '#fff0d0');
    if (o.wallet !== undefined) { rounded(c, 331, 295, 266, 47, 18, '#e6b77a'); words(c, '金币 ' + o.wallet.toLocaleString(), 464, 320, 25, '#6c432e'); }
    c.restore();
  }
  return { scene, header, chef, rounded, ellipse };
});
