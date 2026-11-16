// Headless __dbg.check() at phone width, printed as text (no window, no screenshot). Launcher: tools/edge.mjs
// Usage: node tools/check.mjs <url> [width=375] [js-to-run-first]   e.g. node tools/check.mjs http://localhost:8080/shop/
// Waits for __dbg.site.ready() when a site defines it (e.g. lazy 3D settling).
import { launch, sleep, checkNoLeftovers } from './edge.mjs';

const [url, W = 375, pre = ''] = process.argv.slice(2);
let failed = true;
const b = await launch({ gl: process.env.EDGE_GL === '1' || /\/headphones\//.test(url), timeoutMs: 90000 }); // software WebGL only for 3D pages (or EDGE_GL=1)
const { send, evalJs } = b;
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: 812, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  for (let t = 0; t < 40; t++) { await sleep(250); if (await evalJs('!!window.__dbg?.site')) break; }
  await evalJs('document.fonts.ready.then(() => 1)');
  await evalJs('window.__dbg?.site?.ready ? __dbg.site.ready().then(() => 1) : 1');
  if (pre) console.log('pre:', await evalJs(`(async()=>{${pre}})()`));
  const out = await evalJs('window.__dbg ? __dbg.check() : "no __dbg (not localhost?)"');
  console.log(out);
  failed = /✗|no __dbg/.test(out);
} finally { await b.close(); if (!checkNoLeftovers()) failed = true; process.exit(failed ? 1 : 0); }
