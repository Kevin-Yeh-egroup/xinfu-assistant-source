#!/usr/bin/env node
// 在本機看網站版（先 npm run build）：node scripts/serve.mjs [port]
//   http://127.0.0.1:8765/ 引導員版、/review 審查人員版（網址結構和 Vercel 上相同）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, process.env.SITE_DIR || 'site');
const PORT = Number(process.argv[2] || process.env.PORT || 8765);
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function resolve(urlPath) {
  const p = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE)) return null;
  for (const c of [f, path.join(f, 'index.html'), f + '.html']) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

http.createServer((req, res) => {
  const f = resolve(new URL(req.url, 'http://localhost').pathname);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('找不到這個頁面（先執行 npm run build？）'); return; }
  const type = TYPES[path.extname(f)] || 'application/octet-stream';
  const size = fs.statSync(f).size;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) { // 影片拖曳進度要用 Range
    const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(f, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`網站版：http://127.0.0.1:${PORT}/　審查人員版：http://127.0.0.1:${PORT}/review`));
