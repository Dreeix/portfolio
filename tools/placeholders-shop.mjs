// Shop product illustrations: one flat-lay pastel drawing per product (from shop/js/data.js, colour = colors[0]) + hero.
// Same camera for all: straight-on flat lay, soft top-left light (gradient overlay), outline = darker shade of the colour,
// short offset drop shadow. Usage: node tools/placeholders-shop.mjs   → shop/img/<id>.svg (~2-4 KB each) + hero.svg
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../shop/img/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../shop/js/data.js', import.meta.url), 'utf8'), ctx);
const S = ctx.window.SHOP;

const ink = '#3b2f4a';
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

// Drawing kit for one colour. All shapes live on a 300x375 canvas centred on x=150.
const kit = c => {
  const L = mix(c, ink, .42), D = mix(c, ink, .1), H = mix(c, '#fff', .5);
  const piece = (d, fill = c) => `<path d="${d}" fill="${fill}" stroke="${L}"/><path d="${d}" fill="url(#sh)"/>`;
  const fill = (d, f, o = 1) => `<path d="${d}" fill="${f}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
  const ln = (d, w = 2, o = .45, dash) => `<path d="${d}" fill="none" stroke="${L}" stroke-width="${w}" stroke-opacity="${o}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const st = d => ln(d, 1.3, .6, '3 3'); // stitching
  return { c, L, D, H, piece, fill, ln, st };
};

const shapes = {
  tee(k, p) {
    const over = /over/.test(p.id);
    const body = over
      ? 'M122 78Q150 90 178 78L226 96Q254 116 268 178L232 192L216 152L218 306Q150 314 82 306L84 152L68 192L32 178Q46 116 74 96Z'
      : 'M126 80Q150 90 174 80L212 92Q238 104 254 152L226 170L206 142L208 298Q150 306 92 298L94 142L74 170L46 152Q62 104 88 92Z';
    const [nx, ny] = over ? [122, 78] : [126, 80];
    const neckIn = `M${nx} ${ny}Q150 ${ny + 12} ${300 - nx} ${ny}Q150 ${ny + 28} ${nx} ${ny}Z`;
    const flowers = over ? [[110, 140], [176, 128], [140, 196], [196, 214], [104, 244], [160, 270], [62, 168], [238, 168], [200, 290]]
      .map(([x, y], i) => `<use href="#fl" x="${x}" y="${y}" transform="rotate(${i * 37} ${x} ${y})"/>`).join('') : '';
    return k.piece(body) + k.fill(neckIn, k.D) + k.ln(`M${nx} ${ny}Q150 ${ny + 28} ${300 - nx} ${ny}`, 6, .25) +
      k.st(`M${nx + 6} ${ny + 3}Q150 ${ny + 34} ${294 - nx} ${ny + 3}`) +
      (over ? k.st('M228 184L262 170M72 184L38 170M86 296Q150 304 214 296') + k.ln('M218 98Q206 130 216 152M82 98Q94 130 84 152', 1.6, .35)
        : k.st('M224 162L250 146M76 162L50 146M94 288Q150 296 206 288')) +
      flowers + k.ln('M120 190Q130 236 116 282M184 170Q174 214 188 258M150 210Q156 246 146 284', 1.6, .22);
  },
  hoodie(k, p) {
    const zip = /zip/.test(p.id);
    const body = `M106 92Q150 ${zip ? 106 : 128} 194 92Q226 98 238 118L266 248L236 256L214 160L214 290L86 290L86 160L64 256L34 248L62 118Q74 98 106 92Z`;
    const cuffs = k.fill('M262 230L232 238L236 256L266 248Z', k.D) + k.fill('M38 230L68 238L64 256L34 248Z', k.D) +
      k.ln('M262 230L232 238M38 230L68 238', 1.6, .5);
    const hem = k.fill('M86 270H214V290H86Z', k.D) + k.ln('M86 270H214', 1.6, .5) +
      k.ln([96, 108, 120, 132, 144, 156, 168, 180, 192, 204].map(x => `M${x} 274v12`).join(''), 1, .3);
    if (zip) return k.piece(body) +
      k.piece('M116 70Q150 62 184 70L194 94Q150 110 106 94Z') + k.fill('M116 70Q150 62 184 70Q150 80 116 70Z', k.D) +
      cuffs + hem + k.ln('M150 76V270', 3, .7) + k.ln('M150 76V270', 5, .25, '1.5 2.5') +
      `<rect x="145" y="98" width="10" height="18" rx="3" fill="${k.L}"/>` +
      k.ln('M104 214L118 258M196 214L182 258', 2.4, .5) + k.ln('M124 150Q130 200 120 250M178 150Q170 200 182 250', 1.6, .22);
    return k.piece('M104 100Q96 44 150 40Q204 44 196 100Z') + k.fill('M128 100Q124 70 150 68Q176 70 172 100Q150 120 128 100Z', k.D) +
      k.piece(body) + cuffs + hem +
      k.piece('M106 206H194L206 262H94Z', k.D) + k.ln('M106 206L94 262M194 206L206 262', 2.2, .45) + k.st('M110 212H190') +
      `<path d="M140 116Q134 150 137 180M160 116Q166 150 163 180" fill="none" stroke="${k.L}" stroke-width="5"/><path d="M140 116Q134 150 137 180M160 116Q166 150 163 180" fill="none" stroke="#fff" stroke-width="3"/>` +
      `<rect x="134" y="178" width="6" height="11" rx="2" fill="${k.L}"/><rect x="160" y="178" width="6" height="11" rx="2" fill="${k.L}"/>` +
      k.ln('M118 140Q128 180 120 198M182 140Q172 180 180 198', 1.6, .22);
  },
  manto(k, p) {
    if (/kimono/.test(p.id)) return k.piece('M196 72L262 94L274 200L214 210L200 150Z') + k.piece('M104 72L38 94L26 200L86 210L100 150Z') +
      k.ln('M256 98L266 196M44 98L34 196', 6, .2) +
      k.piece('M120 62L180 62L202 72L204 340Q150 346 96 340L98 72Z') + k.fill('M120 62Q150 70 180 62L150 128Z', k.D) +
      `<path d="M120 62L150 128V340M180 62L150 128" fill="none" stroke="${k.L}" stroke-opacity=".35" stroke-width="10"/>` +
      `<path d="M120 62L150 128V340M180 62L150 128" fill="none" stroke="${k.H}" stroke-width="6"/>` +
      k.piece('M98 190H202V222H98Z', mix(k.c, ink, .2)) + k.fill('M150 196L168 236L158 240L146 210Z', mix(k.c, ink, .25)) +
      [[120, 260], [182, 280], [118, 310], [178, 160], [232, 140], [60, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${k.H}"/>`).join('') +
      k.ln('M124 230Q132 280 122 330M176 230Q168 280 180 330', 1.6, .22);
    return k.piece('M118 60L182 60Q214 66 226 84L256 236L230 244L212 150L224 340Q150 348 76 340L88 150L70 244L44 236L74 84Q86 66 118 60Z') +
      k.fill('M118 60Q150 72 182 60L150 112Z', k.D) +
      ['M118 60L150 112L128 106L106 68Z', 'M182 60L150 112L172 106L194 68Z'].map(d => k.fill(d, mix(k.c, ink, .04)) + k.ln(d, 2.4, 1)).join('') +
      k.ln('M150 112V340', 1.6, .5) + k.st('M156 114V338') +
      [140, 176, 252, 290].map(y => `<circle cx="150" cy="${y}" r="4.5" fill="${k.L}"/>`).join('') +
      k.piece('M89 198H211L210 214H90Z', k.D) + k.fill('M176 206L188 252L180 254L170 208Z', k.D) + k.ln('M176 206L188 252L180 254L170 208Z', 1.4, .5) +
      k.st('M232 226L254 220M68 226L46 220') + k.ln('M92 300L90 340M208 300L210 340', 1.6, .45) +
      k.ln('M118 230Q126 280 112 334M186 230Q178 280 190 334M112 110Q120 150 108 190', 1.6, .22);
  },
  pants(k, p) {
    if (/bag/.test(p.id)) {
      const ts = '#e6a36b';
      return k.piece('M104 58L196 58L204 120L224 330L160 334L150 150L140 334L76 330L96 120Z') +
        k.fill('M104 58H196L197 78H103Z', k.D) + k.ln('M103 78H197', 1.6, .5) +
        [112, 136, 164, 188].map(x => `<rect x="${x - 3}" y="55" width="6" height="26" rx="2" fill="${k.c}" stroke="${k.L}" stroke-width="1.4"/>`).join('') +
        `<circle cx="150" cy="68" r="4.5" fill="#c9a36a" stroke="${k.L}" stroke-width="1.2"/>` +
        `<path d="M162 78V128Q162 142 150 144M108 78Q118 108 98 114M192 78Q182 108 202 114M84 300L144 304M216 300L156 304" fill="none" stroke="${ts}" stroke-width="1.4" stroke-dasharray="3 3"/>` +
        k.ln('M150 78V148', 1.8, .5) + k.fill('M80 312L146 316L141 334L77 330Z', k.D) + k.fill('M220 312L154 316L159 334L223 330Z', k.D) +
        k.ln('M80 312L146 316M220 312L154 316', 1.6, .5) + k.ln('M118 160Q124 230 110 300M184 160Q176 230 190 300M124 120Q134 136 146 140', 1.6, .25);
    }
    return k.piece('M106 60L194 60L200 112L212 332L158 334L150 148L142 334L88 332L100 112Z') +
      k.fill('M106 60H194L195 84H105Z', k.D) + k.ln('M105 84H195', 1.6, .5) +
      k.ln([110, 118, 126, 134, 142, 158, 166, 174, 182, 190].map(x => `M${x} 63v18`).join(''), 1.2, .35) +
      `<path d="M146 76Q136 96 132 112M154 76Q164 96 168 112" fill="none" stroke="${k.H}" stroke-width="3"/>` +
      `<circle cx="146" cy="74" r="2.5" fill="${k.L}"/><circle cx="154" cy="74" r="2.5" fill="${k.L}"/>` +
      k.ln('M100 112L106 150M200 112L194 150', 2, .45) + k.ln('M124 150L118 330M176 150L182 330', 1.6, .3) +
      k.st('M90 322L144 324M210 322L156 324');
  },
  skirt(k) {
    const n = 12, xt = i => 116 + i * 68 / n, xb = i => 52 + i * 196 / n;
    const yb = i => 324 + 12 * (1 - ((xb(i) - 150) / 98) ** 2) + (i % 2 ? 6 : 0);
    const top = 70, hem = [...Array(n + 1).keys()].map(i => `${xb(i).toFixed(1)} ${yb(i).toFixed(1)}`);
    const out = `M${xt(0)} ${top}L${xt(n)} ${top}L${hem.reverse().join('L')}Z`;
    let strips = '';
    for (let i = 1; i < n; i += 2) strips += `M${xt(i).toFixed(1)} ${top}L${xt(i + 1).toFixed(1)} ${top}L${xb(i + 1).toFixed(1)} ${yb(i + 1).toFixed(1)}L${xb(i).toFixed(1)} ${yb(i).toFixed(1)}Z`;
    return k.piece(out) + k.fill(strips, k.L, .14) +
      k.ln([...Array(n - 1).keys()].map(i => `M${xt(i + 1).toFixed(1)} ${top}L${xb(i + 1).toFixed(1)} ${yb(i + 1).toFixed(1)}`).join(''), 1, .3) +
      k.piece('M112 52H188L189 72H111Z', k.D) + k.st('M114 58H186M114 66H186') +
      `<rect x="174" y="55" width="10" height="14" rx="3" fill="${k.L}"/>`;
  },
  scarf(k) {
    const fringe = (x0, x1, y0, y1) => [...Array(13).keys()].map(i => { const t = i / 12, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; return `M${x.toFixed(1)} ${y.toFixed(1)}l${(i % 3) - 1} 13`; }).join('');
    return `<path d="M150 64V46Q150 34 161 34Q171 34 171 44" fill="none" stroke="#a69aa8" stroke-width="3.5"/>` +
      k.piece('M134 74L216 74Q222 200 226 318L144 326Q140 200 134 74Z', k.D) + k.ln(fringe(144, 226, 326, 318), 1.6, .55) +
      k.piece('M90 70Q150 58 200 70Q192 190 198 300L96 312Q102 190 90 70Z') + k.ln(fringe(96, 198, 312, 300), 1.6, .65) +
      `<rect x="68" y="60" width="164" height="10" rx="5" fill="#d9bc95" stroke="#b39469" stroke-width="1.6"/>` +
      k.fill('M90 70Q150 58 200 70Q196 84 198 92Q150 80 94 92Z', k.H, .7) +
      k.ln('M118 96Q126 200 116 304M150 92Q144 200 152 306M178 96Q186 200 176 302', 1.6, .3) +
      k.st('M98 300L196 290M146 316L222 308');
  },
  bag(k) {
    const strap = (d, f) => `<path d="${d}" fill="none" stroke="${k.L}" stroke-width="14"/><path d="${d}" fill="none" stroke="${f}" stroke-width="10.5"/>`;
    return strap('M122 134Q120 54 158 54Q194 54 192 134', k.D) +
      k.piece('M74 128H226L234 314Q234 322 226 322H74Q66 322 66 314Z') +
      k.fill('M74 128H226L227 146H73Z', k.D) + k.st('M74 140H226') +
      strap('M108 136Q104 46 150 46Q196 46 192 136', k.c) +
      [108, 192].map(x => `<rect x="${x - 9}" y="132" width="18" height="22" fill="${k.c}" stroke="${k.L}" stroke-width="1.6"/><path d="M${x - 6} 136l12 14m0-14l-12 14" stroke="${k.L}" stroke-opacity=".5" stroke-width="1.2"/>`).join('') +
      k.piece('M104 204H196V280Q196 286 190 286H110Q104 286 104 280Z', k.D) + k.st('M104 214H196') +
      `<rect x="138" y="240" width="24" height="12" rx="2" fill="${k.L}" opacity=".45"/>` +
      k.ln('M84 160Q90 240 82 314M216 160Q210 240 218 314', 1.6, .22);
  },
  cap(k) {
    // three-quarter side view: crown dome on the left, brim pointing right and slightly down
    return k.piece('M66 236Q58 128 140 112Q214 106 226 214Q150 246 66 236Z') +
      k.piece('M210 206Q252 200 276 222Q270 240 236 244Q206 244 196 230Z', k.D) + k.fill('M208 222Q246 216 274 226Q266 238 236 240Q210 240 200 232Z', k.L, .18) +
      k.st('M214 214Q248 208 268 222') +
      k.ln('M140 112Q118 160 120 238M140 112Q178 150 184 232M140 112Q96 150 88 236', 1.6, .45) +
      k.st('M132 116Q110 170 112 238M148 114Q186 152 192 230') +
      `<ellipse cx="140" cy="112" rx="9" ry="5" fill="${k.c}" stroke="${k.L}" stroke-width="1.6"/>` +
      `<circle cx="108" cy="150" r="3" fill="${k.L}" opacity=".7"/><circle cx="170" cy="146" r="3" fill="${k.L}" opacity=".7"/>` +
      k.fill('M66 236Q150 246 226 214L228 222Q150 256 68 244Z', k.D) +
      `<use href="#fl" x="154" y="186" transform="scale(1.3)" transform-origin="154 186"/>`;
  },
};

// Flat-lay frame: background picked to contrast with the product colour, soft light, offset shadow.
const bgs = ['#ffe4ef', '#ece6ff', '#dff6ee', '#ffecdc', '#e2efff', '#f6f0e8'];
const dist = (a, b) => rgb(a).reduce((s, v, i) => s + (v - rgb(b)[i]) ** 2, 0);
const defs = c => `<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="${ink}" stop-opacity=".14"/></linearGradient>` +
  `<g id="fl"><circle cx="0" cy="-4" r="3.6"/><circle cx="3.8" cy="-1.2" r="3.6"/><circle cx="2.4" cy="3.3" r="3.6"/><circle cx="-2.4" cy="3.3" r="3.6"/><circle cx="-3.8" cy="-1.2" r="3.6"/><circle r="2" fill="${mix(c, '#e88aa8', .7)}"/></g>`;

S.products.forEach((p, i) => {
  const c = p.colors[0].hex;
  const bg = bgs.slice().sort((a, b) => dist(b, c) - dist(a, c))[i % 2];
  fs.writeFileSync(new URL(`${p.id}.svg`, dir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375" preserveAspectRatio="xMidYMid slice">
<defs>${defs(c)}<filter id="s"><feColorMatrix values="0 0 0 0 .23 0 0 0 0 .18 0 0 0 0 .29 0 0 0 .13 0"/></filter>
<g id="g" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="#fff">${shapes[p.shape](kit(c), p)}</g></defs>
<rect width="300" height="375" fill="${bg}"/><circle cx="236" cy="74" r="96" fill="#fff" opacity=".45"/>
<use href="#g" x="6" y="8" filter="url(#s)"/><use href="#g"/></svg>`);
});

const hero = [['tee', '#ffb3cf', 50, 'tee-basic'], ['hoodie', '#b9a6f5', 172, 'hoodie-cloud'], ['manto', '#9edfc6', 296, 'manto-linen'], ['tee', '#ffcfa8', 420, 'tee-over']];
fs.writeFileSync(new URL('hero.svg', dir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9e8"/><stop offset=".55" stop-color="#e6ddff"/><stop offset="1" stop-color="#d4f3e6"/></linearGradient>${defs('#ffffff')}</defs>
<rect width="600" height="420" fill="url(#g)"/><circle cx="90" cy="80" r="120" fill="#fff" opacity=".35"/><circle cx="520" cy="360" r="140" fill="#fff" opacity=".3"/>
<path d="M60 70 H540" stroke="${ink}" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
${hero.map(([s, c, x, id]) => `<path d="M${x + 82} 70v${id === 'hoodie-cloud' ? 42 : 54}" stroke="${ink}" stroke-opacity=".4" stroke-width="3"/><g transform="translate(${x} 84) scale(.55)" stroke-width="2.4" stroke-linejoin="round" fill="#fff">${shapes[s](kit(c), { id })}</g>`).join('')}
</svg>`);
console.log(`shop illustrations written: ${S.products.length} products + hero`);
