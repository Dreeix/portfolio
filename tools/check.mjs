// Headless __dbg.check() at phone width, printed as text (no window, no screenshot).
// Usage: node tools/check.mjs <url> [width=375] [js-to-run-first]   e.g. node tools/check.mjs http://localhost:8080/shop/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, W = 375, pre = ''] = process.argv.slice(2);
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => { const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result; return r?.exceptionDetails ? 'EXCEPTION: ' + r.exceptionDetails.exception?.description : r?.result?.value; };
let failed = true;
try {
  let target;
  for (let t = 0; t < 40 && !target; t++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {} }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: 812, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  for (let t = 0; t < 40; t++) { await sleep(250); if (await evalJs('!!window.__dbg?.site')) break; }
  await evalJs('document.fonts.ready.then(() => 1)');
  if (pre) console.log('pre:', await evalJs(`(async()=>{${pre}})()`));
  const out = await evalJs('window.__dbg ? __dbg.check() : "no __dbg (not localhost?)"');
  console.log(out);
  failed = /✗|no __dbg/.test(out);
} finally { proc.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3 }); } catch {} }, 1000); setTimeout(() => process.exit(failed ? 1 : 0), 1500); }
