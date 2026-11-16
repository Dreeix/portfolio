// Whole-portfolio check in as few browser launches as possible (no window): every page's __dbg.check() at phone (375) and
// desktop (1280) width, plus real-click flows per site (clicks actual DOM buttons, not dev shortcuts). Prints ✓/✗ text, exit 1 on any ✗.
// Usage: node tools/final-check.mjs [base=http://localhost:8080/] [only-page-substring]
// Two launches: light pages, then headphones with software WebGL. Each page's localStorage is restored after its flow.
import { launch, sleep, checkNoLeftovers } from './edge.mjs';

const base = (process.argv[2] || 'http://localhost:8080/').replace(/\/?$/, '/');
const only = process.argv[3] || '';

// Page-side helpers prepended to every flow: wait, click, ok(cond, label), set input value, demo-notice sweep.
const lib = `const out=[],w=ms=>new Promise(r=>setTimeout(r,ms)),$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const ok=(c,m)=>{out.push((c?'✓ ':'✗ ')+m);return c};
const click=async(el,ms=350)=>{if(!el)throw new Error('missing element');el.scrollIntoView({block:'center'});el.click();await w(ms)};
const type=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};
const on=el=>!!el&&el.classList.contains('on');
const demoSweep=async()=>{const ds=$$('[data-demo]');if(!ds.length)return ok(true,'no demo contact links on page');
 for(const a of ds){const t=$('#toast');if(t)t.textContent='';a.click();await w(120);const tt=$('#toast')?.textContent||'';
  ok(/نمایشی/.test(tt)&&!/^(tel:|https?:)/.test(a.getAttribute('href')||''),'demo notice: '+(a.dataset.demo||a.textContent.trim()))}};`;

const flows = {
  '': `const n=$$('.proj').length;ok(n===ME.projects.length,'homepage renders all '+n+' project cards');
    const r=await __dbg.site.checkLinks();ok(r.length===0,'checkLinks: '+(r.join('; ')||'every project/thumb/extra link OK'));`,
  'cafe/': `await demoSweep();`,
  'cafe/menu.html': `const all=$$('.m-item').length;ok(all>3,'menu items '+all);
    const word=$('.m-item').dataset.search.split(' ')[0];type($('#q'),word);await w(200);
    const vis=$$('.m-item').filter(e=>e.offsetParent).length;ok(vis>0&&vis<=all,'search «'+word+'» → '+vis+' item(s)');
    type($('#q'),'zzqq');await w(200);ok(!$('#empty').hidden,'search miss shows empty state');
    type($('#q'),'');await w(200);ok($$('.m-item').filter(e=>e.offsetParent).length===all,'clearing search restores all');
    const chips=$$('#chips .chip, #chips button');if(chips[2]){await click(chips[2],700);ok(true,'chip click ok');}
    await click($$('.m-item')[1]);ok(on($('#sheet'))&&$('#sheetTitle').textContent.trim().length>0,'item sheet opens: '+$('#sheetTitle').textContent.trim());
    ok(/تومان|[۰-۹]/.test($('#sheetPrice').textContent),'sheet shows price '+$('#sheetPrice').textContent.trim());
    await click($('#sheetX'));ok(!on($('#sheet')),'sheet closes (×)');
    await click($$('.m-item')[0]);$('#sheetBg').click();await w(300);ok(!on($('#sheet')),'sheet closes (backdrop)');`,
  'gym/': `const bills=$$('[data-bill]');if(bills.length>1){const p0=$('#planList').textContent;await click(bills[1]);ok($('#planList').textContent!==p0,'billing toggle changes prices');await click(bills[0]);}
    const books=$$('[data-book]');ok(books.length>0,'booking buttons '+books.length);
    for(const b of books.slice(0,4)){await click(b);const t=$('#sheetT').textContent.trim();ok(on($('#sheet'))&&t,'booking sheet: '+t);await click($('#sheetX'));ok(!on($('#sheet')),'sheet closes');}
    await click(books[0]);await demoSweep();await click($('#sheetX'));`,
  'barber/': `await click($('[data-svc]'),700);ok(!!$('[data-day]'),'service → day step');
    await click($$('[data-day]').find(b=>!b.disabled),700);const times=$$('[data-time]').filter(b=>!b.disabled);ok(times.length>0,'day → '+times.length+' free slot(s)');
    await click(times[0]);await click($('#next'),500);ok(!!$('#name'),'time → details step');
    type($('#name'),'تست');type($('#phone'),'0912');await w(100);ok($('#next').disabled,'next disabled with short phone');
    type($('#phone'),'09120000000');await w(100);ok(!$('#next').disabled,'valid name+phone enables next');
    await click($('#next'),500);ok(/۰۹۱۲/.test($('#panel').textContent),'confirm step shows phone');
    const before=Store.load().length;await click($('#next'),600);
    ok(/ثبت|رزرو شد|تأیید/.test($('#panel').textContent),'booking done screen');
    ok(Store.load().length===before+1,'booking stored');`,
  'barber/admin.html': `try{sessionStorage.clear()}catch{}
    const login=async pw=>{type($('#pw'),pw);$('#lf').requestSubmit();await w(500)};
    await login('0000');ok(/اشتباه/.test($('#panel').textContent),'wrong password rejected');
    await login('1234');ok(!$('#pw')&&$$('[data-tab]').length>0,'demo pw 1234 logs in');
    await click($('[data-tab=all]'),300);const n=$$('.bk').length;ok(n>0&&n===Store.load().length,'«همه» tab lists all '+n+' bookings');
    const bk=$$('.bk').find(b=>$('[data-act=done]',b)),id=bk?.dataset.id;await click($('[data-act=done]',bk),300);
    ok(Store.load().find(b=>b.id===id)?.status==='done','✓ marks booking done');
    await click($('[data-act=restore]',$('.bk[data-id="'+id+'"]')),300);ok(Store.load().find(b=>b.id===id)?.status==='booked','↺ restores it');
    await click($('[data-sec=services]'),300);const s0=$('[data-s="0"]');ok(!!s0,'services tab');
    type($('[data-f=price]',s0),'333000');type($('[data-f=dur]',s0),'45');await click($('#saveEdits'),400);
    ok(/ذخیره شد/.test($('#msg').textContent),'services saved: '+$('#msg').textContent.trim());
    let f=await __dbg.frame('index.html');ok(/۳۳۳٬۰۰۰/.test(f.document.querySelector('[data-svc="hair"]').textContent),'booking page shows the edited price');
    await click($('[data-sec=hours]'),300);type($('.ed[data-d="0"] [data-h=open]'),'12:00');await click($('#saveEdits'),400);
    if(/دوباره/.test($('#msg').textContent)){ok(true,'warns about bookings outside the new hours');await click($('#saveEdits'),400);}
    ok(/ذخیره شد/.test($('#msg').textContent),'hours saved');
    f=await __dbg.frame('index.html');const St=f.eval('Store'),sat=St.days().find((d,i)=>i>0&&(St.fromKey(d).getDay()+1)%7===0);
    ok(St.slots(sat,30,[])[0]===720,'booking page: Saturday slots now start 12:00');
    await click($('.ed[data-d="1"] [data-act=addBreak]'),300);type($$('.ed[data-d="1"] [data-bk="0"]').at(-1),'06:00');await click($('#saveEdits'),300);
    ok($('#msg').classList.contains('err'),'break outside hours refused: '+$('#msg').textContent.trim());
    await click($('#resetEdits'),150);await click($('#resetEdits'),300);ok(localStorage.getItem('barber.edits.v1')===null&&SHOP.hours[0].open==='10:00','two-tap reset restores the demo');
    __dbg.frameClose();await click($('[data-sec=bookings]'),300);
    await click($('#logout'),300);ok(!!$('#pw'),'logout returns to login');`,
  // Owner panels: wrong/right password, edit → save → public page (hidden frame) shows it, bad input refused, two-tap reset, logout
  'cafe/admin.html': `try{sessionStorage.clear()}catch{}
    const login=async pw=>{type($('#pw'),pw);$('#lf').requestSubmit();await w(500)};
    const saved=()=>/ذخیره شد/.test($('#msg').textContent), refused=()=>$('#msg').classList.contains('err');
    await login('0000');ok(/اشتباه/.test($('#panel').textContent),'wrong password rejected');
    await login('۱۲۳۴');ok(!$('#pw')&&!!$('.ad-item'),'demo pw ۱۲۳۴ logs in');
    type($('[data-f=name]',$('.ad-item')),'لاته آزمون');type($('[data-f=price]',$('.ad-item')),'۱۲۳٬۰۰۰');
    await click($('[data-f=soldOut]',$$('.ad-item')[1]),150);
    await click($('#save'),400);ok(saved(),'save: '+$('#msg').textContent.trim());
    let f=await __dbg.frame('menu.html');const m=f.document.querySelectorAll('.m-item');
    ok(/لاته آزمون/.test(m[0].textContent)&&/۱۲۳٬۰۰۰/.test(m[0].textContent),'menu shows edited name + price');
    ok(m[1].classList.contains('so')&&/تمام شد/.test(m[1].textContent),'menu shows «تمام شد»');
    type($('[data-f=price]',$('.ad-item')),'-5');await click($('#save'),300);ok(refused(),'negative price refused: '+$('#msg').textContent.trim());
    type($('[data-f=price]',$('.ad-item')),'123000');
    const n0=$$('.ad-item').length;await click($('[data-act=add]'),300);ok($$('.ad-item').length===n0+1,'«افزودن» adds a row');
    await click($('#save'),300);ok(refused(),'empty new item refused: '+$('#msg').textContent.trim());
    const nw=$$('.ad-item[data-c="0"]').at(-1);type($('[data-f=name]',nw),'قهوه جدید');type($('[data-f=price]',nw),'99000');
    const gone=$('[data-f=name]',$$('.ad-item')[2]).value;await click($('[data-act=del]',$$('.ad-item')[2]),300);
    await click($('#save'),400);ok(saved(),'add + remove saved');
    f=await __dbg.frame('menu.html');ok(/قهوه جدید/.test(f.document.querySelector('#hot').textContent)&&!f.document.querySelector('#hot').textContent.includes(gone),'menu shows the new item, not the removed «'+gone+'»');
    await click($('[data-view=hours]'),300);await click($('.ad-day[data-d="6"] [data-h=on]'),150);
    await click($('#save'),400);ok(saved(),'hours saved (Friday closed)');
    f=await __dbg.frame('index.html');ok(/تعطیل/.test(f.document.querySelectorAll('#hoursList li')[6].textContent),'landing shows Friday closed');
    type($('.ad-day[data-d="0"] [data-h=close]'),'5');await click($('#save'),300);ok(refused(),'close before open refused: '+$('#msg').textContent.trim());
    await click($('#reset'),150);ok(/مطمئن/.test($('#reset').textContent),'reset asks for a second tap');await click($('#reset'),300);
    ok(localStorage.getItem('cafe.edits.v1')===null&&/برگشت/.test($('#msg').textContent),'reset restores the demo');
    f=await __dbg.frame('menu.html');ok(!/لاته آزمون|قهوه جدید/.test(f.document.body.textContent)&&!f.document.querySelector('.m-item.so'),'menu back to the demo');__dbg.frameClose();
    await click($('#logout'),300);ok(!!$('#pw'),'logout returns to login');`,
  'shop/admin.html': `try{sessionStorage.clear()}catch{}
    const login=async pw=>{type($('#pw'),pw);$('#lf').requestSubmit();await w(500)};
    const saved=()=>/ذخیره شد/.test($('#msg').textContent), refused=()=>$('#msg').classList.contains('err');
    await login('1111');ok(/اشتباه/.test($('#panel').textContent),'wrong password rejected');
    await login('1234');ok(!$('#pw')&&$$('.ad-p').length===SHOP.products.length,'demo pw 1234 logs in, '+$$('.ad-p').length+' products');
    await click($('.ad-p summary'),300);let p=$('.ad-p[open]');ok(!!p,'product card opens');const id=SHOP.products[0].id;
    type($('[data-f=price]',p),'500000');type($('[data-f=off]',p),'۱۰');
    let b;while((b=$$('.ad-p[open] [data-sold][aria-pressed=false]')[0]))await click(b,120);
    await click($('#save'),400);ok(saved(),'save: '+$('#msg').textContent.trim());
    let f=await __dbg.frame('index.html');const c=f.document.querySelector('.card[data-id="'+id+'"]');
    ok(/۴۵۰٬۰۰۰/.test(c.textContent)&&/۵۰۰٬۰۰۰/.test(c.textContent),'store shows −10% of 500,000 = 450,000');
    ok(c.classList.contains('sold')&&/ناموجود/.test(c.textContent),'store marks the product sold out');
    await click($('[data-view=ship]'),300);type($$('[data-ship]')[0],'0');type($('#freeFrom'),'1000000');
    await click($('#save'),400);ok(saved(),'shipping saved');
    f=await __dbg.frame('index.html');const C2=f.Cart;C2.clear();C2.add('tee-over',C2.byId['tee-over'].colors[0].name,'M',1);
    let t=C2.totals('post');ok(t.sub===712000&&t.ship===0,'cart: post free at 0 → '+t.sub+' + '+t.ship);
    t=C2.totals('courier');ok(t.ship===120000&&t.total===832000,'cart: courier unchanged → total '+t.total);
    ok(/۱ میلیون/.test(f.document.querySelector('#freeShipPill').textContent),'store pill: '+f.document.querySelector('#freeShipPill').textContent);
    type($('#freeFrom'),'-1');await click($('#save'),300);ok(refused(),'negative threshold refused: '+$('#msg').textContent.trim());type($('#freeFrom'),'1000000');
    await click($('[data-view=products]'),300);await click($('[data-act=addProduct]'),300);p=$('.ad-p[open]');
    await click($('#save'),300);ok(refused(),'empty new product refused: '+$('#msg').textContent.trim());
    type($('[data-f=name]',p),'محصول تازه');type($('[data-f=price]',p),'250000');
    const lastSum=$$('.ad-p summary').at(-1),lastId=SHOP.products.at(-1).id;await click(lastSum,300);await click($('[data-act=delProduct]',lastSum.parentElement),300);
    await click($('#save'),400);ok(saved(),'add + remove product saved');
    f=await __dbg.frame('index.html');ok(/محصول تازه/.test(f.document.querySelector('#grid').textContent)&&!f.document.querySelector('.card[data-id="'+lastId+'"]'),'store shows the new product, not the removed '+lastId);
    await click($('#reset'),150);await click($('#reset'),300);ok(localStorage.getItem('shop.edits.v1')===null&&/برگشت/.test($('#msg').textContent),'two-tap reset restores the demo');
    f=await __dbg.frame('index.html');ok(f.document.querySelectorAll('.card').length===ShopEdits.defaults().products.length&&!f.document.querySelector('.card.sold'),'store back to the demo');__dbg.frameClose();
    await click($('#logout'),300);ok(!!$('#pw'),'logout returns to login');`,
  'shop/': `await demoSweep();
    await click($('[data-open]'),500);const sizes=$$('[data-size]').filter(b=>!b.disabled);ok(sizes.length>0,'product sheet sizes '+sizes.length);
    await click(sizes[0],150);const cols=$$('[data-color]');if(cols[1])await click(cols[1],150);
    const c0=$('#cartCount').textContent;await click($('#addBtn'),500);ok($('#cartCount').textContent!==c0&&!$('#cartCount').hidden,'add to cart updates badge '+$('#cartCount').textContent);
    $('#sheetBg')?.click();await w(400);await click($('#cartBtn'),500);ok(!!$('#toCheckout'),'cart sheet opens');
    const qp=$('[data-q="1"]');if(qp){const t0=$('.sheet').textContent;await click(qp,300);ok($('.sheet').textContent!==t0,'qty + updates cart');}
    await click($('#toCheckout'),500);const f=$('#coForm');ok(!!f,'checkout form');
    $('#payBtn').click();await w(300);ok($$('[data-err]').some(e=>e.textContent.trim()),'empty form shows errors');
    const vals={name:'تست نمونه',phone:'09120000000',city:'تهران',postal:'1234567890',address:'خیابان نمونه، پلاک ۱'};
    for(const[k,v]of Object.entries(vals)){const el=$('[name="'+k+'"]',f);if(el)type(el,v);}
    const ship=$('[name=ship]',f);if(ship&&!$('[name=ship]:checked',f)){ship.checked=true;ship.dispatchEvent(new Event('change',{bubbles:true}));}
    await click($('#payBtn'),700);ok(!!$('#doneBtn')&&/نمایشی/.test($('.sheet').textContent),'demo order confirmation');
    await click($('#doneBtn'),300);ok($('#cartCount').hidden,'cart empty after order');`,
  'headphones/': `const H=window.__hp;ok(!!H,'__hp present, mode '+H.mode+(H.reason?' ('+H.reason+')':''));
    for(const b of $$('[data-color]')){await click(b,250);ok(H.color().id===b.dataset.color,'colour '+b.dataset.color+' → '+$('#swName').textContent.trim());}
    await __dbg.site.go('inside',.35);await w(1800);
    const lbl=$$('#lbls > *').some(e=>+getComputedStyle(e).opacity>.5), pimg=($('#poster')?.src||'')+$$('#inside img').map(i=>i.src).join();
    ok(H.scene?lbl:/exploded/.test(pimg),'exploded view ('+(H.scene?'3D labels shown':'exploded poster')+')');
    $('#toast').textContent='';$('[data-buy]').click();await w(200);ok(/نمایشی/.test($('#toast').textContent),'buy shows demo toast');
    await demoSweep();`,
  'headphones/?poster': `const H=window.__hp;ok(H.mode!=='3d'&&!H.scene,'?poster → static fallback (mode '+H.mode+')');
    const p=$('#poster');ok(p&&p.complete&&p.naturalWidth>0,'poster image loaded '+(p?.src||'').split('/').pop());
    await click($$('[data-color]')[1],400);ok(/hp-/.test(p.src)&&p.src.includes(H.color().id),'poster follows colour');`,
};

const pages = ['', 'cafe/', 'cafe/menu.html', 'cafe/admin.html', 'gym/', 'barber/', 'barber/admin.html', 'shop/', 'shop/admin.html', 'headphones/', 'headphones/?poster'].filter(p => p.includes(only));
let bad = 0;
const runGroup = async (list, gl) => {
  if (!list.length) return;
  const b = await launch({ gl, timeoutMs: 60000 * list.length + 60000 });
  const { send, evalJs } = b;
  const load = async (url, width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width > 800 ? 900 : 812, deviceScaleFactor: 1, mobile: width < 800 });
    await send('Page.navigate', { url });
    await sleep(600);
    for (let t = 0; t < 40; t++) { await sleep(250); if (await evalJs('document.readyState==="complete"&&!!window.__dbg?.site')) break; }
    await evalJs('document.fonts.ready.then(() => 1)');
    await evalJs('window.__dbg?.site?.ready ? __dbg.site.ready().then(() => 1) : 1');
  };
  try {
    await send('Page.enable');
    for (const p of list) {
      const url = base + p;
      for (const width of p.includes('?') ? [375] : [375, 1280]) {
        await load(url, width);
        const rep = await evalJs('window.__dbg ? __dbg.check() : "✗ no __dbg (not localhost?)"');
        const fails = String(rep).split('\n').filter(l => /✗/.test(l) || /^\s+- /.test(l));
        console.log(`${fails.length ? '✗' : '✓'} ${p || 'home'} @${width}: __dbg.check()${fails.length ? '\n  ' + fails.join('\n  ') : ''}`);
        bad += fails.some(l => /✗/.test(l));
      }
      await load(url, 375);
      const res = await evalJs(`(async()=>{${lib}const snap=JSON.stringify(localStorage);try{${flows[p]}}catch(e){out.push('✗ flow error: '+e.message)}
        finally{localStorage.clear();Object.entries(JSON.parse(snap)).forEach(([k,v])=>localStorage.setItem(k,v))}return out.join('\\n')})()`);
      const lines = String(res).split('\n').map(l => '    ' + l);
      console.log(`  flow ${p || 'home'}:\n${lines.join('\n')}`);
      bad += lines.filter(l => /✗/.test(l)).length;
    }
  } finally { await b.close(); }
};
try {
  await runGroup(pages.filter(p => !p.startsWith('headphones')), false);
  await runGroup(pages.filter(p => p.startsWith('headphones')), true); // software WebGL only for the 3D page
} finally {
  if (!checkNoLeftovers()) bad++;
  console.log(bad ? `\n✗ ${bad} problem(s)` : '\n✓ all pages and flows passed');
  process.exit(bad ? 1 : 0);
}
