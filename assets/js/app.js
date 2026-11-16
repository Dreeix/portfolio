// Portfolio homepage: renders everything from ME (assets/js/data.js)
(() => {
  const $ = s => document.querySelector(s), M = ME;
  $('#myName').textContent = M.name; $('#myRole').textContent = M.role; $('#intro').textContent = M.intro;

  $('#projects').innerHTML = M.projects.map(p => `
    <article class="proj rv" id="p-${p.id}" style="--acc:${p.accent}">
      <a class="shot" href="${p.url}" aria-label="${p.title}" tabindex="-1">
        <div class="phone"><img src="${p.thumb}" alt="تصویر سایت ${p.title} روی موبایل" width="375" height="760" loading="lazy" decoding="async"></div>
      </a>
      <div class="info">
        <div class="kind">${p.kind}</div><h3>${p.title}</h3><p>${p.desc}</p>
        <ul class="tags">${p.tags.map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="acts">
          <a class="btn btn-main" href="${p.url}">مشاهده سایت</a>
          ${p.extra ? `<a class="btn btn-line" href="${p.extra.url}">${p.extra.label}</a>` : ''}
        </div>
      </div>
    </article>`).join('');

  $('#svc').innerHTML = M.services.map(s => `<div class="rv"><span>${s.icon}</span><b>${s.title}</b><p>${s.text}</p></div>`).join('');
  $('#steps').innerHTML = M.steps.map(([t, d]) => `<li class="rv"><div><b>${t}</b><p>${d}</p></div></li>`).join('');

  const c = M.contact, links = [
    c.telegram && [c.telegram, 'تلگرام', true], c.instagram && [c.instagram, 'اینستاگرام'], c.email && ['mailto:' + c.email, 'ایمیل'], c.github && [c.github, 'گیت‌هاب'],
  ].filter(Boolean);
  $('#contactLinks').innerHTML = links.map(([u, l, main], i) => `<a class="btn ${main || i === 0 ? 'btn-main' : 'btn-line'}" href="${u}" target="_blank" rel="noopener">${l}</a>`).join('');

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
})();

// Dev layer: only on local machines
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = 'dev/dev.js';
  s.onload = () => {
    window.__dbg.site = {
      name: 'portfolio home',
      allowContacts: true, // this is the owner's own page: their own contact links are allowed
      actions: { 'Check project links (async)': () => { window.__dbg.site.checkLinks().then(r => alert(r.join('\n') || 'all project links OK')); return 'running…'; } },
      checks: [
        function projectsComplete() { return ME.projects.flatMap(p => ['id', 'title', 'url', 'thumb', 'desc'].filter(k => !p[k]).map(k => `${p.id || '?'} missing ${k}`)); },
        // bug 2026-11-16: contact Telegram button rendered with transparent background (card-only rule leaked)
        function mainButtonsVisible() {
          return [...document.querySelectorAll('.btn-main')].filter(b => { const cs = getComputedStyle(b); return cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor); }).map(b => `invisible main button: "${b.textContent.trim()}"`);
        },
        function thumbsLoaded() { return [...document.querySelectorAll('.phone img')].filter(i => i.complete && !i.naturalWidth).map(i => `thumb not loaded: ${i.getAttribute('src')}`); },
      ],
      // fetches every project page/extra link and reports non-200s
      async checkLinks() {
        const urls = ME.projects.flatMap(p => [p.url, p.thumb, p.extra?.url].filter(Boolean)), bad = [];
        await Promise.all(urls.map(async u => { try { const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(`${r.status} ${u}`); } catch (e) { bad.push(`fail ${u}`); } }));
        return bad;
      },
    };
  };
  document.head.append(s);
}
