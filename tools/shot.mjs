// Offscreen screenshots via headless Edge + DevTools protocol (no window opens).
// Thumbnails: SHOT_DPR=2 node tools/shot.mjs <url> out.webp 375 760 1   (single screen, webp/jpg, quality 72)
// Usage: node tools/shot.mjs <url> <out.png> [width=375] [height=812] [screens=6] [js-to-run-before]
// Produces one contact sheet: `screens` consecutive viewports side by side (phone emulation, real 375px layout).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, out, W = 375, H = 812, N = 6, pre = ''] = process.argv.slice(2);
const w = +W, h = +H, n = +N;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

try {
  let target;
  for (let t = 0; t < 40 && !target; t++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {} }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: +(process.env.SHOT_DPR || 1), mobile: true });
  await send('Page.navigate', { url });
  await sleep(2500);
  if (pre) console.log('pre:', await evalJs(pre));
  await evalJs(`document.documentElement.style.scrollBehavior='auto'; window.__dbg?.reveal(); 1`);
  const total = await evalJs('document.documentElement.scrollHeight');
  const shots = [];
  // States mode: SHOT_STATES='["js1","js2"]' → one screenshot per snippet (e.g. each step of a flow) instead of scrolling
  const states = process.env.SHOT_STATES ? JSON.parse(process.env.SHOT_STATES) : null;
  if (states) for (const js of states) {
    await evalJs(`(async()=>{${js}})()`); await sleep(600);
    shots.push((await send('Page.captureScreenshot', { format: 'png' })).result.data);
  }
  else for (let i = 0; i < n; i++) {
    const y = Math.min(i * (h - 60), Math.max(0, total - h));
    await evalJs(`scrollTo(0,${y}); window.__dbg?.reveal(); 1`); await sleep(700);
    shots.push((await send('Page.captureScreenshot', { format: 'png' })).result.data);
    if (y >= total - h) break;
  }
  // Single screen → save directly (format from extension: .png / .jpg / .webp; SHOT_DPR=2 for retina thumbs)
  const ext = path.extname(out).slice(1).replace('jpg', 'jpeg');
  if (shots.length === 1 && ext !== 'png') {
    await evalJs('1');
    const fmt = { format: ext, quality: 72 };
    const last = states ? `(async()=>{})()` : `scrollTo(0,0)`; await evalJs(last); await sleep(300);
    fs.writeFileSync(out, Buffer.from((await send('Page.captureScreenshot', fmt)).result.data, 'base64'));
    console.log(`saved ${out} (${fs.statSync(out).size >> 10} KB)`);
  } else {
  // Stitch side by side using the browser itself
  const html = `<body style="margin:0;background:#666;display:flex;gap:6px">${shots.map(s => `<img src="data:image/png;base64,${s}">`).join('')}</body>`;
  await send('Emulation.setDeviceMetricsOverride', { width: shots.length * (w + 6), height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
  await sleep(800);
  fs.writeFileSync(out, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  console.log(`saved ${out} (${shots.length} screens, page height ${total}px)`);
  }
} finally { proc.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3 }); } catch {} }, 1500); setTimeout(() => process.exit(0), 2000); }
