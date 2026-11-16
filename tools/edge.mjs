// Shared headless Edge launcher over the DevTools protocol (no window). Used by shot.mjs, check.mjs, perf.mjs.
//   const b = await launch({ gl, timeoutMs }); await b.send('Page.navigate', {url}); await b.evalJs('1+1'); await b.close();
//   node tools/edge.mjs --leftovers   → prints how many headless Edge processes are alive (exit 1 if any)
// Machine safety (a pile of orphan Edge processes once froze the laptop):
// - refuses to start while headless Edge from an earlier run is still alive (prints the count)
// - kills the whole process tree (taskkill /T /F) on close, error, hard timeout, Ctrl+C / SIGTERM, crash
// - `--edge-skip-compat-layer-relaunch`: otherwise Edge relaunches itself, the spawned PID exits and the tree kill misses the real browser
// - software WebGL (SwiftShader) only with { gl: true } (3D pages); otherwise GPU/WebGL off = cheaper
// - one browser at a time: tools run sequentially and batch states into one launch
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const WIN = process.platform === 'win32';

/** Headless Edge processes alive right now (any run, any tool). */
export function leftovers() {
  if (!WIN) { const r = spawnSync('pgrep', ['-fc', 'msedge.*--headless'], { encoding: 'utf8' }); return +(r.stdout || 0); }
  const r = spawnSync('powershell', ['-NoProfile', '-Command', `@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe' AND CommandLine LIKE '%--headless%'").Count`], { encoding: 'utf8', timeout: 20000 });
  return +(r.stdout || '').trim() || 0;
}
/** Saved check: after a run there must be 0 headless Edge left. Prints one line, returns ok. */
export function checkNoLeftovers(label = 'after run') {
  const n = leftovers();
  console.error(n ? `✗ ${n} headless Edge process(es) still alive ${label} — kill: powershell "Get-CimInstance Win32_Process -Filter \\"Name='msedge.exe' AND CommandLine LIKE '%--headless%'\\" | % { taskkill /T /F /PID $_.ProcessId }"` : `✓ 0 headless Edge left ${label}`);
  return n === 0;
}

export async function launch({ gl = false, timeoutMs = 120000 } = {}) {
  if (process.env.EDGE_TIMEOUT) timeoutMs = +process.env.EDGE_TIMEOUT * 1000; // override the hard timeout (seconds)
  const old = leftovers();
  if (old) { console.error(`Refusing to start: ${old} headless Edge process(es) from an earlier run are still alive. Close them first (see tools/edge.mjs --leftovers).`); process.exit(2); }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-'));
  const flags = gl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu'];
  const proc = spawn(EDGE, ['--headless=new', ...flags, '--disable-gpu-compositing', '--edge-skip-compat-layer-relaunch', '--hide-scrollbars', '--no-first-run',
    '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  let dead = false, ws;
  // Synchronous so it also works inside signal / exit handlers
  const killTree = () => {
    if (dead) return; dead = true;
    try { ws?.close(); } catch {}
    try { WIN ? spawnSync('taskkill', ['/T', '/F', '/PID', String(proc.pid)], { stdio: 'ignore', timeout: 15000 }) : proc.kill('SIGKILL'); } catch {}
    try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  };
  const onSignal = sig => { console.error(`\n${sig}: closing Edge`); killTree(); process.exit(130); };
  const onCrash = e => { console.error(e); killTree(); process.exit(1); };
  process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal); process.once('SIGHUP', onSignal);
  process.once('uncaughtException', onCrash); process.once('unhandledRejection', onCrash);
  process.once('exit', killTree);
  const hard = setTimeout(() => { console.error(`Hard timeout ${timeoutMs / 1000} s: closing Edge`); killTree(); process.exit(124); }, timeoutMs);
  hard.unref();
  try {
    let port, target;
    for (let t = 0; t < 120 && !target; t++) {
      await sleep(250);
      try { port ||= +fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {}
      if (port) try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {}
    }
    if (!target) throw new Error('Edge did not start (no DevTools target in 30 s)');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map(), listeners = [];
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) listeners.forEach(f => f(d)); };
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const evalJs = async expr => { const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result; return r?.exceptionDetails ? 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r?.result?.value; };
    const close = async () => { if (!dead) await Promise.race([send('Browser.close'), sleep(1500)]); await sleep(300); killTree(); clearTimeout(hard); };
    return { send, evalJs, on: f => listeners.push(f), close };
  } catch (e) { killTree(); throw e; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')) && process.argv.includes('--leftovers'))
  process.exit(checkNoLeftovers('right now') ? 0 : 1);
