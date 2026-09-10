'use strict';
/* ── Luma — Shared base JS (runs on every page) ─────────────────────── */
window.S = window.S || {
  cart:[], wishlist:new Set(), compareList:[],
  user:null, token:localStorage.getItem('luma_token')||null,
  promoApplied:null, votedReviews:new Set(),
};

const $ = id => document.getElementById(id);
window.$ = $;

window.api = async (m, p, b) => {
  const headers = {'Content-Type':'application/json'};
  if (S.token) headers['x-auth-token'] = S.token;
  const r = await fetch(p, {method:m, headers, body: b?JSON.stringify(b):undefined});
  return r.json();
};

let toastT;
window.toast = (msg, type='') => {
  clearTimeout(toastT);
  const el = $('toast');
  if (!el) return;
  el.textContent = msg; el.className = `toast show ${type}`;
  toastT = setTimeout(() => el.className='toast', 2800);
};

window.fmt  = p  => `£${parseFloat(p).toFixed(2)}`;
window.pct  = (o,c) => Math.round((1-c/o)*100);
window.star = r => { const f=Math.floor(r),h=r%1>=.5; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-(h?1:0)); };
window.rnum = n => n>=1000?`${(n/1000).toFixed(1)}k`:n;

/* ── Nav active state ─────────────────────────────────────────────────── */
function setNavActive() {
  const path = window.location.pathname;
  document.querySelectorAll('.hnav-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', path.startsWith('/' + btn.dataset.page));
  });
}

/* ── Cart ─────────────────────────────────────────────────────────────── */
window.refreshCart = async () => {
  const d = await api('GET', '/api/cart');
  S.cart = d.items || [];
  renderCart();
};

window.addToCart = async (id, qty, btn) => {
  if (btn) { btn.classList.add('adding'); btn.textContent = '✓ Added'; }
  const d = await api('POST', '/api/cart', {productId:id, quantity:qty});
  if (d.error) toast(d.error, 'err');
  else { toast('Added to cart', 'ok'); await refreshCart(); bumpBadge(); }
  if (btn) setTimeout(() => { btn.classList.remove('adding'); btn.textContent = 'Add to cart'; }, 1400);
};

window.removeFromCart = async (id) => {
  await api('DELETE', `/api/cart/${id}`);
  toast('Removed from cart');
  await refreshCart();
};

function bumpBadge() {
  const b = $('cartBadge'); if (!b) return;
  b.classList.remove('bump');
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('bump')));
  setTimeout(() => b.classList.remove('bump'), 300);
}

function renderCart() {
  const items = S.cart;
  const count = items.reduce((s,i)=>s+i.quantity,0);
  const sub   = items.reduce((s,i)=>s+i.price*i.quantity,0);
  const badge = $('cartBadge'); if (badge) badge.textContent = count;
  const hcount = $('cartHCount'); if (hcount) hcount.textContent = count ? `(${count})` : '';

  const body = $('cartItems');
  if (!body) return;
  if (!items.length) {
    body.innerHTML = `<div class="pempty"><span class="pe-icon">◻</span><p>Your cart is empty</p><p class="pempty-sub">Browse and add something you like</p></div>`;
    const foot = $('cartFoot'); if (foot) foot.style.display='none';
    return;
  }

  body.innerHTML = items.map(item => `
    <div class="ci">
      <span class="ci-em">${item.emoji||'📦'}</span>
      <div class="ci-info">
        <p class="ci-name">${item.name}</p>
        <p class="ci-price">${fmt(item.price)} · ${fmt(item.price*item.quantity)}</p>
      </div>
      <div class="ci-ctrl">
        <button class="qb" data-action="dec" data-id="${item.productId}">−</button>
        <span class="qn">${item.quantity}</span>
        <button class="qb" data-action="inc" data-id="${item.productId}">+</button>
        <button class="ci-rm" data-id="${item.productId}">✕</button>
      </div>
    </div>`).join('');

  body.querySelectorAll('.qb').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id), item = S.cart.find(i=>i.productId===id);
      if (!item) return;
      if (btn.dataset.action==='inc') await addToCart(id,1);
      else if (item.quantity<=1) await removeFromCart(id);
      else { await api('DELETE',`/api/cart/${id}`); await api('POST','/api/cart',{productId:id,quantity:item.quantity-1}); await refreshCart(); }
    });
  });
  body.querySelectorAll('.ci-rm').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
  });

  let disc = 0;
  if (S.promoApplied==='LUMA10') disc = sub*0.10;
  const free = sub>=45, total = sub-disc+(free?0:4.99);
  const sub_el=$('cartSub'), dl=$('deliveryLine'), tot=$('cartTotal'), foot=$('cartFoot');
  if (sub_el) sub_el.textContent = fmt(sub);
  if (dl) { dl.textContent=free?'Free':fmt(4.99); dl.className=free?'free-tag':''; }
  if (tot) tot.textContent = fmt(total);
  if (foot) foot.style.display = 'block';
}

/* ── Wishlist ─────────────────────────────────────────────────────────── */
window.toggleWishlist = (id, products) => {
  if (S.wishlist.has(id)) { S.wishlist.delete(id); toast('Removed from saved'); }
  else { S.wishlist.add(id); toast('Saved ❤', 'ok'); }
  renderWishlist(products);
};

window.renderWishlist = (products=[]) => {
  const badge = $('wishlistBadge');
  if (badge) { badge.textContent=S.wishlist.size; badge.style.display=S.wishlist.size?'inline':'none'; }
  const hc = $('wlHCount'); if (hc) hc.textContent = S.wishlist.size?`(${S.wishlist.size})`:'';
  const body = $('wlItems'); if (!body) return;
  const items = [...S.wishlist].map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if (!items.length) {
    body.innerHTML = `<div class="pempty"><span class="pe-icon">♡</span><p>Nothing saved yet</p><p class="pempty-sub">Tap the heart on any product</p></div>`;
    return;
  }
  body.innerHTML = items.map(p => `
    <div class="wi"><span class="wi-em">${p.emoji}</span>
    <div class="wi-info"><p class="wi-name">${p.name}</p><p class="wi-price">${fmt(p.price)}</p></div>
    <button class="wi-add" data-id="${p.id}">Add to cart</button></div>`).join('');
  body.querySelectorAll('.wi-add').forEach(btn => {
    btn.addEventListener('click', () => { addToCart(parseInt(btn.dataset.id),1); closeWishlist(); });
  });
};

/* ── Compare ──────────────────────────────────────────────────────────── */
window.toggleCompare = (id, products) => {
  const p = products.find(x=>x.id===id); if (!p) return;
  const idx = S.compareList.findIndex(c=>c.id===id);
  if (idx>=0) { S.compareList.splice(idx,1); toast('Removed from compare'); }
  else { if (S.compareList.length>=3) { toast('Max 3 products','err'); return; } S.compareList.push(p); toast('Added to compare'); }
  renderCompareBar();
};

window.renderCompareBar = () => {
  const n=S.compareList.length;
  const bar=$('compareFloat'); if(bar) bar.style.display=n?'flex':'none';
  const btn=$('compareBtn'); if(btn) btn.style.display=n?'flex':'none';
  const ct=$('compareCount'); if(ct) ct.textContent=n;
  const slots=$('compareSlots'); if(!slots) return;
  slots.innerHTML=S.compareList.map(p=>`
    <div class="cslot"><span>${p.emoji}</span><span class="cslot-name">${p.name}</span>
    <button class="cslot-x" data-id="${p.id}">✕</button></div>`).join('');
  slots.querySelectorAll('.cslot-x').forEach(btn=>{
    btn.addEventListener('click',()=>{ const id=parseInt(btn.dataset.id); S.compareList=S.compareList.filter(c=>c.id!==id); renderCompareBar(); if(window.loadProducts) loadProducts(); });
  });
};

window.openCompareModal = () => {
  if (S.compareList.length<2) { toast('Select at least 2 products','err'); return; }
  const rows=[
    ['', ...S.compareList.map(p=>`<span class="cem">${p.emoji}</span><p class="cname">${p.name}</p>`)],
    ['Category',...S.compareList.map(p=>p.category)],
    ['Price',...S.compareList.map(p=>`<strong>${fmt(p.price)}</strong>`)],
    ['Was',...S.compareList.map(p=>p.originalPrice?fmt(p.originalPrice):'—')],
    ['Saving',...S.compareList.map(p=>p.originalPrice?`-${pct(p.originalPrice,p.price)}%`:'—')],
    ['Rating',...S.compareList.map(p=>`${star(p.rating)} ${p.rating}`)],
    ['Reviews',...S.compareList.map(p=>rnum(p.reviews))],
    ['Variants',...S.compareList.map(p=>p.variants?Object.keys(p.variants).join(', '):'—')],
    ['Stock',...S.compareList.map(p=>p.stock>5?'✅ In stock':p.stock>0?`⚠ ${p.stock} left`:'✗ Out')],
  ];
  const tbl=$('cmpTable'); if(!tbl) return;
  tbl.innerHTML=`<table class="ctbl">${rows.map((row,i)=>`<tr><${i?'td class="rl"':'th'}>${i?row[0]:''}</${i?'td':'th'}>${row.slice(1).map(c=>`<${i?'td':'th'}>${c}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;
  const bg=$('cmpMbg'),modal=$('cmpModal');
  if(bg) bg.classList.add('on'); if(modal) modal.classList.add('open');
  document.body.style.overflow='hidden';
};

/* ── Auth ─────────────────────────────────────────────────────────────── */
window.loadUser = async () => {
  if (!S.token) return;
  const d = await api('GET', '/api/users/me');
  if (d.error) { S.token=null; localStorage.removeItem('luma_token'); return; }
  S.user = d;
  const lbl=$('accountLabel'); if(lbl) lbl.textContent=d.name.split(' ')[0];
};

/* ── Panel open/close ─────────────────────────────────────────────────── */
window.openCart  = () => { $('cartPanel')?.classList.add('open');  $('cartScrim')?.classList.add('on');  document.body.style.overflow='hidden'; };
window.closeCart = () => { $('cartPanel')?.classList.remove('open'); $('cartScrim')?.classList.remove('on'); document.body.style.overflow=''; };
window.openWishlist  = () => { $('wlPanel')?.classList.add('open');  $('wlScrim')?.classList.add('on');  document.body.style.overflow='hidden'; };
window.closeWishlist = () => { $('wlPanel')?.classList.remove('open'); $('wlScrim')?.classList.remove('on'); document.body.style.overflow=''; };
window.openAccount  = () => { $('accPanel')?.classList.add('open'); $('accScrim')?.classList.add('on'); document.body.style.overflow='hidden'; renderAccountPanel(); };
window.closeAccount = () => { $('accPanel')?.classList.remove('open'); $('accScrim')?.classList.remove('on'); document.body.style.overflow=''; };

/* ── Checkout ─────────────────────────────────────────────────────────── */
window.openCheckout = () => {
  if (!S.cart.length) { toast('Your cart is empty','err'); return; }
  const sub=S.cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const disc=S.promoApplied==='LUMA10'?sub*0.10:0;
  const el_items=$('coItems'),el_sub=$('coSub'),el_tot=$('coTotal');
  if(el_items) el_items.innerHTML=S.cart.map(item=>`<div class="coi"><span class="coi-em">${item.emoji||'📦'}</span><span class="coi-name">${item.name} × ${item.quantity}</span><span>${fmt(item.price*item.quantity)}</span></div>`).join('');
  if(el_sub) el_sub.textContent=fmt(sub);
  if(el_tot) el_tot.textContent=fmt(sub-disc+(sub>=45?0:4.99));
  const fe=$('formError'); if(fe) fe.textContent='';
  if (S.user) {
    const parts=S.user.name.split(' ');
    const fi=$('custFirst'),la=$('custLast'),em=$('custEmail');
    if(fi&&!fi.value) fi.value=parts[0]||'';
    if(la&&!la.value) la.value=parts.slice(1).join(' ')||'';
    if(em&&!em.value) em.value=S.user.email||'';
  }
  const bg=$('coBg'),modal=$('coModal');
  if(bg) bg.classList.add('on'); if(modal) modal.classList.add('open');
  closeCart();
};

window.placeOrder = async () => {
  const name=($('custFirst')?.value+' '+$('custLast')?.value).trim();
  const email=$('custEmail')?.value.trim(), addr=$('custAddress')?.value.trim();
  const card=$('custCard')?.value.replace(/\s/g,''), err=$('formError');
  if(!name){if(err)err.textContent='Please enter your name.';return;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if(err)err.textContent='Please enter a valid email.';return;}
  if(!addr){if(err)err.textContent='Please enter a delivery address.';return;}
  if(!card||card.length<16){if(err)err.textContent='Please enter a valid card number.';return;}
  if(err) err.textContent='';
  const btn=$('placeOrderBtn'); if(btn){btn.textContent='Placing order…';btn.disabled=true;}
  const d=await api('POST','/api/orders',{customerName:name,email});
  if(btn){btn.textContent='Place order';btn.disabled=false;}
  if(d.error){if(err)err.textContent=d.error;return;}
  if(S.user&&S.token) await api('POST',`/api/users/orders/${d.order.id}`,{items:d.order.items,total:d.order.total,status:d.order.status});
  const bg=$('coBg'),modal=$('coModal');
  if(bg) bg.classList.remove('on'); if(modal) modal.classList.remove('open');
  S.promoApplied=null; await refreshCart();
  const o=d.order;
  const msg=$('confirmedMsg'),rcpt=$('orderReceipt'),screen=$('confirmedScreen');
  if(msg) msg.textContent=`Confirmation sent to ${o.email}.`;
  if(rcpt) rcpt.textContent=`Order #${o.id}\nItems: ${o.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}\nTotal: ${fmt(o.total)}\nPlaced: ${new Date(o.placedAt).toLocaleString()}`;
  if(screen) screen.style.display='flex';
  ['custFirst','custLast','custEmail','custAddress','custCity','custPost','custCard','custExpiry','custCvv'].forEach(id=>{const el=$(id);if(el)el.value='';});
};

/* ── Account panel ────────────────────────────────────────────────────── */
window.renderAccountPanel = async () => {
  const body=$('accBody'); if(!body) return;
  const title=$('accPanelTitle');
  if (S.user) {
    if(title) title.textContent='My Account';
    const orders=await api('GET','/api/users/orders');
    const ol=orders.orders||[];
    const initials=S.user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    body.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="background:var(--sand);border-radius:var(--r2);padding:16px;display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;background:var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-style:italic;font-size:18px;font-weight:700;color:var(--wh)">${initials}</div>
          <div><p style="font-size:15px;font-weight:600">${S.user.name}</p><p style="font-size:12.5px;color:var(--muted)">${S.user.email}</p><p style="font-size:11.5px;color:var(--muted);margin-top:2px">Member since ${S.user.joined}</p></div>
        </div>
        <div>
          <p class="co-label">Order History</p>
          ${ol.length?ol.map(o=>`<div style="background:var(--sand);border-radius:var(--r);padding:12px 14px;border-left:3px solid var(--sage);margin-bottom:10px"><p style="font-size:13px;font-weight:700;margin-bottom:3px">Order #${o.orderId}</p><p style="font-size:12px;color:var(--muted);margin-bottom:3px">${o.items?.map(i=>`${i.name} × ${i.quantity}`).join(', ')||'—'}</p><p style="font-size:13px;font-weight:600">${o.total?fmt(o.total):''}</p><p style="font-size:11px;color:var(--muted);margin-top:2px">${new Date(o.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p></div>`).join(''):`<p style="text-align:center;color:var(--muted);padding:20px 0;font-size:13px">No orders yet.</p>`}
        </div>
        <a href="/orders" class="btn-ghost" style="text-align:center" onclick="closeAccount()">View all orders</a>
        <button id="logoutBtn" style="background:none;border:1.5px solid var(--border);border-radius:var(--r);padding:10px;font-size:13.5px;font-weight:500;color:var(--red);width:100%;cursor:pointer">Sign out</button>
      </div>`;
    $('logoutBtn').addEventListener('click',async()=>{ await api('POST','/api/users/logout'); S.token=null;S.user=null;localStorage.removeItem('luma_token'); const lbl=$('accountLabel');if(lbl)lbl.textContent='Sign in'; toast('Signed out'); closeAccount(); });
  } else {
    if(title) title.textContent='Account';
    body.innerHTML=`
      <div style="display:flex;border-bottom:1.5px solid var(--border);margin-bottom:20px">
        <button class="acc-tab active" id="tabSI" style="flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--ink);border-bottom:2px solid var(--ink);margin-bottom:-1.5px;cursor:pointer">Sign in</button>
        <button class="acc-tab" id="tabRG" style="flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1.5px;cursor:pointer">Register</button>
      </div>
      <div id="authForm"></div>`;
    showSignin();
    $('tabSI').addEventListener('click',()=>{ $('tabSI').style.cssText='flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--ink);border-bottom:2px solid var(--ink);margin-bottom:-1.5px;cursor:pointer'; $('tabRG').style.cssText='flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1.5px;cursor:pointer'; showSignin(); });
    $('tabRG').addEventListener('click',()=>{ $('tabRG').style.cssText='flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--ink);border-bottom:2px solid var(--ink);margin-bottom:-1.5px;cursor:pointer'; $('tabSI').style.cssText='flex:1;padding:10px;background:none;border:none;font-size:14px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1.5px;cursor:pointer'; showRegister(); });
  }
};

function showSignin() {
  $('authForm').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:12px">
      <input id="siEmail" type="email" placeholder="Email address" style="border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;font-size:14px;color:var(--ink);background:var(--sand);outline:none;width:100%;font-family:var(--font)"/>
      <input id="siPass" type="password" placeholder="Password" style="border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;font-size:14px;color:var(--ink);background:var(--sand);outline:none;width:100%;font-family:var(--font)"/>
      <button id="siBtn" class="btn-primary" style="width:100%;padding:12px">Sign in</button>
      <p id="siErr" style="color:var(--red);font-size:12.5px;min-height:18px"></p>
      <hr style="border:none;border-top:1px solid var(--border)"/>
      <button id="demoBtn" style="background:var(--sand2);border:1px solid var(--border);border-radius:var(--r);padding:10px;font-size:13px;font-weight:500;cursor:pointer;width:100%">Use demo account →</button>
    </div>`;
  const doLogin = async (email, pass) => {
    const d=await api('POST','/api/users/login',{email,password:pass});
    if(d.error){const e=$('siErr');if(e)e.textContent=d.error;return;}
    S.token=d.token;S.user=d.user;localStorage.setItem('luma_token',d.token);
    const lbl=$('accountLabel');if(lbl)lbl.textContent=d.user.name.split(' ')[0];
    toast(`Welcome back, ${d.user.name.split(' ')[0]}! 👋`,'ok');
    renderAccountPanel();
  };
  $('siBtn').addEventListener('click',()=>doLogin($('siEmail').value.trim(),$('siPass').value));
  $('demoBtn').addEventListener('click',()=>doLogin('jane@example.com','pass123'));
}

function showRegister() {
  $('authForm').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:12px">
      <input id="rgName" type="text" placeholder="Your full name" style="border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;font-size:14px;color:var(--ink);background:var(--sand);outline:none;width:100%;font-family:var(--font)"/>
      <input id="rgEmail" type="email" placeholder="Email address" style="border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;font-size:14px;color:var(--ink);background:var(--sand);outline:none;width:100%;font-family:var(--font)"/>
      <input id="rgPass" type="password" placeholder="Password (min 6 chars)" style="border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;font-size:14px;color:var(--ink);background:var(--sand);outline:none;width:100%;font-family:var(--font)"/>
      <button id="rgBtn" class="btn-primary" style="width:100%;padding:12px">Create account</button>
      <p id="rgErr" style="color:var(--red);font-size:12.5px;min-height:18px"></p>
    </div>`;
  $('rgBtn').addEventListener('click',async()=>{
    const name=$('rgName').value.trim(),email=$('rgEmail').value.trim(),pass=$('rgPass').value;
    if(!name||!email||!pass){$('rgErr').textContent='Please fill in all fields.';return;}
    if(pass.length<6){$('rgErr').textContent='Password must be at least 6 characters.';return;}
    const d=await api('POST','/api/users/register',{name,email,password:pass});
    if(d.error){$('rgErr').textContent=d.error;return;}
    S.token=d.token;S.user=d.user;localStorage.setItem('luma_token',d.token);
    const lbl=$('accountLabel');if(lbl)lbl.textContent=d.user.name.split(' ')[0];
    toast(`Welcome, ${d.user.name.split(' ')[0]} 🎉`,'ok');
    renderAccountPanel();
  });
}

/* ── Scroll reveal ────────────────────────────────────────────────────── */
window.initReveal = () => {
  const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');obs.unobserve(e.target);}});},{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
};

/* ── Shared HTML snippets ─────────────────────────────────────────────── */
window.NAV_HTML = `
<header class="header" id="mainHeader">
  <div class="header-in">
    <a class="logo" href="/">
      <svg class="logo-mark" viewBox="0 0 20 20" fill="none"><path d="M10 2L17 7V13L10 18L3 13V7L10 2Z" fill="#22C55E"/><path d="M10 6L14 8.5V13.5L10 16L6 13.5V8.5L10 6Z" fill="#fff" opacity=".4"/></svg>
      <span class="logo-text">luma</span>
    </a>
    <div class="searchbar" id="searchbarWrap">
      <svg class="sb-icon" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <input id="searchInput" type="text" placeholder="Search products…" autocomplete="off"/>
      <button id="searchClear" class="sb-clear" style="display:none">✕</button>
    </div>
    <nav class="hnav">
      <a href="/shop" class="hnav-btn" data-page="shop">Shop</a>
      <a href="/deals" class="hnav-btn" data-page="deals">Deals</a>
      <button class="hnav-btn" id="wishlistNavBtn">
        Saved <span class="hpill" id="wishlistBadge" style="display:none">0</span>
      </button>
      <button class="hnav-btn" id="accountBtn" style="display:flex;align-items:center;gap:5px">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <span id="accountLabel">Sign in</span>
      </button>
      <button class="cart-btn" id="cartToggle">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 1h2l2.2 8.8a1 1 0 0 0 1 .8h6.2a1 1 0 0 0 1-.76L15 5H3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="13.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="13.5" r="1.5" fill="currentColor"/></svg>
        Cart <span class="cart-ct" id="cartBadge">0</span>
      </button>
    </nav>
  </div>
</header>`;

window.CART_PANEL_HTML = `
<div class="scrim" id="cartScrim"></div>
<aside class="panel" id="cartPanel">
  <div class="panel-hdr"><h2>Cart <span class="panel-ct" id="cartHCount"></span></h2><button class="panel-x" id="cartClose">✕</button></div>
  <div class="panel-body" id="cartItems"></div>
  <div class="panel-foot" id="cartFoot" style="display:none">
    <div class="promo-row"><input type="text" id="promoInput" placeholder="Promo code (LUMA10)" class="promo-in"/><button id="promoBtn" class="promo-btn">Apply</button></div>
    <div class="totals">
      <div class="tl"><span>Subtotal</span><span id="cartSub">£0.00</span></div>
      <div class="tl"><span>Delivery</span><span id="deliveryLine">Free</span></div>
      <div class="tl tbig"><span>Total</span><span id="cartTotal">£0.00</span></div>
    </div>
    <button class="to-checkout" id="checkoutBtn">Checkout →</button>
    <button id="clearCartBtn" class="clear-cart-btn">Clear Cart</button>
    <p class="panel-note">Free returns · Secure payment · 30 days</p>
  </div>
</aside>`;

window.WISHLIST_PANEL_HTML = `
<div class="scrim" id="wlScrim"></div>
<aside class="panel" id="wlPanel">
  <div class="panel-hdr"><h2>Saved <span class="panel-ct" id="wlHCount"></span></h2><button class="panel-x" id="wlClose">✕</button></div>
  <div class="panel-body" id="wlItems"></div>
</aside>`;

window.ACCOUNT_PANEL_HTML = `
<div class="scrim" id="accScrim"></div>
<aside class="panel" id="accPanel">
  <div class="panel-hdr"><h2 id="accPanelTitle">Account</h2><button class="panel-x" id="accClose">✕</button></div>
  <div class="panel-body" id="accBody"></div>
</aside>`;

window.CHECKOUT_HTML = `
<div class="mbg" id="coBg"></div>
<div class="comodal" id="coModal">
  <div class="cobox">
    <button class="modal-x" id="coClose">✕</button>
    <h2 class="co-h">Checkout</h2>
    <div class="cocols">
      <div class="coleft">
        <p class="co-label">Delivery</p>
        <div class="fr2"><div class="ff"><label>First name</label><input id="custFirst" placeholder="Jane"/></div><div class="ff"><label>Last name</label><input id="custLast" placeholder="Smith"/></div></div>
        <div class="ff"><label>Email</label><input id="custEmail" type="email" placeholder="jane@email.com"/></div>
        <div class="ff"><label>Address</label><input id="custAddress" placeholder="123 High Street"/></div>
        <div class="fr2"><div class="ff"><label>City</label><input id="custCity" placeholder="London"/></div><div class="ff"><label>Postcode</label><input id="custPost" placeholder="EC1A 1BB"/></div></div>
        <p class="co-label" style="margin-top:20px">Payment 🔒</p>
        <div class="ff"><label>Card number</label><input id="custCard" placeholder="4242 4242 4242 4242" maxlength="19"/></div>
        <div class="fr2"><div class="ff"><label>Expiry</label><input id="custExpiry" placeholder="MM/YY" maxlength="5"/></div><div class="ff"><label>CVV</label><input id="custCvv" placeholder="123" maxlength="3"/></div></div>
        <p class="demo-tag">Demo mode — no real card is charged.</p>
        <button class="place-btn" id="placeOrderBtn">Place order</button>
        <p class="ferr" id="formError"></p>
      </div>
      <div class="coright">
        <p class="co-label">Summary</p>
        <div id="coItems" class="coi-list"></div>
        <div class="totals co-totals">
          <div class="tl"><span>Subtotal</span><span id="coSub">£0.00</span></div>
          <div class="tl"><span>Delivery</span><span class="free-tag">Free</span></div>
          <div class="tl tbig"><span>Total</span><span id="coTotal">£0.00</span></div>
        </div>
        <div class="trust"><span>🔒 Encrypted</span><span>↩️ 30-day returns</span><span>🚚 Next day</span></div>
      </div>
    </div>
  </div>
</div>`;

window.CONFIRMED_HTML = `
<div class="confirmed-screen" id="confirmedScreen" style="display:none">
  <div class="confirmed-card">
    <div class="confirmed-mark">✓</div>
    <h2>Order confirmed</h2>
    <p id="confirmedMsg"></p>
    <div class="receipt" id="orderReceipt"></div>
    <div class="confirmed-btns">
      <button class="btn-primary" id="successClose">Keep browsing</button>
      <button class="btn-ghost" id="trackOrder">Track order</button>
    </div>
  </div>
</div>`;

window.COMPARE_HTML = `
<div class="mbg" id="cmpMbg"></div>
<div class="cmpmodal" id="cmpModal">
  <button class="modal-x" id="cmpModalClose">✕</button>
  <h2 class="cmp-h">Side by side</h2>
  <div id="cmpTable"></div>
</div>
<div class="cmpbar" id="compareFloat" style="display:none">
  <span>Comparing</span>
  <div class="cmpbar-slots" id="compareSlots"></div>
  <button class="cmpbar-go" id="compareGoBtn">Compare now</button>
  <button class="cmpbar-clear" id="compareClearBtn">Clear</button>
</div>`;

window.FOOTER_HTML = `
<footer class="footer">
  <div class="footer-in">
    <div class="footer-brand">
      <div class="fl"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2L17 7V13L10 18L3 13V7L10 2Z" fill="#22C55E"/></svg><span class="logo-text">luma</span></div>
      <p class="footer-tag">Curated products.<br>Honest prices.</p>
      <p class="footer-sub">MSc Dissertation · CI/CD Research 2026</p>
    </div>
    <div class="footer-links">
      <div class="flc"><h4>Shop</h4><a href="/shop">All Products</a><a href="/deals">Today's Deals</a><a href="/shop?cat=Electronics">Electronics</a><a href="/shop?cat=Clothing">Clothing</a></div>
      <div class="flc"><h4>Help</h4><a href="/orders">Track Order</a><a>Returns</a><a>Delivery Info</a><a>Contact Us</a></div>
      <div class="flc"><h4>Company</h4><a>About Luma</a><a>Careers</a><a>Press</a><a>Sell with Us</a></div>
    </div>
  </div>
  <div class="footer-btm">
    <span>© 2026 Luma</span>
    <span>Built with Node.js · Docker · GitHub Actions CI/CD</span>
  </div>
</footer>
<button class="up-btn" id="backTop">↑</button>
<div class="toast" id="toast"></div>`;

/* ── Wire up shared event listeners ───────────────────────────────────── */
window.initSharedListeners = () => {
  $('cartToggle')?.addEventListener('click', openCart);
  $('cartClose')?.addEventListener('click',  closeCart);
  $('cartScrim')?.addEventListener('click',  closeCart);
  $('wlClose')?.addEventListener('click',    closeWishlist);
  $('wlScrim')?.addEventListener('click',    closeWishlist);
  $('wishlistNavBtn')?.addEventListener('click', openWishlist);
  $('accountBtn')?.addEventListener('click', openAccount);
  $('accClose')?.addEventListener('click',   closeAccount);
  $('accScrim')?.addEventListener('click',   closeAccount);
  $('checkoutBtn')?.addEventListener('click', openCheckout);
  $('clearCartBtn')?.addEventListener('click', () => { S.cart = []; renderCart(); });
  $('coClose')?.addEventListener('click', ()=>{ $('coBg')?.classList.remove('on'); $('coModal')?.classList.remove('open'); });
  $('coBg')?.addEventListener('click',    ()=>{ $('coBg')?.classList.remove('on'); $('coModal')?.classList.remove('open'); });
  $('placeOrderBtn')?.addEventListener('click', placeOrder);
  $('successClose')?.addEventListener('click', ()=>{ $('confirmedScreen').style.display='none'; });
  $('trackOrder')?.addEventListener('click', ()=>{ toast('📦 On its way!','ok'); $('confirmedScreen').style.display='none'; });
  $('cmpMbg')?.addEventListener('click',      ()=>{ $('cmpModal')?.classList.remove('open'); $('cmpMbg')?.classList.remove('on'); document.body.style.overflow=''; });
  $('cmpModalClose')?.addEventListener('click',()=>{ $('cmpModal')?.classList.remove('open'); $('cmpMbg')?.classList.remove('on'); document.body.style.overflow=''; });
  $('compareGoBtn')?.addEventListener('click',   openCompareModal);
  $('compareClearBtn')?.addEventListener('click',()=>{ S.compareList=[]; renderCompareBar(); if(window.loadProducts) loadProducts(); });
  $('promoBtn')?.addEventListener('click', ()=>{
    const v=$('promoInput')?.value.trim().toUpperCase();
    if(v==='LUMA10'){S.promoApplied='LUMA10';toast('10% off applied! 🎉','ok');renderCart();}
    else if(v==='FREESHIP') toast('Free delivery on orders over £45','ok');
    else toast("That code isn't valid",'err');
    const pi=$('promoInput');if(pi)pi.value='';
  });
  $('custCard')?.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19);});
  $('custExpiry')?.addEventListener('input',e=>{let v=e.target.value.replace(/\D/g,'');if(v.length>=2)v=v.slice(0,2)+'/'+v.slice(2);e.target.value=v.slice(0,5);});
  $('backTop')?.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
  window.addEventListener('scroll',()=>{
    document.querySelector('.header')?.classList.toggle('scrolled',window.scrollY>10);
    $('backTop')?.classList.toggle('show',window.scrollY>400);
  });
  // Search
  $('searchInput')?.addEventListener('input', e=>{
    const v=e.target.value; const cl=$('searchClear'); if(cl) cl.style.display=v?'block':'none';
    if(window.onSearchInput) window.onSearchInput(v);
    else { clearTimeout(window._st); window._st=setTimeout(()=>{ if(v) window.location.href=`/search?q=${encodeURIComponent(v)}`; },400); }
  });
  $('searchClear')?.addEventListener('click',()=>{ const si=$('searchInput');if(si)si.value=''; const cl=$('searchClear');if(cl)cl.style.display='none'; if(window.onSearchInput) window.onSearchInput(''); });
  setNavActive();
};
