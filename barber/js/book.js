// Booking flow: 1 service → 2 day → 3 time → 4 name/phone → 5 confirm → done
(() => {
  Store.seedDemo();
  $('#shopName').textContent = SHOP.name; $('#shopTag').textContent = SHOP.tagline; $('#addr').textContent = SHOP.address;

  const S = { step: 1, service: null, date: null, start: null, name: '', phone: '', error: '', booking: null };
  const panel = $('#panel'), next = $('#next'), hint = $('#hint');
  const price = p => `${faNum(p)} تومان`;
  const dur = m => m >= 60 ? `${faNum(m / 60)} ساعت`.replace('۱٫۵ ساعت', 'یک‌ونیم ساعت') : `${faNum(m)} دقیقه`;
  const back = `<button class="back" data-back>→ مرحله‌ی قبل</button>`;

  const views = {
    1: () => `<h1>چه خدمتی می‌خواهید؟</h1><p class="sub">یک خدمت انتخاب کنید.</p>
      <div class="svcs">${SHOP.services.map(s => `
        <button class="svc${S.service === s.id ? ' on' : ''}" data-svc="${s.id}" aria-pressed="${S.service === s.id}">
          ${s.popular ? '<span class="pop">پرطرفدار</span>' : ''}<span class="ic">${s.icon}</span>
          <span class="t"><b>${s.name}</b><span>${s.desc}</span></span>
          <span class="pr">${faNum(s.price)}<small>${dur(s.dur)}</small></span>
        </button>`).join('')}</div>`,
    2: () => {
      const s = service(S.service);
      return `${back}<h1>چه روزی؟</h1><p class="sub">${s.name} · ${dur(s.dur)}</p>
      <div class="days">${Store.days().map(k => {
        const L = dayLabel(k), n = Store.slots(k, s.dur).length, closed = !Store.hoursFor(k);
        return `<button class="day${S.date === k ? ' on' : ''}" data-day="${k}" ${closed || !n ? 'disabled' : ''} aria-label="${fullDate(k)}">
          <span class="wd">${k === Store.days()[0] ? 'امروز' : L.wd}</span><span class="d">${L.d}</span><span class="m">${L.m}</span>
          <span class="cnt">${closed ? 'تعطیل' : n ? faNum(n) + ' نوبت' : 'پر'}</span></button>`;
      }).join('')}</div>`;
    },
    3: () => {
      const s = service(S.service), g = Store.grid(S.date, s.dur);
      const btn = x => x.state === 'break' ? `<button class="time brk" disabled>☕ استراحت</button>`
        : `<button class="time${S.start === x.t ? ' on' : ''}" data-time="${x.t}" ${x.state !== 'free' ? 'disabled aria-label="رزرو شده"' : ''}>${fmtTime(x.t)}</button>`;
      const am = g.filter(x => x.t < 14 * 60), pm = g.filter(x => x.t >= 14 * 60);
      return `${back}<h1>چه ساعتی؟</h1><p class="sub">${fullDate(S.date)} · ${s.name}</p>
      ${!g.some(x => x.state === 'free') ? '<p class="none">برای این روز ساعت خالی نمانده.</p>' : ''}
      ${am.length ? `<div class="tgroup"><h3>صبح و ظهر</h3><div class="times">${am.map(btn).join('')}</div></div>` : ''}
      ${pm.length ? `<div class="tgroup"><h3>عصر</h3><div class="times">${pm.map(btn).join('')}</div></div>` : ''}`;
    },
    4: () => `${back}<h1>اطلاعات شما</h1><p class="sub">برای یادآوری نوبت لازم است.</p>
      <label class="field" id="fName"><span>نام و نام خانوادگی</span><input id="name" autocomplete="name" value="${S.name.replace(/"/g, '&quot;')}" placeholder="مثلاً علی محمدی"><em></em></label>
      <label class="field" id="fPhone"><span>شماره موبایل</span><input id="phone" class="ltr" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" value="${S.phone}" placeholder="۰۹۱۲۳۴۵۶۷۸۹"><em></em></label>`,
    5: () => {
      const s = service(S.service);
      return `${back}<h1>تأیید نوبت</h1><p class="sub">اطلاعات را بررسی کنید.</p>
      ${S.error ? `<p class="alert">${S.error}</p>` : ''}
      <dl class="sum">
        <div><dt>خدمت</dt><dd>${s.name}</dd></div>
        <div><dt>روز</dt><dd>${fullDate(S.date)}</dd></div>
        <div><dt>ساعت</dt><dd>${fmtTime(S.start)} تا ${fmtTime(S.start + s.dur)}</dd></div>
        <div><dt>نام</dt><dd>${esc(S.name)}</dd></div>
        <div><dt>موبایل</dt><dd class="ltr">${faDigits(Store.cleanPhone(S.phone))}</dd></div>
        <div class="total"><dt>مبلغ (پرداخت در محل)</dt><dd>${price(s.price)}</dd></div>
      </dl>`;
    },
    6: () => {
      const b = S.booking, s = service(b.service);
      return `<div class="done"><div class="ok">✓</div><h1>نوبت شما ثبت شد</h1>
        <p class="sub" style="margin:4px 0 0">${fullDate(b.date)}، ساعت ${fmtTime(b.start)} · ${s.name}</p>
        <div class="code">${faDigits(b.code)}</div><p class="sub">کد پیگیری · لطفاً ۵ دقیقه زودتر بیایید.</p></div>`;
    },
  };
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const canNext = () => ({ 1: !!S.service, 2: !!S.date, 3: S.start != null, 4: S.name.trim().length >= 2 && Store.validPhone(S.phone), 5: true, 6: true })[S.step];
  const nextLabel = () => ({ 4: 'مرور و تأیید', 5: 'ثبت نوبت', 6: 'رزرو نوبت جدید' })[S.step] || 'ادامه';
  const hintText = () => {
    const s = S.service && service(S.service);
    if (S.step === 1) return s ? `${s.name} · ${price(s.price)}` : 'یک خدمت را انتخاب کنید';
    if (S.step === 3) return S.start != null ? `${fullDate(S.date)} · ساعت ${fmtTime(S.start)}` : 'یک ساعت خالی انتخاب کنید';
    if (S.step === 5) return 'پرداخت حضوری · لغو رایگان تا ۲ ساعت قبل';
    return '';
  };

  function render(focus = true) {
    panel.innerHTML = `<div class="view">${views[S.step]()}</div>`;
    $$('#steps i').forEach((el, i) => el.classList.toggle('on', i < Math.min(S.step, 5)));
    next.disabled = !canNext(); next.textContent = nextLabel(); next.classList.toggle('acc', S.step === 5); hint.textContent = hintText();
    if (S.step === 4) bindForm();
    if (focus) panel.querySelector('h1')?.setAttribute('tabindex', '-1');
    if (S.step === 2) panel.querySelector('.day.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function go(step, push = true) {
    S.step = step; S.error = '';
    if (push) history.pushState({ step }, '', '');
    render(); scrollTo({ top: 0 });
  }
  addEventListener('popstate', e => { const st = e.state?.step || 1; if (S.step === 6) { reset(); return; } S.step = Math.min(st, maxStep()); render(); });
  const maxStep = () => !S.service ? 1 : !S.date ? 2 : S.start == null ? 3 : 5;
  function reset() { Object.assign(S, { step: 1, service: null, date: null, start: null, error: '', booking: null }); history.replaceState({ step: 1 }, '', ''); render(); }
  history.replaceState({ step: 1 }, '', '');

  function bindForm() {
    const n = $('#name'), p = $('#phone');
    const upd = () => {
      S.name = n.value; S.phone = p.value;
      const pe = p.value && Store.cleanPhone(p.value).length >= 11 && !Store.validPhone(p.value);
      $('#fPhone').classList.toggle('err', pe); $('#fPhone em').textContent = pe ? 'شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد' : '';
      next.disabled = !canNext();
    };
    n.oninput = p.oninput = upd; upd();
  }

  panel.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.back != null) { history.back(); return; }
    if (t.dataset.svc) { if (S.service !== t.dataset.svc) { S.date = null; S.start = null; } S.service = t.dataset.svc; render(false); setTimeout(() => go(2), 180); }
    if (t.dataset.day) { if (S.date !== t.dataset.day) S.start = null; S.date = t.dataset.day; render(false); setTimeout(() => go(3), 180); }
    if (t.dataset.time) { S.start = +t.dataset.time; render(false); }
  });
  next.onclick = () => {
    if (S.step === 6) return reset();
    if (S.step === 5) {
      const r = Store.add({ service: S.service, date: S.date, start: S.start, name: S.name, phone: S.phone });
      if (!r.ok) { S.error = r.error; if (/ساعت/.test(r.error)) { S.start = null; go(3); S.error = r.error; hint.textContent = r.error; } else render(); return; }
      S.booking = r.booking; S.name = ''; S.phone = ''; go(6); return;
    }
    if (canNext()) go(S.step + 1);
  };
  render();

  window.__barber = { S, render, go, reset }; // dev hooks
})();
