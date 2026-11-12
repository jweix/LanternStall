'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.pdf': 'application/pdf' };
const port = Number(process.env.LANTERN_PORT || 4173);
http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (_) { res.writeHead(400).end(); return; }
  if (name === '/') { res.writeHead(302, { Location: '/platforms/web/' }).end(); return; }
  const file = path.resolve(root, '.' + name, name.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep) || name.split('/').some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log('浏览器试玩：http://127.0.0.1:' + port + '/platforms/web/'));
