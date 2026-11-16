// Admin: password gate (SHA-256 compare, client-side only), then three sections:
// bookings (filters, done/cancel/restore/delete) · services (name, price, duration) · weekly hours + breaks.
// Service/hour edits go through BarberEdits → this browser only; the booking page reads them, Store.slots follows them.
(() => {
  Store.seedDemo();
  $('#shopName').textContent = SHOP.name;
  const E = BarberEdits, K = OwnerKit, panel = $('#panel'), AUTH = 'barber.admin';
  E.noAutoReload = true;
  let sec = 'bookings', tab = 'today', draft = null, dirty = false, msg = { t: '', k: '' }, armed = '';
  const authed = () => { try { return sessionStorage.getItem(AUTH) === SHOP.adminHash; } catch { return false; } };
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const load = () => { draft = E.current(); dirty = false; armed = ''; };
  const todayKey = () => Store.dateKey(window.__now || new Date());

  // Upcoming active bookings that no longer fit hours `H` (closed day, outside hours, inside a break)
  function stranded(H = SHOP.hours) {
    return Store.load().filter(b => b.status === 'booked' && b.date >= todayKey()).filter(b => {
      const h = H[(Store.fromKey(b.date).getDay() + 1) % 7];
      return !h || b.start < toMin(h.open) || b.start + b.dur > toMin(h.close) || h.breaks.some(([x, y]) => b.start < toMin(y) && toMin(x) < b.start + b.dur);
    });
  }

  function login(err = '') {
    panel.innerHTML = `<form class="login view" id="lf">
      <h1>ورود مدیر</h1><p class="sub">برای دیدن نوبت‌ها و تغییر خدمات و ساعت کاری رمز را وارد کنید.</p>
      ${SHOP.demo ? '<p class="hint">نسخه‌ی نمایشی · رمز: ۱۲۳۴</p>' : ''}
      ${err ? `<p class="alert">${err}</p>` : ''}
      <label class="field"><span>رمز عبور</span><input id="pw" type="password" class="ltr" autocomplete="current-password" inputmode="numeric" required></label>
      <button class="btn">ورود</button></form>`;
    $('#pw').focus();
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const h = await K.sha($('#pw').value);
      if (h === SHOP.adminHash) { try { sessionStorage.setItem(AUTH, h); } catch {} render(); }
      else login('رمز اشتباه است');
    };
  }

  function bookingsView() {
    const all = Store.load().sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const today = todayKey();
    const active = all.filter(b => b.status !== 'cancelled');
    const todays = active.filter(b => b.date === today), upcoming = active.filter(b => b.date >= today);
    const list = { today: todays, upcoming, all }[tab];
    const income = todays.reduce((s, b) => s + b.price, 0);
    const off = new Set(stranded().map(b => b.id));
    const byDay = {}; list.forEach(b => (byDay[b.date] ||= []).push(b));
    return `<div class="stats">
        <div class="stat"><b>${faNum(todays.length)}</b><span>نوبت امروز</span></div>
        <div class="stat"><b>${faNum(upcoming.length)}</b><span>نوبت پیش‌رو</span></div>
        <div class="stat"><b>${faNum(Math.round(income / 1000))}</b><span>درآمد امروز (هزار تومان)</span></div>
      </div>
      <div class="tabs" role="tablist">${[['today', 'امروز'], ['upcoming', 'پیش‌رو'], ['all', 'همه']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${!list.length ? '<p class="none">نوبتی نیست.</p>' : Object.entries(byDay).map(([k, bs]) => `
        <div class="dayhead"><span>${k === today ? 'امروز · ' : ''}${fullDate(k)}</span><span>${faNum(bs.length)} نوبت</span></div>
        ${bs.map(b => `<div class="bk${b.status === 'done' ? ' done-st' : ''}" data-id="${b.id}">
          <div class="tm">${fmtTime(b.start)}<small>تا ${fmtTime(b.start + b.dur)}</small></div>
          <div class="who"><b>${esc(b.name)}</b>${b.status === 'cancelled' ? '<span class="tag">لغو شده</span>' : ''}${b.demo ? '<span class="tag d">نمونه</span>' : ''}${off.has(b.id) ? '<span class="tag w">خارج از ساعت کاری</span>' : ''}
            <span>${esc(service(b.service)?.name || b.service)} · ${faNum(b.price)} تومان</span><span class="ltr">${faDigits(b.phone)} · کد ${faDigits(b.code)}</span></div>
          <div class="acts">
            ${b.status === 'booked' ? `<button data-act="done" title="انجام شد" aria-label="انجام شد">✓</button><button data-act="cancel" title="لغو" aria-label="لغو">✕</button>` : ''}
            ${b.status !== 'booked' ? `<button data-act="restore" title="بازگردانی" aria-label="بازگردانی">↺</button>` : ''}
            <button data-act="del" title="حذف" aria-label="حذف">🗑</button>
          </div></div>`).join('')}`).join('')}
      <div class="row"><button class="btn ghost" id="logout">خروج</button>${SHOP.demo ? '<button class="btn ghost" id="reseed">بازنشانی نوبت‌های نمونه</button>' : ''}</div>`;
  }

  const durs = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
  const durLabel = m => m < 60 ? `${faNum(m)} دقیقه` : m % 60 ? `${faNum(Math.floor(m / 60))} ساعت و ${faNum(m % 60)} دقیقه` : `${faNum(m / 60)} ساعت`;
  const servicesView = () => `<p class="sub">قیمت و مدت هر خدمت را عوض کنید؛ صفحه‌ی رزرو و ساعت‌های خالی با همین‌ها حساب می‌شوند.</p>` +
    draft.services.map((s, i) => `<div class="ed" data-s="${i}">
      <div class="ed-h"><span class="ic">${s.icon}</span><label class="field"><span>نام خدمت</span><input data-f="name" value="${esc(s.name)}" maxlength="30"></label></div>
      <div class="ed-two"><label class="field"><span>قیمت (تومان)</span><input data-f="price" inputmode="numeric" value="${Number.isFinite(s.price) ? faNum(s.price) : ''}"></label>
        <label class="field"><span>مدت</span><select data-f="dur">${durs.map(d => `<option value="${d}"${d === s.dur ? ' selected' : ''}>${durLabel(d)}</option>`).join('')}</select></label></div>
      <label class="field"><span>توضیح کوتاه</span><input data-f="desc" value="${esc(s.desc)}" maxlength="80"></label>
    </div>`).join('');
  const times = Array.from({ length: 37 }, (_, i) => 360 + i * 30); // 06:00 … 24:00
  const sel = (attr, v) => `<select ${attr}>${times.map(m => `<option value="${hm(m)}"${hm(m) === v ? ' selected' : ''}>${fmtTime(m)}</option>`).join('')}</select>`;
  const hoursView = () => `<p class="sub">ساعت‌های خالی صفحه‌ی رزرو با همین برنامه ساخته می‌شوند. نوبت‌های گرفته‌شده سر جایشان می‌مانند.</p>` +
    E.days.map((n, d) => { const h = draft.hours[d];
      return `<div class="ed${h ? '' : ' closed'}" data-d="${d}">
        <div class="ed-h"><b>${n}</b><label class="sw"><input type="checkbox" data-h="on"${h ? ' checked' : ''} aria-label="${n} باز است"><span>${h ? 'باز' : 'تعطیل'}</span></label></div>
        ${h ? `<div class="ed-two"><label class="field"><span>شروع</span>${sel('data-h="open"', h.open)}</label><label class="field"><span>پایان</span>${sel('data-h="close"', h.close)}</label></div>
          ${h.breaks.map((b, bi) => `<div class="ed-brk" data-b="${bi}"><span>استراحت</span>${sel('data-bk="0" aria-label="شروع استراحت"', b[0])}<span>تا</span>${sel('data-bk="1" aria-label="پایان استراحت"', b[1])}<button type="button" class="x" data-act="delBreak" aria-label="حذف استراحت">×</button></div>`).join('')}
          ${h.breaks.length < 3 ? '<button type="button" class="add" data-act="addBreak">+ زمان استراحت</button>' : ''}` : ''}
      </div>`; }).join('');

  function render() {
    if (!authed()) return login();
    if (!draft) load();
    const edit = sec !== 'bookings';
    panel.innerHTML = `<div class="view">
      <div class="seg" role="tablist">${[['bookings', 'نوبت‌ها'], ['services', 'خدمات و قیمت'], ['hours', 'ساعت کاری']].map(([k, l]) => `<button role="tab" type="button" data-sec="${k}" aria-selected="${sec === k}">${l}</button>`).join('')}</div>
      ${edit ? '<p class="demo-note">نسخه‌ی نمایشی: تغییرات فقط در همین مرورگر ذخیره می‌شود و فقط خودتان آن را می‌بینید.</p>' : ''}
      ${edit && E.corrupt() ? '<p class="alert">تغییرات ذخیره‌شده‌ی قبلی خراب بود؛ نسخه‌ی نمایشی نشان داده می‌شود.</p>' : ''}
      ${sec === 'bookings' ? bookingsView() : sec === 'services' ? servicesView() : hoursView()}
      ${edit ? `<div class="row"><button class="btn ghost" id="resetEdits" type="button">بازگردانی نسخه‌ی نمایشی</button></div>
      <div class="bar"><p class="hint ${msg.k}" id="msg" role="status">${msg.t || (dirty ? 'تغییرات هنوز ذخیره نشده' : E.edited() ? 'نسخه‌ی ویرایش‌شده‌ی شما فعال است' : 'نسخه‌ی نمایشی اصلی')}</p>
        <button class="btn acc" id="saveEdits" type="button">ذخیره‌ی تغییرات</button></div>` : ''}
    </div>`;
  }
  const say = (t, k = '') => { msg = { t, k }; const m = $('#msg'); if (m) { m.className = 'hint ' + k; m.innerHTML = t; } };
  const touch = () => { dirty = true; armed = ''; say('تغییرات هنوز ذخیره نشده'); msg = { t: '', k: '' }; };

  panel.addEventListener('input', e => {
    const t = e.target;
    const s = t.closest('[data-s]'); if (s && t.dataset.f) { const v = draft.services[+s.dataset.s], f = t.dataset.f; v[f] = f === 'price' ? K.num(t.value) : f === 'dur' ? +t.value : t.value; return touch(); }
    const dEl = t.closest('[data-d]'); if (!dEl) return;
    const d = +dEl.dataset.d;
    if (t.dataset.h === 'on') { draft.hours[d] = t.checked ? { open: '10:00', close: '20:00', breaks: [] } : null; touch(); return render(); }
    const h = draft.hours[d]; if (!h) return;
    if (t.dataset.h) h[t.dataset.h] = t.value;
    if (t.dataset.bk) h.breaks[+t.closest('[data-b]').dataset.b][+t.dataset.bk] = t.value;
    touch();
  });
  panel.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !authed()) return;
    if (t.dataset.sec) { sec = t.dataset.sec; msg = { t: '', k: '' }; return render(); }
    if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
    if (t.id === 'logout') { try { sessionStorage.removeItem(AUTH); } catch {} return login(); }
    if (t.id === 'reseed') { if (confirm('همه‌ی نوبت‌ها پاک و نمونه‌ها دوباره ساخته شوند؟')) { Store.seedDemo(true); render(); } return; }
    if (t.id === 'saveEdits') return save();
    if (t.id === 'resetEdits') { // two taps instead of confirm()
      if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'مطمئنید؟ دوباره بزنید'; setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = 'بازگردانی نسخه‌ی نمایشی'; } }, 4000); return; }
      E.reset(); load(); msg = { t: 'خدمات و ساعت کاری نمایشی برگشت ✓', k: 'ok' }; return render();
    }
    const dEl = t.closest('[data-d]');
    if (t.dataset.act === 'addBreak' && dEl) { const h = draft.hours[+dEl.dataset.d], last = h.breaks.at(-1); const a = last ? toMin(last[1]) + 60 : Math.round((toMin(h.open) + toMin(h.close)) / 120) * 60; h.breaks.push([hm(a), hm(a + 30)]); touch(); return render(); }
    if (t.dataset.act === 'delBreak' && dEl) { draft.hours[+dEl.dataset.d].breaks.splice(+t.closest('[data-b]').dataset.b, 1); touch(); return render(); }
    const id = t.closest('.bk')?.dataset.id, act = t.dataset.act; if (!id) return;
    if (act === 'done') Store.update(id, { status: 'done' });
    if (act === 'cancel' && confirm('این نوبت لغو شود؟')) Store.update(id, { status: 'cancelled' });
    if (act === 'restore') {
      const all = Store.load(), b = all.find(x => x.id === id);
      const clash = all.some(x => x.id !== id && x.status !== 'cancelled' && x.date === b.date && x.start < b.start + b.dur && b.start < x.start + x.dur);
      if (clash) alert('این ساعت حالا نوبت دیگری دارد؛ بازگردانی ممکن نیست.'); else Store.update(id, { status: 'booked' });
    }
    if (act === 'del' && confirm('این نوبت برای همیشه حذف شود؟')) Store.remove(id);
    render();
  });
  function save() {
    const v = { services: draft.services.map(s => ({ ...s, name: (s.name || '').trim(), desc: (s.desc || '').trim(), price: Number.isFinite(s.price) ? s.price : null })), hours: draft.hours };
    const err = E.check(v); if (err) return say(err, 'err');
    const lost = stranded(v.hours);
    if (lost.length && armed !== 'save') { // warn once, second tap saves; booked customers keep their time
      armed = 'save';
      return say(`${faNum(lost.length)} نوبت پیش‌رو بیرون از ساعت‌های جدید می‌افتد (اولی: ${fullDate(lost[0].date)} ساعت ${fmtTime(lost[0].start)}). این نوبت‌ها سر جایشان می‌مانند و برچسب می‌خورند. برای ذخیره دوباره بزنید.`, 'err');
    }
    const e2 = E.save(v); if (e2) return say(e2, 'err');
    load(); msg = { t: 'ذخیره شد ✓ <a href="index.html">دیدن صفحه‌ی رزرو</a>', k: 'ok' }; render();
  }
  // Refresh when a booking is made in another tab
  addEventListener('storage', e => e.key === Store.KEY && sec === 'bookings' && render());
  render();

  window.__barberAdmin = { render, login, save, stranded, sha: K.sha, setTab: t => { sec = 'bookings'; tab = t; render(); }, setSec: s => { sec = s; render(); }, get draft() { return draft; } };
})();
