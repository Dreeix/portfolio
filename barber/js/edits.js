// Owner edits from the demo panel (admin.html): saved ONLY in this visitor's browser (localStorage), laid over the data.js defaults.
// ---- shared part: the same OwnerKit is copied in cafe/, shop/ and barber/ (each folder stays self-contained) ----
window.OwnerKit = (() => {
  const clone = o => JSON.parse(JSON.stringify(o));
  const fa = n => Number(n).toLocaleString('fa-IR');
  const en = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  // "۱۲۵٬۰۰۰" / "125,000" / " 125000 " → 125000 ; anything else → NaN
  const num = s => { const t = en(s).replace(/[,٬،\s]/g, ''); return /^[-−]?\d+$/.test(t) ? +t.replace('−', '-') : NaN; };
  // Validators return '' when fine, else a Persian message for the owner
  const text = (s, label, max, optional) => typeof s !== 'string' ? `${label} نامعتبر است`
    : !s.trim() ? (optional ? '' : `${label} را بنویسید`) : s.length > max ? `${label} حداکثر ${fa(max)} حرف باشد`
    : /[<>"]/.test(s) ? `${label}: نشانه‌های < > " مجاز نیست` : '';
  const money = (n, label, min, max) => !Number.isInteger(n) ? `${label} را به عدد بنویسید`
    : n < min || n > max ? `${label} باید بین ${fa(min)} و ${fa(max)} تومان باشد` : n % 1000 ? `${label} باید مضرب ۱٬۰۰۰ تومان باشد` : '';
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(en(t).trim())))].map(b => b.toString(16).padStart(2, '0')).join('');

  // data: the site object (CAFE/SHOP), fields: keys the panel may change, check(v) → '' or message, after(): re-derive fields
  function make({ data, key, fields, check, after = () => {} }) {
    const pick = () => clone(Object.fromEntries(fields.map(f => [f, data[f]])));
    const defaults = pick();
    const problem = v => { try { return !v || typeof v !== 'object' || fields.some(f => !(f in v)) ? 'ساختار نامعتبر' : check(v); } catch (e) { return 'نامعتبر: ' + e.message; } };
    let corrupt = false;
    const read = () => {
      let raw = null; try { raw = localStorage.getItem(key); } catch {}
      corrupt = false; if (raw == null) return null;
      let v = null; try { v = JSON.parse(raw); } catch {}
      const err = problem(v); if (!err) return v;
      corrupt = true; console.warn(`[${key}] saved edits ignored (${err}); showing the defaults`); return null;
    };
    const apply = v => { const src = clone(v || defaults); fields.forEach(f => { data[f] = src[f]; }); after(); };
    const E = {
      key, defaults: () => clone(defaults), current: pick, check: problem,
      edited: () => !!read(), corrupt: () => (read(), corrupt), savedAt: () => read()?.at || 0,
      save(v) {
        const err = problem(v); if (err) return err;
        const out = { ...Object.fromEntries(fields.map(f => [f, v[f]])), at: Date.now() };
        try { localStorage.setItem(key, JSON.stringify(out)); } catch { return 'ذخیره نشد (حافظه‌ی مرورگر در دسترس نیست)'; }
        apply(out); return '';
      },
      reset() { try { localStorage.removeItem(key); } catch {} apply(null); },
      reload() { apply(read()); },
    };
    E.reload();
    // The panel saved in another tab → public pages reload to show it at once
    addEventListener('storage', e => { if (e.key === key && !E.noAutoReload) location.reload(); });
    return E;
  }
  return { make, text, money, num, en, fa, sha, clone };
})();

// ---- barber part: services (name, price, duration) and weekly hours/breaks; bookings stay in store.js ----
window.BarberEdits = (() => {
  const K = OwnerKit, ids = SHOP.services.map(s => s.id);
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const hm = t => typeof t === 'string' && /^([01]\d|2[0-4]):(00|15|30|45)$/.test(t) && t <= '24:00';
  const min = t => +t.slice(0, 2) * 60 + +t.slice(3);
  function check(v) {
    const { services: sv, hours: H } = v;
    if (!Array.isArray(sv) || sv.length !== ids.length || sv.some((s, i) => !s || s.id !== ids[i])) return 'خدمات نامعتبر است';
    for (const s of sv) {
      const who = typeof s.name === 'string' && s.name.trim() ? `«${s.name.trim()}»: ` : '';
      const e = K.text(s.name, 'نام خدمت', 30) || K.money(s.price, `${who}قیمت`, 10000, 50000000) || K.text(s.desc ?? '', `${who}توضیح`, 80, true);
      if (e) return e;
      if (!Number.isInteger(s.dur) || s.dur < 15 || s.dur > 240 || s.dur % 15) return `${who}مدت باید بین ۱۵ دقیقه تا ۴ ساعت (مضرب ۱۵) باشد`;
    }
    if (!Array.isArray(H) || H.length !== 7) return 'ساعت کاری نامعتبر است';
    if (H.every(h => h === null)) return 'دست‌کم یک روز باید باز باشد';
    for (let d = 0; d < 7; d++) {
      const h = H[d]; if (h === null) continue;
      const n = days[d];
      if (!h || !hm(h.open) || !hm(h.close)) return `${n}: ساعت نامعتبر است`;
      if (min(h.close) - min(h.open) < 30) return `${n}: ساعت پایان باید دست‌کم نیم ساعت بعد از شروع باشد`;
      if (!Array.isArray(h.breaks) || h.breaks.length > 3) return `${n}: حداکثر ۳ استراحت`;
      const br = [];
      for (const b of h.breaks) {
        if (!Array.isArray(b) || b.length !== 2 || !hm(b[0]) || !hm(b[1])) return `${n}: ساعت استراحت نامعتبر است`;
        if (min(b[1]) <= min(b[0])) return `${n}: پایان استراحت باید بعد از شروع آن باشد`;
        if (min(b[0]) <= min(h.open) || min(b[1]) >= min(h.close)) return `${n}: استراحت باید داخل ساعت کاری باشد`;
        br.push([min(b[0]), min(b[1])]);
      }
      br.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < br.length; i++) if (br[i][0] < br[i - 1][1]) return `${n}: دو استراحت روی هم افتاده‌اند`;
    }
    return '';
  }
  const E = K.make({ data: SHOP, key: 'barber.edits.v1', fields: ['services', 'hours'], check,
    after: () => SHOP.hours.forEach(h => h?.breaks.sort((a, b) => a[0].localeCompare(b[0]))) });
  E.days = days;
  return E;
})();
