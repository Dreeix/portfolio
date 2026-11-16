// Writes the link-preview block (canonical + Open Graph + Twitter, ABSOLUTE URLs) into every page, between
// <!-- og: tools/og-tags.mjs --> … <!-- /og -->. Title/description come from the page's own <title> and meta description
// (one source) unless PAGES overrides them. Images: node tools/og.mjs. Dev check `ogTags` (dev/dev.js) verifies the result.
// Usage: node tools/og-tags.mjs   (re-run after changing a page title/description or adding a page)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://dreeix.github.io/portfolio/';
const DEMO = ' · نمونه‌کار طراحی سایت Dreeix';
// page → { url (path under SITE), img, desc?/title? overrides, alt, noCanonical }
const PAGES = {
  'index.html': { url: '', img: 'assets/img/og.jpg', title: 'مانی (Dreeix) | طراحی سایت برای کسب‌وکارهای کوچک',
    desc: 'سایت‌های سریع، فارسی و موبایل‌محور برای کسب‌وکارهای کوچک: کافه با منوی QR، نوبت‌دهی آرایشگاه، فروشگاه لباس و معرفی محصول سه‌بعدی. پنل مدیر هر نمونه را خودتان امتحان کنید.',
    alt: 'نمونه‌کارهای طراحی سایت Dreeix' },
  'cafe/index.html': { url: 'cafe/', img: 'cafe/img/og.jpg', alt: 'کافه سایه، وب‌سایت کافه با منوی QR', demo: true },
  'cafe/menu.html': { url: 'cafe/menu.html', img: 'cafe/img/og.jpg', alt: 'منوی QR کافه سایه', demo: true },
  'cafe/admin.html': { url: 'cafe/admin.html', img: 'cafe/img/og.jpg', alt: 'پنل مدیر کافه سایه',
    desc: 'پنل نمایشی صاحب کافه: منو، قیمت‌ها، «تمام شد» و ساعت کاری را خودتان عوض کنید (رمز ۱۲۳۴). تغییرات فقط در مرورگر خودتان می‌ماند.' },
  'gym/index.html': { url: 'gym/', img: 'gym/img/og.jpg', alt: 'آرش.فیت، لندینگ مربی بدنسازی', demo: true },
  'barber/index.html': { url: 'barber/', img: 'barber/img/og.jpg', alt: 'آرایشگاه تیغ، رزرو آنلاین نوبت', demo: true },
  'barber/admin.html': { url: 'barber/admin.html', img: 'barber/img/og.jpg', alt: 'پنل مدیر آرایشگاه تیغ',
    desc: 'پنل نمایشی آرایشگاه: نوبت‌ها، قیمت و مدت خدمات و ساعت کاری را خودتان مدیریت کنید (رمز ۱۲۳۴). تغییرات فقط در مرورگر خودتان می‌ماند.' },
  'shop/index.html': { url: 'shop/', img: 'shop/img/og.jpg', alt: 'بوتیک یاس، فروشگاه آنلاین لباس', demo: true },
  'shop/admin.html': { url: 'shop/admin.html', img: 'shop/img/og.jpg', alt: 'پنل مدیر بوتیک یاس',
    desc: 'پنل نمایشی فروشگاه: محصول، قیمت، تخفیف، رنگ و سایز و هزینه‌ی ارسال را خودتان عوض کنید (رمز ۱۲۳۴). تغییرات فقط در مرورگر خودتان می‌ماند.' },
  'headphones/index.html': { url: 'headphones/', img: 'headphones/img/og.jpg', alt: 'آوانو سکوت، معرفی سه‌بعدی هدفون', demo: true },
  '404.html': { url: '', img: 'assets/img/og.jpg', alt: 'نمونه‌کارهای طراحی سایت Dreeix', noCanonical: true,
    title: 'صفحه پیدا نشد | Dreeix', desc: 'این صفحه پیدا نشد. نمونه‌کارهای طراحی سایت Dreeix را از صفحه‌ی اصلی ببینید.' },
};

const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const unattr = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
let changed = 0;
for (const [page, o] of Object.entries(PAGES)) {
  const file = path.join(root, page);
  let html = fs.readFileSync(file, 'utf8');
  const title = o.title || unattr(html.match(/<title>([^<]*)<\/title>/)?.[1] || '');
  const desc = (o.desc || unattr(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '')) + (o.demo ? DEMO : '');
  if (!title || !desc) throw new Error(`${page}: no title/description`);
  const url = SITE + o.url, img = SITE + o.img;
  const block = ['<!-- og: tools/og-tags.mjs -->',
    o.noCanonical ? '' : `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Dreeix">', '<meta property="og:locale" content="fa_IR">',
    `<meta property="og:url" content="${url}">`, `<meta property="og:title" content="${attr(title)}">`, `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:image" content="${img}">`, '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', `<meta property="og:image:alt" content="${attr(o.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${attr(title)}">`,
    `<meta name="twitter:description" content="${attr(desc)}">`, `<meta name="twitter:image" content="${img}">`, '<!-- /og -->'].filter(Boolean).join('\n');
  const before = html;
  // drop hand-written og/twitter tags outside the block, then replace or insert the block
  html = html.replace(/^<meta (property="og:|name="twitter:)[^>]*>\r?\n/gm, '');
  if (/<!-- og: tools\/og-tags\.mjs -->[\s\S]*?<!-- \/og -->/.test(html)) html = html.replace(/<!-- og: tools\/og-tags\.mjs -->[\s\S]*?<!-- \/og -->/, () => block);
  else {
    const at = html.match(/<meta name="theme-color"[^>]*>\r?\n/) || html.match(/<\/title>\r?\n/);
    if (!at) throw new Error(`${page}: no place for the block`);
    html = html.replace(at[0], m => m + block + '\n');
  }
  if (html !== before) { fs.writeFileSync(file, html); changed++; console.log(`✓ ${page}`); } else console.log(`· ${page} up to date`);
}
console.log(`${changed} page(s) updated`);
