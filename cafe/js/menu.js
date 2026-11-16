// QR menu page: category chips with scroll-spy, search, item bottom sheet
(() => {
  const cats = CAFE.categories;
  renderStatus();
  setInterval(renderStatus, 60000);

  $('#chips').innerHTML = cats.map(c => `<a class="chip" href="#${c.id}" data-cat="${c.id}">${c.name}</a>`).join('');
  $('#menu').innerHTML = cats.map(c => `
    <section class="m-cat" id="${c.id}">
      <h2>${c.name}${c.note ? `<small>${c.note}</small>` : ''}</h2>
      ${c.items.map(i => `
      <button class="m-item${i.soldOut ? ' so' : ''}" data-id="${i.id}" data-search="${i.name} ${i.desc}">
        <img src="${i.img}" alt="${i.name}" width="84" height="84" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='img/new-${i.cat}.svg'">
        <div class="t"><h3>${i.name}${i.soldOut ? '<em class="out">تمام شد</em>' : i.tag ? `<em>${i.tag}</em>` : ''}</h3><p>${i.desc}</p><div class="price">${priceHTML(i.price)}</div></div>
      </button>`).join('')}
    </section>`).join('');

  // Scroll-spy: highlight the chip of the section under the sticky header
  const chips = $$('.chip'), secs = $$('.m-cat');
  function spy() {
    const y = $('.m-hdr').offsetHeight + 20;
    let cur = secs.filter(s => !s.hidden)[0];
    for (const s of secs) if (!s.hidden && s.getBoundingClientRect().top <= y) cur = s;
    chips.forEach(ch => {
      const on = cur && ch.dataset.cat === cur.id;
      if (on && !ch.classList.contains('on')) ch.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      ch.classList.toggle('on', on);
    });
  }
  addEventListener('scroll', spy, { passive: true }); spy();

  // Search (tolerates Arabic ي/ك and zero-width non-joiner)
  const norm = s => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').toLowerCase();
  $('#q').addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    let any = false;
    secs.forEach(s => {
      let vis = 0;
      $$('.m-item', s).forEach(it => { const ok = !q || norm(it.dataset.search).includes(q); it.hidden = !ok; vis += ok; });
      s.hidden = !vis; any ||= !!vis;
    });
    $('#empty').hidden = any; spy();
  });

  // Bottom sheet
  const byId = Object.fromEntries(cats.flatMap(c => c.items).map(i => [i.id, i]));
  const sheet = $('#sheet'), bg = $('#sheetBg');
  function open(i) {
    $('#sheetImg').src = i.img; $('#sheetImg').onerror = e => { e.target.onerror = null; e.target.src = `img/new-${i.cat}.svg`; }; $('#sheetImg').alt = i.name;
    $('#sheetTitle').textContent = i.name; $('#sheetDesc').textContent = i.desc; $('#sheetPrice').innerHTML = priceHTML(i.price) + (i.soldOut ? '<em class="out">فعلاً تمام شده</em>' : '');
    sheet.classList.add('on'); bg.classList.add('on'); document.body.style.overflow = 'hidden'; $('#sheetX').focus();
  }
  const close = () => { sheet.classList.remove('on'); bg.classList.remove('on'); document.body.style.overflow = ''; };
  $('#menu').addEventListener('click', e => { const b = e.target.closest('.m-item'); if (b) open(byId[b.dataset.id]); });
  bg.onclick = close; $('#sheetX').onclick = close;
  addEventListener('keydown', e => e.key === 'Escape' && close());

  window.__cafeMenu = { open: id => open(byId[id]), close }; // used by dev tools
})();
