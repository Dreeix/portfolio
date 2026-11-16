// Link-preview images (Open Graph, 1200×630 JPG) for every site, in ONE headless Edge launch (no window).
// Template: tools/og/card.html (content from assets/js/data.js: title, kind, tags, accent, phone thumbnail).
// Usage: node tools/og.mjs [base=http://localhost:8080/] [ids...]   → <site>/img/og.jpg, homepage assets/img/og.jpg
// Quality is stepped so each file lands in ~60–100 KB. Re-run after changing a site's thumbnail or its homepage entry.
// Meta tags that point at these files: node tools/og-tags.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep, checkNoLeftovers } from './edge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [baseArg, ...only] = process.argv.slice(2);
const base = (baseArg || 'http://localhost:8080/').replace(/\/?$/, '/');
const OG_OUT = { home: 'assets/img/og.jpg', cafe: 'cafe/img/og.jpg', gym: 'gym/img/og.jpg', barber: 'barber/img/og.jpg', shop: 'shop/img/og.jpg', headphones: 'headphones/img/og.jpg' };
const ids = only.length ? only : Object.keys(OG_OUT);
const MIN = 60 * 1024, MAX = 100 * 1024;

let failed = false;
const b = await launch({ timeoutMs: 120000 });
const { send, evalJs } = b;
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + 'tools/og/card.html' });
  for (let t = 0; t < 40; t++) { await sleep(250); if (await evalJs('typeof og === "function" && document.readyState === "complete"')) break; }
  for (const id of ids) {
    const r = await evalJs(`og(${JSON.stringify(id)})`);
    if (r !== id) { console.log(`✗ ${id}: ${r}`); failed = true; continue; }
    await sleep(150);
    let q = 82, buf;
    for (let i = 0; i < 6; i++) { // step quality into the size band
      buf = Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: q })).result.data, 'base64');
      if (buf.length > MAX && q > 50) q -= 8; else if (buf.length < MIN && q < 94) q += 4; else break;
    }
    const out = path.join(root, OG_OUT[id]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    const ok = buf.length <= MAX * 1.2;
    failed ||= !ok;
    console.log(`${ok ? '✓' : '✗'} ${OG_OUT[id]}  ${(buf.length / 1024).toFixed(0)} KB (q ${q})`);
  }
} finally { await b.close(); if (!checkNoLeftovers()) failed = true; process.exit(failed ? 1 : 0); }
