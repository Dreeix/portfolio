// Barber dev hooks (localhost only, after ../dev/dev.js). Works on both index.html and admin.html.
(() => {
  const B = window.__barber, A = window.__barberAdmin;
  const firstOpenDay = dur => Store.days().find(k => Store.slots(k, dur).length);
  const at = (y, m, d, h, min = 0) => { window.__now = new Date(y, m - 1, d, h, min); };

  // Fill the flow up to `step` with valid choices (service combo, first open day, first free slot)
  function fillTo(step) {
    const S = B.S; S.service = 'combo'; S.date = firstOpenDay(60); S.start = Store.slots(S.date, 60)[0];
    S.name = 'تست دیباگ'; S.phone = '09000000000'; B.go(step);
    return `${S.date} ${fmtTime(S.start)}`;
  }

  // ---- owner panel edits (edits.js): services + weekly hours ----
  const E = BarberEdits;
  const ownerSandbox = fn => __dbg.keepStorage(fn).finally(() => { E.reload(); (B || A)?.render(); });
  // Sample: hair renamed, 333,000 and 45 min; Saturday 12:00–16:00 with a 13:00–13:30 break; Friday open 10:00–14:00
  function sample() {
    const v = E.defaults(), hair = v.services.find(s => s.id === 'hair');
    Object.assign(hair, { name: 'آزمون پنل', price: 333000, dur: 45 });
    v.hours[0] = { open: '12:00', close: '16:00', breaks: [['13:00', '13:30']] };
    v.hours[6] = { open: '10:00', close: '14:00', breaks: [] };
    return v;
  }
  const dayOf = (idx, skipToday = true) => Store.days().find((k, i) => (!skipToday || i > 0) && (Store.fromKey(k).getDay() + 1) % 7 === idx);
  const ownerChecks = [
    function ownerValidation() {
      const bad = [], base = () => E.defaults(), s0 = v => v.services[0], h0 = v => v.hours[0];
      if (E.check(base())) bad.push('defaults rejected: ' + E.check(base()));
      const cases = {
        'empty name': v => { s0(v).name = ''; }, 'negative price': v => { s0(v).price = -10000; }, 'absurd price': v => { s0(v).price = 9e10; },
        'price not x1000': v => { s0(v).price = 350500; }, 'duration 10': v => { s0(v).dur = 10; }, 'duration 17': v => { s0(v).dur = 17; },
        'html in name': v => { s0(v).name = '<b>'; }, 'close before open': v => { h0(v).close = '09:00'; }, 'open 25:00': v => { h0(v).open = '25:00'; },
        'odd minutes': v => { h0(v).open = '10:10'; }, 'break outside hours': v => { h0(v).breaks = [['21:00', '22:00']]; },
        'break ends before start': v => { h0(v).breaks = [['15:00', '14:00']]; }, 'overlapping breaks': v => { h0(v).breaks = [['13:00', '14:00'], ['13:30', '14:30']]; },
        'break at opening': v => { h0(v).breaks = [['10:00', '10:30']]; }, 'all days closed': v => { v.hours = v.hours.map(() => null); },
        'unknown service id': v => { s0(v).id = 'zz'; }, 'six days only': v => { v.hours.pop(); },
      };
      for (const [k, f] of Object.entries(cases)) { const v = base(); f(v); if (!E.check(v)) bad.push(`accepted: ${k}`); }
      return bad;
    },
    async function slotsAfterEdit() { // slots follow edited hours/breaks/durations; no double booking; reset restores
      const bad = [];
      await ownerSandbox(async () => {
        const err = E.save(sample()); if (err) return bad.push('sample rejected: ' + err);
        const sat = dayOf(0), fri = dayOf(6);
        const s = Store.slots(sat, 45, []);
        if (s[0] !== 12 * 60) bad.push(`Saturday first slot ${fmtTime(s[0])}, expected 12:00`);
        if (s.some(t => t < 12 * 60 || t + 45 > 16 * 60)) bad.push('Saturday slot outside 12:00–16:00');
        if (s.some(t => t < 13.5 * 60 && 13 * 60 < t + 45)) bad.push('Saturday slot overlaps the 13:00 break');
        if (!fri || !Store.slots(fri, 30, []).length) bad.push('Friday opened but has no slots');
        if (service('hair').dur !== 45 || service('hair').price !== 333000) bad.push('service edit not applied');
        const r1 = Store.add({ service: 'hair', date: sat, start: s[0], name: 'الف', phone: '09000000000' });
        const r2 = Store.add({ service: 'hair', date: sat, start: s[0], name: 'ب', phone: '09000000001' });
        const r3 = Store.add({ service: 'hair', date: sat, start: 10 * 60, name: 'ج', phone: '09000000002' });
        if (!r1.ok) bad.push('booking in edited hours failed: ' + r1.error);
        else if (r1.booking.dur !== 45 || r1.booking.price !== 333000) bad.push('booking does not use edited duration/price');
        if (r2.ok) bad.push('double booking accepted after edit');
        if (r3.ok) bad.push('booking before the new opening time accepted');
        if (Store.slots(sat, 45).includes(s[0] + 30)) bad.push('slot overlapping the new 45-min booking offered');
        E.reset();
        const d = Store.slots(sat, 30, []);
        if (d[0] !== 10 * 60 || Store.slots(fri, 30, []).length) bad.push('reset did not restore default hours');
      });
      return bad;
    },
    async function editShowsOnPublic() {
      const bad = [];
      await ownerSandbox(async () => {
        E.save(sample());
        const w = await __dbg.frame('index.html'), svc = w.document.querySelector('[data-svc="hair"]');
        if (!/آزمون پنل/.test(svc?.textContent) || !/۳۳۳٬۰۰۰/.test(svc?.textContent)) bad.push('booking page: edited service name/price not shown');
        const fri = dayOf(6); if (!w.eval('Store').slots(fri, 30, []).length) bad.push('booking page: Friday still closed');
      });
      return bad;
    },
    async function resetRestoresDefaults() {
      const bad = [];
      await ownerSandbox(async () => {
        E.save(sample()); E.reset();
        if (localStorage.getItem(E.key) !== null) bad.push('key still in storage after reset');
        if (JSON.stringify(E.current()) !== JSON.stringify(E.defaults())) bad.push('data differs from defaults after reset');
        const w = await __dbg.frame('index.html');
        if (!w.document.querySelector('[data-svc="hair"]')?.textContent.includes(E.defaults().services[0].name)) bad.push('booking page after reset is not the demo');
      });
      return bad;
    },
    async function corruptFallsBack() {
      const bad = [], n = E.defaults().services.length;
      const junk = ['{oops', '7', '{"services":[],"hours":[]}', JSON.stringify({ ...sample(), hours: sample().hours.map(() => null) }),
        JSON.stringify((v => { v.hours[1] = { open: '12:00', close: '10:00', breaks: [] }; return v; })(sample()))];
      await ownerSandbox(async () => {
        for (const j of junk) {
          localStorage.setItem(E.key, j); E.reload();
          if (JSON.stringify(E.current()) !== JSON.stringify(E.defaults()) || !E.corrupt()) bad.push(`not ignored: ${j.slice(0, 40)}`);
        }
        localStorage.setItem(E.key, '{oops');
        const w = await __dbg.frame('index.html'), m = w.document.querySelectorAll('[data-svc]').length;
        if (m !== n) bad.push(`booking page with corrupt storage shows ${m}/${n} services`);
      });
      return bad;
    },
  ];
  const ownerActions = {
    'Owner edits: sample (hair 45 min/333k, Sat 12–16 + break, Fri open)': () => E.save(sample()) || 'saved → reload the booking page',
    'Owner edits: reset to demo': () => { E.reset(); (B || A).render(); return 'reset'; },
    'Owner edits: write corrupt JSON': () => { localStorage.setItem(E.key, '{oops'); E.reload(); return 'corrupt saved → defaults should show'; },
    ...(A ? { 'Panel: services': () => A.setSec('services'), 'Panel: hours': () => A.setSec('hours'), 'Panel: bookings': () => A.setSec('bookings') } : {}),
  };

  window.__dbg.site = {
    name: 'barber',
    actions: {
      ...(B ? {
        'Step 1 service': () => B.reset(),
        'Step 2 day': () => fillTo(2), 'Step 3 time': () => fillTo(3), 'Step 4 form': () => fillTo(4), 'Step 5 confirm': () => fillTo(5),
        'Book next free (full flow)': () => { fillTo(5); document.getElementById('next').click(); return B.S.booking ? `booked ${B.S.booking.code}` : B.S.error; },
        'Fill today completely': () => { const k = Store.days()[0]; let n = 0; for (const t of Store.slots(k, 30)) { const r = Store.add({ service: 'hair', date: k, start: t, name: 'پر', phone: '09000000000' }); n += r.ok; } B.render(); return `added ${n}`; },
      } : {}),
      ...(A ? { 'Login (demo pw)': async () => { sessionStorage.setItem('barber.admin', SHOP.adminHash); A.render(); }, 'Logout': () => { sessionStorage.removeItem('barber.admin'); A.login(); } } : {}),
      'Reseed demo bookings': () => { Store.seedDemo(true); (B || A).render(); return `${Store.load().length} bookings`; },
      'Clear all bookings': () => { Store.save([]); (B || A).render(); return 'cleared'; },
      'Time: now real': () => { window.__now = null; (B || A).render(); },
      ...ownerActions,
    },
    checks: [
      ...ownerChecks,
      function barTextOnSolid() { // sticky bar: only its top padding may fade, never under the hint/button text (bug: hint overlapped cards)
        const bar = document.querySelector(".bar"), t = bar?.querySelector(".hint"); if (!bar) return []; if (!t) return ["no .hint in .bar"];
        const fade = parseFloat(getComputedStyle(bar).getPropertyValue("--fade")), gap = t.getBoundingClientRect().top - bar.getBoundingClientRect().top;
        return isNaN(fade) || gap < fade ? [`hint sits ${gap | 0}px from bar top, fade is ${fade}px`] : [];
      },
      function noOverlaps() {
        const L = Store.load().filter(b => b.status !== 'cancelled'), bad = [];
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
          const a = L[i], b = L[j];
          if (a.date === b.date && a.start < b.start + b.dur && b.start < a.start + a.dur) bad.push(`overlap ${a.date} ${fmtTime(a.start)} (${a.name}) × ${fmtTime(b.start)} (${b.name})`);
        }
        return bad;
      },
      function bookingsInsideHours() { // bookings made before the owner's last hours edit may sit outside (they keep their time, admin tags them)
        const since = E.savedAt();
        return Store.load().filter(b => b.status !== 'cancelled' && !(b.created < since)).flatMap(b => {
          const h = Store.hoursFor(b.date);
          if (!h) return [`booking on closed day ${b.date}`];
          if (b.start < toMin(h.open) || b.start + b.dur > toMin(h.close)) return [`outside hours ${b.date} ${fmtTime(b.start)}`];
          if (h.breaks.some(([x, y]) => b.start < toMin(y) && toMin(x) < b.start + b.dur)) return [`in break ${b.date} ${fmtTime(b.start)}`];
          return [];
        });
      },
      function slotRules() { // runs on a scratch list, doesn't touch saved data
        const bad = [], k = firstOpenDay(30); if (!k) return ['no open day in range'];
        const h = Store.hoursFor(k);
        for (const s of SHOP.services) for (const t of Store.slots(k, s.dur, [])) {
          if (t + s.dur > toMin(h.close)) bad.push(`${s.id} slot ${fmtTime(t)} ends after close`);
          if (h.breaks.some(([x, y]) => t < toMin(y) && toMin(x) < t + s.dur)) bad.push(`${s.id} slot ${fmtTime(t)} hits break`);
        }
        const fri = Store.days().find(d => !Store.hoursFor(d));
        if (fri && Store.slots(fri, 30, []).length) bad.push('closed day has slots');
        const taken = [{ date: k, start: toMin(h.open), dur: 60, status: 'booked' }];
        if (Store.slots(k, 30, taken).includes(toMin(h.open) + 30)) bad.push('slot inside a 60-min booking is offered');
        return bad;
      },
      function doubleBookingRejected() {
        const saved = Store.load(), k = firstOpenDay(30), t = Store.slots(k, 30)[0];
        const r1 = Store.add({ service: 'hair', date: k, start: t, name: 'الف', phone: '09000000000' });
        const r2 = Store.add({ service: 'hair', date: k, start: t, name: 'ب', phone: '09000000001' });
        Store.save(saved);
        return [!r1.ok && `first booking failed: ${r1.error}`, r2.ok && 'second booking of same slot was accepted'].filter(Boolean);
      },
      function phoneValidation() {
        const ok = ['09121234567', '۰۹۱۲۱۲۳۴۵۶۷', '0912 123 4567', '0912-123-4567'], no = ['9121234567', '0812123456', '091212345678', 'abc', ''];
        return [...ok.filter(p => !Store.validPhone(p)).map(p => `rejected valid ${p}`), ...no.filter(p => Store.validPhone(p)).map(p => `accepted invalid ${p}`)];
      },
      function pastSlotsHidden() {
        const prev = window.__now, bad = [], k = Store.days().find(d => Store.hoursFor(d));
        const d = Store.fromKey(k); at(d.getFullYear(), d.getMonth() + 1, d.getDate(), 16, 10);
        const s = Store.slots(k, 30, []);
        if (s.some(t => t < 16 * 60 + 40)) bad.push(`offers slot before now+lead: ${fmtTime(s[0])}`);
        window.__now = prev; return bad;
      },
    ],
  };
})();
