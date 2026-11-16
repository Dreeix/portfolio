// Offscreen screenshots via headless Edge + DevTools protocol (no window opens). Launcher: tools/edge.mjs
// Usage: node tools/shot.mjs <url> <out.png> [width=375] [height=812] [screens=6] [js-to-run-before]
// Produces one contact sheet: `screens` consecutive viewports side by side (phone emulation, real 375px layout).
// Thumbnails: SHOT_DPR=2 node tools/shot.mjs <url> out.webp 375 760 1   (single screen, webp/jpg, quality 72)
// EDGE_GL=1 → software WebGL (auto for /headphones/). One launch per call: batch states with SHOT_STATES instead of many runs.
// SHOT_STATES='["js1","js2"]' → one screen per JS snippet instead of scrolling.  SHOT_TRANSPARENT=1 → keep alpha (posters).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { launch, sleep, checkNoLeftovers } from './edge.mjs';

const [url, out, W = 375, H = 812, N = 6, pre = ''] = process.argv.slice(2);
const w = +W, h = +H, n = +N;
const b = await launch({ gl: process.env.EDGE_GL === '1' || /\/headphones\//.test(url), timeoutMs: 180000 }); // software WebGL only for 3D pages (or EDGE_GL=1)
const { send, evalJs } = b;
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: +(process.env.SHOT_DPR || 1), mobile: true });
  if (process.env.SHOT_TRANSPARENT) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.navigate', { url });
  await sleep(2500);
  if (pre) console.log('pre:', await evalJs(pre));
  await evalJs(`document.documentElement.style.scrollBehavior='auto'; window.__dbg?.reveal(); 1`);
  const total = await evalJs('document.documentElement.scrollHeight');
  const shots = [];
  const states = process.env.SHOT_STATES ? JSON.parse(process.env.SHOT_STATES) : null;
  if (states) for (const js of states) {
    await evalJs(`(async()=>{${js}})()`); await sleep(600);
    shots.push((await send('Page.captureScreenshot', { format: 'png' })).result.data);
  }
  else for (let i = 0; i < n; i++) {
    const y = Math.min(i * (h - 60), Math.max(0, total - h));
    await evalJs(`scrollTo(0,${y}); window.__dbg?.reveal(); 1`); await sleep(+(process.env.SHOT_WAIT || 700));
    shots.push((await send('Page.captureScreenshot', { format: 'png' })).result.data);
    if (y >= total - h) break;
  }
  const ext = path.extname(out).slice(1).replace('jpg', 'jpeg');
  if (shots.length === 1 && ext !== 'png') {
    await evalJs(states ? '1' : 'scrollTo(0,0)'); await sleep(300);
    fs.writeFileSync(out, Buffer.from((await send('Page.captureScreenshot', { format: ext, quality: 72 })).result.data, 'base64'));
    console.log(`saved ${out} (${fs.statSync(out).size >> 10} KB)`);
  } else {
    // Stitch side by side using the browser itself
    const html = `<body style="margin:0;background:#666;display:flex;gap:6px">${shots.map(s => `<img src="data:image/png;base64,${s}">`).join('')}</body>`;
    await send('Emulation.setDeviceMetricsOverride', { width: shots.length * (w + 6), height: h, deviceScaleFactor: 1, mobile: false });
    const tmp = path.join(os.tmpdir(), `sheet-${process.pid}.html`); fs.writeFileSync(tmp, html); // file, not data: URL (big sheets exceed the data: URL limit)
    await send('Page.navigate', { url: pathToFileURL(tmp).href });
    await sleep(800); setTimeout(() => fs.rmSync(tmp, { force: true }), 500);
    fs.writeFileSync(out, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
    console.log(`saved ${out} (${shots.length} screens, page height ${total}px)`);
  }
} finally { await b.close(); checkNoLeftovers(); process.exit(0); }
