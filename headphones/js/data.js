// ALL content and numbers for the headphones demo. Edit here only.
// Fictional brand «آوانو» (not a real company). Prices in toman.
// Text tokens like {battery} are replaced by count-up numbers from `stats`.
window.HP = {
  demo: true,
  brand: 'آوانو',
  model: 'سکوت',
  name: 'آوانو سکوت',
  price: 24900000,
  installments: 4,        // «یا N قسط …» computed from price
  warrantyMonths: 18,
  threeKB: 175,           // approx. gzip size of the 3D engine, shown on the opt-in button
  contacts: { instagram: '', telegram: '' }, // demo: empty on purpose

  stats: { battery: 40, anc: 42, mics: 8, weight: 248, driver: 40, quickMin: 10, quickHours: 5, latency: 60 },

  colors: [
    { id: 'night', name: 'شب',      shell: '#26282e', band: '#2c2f36', accent: '#8a8f99', cushion: '#18191d', glow: '#6d7cff' },
    { id: 'sand',  name: 'شنی',     shell: '#d8d1c4', band: '#cfc7b8', accent: '#f1ece2', cushion: '#e9e3d8', glow: '#ffd29a' },
    { id: 'ocean', name: 'اقیانوسی', shell: '#24456e', band: '#2a4c78', accent: '#9cb7d9', cushion: '#1b2c44', glow: '#4aa8ff' },
    { id: 'sage',  name: 'مریمی',    shell: '#86997f', band: '#7d9077', accent: '#dfe7d6', cushion: '#5f6f5a', glow: '#9be38a' },
  ],

  // Scroll story. Each section = one screen (or `tall` screens). keys[].at = 0..1 through the section.
  // Pose: rx/ry/rz rotation (rad), s scale, ex explode 0..1, m/d = [x,y] place on mobile/desktop (-1..1 of the stage).
  story: [
    { id: 'top', eyebrow: 'تازه رسید', title: 'آوانو سکوت', text: 'هدفون بی‌سیم با حذف نویز فعال. دنیا را خاموش کن، موسیقی را روشن.',
      keys: [{ at: 0, rx: .18, ry: -.55, rz: .04, s: 1, ex: 0, m: [0, .36], d: [-.45, .02] }] },
    { id: 'design', eyebrow: 'طراحی', title: 'سبک، مثل هیچ‌چیز', text: 'بدنه‌ی آلومینیومی یکپارچه و قوس استیل ضدزنگ؛ فقط {weight} گرم.',
      keys: [{ at: 0, rx: .05, ry: .95, rz: -.06, s: 1.05, ex: 0, m: [0, .34], d: [-.45, 0] }] },
    { id: 'anc', eyebrow: 'حذف نویز فعال', title: 'سکوت، با یک لمس', text: '{mics} میکروفون صدای محیط را تا {anc} دسی‌بل کم می‌کنند؛ مترو، کافه یا هواپیما.',
      big: { stat: 'anc', unit: 'دسی‌بل' },
      keys: [{ at: 0, rx: .02, ry: 1.52, rz: 0, s: 1.15, ex: 0, m: [0, .34], d: [-.45, 0] }] },
    { id: 'inside', tall: 3, eyebrow: 'از درون', title: 'هر لایه، با دقت', text: 'درایور {driver} میلی‌متری با آهنربای نئودیمیوم، تراشه‌ی صوتی اختصاصی و بالشتک مموری‌فوم که ساعت‌ها راحت می‌ماند.',
      keys: [
        { at: 0, rx: .12, ry: .55, rz: 0, s: 1, ex: 0, m: [0, .34], d: [-.42, 0] },
        { at: .35, rx: .42, ry: .62, rz: .12, s: .78, ex: 1, m: [0, .36], d: [-.4, 0] },
        { at: .7, rx: .3, ry: .95, rz: .05, s: .78, ex: 1, m: [0, .36], d: [-.4, 0] },
        { at: 1, rx: .1, ry: 1.3, rz: 0, s: 1, ex: 0, m: [0, .34], d: [-.42, 0] },
      ] },
    { id: 'battery', eyebrow: 'باتری', title: 'یک بار شارژ، کل هفته', text: '{battery} ساعت پخش با یک بار شارژ. فقط {quickMin} دقیقه شارژ یعنی {quickHours} ساعت موسیقی.',
      big: { stat: 'battery', unit: 'ساعت' },
      keys: [{ at: 0, rx: .38, ry: -1.05, rz: .14, s: 1, ex: 0, m: [0, .34], d: [-.45, 0] }] },
    { id: 'colors', eyebrow: 'رنگ‌ها', title: 'رنگ خودت را انتخاب کن', text: 'چهار رنگ مات با آلومینیوم آنودایز؛ رنگ بالشتک‌ها هم با بدنه ست است.',
      picker: true,
      keys: [{ at: 0, rx: .12, ry: -.28, rz: 0, s: 1.12, ex: 0, m: [0, .34], d: [-.45, 0] }] },
  ],

  // Exploded-view parts (keys from js/model.js). pin: 'up'|'down' = also labelled on the 3D model with a leader line.
  parts: [
    { key: 'cap', label: 'درپوش آلومینیومی', pin: 'down' },
    { key: 'shell', label: 'بدنه‌ی کاپ' },
    { key: 'battery', label: 'باتری {battery} ساعته' },
    { key: 'pcb', label: 'تراشه‌ی صوتی' },
    { key: 'driver', label: 'درایور {driver} میلی‌متری', pin: 'up' },
    { key: 'cushion', label: 'بالشتک مموری‌فوم', pin: 'down' },
  ],

  specs: [
    { label: 'پخش موسیقی', stat: 'battery', unit: 'ساعت' },
    { label: 'حذف نویز', stat: 'anc', unit: 'دسی‌بل' },
    { label: 'وزن', stat: 'weight', unit: 'گرم' },
    { label: 'درایور', stat: 'driver', unit: 'میلی‌متر' },
    { label: 'میکروفون', stat: 'mics', unit: 'عدد' },
    { label: 'تأخیر حالت بازی', stat: 'latency', unit: 'میلی‌ثانیه' },
    { label: 'بلوتوث', value: '۵٫۴', unit: 'چندنقطه‌ای' },
    { label: 'شارژ', value: 'USB-C', unit: 'شارژ سریع' },
  ],
  box: ['هدفون آوانو سکوت', 'کیف حمل سخت', 'کابل USB-C', 'کابل صدای ۳٫۵ میلی‌متری', 'دفترچه‌ی راهنما'],
};
