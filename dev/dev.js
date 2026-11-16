// Dev layer for all portfolio sites. Loaded ONLY on localhost (see each site's common.js).
// Script API: window.__dbg  ·  Dev menu: Ctrl+Shift+D (or Alt+D)
// Sites may register extras: window.__dbg.site = { name, actions: { label: fn }, checks: [fn -> string[]] }
(() => {
  const devRoot = new URL('../', document.currentScript?.src || location.href).href; // site root (dev/dev.js lives one level down)
  const errors = [];
  addEventListener('error', e => errors.push(`JS error: ${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`));
  addEventListener('unhandledrejection', e => errors.push(`Promise: ${e.reason}`));
  const imgErrors = new Set();
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') imgErrors.add(e.target.getAttribute('src')); }, true);

  // Each check returns a list of problems (strings); empty = OK
  const coreChecks = {
    rtl: () => (document.documentElement.dir === 'rtl' && document.documentElement.lang === 'fa') ? [] : ['<html> is not lang=fa dir=rtl'],
    overflowX: () => {
      const W = document.documentElement.clientWidth, bad = [];
      if (document.documentElement.scrollWidth > W + 1) bad.push(`page scrolls sideways: ${document.documentElement.scrollWidth}px > ${W}px`);
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).position === 'fixed') return;
        if ((r.right > W + 1 || r.left < -1) && !el.closest('.chips,[data-dbg-ok],.hero,.qr-band,#dbg')) bad.push(`overflow: ${desc(el)} [${r.left | 0}..${r.right | 0}]`);
      });
      return bad.slice(0, 10);
    },
    images: () => [
      ...[...imgErrors].map(s => `broken image: ${s}`),
      ...[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => `not loaded: ${i.getAttribute('src')}`),
      ...[...document.images].filter(i => !i.hasAttribute('alt')).map(i => `missing alt: ${i.getAttribute('src')}`),
    ],
    links: () => [...document.querySelectorAll('a:not([data-demo])')].filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#').map(a => `empty link: ${desc(a)}`),
    // Portfolio demos must never message/call a real person. A real client build sets __dbg.site.allowContacts = true.
    noRealContacts: () => dbg.site?.allowContacts ? [] : [...document.querySelectorAll('a[href]')]
      .filter(a => /^(tel:|sms:|mailto:)|wa\.me|whatsapp\.com|t\.me\/|telegram\.(me|org)|instagram\.com|eitaa\.com|rubika\.ir|ble\.ir/i.test(a.getAttribute('href')))
      .map(a => `real contact link: ${a.getAttribute('href')} (${desc(a)})`),
    anchors: () => [...document.querySelectorAll('a[href^="#"]')].filter(a => a.hash.length > 1 && !document.getElementById(a.hash.slice(1))).map(a => `dead anchor ${a.hash}`),
    font: () => document.fonts.check('16px Vazirmatn') ? [] : ['Vazirmatn not loaded'],
    tapTargets: () => [...document.querySelectorAll('a,button,input')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && r.height < 32 && !el.closest('p,#dbg'); }).map(el => `small tap target (${el.getBoundingClientRect().height | 0}px): ${desc(el)}`).slice(0, 8),
    jsErrors: () => errors.slice(),
    // Link previews (Telegram, WhatsApp…): absolute og:/twitter: tags on the live site (tools/og-tags.mjs); the image exists here and is 1200×630
    ogTags: async () => {
      const SITE = 'https://dreeix.github.io/portfolio/', m = n => document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.content || '';
      const bad = ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image'].filter(n => !m(n)).map(n => `missing ${n}`);
      if (bad.length) return bad;
      const img = m('og:image');
      if (!img.startsWith(SITE)) return [`og:image is not an absolute ${SITE} URL: ${img}`];
      if (m('twitter:image') !== img) bad.push('twitter:image differs from og:image');
      if (m('twitter:card') !== 'summary_large_image') bad.push('twitter:card is not summary_large_image');
      const page = SITE + location.href.slice(devRoot.length).split(/[?#]/)[0].replace(/index\.html$/, '');
      const canon = document.querySelector('link[rel=canonical]');
      if (canon && (m('og:url') !== page || canon.href !== page)) bad.push(`og:url/canonical ${m('og:url')} ≠ ${page}`);
      const local = new URL(img.slice(SITE.length), devRoot), r = await fetch(local, { cache: 'no-store' }).catch(() => null);
      if (!r || r.status !== 200) return [...bad, `og:image ${local.pathname} → ${r ? r.status : 'fetch failed'}`];
      const bmp = await createImageBitmap(await r.blob()).catch(() => null);
      if (!bmp || bmp.width !== 1200 || bmp.height !== 630) bad.push(`og:image is ${bmp ? bmp.width + '×' + bmp.height : 'not an image'}, expected 1200×630`);
      return bad;
    },
    // inline CSS copied by tools/inline-css.mjs must match its source file (hash fetched at load, see below)
    inlineCss: () => [...document.querySelectorAll('style[data-src],script[data-src]')].flatMap(s => {
      const h = cssHashes[s.dataset.src];
      return h === undefined ? [`${s.dataset.src}: not fetched yet`] : h === s.dataset.hash ? [] : [`inline copy of ${s.dataset.src} is stale → run node tools/inline-css.mjs`];
    }),
  };
  const cssHashes = {}; // same FNV-1a as tools/inline-css.mjs
  const fnv = t => { let h = 0x811c9dc5; for (const c of t.replace(/\r\n/g, '\n')) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  document.querySelectorAll('style[data-src],script[data-src]').forEach(s => fetch(s.dataset.src, { cache: 'no-store' }).then(r => r.text()).then(t => { cssHashes[s.dataset.src] = fnv(t); }).catch(() => { cssHashes[s.dataset.src] = 'fetch failed'; }));
  const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');

  const dbg = window.__dbg = {
    site: window.__dbg?.site || null,
    /** Run all checks; returns the text report (a Promise when a site check is async; they run one after another) */
    check() {
      const all = { ...coreChecks };
      (dbg.site?.checks || []).forEach((fn, i) => all[`site${i}:${fn.name || ''}`] = fn);
      const NL = String.fromCharCode(10), line = (k, r) => r.length ? `✗ ${k}${NL}  - ${r.join(NL + '  - ')}` : `✓ ${k}`;
      const out = [], pending = [], isAsync = fn => fn.constructor.name === 'AsyncFunction';
      for (const [k, fn] of Object.entries(all)) {
        if (isAsync(fn)) { pending.push([out.length, k, fn]); out.push(null); continue; } // run later, one at a time
        let r; try { r = fn() || []; } catch (e) { r = [`check crashed: ${e.message}`]; }
        out.push(line(k, r));
      }
      if (!pending.length) return out.join(NL);
      return (async () => { // async checks one after another (they share localStorage)
        await new Promise(r => setTimeout(r, 500)); // let a history.back() from a sync check (closing a sheet) land first
        for (const [i, k, fn] of pending) { let r; try { r = (await fn()) || []; } catch (e) { r = [`check crashed: ${e.message}`]; } out[i] = line(k, r); }
        dbg.frameClose(); return out.join(NL);
      })();
    },
    /** Snapshot localStorage, run fn (sync or async), always restore it exactly afterwards */
    async keepStorage(fn) {
      const snap = JSON.stringify(localStorage);
      try { return await fn(); } finally { localStorage.clear(); Object.entries(JSON.parse(snap)).forEach(([k, v]) => localStorage.setItem(k, v)); }
    },
    /** Load a same-origin page in a hidden 375px iframe; resolves its window once loaded (+ its own dev layer). Close with dbg.frameClose() */
    frame(url, waitMs = 400) {
      dbg.frameClose();
      const f = document.createElement('iframe'); f.id = 'dbgFrame'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:375px;height:812px;border:0;visibility:hidden';
      return new Promise((ok, no) => { const t = setTimeout(() => no(new Error('frame timeout ' + url)), 15000);
        f.onload = () => setTimeout(() => { clearTimeout(t); ok(f.contentWindow); }, waitMs); f.src = url; document.body.append(f); });
    },
    frameClose() { document.getElementById('dbgFrame')?.remove(); },
    jump: id => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }),
    sections: () => [...document.querySelectorAll('section[id],[data-dbg-jump]')].map(s => s.id),
    outline(on = !document.body.classList.contains('dbg-outline')) { document.body.classList.toggle('dbg-outline', on); return on; },
    slow(on = !document.body.classList.contains('dbg-slow')) { document.body.classList.toggle('dbg-slow', on); return on; },
    reveal() { document.querySelectorAll('.rv').forEach(e => e.classList.add('in')); },
    clearStorage() { localStorage.clear(); sessionStorage.clear(); return 'cleared'; },
    errors,
  };

  // ----- Human dev menu -----
  const css = document.createElement('style');
  css.textContent = `.dbg-outline *{outline:1px solid rgba(255,0,140,.35)!important}.dbg-slow *{transition-duration:2s!important;animation-duration:4s!important}
  #dbg{position:fixed;left:10px;bottom:10px;z-index:99999;width:min(340px,calc(100vw - 20px));max-height:80vh;overflow:auto;background:#0d0d10f0;color:#e8e8ee;font:12px/1.5 ui-monospace,Consolas,monospace;border:1px solid #444;border-radius:10px;padding:10px;direction:ltr;text-align:left;box-shadow:0 10px 40px #000a}
  #dbg h4{margin:8px 0 4px;color:#9cf;font-size:11px;text-transform:uppercase}#dbg button{background:#26262e;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px;margin:2px;cursor:pointer;font:inherit}
  #dbg button:hover{background:#3a3a48}#dbg pre{white-space:pre-wrap;background:#000;padding:6px;border-radius:6px;margin-top:6px;max-height:220px;overflow:auto}`;
  document.head.append(css);
  let panel;
  function build() {
    panel = document.createElement('div'); panel.id = 'dbg';
    const s = dbg.site;
    const btn = (label, fn) => `<button data-a="${label}">${label}</button>`;
    const acts = { 'Run checks': () => { const r = dbg.check(); if (typeof r === 'string') show(r); else { show('running…'); r.then(show); } }, Outline: () => dbg.outline(), 'Slow-mo': () => dbg.slow(), 'Reveal all': () => dbg.reveal(), 'Reset storage': () => show(dbg.clearStorage()), ...(s?.actions || {}) };
    panel.innerHTML = `<b>DEV · ${s?.name || location.pathname}</b> <small>(Ctrl+Shift+D)</small>
      <h4>Tools</h4>${Object.keys(acts).map(k => btn(k)).join('')}
      <h4>Jump</h4>${dbg.sections().map(id => `<button data-j="${id}">${id}</button>`).join('')}<pre id="dbgOut">ready</pre>`;
    panel.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.j) dbg.jump(b.dataset.j); else { const r = acts[b.dataset.a](); if (typeof r === 'string') show(r); else if (r?.then) r.then(v => typeof v === 'string' && show(v)); } };
    document.body.append(panel);
  }
  const show = t => { panel.querySelector('#dbgOut').textContent = t; };
  dbg.toggleMenu = () => { if (!panel) build(); else panel.hidden = !panel.hidden; };
  addEventListener('keydown', e => { if ((e.ctrlKey && e.shiftKey && e.code === 'KeyD') || (e.altKey && e.code === 'KeyD')) { e.preventDefault(); dbg.toggleMenu(); } });
  console.info('[dev] __dbg ready · Ctrl+Shift+D for menu');
})();
