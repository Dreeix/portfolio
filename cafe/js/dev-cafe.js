// Café-specific dev hooks (loaded only on localhost, after ../dev/dev.js). Sets time to test open/closed badge.
(() => {
  const at = (day, hour) => { // day: 0 = Saturday; builds a Date at that Tehran time (UTC+3:30)
    const base = new Date(Date.UTC(2026, 10, 14) + (hour - 3.5) * 36e5); // 2026-11-14 is a Saturday
    window.__now = new Date(base.getTime() + day * 864e5); renderStatus(); return openStatus().text;
  };
  const atDate = (day, hour) => new Date(Date.UTC(2026, 10, 14) + (hour - 3.5) * 36e5 + day * 864e5);
  // Owner-edit sample used by checks/actions: espresso renamed + 777,000, latte sold out, mocha removed, new cold item, Friday closed, Thursday 9–23
  function sample() {
    const v = CafeEdits.defaults(), hot = v.categories[0].items;
    Object.assign(hot.find(i => i.id === 'espresso'), { name: 'آزمون پنل', price: 777000 });
    hot.find(i => i.id === 'latte').soldOut = true;
    v.categories[0].items = hot.filter(i => i.id !== 'mocha');
    v.categories[1].items.push({ id: 'dbgnew', name: 'نوشیدنی تازه', desc: '', price: 99000, img: 'img/new-cold.svg' }, { id: 'dbgnoimg', name: 'بدون عکس', desc: '', price: 88000 });
    v.hours = v.hours.filter(h => h.day !== 6); v.hours.find(h => h.day === 5).close = 23;
    v.categories.forEach(c => c.items.forEach(i => { delete i.cat; }));
    return v;
  }
  // Every owner-edit check runs here: storage is restored afterwards and the page's data re-read
  const sandbox = fn => __dbg.keepStorage(fn).finally(() => CafeEdits.reload());
  window.__dbg.site = {
    name: 'cafe',
    actions: {
      'Time: Sat 10:00 (open)': () => at(0, 10),
      'Time: Sat 23:30 (closed)': () => at(0, 23.5),
      'Time: Thu 23:30 (open late)': () => at(5, 23.5),
      'Time: real': () => { window.__now = null; renderStatus(); return openStatus().text; },
      ...(window.__cafeAdmin ? { 'Login (demo pw)': () => { sessionStorage.setItem('cafe.admin', CAFE.adminHash); __cafeAdmin.render(); }, 'Panel: hours tab': () => __cafeAdmin.setView('hours'), 'Logout': () => { sessionStorage.removeItem('cafe.admin'); __cafeAdmin.login(); } } : {}),
      'Owner edits: sample (rename espresso, sold-out latte, Friday closed)': () => { const r = CafeEdits.save(sample()); return r || 'saved → reload public pages'; },
      'Owner edits: reset to demo': () => { CafeEdits.reset(); return 'reset'; },
      'Owner edits: write corrupt JSON': () => { localStorage.setItem(CafeEdits.key, '{oops'); CafeEdits.reload(); return 'corrupt saved → defaults should show'; },
      ...(window.__cafeMenu ? { 'Open sheet: latte': () => __cafeMenu.open('latte'), 'Search "ماچا"': () => { const q = $('#q'); q.value = 'ماچا'; q.dispatchEvent(new Event('input')); } } : {}),
    },
    checks: [
      function ownerValidation() { // the panel's save() must refuse bad input with a message
        const bad = [], E = CafeEdits, base = () => E.defaults(), first = v => v.categories[0].items[0];
        if (E.check(base())) bad.push('defaults rejected: ' + E.check(base()));
        const cases = {
          'empty name': v => { first(v).name = '  '; }, 'negative price': v => { first(v).price = -5000; }, 'absurd price': v => { first(v).price = 9e9; },
          'price not ×1000': v => { first(v).price = 145500; }, 'price null': v => { first(v).price = null; }, 'html in name': v => { first(v).name = '<b>x</b>'; },
          'close before open': v => { v.hours[0].close = v.hours[0].open; }, 'no open day': v => { v.hours = []; },
          'past midnight overlaps next day': v => { v.hours[0].close = 27; v.hours[1].open = 2; }, 'no items': v => { v.categories.forEach(c => { c.items = []; }); },
          'duplicate id': v => { v.categories[1].items.push({ ...first(v) }); }, 'unknown category': v => { v.categories[0].id = 'x'; },
        };
        for (const [k, f] of Object.entries(cases)) { const v = base(); f(v); if (!E.check(v)) bad.push(`accepted: ${k}`); }
        return bad;
      },
      async function editShowsOnPublic() {
        const bad = [];
        await sandbox(async () => {
          const err = CafeEdits.save(sample()); if (err) return bad.push('sample rejected: ' + err);
          let w = await __dbg.frame('menu.html');
          const it = id => w.document.querySelector(`.m-item[data-id="${id}"]`);
          if (!/آزمون پنل/.test(it('espresso')?.textContent) || !/۷۷۷٬۰۰۰/.test(it('espresso')?.textContent)) bad.push('menu: renamed/repriced espresso not shown');
          if (!it('latte')?.classList.contains('so') || !/تمام شد/.test(it('latte').textContent)) bad.push('menu: latte not marked sold out');
          if (!it('dbgnew') || it('dbgnew').closest('.m-cat')?.id !== 'cold' || !/new-cold\.svg$/.test(it('dbgnew').querySelector('img').getAttribute('src'))) bad.push('menu: added item missing / wrong category or picture');
          if (it('mocha')) bad.push('menu: removed item still shown');
          if (!/new-cold\.svg$/.test(it('dbgnoimg')?.querySelector('img')?.getAttribute('src') || '')) bad.push('menu: item added without a picture got none (mix of pictures / no picture)');
          w = await __dbg.frame('index.html');
          const li = [...w.document.querySelectorAll('#hoursList li')];
          if (li.length !== 7 || !/تعطیل/.test(li[6]?.textContent)) bad.push('landing: Friday not shown closed (7 days listed)');
          w.__now = atDate(5, 23.5); // Thursday 23:30 → closed (edited to 9–23), next open = Saturday (Friday closed)
          const st = w.openStatus(); if (st.open || !/شنبه/.test(st.text)) bad.push('status after edit: ' + st.text);
        });
        return bad;
      },
      async function resetRestoresDefaults() {
        const bad = [];
        await sandbox(async () => {
          CafeEdits.save(sample()); CafeEdits.reset();
          if (localStorage.getItem(CafeEdits.key) !== null) bad.push('key still in storage after reset');
          if (JSON.stringify(CafeEdits.current()) !== JSON.stringify(CafeEdits.defaults())) bad.push('data differs from defaults after reset');
          const w = await __dbg.frame('menu.html'), e = w.document.querySelector('.m-item[data-id="espresso"]');
          if (!e || !e.textContent.includes(CafeEdits.defaults().categories[0].items[0].name) || w.document.querySelector('.m-item.so')) bad.push('menu after reset is not the demo menu');
        });
        return bad;
      },
      async function corruptFallsBack() {
        const bad = [], n = CafeEdits.defaults().categories.flatMap(c => c.items).length;
        const junk = ['{oops', 'null', '42', '"x"', '{"categories":"x","hours":[]}', JSON.stringify({ ...sample(), hours: [{ day: 0, open: 20, close: 3 }] }),
          JSON.stringify((v => { v.categories[0].items[0].name = '<img src=x onerror=alert(1)>'; return v; })(sample()))];
        await sandbox(async () => {
          for (const j of junk) {
            localStorage.setItem(CafeEdits.key, j); CafeEdits.reload();
            if (JSON.stringify(CafeEdits.current()) !== JSON.stringify(CafeEdits.defaults()) || (j !== 'null' && !CafeEdits.corrupt())) bad.push(`not ignored: ${j.slice(0, 40)}`);
          }
          localStorage.setItem(CafeEdits.key, '{oops');
          const w = await __dbg.frame('menu.html'), m = w.document.querySelectorAll('.m-item').length;
          if (m !== n) bad.push(`menu with corrupt storage shows ${m}/${n} items`);
        });
        return bad;
      },
      // menu: every item has a picture or none do (never a mix), incl. items added in the owner panel; none broken
      function menuImages() {
        const items = [...document.querySelectorAll('.m-item')]; if (!items.length) return [];
        const withImg = items.filter(b => b.querySelector('img')?.getAttribute('src')), bad = [];
        if (withImg.length && withImg.length < items.length) bad.push(`${items.length - withImg.length} of ${items.length} menu items have no picture`);
        items.forEach(b => { const im = b.querySelector('img'); if (im && im.complete && !im.naturalWidth) bad.push(`broken picture: ${b.dataset.id} ${im.getAttribute('src')}`); });
        return bad;
      },
      function prices() { return CAFE.categories.flatMap(c => c.items).filter(i => !(i.price > 0 && i.price % 1000 === 0)).map(i => `bad price ${i.id}: ${i.price}`); },
      function uniqueIds() { const ids = CAFE.categories.flatMap(c => c.items.map(i => i.id)); return ids.filter((x, i) => ids.indexOf(x) !== i).map(x => `duplicate id ${x}`); },
      function statusLogic() {
        const cases = [[0, 10, true], [0, 7, false], [0, 23.5, false], [5, 23.5, true], [6, 0.5, false], [0, 0.5, false]];
        const prev = window.__now, bad = [];
        for (const [d, h, exp] of cases) { at(d, h); if (openStatus().open !== exp) bad.push(`day ${d} ${h}h expected ${exp ? 'open' : 'closed'}`); }
        window.__now = prev; renderStatus(); return bad;
      },
    ],
  };
})();
