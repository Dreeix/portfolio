// Page logic: content from data.js, scroll timeline, colour picker, buy bar, and the lazy 3D loader.
// The page is complete without 3D (poster images); js/scene.js + three.js load only after first paint.
(() => {
  const D = window.HP, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const fa = n => typeof n === 'number' ? n.toLocaleString('fa-IR') : n;
  const toman = n => `${fa(n)} تومان`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const stage = $('#stage'), poster = $('#poster');
  const tokens = (t, live = true) => t.replace(/\{(\w+)\}/g, (_, k) => live ? `<b class="num" data-count="${D.stats[k]}">${fa(D.stats[k])}</b>` : fa(D.stats[k]));

  // ---------- Content ----------
  const hero = D.story[0];
  $('#top .eyebrow').textContent = hero.eyebrow; $('#top h1').textContent = hero.title; $('#top .lead').textContent = hero.text;
  $('#heroPrice').innerHTML = `${toman(D.price)}<small>یا ${fa(D.installments)} قسط ${toman(Math.ceil(D.price / D.installments / 1000) * 1000)}</small>`;
  $('#story').insertAdjacentHTML('beforeend', D.story.slice(1).map((s, i) => `
    <section id="${s.id}" class="scene${s.tall ? ' tall' : ''}" data-scene="${i + 1}"${s.tall ? ` style="min-height:${s.tall * 100}svh"` : ''}>
      <div class="wrap"><div class="card rv">
        <span class="eyebrow">${s.eyebrow}</span><h2>${s.title}</h2>
        ${s.big ? `<p class="big">${s.big.prefix || ''}<span class="num" data-count="${D.stats[s.big.stat]}">${fa(D.stats[s.big.stat])}</span><small>${s.big.unit}</small></p>` : ''}
        <p class="lead">${tokens(s.text)}</p>
        ${s.id === 'inside' ? `<ul class="parts">${D.parts.map(p => `<li>${tokens(p.label, false)}</li>`).join('')}</ul>` : ''}
        ${s.picker ? `<div class="swatches" role="group" aria-label="انتخاب رنگ">${D.colors.map(c => `<button class="sw" data-color="${c.id}" aria-label="${c.name}" aria-pressed="false"><i style="background:${c.shell}"></i></button>`).join('')}</div><p class="swName" id="swName"></p>` : ''}
      </div></div>
    </section>`).join(''));
  $('#specList').innerHTML = D.specs.map(s => `<div class="spec rv"><span>${s.label}</span><b>${s.stat ? `<span class="num" data-count="${D.stats[s.stat]}" style="display:inline;color:inherit;font-size:inherit">${fa(D.stats[s.stat])}</span>` : s.value}</b><small>${s.unit}</small></div>`).join('');
  $('#boxList').innerHTML = D.box.map(b => `<li>${b}</li>`).join('');
  $('#finalP').textContent = `${toman(D.price)} · ${fa(D.warrantyMonths)} ماه ضمانت · ارسال رایگان`;
  $('#barName').textContent = D.name; $('#barPrice').textContent = toman(D.price);
  $('#lbls').innerHTML = D.parts.filter(p => p.pin).map(p => `<div class="lbl ${p.pin}" data-part="${p.key}"><i></i><span>${tokens(p.label, false)}</span></div>`).join('');

  // ---------- Scroll timeline: keys at absolute scrollY, pose interpolated between them ----------
  let keys = [];
  const buildTimeline = () => {
    keys = [];
    $$('.scene[data-scene]').forEach(el => {
      const s = D.story[+el.dataset.scene], top = el.getBoundingClientRect().top + scrollY, range = Math.max(0, el.offsetHeight - innerHeight);
      s.keys.forEach(k => keys.push({ y: top + k.at * range, id: s.id, at: k.at, pose: k }));
    });
    keys.sort((a, b) => a.y - b.y);
  };
  const NUM = ['rx', 'ry', 'rz', 's', 'ex'];
  const ease = t => t * t * (3 - 2 * t);
  const poseAt = y => {
    if (!keys.length) buildTimeline();
    if (y <= keys[0].y) return { ...keys[0].pose };
    const last = keys[keys.length - 1]; if (y >= last.y) return { ...last.pose };
    let i = 0; while (keys[i + 1].y <= y) i++;
    const a = keys[i].pose, b = keys[i + 1].pose, t = ease((y - keys[i].y) / (keys[i + 1].y - keys[i].y || 1)), p = {};
    NUM.forEach(k => p[k] = a[k] + (b[k] - a[k]) * t);
    p.m = [0, 1].map(j => a.m[j] + (b.m[j] - a.m[j]) * t); p.d = [0, 1].map(j => a.d[j] + (b.d[j] - a.d[j]) * t);
    return p;
  };
  // Where the model sits on a W×H stage: centre (-1..1) and frame size as a fraction of H (frame = full model box). Mirrors the CSS in .stage.
  const place = (pose, W = stage.clientWidth, H = stage.clientHeight) => {
    const desk = W >= 820, [px, py] = desk ? pose.d : pose.m;
    const k = pose.s * (desk ? .75 : .72) * (pose.mul || 1), frame = k * Math.min(H, W / .75);
    return { px, py, k, frac: frame / H }; // k = CSS --s (size = --s × min(100svh, 133vw))
  };

  // ---------- Colours ----------
  let color = D.colors[0].id;
  const posterSrc = (ex) => ex ? 'img/hp-exploded.webp' : `img/hp-${color}.webp`;
  const swapPoster = src => {
    if (poster.getAttribute('src') === src) return;
    const img = new Image(); img.src = src;
    poster.classList.add('swap');
    img.decode().catch(() => {}).then(() => setTimeout(() => { poster.src = src; poster.classList.remove('swap'); }, 200));
  };
  const setColor = (id, instant) => {
    const c = D.colors.find(x => x.id === id); if (!c) return false;
    color = id;
    document.documentElement.style.setProperty('--acc', c.glow);
    $('#barDot').style.background = c.shell;
    $$('.sw').forEach(b => b.setAttribute('aria-pressed', b.dataset.color === id));
    const n = $('#swName'); if (n) n.textContent = `${D.name} · ${c.name}`;
    if (api.scene) api.scene.setColor(c, instant ? 0 : 700);
    else if (!api.posterOverride) swapPoster(posterSrc(curEx > .5));
    return true;
  };
  document.addEventListener('click', e => { const b = e.target.closest('.sw'); if (b) setColor(b.dataset.color); });

  // ---------- Buy (demo) ----------
  let toastT;
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); return msg; };
  const buy = () => toast(`نسخه‌ی نمایشی: ${D.name} (${D.colors.find(c => c.id === color).name}) — پرداختی انجام نمی‌شود.`);
  document.addEventListener('click', e => { if (e.target.closest('[data-buy]')) buy(); });

  // ---------- Scroll UI ----------
  let curEx = 0, ticking = false;
  const onScroll = () => {
    ticking = false;
    $('#hdr').classList.toggle('solid', scrollY > 30);
    const nearEnd = $('#buy').getBoundingClientRect().top < innerHeight * .8;
    $('#bar').classList.toggle('on', scrollY > innerHeight * .6 && !nearEnd);
    if (!api.scene && !api.posterOverride) { // static: poster follows the pose's place/scale (no rotation), exploded image inside #inside
      const p = poseAt(scrollY), pl = place(p); curEx = p.ex; swapPoster(posterSrc(curEx > .5));
      stage.style.setProperty('--px', pl.px); stage.style.setProperty('--py', pl.py); stage.style.setProperty('--s', pl.k);
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { buildTimeline(); onScroll(); });

  // Reveals + count-ups
  const countUp = el => {
    const n = +el.dataset.count; if (reduced) return;
    const t0 = performance.now(), step = t => { const k = Math.min(1, (t - t0) / 1300); el.textContent = fa(Math.round(n * (1 - (1 - k) ** 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); e.target.querySelectorAll('[data-count]').forEach(countUp); io.unobserve(e.target); }), { threshold: .2 });
  $$('.rv').forEach(el => io.observe(el));

  // Hero parallax input (desktop pointer)
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; } }, { passive: true });

  // ---------- 3D loader ----------
  const conn = navigator.connection || {};
  const hasGL2 = () => { try { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; } };
  const staticReason = () => {
    if (params.has('poster')) return 'forced (?poster)';
    if (params.has('3d')) return '';
    if (reduced) return 'prefers-reduced-motion';
    if (conn.saveData) return 'save-data';
    if (/(^|-)2g$/.test(conn.effectiveType || '')) return 'slow network (' + conn.effectiveType + ')';
    if ((navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) < 2) return 'weak device';
    return '';
  };
  let settle; const settled = new Promise(r => settle = r);
  const goStatic = (reason, allowOptIn = true) => {
    if (api.scene) { api.scene.dispose(); api.scene = null; }
    api.mode = 'static'; api.reason = reason;
    stage.classList.remove('live'); document.documentElement.classList.add('static'); $('#ld').hidden = true;
    const b = $('#opt3d'); b.hidden = !allowOptIn; b.textContent = `نمایش سه‌بعدی (حدود ${fa(D.threeKB)} کیلوبایت)`;
    onScroll(); settle(api.mode); return reason;
  };
  const load3d = async () => {
    if (api.mode === 'loading' || api.mode === '3d') return;
    if (!hasGL2()) return goStatic('no WebGL2', false);
    api.mode = 'loading'; $('#ld').hidden = false; $('#opt3d').hidden = true; document.documentElement.classList.remove('static');
    try {
      const { start } = await import(new URL('js/scene.js', document.baseURI).href);
      api.scene = await start(api);
      api.mode = '3d'; api.reason = ''; $('#ld').hidden = true; stage.classList.add('live');
      performance.mark('3d-ready'); settle(api.mode);
    } catch (e) { console.warn('3D failed', e); goStatic('error: ' + e.message, false); }
  };
  $('#opt3d').addEventListener('click', () => load3d());
  const boot = () => { const r = staticReason(); r ? goStatic(r) : load3d(); };
  addEventListener('load', () => document.documentElement.classList.add('f')); // font fallback if the poster never fires
  const whenIdle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 300);
  if (document.readyState === 'complete') whenIdle(boot); else addEventListener('load', () => whenIdle(boot));

  // Public API (used by scene.js and the dev layer)
  const api = window.__hp = {
    D, mode: 'poster', reason: '', scene: null, settled, pointer, poseOverride: null, posterOverride: false,
    poseAt, place, timeline: () => (keys.length || buildTimeline(), keys), buildTimeline,
    color: () => D.colors.find(c => c.id === color), setColor, toast, buy, load3d, goStatic,
    keyY: (id, at = 0) => api.timeline().find(k => k.id === id && Math.abs(k.at - at) < 1e-6)?.y,
  };
  buildTimeline(); setColor(color, true); onScroll();
  document.fonts?.ready.then(buildTimeline);

  // Dev layer: only on local machines
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    const s = document.createElement('script'); s.src = '../dev/dev.js';
    s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-headphones.js'; document.body.append(c); };
    document.head.append(s);
  }
})();
