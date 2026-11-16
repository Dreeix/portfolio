// Dev layer for all portfolio sites. Loaded ONLY on localhost (see each site's common.js).
// AI API: window.__dbg  ·  Human menu: Ctrl+Shift+D (or Alt+D)
// Sites may register extras: window.__dbg.site = { name, actions: { label: fn }, checks: [fn -> string[]] }
(() => {
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
  };
  const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');

  const dbg = window.__dbg = {
    site: window.__dbg?.site || null,
    /** Run all checks; returns text report */
    check() {
      const out = [];
      const all = { ...coreChecks };
      (dbg.site?.checks || []).forEach((fn, i) => all[`site${i}:${fn.name || ''}`] = fn);
      for (const [k, fn] of Object.entries(all)) {
        let r; try { r = fn() || []; } catch (e) { r = [`check crashed: ${e.message}`]; }
        out.push(r.length ? `✗ ${k}\n  - ${r.join('\n  - ')}` : `✓ ${k}`);
      }
      return out.join('\n');
    },
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
    const acts = { 'Run checks': () => show(dbg.check()), Outline: () => dbg.outline(), 'Slow-mo': () => dbg.slow(), 'Reveal all': () => dbg.reveal(), 'Reset storage': () => show(dbg.clearStorage()), ...(s?.actions || {}) };
    panel.innerHTML = `<b>DEV · ${s?.name || location.pathname}</b> <small>(Ctrl+Shift+D)</small>
      <h4>Tools</h4>${Object.keys(acts).map(k => btn(k)).join('')}
      <h4>Jump</h4>${dbg.sections().map(id => `<button data-j="${id}">${id}</button>`).join('')}<pre id="dbgOut">ready</pre>`;
    panel.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.j) dbg.jump(b.dataset.j); else { const r = acts[b.dataset.a](); if (typeof r === 'string') show(r); } };
    document.body.append(panel);
  }
  const show = t => { panel.querySelector('#dbgOut').textContent = t; };
  dbg.toggleMenu = () => { if (!panel) build(); else panel.hidden = !panel.hidden; };
  addEventListener('keydown', e => { if ((e.ctrlKey && e.shiftKey && e.code === 'KeyD') || (e.altKey && e.code === 'KeyD')) { e.preventDefault(); dbg.toggleMenu(); } });
  console.info('[dev] __dbg ready · Ctrl+Shift+D for menu');
})();
