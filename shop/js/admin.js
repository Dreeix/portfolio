// Owner panel (demo): password gate, then edit products (name, price, discount, category, colours, sizes, sold-out sizes,
// add/remove) and shipping costs + free-shipping threshold. Saves through ShopEdits → this browser only; the store reads it on load.
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const E = ShopEdits, K = OwnerKit, S = SHOP, panel = $('#panel'), AUTH = 'shop.admin', FREE = 'فری‌سایز';
  E.noAutoReload = true;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fa = K.fa, money = n => Number.isFinite(n) ? fa(n) : '';
  const authed = () => { try { return sessionStorage.getItem(AUTH) === S.adminHash; } catch { return false; } };
  const catName = Object.fromEntries(S.categories.map(c => [c.id, c.name]));
  const catImg = cat => `img/${E.defaults().products.find(p => p.cat === cat)?.id || E.defaults().products[0].id}.svg`;
  const imgOf = p => p.img || `img/${p.id}.svg`;
  let view = 'products', draft, dirty = false, msg = { t: '', k: '' }, openId = '', seq = 0;
  const load = () => { draft = E.current(); dirty = false; };

  function login(err = '') {
    panel.innerHTML = `<form class="ad-login" id="lf">
      <h1>ورود صاحب فروشگاه</h1><p class="sub">محصولات، قیمت‌ها و هزینه‌ی ارسال را خودتان تغییر دهید.</p>
      ${S.demo ? '<p class="ad-hint">نسخه‌ی نمایشی · رمز: ۱۲۳۴</p>' : ''}
      ${err ? `<p class="ad-alert" role="alert">${err}</p>` : ''}
      <label class="f"><span>رمز عبور</span><input id="pw" type="password" autocomplete="current-password" inputmode="numeric" required></label>
      <button class="btn btn-main wide">ورود</button></form>`;
    $('#pw').focus();
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const h = await K.sha($('#pw').value);
      if (h === S.adminHash) { try { sessionStorage.setItem(AUTH, h); } catch {} load(); render(); } else login('رمز اشتباه است');
    };
  }

  const status = p => !p.sizes.some(s => !(p.soldOut || []).includes(s)) ? '<span class="st out">ناموجود</span>' : p.off ? `<span class="st off">٪${fa(Math.round(p.off * 100))}</span>` : p.isNew ? '<span class="st">جدید</span>' : '';
  function productCard(p, i) {
    const sizes = S.sizeOrder.filter(s => p.sizes.includes(s));
    return `<details class="ad-p" data-p="${i}"${p.id === openId ? ' open' : ''}>
      <summary><img src="${imgOf(p)}" alt="" width="44" height="55"><span class="t"><b>${esc(p.name) || 'محصول بی‌نام'}</b><small>${catName[p.cat]} · ${Number.isFinite(p.price) ? fa(p.price) + ' تومان' : 'بدون قیمت'}</small></span>${status(p)}</summary>
      <div class="ad-b">
        <label class="f"><span>نام محصول</span><input data-f="name" value="${esc(p.name)}" maxlength="50"></label>
        <div class="ad-two"><label class="f"><span>قیمت (تومان)</span><input data-f="price" inputmode="numeric" value="${money(p.price)}" placeholder="مثلاً ۹۹۰٬۰۰۰"></label>
          <label class="f"><span>تخفیف (درصد)</span><input data-f="off" inputmode="numeric" value="${p.off ? fa(Math.round(p.off * 100)) : ''}" placeholder="بدون تخفیف"></label></div>
        <div class="ad-two"><label class="f"><span>دسته</span><select data-f="cat">${S.categories.map(c => `<option value="${c.id}"${c.id === p.cat ? ' selected' : ''}>${c.name}</option>`).join('')}</select></label>
          <label class="f"><span>جنس</span><input data-f="material" value="${esc(p.material)}" maxlength="60"></label></div>
        <label class="f"><span>توضیح</span><input data-f="desc" value="${esc(p.desc)}" maxlength="300"></label>
        <h4>رنگ‌ها</h4>
        ${p.colors.map((c, ci) => `<div class="ad-col" data-ci="${ci}"><input type="color" data-cf="hex" value="${esc(c.hex)}" aria-label="رنگ ${esc(c.name)}">
          <label class="f"><input data-cf="name" value="${esc(c.name)}" maxlength="20" aria-label="نام رنگ" placeholder="نام رنگ"></label>
          <button type="button" class="ad-x" data-act="delColor" aria-label="حذف رنگ ${esc(c.name)}">×</button></div>`).join('')}
        <button type="button" class="ad-link" data-act="addColor">+ رنگ دیگر</button>
        <h4>سایزها</h4>
        <div class="ad-chips">${S.sizeOrder.map(s => `<button type="button" data-size="${s}" aria-pressed="${p.sizes.includes(s)}">${s}</button>`).join('')}</div>
        <h4>تمام‌شده <small>(سایزی که فعلاً موجود نیست را بزنید)</small></h4>
        <div class="ad-chips so">${sizes.map(s => `<button type="button" data-sold="${s}" aria-pressed="${(p.soldOut || []).includes(s)}">${s}</button>`).join('')}</div>
        <button type="button" class="ad-del" data-act="delProduct">حذف این محصول</button>
      </div></details>`;
  }
  const productsView = () => `<button type="button" class="ad-add" data-act="addProduct">+ افزودن محصول جدید</button>` + draft.products.map(productCard).join('');
  const shipView = () => `<div class="ad-card">${draft.shipping.map((m, i) => `<label class="f"><span>هزینه‌ی ${esc(m.name)} (تومان)</span><input data-ship="${i}" inputmode="numeric" value="${money(m.price)}"></label>`).join('')}
      <p>۰ یعنی این روش ارسال همیشه رایگان است.</p></div>
    <div class="ad-card"><label class="f"><span>ارسال پستی رایگان برای خرید بالای (تومان)</span><input id="freeFrom" inputmode="numeric" value="${money(draft.freeShipFrom)}"></label>
      <p>سبد خرید و صورت‌حساب با همین عددها حساب می‌شود. ۰ یعنی ارسال پستی برای همه رایگان است.</p></div>`;

  function render() {
    if (!authed()) return login();
    if (!draft) load();
    panel.innerHTML = `<h1>پنل مدیریت فروشگاه</h1>
      ${E.corrupt() ? '<p class="ad-alert">تغییرات ذخیره‌شده‌ی قبلی خراب بود؛ نسخه‌ی نمایشی نشان داده می‌شود.</p>' : ''}
      <div class="ad-tabs" role="tablist">${[['products', `محصولات (${fa(draft.products.length)})`], ['ship', 'هزینه‌ی ارسال']].map(([k, l]) => `<button role="tab" type="button" data-view="${k}" aria-selected="${view === k}">${l}</button>`).join('')}</div>
      ${view === 'products' ? productsView() : shipView()}
      <div class="ad-foot"><button class="btn" id="reset" type="button">بازگردانی نسخه‌ی نمایشی</button><button class="btn" id="logout" type="button">خروج</button></div>
      <div class="ad-bar"><div class="in"><p class="ad-msg ${msg.k}" id="msg" role="status">${msg.t || (dirty ? 'تغییرات هنوز ذخیره نشده' : E.edited() ? 'نسخه‌ی ویرایش‌شده‌ی شما فعال است' : 'نسخه‌ی نمایشی اصلی')}</p>
        <button class="btn btn-main" id="save" type="button">ذخیره</button></div></div>`;
  }
  const say = (t, k = '') => { msg = { t, k }; const m = $('#msg'); if (m) { m.className = 'ad-msg ' + k; m.innerHTML = t; } };
  const touch = () => { dirty = true; say('تغییرات هنوز ذخیره نشده'); msg = { t: '', k: '' }; };
  const prodOf = el => { const d = el.closest('.ad-p'); return d && draft.products[+d.dataset.p]; };
  const rerender = p => { openId = p?.id || ''; render(); };

  panel.addEventListener('input', e => {
    const t = e.target, p = prodOf(t);
    if (t.dataset.f && p) {
      const f = t.dataset.f;
      if (f === 'price') p.price = K.num(t.value);
      else if (f === 'off') { const n = K.num(t.value); if (!t.value.trim() || n === 0) delete p.off; else p.off = Number.isFinite(n) ? n / 100 : NaN; }
      else if (f === 'cat') { p.cat = t.value; if (p.img) p.img = catImg(p.cat); return touch(), rerender(p); }
      else p[f] = t.value;
      return touch();
    }
    if (t.dataset.cf && p) { const c = p.colors[+t.closest('.ad-col').dataset.ci]; c[t.dataset.cf] = t.value; return touch(); }
    if (t.dataset.ship) { draft.shipping[+t.dataset.ship].price = K.num(t.value); return touch(); }
    if (t.id === 'freeFrom') { draft.freeShipFrom = K.num(t.value); return touch(); }
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !authed()) return;
    const p = prodOf(b);
    if (b.dataset.view) { view = b.dataset.view; openId = ''; return render(); }
    if (b.dataset.size && p) {
      const s = b.dataset.size, on = p.sizes.includes(s);
      if (on && p.sizes.length === 1) return say('دست‌کم یک سایز لازم است', 'err');
      p.sizes = on ? p.sizes.filter(x => x !== s) : s === FREE ? [FREE] : [...p.sizes.filter(x => x !== FREE), s];
      p.soldOut = (p.soldOut || []).filter(x => p.sizes.includes(x));
      return touch(), rerender(p);
    }
    if (b.dataset.sold && p) { const s = b.dataset.sold, so = p.soldOut || []; p.soldOut = so.includes(s) ? so.filter(x => x !== s) : [...so, s]; return touch(), rerender(p); }
    const act = b.dataset.act;
    if (act === 'addColor' && p) { if (p.colors.length >= 8) return say('حداکثر ۸ رنگ', 'err'); p.colors.push({ name: '', hex: '#cdbff7' }); touch(); rerender(p); $$(`.ad-p[data-p="${draft.products.indexOf(p)}"] [data-cf=name]`).at(-1)?.focus(); return; }
    if (act === 'delColor' && p) { if (p.colors.length === 1) return say('دست‌کم یک رنگ لازم است', 'err'); p.colors.splice(+b.closest('.ad-col').dataset.ci, 1); return touch(), rerender(p); }
    if (act === 'delProduct' && p) { draft.products.splice(draft.products.indexOf(p), 1); return touch(), rerender(); }
    if (act === 'addProduct') {
      const cat = S.categories[0].id, np = { id: 'p' + Date.now().toString(36) + (++seq), cat, name: '', price: NaN, isNew: true, img: catImg(cat),
        colors: [{ name: 'سفید', hex: '#fbf8f4' }], sizes: ['S', 'M', 'L'], soldOut: [], material: '', desc: '' };
      draft.products.unshift(np); touch(); rerender(np); $('.ad-p[open] [data-f=name]')?.focus(); return;
    }
    if (b.id === 'save') return save();
    if (b.id === 'reset') { // two taps instead of confirm()
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'مطمئنید؟ دوباره بزنید'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'بازگردانی نسخه‌ی نمایشی'; } }, 4000); return; }
      E.reset(); load(); openId = ''; msg = { t: 'نسخه‌ی نمایشی اصلی برگشت ✓', k: 'ok' }; return render();
    }
    if (b.id === 'logout') { try { sessionStorage.removeItem(AUTH); } catch {} draft = null; return login(); }
  });
  panel.addEventListener('toggle', e => { if (e.target.open) openId = prodOf(e.target)?.id || ''; }, true);
  function save() {
    const clean = draft.products.map(p => ({ ...p, name: (p.name || '').trim(), desc: (p.desc || '').trim(), material: (p.material || '').trim(),
      price: Number.isFinite(p.price) ? p.price : null, colors: p.colors.map(c => ({ name: (c.name || '').trim(), hex: c.hex })) }));
    const bad = clean.find(p => Number.isNaN(p.off)); if (bad) return say(`«${bad.name}»: تخفیف را به عدد بنویسید`, 'err');
    const err = E.save({ products: clean, shipping: draft.shipping.map(m => ({ ...m, price: Number.isFinite(m.price) ? m.price : null })), freeShipFrom: Number.isFinite(draft.freeShipFrom) ? draft.freeShipFrom : null });
    if (err) return say(err, 'err');
    load(); msg = { t: 'ذخیره شد ✓ <a href="index.html">دیدن فروشگاه</a>', k: 'ok' }; render();
  }

  render();
  window.__shopAdmin = { render, login, save, get draft() { return draft; }, setView: v => { view = v; render(); }, open: id => { openId = id; render(); } }; // dev hooks
})();

// Dev layer: only on local machines
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = '../dev/dev.js';
  s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-shop.js'; document.body.append(c); };
  document.head.append(s);
}
