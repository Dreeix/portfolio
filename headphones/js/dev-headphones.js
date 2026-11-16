// Headphones dev hooks (localhost only, after ../dev/dev.js)
// Script API: __hp (page API), __hp.scene (3D API, null in static mode), __dbg.site.posterMode(color|'exploded') for poster renders.
(() => {
  const hp = window.__hp, D = hp.D;
  const go = (id, at = 0) => { const y = hp.keyY(id, at); scrollTo({ top: y, behavior: 'instant' }); hp.scene?.renderNow(); return `${id}@${at} y=${Math.round(y)}`; };
  const progress = p => { const k = hp.timeline(), y = k[0].y + (k[k.length - 1].y - k[0].y) * p; scrollTo({ top: y, behavior: 'instant' }); return `progress ${p} → y=${Math.round(y)}`; };
  // Poster capture: hides the page, transparent bg, model centred at frame size = stage height. Use a square viewport.
  const posterMode = (what = D.colors[0].id) => {
    const ex = what === 'exploded', hero = D.story[0].keys[0], inside = D.story.find(s => s.id === 'inside').keys[1];
    const p = ex ? inside : hero;
    document.documentElement.classList.add('poster-cap');
    const st = document.createElement('style'); st.textContent = '.poster-cap body,.poster-cap .story{background:transparent!important}.poster-cap .scene,.poster-cap .plain,.poster-cap .hdr,.poster-cap .bar,.poster-cap .ftr,.poster-cap #dbg,.poster-cap .glow,.poster-cap .lbls,.poster-cap .ld{visibility:hidden!important}.poster-cap .poster{opacity:0!important}';
    document.head.append(st);
    hp.posterOverride = true;
    hp.poseOverride = { ...p, m: [0, 0], d: [0, 0], s: 1, mul: 1 / (innerWidth >= 820 ? .75 : .72) };
    if (!ex) hp.setColor(what, true); else hp.setColor(D.colors[0].id, true);
    scrollTo(0, 0);
    if (hp.scene) { hp.scene.lock(2); hp.scene.renderer.setPixelRatio(3); hp.scene.renderNow(); }
    return hp.scene ? `poster mode ${what}` : 'no 3D scene (static mode)';
  };
  const sync = fn => { try { return fn(); } catch (e) { return [`crashed: ${e.message}`]; } };

  window.__dbg.site = {
    name: 'headphones',
    ready: () => Promise.race([hp.settled, new Promise(r => setTimeout(r, 15000))]),
    posterMode, go, progress,
    actions: {
      ...Object.fromEntries(D.colors.map(c => [`Colour: ${c.name}`, () => (hp.setColor(c.id), c.id)])),
      ...Object.fromEntries(D.story.map(s => [`Go: ${s.id}`, () => go(s.id)])),
      'Exploded view': () => go('inside', .35),
      'Progress 0/25/50/75/100': () => { let i = 0; const t = setInterval(() => { progress(i / 4); if (++i > 4) clearInterval(t); }, 900); return 'stepping…'; },
      'Force static': () => hp.goStatic('forced (dev)'),
      'Load 3D': () => (hp.load3d(), 'loading…'),
      'FPS overlay': () => hp.scene ? 'overlay ' + hp.scene.fpsOverlay(!document.querySelector('[style*="monospace"]')) : 'no scene',
      'Quality: low': () => hp.scene?.lock(0), 'Quality: mid': () => hp.scene?.lock(1), 'Quality: high': () => hp.scene?.lock(2), 'Quality: adaptive': () => hp.scene?.lock(-1),
      'Buy (toast)': () => hp.buy(),
      State: () => JSON.stringify({ mode: hp.mode, reason: hp.reason, ...(hp.scene?.state() || {}) }, null, 1),
    },
    checks: [
      function glOrFallback() {
        if (hp.mode === '3d') { const s = hp.scene.state(), c = document.querySelector('#stage canvas'); return [!s.frames && 'no frames rendered', !c && 'no canvas', !document.getElementById('stage').classList.contains('live') && 'stage not live (canvas hidden)'].filter(Boolean); }
        if (hp.mode === 'static') { const p = document.getElementById('poster'); return [!(p.complete && p.naturalWidth) && 'poster not loaded', getComputedStyle(p).opacity === '0' && 'poster hidden', !document.getElementById('opt3d').textContent && 'opt-in text missing'].filter(Boolean); }
        return [`still ${hp.mode} (3D not settled)`];
      },
      function colours() {
        const bad = [], start = hp.color().id;
        for (const c of D.colors) {
          if (!hp.setColor(c.id, true)) { bad.push(`setColor(${c.id}) failed`); continue; }
          if (getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() !== c.glow) bad.push(`${c.id}: --acc not applied`);
          if (!document.querySelector(`.sw[data-color="${c.id}"][aria-pressed="true"]`)) bad.push(`${c.id}: swatch not pressed`);
          if (hp.scene) { const got = hp.scene.getColor(); ['shell', 'band', 'accent', 'cushion'].forEach(k => got[k] !== c[k].toLowerCase() && bad.push(`${c.id}.${k}: material ${got[k]} ≠ ${c[k]}`)); }
          if (!/^#[0-9a-f]{6}$/i.test(c.shell + '') || !c.name) bad.push(`${c.id}: bad data`);
        }
        hp.setColor(start, true); return bad;
      },
      function timeline() {
        return sync(() => {
          const bad = [], k = hp.timeline();
          for (const s of D.story) {
            if (!document.getElementById(s.id)) bad.push(`section #${s.id} missing`);
            for (const key of s.keys) {
              const kk = k.find(x => x.id === s.id && x.at === key.at); if (!kk) { bad.push(`${s.id}@${key.at}: no timeline key`); continue; }
              const p = hp.poseAt(kk.y); ['rx', 'ry', 'rz', 's', 'ex'].forEach(n => Math.abs(p[n] - key[n]) > 1e-3 && bad.push(`${s.id}@${key.at}: ${n} ${p[n].toFixed(3)} ≠ ${key[n]}`));
            }
          }
          for (let i = 1; i < k.length; i++) if (k[i].y < k[i - 1].y) bad.push('timeline not sorted');
          const maxY = document.documentElement.scrollHeight - innerHeight;
          if (k[k.length - 1].y > maxY + 1) bad.push(`last key y=${k[k.length - 1].y | 0} beyond max scroll ${maxY}`);
          if (!D.story.some(s => s.keys.some(x => x.ex > .99))) bad.push('no exploded key');
          return bad;
        });
      },
      function pausedWhenHidden() {
        if (hp.mode !== '3d') return [];
        return sync(() => {
          const bad = [], desc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); hp.scene._vis();
          const s = hp.scene.state(); if (s.running || s.raf) bad.push('loop still running while hidden');
          delete document.hidden; Object.defineProperty(Document.prototype, 'hidden', desc); hp.scene._vis();
          if (!document.hidden && !hp.scene.state().running && hp.scene.state().inView) bad.push('loop did not resume when visible');
          return bad;
        });
      },
      function posterFiles() { // every colour + exploded poster exists (sync HEAD, dev only)
        return [...D.colors.map(c => `img/hp-${c.id}.webp`), 'img/hp-exploded.webp'].filter(src => { const x = new XMLHttpRequest(); x.open('HEAD', src, false); try { x.send(); } catch { return true; } return x.status !== 200; }).map(s => `missing poster ${s}`);
      },
      function demoNoContacts() { return D.demo && Object.values(D.contacts).some(Boolean) ? ['demo mode but a contact is set in data.js'] : []; },
      function buyToast() { const m = hp.buy(); return /نمایشی/.test(m) && document.getElementById('toast').classList.contains('on') ? [] : ['buy did not show the demo toast']; },
      function priceText() { const t = document.getElementById('heroPrice').textContent; return t.includes(D.price.toLocaleString('fa-IR')) ? [] : ['hero price not from data.js']; },
    ],
  };
})();
