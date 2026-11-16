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
    },
    checks: [
      function noOverlaps() {
        const L = Store.load().filter(b => b.status !== 'cancelled'), bad = [];
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
          const a = L[i], b = L[j];
          if (a.date === b.date && a.start < b.start + b.dur && b.start < a.start + a.dur) bad.push(`overlap ${a.date} ${fmtTime(a.start)} (${a.name}) × ${fmtTime(b.start)} (${b.name})`);
        }
        return bad;
      },
      function bookingsInsideHours() {
        return Store.load().filter(b => b.status !== 'cancelled').flatMap(b => {
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
