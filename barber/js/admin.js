// Admin: password gate (SHA-256 compare, client-side only), bookings list with filters, done/cancel/delete
(() => {
  Store.seedDemo();
  $('#shopName').textContent = SHOP.name;
  const panel = $('#panel'), AUTH = 'barber.admin';
  let tab = 'today';
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const authed = () => { try { return sessionStorage.getItem(AUTH) === SHOP.adminHash; } catch { return false; } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function login(err = '') {
    panel.innerHTML = `<form class="login view" id="lf">
      <h1>ورود مدیر</h1><p class="sub">برای دیدن نوبت‌ها رمز را وارد کنید.</p>
      ${SHOP.demo ? '<p class="hint">نسخه‌ی نمایشی · رمز: ۱۲۳۴</p>' : ''}
      ${err ? `<p class="alert">${err}</p>` : ''}
      <label class="field"><span>رمز عبور</span><input id="pw" type="password" class="ltr" autocomplete="current-password" inputmode="numeric" required></label>
      <button class="btn">ورود</button></form>`;
    $('#pw').focus();
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const h = await sha(enDigits($('#pw').value.trim()));
      if (h === SHOP.adminHash) { try { sessionStorage.setItem(AUTH, h); } catch {} render(); }
      else login('رمز اشتباه است');
    };
  }

  function render() {
    if (!authed()) return login();
    const all = Store.load().sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const today = Store.dateKey(window.__now || new Date());
    const active = all.filter(b => b.status !== 'cancelled');
    const todays = active.filter(b => b.date === today), upcoming = active.filter(b => b.date >= today);
    const list = { today: todays, upcoming, all }[tab];
    const income = todays.reduce((s, b) => s + b.price, 0);

    const byDay = {}; list.forEach(b => (byDay[b.date] ||= []).push(b));
    panel.innerHTML = `<div class="view">
      <div class="stats">
        <div class="stat"><b>${faNum(todays.length)}</b><span>نوبت امروز</span></div>
        <div class="stat"><b>${faNum(upcoming.length)}</b><span>نوبت پیش‌رو</span></div>
        <div class="stat"><b>${faNum(Math.round(income / 1000))}</b><span>درآمد امروز (هزار تومان)</span></div>
      </div>
      <div class="tabs" role="tablist">${[['today', 'امروز'], ['upcoming', 'پیش‌رو'], ['all', 'همه']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${!list.length ? '<p class="none">نوبتی نیست.</p>' : Object.entries(byDay).map(([k, bs]) => `
        <div class="dayhead"><span>${k === today ? 'امروز · ' : ''}${fullDate(k)}</span><span>${faNum(bs.length)} نوبت</span></div>
        ${bs.map(b => `<div class="bk${b.status === 'done' ? ' done-st' : ''}" data-id="${b.id}">
          <div class="tm">${fmtTime(b.start)}<small>تا ${fmtTime(b.start + b.dur)}</small></div>
          <div class="who"><b>${esc(b.name)}</b>${b.status === 'cancelled' ? '<span class="tag">لغو شده</span>' : ''}${b.demo ? '<span class="tag d">نمونه</span>' : ''}
            <span>${service(b.service)?.name || b.service} · ${faNum(b.price)} تومان</span><span class="ltr">${faDigits(b.phone)} · کد ${faDigits(b.code)}</span></div>
          <div class="acts">
            ${b.status === 'booked' ? `<button data-act="done" title="انجام شد" aria-label="انجام شد">✓</button><button data-act="cancel" title="لغو" aria-label="لغو">✕</button>` : ''}
            ${b.status !== 'booked' ? `<button data-act="restore" title="بازگردانی" aria-label="بازگردانی">↺</button>` : ''}
            <button data-act="del" title="حذف" aria-label="حذف">🗑</button>
          </div></div>`).join('')}`).join('')}
      <div class="row"><button class="btn ghost" id="logout">خروج</button>${SHOP.demo ? '<button class="btn ghost" id="reseed">بازنشانی نمونه‌ها</button>' : ''}</div>
    </div>`;
  }

  panel.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !authed()) return;
    if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
    if (t.id === 'logout') { try { sessionStorage.removeItem(AUTH); } catch {} return login(); }
    if (t.id === 'reseed') { if (confirm('همه‌ی نوبت‌ها پاک و نمونه‌ها دوباره ساخته شوند؟')) { Store.seedDemo(true); render(); } return; }
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
  // Refresh when a booking is made in another tab
  addEventListener('storage', e => e.key === Store.KEY && render());
  render();

  window.__barberAdmin = { render, login, sha, setTab: t => { tab = t; render(); } };
})();
