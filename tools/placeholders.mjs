// Generates warm SVG placeholder photos for the café from cafe/js/data.js.
// Usage: node tools/placeholders.mjs   (overwrites cafe/img/*.svg; real photos can replace them later)
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../cafe/', import.meta.url);
const ctx = { window: {} }; ctx.CAFE = undefined;
vm.runInNewContext(fs.readFileSync(new URL('js/data.js', root), 'utf8').replace('window.CAFE =', 'CAFE = window.CAFE ='), ctx);
const CAFE = ctx.window.CAFE;

const C = '#f1e6d8', A = '#c8a26a';
const icons = {
  cup: `<ellipse cx="200" cy="232" rx="92" ry="16" fill="${C}" opacity=".18"/>
    <path d="M128 140h130l-12 78c-2 12-12 20-24 20h-58c-12 0-22-8-24-20z" fill="${C}" opacity=".9"/>
    <path d="M258 156c26 0 34 14 32 26-2 14-16 22-38 22" fill="none" stroke="${C}" stroke-width="10" opacity=".9"/>
    <ellipse cx="193" cy="142" rx="65" ry="10" fill="#6b4329"/>
    <path d="M170 120c-10-14 10-22 0-38M196 116c-10-14 10-22 0-38M222 120c-10-14 10-22 0-38" fill="none" stroke="${C}" stroke-width="5" stroke-linecap="round" opacity=".45"/>`,
  glass: `<path d="M150 90h100l-14 150h-72z" fill="${C}" opacity=".22" stroke="${C}" stroke-width="5"/>
    <path d="M156 140h88l-9 100h-70z" fill="#8a5a3a" opacity=".85"/>
    <rect x="170" y="120" width="26" height="26" rx="5" fill="#fff" opacity=".55" transform="rotate(-12 183 133)"/>
    <rect x="202" y="128" width="24" height="24" rx="5" fill="#fff" opacity=".45" transform="rotate(14 214 140)"/>
    <path d="M222 60l-12 120" stroke="${A}" stroke-width="8" stroke-linecap="round"/>`,
  tea: `<ellipse cx="200" cy="232" rx="92" ry="16" fill="${C}" opacity=".18"/>
    <path d="M130 150h120l-10 66c-2 12-12 22-26 22h-48c-14 0-24-10-26-22z" fill="${C}" opacity=".9"/>
    <ellipse cx="190" cy="152" rx="60" ry="9" fill="#a0612e"/>
    <path d="M232 152l14-70" stroke="${C}" stroke-width="2" opacity=".8"/><rect x="238" y="66" width="20" height="24" rx="3" fill="${A}"/>
    <path d="M110 110c20-30 60-30 70-6-24 22-56 24-70 6z" fill="#7da35a" opacity=".85"/>`,
  cake: `<ellipse cx="200" cy="236" rx="110" ry="16" fill="${C}" opacity=".18"/>
    <path d="M110 220l170-40v40z" fill="#f5e3c8"/><path d="M110 220V160l170-40v60z" fill="#5a3320"/>
    <path d="M110 182l170-40v14l-170 40z" fill="#f5e3c8" opacity=".9"/><path d="M110 160l170-40" stroke="${C}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="240" cy="112" r="14" fill="#b3263a"/><path d="M240 98c4-14 12-20 22-22" stroke="#6b8a3a" stroke-width="4" fill="none"/>`,
  plate: `<circle cx="200" cy="160" r="96" fill="${C}" opacity=".9"/><circle cx="200" cy="160" r="70" fill="none" stroke="#d9cbb6" stroke-width="3"/>
    <circle cx="186" cy="150" r="30" fill="#fff"/><circle cx="186" cy="150" r="13" fill="#f0a830"/>
    <path d="M222 178c10-6 26-4 30 6-10 8-24 8-30-6z" fill="#7da35a"/>
    <path d="M70 80v160M60 80v40c0 10 20 10 20 0V80M330 80c-14 20-14 60 0 70v90" stroke="${C}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".7"/>`,
};
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
function svg(id, icon, w = 400, h = 300) {
  const hh = 15 + hue(id) % 25; // warm hues only
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="g" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="hsl(${hh} 38% 30%)"/><stop offset="1" stop-color="hsl(${hh} 30% 9%)"/></radialGradient></defs>
<rect width="400" height="300" fill="url(#g)"/><g>${icons[icon]}</g></svg>`;
}
const out = new URL('img/', root);
fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const c of CAFE.categories) for (const i of c.items) { fs.writeFileSync(new URL(`${i.id}.svg`, out), svg(i.id, c.icon)); n++; }
// Hero / about scenes
fs.writeFileSync(new URL('hero.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="l" cx="70%" cy="20%" r="80%"><stop offset="0" stop-color="#7a4a26"/><stop offset=".5" stop-color="#2a1b12"/><stop offset="1" stop-color="#0f0b08"/></radialGradient>
<radialGradient id="b" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd59a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="600" fill="url(#l)"/>
<g fill="url(#b)"><circle cx="560" cy="120" r="90"/><circle cx="690" cy="200" r="60"/><circle cx="420" cy="80" r="50"/></g>
<path d="M560 0v80M690 0v150M420 0v40" stroke="#d9b98a" stroke-width="2" opacity=".5"/>
<rect x="0" y="470" width="800" height="130" fill="#1a110b"/><rect x="0" y="462" width="800" height="12" fill="#3b2617"/>
<g transform="translate(300 300) scale(1.05)">${icons.cup}</g></svg>`);
fs.writeFileSync(new URL('about.svg', out), svg('about-beans-x', 'cup', 800, 600).replace('viewBox="0 0 400 300"', 'viewBox="0 0 400 300"'));
console.log(`wrote ${n + 2} svgs to cafe/img/`);
