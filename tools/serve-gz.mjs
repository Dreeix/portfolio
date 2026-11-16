// Static server with gzip like GitHub Pages, for realistic local perf runs (python http.server sends everything uncompressed).
// Usage: node tools/serve-gz.mjs [port=8090]  → serves the repo root; then: node tools/perf.mjs http://localhost:8090/headphones/ all
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), port = +(process.argv[2] || 8090);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain' };
const GZ = /^(text|application\/json|image\/svg)/;
http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
  const type = TYPES[path.extname(f)] || 'application/octet-stream', body = fs.readFileSync(f);
  const gz = GZ.test(type) && /gzip/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'content-type': type, 'cache-control': 'max-age=600', ...(gz && { 'content-encoding': 'gzip' }) });
  res.end(gz ? zlib.gzipSync(body) : body);
}).listen(port, '127.0.0.1', () => console.log(`gzip static server: http://localhost:${port}/`));
