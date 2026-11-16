// Shared helpers for index.html and menu.html
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const faNum = n => Number(n).toLocaleString('fa-IR');
const faHour = h => (h % 24 === 0 && h > 0 ? '۲۴' : faNum(h % 24)) + ':۰۰';
const priceHTML = p => `${faNum(p)}<small>تومان</small>`;

// Current time in Tehran. Dev can override with window.__now = new Date(...)
function tehranNow() {
  const d = window.__now || new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(d).map(p => [p.type, p.value]));
  const js = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { day: (js + 1) % 7, hour: +parts.hour + +parts.minute / 60 }; // day: 0 = Saturday
}

// { open: bool, text: string, today: dayIndex }
function openStatus() {
  const { day, hour } = tehranNow();
  const H = CAFE.hours, today = H.find(h => h.day === day), yest = H.find(h => h.day === (day + 6) % 7);
  if (yest && yest.close > 24 && hour < yest.close - 24) return { open: true, text: `باز است · تا ساعت ${faHour(yest.close)}`, today: day };
  if (today && hour >= today.open && hour < today.close) return { open: true, text: `باز است · تا ساعت ${faHour(today.close)}`, today: day };
  if (today && hour < today.open) return { open: false, text: `بسته است · امروز از ساعت ${faHour(today.open)}`, today: day };
  const next = H.find(h => h.day === (day + 1) % 7);
  return { open: false, text: `بسته است · فردا از ساعت ${faHour(next.open)}`, today: day };
}

function renderStatus() {
  const s = openStatus();
  $$('[data-status]').forEach(el => { el.classList.toggle('open', s.open); el.innerHTML = `<i></i>${s.text}`; });
  return s;
}

// Dev layer: only on local machines, never on the live site
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const s = document.createElement('script'); s.src = '../dev/dev.js'; s.onload = () => { const c = document.createElement('script'); c.src = 'js/dev-cafe.js'; document.body.append(c); };
  document.head.append(s);
}
