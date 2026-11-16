// Generates shop placeholder images: one pastel garment per product (from shop/js/data.js) + hero. Usage: node tools/placeholders-shop.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../shop/img/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../shop/js/data.js', import.meta.url), 'utf8'), ctx);
const S = ctx.window.SHOP;

const ink = '#3b2f4a';
// Garment shapes on a 300x375 canvas, centred around x=150
const shapes = {
  tee: c => `<path d="M105 95 L70 110 L45 160 L80 178 L95 150 L95 290 L205 290 L205 150 L220 178 L255 160 L230 110 L195 95 Q150 125 105 95Z" fill="${c}"/><path d="M118 98 Q150 118 182 98" stroke="${ink}" stroke-opacity=".25" stroke-width="3" fill="none"/>`,
  hoodie: c => `<path d="M110 92 Q150 60 190 92 L235 112 L262 230 L232 238 L212 160 L210 300 L90 300 L88 160 L68 238 L38 230 L65 112Z" fill="${c}"/><path d="M120 95 Q150 135 180 95" stroke="${ink}" stroke-opacity=".3" stroke-width="4" fill="none"/><rect x="115" y="225" width="70" height="40" rx="10" fill="${ink}" opacity=".08"/><path d="M140 112v40M160 112v40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  manto: c => `<path d="M118 70 L150 100 L182 70 L222 88 L258 250 L232 256 L212 170 L222 340 L78 340 L88 170 L68 256 L42 250 L78 88Z" fill="${c}"/><path d="M150 100 V340" stroke="${ink}" stroke-opacity=".25" stroke-width="3"/><path d="M95 205 H205" stroke="${ink}" stroke-opacity=".2" stroke-width="8"/>`,
  pants: c => `<path d="M100 60 H200 L218 330 H162 L150 140 L138 330 H82Z" fill="${c}"/><rect x="100" y="60" width="100" height="16" fill="${ink}" opacity=".12"/>`,
  skirt: c => `<path d="M112 80 H188 L238 320 Q150 340 62 320Z" fill="${c}"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${120 + i * 12} 96 L${82 + i * 27} 322" stroke="${ink}" stroke-opacity=".12" stroke-width="2"/>`).join('')}<rect x="112" y="72" width="76" height="18" rx="4" fill="${ink}" opacity=".12"/>`,
  scarf: c => `<path d="M95 70 Q150 40 205 70 L195 140 Q150 170 105 140Z" fill="${c}"/><path d="M110 135 L95 320 L135 320 L140 150Z" fill="${c}"/><path d="M100 300h30" stroke="${ink}" stroke-opacity=".25" stroke-width="4" stroke-dasharray="3 4"/>`,
  bag: c => `<path d="M115 140 Q115 70 150 70 Q185 70 185 140" stroke="${c}" stroke-width="12" fill="none"/><rect x="80" y="135" width="140" height="170" rx="22" fill="${c}"/><rect x="105" y="190" width="90" height="10" rx="5" fill="${ink}" opacity=".12"/>`,
  cap: c => `<path d="M80 210 Q80 110 150 110 Q220 110 220 210Z" fill="${c}"/><path d="M200 205 Q260 205 270 225 L205 228Z" fill="${c}"/><path d="M150 110 V210" stroke="${ink}" stroke-opacity=".2" stroke-width="3"/><circle cx="150" cy="112" r="7" fill="${ink}" opacity=".2"/>`,
};
const bgs = ['#ffe4ef', '#ece6ff', '#dff6ee', '#ffecdc', '#e2efff'];

S.products.forEach((p, i) => {
  const bg = bgs[i % bgs.length];
  fs.writeFileSync(new URL(`${p.id}.svg`, dir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375" preserveAspectRatio="xMidYMid slice">
<rect width="300" height="375" fill="${bg}"/><circle cx="240" cy="70" r="90" fill="#fff" opacity=".45"/><ellipse cx="150" cy="345" rx="95" ry="10" fill="${ink}" opacity=".06"/>
<g stroke="${ink}" stroke-opacity=".08" stroke-width="2">${shapes[p.shape](p.colors[0].hex)}</g></svg>`);
});

fs.writeFileSync(new URL('hero.svg', dir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9e8"/><stop offset=".55" stop-color="#e6ddff"/><stop offset="1" stop-color="#d4f3e6"/></linearGradient></defs>
<rect width="600" height="420" fill="url(#g)"/><circle cx="90" cy="80" r="120" fill="#fff" opacity=".35"/><circle cx="520" cy="360" r="140" fill="#fff" opacity=".3"/>
<path d="M60 70 H540" stroke="${ink}" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
${[['tee', '#ffb3cf', 70], ['hoodie', '#b9a6f5', 200], ['manto', '#9edfc6', 330], ['tee', '#ffcfa8', 440]].map(([s, c, x]) =>
  `<path d="M${x + 75} 70 v14" stroke="${ink}" stroke-opacity=".4" stroke-width="3"/><g transform="translate(${x} 60) scale(.5)" stroke="${ink}" stroke-opacity=".08" stroke-width="3">${shapes[s](c)}</g>`).join('')}
</svg>`);
console.log(`shop placeholders written: ${S.products.length} products + hero`);
