// All shop content: one source for every name, price, size and contact. Prices in toman.
window.SHOP = {
  name: 'یاس',
  title: 'بوتیک یاس',
  tagline: 'لباس‌های نرم و رنگی برای هر روز',
  // DEMO: placeholders only. Never put a real number/handle here unless it's the client's own.
  // demo: true makes contact links show a notice, and checkout ends in a demo confirmation (no payment).
  demo: true,
  instagram: '',      // e.g. 'https://instagram.com/<client>'
  telegram: '',       // client's username without @
  whatsapp: '',       // international format without + (e.g. 98912xxxxxxx)
  freeShipFrom: 3000000,          // free post shipping when the cart subtotal reaches this
  maxQty: 10,                     // per cart line
  shipping: [
    { id: 'post', name: 'پست پیشتاز', price: 75000, eta: '۳ تا ۵ روز کاری', free: true },
    { id: 'courier', name: 'پیک (فقط تهران)', price: 120000, eta: 'همان روز' },
  ],
  perks: [['🚚', 'ارسال به سراسر ایران'], ['🔁', '۷ روز ضمانت تعویض'], ['🧵', 'پارچه‌ی باکیفیت']],
  categories: [
    { id: 'tee', name: 'تی‌شرت' },
    { id: 'hoodie', name: 'هودی و سویشرت' },
    { id: 'manto', name: 'مانتو' },
    { id: 'bottom', name: 'شلوار و دامن' },
    { id: 'acc', name: 'اکسسوری' },
  ],
  sizeOrder: ['S', 'M', 'L', 'XL', 'فری‌سایز'],
  sizeGuide: [['S', '۸۸–۹۲'], ['M', '۹۲–۹۶'], ['L', '۹۶–۱۰۲'], ['XL', '۱۰۲–۱۰۸']],   // chest (cm)
  // off = discount fraction (0.2 = 20%). soldOut = sizes listed but unavailable. shape = placeholder drawing (tools/placeholders-shop.mjs)
  products: [
    { id: 'tee-basic', cat: 'tee', shape: 'tee', name: 'تی‌شرت نخی بیسیک', price: 690000, isNew: true,
      colors: [{ name: 'صورتی', hex: '#ffb3cf' }, { name: 'سفید', hex: '#fbf8f4' }, { name: 'یاسی', hex: '#c7b6f7' }],
      sizes: ['S', 'M', 'L', 'XL'], soldOut: ['XL'], material: 'پنبه‌ی ۱۰۰٪', desc: 'یقه‌گرد، دوخت دوبل و پارچه‌ی نرم که بعد از شستشو آب نمی‌رود.' },
    { id: 'tee-over', cat: 'tee', shape: 'tee', name: 'تی‌شرت اورسایز گل‌دار', price: 890000, off: 0.2,
      colors: [{ name: 'هلویی', hex: '#ffcfa8' }, { name: 'نعنایی', hex: '#a9e6cf' }],
      sizes: ['M', 'L', 'XL'], material: 'پنبه‌ی ملانژ', desc: 'گشاد و راحت با چاپ گل کوچک روی سینه. مناسب برای ست با شلوار بگ.' },
    { id: 'hoodie-cloud', cat: 'hoodie', shape: 'hoodie', name: 'هودی ابری', price: 1690000, isNew: true,
      colors: [{ name: 'یاسی', hex: '#b9a6f5' }, { name: 'آبی آسمانی', hex: '#a9cdf7' }, { name: 'صورتی', hex: '#ffb9d2' }],
      sizes: ['S', 'M', 'L', 'XL'], soldOut: ['S'], material: 'دورس پنبه‌ای کرکی', desc: 'داخل کرکی و گرم، کلاه دولایه و جیب کانگورویی.' },
    { id: 'zip-sweat', cat: 'hoodie', shape: 'hoodie', name: 'سویشرت زیپ‌دار', price: 1850000, off: 0.15,
      colors: [{ name: 'نعنایی', hex: '#9edfc6' }, { name: 'کرم', hex: '#f3e6d3' }],
      sizes: ['M', 'L', 'XL'], material: 'دورس سه‌نخ', desc: 'زیپ فلزی، سرآستین کشی و رنگ ثابت.' },
    { id: 'manto-linen', cat: 'manto', shape: 'manto', name: 'مانتو کتان تابستانی', price: 2450000,
      colors: [{ name: 'کرم', hex: '#f1e3cc' }, { name: 'یاسی', hex: '#cbbcf6' }],
      sizes: ['S', 'M', 'L', 'XL'], material: 'کتان ۱۰۰٪', desc: 'سبک و خنک برای تابستان، با کمربند پارچه‌ای و جیب پهلو.' },
    { id: 'manto-kimono', cat: 'manto', shape: 'manto', name: 'مانتو کیمونویی', price: 2190000, off: 0.25,
      colors: [{ name: 'صورتی چرک', hex: '#f2b8c6' }, { name: 'آبی', hex: '#b4d3f5' }],
      sizes: ['فری‌سایز'], material: 'ویسکوز', desc: 'آستین گشاد و جلو باز، روی هر لباسی می‌نشیند.' },
    { id: 'pants-bag', cat: 'bottom', shape: 'pants', name: 'شلوار بگ جین روشن', price: 1590000, isNew: true,
      colors: [{ name: 'آبی روشن', hex: '#a9c8ec' }],
      sizes: ['S', 'M', 'L', 'XL'], soldOut: ['L'], material: 'جین نخی', desc: 'فاق بلند، پاچه‌ی گشاد و رنگ شسته‌ی ملایم.' },
    { id: 'pants-soft', cat: 'bottom', shape: 'pants', name: 'شلوار راحتی پارچه‌ای', price: 1190000,
      colors: [{ name: 'کرم', hex: '#efe2cf' }, { name: 'نعنایی', hex: '#aee3cf' }, { name: 'یاسی', hex: '#c9b9f5' }],
      sizes: ['S', 'M', 'L'], material: 'کرپ', desc: 'کمر کشی و پارچه‌ی خنک؛ هم برای خانه، هم بیرون.' },
    { id: 'skirt-pleat', cat: 'bottom', shape: 'skirt', name: 'دامن پلیسه بلند', price: 1350000, off: 0.1,
      colors: [{ name: 'صورتی', hex: '#ffc1d6' }, { name: 'آبی آسمانی', hex: '#b7d5f7' }],
      sizes: ['فری‌سایز'], material: 'حریر', desc: 'پلیسه‌ی ریز با آستر، کمر کشی و قد بلند.' },
    { id: 'scarf-cotton', cat: 'acc', shape: 'scarf', name: 'شال نخی ساده', price: 420000,
      colors: [{ name: 'هلویی', hex: '#ffd2b0' }, { name: 'یاسی', hex: '#cdbff7' }, { name: 'نعنایی', hex: '#b2e8d4' }],
      sizes: ['فری‌سایز'], material: 'نخ پنبه', desc: 'سبک و خوش‌دست، لبه‌ی ریشه‌دار.' },
    { id: 'bag-tote', cat: 'acc', shape: 'bag', name: 'کیف پارچه‌ای دوشی', price: 780000,
      colors: [{ name: 'کرم', hex: '#f0e2cb' }, { name: 'صورتی', hex: '#ffbdd4' }],
      sizes: ['فری‌سایز'], material: 'کرباس ضخیم', desc: 'جادار با جیب داخلی زیپ‌دار؛ لپ‌تاپ ۱۴ اینچ جا می‌شود.' },
    { id: 'cap-base', cat: 'acc', shape: 'cap', name: 'کلاه کپ', price: 390000, off: 0.3,
      colors: [{ name: 'یاسی', hex: '#bba8f5' }, { name: 'نعنایی', hex: '#a6e3cb' }],
      sizes: ['فری‌سایز'], material: 'کتان', desc: 'بند پشت قابل تنظیم و لبه‌ی نرم.' },
  ],
};
