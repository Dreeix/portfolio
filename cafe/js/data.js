// All café content lives here: one source for every name, price and hour.
// Prices are in toman. Images: replace img/<id>.svg with real photos (same name, any extension -> update `img`).
window.CAFE = {
  name: 'کافه سایه',
  tagline: 'قهوه‌ی تخصصی، شب‌های آرام',
  // DEMO: placeholders only. Never put a real number/handle here unless it's the client's own.
  // demo: true makes every contact link show a notice instead of opening anything.
  demo: true,
  phone: '021-0000-0000',
  phoneHref: '',            // e.g. 'tel:+9821xxxxxxxx' for a real client
  address: 'تهران، خیابان شریعتی، بالاتر از پل صدر، کوچه نسترن، پلاک ۱۲',
  map: { lat: 35.7642, lng: 51.4437 },
  social: {
    instagram: '',          // e.g. 'https://instagram.com/<client>'
    telegram: '',           // e.g. 'https://t.me/<client>'
  },
  // day: 0 = Saturday ... 6 = Friday (Persian week). Times are 24h, `close` may pass midnight (e.g. 24 or 25).
  hours: [
    { day: 0, open: 8, close: 23 },
    { day: 1, open: 8, close: 23 },
    { day: 2, open: 8, close: 23 },
    { day: 3, open: 8, close: 23 },
    { day: 4, open: 8, close: 23 },
    { day: 5, open: 9, close: 24 },
    { day: 6, open: 9, close: 24 },
  ],
  // Owner panel (admin.html) password, SHA-256. Demo password: 1234 (shown on the login page while demo is true).
  // Client-side only: keeps casual visitors out, not real security. Edits stay in the visitor's own browser.
  adminHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  dayNames: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
  categories: [
    { id: 'hot', name: 'قهوه‌ی گرم', icon: 'cup', items: [
      { id: 'espresso', name: 'اسپرسو', desc: 'دبل شات، ترکیب ۷۰٪ عربیکا با کرمای غلیظ', price: 145000, tag: 'محبوب' },
      { id: 'americano', name: 'آمریکانو', desc: 'اسپرسو و آب داغ، ملایم و خوش‌عطر', price: 155000 },
      { id: 'cappuccino', name: 'کاپوچینو', desc: 'اسپرسو، شیر بخارداده و فوم مخملی', price: 185000, tag: 'محبوب' },
      { id: 'latte', name: 'لاته', desc: 'شیر بیشتر، طعم نرم، با لاته‌آرت', price: 190000 },
      { id: 'mocha', name: 'موکا', desc: 'اسپرسو، شکلات تلخ بلژیکی و شیر', price: 215000 },
      { id: 'cortado', name: 'کورتادو', desc: 'اسپرسو با کمی شیر گرم، متعادل', price: 170000 },
      { id: 'turkish', name: 'قهوه ترک', desc: 'دم‌شده روی شن داغ، همراه لوکوم', price: 160000 },
      { id: 'hotchoc', name: 'هات چاکلت', desc: 'شکلات ۵۴٪ ذوب‌شده در شیر', price: 195000 },
    ]},
    { id: 'cold', name: 'نوشیدنی سرد', icon: 'glass', items: [
      { id: 'icedlatte', name: 'آیس لاته', desc: 'اسپرسو روی یخ و شیر سرد', price: 210000, tag: 'محبوب' },
      { id: 'icedamericano', name: 'آیس آمریکانو', desc: 'اسپرسو، آب و یخ؛ خنک و سرحال', price: 175000 },
      { id: 'coldbrew', name: 'کلد برو', desc: '۱۸ ساعت دم سرد، شیرینی طبیعی دانه', price: 230000, tag: 'جدید' },
      { id: 'frappe', name: 'فراپه کارامل', desc: 'قهوه، شیر، یخ خردشده و سس کارامل', price: 245000 },
      { id: 'lemonade', name: 'لیموناد نعنا', desc: 'لیموی تازه، نعنای باغی و سودا', price: 165000 },
      { id: 'smoothie', name: 'اسموتی توت‌فرنگی', desc: 'توت‌فرنگی، موز و ماست یونانی', price: 225000 },
    ]},
    { id: 'tea', name: 'چای و دمنوش', icon: 'tea', items: [
      { id: 'blacktea', name: 'چای سیاه (قوری)', desc: 'چای لاهیجان دم‌کشیده برای دو نفر', price: 120000 },
      { id: 'masala', name: 'چای ماسالا', desc: 'چای، شیر، دارچین، هل و زنجبیل', price: 175000 },
      { id: 'herbal', name: 'دمنوش به‌لیمو', desc: 'به‌لیمو، بادرنجبویه و عسل', price: 140000 },
      { id: 'matcha', name: 'ماچا لاته', desc: 'ماچای ژاپنی درجه یک با شیر', price: 235000, tag: 'جدید' },
    ]},
    { id: 'cake', name: 'کیک و دسر', icon: 'cake', items: [
      { id: 'cheesecake', name: 'چیزکیک نیویورکی', desc: 'پنیر خامه‌ای، بیس بیسکویت، سس توت', price: 230000, tag: 'محبوب' },
      { id: 'chocake', name: 'کیک شکلاتی خیس', desc: 'گرم سرو می‌شود، با بستنی وانیل', price: 210000 },
      { id: 'tiramisu', name: 'تیرامیسو', desc: 'ماسکارپونه، اسپرسو و کاکائو', price: 245000 },
      { id: 'croissant', name: 'کروسان کره‌ای', desc: 'لایه‌لایه، تازه‌ی صبح', price: 135000 },
      { id: 'brownie', name: 'براونی', desc: 'شکلات تلخ و گردو', price: 165000 },
    ]},
    { id: 'breakfast', name: 'صبحانه', icon: 'plate', note: 'تا ساعت ۱۲ ظهر', items: [
      { id: 'omelette', name: 'املت', desc: 'گوجه‌ی تازه، نان سنگک داغ', price: 260000 },
      { id: 'english', name: 'صبحانه انگلیسی', desc: 'تخم‌مرغ، سوسیس، لوبیا، قارچ و نان تست', price: 420000 },
      { id: 'pancake', name: 'پنکیک', desc: 'سه لایه، شیره‌ی افرا و میوه‌ی فصل', price: 290000 },
      { id: 'shakshuka', name: 'شکشوکا', desc: 'تخم‌مرغ در سس گوجه و فلفل، با نان', price: 310000 },
    ]},
  ],
};
// Default image path per item
CAFE.categories.forEach(c => c.items.forEach(i => { i.img = i.img || `img/${i.id}.svg`; i.cat = c.id; }));
