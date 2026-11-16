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

// ---- shop part ----
window.ShopEdits = (() => {
  const K = OwnerKit, S = SHOP, cats = S.categories.map(c => c.id), shipIds = S.shipping.map(m => m.id);
  const FREE = 'فری‌سایز';
  function check(v) {
    const { products: P, shipping: sh, freeShipFrom: free } = v;
    if (!Array.isArray(P) || !P.length) return 'فروشگاه دست‌کم یک محصول لازم دارد';
    if (P.length > 60) return 'تعداد محصولات زیاد است (حداکثر ۶۰)';
    const seen = new Set();
    for (const p of P) {
      if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(p.id) || seen.has(p.id)) return 'شناسه‌ی محصول نامعتبر است'; seen.add(p.id);
      const who = typeof p.name === 'string' && p.name.trim() ? `«${p.name.trim()}»: ` : '';
      const e = K.text(p.name, 'نام محصول', 50) || K.money(p.price, `${who}قیمت`, 10000, 500000000)
        || K.text(p.desc ?? '', `${who}توضیح`, 300, true) || K.text(p.material ?? '', `${who}جنس`, 60, true);
      if (e) return e;
      if (!cats.includes(p.cat)) return `${who}دسته نامعتبر است`;
      if (p.off != null && (typeof p.off !== 'number' || p.off < 0 || p.off > 0.9 || Math.abs(p.off * 100 - Math.round(p.off * 100)) > 1e-6)) return `${who}تخفیف باید عددی بین ۰ تا ۹۰ درصد باشد`;
      if (!Array.isArray(p.colors) || !p.colors.length) return `${who}دست‌کم یک رنگ لازم است`;
      if (p.colors.length > 8) return `${who}حداکثر ۸ رنگ`;
      const cn = new Set();
      for (const c of p.colors) {
        const ce = c && (K.text(c.name, `${who}نام رنگ`, 20)); if (!c || ce) return ce || `${who}رنگ نامعتبر است`;
        if (cn.has(c.name.trim())) return `${who}رنگ «${c.name.trim()}» تکراری است`; cn.add(c.name.trim());
        if (typeof c.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.hex)) return `${who}کد رنگ نامعتبر است`;
      }
      if (!Array.isArray(p.sizes) || !p.sizes.length) return `${who}دست‌کم یک سایز انتخاب کنید`;
      if (p.sizes.some(s => !S.sizeOrder.includes(s)) || new Set(p.sizes).size !== p.sizes.length) return `${who}سایز نامعتبر است`;
      if (p.sizes.includes(FREE) && p.sizes.length > 1) return `${who}«فری‌سایز» با سایزهای دیگر جمع نمی‌شود`;
      if (p.soldOut != null && (!Array.isArray(p.soldOut) || p.soldOut.some(s => !p.sizes.includes(s)))) return `${who}سایزهای تمام‌شده نامعتبر است`;
      if (p.isNew != null && typeof p.isNew !== 'boolean') return `${who}برچسب جدید نامعتبر است`;
      if (p.shape != null && (typeof p.shape !== 'string' || !/^[a-z]{1,20}$/.test(p.shape))) return `${who}شکل نامعتبر است`;
      if (p.img != null && (typeof p.img !== 'string' || !/^img\/[a-z0-9-]+\.svg$/.test(p.img))) return `${who}تصویر نامعتبر است`;
    }
    if (!Array.isArray(sh) || sh.length !== shipIds.length || sh.some((m, i) => !m || m.id !== shipIds[i])) return 'روش‌های ارسال نامعتبر است';
    for (const m of sh) { const e = K.text(m.name, 'نام روش ارسال', 40) || K.money(m.price, `هزینه‌ی ${m.name}`, 0, 5000000); if (e) return e; }
    return K.money(free, 'حداقل خرید برای ارسال رایگان', 0, 1000000000);
  }
  return K.make({ data: S, key: 'shop.edits.v1', fields: ['products', 'shipping', 'freeShipFrom'], check });
})();
