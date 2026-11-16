// Page-load performance on a throttled "cheap phone" (headless Edge, no window). Launcher: tools/edge.mjs
// Usage: node tools/perf.mjs <url> [preset]                     preset: slow3g | fast3g | 4g | all (default slow3g)
//        node tools/perf.mjs <url1> <url2> ... [preset...]      several URLs / presets → one table (runs one at a time, cold cache each)
// Env: PERF_DEV=1 keeps the localhost-only dev layer (blocked by default so local numbers match the live site),
//      PERF_CPU=4 (CPU slowdown, default 4×), PERF_FILES=5 (biggest files listed per run, 0 = none), PERF_MAX=90 (s per run)
// Reports: FCP, LCP, load event, 3D ready (performance.mark('3d-ready'), any page can set it), bytes on the wire, requests.
// Note: python http.server sends files uncompressed; for Pages-like bytes run `node tools/serve-gz.mjs` (port 8090) and measure http://localhost:8090/...
import { launch, sleep } from './edge.mjs';

const PRESETS = { // Chrome DevTools throttling values (bytes/s, ms)
  slow3g: { down: 500e3 / 8 * .8, up: 500e3 / 8 * .8, latency: 400 * 5 },
  fast3g: { down: 1.6e6 / 8 * .9, up: 750e3 / 8 * .9, latency: 150 * 3.75 },
  '4g': { down: 9e6 / 8 * .9, up: 1.5e6 / 8 * .9, latency: 60 * 2.75 },
};
const args = process.argv.slice(2);
const urls = args.filter(a => /^https?:/.test(a));
let presets = args.filter(a => !/^https?:/.test(a));
if (!urls.length) { console.log('usage: node tools/perf.mjs <url...> [slow3g|fast3g|4g|all]'); process.exit(1); }
if (!presets.length) presets = ['slow3g'];
if (presets.includes('all')) presets = Object.keys(PRESETS);
const CPU = +(process.env.PERF_CPU || 4), NFILES = +(process.env.PERF_FILES ?? 5), MAX = +(process.env.PERF_MAX || 90) * 1000;
const s = ms => ms == null ? '—' : (ms / 1000).toFixed(1) + 's', kb = b => (b / 1024).toFixed(0) + ' KB';

async function run(url, name) {
  const p = PRESETS[name]; if (!p) throw new Error('unknown preset ' + name);
  const b = await launch();
  try {
    const { send, evalJs, on } = b;
    const reqs = new Map(); let inflight = 0, lastNet = Date.now();
    on(({ method, params }) => {
      if (method === 'Network.requestWillBeSent') { reqs.set(params.requestId, { url: params.request.url, bytes: 0 }); inflight++; lastNet = Date.now(); }
      if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') { const r = reqs.get(params.requestId); if (r) { r.bytes = params.encodedDataLength || 0; r.failed = method === 'Network.loadingFailed'; } inflight = Math.max(0, inflight - 1); lastNet = Date.now(); }
    });
    await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
    if (!process.env.PERF_DEV) await send('Network.setBlockedURLs', { urls: ['*/dev/dev.js', '*/js/dev-*.js'] });
    await send('Network.emulateNetworkConditions', { offline: false, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up });
    await send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    // LCP observer must exist before the page's own scripts → inject at document start
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__lcp=e.startTime;const el=e.element;window.__lcpEl=el?(el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(e.url?' '+e.url.split('/').pop():'')):''}}).observe({type:'largest-contentful-paint',buffered:true});` });
    const t0 = Date.now();
    await send('Page.navigate', { url });
    // Wait for load, then network quiet for 3 s (lazy 3D, images), max MAX
    while (Date.now() - t0 < MAX) {
      await sleep(500);
      const st = await evalJs('document.readyState');
      if (st === 'complete' && inflight === 0 && Date.now() - lastNet > 3000) break;
    }
    await sleep(500);
    const m = await evalJs(`(() => { const n = performance.getEntriesByType('navigation')[0] || {};
      const g = k => performance.getEntriesByName(k)[0]?.startTime ?? null;
      return { fcp: g('first-contentful-paint'), lcp: window.__lcp || null, lcpEl: window.__lcpEl || '', load: n.loadEventEnd || null, ready3d: g('3d-ready'), mode: window.__hp ? window.__hp.mode + (window.__hp.reason ? ' (' + window.__hp.reason + ')' : '') : '' }; })()`);
    const list = [...reqs.values()].filter(r => !r.url.startsWith('data:') && !r.failed);
    return { url, name, ...m, bytes: list.reduce((a, r) => a + r.bytes, 0), n: list.length, files: list.sort((a, b) => b.bytes - a.bytes).slice(0, NFILES), timedOut: Date.now() - t0 >= MAX };
  } finally { await b.close(); }
}

const rows = [];
for (const url of urls) for (const name of presets) {
  try { const r = await run(url, name); rows.push(r); process.stderr.write(`· ${name} ${url} done\n`); }
  catch (e) { rows.push({ url, name, error: e.message }); }
}
const short = u => u.replace(/^https?:\/\/[^/]+/, '') || '/';
console.log(`CPU ${CPU}× slower · phone 375×812 @2x · cold cache\n`);
console.log('| page | network | FCP | LCP | load | 3D ready | transferred | requests |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r.error ? `| ${short(r.url)} | ${r.name} | error: ${r.error} |||||` :
  `| ${short(r.url)} | ${r.name} | ${s(r.fcp)} | ${s(r.lcp)} | ${s(r.load)} | ${s(r.ready3d)}${r.mode && !r.ready3d ? ' ' + r.mode : ''} | ${kb(r.bytes)} | ${r.n}${r.timedOut ? ' (timeout)' : ''} |`);
for (const r of rows.filter(r => r.lcpEl)) console.log(`LCP element · ${short(r.url)} · ${r.name}: ${r.lcpEl}`);
if (NFILES) for (const r of rows.filter(r => r.files)) console.log(`\nBiggest files · ${short(r.url)} · ${r.name}:\n` + r.files.map(f => `  ${kb(f.bytes).padStart(7)}  ${short(f.url)}${f.failed ? ' (failed)' : ''}`).join('\n'));
setTimeout(() => process.exit(0), 500);
