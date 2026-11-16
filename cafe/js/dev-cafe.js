// Café-specific dev hooks (loaded only on localhost, after ../dev/dev.js). Sets time to test open/closed badge.
(() => {
  const at = (day, hour) => { // day: 0 = Saturday; builds a Date at that Tehran time (UTC+3:30)
    const base = new Date(Date.UTC(2026, 10, 14) + (hour - 3.5) * 36e5); // 2026-11-14 is a Saturday
    window.__now = new Date(base.getTime() + day * 864e5); renderStatus(); return openStatus().text;
  };
  window.__dbg.site = {
    name: 'cafe',
    actions: {
      'Time: Sat 10:00 (open)': () => at(0, 10),
      'Time: Sat 23:30 (closed)': () => at(0, 23.5),
      'Time: Thu 23:30 (open late)': () => at(5, 23.5),
      'Time: real': () => { window.__now = null; renderStatus(); return openStatus().text; },
      ...(window.__cafeMenu ? { 'Open sheet: latte': () => __cafeMenu.open('latte'), 'Search "ماچا"': () => { const q = $('#q'); q.value = 'ماچا'; q.dispatchEvent(new Event('input')); } } : {}),
    },
    checks: [
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
