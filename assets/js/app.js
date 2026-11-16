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
          return [...document.querySelectorAll('.btn-main, #contactLinks .btn')].filter(b => { const cs = getComputedStyle(b); return cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor); }).map(b => `invisible main button: "${b.textContent.trim()}"`);
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
