// Booking storage (localStorage) + slot logic. Shared by index.html and admin.html.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const faNum = n => Number(n).toLocaleString('fa-IR', { useGrouping: true });
const faDigits = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const enDigits = s => String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const fmtTime = min => faDigits(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
const service = id => SHOP.services.find(s => s.id === id);

const Store = (() => {
  const KEY = 'barber.bookings.v1';
  const now = () => window.__now || new Date();          // dev can override
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const dayIdx = d => (d.getDay() + 1) % 7;               // 0 = Saturday
  const hoursFor = k => SHOP.hours[dayIdx(fromKey(k))];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }

  const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  // Free start times (minutes) on date k for a service of `dur` minutes
  function slots(k, dur, list = load()) {
    const h = hoursFor(k); if (!h) return [];
    const open = toMin(h.open), close = toMin(h.close), out = [];
    const busy = [...h.breaks.map(([a, b]) => [toMin(a), toMin(b)]), ...list.filter(b => b.date === k && b.status !== 'cancelled').map(b => [b.start, b.start + b.dur])];
    const n = now(), isToday = k === dateKey(n), nowMin = n.getHours() * 60 + n.getMinutes() + SHOP.minLeadMinutes;
    for (let t = open; t + dur <= close; t += SHOP.slotStep) {
      if (isToday && t < nowMin) continue;
      if (busy.some(([a, b]) => overlaps(t, t + dur, a, b))) continue;
      out.push(t);
    }
    return out;
  }
  // All start times of the day with state, for showing taken slots greyed out
  function grid(k, dur, list = load()) {
    const h = hoursFor(k); if (!h) return [];
    const free = new Set(slots(k, dur, list)), out = [], n = now();
    const cut = k === dateKey(n) ? n.getHours() * 60 + n.getMinutes() + SHOP.minLeadMinutes : -1;
    for (let t = toMin(h.open); t + dur <= toMin(h.close); t += SHOP.slotStep) {
      if (t < cut) continue; // past times today are hidden
      const inBreak = h.breaks.some(([a, b]) => overlaps(t, t + dur, toMin(a), toMin(b)));
      if (inBreak) { if (h.breaks.some(([a]) => toMin(a) === t)) out.push({ t, state: 'break' }); continue; }
      out.push({ t, state: free.has(t) ? 'free' : 'taken' });
    }
    return out;
  }
  function days() {
    const out = [], n = now();
    for (let i = 0; i < SHOP.daysAhead; i++) { const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + i); out.push(dateKey(d)); }
    return out;
  }
  const validPhone = p => /^09\d{9}$/.test(enDigits(p).replace(/[\s-]/g, ''));
  const cleanPhone = p => enDigits(p).replace(/[\s-]/g, '');

  // Adds a booking after re-checking the slot (prevents double booking). Returns {ok, booking|error}
  function add({ service: sid, date, start, name, phone }) {
    const s = service(sid); if (!s) return { ok: false, error: 'خدمت نامعتبر است' };
    if (!name || name.trim().length < 2) return { ok: false, error: 'نام را وارد کنید' };
    if (!validPhone(phone)) return { ok: false, error: 'شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)' };
    const list = load();
    if (!slots(date, s.dur, list).includes(start)) return { ok: false, error: 'این ساعت همین الان رزرو شد؛ لطفاً ساعت دیگری انتخاب کنید' };
    const b = { id: crypto.randomUUID?.() || String(Date.now()) + Math.random(), code: String(Math.floor(1000 + Math.random() * 9000)), service: sid, dur: s.dur, price: s.price, date, start, name: name.trim(), phone: cleanPhone(phone), created: Date.now(), status: 'booked' };
    list.push(b); if (!save(list)) return { ok: false, error: 'ذخیره نشد (حافظه‌ی مرورگر در دسترس نیست)' };
    return { ok: true, booking: b };
  }
  function update(id, patch) { const list = load(), b = list.find(x => x.id === id); if (b) { Object.assign(b, patch); save(list); } return b; }
  function remove(id) { save(load().filter(x => x.id !== id)); }

  // Demo: a few sample bookings so the calendar and admin don't look empty (fake names, masked fake phones)
  function seedDemo(force) {
    if (!SHOP.demo) return;
    if (!force && localStorage.getItem(KEY + '.seeded')) return;
    const names = ['علی م.', 'حسین ک.', 'امیر ر.', 'پارسا ن.', 'محمد ج.', 'سینا ت.', 'کیان ص.', 'رضا ب.'];
    const list = force ? [] : load(); let i = 0;
    for (const k of days().slice(0, 5)) {
      const h = hoursFor(k); if (!h) continue;
      for (const sid of ['combo', 'hair', 'fade', 'beard', 'hair']) {
        const s = service(sid), free = slots(k, s.dur, list).filter(t => t >= toMin(h.open) + 60);
        if (!free.length) continue;
        const t = free[(i * 7) % free.length];
        list.push({ id: 'demo' + i, code: String(1000 + i * 37), service: sid, dur: s.dur, price: s.price, date: k, start: t, name: names[i % names.length], phone: '0900000000' + (i % 10), created: Date.now(), status: 'booked', demo: true });
        i++;
      }
    }
    save(list); localStorage.setItem(KEY + '.seeded', '1');
  }

  return { load, save, slots, grid, days, add, update, remove, seedDemo, validPhone, cleanPhone, dateKey, fromKey, hoursFor, KEY };
})();

// Persian calendar labels
const fa = (k, opt) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', opt).format(Store.fromKey(k));
const dayLabel = k => ({ wd: fa(k, { weekday: 'long' }), d: fa(k, { day: 'numeric' }), m: fa(k, { month: 'long' }) });
const fullDate = k => fa(k, { weekday: 'long', day: 'numeric', month: 'long' });

// Dev layer: only on local machines
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = '../dev/dev.js';
  s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-barber.js'; document.body.append(c); };
  document.head.append(s);
}
