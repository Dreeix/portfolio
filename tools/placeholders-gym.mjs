// Generates gym placeholder images (hero, coach, before/after silhouettes). Usage: node tools/placeholders-gym.mjs
import fs from 'node:fs';
const out = new URL('../gym/img/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const L = '#c6ff3d', O = '#ff5a1f';
const bg = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

// Body silhouette; w = waist width, s = shoulder width, arm = arm thickness
const body = (cx, s, w, arm, fill) => `
  <circle cx="${cx}" cy="110" r="34" fill="${fill}"/>
  <rect x="${cx - 12}" y="138" width="24" height="22" fill="${fill}"/>
  <path d="M${cx - s} 168 Q${cx} 150 ${cx + s} 168 L${cx + w + 6} 330 Q${cx} 350 ${cx - w - 6} 330 Z" fill="${fill}"/>
  <path d="M${cx - s} 170 q-${arm} 70 -${arm / 2 + 10} 160" stroke="${fill}" stroke-width="${arm}" stroke-linecap="round" fill="none"/>
  <path d="M${cx + s} 170 q${arm} 70 ${arm / 2 + 10} 160" stroke="${fill}" stroke-width="${arm}" stroke-linecap="round" fill="none"/>
  <rect x="${cx - w}" y="330" width="${w - 4}" height="170" rx="14" fill="${fill}"/><rect x="${cx + 4}" y="330" width="${w - 4}" height="170" rx="14" fill="${fill}"/>`;

const pair = [[78, 92, 26, 70, 64, 34], [70, 80, 22, 66, 52, 28], [58, 50, 18, 84, 56, 34]]; // [beforeS, beforeW, beforeArm, afterS, afterW, afterArm]
pair.forEach(([bs, bw, ba, as, aw, aa], i) => {
  const mk = (s, w, a, after) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">${bg('g', after ? '#1d2410' : '#202024', after ? '#0b0d07' : '#0d0d0f')}
<rect width="300" height="400" fill="url(#g)"/><g transform="translate(0 -40) scale(1 .95)" opacity=".92">${body(150, s, w, a, after ? '#d9e8b0' : '#9a9aa3')}</g></svg>`;
  fs.writeFileSync(new URL(`r${i + 1}-before.svg`, out), mk(bs, bw, ba, false));
  fs.writeFileSync(new URL(`r${i + 1}-after.svg`, out), mk(as, aw, aa, true));
});

fs.writeFileSync(new URL('coach.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">${bg('g', '#26290f', '#0b0b0c')}
<rect width="300" height="400" fill="url(#g)"/><circle cx="230" cy="80" r="120" fill="${L}" opacity=".08"/>
<g transform="translate(0 10)">${body(150, 88, 58, 38, '#1a1a1d')}</g>
<path d="M0 360 L300 300 V400 H0Z" fill="${L}" opacity=".9"/></svg>`);

fs.writeFileSync(new URL('hero.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">${bg('g', '#17180f', '#060607')}
<rect width="800" height="1000" fill="url(#g)"/>
<g opacity=".14" stroke="${L}" stroke-width="40">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${-200 + i * 180} 1000 L${300 + i * 180} 0"/>`).join('')}</g>
<g transform="translate(400 330) rotate(-28)">
  <rect x="-210" y="-14" width="420" height="28" rx="8" fill="#3a3b40"/>
  <rect x="-200" y="-90" width="44" height="180" rx="10" fill="#222226" stroke="${L}" stroke-width="4"/><rect x="-150" y="-70" width="34" height="140" rx="8" fill="#2c2c31"/>
  <rect x="156" y="-90" width="44" height="180" rx="10" fill="#222226" stroke="${L}" stroke-width="4"/><rect x="116" y="-70" width="34" height="140" rx="8" fill="#2c2c31"/>
</g>
<circle cx="640" cy="160" r="220" fill="${O}" opacity=".12"/></svg>`);
console.log('gym placeholders written');
