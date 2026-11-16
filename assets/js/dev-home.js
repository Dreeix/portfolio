// Homepage dev hooks (localhost only, loaded by app.js after dev/dev.js): actions + checks incl. motion (tilt overflow, reduced motion, showcase card)
window.__dbg.site = {
  name: 'portfolio home',
  allowContacts: true, // this is the owner's own page: their own contact links are allowed
  actions: {
    'Check project links (async)': () => { window.__dbg.site.checkLinks().then(r => alert(r.join('\n') || 'all project links OK')); return 'running…'; },
    'Motion off (= reduced motion)': () => 'motion ' + (__motion.set(false) ? 'on' : 'off'),
    'Motion on': () => 'motion ' + (__motion.set(true) ? 'on' : 'off'),
    'Motion: follow OS setting': () => 'motion ' + (__motion.set(null) ? 'on' : 'off'),
    'Max tilt on all cards (2 s)': () => { __dbg.site.tiltAll(1, 1); setTimeout(() => __dbg.site.tiltAll(), 2000); return 'tilted'; },
  },
  // force every card to a tilt (sx/sy = -1..1 of the max, no transition); no args = back to normal
  tiltAll(sx, sy) {
    const T = __motion.TILT;
    document.querySelectorAll('.proj').forEach(c => {
      const ph = c.querySelector('.phone');
      if (sx == null) { c.style.removeProperty('transition'); ['--rx', '--ry'].forEach(k => c.style.removeProperty(k)); ph.style.removeProperty('--py'); return; }
      c.style.transition = 'none'; c.style.setProperty('--rx', sy * Math.max(T.x, T.scroll) + 'deg'); c.style.setProperty('--ry', sx * T.y + 'deg'); ph.style.setProperty('--py', sy * T.phone + 'px');
    });
    if (sx == null) __motion.update();
  },
  checks: [
    function projectsComplete() { return ME.projects.flatMap(p => ['id', 'title', 'url', 'thumb', 'desc'].filter(k => !p[k]).map(k => `${p.id || '?'} missing ${k}`)); },
    // bug 2026-11-16: contact Telegram button rendered with transparent background (card-only rule leaked)
    function mainButtonsVisible() {
      return [...document.querySelectorAll('.btn-main, #contactLinks .btn')].filter(b => { const cs = getComputedStyle(b); return cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor); }).map(b => `invisible main button: "${b.textContent.trim()}"`);
    },
    // motion: the most a card can ever tilt (pointer or scroll) must not push anything sideways off the screen
    function tiltNoOverflow() {
      const W = document.documentElement.clientWidth, bad = [];
      for (const [sx, sy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { // one axis alone = phones (scroll tilt is rotateX only)
        __dbg.site.tiltAll(sx, sy);
        document.querySelectorAll('.proj').forEach(c => { const r = c.getBoundingClientRect(); if (r.left < -1 || r.right > W + 1) bad.push(`${c.id} tilted (${sx},${sy}) pokes out: ${r.left | 0}..${r.right | 0} of ${W}`); });
        if (document.documentElement.scrollWidth > W + 1) bad.push(`tilt (${sx},${sy}) makes the page scroll sideways`);
      }
      __dbg.site.tiltAll();
      return bad;
    },
    // motion on: glows drift, pointer tilt goes the right way and stays in range · reduced motion: nothing moves at all
    function motionState() {
      const m = window.__motion, bad = [], card = document.querySelector('.proj'), r = card.getBoundingClientRect();
      const running = document.getAnimations().filter(a => a.playState === 'running');
      const off = matchMedia('(prefers-reduced-motion: reduce)').matches ? m.forced !== true : m.forced === false;
      if (!off) {
        if (!m.on) bad.push('motion is off but reduced motion is not requested');
        if (!running.some(a => a.animationName === 'drift')) bad.push('hero glows are not animating');
        m.pointer(card, r.right - 2, r.top + 2);
        const rx = parseFloat(card.style.getPropertyValue('--rx')), ry = parseFloat(card.style.getPropertyValue('--ry'));
        if (!(ry > 0 && ry <= m.TILT.y && rx > 0 && rx <= m.TILT.x)) bad.push(`pointer at top-right gave rx=${rx} ry=${ry} (want 0 < rx ≤ ${m.TILT.x}, 0 < ry ≤ ${m.TILT.y})`);
        card.dispatchEvent(new PointerEvent('pointerleave'));
        if (card.classList.contains('hovered')) bad.push('tilt not reset after the pointer leaves');
        return bad;
      }
      if (m.on) bad.push('reduced motion requested but motion is on');
      if (!document.documentElement.classList.contains('rm')) bad.push('html.rm missing');
      if (running.length) bad.push(`${running.length} animation(s) still running: ${[...new Set(running.map(a => a.animationName || a.transitionProperty))].join(', ')}`);
      m.pointer(card, r.right - 2, r.top + 2); m.update();
      document.querySelectorAll('.proj').forEach(c => { if (c.style.getPropertyValue('--rx') || getComputedStyle(c).transform !== 'none') bad.push(`${c.id} is tilted`); });
      if (getComputedStyle(document.querySelector('.hero-bg')).transform !== 'none') bad.push('hero parallax still moving');
      const hidden = [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity !== '1'); if (hidden.length) bad.push(`${hidden.length} reveal block(s) still hidden`);
      return bad;
    },
    function showcaseCard() {
      return ME.projects.filter(p => p.showcase).flatMap(p => { const el = document.getElementById('p-' + p.id); return !el ? [`${p.id} card missing`] : [!el.classList.contains('showcase') && `${p.id} not styled as showcase`, !el.querySelector('.badge3d') && `${p.id} has no 3D badge`].filter(Boolean); });
    },
    // every owner-panel link is followed by the honest "demo, this device only" note
    function demoNotes() { return ME.projects.filter(p => [].concat(p.extra || []).some(x => /admin\.html$/.test(x.url))).filter(p => document.querySelector(`#p-${p.id} .demo-note`)?.textContent !== ME.demoNote).map(p => `${p.id}: owner-panel demo note missing`); },
    // reveals: short fade + small stagger, started well before the block is on screen; a jump far down shows content, never blanks
    async function revealFast() {
      const bad = [], all = [...document.querySelectorAll('.rv')], y0 = scrollY, H = innerHeight;
      const t = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rv-t')), dMax = Math.max(...all.map(e => parseFloat(e.style.getPropertyValue('--d')) || 0));
      if (!(t <= .5)) bad.push(`reveal fade ${t}s (want ≤ 0.5 s)`);
      if (dMax > .2) bad.push(`stagger delay up to ${dMax}s (want ≤ 0.2 s)`);
      if (!(parseFloat(__reveal.lead.split(' ')[2]) >= 25)) bad.push(`reveal starts only ${__reveal.lead} below the screen (want ≥ 25%)`);
      const html = document.documentElement, sb = html.style.scrollBehavior; html.style.scrollBehavior = 'auto';
      try {
        for (const el of all.filter(e => !e.classList.contains('in')).slice(0, 4)) { // jump straight to unrevealed blocks, like a fast fling
          scrollTo(0, el.getBoundingClientRect().top + scrollY - H / 2);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))));
          const below = all.filter(e => { const r = e.getBoundingClientRect(); return r.top < H * 1.2 && r.bottom > 0 && !e.classList.contains('in'); });
          if (below.length) bad.push(`${below.length} block(s) on/near screen not revealed 2 frames after a jump to ${el.id || el.className}`);
        }
      } finally { scrollTo(0, y0); html.style.scrollBehavior = sb; }
      return bad;
    },
    function thumbsLoaded() { return [...document.querySelectorAll('.phone img')].filter(i => i.complete && !i.naturalWidth).map(i => `thumb not loaded: ${i.getAttribute('src')}`); },
  ],
  // fetches every project page/extra link and reports non-200s
  async checkLinks() {
    const urls = ME.projects.flatMap(p => [p.url, p.thumb, ...[].concat(p.extra || []).map(x => x.url)].filter(Boolean)), bad = [];
    await Promise.all(urls.map(async u => { try { const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(`${r.status} ${u}`); } catch (e) { bad.push(`fail ${u}`); } }));
    return bad;
  },
};
