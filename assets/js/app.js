// Portfolio homepage: renders everything from ME (assets/js/data.js)
(() => {
  const $ = s => document.querySelector(s), M = ME;
  $('#myName').textContent = M.name; $('#myRole').textContent = M.role; $('#intro').textContent = M.intro;

  $('#projects').innerHTML = M.projects.map(p => `
    <article class="proj rv${p.showcase ? ' showcase' : ''}" id="p-${p.id}" style="--acc:${p.accent}">
      <span class="glare" aria-hidden="true" data-dbg-ok></span>
      <a class="shot" href="${p.url}" aria-label="${p.title}" tabindex="-1">
        ${p.showcase ? '<span class="orbit" aria-hidden="true"></span>' : ''}<div class="phone"><img src="${p.thumb}" alt="تصویر سایت ${p.title} روی موبایل" width="375" height="760" loading="lazy" decoding="async"></div>
      </a>
      <div class="info">
        <div class="kind">${p.kind}${p.showcase ? `<span class="badge3d"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5"/></svg>سه‌بعدی</span>` : ''}</div><h3>${p.title}</h3><p>${p.desc}</p>
        <ul class="tags">${p.tags.map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="acts">
          <a class="btn btn-main" href="${p.url}">مشاهده سایت</a>
          ${[].concat(p.extra || []).map(x => `<a class="btn btn-line" href="${x.url}">${x.label}</a>`).join('')}
        </div>
      </div>
    </article>`).join('');

  $('#svc').innerHTML = M.services.map((s, i) => `<div class="rv" style="--d:${i * .08}s"><span>${s.icon}</span><b>${s.title}</b><p>${s.text}</p></div>`).join('');
  $('#steps').innerHTML = M.steps.map(([t, d], i) => `<li class="rv" style="--d:${i * .1}s"><div><b>${t}</b><p>${d}</p></div></li>`).join('');

  // Contact buttons in brand colours with icons (empty values in data.js are skipped)
  const ICONS = {
    tg: '<path fill="currentColor" d="M21.9 4.6 18.7 19.8c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3.4c.8-.3 1.6.2 1.3 1.2z"/>',
    gh: '<path fill="currentColor" transform="scale(1.5)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>',
    ig: '<g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></g>',
    mail: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></g>',
  };
  const c = M.contact, links = [
    c.telegram && ['tg', c.telegram, 'تلگرام'],
    c.instagram && ['ig', c.instagram, 'اینستاگرام'],
    c.email && ['mail', 'mailto:' + c.email, 'ایمیل'],
    c.github && ['gh', c.github, 'گیت‌هاب'],
  ].filter(Boolean);
  $('#contactLinks').innerHTML = links.map(([k, u, l]) => `<a class="btn btn-${k}" href="${u}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}</a>`).join('');

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // ----- Motion: transform/opacity only, rAF-throttled, off with prefers-reduced-motion (html.rm). Checked by __dbg.
  // Starts after the first frame (+ html.mo turns on the CSS loops), so motion never delays the first paint on slow phones.
  const initMotion = () => {
    const TILT = { x: 6, y: 8, scroll: 4, phone: 14, hero: .25 }; // max degrees (pointer x/y, phone scroll) · px phone shift · hero parallax factor
    const root = document.documentElement, rmq = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(hover: hover) and (pointer: fine)');
    const cards = [...document.querySelectorAll('.proj')], heroBg = $('.hero-bg'), visible = new Set();
    const motion = window.__motion = { TILT, on: true, forced: null, fine };
    const prop = (el, k, v) => v == null ? el.style.removeProperty(k) : el.style.setProperty(k, v);
    const reset = c => { ['--rx', '--ry', '--gx', '--gy'].forEach(k => prop(c, k)); c.classList.remove('follow', 'hovered'); prop(c.querySelector('.phone'), '--py'); };
    // pointer at (px, py) over card c → tilt toward it + glare under it (also called directly by __dbg checks)
    motion.pointer = (c, px, py) => {
      if (!motion.on) return;
      const r = c.getBoundingClientRect(), x = Math.min(1, Math.max(0, (px - r.left) / r.width)), y = Math.min(1, Math.max(0, (py - r.top) / r.height));
      c.classList.add('follow', 'hovered');
      prop(c, '--ry', ((x - .5) * 2 * TILT.y).toFixed(2) + 'deg'); prop(c, '--rx', ((.5 - y) * 2 * TILT.x).toFixed(2) + 'deg');
      prop(c, '--gx', (x * c.offsetWidth).toFixed(0) + 'px'); prop(c, '--gy', (y * c.offsetHeight).toFixed(0) + 'px');
    };
    // phones (no hover): cards lean back gently as they scroll through the screen, the phone shot drifts inside
    motion.update = () => {
      if (!motion.on) return;
      if (heroBg && scrollY < innerHeight * 1.5) prop(heroBg, '--hy', (scrollY * TILT.hero).toFixed(1) + 'px');
      if (fine.matches) return;
      const vh = innerHeight;
      visible.forEach(c => {
        if (c.classList.contains('hovered')) return;
        const r = c.getBoundingClientRect(), p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        c.classList.add('follow'); prop(c, '--rx', (p * TILT.scroll).toFixed(2) + 'deg'); prop(c.querySelector('.phone'), '--py', (p * TILT.phone).toFixed(1) + 'px');
      });
    };
    // off = reduced motion (or forced by the dev menu): drop every inline motion value
    motion.set = on => {
      motion.forced = on; const live = on ?? !rmq.matches;
      motion.on = live; root.classList.toggle('rm', !live);
      if (!live) { cards.forEach(reset); prop(heroBg, '--hy'); } else motion.update();
      return live;
    };
    rmq.addEventListener?.('change', () => motion.set(motion.forced));
    const vio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    cards.forEach(c => {
      vio.observe(c);
      let raf = 0, px = 0, py = 0;
      c.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(() => { raf = 0; motion.pointer(c, px, py); }); });
      c.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); raf = 0; if (motion.on) { reset(c); motion.update(); } });
    });
    let sraf = 0;
    addEventListener('scroll', () => { sraf ||= requestAnimationFrame(() => { sraf = 0; motion.update(); }); }, { passive: true });
    motion.set(null);
    root.classList.add('mo');
  };
  requestAnimationFrame(() => setTimeout(initMotion));
})();

// Dev layer: only on local machines (site hooks live in assets/js/dev-home.js, never shipped to visitors)
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = 'dev/dev.js';
  s.onload = () => { const d = document.createElement('script'); d.src = 'assets/js/dev-home.js'; document.head.append(d); };
  document.head.append(s);
}
