// Copies each site's css file (and scripts marked data-inline) INLINE into its pages (saves one 2 s round trip on slow 3G before first paint).
// The .css file stays the one source: edit it, then run `node tools/inline-css.mjs` (no args = all pages below).
// First run turns <link rel="stylesheet" href="X.css"> into <style data-src="X.css" data-hash="…">; later runs refresh it.
// Dev check `inlineCss` (dev/dev.js) flags a page whose inline copy no longer matches the file (same hash below).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'cafe/index.html', 'cafe/menu.html', 'cafe/admin.html', 'gym/index.html', 'barber/index.html', 'barber/admin.html', 'shop/index.html', 'shop/admin.html'];
// FNV-1a over the CSS text (CRLF → LF); dev.js computes the same to spot a stale copy
export const hash = t => { let h = 0x811c9dc5; for (const c of t.replace(/\r\n/g, '\n')) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };

const pages = process.argv.slice(2).length ? process.argv.slice(2) : PAGES;
let changed = 0;
for (const page of pages) {
  const file = path.join(root, page), dir = path.dirname(file);
  let html = fs.readFileSync(file, 'utf8');
  const re = /<link rel="stylesheet" href="([^"]+\.css)">|<style data-src="([^"]+)" data-hash="[^"]*">[\s\S]*?<\/style>/;
  const m = html.match(re);
  if (!m) { console.log(`· ${page}: no stylesheet link / inline block, skipped`); continue; }
  const before = html;
  // Scripts opted in with data-inline (homepage: its text is rendered by JS, inlining saves the last round trip before LCP)
  html = html.replace(/<script src="([^"]+\.js)" data-inline><\/script>|<script data-src="([^"]+)" data-hash="[^"]*">[\s\S]*?<\/script>/g, (_, a, b) => {
    const src = a || b, js = fs.readFileSync(path.join(dir, src), 'utf8');
    if (/<\/script/i.test(js)) throw new Error(`${src} contains </script, cannot inline`);
    return `<script data-src="${src}" data-hash="${hash(js)}">\n${js.trim()}\n</script>`;
  });
  const src = m[1] || m[2], cssFile = path.join(dir, src), raw = fs.readFileSync(cssFile, 'utf8');
  // url(../fonts/x) is relative to the css file → make it relative to the page; leave data:, http(s): and #ids alone
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').trim()
    .replace(/url\((['"]?)(?!data:|https?:|#|\/)([^'")]+)\1\)/g, (_, q, u) => `url(${q}${path.relative(dir, path.join(path.dirname(cssFile), u)).replace(/\\/g, '/')}${q})`);
  const block = `<style data-src="${src}" data-hash="${hash(raw)}">\n${css}\n</style>`;
  const out = html.replace(re, () => block);
  if (out !== before) { fs.writeFileSync(file, out); changed++; console.log(`✓ ${page} ← ${src} (${(css.length / 1024).toFixed(1)} KB)`); }
  else console.log(`· ${page} up to date`);
}
console.log(`${changed} page(s) updated`);
