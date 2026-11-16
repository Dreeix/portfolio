// Shop UI: product grid (filter/search/sort), product sheet, cart sheet, checkout + demo confirmation
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const faNum = n => Number(n).toLocaleString('fa-IR');
const toman = n => `${faNum(n)} <small>تومان</small>`;
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200);
}

(() => {
  const S = SHOP, C = Cart;
  const catName = Object.fromEntries(S.categories.map(c => [c.id, c.name]));
  const state = { cat: 'all', q: '', sort: 'new' };

  // ----- static bits -----
  $('#logoName').textContent = S.title;
  $('#tagline').textContent = S.tagline;
  $('#freeShipPill').textContent = `ارسال رایگان برای خرید بالای ${faNum(S.freeShipFrom / 1e6)} میلیون`;
  $('#perks').innerHTML = S.perks.map(([i, t]) => `<li><span>${i}</span>${t}</li>`).join('');
  $('#copy').textContent = `© ۱۴۰۵ ${S.title} · طراحی توسط Dreeix`;

  // Contacts: real link only when not demo and value set; otherwise a demo notice
  const contactUrl = k => k === 'instagram' ? S.instagram : k === 'telegram' ? `https://t.me/${S.telegram}` : `https://wa.me/${S.whatsapp}`;
  $$('[data-contact]').forEach(a => {
    const k = a.dataset.contact;
    if (!S.demo && S[k]) { a.href = contactUrl(k); a.target = '_blank'; a.rel = 'noopener'; }
    else { a.href = '#'; a.dataset.demo = a.textContent; }
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-demo]'); if (!a) return;
    e.preventDefault(); toast(`نسخه‌ی نمایشی: در سایت واقعی، ${a.dataset.demo} فروشگاه باز می‌شود.`);
  });

  // ----- grid -----
  const counts = { all: S.products.length };
  S.products.forEach(p => counts[p.cat] = (counts[p.cat] || 0) + 1);
  $('#chips').innerHTML = [{ id: 'all', name: 'همه' }, ...S.categories].map(c =>
    `<button role="tab" data-cat="${c.id}" aria-selected="${c.id === 'all'}">${c.name} <small>${faNum(counts[c.id] || 0)}</small></button>`).join('');

  const priceHtml = p => p.off ? `<b>${toman(C.priceOf(p))}</b><s>${faNum(p.price)}</s>` : `<b>${toman(p.price)}</b>`;
  const matches = p => {
    const q = C.norm(state.q).toLowerCase();
    return (state.cat === 'all' || p.cat === state.cat) && (!q || [p.name, p.material, catName[p.cat], ...p.colors.map(c => c.name)].join(' ').toLowerCase().includes(q));
  };
  const sorters = { new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0), cheap: (a, b) => C.priceOf(a) - C.priceOf(b), exp: (a, b) => C.priceOf(b) - C.priceOf(a), off: (a, b) => (b.off || 0) - (a.off || 0) };
  function renderGrid() {
    const list = S.products.filter(matches).sort(sorters[state.sort]);
    $('#grid').innerHTML = list.map(p => `
      <article class="card" data-id="${p.id}">
        <button class="card-img" data-open="${p.id}" aria-label="${p.name}">
          <img src="img/${p.id}.svg" alt="${p.name}" width="300" height="375" loading="lazy">
          ${p.off ? `<span class="tag off">٪${faNum(p.off * 100)}−</span>` : p.isNew ? '<span class="tag">جدید</span>' : ''}
        </button>
        <div class="card-txt">
          <h3><button data-open="${p.id}">${p.name}</button></h3>
          <div class="dots">${p.colors.map(c => `<i style="background:${c.hex}" title="${c.name}"></i>`).join('')}</div>
          <div class="price">${priceHtml(p)}</div>
        </div>
      </article>`).join('');
    $('#empty').hidden = list.length > 0;
    return list.map(p => p.id);
  }
  $('#chips').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); };
  function setCat(cat) { state.cat = cat; $$('#chips [data-cat]').forEach(b => b.setAttribute('aria-selected', b.dataset.cat === cat)); return renderGrid(); }
  $('#q').oninput = e => { state.q = e.target.value; renderGrid(); };
  $('#sort').onchange = e => { state.sort = e.target.value; renderGrid(); };
  $('#grid').onclick = e => { const b = e.target.closest('[data-open]'); if (b) openProduct(b.dataset.open); };

  // ----- sheet (history-aware: phone back button closes it) -----
  const sheet = $('#sheet'), bg = $('#sheetBg'), body = $('#sheetBody');
  let view = '';
  function show(name, html, label) {
    body.innerHTML = html; view = name; sheet.setAttribute('aria-label', label); sheet.scrollTop = 0;
    if (!sheet.classList.contains('on')) {
      sheet.classList.add('on'); bg.classList.add('on'); document.body.style.overflow = 'hidden';
      if (history.state?.sheet !== 1) history.pushState({ sheet: 1 }, '');
    }
    sheet.dataset.view = name;
    $('#sheetX').focus({ preventScroll: true });
  }
  function hide() { sheet.classList.remove('on'); bg.classList.remove('on'); document.body.style.overflow = ''; view = ''; sheet.dataset.view = ''; }
  function close() { const had = history.state?.sheet === 1; hide(); if (had) history.back(); }
  addEventListener('popstate', () => { if (view) hide(); });
  bg.onclick = close; $('#sheetX').onclick = close; addEventListener('keydown', e => e.key === 'Escape' && view && close());

  // ----- product sheet -----
  let sel = {};
  function openProduct(id) {
    const p = C.byId[id]; if (!p) return;
    const sizes = S.sizeOrder.filter(s => p.sizes.includes(s));
    sel = { id, color: p.colors[0].name, size: sizes.length === 1 && C.inStock(p, sizes[0]) ? sizes[0] : '' };
    const hasGuide = sizes.some(s => S.sizeGuide.some(g => g[0] === s));
    show('product', `
      <div class="pd">
        <img src="img/${p.id}.svg" alt="${p.name}" width="300" height="375">
        <div>
          <span class="muted">${catName[p.cat]}</span>
          <h3>${p.name}</h3>
          <div class="price big">${priceHtml(p)}${p.off ? `<span class="tag off">٪${faNum(p.off * 100)} تخفیف</span>` : ''}</div>
          <p>${p.desc}</p>
          <p class="muted">جنس: ${p.material}</p>
        </div>
      </div>
      <h4>رنگ: <span id="colorLbl">${sel.color}</span></h4>
      <div class="swatches">${p.colors.map(c => `<button data-color="${c.name}" aria-label="${c.name}" aria-pressed="${c.name === sel.color}" style="--c:${c.hex}"></button>`).join('')}</div>
      <h4>سایز</h4>
      <div class="sizes">${sizes.map(s => `<button data-size="${s}" aria-pressed="${s === sel.size}" ${C.inStock(p, s) ? '' : 'disabled title="ناموجود"'}>${s}</button>`).join('')}</div>
      ${hasGuide ? `<details class="guide"><summary>راهنمای سایز</summary><table><tr><th>سایز</th><th>دور سینه (سانتی‌متر)</th></tr>${S.sizeGuide.filter(g => sizes.includes(g[0])).map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table></details>` : ''}
      <p class="err" id="addErr" role="alert"></p>
      <button class="btn btn-main wide" id="addBtn">افزودن به سبد خرید</button>`, p.name);
    $('.swatches', body).onclick = e => { const b = e.target.closest('[data-color]'); if (!b) return; sel.color = b.dataset.color; $$('[data-color]', body).forEach(x => x.setAttribute('aria-pressed', x === b)); $('#colorLbl').textContent = sel.color; };
    $('.sizes', body).onclick = e => { const b = e.target.closest('[data-size]'); if (!b || b.disabled) return; sel.size = b.dataset.size; $$('[data-size]', body).forEach(x => x.setAttribute('aria-pressed', x === b)); $('#addErr').textContent = ''; };
    $('#addBtn').onclick = () => {
      const err = C.add(sel.id, sel.color, sel.size);
      if (err) { $('#addErr').textContent = err; return; }
      toast(`«${p.name}» به سبد اضافه شد`); openCart();
    };
  }

  // ----- cart sheet -----
  function openCart() {
    const ls = C.lines(), t = C.totals();
    if (!ls.length) return show('cart', `<h3>سبد خرید</h3><div class="cart-empty"><span>🛍️</span><p>سبد خرید خالی است.</p><button class="btn btn-main" id="goShop">دیدن محصولات</button></div>`, 'سبد خرید'),
      $('#goShop').onclick = () => { close(); $('#shop').scrollIntoView(); };
    show('cart', `
      <h3>سبد خرید <small class="muted">(${faNum(t.count)} کالا)</small></h3>
      ${t.toFree ? `<div class="ship-bar"><p>${toman(t.toFree)} تا ارسال رایگان</p><i style="--k:${Math.min(1, t.sub / S.freeShipFrom)}"></i></div>` : '<div class="ship-bar ok"><p>🎉 ارسال پستی رایگان شد</p></div>'}
      <ul class="lines">${ls.map(l => { const k = C.keyOf(l); return `
        <li data-key="${esc(k)}">
          <img src="img/${l.id}.svg" alt="" width="64" height="80">
          <div><b>${l.p.name}</b><span class="muted">${l.color} · ${l.size}</span><span class="price">${toman(C.priceOf(l.p) * l.qty)}</span></div>
          <div class="qty"><button data-q="1" aria-label="یکی بیشتر" ${l.qty >= S.maxQty ? 'disabled' : ''}>+</button><output>${faNum(l.qty)}</output><button data-q="-1" aria-label="یکی کمتر">${l.qty > 1 ? '−' : '🗑'}</button></div>
        </li>`; }).join('')}</ul>
      <dl class="sum"><dt>جمع کالاها</dt><dd>${toman(t.sub)}</dd>${t.saved ? `<dt>سود شما از تخفیف</dt><dd class="save">${toman(t.saved)}</dd>` : ''}</dl>
      <button class="btn btn-main wide" id="toCheckout">ادامه‌ی خرید · ${toman(t.sub)}</button>`, 'سبد خرید');
    $('.lines', body).onclick = e => {
      const b = e.target.closest('[data-q]'); if (!b) return;
      const k = b.closest('[data-key]').dataset.key, l = C.lines().find(x => C.keyOf(x) === k);
      if (l) { C.setQty(k, l.qty + +b.dataset.q); openCart(); }
    };
    $('#toCheckout').onclick = () => openCheckout();
  }

  // ----- checkout -----
  let form = { name: '', phone: '', city: '', address: '', postal: '', ship: 'post', note: '' };
  function openCheckout() {
    if (!C.count()) return openCart();
    const field = (k, label, attrs = '') => `<label class="f"><span>${label}</span><input name="${k}" value="${esc(form[k])}" ${attrs}><em data-err="${k}"></em></label>`;
    show('checkout', `
      <h3>ثبت سفارش</h3>
      <form id="coForm" novalidate>
        ${field('name', 'نام و نام خانوادگی', 'autocomplete="name"')}
        ${field('phone', 'شماره موبایل', 'inputmode="tel" autocomplete="tel" placeholder="۰۹ـ ـ ـ ـ ـ ـ ـ ـ ـ" dir="ltr"')}
        ${field('city', 'شهر', 'autocomplete="address-level2"')}
        <label class="f"><span>نشانی کامل</span><textarea name="address" rows="2" autocomplete="street-address">${esc(form.address)}</textarea><em data-err="address"></em></label>
        ${field('postal', 'کد پستی', 'inputmode="numeric" dir="ltr" placeholder="۱۰ رقم"')}
        <fieldset class="ship"><legend>روش ارسال</legend>${S.shipping.map(m => `
          <label><input type="radio" name="ship" value="${m.id}" ${form.ship === m.id ? 'checked' : ''}><span><b>${m.name}</b><small>${m.eta}</small></span><i data-ship-price="${m.id}"></i></label>`).join('')}
          <em data-err="ship"></em></fieldset>
        <label class="f"><span>توضیحات (اختیاری)</span><input name="note" value="${esc(form.note)}"></label>
        <dl class="sum" id="coSum"></dl>
        <p class="demo-pay">🔒 نسخه‌ی نمایشی: درگاه پرداخت وصل نیست و هیچ مبلغی کسر نمی‌شود.</p>
        <button class="btn btn-main wide" id="payBtn">پرداخت و ثبت سفارش (نمایشی)</button>
      </form>`, 'ثبت سفارش');
    const f = $('#coForm');
    const sync = () => { const d = new FormData(f); Object.keys(form).forEach(k => form[k] = d.get(k) ?? form[k]); renderSum(); };
    f.oninput = sync; f.onchange = sync;
    f.onsubmit = e => { e.preventDefault(); sync(); submit(); };
    renderSum();
  }
  function renderSum() {
    const t = C.totals(form.ship);
    S.shipping.forEach(m => { const el = $(`[data-ship-price="${m.id}"]`, body); if (el) el.innerHTML = m.free && t.sub >= S.freeShipFrom ? 'رایگان' : toman(m.price); });
    const sum = $('#coSum'); if (!sum) return;
    sum.innerHTML = `<dt>جمع کالاها</dt><dd>${toman(t.sub)}</dd><dt>هزینه‌ی ارسال</dt><dd>${t.ship ? toman(t.ship) : 'رایگان'}</dd><dt class="tot">مبلغ قابل پرداخت</dt><dd class="tot">${toman(t.total)}</dd>`;
  }
  function submit() {
    const r = C.placeOrder(form);
    $$('[data-err]', body).forEach(el => el.textContent = '');
    if (r.errors) {
      Object.entries(r.errors).forEach(([k, m]) => { const el = $(`[data-err="${k}"]`, body); if (el) el.textContent = m; });
      const first = Object.keys(r.errors)[0];
      $(`[name="${first}"]`, body)?.focus();
      if (r.errors.cart) openCart();
      return r;
    }
    const m = S.shipping.find(x => x.id === r.ship);
    show('done', `
      <div class="done">
        <span class="ok">✓</span>
        <h3>سفارش ثبت شد</h3>
        <p>شماره‌ی سفارش: <b dir="ltr">${r.no}</b></p>
        <ul>${r.items.map(i => `<li>${faNum(i.qty)} × ${i.name} <small>(${i.color} · ${i.size})</small></li>`).join('')}</ul>
        <dl class="sum"><dt>ارسال</dt><dd>${m.name} · ${m.eta}</dd><dt class="tot">مبلغ</dt><dd class="tot">${toman(r.totals.total)}</dd></dl>
        <p class="demo-pay">این یک سفارش نمایشی است؛ پرداختی انجام نشد و چیزی ارسال نمی‌شود.</p>
        <button class="btn btn-main wide" id="doneBtn">بازگشت به فروشگاه</button>
      </div>`, 'سفارش ثبت شد');
    $('#doneBtn').onclick = close;
    return r;
  }

  // ----- header badge + sticky cart bar -----
  function renderCount() {
    const n = C.count(), t = C.totals();
    $('#cartCount').hidden = !n; $('#cartCount').textContent = faNum(n);
    $('#stickyBtn').innerHTML = `مشاهده‌ی سبد (${faNum(n)}) · ${toman(t.sub)}`;
    $('#sticky').classList.toggle('on', n > 0);
  }
  C.onChange(renderCount);
  addEventListener('storage', e => e.key === C.KEY && renderCount());
  $('#cartBtn').onclick = openCart; $('#stickyBtn').onclick = openCart;

  renderGrid(); renderCount();
  window.__shop = { openProduct, openCart, openCheckout, close, setCat, renderGrid, submit, state, sel: () => sel, view: () => view,
    fill: v => { Object.assign(form, v); if (view === 'checkout') openCheckout(); }, form: () => form,
    setSearch: q => { $('#q').value = q; state.q = q; return renderGrid(); }, setSort: s => { $('#sort').value = s; state.sort = s; return renderGrid(); } };
})();

// Dev layer: only on local machines
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = '../dev/dev.js';
  s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-shop.js'; document.body.append(c); };
  document.head.append(s);
}
