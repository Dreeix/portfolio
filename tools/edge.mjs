// Shared headless Edge launcher over the DevTools protocol (no window). Used by shot.mjs, check.mjs, perf.mjs.
// const b = await launch(); await b.send('Page.navigate', {url}); await b.evalJs('1+1'); b.close();
// Software WebGL (SwiftShader) is on so three.js pages render headless.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);

export async function launch({ extraArgs = [] } = {}) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-'));
  const proc = spawn(EDGE, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${prof}`, ...extraArgs, 'about:blank'], { stdio: 'ignore' });
  // Windows: Edge spawns a process tree; proc.kill() leaves orphans → kill the whole tree
  const kill = () => { try { process.platform === 'win32' ? spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }) : proc.kill(); } catch {} };
  const close = () => { kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3 }); } catch {} }, 800); };
  try {
    let port, target;
    for (let t = 0; t < 120 && !target; t++) {
      await sleep(250);
      try { port ||= +fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {}
      if (port) try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {}
    }
    if (!target) throw new Error('Edge did not start (no DevTools target in 30 s)');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map(), listeners = [];
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) listeners.forEach(f => f(d)); };
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const evalJs = async expr => { const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result; return r?.exceptionDetails ? 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r?.result?.value; };
    // Browser.close shuts down the whole Edge tree (the launcher pid exits early, so taskkill alone leaves orphans)
    const shutdown = async () => { await Promise.race([send('Browser.close'), sleep(1500)]); try { ws.close(); } catch {} close(); };
    return { send, evalJs, on: f => listeners.push(f), close: shutdown };
  } catch (e) { close(); throw e; }
}
