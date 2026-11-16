// Owner panel (demo): password gate, then edit menu items (name, description, price, category, tag, sold out, add/remove)
// and opening hours. Saves through CafeEdits → localStorage of this browser only; menu.html / index.html read it on load.
(() => {
  const E = CafeEdits, K = OwnerKit, panel = $('#panel'), AUTH = 'cafe.admin';
  E.noAutoReload = true; // keep unsaved edits here when another tab saves
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const authed = () => { try { return sessionStorage.getItem(AUTH) === CAFE.adminHash; } catch { return false; } };
  let view = 'menu', draft, dirty = false, msg = { t: '', k: '' }, seq = 0;
  const load = () => { draft = E.current(); dirty = false; };
  const closeLabel = h => h > 24 ? `${faHour(h)} بامداد` : faHour(h);

  function login(err = '') {
    panel.innerHTML = `<form class="ad-login" id="lf">
      <h1>ورود صاحب کافه</h1><p class="sub">منو، قیمت‌ها و ساعت کاری را خودتان تغییر دهید.</p>
      ${CAFE.demo ? '<p class="ad-hint">نسخه‌ی نمایشی · رمز: ۱۲۳۴</p>' : ''}
      ${err ? `<p class="ad-alert" role="alert">${err}</p>` : ''}
      <label class="ad-f"><span>رمز عبور</span><input id="pw" type="password" autocomplete="current-password" inputmode="numeric" required></label>
      <button class="btn btn-gold" style="width:100%;margin-top:14px">ورود</button></form>`;
    $('#pw').focus();
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const h = await K.sha($('#pw').value);
      if (h === CAFE.adminHash) { try { sessionStorage.setItem(AUTH, h); } catch {} load(); render(); } else login('رمز اشتباه است');
    };
  }

  const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  function menuView() {
    const cats = draft.categories;
    return cats.map((c, ci) => `<section class="ad-cat"><h2>${esc(c.name)}<small>${faNum(c.items.length)} آیتم</small></h2>
      ${c.items.length ? '' : '<p class="ad-none">این دسته فعلاً خالی است و در منو دیده نمی‌شود.</p>'}
      ${c.items.map((i, ii) => `<div class="ad-item${i.soldOut ? ' so' : ''}" data-c="${ci}" data-i="${ii}">
        <div class="ad-row"><label class="ad-f"><span>نام</span><input data-f="name" value="${esc(i.name)}" maxlength="40" placeholder="مثلاً لاته وانیل"></label>
          <label class="ad-f"><span>قیمت (تومان)</span><input data-f="price" value="${Number.isFinite(i.price) ? faNum(i.price) : ''}" inputmode="numeric" placeholder="مثلاً ۱۵۰٬۰۰۰"></label></div>
        <label class="ad-f"><span>توضیح کوتاه</span><input data-f="desc" value="${esc(i.desc)}" maxlength="120"></label>
        <div class="ad-two"><label class="ad-f"><span>دسته</span><select data-f="cat">${cats.map(x => opt(x.id, x.name, x.id === c.id)).join('')}</select></label>
          <label class="ad-f"><span>برچسب</span><select data-f="tag">${opt('', 'بدون برچسب', !i.tag)}${opt('محبوب', 'محبوب', i.tag === 'محبوب')}${opt('جدید', 'جدید', i.tag === 'جدید')}</select></label></div>
        <div class="ad-acts"><label class="ad-sw out"><input type="checkbox" data-f="soldOut"${i.soldOut ? ' checked' : ''}>تمام شد</label>
          <button class="ad-del" data-act="del" type="button">حذف</button></div>
      </div>`).join('')}
      <button class="ad-add" data-act="add" data-c="${ci}" type="button">+ افزودن به ${esc(c.name)}</button></section>`).join('');
  }
  function hoursView() {
    return `<p class="sub" style="margin-top:14px">وضعیت «باز است / بسته است» سایت با همین ساعت‌ها (به وقت تهران) حساب می‌شود. برای کار تا بعد از نیمه‌شب، ساعت بامداد را انتخاب کنید.</p>` +
      CAFE.dayNames.map((n, d) => {
        const h = draft.hours.find(x => x.day === d), o = h?.open ?? 8, c = h?.close ?? 23;
        return `<div class="ad-day${h ? '' : ' off'}" data-d="${d}">
          <div class="h"><b>${n}</b><label class="ad-sw open"><input type="checkbox" data-h="on"${h ? ' checked' : ''} aria-label="${n} باز است">باز</label></div>
          <div class="ad-two"><label class="ad-f"><span>از ساعت</span><select data-h="open"${h ? '' : ' disabled'}>${Array.from({ length: 24 }, (_, x) => opt(x, faHour(x), x === o)).join('')}</select></label>
            <label class="ad-f"><span>تا ساعت</span><select data-h="close"${h ? '' : ' disabled'}>${Array.from({ length: 28 }, (_, x) => opt(x + 1, closeLabel(x + 1), x + 1 === c)).join('')}</select></label></div>
        </div>`;
      }).join('');
  }

  function render() {
    if (!authed()) return login();
    if (!draft) load();
    panel.innerHTML = `<h1>پنل مدیریت کافه</h1>
      ${E.corrupt() ? '<p class="ad-alert">تغییرات ذخیره‌شده‌ی قبلی خراب بود؛ نسخه‌ی نمایشی نشان داده می‌شود.</p>' : ''}
      <div class="ad-tabs" role="tablist">${[['menu', 'منو و قیمت‌ها'], ['hours', 'ساعت کاری']].map(([k, l]) => `<button role="tab" type="button" data-view="${k}" aria-selected="${view === k}">${l}</button>`).join('')}</div>
      ${view === 'menu' ? menuView() : hoursView()}
      <div class="ad-foot"><button class="btn btn-ghost" id="reset" type="button">بازگردانی نسخه‌ی نمایشی</button><button class="btn btn-ghost" id="logout" type="button">خروج</button></div>
      <div class="ad-bar"><div class="in"><p class="ad-msg ${msg.k}" id="msg" role="status">${msg.t || (dirty ? 'تغییرات هنوز ذخیره نشده' : E.edited() ? 'نسخه‌ی ویرایش‌شده‌ی شما فعال است' : 'نسخه‌ی نمایشی اصلی')}</p>
        <button class="btn btn-gold" id="save" type="button">ذخیره‌ی تغییرات</button></div></div>`;
  }
  const say = (t, k = '') => { msg = { t, k }; const m = $('#msg'); if (m) { m.className = 'ad-msg ' + k; m.innerHTML = t; } };
  const touch = () => { dirty = true; say('تغییرات هنوز ذخیره نشده'); msg = { t: '', k: '' }; };
  const itemOf = el => { const r = el.closest('.ad-item'); return r && draft.categories[+r.dataset.c].items[+r.dataset.i]; };

  panel.addEventListener('input', e => {
    const f = e.target.dataset.f, h = e.target.dataset.h;
    if (f && ['name', 'desc', 'price'].includes(f)) { itemOf(e.target)[f] = f === 'price' ? K.num(e.target.value) : e.target.value; touch(); }
    if (h) { // hours
      const d = +e.target.closest('.ad-day').dataset.d, card = e.target.closest('.ad-day');
      if (h === 'on') {
        if (e.target.checked) draft.hours.push({ day: d, open: +$('[data-h=open]', card).value, close: +$('[data-h=close]', card).value });
        else draft.hours = draft.hours.filter(x => x.day !== d);
        card.classList.toggle('off', !e.target.checked); $$('select', card).forEach(s => { s.disabled = !e.target.checked; });
      } else { const x = draft.hours.find(x => x.day === d); if (x) x[h] = +e.target.value; }
      touch();
    }
  });
  panel.addEventListener('change', e => {
    const f = e.target.dataset.f; if (!f || !['cat', 'tag', 'soldOut'].includes(f)) return;
    const i = itemOf(e.target), r = e.target.closest('.ad-item');
    if (f === 'tag') i.tag = e.target.value;
    if (f === 'soldOut') { i.soldOut = e.target.checked; r.classList.toggle('so', i.soldOut); }
    if (f === 'cat') { // move to the other category (keeps its picture)
      draft.categories[+r.dataset.c].items.splice(+r.dataset.i, 1);
      draft.categories.find(c => c.id === e.target.value).items.push(i); touch(); return render();
    }
    touch();
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !authed()) return;
    if (b.dataset.view) { view = b.dataset.view; return render(); }
    if (b.dataset.act === 'add') {
      const c = draft.categories[+b.dataset.c];
      c.items.push({ id: 'n' + Date.now().toString(36) + (++seq), name: '', desc: '', price: NaN, img: `img/new-${c.id}.svg` });
      touch(); render(); const rows = $$(`.ad-item[data-c="${b.dataset.c}"]`); rows.at(-1)?.querySelector('input')?.focus(); return;
    }
    if (b.dataset.act === 'del') { const r = b.closest('.ad-item'); draft.categories[+r.dataset.c].items.splice(+r.dataset.i, 1); touch(); return render(); }
    if (b.id === 'save') return save();
    if (b.id === 'reset') { // two taps instead of confirm() (works the same on every phone)
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'مطمئنید؟ دوباره بزنید'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'بازگردانی نسخه‌ی نمایشی'; } }, 4000); return; }
      E.reset(); load(); msg = { t: 'نسخه‌ی نمایشی اصلی برگشت ✓', k: 'ok' }; return render();
    }
    if (b.id === 'logout') { try { sessionStorage.removeItem(AUTH); } catch {} draft = null; return login(); }
  });
  function save() {
    const v = { categories: draft.categories.map(c => ({ ...c, items: c.items.map(({ cat, ...i }) => ({ ...i, name: (i.name || '').trim(), desc: (i.desc || '').trim(), price: Number.isFinite(i.price) ? i.price : null })) })), hours: draft.hours };
    const err = E.save(v);
    if (err) return say(err, 'err');
    load(); msg = { t: 'ذخیره شد ✓ <a href="menu.html">دیدن منو</a>', k: 'ok' }; render();
  }

  render();
  window.__cafeAdmin = { render, login, save, get draft() { return draft; }, setView: v => { view = v; render(); } }; // dev hooks
})();
