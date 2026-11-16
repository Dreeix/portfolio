// Gym dev hooks (localhost only, after ../dev/dev.js)
(() => {
  const G = GYM, g = window.__gym;
  window.__dbg.site = {
    name: 'gym',
    actions: {
      ...Object.fromEntries(G.plans.map(p => [`Book: ${p.id}`, () => g.book(p.id)])),
      'Book: free consult': () => g.book(''),
      'Close sheet': () => g.close(),
      'Billing: monthly': () => g.setMonths(1),
      'Billing: 3 months': () => g.setMonths(3),
      'Sliders 0 / 50 / 100': () => document.querySelectorAll('.ba').forEach((el, i) => g.setBA(el, [0, 50, 100][i % 3])),
    },
    checks: [
      function contacts() {
        const bad = [];
        if (G.demo) return [G.whatsapp, G.telegram, G.instagram].some(Boolean) ? ['demo mode but a real contact value is set in data.js'] : [];
        if (!/^98\d{10}$/.test(G.whatsapp)) bad.push(`whatsapp number not 98xxxxxxxxxx: ${G.whatsapp}`);
        if (!/^[a-zA-Z][\w]{4,31}$/.test(G.telegram)) bad.push(`telegram username invalid: ${G.telegram}`);
        return bad;
      },
      function prices() {
        return G.plans.flatMap(p => {
          const q = g.priceFor(p, 3), bad = [];
          if (!(p.price > 0 && p.price % 1000 === 0)) bad.push(`${p.id}: monthly price ${p.price}`);
          if (q % 1000 || q >= p.price * 3 || q <= p.price * 2) bad.push(`${p.id}: 3-month price ${q} looks wrong`);
          return bad;
        });
      },
      function bookingLinks() {
        const bad = [];
        for (const p of [...G.plans, { id: '' }]) {
          g.book(p.id);
          const a = document.getElementById('goWa'), msg = a.dataset.msg || '';
          if (G.demo ? !a.dataset.demo : !a.href.startsWith(`https://wa.me/${G.whatsapp}?text=`)) bad.push(`bad WA link for ${p.id || 'consult'}`);
          if (p.name && !msg.includes(p.name)) bad.push(`WA message misses plan name ${p.id}`);
        }
        g.close(); return bad;
      },
      function plansHaveFeatures() { return G.plans.filter(p => !p.features?.length).map(p => `${p.id} has no features`); },
      function oneStickyBar() { return document.querySelectorAll('.sticky').length === 1 ? [] : ['sticky bar count != 1']; },
    ],
  };
})();
