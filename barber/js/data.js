// All barbershop settings: one source for services, prices (toman), hours and admin password.
window.SHOP = {
  name: 'آرایشگاه تیغ',
  tagline: 'نوبت آنلاین، بدون انتظار',
  address: 'تهران، ستارخان، نرسیده به فلکه دوم، پلاک ۴۰',
  demo: true,                    // demo: seeds sample bookings, shows admin password hint, no real contact links
  slotStep: 30,                  // minutes between start times
  daysAhead: 14,                 // how many days can be booked
  minLeadMinutes: 30,            // can't book a slot starting sooner than this
  // day: 0 = Saturday ... 6 = Friday. null = closed. Times "HH:MM".
  hours: [
    { open: '10:00', close: '21:00', breaks: [['14:00', '15:00']] },
    { open: '10:00', close: '21:00', breaks: [['14:00', '15:00']] },
    { open: '10:00', close: '21:00', breaks: [['14:00', '15:00']] },
    { open: '10:00', close: '21:00', breaks: [['14:00', '15:00']] },
    { open: '10:00', close: '21:00', breaks: [['14:00', '15:00']] },
    { open: '10:00', close: '18:00', breaks: [] },
    null,
  ],
  services: [
    { id: 'hair', name: 'اصلاح مو', dur: 30, price: 350000, icon: '✂️', desc: 'کوتاهی، شست‌وشو و حالت‌دهی' },
    { id: 'beard', name: 'اصلاح ریش', dur: 30, price: 200000, icon: '🪒', desc: 'خط‌گیری، فرم‌دهی و حوله‌ی داغ' },
    { id: 'combo', name: 'مو + ریش', dur: 60, price: 480000, icon: '💈', desc: 'پکیج کامل با تخفیف', popular: true },
    { id: 'fade', name: 'فید تخصصی', dur: 60, price: 450000, icon: '🔥', desc: 'اسکین‌فید، تیپر یا لو‌فید' },
    { id: 'color', name: 'رنگ مو', dur: 90, price: 900000, icon: '🎨', desc: 'رنگ و مش، با مشاوره‌ی رنگ' },
    { id: 'kids', name: 'اصلاح کودک', dur: 30, price: 250000, icon: '🧒', desc: 'زیر ۱۲ سال' },
  ],
  // SHA-256 of the admin password. Demo password: 1234. Change with:
  // node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode('NEWPASS')).then(b=>console.log(Buffer.from(b).toString('hex')))"
  // NOTE: client-side only = keeps casual visitors out, not real security. A real shop needs a server.
  adminHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
};
