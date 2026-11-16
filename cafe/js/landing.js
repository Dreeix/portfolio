// Landing page: featured items, hours, location, QR, reveal animations
(() => {
  const C = CAFE;
  const all = C.categories.flatMap(c => c.items);

  $('#featuredGrid').innerHTML = all.filter(i => i.tag === 'محبوب').slice(0, 4).map(i => `
    <a class="card rv" href="menu.html#${i.cat}">
      <div class="card-img"><img src="${i.img}" alt="${i.name}" width="400" height="300" loading="lazy" decoding="async"><span class="tag">${i.tag}</span></div>
      <div class="card-body"><h3>${i.name}</h3><p>${i.desc}</p><div class="price">${priceHTML(i.price)}</div></div>
    </a>`).join('');

  const st = renderStatus();
  setInterval(renderStatus, 60000);
  $('#hoursList').innerHTML = C.hours.map(h => `<li class="${h.day === st.today ? 'today' : ''}"><span>${C.dayNames[h.day]}</span><span class="num">${faHour(h.open)} تا ${faHour(h.close)}</span></li>`).join('');

  $('#addr').textContent = C.address;
  $('#phone').textContent = C.phone.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  $('#phone').href = C.phoneHref;
  $('#ig').href = C.social.instagram;
  $('#tg').href = C.social.telegram;
  const { lat, lng } = C.map;
  $('#route').innerHTML = [
    ['نشان', `https://neshan.org/maps/@${lat},${lng},16z`],
    ['بلد', `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=16`],
    ['گوگل مپ', `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`],
  ].map(([n, u]) => `<a class="btn btn-ghost" href="${u}" target="_blank" rel="noopener">مسیریابی با ${n}</a>`).join('');

  // Lazy things: map iframe and QR library load only when scrolled near
  const lazy = (el, fn) => new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: '300px' }).observe(el);
  lazy($('#map'), () => {
    const d = 0.006, f = document.createElement('iframe');
    f.title = 'نقشه‌ی موقعیت کافه'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
    f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
    f.onload = () => $('#map .map-load')?.remove();
    $('#map').append(f);
  });
  lazy($('#qrBox'), () => {
    const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js';
    s.onload = () => {
      const q = qrcode(0, 'M'); q.addData(new URL('menu.html', location.href).href); q.make();
      $('#qrBox').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    };
    document.head.append(s);
  });

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));
})();
