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

// ---- café part ----
window.CafeEdits = (() => {
  const K = OwnerKit, catIds = CAFE.categories.map(c => c.id);
  const id = s => typeof s === 'string' && /^[a-z0-9-]{1,40}$/.test(s);
  function check(v) {
    const { categories: cats, hours } = v;
    if (!Array.isArray(cats) || cats.length !== catIds.length || cats.some((c, i) => !c || c.id !== catIds[i] || !Array.isArray(c.items))) return 'دسته‌ها نامعتبر است';
    const seen = new Set(); let n = 0;
    for (const c of cats) for (const i of c.items) {
      if (!i || !id(i.id) || seen.has(i.id)) return 'شناسه‌ی آیتم نامعتبر است'; seen.add(i.id); n++;
      const who = typeof i.name === 'string' && i.name.trim() ? `«${i.name.trim()}»: ` : '';
      const e = K.text(i.name, 'نام آیتم', 40) || K.text(i.desc ?? '', `${who}توضیح`, 120, true) || K.money(i.price, `${who}قیمت`, 1000, 20000000);
      if (e) return e;
      if (i.tag != null && !['', 'محبوب', 'جدید'].includes(i.tag)) return `${who}برچسب نامعتبر است`;
      if (i.soldOut != null && typeof i.soldOut !== 'boolean') return `${who}وضعیت «تمام شد» نامعتبر است`;
      if (i.img != null && !/^img\/[a-z0-9-]+\.(svg|webp|jpg|png)$/.test(i.img)) return `${who}تصویر نامعتبر است`;
    }
    if (!n) return 'منو دست‌کم یک آیتم لازم دارد';
    if (n > 150) return 'تعداد آیتم‌ها زیاد است (حداکثر ۱۵۰)';
    if (!Array.isArray(hours) || !hours.length || hours.length > 7) return 'ساعت کاری دست‌کم یک روز باز لازم دارد';
    const byDay = {};
    for (const h of hours) {
      if (!h || !Number.isInteger(h.day) || h.day < 0 || h.day > 6 || byDay[h.day]) return 'روزهای ساعت کاری نامعتبر است';
      const d = CAFE.dayNames[h.day];
      if (!Number.isInteger(h.open) || !Number.isInteger(h.close) || h.open < 0 || h.open > 23 || h.close > 28) return `${d}: ساعت نامعتبر است`;
      if (h.close <= h.open) return `${d}: ساعت بستن باید بعد از ساعت باز شدن باشد`;
      byDay[h.day] = h;
    }
    for (const h of hours) { // past midnight must not run into the next day's opening
      const nx = byDay[(h.day + 1) % 7];
      if (h.close > 24 && nx && nx.open < h.close - 24) return `${CAFE.dayNames[h.day]} تا بامداد باز است و با ساعت شروع ${CAFE.dayNames[nx.day]} تداخل دارد`;
    }
    return '';
  }
  return K.make({ data: CAFE, key: 'cafe.edits.v1', fields: ['categories', 'hours'], check,
    after: () => { CAFE.hours.sort((a, b) => a.day - b.day); CAFE.categories.forEach(c => c.items.forEach(i => { i.img = i.img || `img/new-${c.id}.svg`; i.cat = c.id; })); } });
})();
