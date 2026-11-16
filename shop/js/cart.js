// Shop logic without UI: prices, cart in localStorage, totals, checkout validation, demo orders.
window.Cart = (() => {
  const S = SHOP, KEY = 'shop.cart', OKEY = 'shop.orders';
  // Looked up on every call: the owner panel (edits.js) may replace SHOP.products while the page is open
  let index = null, indexed = null;
  const ids = () => { if (indexed !== S.products) { indexed = S.products; index = Object.fromEntries(S.products.map(p => [p.id, p])); } return index; };
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const listeners = [];
  const changed = () => listeners.forEach(f => f());

  // Discounted price, rounded to 1000 toman
  const priceOf = p => p.off ? Math.round(p.price * (1 - p.off) / 1000) * 1000 : p.price;
  const inStock = (p, size) => p.sizes.includes(size) && !(p.soldOut || []).includes(size);
  const soldOutAll = p => !p.sizes.some(s => inStock(p, s));
  const keyOf = l => `${l.id}|${l.color}|${l.size}`;

  // Only lines whose product/color/size still exist (data.js may change between visits)
  const lines = () => { const byId = ids(); return read(KEY).filter(l => byId[l.id] && byId[l.id].colors.some(c => c.name === l.color) && inStock(byId[l.id], l.size) && l.qty > 0)
    .map(l => ({ ...l, qty: Math.min(l.qty, S.maxQty), p: byId[l.id] })); };
  const save = ls => { write(KEY, ls.map(({ id, color, size, qty }) => ({ id, color, size, qty }))); changed(); };

  /** Add item; returns '' on success or an error message */
  function add(id, color, size, qty = 1) {
    const p = ids()[id];
    if (!p) return 'محصول پیدا نشد';
    if (!p.colors.some(c => c.name === color)) return 'رنگ را انتخاب کنید';
    if (!p.sizes.includes(size)) return 'سایز را انتخاب کنید';
    if (!inStock(p, size)) return 'این سایز تمام شده است';
    const ls = lines(), k = keyOf({ id, color, size }), l = ls.find(x => keyOf(x) === k);
    if (l) { if (l.qty >= S.maxQty) return `حداکثر ${(S.maxQty).toLocaleString('fa-IR')} عدد از هر محصول`; l.qty = Math.min(S.maxQty, l.qty + qty); }
    else ls.push({ id, color, size, qty: Math.min(S.maxQty, qty) });
    save(ls); return '';
  }
  const setQty = (k, qty) => { const ls = lines(), l = ls.find(x => keyOf(x) === k); if (!l) return; l.qty = Math.max(0, Math.min(S.maxQty, qty)); save(ls.filter(x => x.qty > 0)); };
  const remove = k => save(lines().filter(x => keyOf(x) !== k));
  const clear = () => save([]);
  const count = () => lines().reduce((s, l) => s + l.qty, 0);

  function totals(shipId = 'post') {
    const ls = lines(), sub = ls.reduce((s, l) => s + priceOf(l.p) * l.qty, 0);
    const saved = ls.reduce((s, l) => s + (l.p.price - priceOf(l.p)) * l.qty, 0);
    const m = S.shipping.find(x => x.id === shipId) || S.shipping[0];
    const freeShip = !!m.free && sub >= S.freeShipFrom;
    const ship = !ls.length || freeShip ? 0 : m.price;
    return { sub, saved, ship, freeShip, total: sub + ship, toFree: Math.max(0, S.freeShipFrom - sub), count: ls.reduce((s, l) => s + l.qty, 0) };
  }

  // Persian/Arabic digits → latin
  const norm = s => String(s || '').trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  /** Validate checkout form values; returns {field: message} (empty = valid) */
  function validate(f) {
    const e = {};
    if (norm(f.name).length < 3) e.name = 'نام و نام خانوادگی را بنویسید';
    if (!/^09\d{9}$/.test(norm(f.phone).replace(/[\s-]/g, ''))) e.phone = 'شماره موبایل ۱۱ رقمی با ۰۹ شروع می‌شود';
    if (norm(f.city).length < 2) e.city = 'شهر را بنویسید';
    if (norm(f.address).length < 10) e.address = 'نشانی کامل را بنویسید';
    if (!/^\d{10}$/.test(norm(f.postal).replace(/[\s-]/g, ''))) e.postal = 'کد پستی ۱۰ رقمی است';
    if (!S.shipping.some(m => m.id === f.ship)) e.ship = 'روش ارسال را انتخاب کنید';
    if (f.ship === 'courier' && !/تهران/.test(f.city || '')) e.city = 'ارسال با پیک فقط برای تهران است';
    return e;
  }

  /** Demo order: no payment. Saves the order locally, empties the cart. Returns the order or {errors}. */
  function placeOrder(f) {
    const errors = validate(f);
    if (!lines().length) errors.cart = 'سبد خرید خالی است';
    if (Object.keys(errors).length) return { errors };
    const t = totals(f.ship);
    const order = { no: 'YS-' + Date.now().toString().slice(-6), at: Date.now(), demo: S.demo, ship: f.ship, totals: t,
      items: lines().map(({ id, color, size, qty, p }) => ({ id, name: p.name, color, size, qty, price: priceOf(p) })), city: norm(f.city) };
    write(OKEY, [order, ...read(OKEY)].slice(0, 20));
    clear();
    return order;
  }
  const orders = () => read(OKEY);
  const deleteOrder = no => write(OKEY, orders().filter(o => o.no !== no));

  return { get byId() { return ids(); }, priceOf, inStock, soldOutAll, keyOf, lines, add, setQty, remove, clear, count, totals, validate, placeOrder, orders, deleteOrder, norm, onChange: f => listeners.push(f), KEY, OKEY };
})();
