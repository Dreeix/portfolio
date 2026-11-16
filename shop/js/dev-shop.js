// Shop dev hooks (localhost only, after ../dev/dev.js). Checks never leave the cart/orders changed.
(() => {
  const S = SHOP, C = Cart, ui = window.__shop;
  const TEST_FORM = { name: 'مشتری آزمایشی', phone: '۰۹۰۰۰۰۰۰۰۰۰', city: 'تهران', address: 'خیابان آزمایش، کوچه نمونه، پلاک ۱', postal: '۱۲۳۴۵۶۷۸۹۰', ship: 'post', note: '' };
  // Run fn with a scratch cart; restore the real cart + orders afterwards
  const sandbox = fn => {
    const cart = localStorage.getItem(C.KEY), ord = localStorage.getItem(C.OKEY), form = { ...ui.form() };
    try { C.clear(); return fn(); } finally {
      cart == null ? localStorage.removeItem(C.KEY) : localStorage.setItem(C.KEY, cart);
      ord == null ? localStorage.removeItem(C.OKEY) : localStorage.setItem(C.OKEY, ord);
      Object.assign(ui.form(), form); ui.close(); ui.renderGrid();
      window.dispatchEvent(new StorageEvent('storage', { key: C.KEY })); // re-render badge + sticky bar
    }
  };
  const firstOk = p => S.sizeOrder.find(s => C.inStock(p, s));
  const addAny = (p, n = 1) => C.add(p.id, p.colors[0].name, firstOk(p), n);

  window.__dbg.site = {
    name: 'shop',
    actions: {
      'Open product 1': () => ui.openProduct(S.products[0].id),
      'Open product w/ sold-out size': () => ui.openProduct(S.products.find(p => p.soldOut?.length).id),
      'Add 3 random items': () => { for (let i = 0; i < 3; i++) addAny(S.products[Math.random() * S.products.length | 0]); ui.openCart(); },
      'Fill cart past free shipping': () => { S.products.slice(0, 4).forEach(p => addAny(p)); ui.openCart(); },
      'Open cart': () => ui.openCart(),
      'Checkout (prefilled)': () => { if (!C.count()) addAny(S.products[0]); ui.fill(TEST_FORM); ui.openCheckout(); },
      'Place demo order': () => { if (!C.count()) addAny(S.products[0]); ui.fill(TEST_FORM); ui.openCheckout(); ui.submit(); },
      'Empty cart': () => { C.clear(); return 'cart emptied'; },
      'Clear demo orders': () => { localStorage.removeItem(C.OKEY); return 'orders cleared'; },
      ...Object.fromEntries(S.categories.map(c => [`Filter: ${c.id}`, () => { ui.setCat(c.id); window.__dbg.jump('shop'); }])),
      'Close sheet': () => ui.close(),
    },
    checks: [
      function contacts() {
        if (S.demo) return [S.whatsapp, S.telegram, S.instagram].some(Boolean) ? ['demo mode but a real contact value is set in data.js'] : [];
        return [];
      },
      function products() {
        const bad = [], ids = new Set(), cats = new Set(S.categories.map(c => c.id));
        S.products.forEach(p => {
          if (ids.has(p.id)) bad.push(`duplicate id ${p.id}`); ids.add(p.id);
          if (!cats.has(p.cat)) bad.push(`${p.id}: unknown category ${p.cat}`);
          if (!p.colors?.length) bad.push(`${p.id}: no colors`);
          if (!p.sizes?.length || p.sizes.some(s => !S.sizeOrder.includes(s))) bad.push(`${p.id}: sizes not in sizeOrder`);
          if ((p.soldOut || []).some(s => !p.sizes.includes(s))) bad.push(`${p.id}: soldOut size not in sizes`);
          if (!firstOk(p)) bad.push(`${p.id}: every size sold out`);
          if (!p.desc || !p.material) bad.push(`${p.id}: missing desc/material`);
        });
        S.categories.forEach(c => { if (!S.products.some(p => p.cat === c.id)) bad.push(`category ${c.id} is empty`); });
        return bad;
      },
      function prices() {
        return S.products.flatMap(p => {
          const bad = [], s = C.priceOf(p);
          if (!(p.price > 0 && p.price % 1000 === 0)) bad.push(`${p.id}: price ${p.price}`);
          if (p.off != null && !(p.off > 0 && p.off <= 0.5)) bad.push(`${p.id}: off ${p.off} outside 0..0.5`);
          if (p.off && !(s < p.price && s % 1000 === 0)) bad.push(`${p.id}: sale price ${s} wrong`);
          return bad;
        });
      },
      function filtersAndSearch() {
        const bad = [];
        S.categories.forEach(c => { const n = ui.setCat(c.id).length, want = S.products.filter(p => p.cat === c.id).length; if (n !== want) bad.push(`filter ${c.id}: ${n} shown, ${want} expected`); });
        if (ui.setCat('all').length !== S.products.length) bad.push('"all" does not show every product');
        if (!ui.setSearch('هودی').length) bad.push('search "هودی" finds nothing');
        if (ui.setSearch('zzzz').length || document.getElementById('empty').hidden) bad.push('no-result search should show the empty message');
        ui.setSearch('');
        const cheap = ui.setSort('cheap').map(id => C.priceOf(C.byId[id]));
        if (cheap.some((v, i) => i && v < cheap[i - 1])) bad.push('sort cheap is not ascending');
        ui.setSort('new');
        return bad;
      },
      function cartRules() {
        return sandbox(() => {
          const bad = [], p = S.products.find(x => x.soldOut?.length);
          if (!C.add(p.id, p.colors[0].name, p.soldOut[0])) bad.push('sold-out size was added');
          if (!C.add(p.id, p.colors[0].name, '')) bad.push('no size was accepted');
          if (!C.add(p.id, 'رنگ-نامعتبر', firstOk(p))) bad.push('unknown color was accepted');
          C.add(p.id, p.colors[0].name, firstOk(p), 99);
          if (C.count() !== S.maxQty) bad.push(`qty not capped at maxQty (${C.count()})`);
          if (!C.add(p.id, p.colors[0].name, firstOk(p))) bad.push('add past maxQty did not error');
          const k = C.keyOf(C.lines()[0]); C.setQty(k, 0);
          if (C.count()) bad.push('setQty 0 did not remove the line');
          // same product, different colour = separate lines
          const q = S.products.find(x => x.colors.length > 1);
          C.add(q.id, q.colors[0].name, firstOk(q)); C.add(q.id, q.colors[1].name, firstOk(q)); C.add(q.id, q.colors[0].name, firstOk(q));
          if (C.lines().length !== 2 || C.count() !== 3) bad.push('colour variants not kept as separate lines');
          // corrupt storage must not crash
          localStorage.setItem(C.KEY, '{broken'); if (C.lines().length) bad.push('corrupt cart storage not ignored');
          localStorage.setItem(C.KEY, JSON.stringify([{ id: 'gone', color: 'x', size: 'M', qty: 1 }])); if (C.lines().length) bad.push('removed product kept in cart');
          return bad;
        });
      },
      function totalsMath() {
        return sandbox(() => {
          const bad = [], post = S.shipping.find(m => m.id === 'post'), cour = S.shipping.find(m => m.id === 'courier');
          if (C.totals().total !== 0) bad.push('empty cart total not 0');
          const cheap = S.products.reduce((a, b) => C.priceOf(a) < C.priceOf(b) ? a : b);
          addAny(cheap);
          let t = C.totals('post');
          if (t.sub !== C.priceOf(cheap) || t.ship !== post.price || t.total !== t.sub + post.price) bad.push(`small cart totals wrong ${JSON.stringify(t)}`);
          if (t.toFree !== S.freeShipFrom - t.sub) bad.push('toFree wrong');
          C.clear(); S.products.forEach(p => addAny(p));
          t = C.totals('post');
          const sub = S.products.reduce((s, p) => s + C.priceOf(p), 0), saved = S.products.reduce((s, p) => s + p.price - C.priceOf(p), 0);
          if (t.sub !== sub || t.saved !== saved) bad.push(`subtotal ${t.sub}/${sub} saved ${t.saved}/${saved}`);
          if (sub >= S.freeShipFrom && (t.ship !== 0 || !t.freeShip)) bad.push('post not free above threshold');
          if (C.totals('courier').ship !== cour.price) bad.push('courier should never be free');
          return bad;
        });
      },
      function checkoutValidation() {
        const bad = [], ok = C.validate(TEST_FORM);
        if (Object.keys(ok).length) bad.push(`valid form rejected: ${JSON.stringify(ok)}`);
        const cases = [['phone', '0912'], ['phone', '۱۹۱۲۰۰۰۰۰۰۰'], ['postal', '123'], ['name', ''], ['address', 'کوتاه'], ['ship', 'x']];
        cases.forEach(([k, v]) => { if (!C.validate({ ...TEST_FORM, [k]: v })[k]) bad.push(`${k}="${v}" was accepted`); });
        if (Object.keys(C.validate({ ...TEST_FORM, phone: '0900 000 0000' })).length) bad.push('phone with spaces rejected');
        if (!C.validate({ ...TEST_FORM, ship: 'courier', city: 'شیراز' }).city) bad.push('courier outside Tehran accepted');
        return bad;
      },
      function fullOrderFlow() {
        return sandbox(() => {
          const bad = [], p = S.products[0];
          ui.openProduct(p.id);
          document.querySelector('#sheet [data-size]:not(:disabled)')?.click();
          document.getElementById('addBtn').click();
          if (ui.view() !== 'cart' || C.count() !== 1) bad.push(`add from product sheet failed (view=${ui.view()}, count=${C.count()})`);
          if (document.getElementById('cartCount').hidden) bad.push('header badge hidden with items in cart');
          document.getElementById('toCheckout').click();
          if (ui.view() !== 'checkout') bad.push('checkout did not open');
          document.getElementById('payBtn').click();               // empty form → errors, no order
          if (ui.view() !== 'checkout' || !document.querySelector('[data-err="phone"]').textContent) bad.push('empty form did not show errors');
          ui.fill(TEST_FORM); ui.submit();
          const o = C.orders()[0];
          if (ui.view() !== 'done' || !o || C.count()) bad.push(`order not placed (view=${ui.view()}, cart=${C.count()})`);
          if (o && o.totals.total !== o.items.reduce((s, i) => s + i.price * i.qty, 0) + o.totals.ship) bad.push('order total mismatch');
          if (!document.querySelector('#sheet .demo-pay')) bad.push('confirmation lacks the demo notice');
          return bad;
        });
      },
      function stickyBar() { return document.querySelectorAll('.sticky').length === 1 ? [] : ['sticky bar count != 1']; },
    ],
  };
})();
