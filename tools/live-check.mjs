// Deployed-site check (no window): opens every page on the live URL in one headless Edge, scrolls through it, then
// HEAD/GETs every same-origin page, asset and link it references (incl. lazy images) and prints any non-200.
// Also fails if the dev layer loaded (window.__dbg or any /dev/ or dev-*.js request).
// Usage: node tools/live-check.mjs [base=https://dreeix.github.io/portfolio/]   (github.io sometimes stalls ~20 s: timeouts are retried once)
import { launch, sleep, checkNoLeftovers } from './edge.mjs';

const base = (process.argv[2] || 'https://dreeix.github.io/portfolio/').replace(/\/?$/, '/');
const pages = ['', 'cafe/', 'cafe/menu.html', 'cafe/admin.html', 'gym/', 'barber/', 'barber/admin.html', 'shop/', 'shop/admin.html', 'headphones/', 'headphones/?poster'];
const extra = ['robots.txt', 'sitemap.xml', '404.html'];
const origin = new URL(base).origin;
let bad = 0;
const urls = new Set([...pages, ...extra].map(p => base + p));
const b = await launch({ gl: false, timeoutMs: 60000 * pages.length });
const { send, evalJs } = b;
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  for (const p of pages) {
    await send('Page.navigate', { url: base + p });
    for (let t = 0; t < 80; t++) { await sleep(250); if (await evalJs('document.readyState') === 'complete') break; }
    await evalJs(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}})()`);
    await sleep(800);
    const r = await evalJs(`({dbg:!!window.__dbg, dev:performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/\\/dev\\/|dev-[a-z]+\\.js/.test(n)),
      refs:[...document.querySelectorAll('img[src],script[src],link[href],a[href],source[srcset],iframe[src]')].map(e=>e.src||e.href||e.srcset).filter(Boolean)
        .concat([...document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"],meta[property="og:url"]')].map(m=>m.content))
        .concat(performance.getEntriesByType('resource').map(e=>e.name))})`);
    const devOk = !r.dbg && !r.dev.length;
    if (!devOk) bad++;
    console.log(`${devOk ? '✓' : '✗'} ${p || 'home'}: dev layer ${devOk ? 'not loaded' : 'LOADED ' + r.dev.join(', ')}`);
    r.refs.forEach(u => { try { const x = new URL(u, base + p); if (x.origin === origin && x.pathname.startsWith(new URL(base).pathname)) { x.hash = ''; urls.add(x.href); } } catch {} });
  }
} finally { await b.close(); if (!checkNoLeftovers()) bad++; }

const get = async u => { for (let i = 0; i < 2; i++) { try { return (await fetch(u, { method: 'GET', signal: AbortSignal.timeout(25000) })).status; } catch (e) { if (i) return 'ERR ' + e.name; } } };
const list = [...urls].sort(), res = [];
for (let i = 0; i < list.length; i += 6) res.push(...await Promise.all(list.slice(i, i + 6).map(async u => [u, await get(u)])));
const fails = res.filter(([, s]) => s !== 200);
// A missing page must answer 404 with the Persian 404 page (GitHub Pages serves /404.html)
const nf = await fetch(base + 'no-such-page-' + Date.now(), { signal: AbortSignal.timeout(25000) }).then(async r => [r.status, await r.text()]).catch(e => ['ERR ' + e.name, '']);
const nfOk = nf[0] === 404 && nf[1].includes('پیدا نشد');
console.log(`${nfOk ? '✓' : '✗'} missing page → ${nf[0]}${nfOk ? ' with the Persian 404 page' : ''}`);
if (!nfOk) bad++;
fails.forEach(([u, s]) => console.log(`✗ ${s} ${u.replace(base, '')}`));
console.log(`${fails.length ? '✗' : '✓'} ${res.length - fails.length}/${res.length} URLs return 200`);
process.exit(bad || fails.length ? 1 : 0);
