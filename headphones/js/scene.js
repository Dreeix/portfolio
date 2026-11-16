// 3D stage: renderer, lights, scroll-driven pose, colour tween, adaptive quality, pause when hidden/offscreen.
// Loaded lazily by app.js (after first paint). start(hp) → scene API (also used by the dev layer).
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { buildHeadphones } from './model.js';

const LEVELS = [ // adaptive quality: lowered when FPS drops
  { name: 'low', dpr: .75 },
  { name: 'mid', dpr: 1 },
  { name: 'high', dpr: Math.min(devicePixelRatio || 1, 1.5) },
];
const CAM_Z = 6, FOV = 30, VIS_H = 2 * CAM_Z * Math.tan(FOV / 2 * Math.PI / 180);

export async function start(hp) {
  const stage = document.getElementById('stage');
  const forced = new URLSearchParams(location.search).has('3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  stage.insertBefore(renderer.domElement, stage.querySelector('.lbls'));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environmentIntensity = .9;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db4ff, 2.5); rim.position.set(3, 1, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 50); camera.position.z = CAM_Z;

  const hpModel = buildHeadphones(THREE, (navigator.hardwareConcurrency || 4) <= 4 ? .7 : 1);
  const root = new THREE.Group(); root.add(hpModel.group); scene.add(root);
  hpModel.setColor(hp.color());

  // ---- state ----
  let level = 2, locked = forced ? 2 : -1, W = 0, H = 0, running = false, raf = 0, frames = 0, inView = true;
  const cur = { ...hp.poseAt(scrollY) };
  let tween = null; // colour tween
  const fps = { n: 0, t0: 0, value: 0, low: 0, windows: 0, overlay: null };

  const resize = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setPixelRatio(LEVELS[level].dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  const setLevel = l => { level = Math.max(0, Math.min(2, l)); resize(); return LEVELS[level].name; };
  resize(); addEventListener('resize', resize);

  const lbls = [...document.querySelectorAll('.lbl')].map(el => ({ el, obj: hpModel.parts[el.dataset.part] }));
  const v = new THREE.Vector3();
  const updateLabels = ex => {
    const on = ex > .6, op = on ? Math.min(1, (ex - .6) / .3) : 0;
    for (const l of lbls) {
      if (!l.obj) continue;
      l.el.style.opacity = op; if (!on) continue;
      l.obj.getWorldPosition(v).project(camera);
      l.el.style.transform = `translate(${(v.x * .5 + .5) * W}px,${(-v.y * .5 + .5) * H}px)`;
    }
  };

  // ---- frame ----
  let last = performance.now();
  const loop = now => { if (!running) return; raf = requestAnimationFrame(loop); frame(now); };
  const frame = now => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const target = hp.poseOverride || hp.poseAt(scrollY);
    const k = hp.poseOverride ? 1 : 1 - Math.exp(-dt * 7);
    for (const p of ['rx', 'ry', 'rz', 's', 'ex']) cur[p] += (target[p] - cur[p]) * k;
    cur.m = target.m; cur.d = target.d; cur.mul = target.mul;
    const pl = hp.place(cur, W, H), still = !!hp.poseOverride, t = now / 1000;
    root.position.set(pl.px * VIS_H * (W / H) / 2, pl.py * VIS_H / 2 + (still ? 0 : Math.sin(t * 1.1) * .03), 0);
    root.scale.setScalar(pl.frac);
    root.rotation.set(cur.rx + (still ? 0 : hp.pointer.y * .08), cur.ry + (still ? 0 : hp.pointer.x * .18 + Math.sin(t * .6) * .03), cur.rz);
    hpModel.setExplode(cur.ex);
    stage.style.setProperty('--px', pl.px); stage.style.setProperty('--py', pl.py); stage.style.setProperty('--s', pl.k);
    if (tween) {
      const p = Math.min(1, (now - tween.t0) / tween.ms), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      hpModel.colorLerp(tween.from, tween.to, e); root.rotation.y += Math.sin(p * Math.PI) * .35;
      if (p >= 1) { hpModel.setColor(tween.to); tween = null; }
    }
    updateLabels(cur.ex);
    renderer.render(scene, camera); frames++;
    adapt(now);
  };
  // FPS sampling in 1 s windows; first 2 windows ignored (shader compile). Low FPS → lower DPR → finally static poster.
  const adapt = now => {
    fps.n++; if (!fps.t0) fps.t0 = now;
    if (now - fps.t0 < 1000) return;
    fps.value = Math.round(fps.n * 1000 / (now - fps.t0)); fps.n = 0; fps.t0 = now; fps.windows++;
    if (fps.overlay) fps.overlay.textContent = `${fps.value} fps · ${LEVELS[level].name} · dpr ${LEVELS[level].dpr}`;
    if (fps.windows <= 2 || locked >= 0) return;
    if (fps.value < 40 && level > 0) { setLevel(level - 1); fps.low = 0; }
    else if (fps.value < 18 && level === 0 && ++fps.low >= 2) hp.goStatic('low FPS (' + fps.value + ')');
  };

  const play = () => { if (running || !inView || document.hidden) return; running = true; last = performance.now(); fps.t0 = 0; fps.n = 0; raf = requestAnimationFrame(loop); };
  const pause = () => { running = false; cancelAnimationFrame(raf); raf = 0; };
  const onVis = () => document.hidden ? pause() : play();
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? play() : pause(); });
  io.observe(document.getElementById('story'));

  // First frame before reporting ready (so the poster→canvas crossfade never shows an empty canvas)
  renderer.compile(scene, camera);
  frame(performance.now()); play();

  return {
    THREE, renderer, camera, model: hpModel, LEVELS,
    setColor(c, ms = 700) { if (!ms) { tween = null; hpModel.setColor(c); } else tween = { from: hpModel.getColor(), to: c, ms, t0: performance.now() }; if (!running) frame(performance.now()); },
    getColor: () => hpModel.getColor(),
    setLevel, lock(l) { locked = l; if (l >= 0) setLevel(l); return l < 0 ? 'adaptive' : LEVELS[l].name; },
    state: () => ({ running, raf: !!raf, frames, level: LEVELS[level].name, dpr: renderer.getPixelRatio(), fps: fps.value, inView, hidden: document.hidden, tweening: !!tween }),
    fpsOverlay(on) {
      if (on && !fps.overlay) { fps.overlay = Object.assign(document.createElement('div'), { style: 'position:fixed;top:70px;left:8px;z-index:9999;font:12px monospace;background:#000c;color:#0f0;padding:4px 8px;border-radius:6px;direction:ltr' }); document.body.append(fps.overlay); }
      if (!on && fps.overlay) { fps.overlay.remove(); fps.overlay = null; }
      return !!fps.overlay;
    },
    renderNow: () => frame(performance.now()),
    _vis: onVis,
    dispose() { pause(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', resize); fps.overlay?.remove(); renderer.dispose(); renderer.domElement.remove(); lbls.forEach(l => l.el.style.opacity = 0); },
  };
}
