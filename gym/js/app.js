// Gym landing: renders everything from GYM data, pricing toggle, before/after sliders, booking sheet
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const faNum = n => Number(n).toLocaleString('fa-IR');

// Price for a plan over `months` (1 or 3), 3-month gets discount, rounded to 1000 toman
const priceFor = (plan, months) => months === 1 ? plan.price : Math.round(plan.price * 3 * (1 - GYM.quarterDiscount) / 1000) * 1000;
const waLink = text => `https://wa.me/${GYM.whatsapp}?text=${encodeURIComponent(text)}`;
const tgLink = () => `https://t.me/${GYM.telegram}`;
let months = 1;

(() => {
  const G = GYM;
  $('#stats').innerHTML = G.stats.map(s => `<div class="stat"><b data-count="${s.n}" data-suffix="${s.suffix}">${faNum(0)}</b><span>${s.label}</span></div>`).join('');
  const words = ['تمرین اصولی', 'تغذیه‌ی درست', 'پیگیری هفتگی', 'نتیجه‌ی واقعی', 'بدون بهانه'];
  $('#strip').innerHTML = [...words, ...words, ...words, ...words].map(w => `<span>${w} ✦</span>`).join('');
  $('#coachName').textContent = G.coach; $('#coachTitle').textContent = G.title;
  $('#bio').textContent = G.bio;
  $('#certs').innerHTML = G.certs.map(c => `<li>${c}</li>`).join('');
  $('#discLbl').textContent = `٪${faNum(G.quarterDiscount * 100)} تخفیف`;

  function renderPlans() {
    $('#planList').innerHTML = G.plans.map(p => {
      const now = priceFor(p, months), full = p.price * months;
      return `<article class="plan rv in${p.popular ? ' pop' : ''}">
        ${p.popular ? '<span class="badge">🔥 محبوب‌ترین</span>' : ''}
        <h3>${p.name}</h3><p class="d">${p.desc}</p>
        <div class="old">${months > 1 ? faNum(full) + ' تومان' : ''}</div>
        <div class="p">${faNum(now)}<small>تومان / ${months > 1 ? 'سه ماه' : 'ماه'}</small></div>
        <ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <button class="btn ${p.popular ? 'btn-lime' : 'btn-line'}" data-book="${p.id}">رزرو این برنامه</button>
      </article>`;
    }).join('');
  }
  renderPlans();
  $$('[data-bill]').forEach(b => b.onclick = () => {
    months = +b.dataset.bill; $$('[data-bill]').forEach(x => x.classList.toggle('on', x === b)); renderPlans();
  });

  // Before / after comparison sliders (pointer drag + keyboard)
  $('#resList').innerHTML = G.results.map(r => `
    <div class="ba-card rv">
      <div class="ba" role="slider" tabindex="0" aria-label="مقایسه قبل و بعد ${r.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
        <img src="img/${r.img}-before.svg" alt="قبل" width="300" height="400" loading="lazy">
        <img class="after" src="img/${r.img}-after.svg" alt="بعد" width="300" height="400" loading="lazy">
        <span class="lbl b">قبل</span><span class="lbl a">بعد</span>
        <span class="bar"></span><span class="knob">⇆</span>
      </div>
      <div class="ba-info"><div><b>${r.name}</b><span>${faNum(r.weeks)} هفته</span></div><div class="chg">${r.change}</div></div>
    </div>`).join('');
  const setBA = (el, pct) => { pct = Math.max(0, Math.min(100, pct)); el.style.setProperty('--x', pct + '%'); el.setAttribute('aria-valuenow', Math.round(pct)); };
  $$('.ba').forEach(el => {
    let drag = false, sx = 0, sy = 0, decided = false;
    const at = e => setBA(el, (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth * 100);
    el.addEventListener('pointerdown', e => { drag = true; decided = e.pointerType === 'mouse'; sx = e.clientX; sy = e.clientY; if (decided) { el.setPointerCapture(e.pointerId); at(e); } });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      if (!decided) { // on touch: only take over horizontal drags so page/carousel can still scroll
        if (Math.abs(e.clientX - sx) < 6 && Math.abs(e.clientY - sy) < 6) return;
        if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) { drag = false; return; }
        decided = true; el.setPointerCapture(e.pointerId);
      }
      e.preventDefault(); at(e);
    });
    ['pointerup', 'pointercancel'].forEach(t => el.addEventListener(t, () => drag = false));
    el.addEventListener('keydown', e => { const v = +el.getAttribute('aria-valuenow'); if (e.key === 'ArrowLeft') setBA(el, v - 5); if (e.key === 'ArrowRight') setBA(el, v + 5); });
  });

  $('#testList').innerHTML = G.testimonials.map(t => `
    <figure class="test rv"><div class="stars" aria-label="${faNum(t.stars)} از ۵">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</div>
    <p>«${t.text}»</p><figcaption class="who"><span class="av">${t.name[0]}</span><div><b>${t.name}</b><span>${t.plan}</span></div></figcaption></figure>`).join('');
  $('#faqList').innerHTML = G.faq.map(([q, a]) => `<details class="rv"><summary>${q}</summary><p>${a}</p></details>`).join('');

  $('#goWa').href = waLink('سلام'); $('#goTg').href = tgLink();
  $('#ig').href = G.instagram; $('#tgLink').href = tgLink(); $('#waLink').href = waLink('سلام، از سایت شما پیام می‌دهم.');

  // Booking sheet
  const sheet = $('#sheet'), bg = $('#sheetBg');
  function book(id) {
    const p = G.plans.find(x => x.id === id);
    const what = p ? `برنامه‌ی «${p.name}» (${months > 1 ? 'سه‌ماهه' : 'ماهانه'} – ${faNum(priceFor(p, months))} تومان)` : 'مشاوره‌ی رایگان';
    $('#sheetT').textContent = p ? `رزرو ${p.name}` : 'مشاوره‌ی رایگان';
    $('#sheetP').textContent = `یک پیام آماده برای ${what} باز می‌شود. معمولاً کمتر از یک ساعت جواب می‌دهم.`;
    $('#goWa').href = waLink(`سلام آرش جان، برای ${what} از سایت پیام می‌دهم.`);
    $('#goTg').href = tgLink();
    sheet.classList.add('on'); bg.classList.add('on'); document.body.style.overflow = 'hidden'; $('#sheetX').focus();
  }
  const close = () => { sheet.classList.remove('on'); bg.classList.remove('on'); document.body.style.overflow = ''; };
  document.addEventListener('click', e => { const b = e.target.closest('[data-book]'); if (b) book(b.dataset.book); });
  bg.onclick = close; $('#sheetX').onclick = close; addEventListener('keydown', e => e.key === 'Escape' && close());

  // Header + sticky bar on scroll
  const hero = $('.hero');
  const onScroll = () => {
    $('#hdr').classList.toggle('solid', scrollY > 30);
    const pastHero = scrollY > hero.offsetHeight * .7, nearEnd = innerHeight + scrollY > document.body.scrollHeight - 500;
    $('#sticky').classList.toggle('on', pastHero && !nearEnd);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Count-up stats
  const countUp = el => { const n = +el.dataset.count, t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1200); el.textContent = faNum(Math.round(n * (1 - (1 - k) ** 3))) + el.dataset.suffix; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); e.target.dataset.count && countUp(e.target); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.rv,[data-count]').forEach(el => io.observe(el));

  window.__gym = { book, close, setBA, priceFor, setMonths: m => $(`[data-bill="${m}"]`).click() };
})();

// Dev layer: only on local machines
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = '../dev/dev.js';
  s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-gym.js'; document.body.append(c); };
  document.head.append(s);
}
