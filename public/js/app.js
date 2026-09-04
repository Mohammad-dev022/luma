'use strict';
/* ── Luma Store — Full Dynamic App ─────────────────────────────────────── */

const S = {
  products:[], cart:[], wishlist:new Set(), recentlyViewed:[],
  compareList:[], activeCategory:'All', activeTag:null, activeDeals:false,
  search:'', sort:'', view:'grid', modalQty:1, currentProduct:null,
  user:null, token:localStorage.getItem('luma_token')||null,
  selectedVariants:{}, votedReviews:new Set(), promoApplied:null,
};

const $ = id => document.getElementById(id);
const api = async (m, p, b) => {
  const headers = { 'Content-Type':'application/json' };
  if (S.token) headers['x-auth-token'] = S.token;
  const r = await fetch(p, { method:m, headers, body: b ? JSON.stringify(b) : undefined });
  return r.json();
};

let tt;
function toast(msg, type='') {
  clearTimeout(tt);
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  tt = setTimeout(() => el.className='toast', 2800);
}

const fmt  = p  => `£${parseFloat(p).toFixed(2)}`;
const pct  = (o,c) => Math.round((1-c/o)*100);
const star = r  => { const f=Math.floor(r),h=r%1>=.5; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-(h?1:0)); };
const rnum = n  => n>=1000?`${(n/1000).toFixed(1)}k`:n;

/* ── Page loader ──────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    $('pageLoader').classList.add('hidden');
    document.body.classList.remove('loading');
  }, 600);
});

/* ── Countdown ────────────────────────────────────────────────────────── */
function startCountdown() {
  const end = new Date(); end.setHours(23,59,59,0);
  const tick = () => {
    const d = end - new Date(); if (d <= 0) return;
    const h = Math.floor(d/3600000), m = Math.floor(d%3600000/60000), s = Math.floor(d%60000/1000);
    const pad = n => String(n).padStart(2,'0');
    const el = $('hn-timer'); if (el) el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const dth=$('dth'),dtm=$('dtm'),dts=$('dts');
    if (dth) dth.textContent=pad(h);
    if (dtm) dtm.textContent=pad(m);
    if (dts) dts.textContent=pad(s);
  };
  tick(); setInterval(tick, 1000);
}

/* ── Scroll reveal ────────────────────────────────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); }});
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ── Sticky header shadow ─────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.querySelector('.header').classList.toggle('scrolled', window.scrollY > 10);
  $('backTop').classList.toggle('show', window.scrollY > 400);
});

/* ── Load products ────────────────────────────────────────────────────── */
async function loadProducts() {
  const p = new URLSearchParams();
  if (S.activeCategory !== 'All') p.set('category', S.activeCategory);
  if (S.search) p.set('search', S.search);
  if (S.sort)   p.set('sort', S.sort);
  const data = await api('GET', `/api/products?${p}`);
  S.products = data.products || [];
  let list = [...S.products];
  if (S.activeTag)   list = list.filter(p => p.tags?.includes(S.activeTag));
  if (S.activeDeals) list = list.filter(p => p.originalPrice && p.originalPrice > p.price);
  renderProducts(list);
  $('hn-prod').textContent = S.products.length;
}

function renderProducts(list) {
  const grid = $('productGrid'), empty = $('emptyState');
  $('resultsCount').textContent = list.length ? `${list.length} item${list.length!==1?'s':''}` : '';
  if (!list.length) { grid.style.display='none'; empty.style.display='block'; return; }
  grid.style.display = 'grid'; empty.style.display = 'none';
  grid.className = `pgrid${S.view==='list'?' list':''}`;

  grid.innerHTML = list.map((p,i) => {
    const disc = p.originalPrice ? pct(p.originalPrice, p.price) : 0;
    const wl   = S.wishlist.has(p.id) ? 'saved' : '';
    const cmp  = S.compareList.find(c => c.id===p.id) ? 'comparing' : '';
    const low  = p.stock > 0 && p.stock <= 5;
    const bc   = p.badge ? `b-${p.badge.toLowerCase()}` : '';
    return `
    <article class="pc" data-id="${p.id}" style="transition-delay:${Math.min(i,8)*40}ms">
      <div class="pc-img" style="background:${p.bg}">
        <div class="pc-img-inner">${p.emoji}</div>
        ${p.badge ? `<span class="pc-badge ${bc}">${p.badge}</span>` : ''}
        ${low ? `<span class="pc-low">Only ${p.stock} left</span>` : ''}
        <div class="pc-olay">
          <button class="pol-btn wlt ${wl}" data-id="${p.id}" title="${wl?'Unsave':'Save'}">
            ${wl ? '❤' : '♡'}
          </button>
          <button class="pol-btn cmpt ${cmp}" data-id="${p.id}" title="Compare">⚖</button>
        </div>
      </div>
      <div class="pc-body">
        <p class="pc-cat">${p.category}</p>
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-desc">${p.description}</p>
        <div class="pc-stars">
          <span class="sv">${star(p.rating)}</span>
          <span class="sn">${p.rating}</span>
          <span class="sc">(${rnum(p.reviews)})</span>
        </div>
        <div class="pc-prices">
          <span class="pc-price">${fmt(p.price)}</span>
          ${p.originalPrice ? `<span class="pc-orig">${fmt(p.originalPrice)}</span><span class="pc-pct">-${disc}%</span>` : ''}
        </div>
        <div class="pc-add-wrap">
          <button class="pc-add" data-id="${p.id}" ${p.stock===0?'disabled':''}>
            ${p.stock===0 ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  // Staggered reveal
  requestAnimationFrame(() => {
    grid.querySelectorAll('.pc').forEach((c, i) => {
      setTimeout(() => c.classList.add('visible'), i * 40);
    });
  });

  grid.querySelectorAll('.pc').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.pc-add') || e.target.closest('.pol-btn')) return;
      openModal(parseInt(card.dataset.id));
    });
  });
  grid.querySelectorAll('.pc-add').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); addToCart(parseInt(btn.dataset.id), 1, btn); });
  });
  grid.querySelectorAll('.wlt').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleWishlist(parseInt(btn.dataset.id)); });
  });
  grid.querySelectorAll('.cmpt').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleCompare(parseInt(btn.dataset.id)); });
  });
}

/* ── Deals ────────────────────────────────────────────────────────────── */
async function loadDeals() {
  const data = await api('GET', '/api/products/deals');
  $('dealsGrid').innerHTML = (data.products||[]).map((p,i) => {
    const d = p.originalPrice ? pct(p.originalPrice, p.price) : 0;
    const c = 25 + Math.floor(Math.random() * 55);
    return `
    <div class="dcard" data-id="${p.id}">
      ${p.badge==='New' ? '<span class="dc-new-badge">New</span>' : ''}
      <div class="dc-img" style="background:${p.bg}">${p.emoji}</div>
      <div class="dc-body">
        <p class="dc-name">${p.name}</p>
        <div class="dc-row">
          <span class="dc-now">${fmt(p.price)}</span>
          <span class="dc-was">${fmt(p.originalPrice)}</span>
          <span class="dc-off">-${d}%</span>
        </div>
        <div class="dc-bar"><div class="dc-fill" style="width:0%" data-w="${c}"></div></div>
        <p class="dc-claimed">${c}% claimed</p>
      </div>
    </div>`;
  }).join('');

  // Animate bars on load
  requestAnimationFrame(() => {
    $('dealsGrid').querySelectorAll('.dc-fill').forEach(el => {
      setTimeout(() => el.style.width = el.dataset.w + '%', 300);
    });
  });

  $('dealsGrid').querySelectorAll('.dcard').forEach(c => {
    c.addEventListener('click', () => openModal(parseInt(c.dataset.id)));
  });
}

/* ── Cart ─────────────────────────────────────────────────────────────── */
async function addToCart(id, qty, btn) {
  if (btn) { btn.classList.add('adding'); btn.textContent = '✓ Added'; }
  const d = await api('POST', '/api/cart', { productId: id, quantity: qty });
  if (d.error) { toast(d.error, 'err'); }
  else { toast('Added to cart', 'ok'); await refreshCart(); bumpBadge(); }
  if (btn) setTimeout(() => { btn.classList.remove('adding'); btn.textContent = 'Add to cart'; }, 1400);
}

function bumpBadge() {
  const badge = $('cartBadge');
  badge.classList.remove('bump');
  requestAnimationFrame(() => requestAnimationFrame(() => badge.classList.add('bump')));
  setTimeout(() => badge.classList.remove('bump'), 300);
}

async function refreshCart() {
  const d = await api('GET', '/api/cart');
  S.cart = d.items || [];
  renderCart();
}

function renderCart() {
  const items  = S.cart;
  const count  = items.reduce((s,i) => s+i.quantity, 0);
  let   sub    = items.reduce((s,i) => s+i.price*i.quantity, 0);
  $('cartBadge').textContent  = count;
  $('cartHCount').textContent = count ? `(${count})` : '';

  if (!items.length) {
    $('cartItems').innerHTML = `<div class="pempty"><span class="pe-icon">◻</span><p>Your cart is empty</p><p class="pempty-sub">Add something you like</p></div>`;
    $('cartFoot').style.display = 'none';
    return;
  }

  $('cartItems').innerHTML = items.map(item => `
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

  $('cartItems').querySelectorAll('.qb').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id), item = S.cart.find(i => i.productId===id);
      if (!item) return;
      if (btn.dataset.action === 'inc') await addToCart(id, 1);
      else if (item.quantity <= 1) await removeFromCart(id);
      else { await api('DELETE',`/api/cart/${id}`); await api('POST','/api/cart',{productId:id,quantity:item.quantity-1}); await refreshCart(); }
    });
  });
  $('cartItems').querySelectorAll('.ci-rm').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
  });

  // Apply promo
  let discount = 0;
  if (S.promoApplied === 'LUMA10') discount = sub * 0.10;
  const free = sub >= 45;
  const total = sub - discount + (free ? 0 : 4.99);

  $('cartSub').textContent      = fmt(sub);
  $('deliveryLine').textContent = free ? 'Free' : fmt(4.99);
  $('deliveryLine').className   = free ? 'free-tag' : '';
  $('cartTotal').textContent    = fmt(total);
  $('cartFoot').style.display   = 'block';
}

async function removeFromCart(id) {
  await api('DELETE', `/api/cart/${id}`);
  toast('Removed from cart');
  await refreshCart();
}

/* ── Wishlist ─────────────────────────────────────────────────────────── */
function toggleWishlist(id) {
  const p = S.products.find(x => x.id===id); if (!p) return;
  if (S.wishlist.has(id)) { S.wishlist.delete(id); toast('Removed from saved'); }
  else { S.wishlist.add(id); toast('Saved ❤', 'ok'); }
  renderWishlist(); loadProducts();
}

function renderWishlist() {
  const items = [...S.wishlist].map(id => S.products.find(p => p.id===id)).filter(Boolean);
  const badge = $('wishlistBadge');
  badge.textContent    = items.length;
  badge.style.display  = items.length ? 'inline' : 'none';
  $('wlHCount').textContent = items.length ? `(${items.length})` : '';

  if (!items.length) {
    $('wlItems').innerHTML = `<div class="pempty"><span class="pe-icon">♡</span><p>Nothing saved yet</p><p class="pempty-sub">Tap the heart on any product</p></div>`;
    return;
  }
  $('wlItems').innerHTML = items.map(p => `
    <div class="wi">
      <span class="wi-em">${p.emoji}</span>
      <div class="wi-info">
        <p class="wi-name">${p.name}</p>
        <p class="wi-price">${fmt(p.price)}</p>
      </div>
      <button class="wi-add" data-id="${p.id}">Add to cart</button>
    </div>`).join('');
  $('wlItems').querySelectorAll('.wi-add').forEach(btn => {
    btn.addEventListener('click', () => { addToCart(parseInt(btn.dataset.id), 1); closeWishlist(); });
  });
}

/* ── Compare ──────────────────────────────────────────────────────────── */
function toggleCompare(id) {
  const p = S.products.find(x => x.id===id); if (!p) return;
  const idx = S.compareList.findIndex(c => c.id===id);
  if (idx >= 0) { S.compareList.splice(idx,1); toast('Removed from compare'); }
  else { if (S.compareList.length >= 3) { toast('Max 3 products','err'); return; } S.compareList.push(p); toast('Added to compare'); }
  renderCompareBar(); loadProducts();
}

function renderCompareBar() {
  const n = S.compareList.length;
  $('compareFloat').style.display = n ? 'flex' : 'none';
  $('compareBtn').style.display   = n ? 'flex' : 'none';
  $('compareCount').textContent   = n;
  $('compareSlots').innerHTML = S.compareList.map(p => `
    <div class="cslot">
      <span>${p.emoji}</span>
      <span class="cslot-name">${p.name}</span>
      <button class="cslot-x" data-id="${p.id}">✕</button>
    </div>`).join('');
  $('compareSlots').querySelectorAll('.cslot-x').forEach(btn => {
    btn.addEventListener('click', () => toggleCompare(parseInt(btn.dataset.id)));
  });
}

function openCompareModal() {
  if (S.compareList.length < 2) { toast('Select at least 2 products', 'err'); return; }
  const rows = [
    ['', ...S.compareList.map(p => `<span class="cem">${p.emoji}</span><p class="cname">${p.name}</p>`)],
    ['Category',  ...S.compareList.map(p => p.category)],
    ['Price',     ...S.compareList.map(p => `<strong>${fmt(p.price)}</strong>`)],
    ['Was',       ...S.compareList.map(p => p.originalPrice ? fmt(p.originalPrice) : '—')],
    ['Saving',    ...S.compareList.map(p => p.originalPrice ? `-${pct(p.originalPrice,p.price)}%` : '—')],
    ['Rating',    ...S.compareList.map(p => `${star(p.rating)} ${p.rating}`)],
    ['Reviews',   ...S.compareList.map(p => rnum(p.reviews))],
    ['Variants',  ...S.compareList.map(p => p.variants ? Object.keys(p.variants).join(', ') : '—')],
    ['Stock',     ...S.compareList.map(p => p.stock>5 ? '✅ In stock' : p.stock>0 ? `⚠ ${p.stock} left` : '✗ Out of stock')],
  ];
  $('cmpTable').innerHTML = `<table class="ctbl">${rows.map((row,i) => `
    <tr>
      <${i?'td class="rl"':'th'}>${i ? row[0] : ''}</${i?'td':'th'}>
      ${row.slice(1).map(c => `<${i?'td':'th'}>${c}</${i?'td':'th'}>`).join('')}
    </tr>`).join('')}</table>`;
  $('cmpMbg').classList.add('on');
  $('cmpModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ── Product modal ────────────────────────────────────────────────────── */
async function openModal(id) {
  const data = await api('GET', `/api/products/${id}`);
  if (data.error) return;
  S.currentProduct = data; S.modalQty = 1; S.selectedVariants = {};
  addToRecent(data);

  const p = data;
  const d = p.originalPrice ? pct(p.originalPrice, p.price) : 0;
  const wl = S.wishlist.has(p.id);
  const sc = p.stock===0 ? 's-out' : p.stock<=5 ? 's-low' : 's-in';
  const st = p.stock===0 ? 'Out of stock' : p.stock<=5 ? `Only ${p.stock} left` : 'In stock';

  // Build variants HTML
  let variantsHtml = '';
  if (p.variants && Object.keys(p.variants).length) {
    variantsHtml = `<div class="variants-section">`;
    for (const [key, opts] of Object.entries(p.variants)) {
      S.selectedVariants[key] = opts[0]; // default to first
      variantsHtml += `
        <div class="variant-group">
          <p class="variant-label">${key}: <span id="vsel-${key}">${opts[0]}</span></p>
          <div class="variant-opts">
            ${opts.map((o,i) => `<button class="vopt${i===0?' selected':''}" data-key="${key}" data-val="${o}">${o}</button>`).join('')}
          </div>
        </div>`;
    }
    variantsHtml += `</div>`;
  }

  $('modalBody').innerHTML = `
    <div class="modal-hero" style="background:${p.bg}">
      <div class="modal-hero-emoji">${p.emoji}</div>
    </div>
    <div class="modal-main">
      <div class="modal-top-row">
        <span class="modal-cat">${p.category}</span>
        <div class="modal-wish-row">
          <button class="mwb ${wl?'saved':''}" id="mwish" title="${wl?'Remove from saved':'Save'}">${wl?'❤':'♡'}</button>
        </div>
      </div>
      <h2 class="modal-name">${p.name}</h2>
      <div class="mstars-row">
        <span class="mstars">${star(p.rating)}</span>
        <span class="mrn">${p.rating}</span>
        <span class="mrc" id="scrollToReviews">${rnum(p.reviews)} reviews ↓</span>
      </div>
      <p class="modal-desc">${p.description}</p>
      <div class="mprice-row">
        <span class="mprice">${fmt(p.price)}</span>
        ${p.originalPrice ? `<span class="morig">${fmt(p.originalPrice)}</span><span class="msave">Save ${d}%</span>` : ''}
      </div>
      <p class="modal-del">🚚 Free delivery on this order · Ships in 1–2 days</p>
      <p class="modal-stk ${sc}">${st}</p>
      ${variantsHtml}
      <div class="modal-qty">
        <label>Qty</label>
        <div class="qsel">
          <button id="qd">−</button><span id="qn">1</span><button id="qi">+</button>
        </div>
      </div>
      <div class="mbtns">
        <button class="madd" id="madd" ${p.stock===0?'disabled':''}>Add to cart — ${fmt(p.price)}</button>
        <button class="mcmp" id="mcmp">Compare</button>
      </div>
      ${p.relatedProducts?.length ? `
      <div class="related-sec">
        <p class="related-t">Often bought together</p>
        <div class="related-list">
          ${p.relatedProducts.map(r => `
          <div class="rel-card" data-id="${r.id}">
            <div class="rel-em" style="background:${r.bg};border-radius:6px;padding:4px">${r.emoji}</div>
            <p class="rel-n">${r.name}</p>
            <p class="rel-p">${fmt(r.price)}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}
      <div class="reviews-sec" id="reviewsSection">
        <div class="reviews-hdr">
          <p class="reviews-t">Customer reviews</p>
          <button class="write-review-btn" id="writeReviewBtn">Write a review</button>
        </div>
        <div id="reviewsContent"><div class="no-reviews">Loading reviews…</div></div>
        <div id="writeReviewForm" style="display:none"></div>
      </div>
    </div>`;

  // Variant buttons
  $('modalBody').querySelectorAll('.vopt').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key, val = btn.dataset.val;
      S.selectedVariants[key] = val;
      $('modalBody').querySelectorAll(`.vopt[data-key="${key}"]`).forEach(b => b.classList.toggle('selected', b.dataset.val===val));
      const lbl = $(`vsel-${key}`); if (lbl) lbl.textContent = val;
    });
  });

  // Qty
  const updQ = () => { $('qn').textContent = S.modalQty; $('madd').textContent = `Add to cart — ${fmt(p.price * S.modalQty)}`; };
  $('qd').addEventListener('click', () => { if (S.modalQty > 1) { S.modalQty--; updQ(); } });
  $('qi').addEventListener('click', () => { if (S.modalQty < p.stock) { S.modalQty++; updQ(); } });

  $('madd').addEventListener('click', async () => {
    const btn = $('madd');
    await addToCart(p.id, S.modalQty, btn);
    btn.textContent = '✓ Added to cart';
    setTimeout(() => { btn.textContent = `Add to cart — ${fmt(p.price*S.modalQty)}`; btn.classList.remove('adding'); }, 1500);
    closeModal();
  });
  $('mwish').addEventListener('click', () => { toggleWishlist(p.id); closeModal(); });
  $('mcmp').addEventListener('click',  () => { toggleCompare(p.id); closeModal(); });

  $('scrollToReviews').addEventListener('click', () => {
    $('reviewsSection').scrollIntoView({ behavior:'smooth' });
  });

  $('writeReviewBtn').addEventListener('click', () => openWriteReview(p.id));

  $('modalBody').querySelectorAll('.rel-card').forEach(el => {
    el.addEventListener('click', () => { closeModal(); setTimeout(() => openModal(parseInt(el.dataset.id)), 200); });
  });

  $('modalBg').classList.add('on');
  $('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load reviews async
  loadReviews(p.id);
}

function closeModal() {
  $('productModal').classList.remove('open');
  $('modalBg').classList.remove('on');
  document.body.style.overflow = '';
}

/* ── Reviews ──────────────────────────────────────────────────────────── */
async function loadReviews(productId) {
  const data = await api('GET', `/api/reviews/${productId}`);
  const el = $('reviewsContent'); if (!el) return;
  if (!data.reviews || data.reviews.length === 0) {
    el.innerHTML = `<div class="no-reviews">No reviews yet — be the first to write one!</div>`;
    return;
  }
  el.innerHTML = `
    <div class="review-summary">
      <span class="rs-big">${data.average}</span>
      <div>
        <div class="rs-stars">${star(data.average)}</div>
        <div class="rs-count">${data.count} review${data.count!==1?'s':''}</div>
      </div>
    </div>
    ${data.reviews.map(r => `
    <div class="review-item">
      <div class="rev-hd">
        <span class="rev-a">${r.userName}</span>
        <span class="rev-s">${'★'.repeat(r.rating)}</span>
        ${r.verified ? '<span class="rev-v">✓ Verified</span>' : ''}
      </div>
      <p class="rev-title">${r.title}</p>
      <p class="rev-body">${r.body}</p>
      <div class="rev-meta">
        <span class="rev-date">${r.date}</span>
        <button class="rev-helpful ${S.votedReviews.has(r.id)?'voted':''}" data-rid="${r.id}">
          👍 Helpful (${r.helpful})
        </button>
      </div>
    </div>`).join('')}`;

  el.querySelectorAll('.rev-helpful').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rid = parseInt(btn.dataset.rid);
      if (S.votedReviews.has(rid)) return;
      const d = await api('POST', `/api/reviews/${rid}/helpful`);
      S.votedReviews.add(rid);
      btn.textContent = `👍 Helpful (${d.helpful})`;
      btn.classList.add('voted');
    });
  });
}

function openWriteReview(productId) {
  const form = $('writeReviewForm'); if (!form) return;
  form.style.display = 'block';
  let selectedRating = 0;

  form.innerHTML = `
    <div class="write-review-form">
      <p class="wrr-label">Write a review</p>
      <div class="star-picker" id="starPicker">
        ${[1,2,3,4,5].map(n => `<span class="sp-star" data-v="${n}">★</span>`).join('')}
      </div>
      <input type="text" class="wrf-input" id="revTitle" placeholder="Review title (e.g. Great quality)"/>
      <textarea class="wrf-ta" id="revBody" placeholder="What did you think? Would you recommend it?"></textarea>
      <button class="wrf-submit" id="submitReview">Submit review</button>
      <button class="wrf-cancel" id="cancelReview">Cancel</button>
      <p class="wrf-err" id="revErr"></p>
    </div>`;

  form.querySelectorAll('.sp-star').forEach(s => {
    s.addEventListener('mouseover', () => {
      form.querySelectorAll('.sp-star').forEach((x,i) => x.classList.toggle('active', i < parseInt(s.dataset.v)));
    });
    s.addEventListener('click', () => { selectedRating = parseInt(s.dataset.v); });
  });
  form.querySelector('#starPicker').addEventListener('mouseleave', () => {
    form.querySelectorAll('.sp-star').forEach((x,i) => x.classList.toggle('active', i < selectedRating));
  });

  $('cancelReview').addEventListener('click', () => { form.style.display='none'; form.innerHTML=''; });

  $('submitReview').addEventListener('click', async () => {
    const title = $('revTitle').value.trim(), body = $('revBody').value.trim();
    const err = $('revErr');
    if (!selectedRating) { err.textContent = 'Please select a star rating.'; return; }
    if (!title) { err.textContent = 'Please enter a review title.'; return; }
    if (!body)  { err.textContent = 'Please write your review.'; return; }
    err.textContent = '';
    const d = await api('POST', `/api/reviews/${productId}`, { rating: selectedRating, title, body });
    if (d.error) { err.textContent = d.error; return; }
    toast('Review submitted! ⭐', 'ok');
    form.style.display = 'none'; form.innerHTML = '';
    loadReviews(productId);
  });

  form.scrollIntoView({ behavior:'smooth' });
}

/* ── Recently viewed ──────────────────────────────────────────────────── */
function addToRecent(p) {
  S.recentlyViewed = [p, ...S.recentlyViewed.filter(x => x.id!==p.id)].slice(0, 8);
  renderRecent();
}

function renderRecent() {
  const sec = $('recentSection');
  if (S.recentlyViewed.length < 2) { sec.style.display='none'; return; }
  sec.style.display = 'block';
  $('recentGrid').innerHTML = S.recentlyViewed.map(p => `
    <div class="dcard" data-id="${p.id}">
      <div class="dc-img" style="background:${p.bg}">${p.emoji}</div>
      <div class="dc-body">
        <p class="dc-name">${p.name}</p>
        <div class="dc-row">
          <span class="dc-now">${fmt(p.price)}</span>
          ${p.originalPrice ? `<span class="dc-was">${fmt(p.originalPrice)}</span>` : ''}
        </div>
      </div>
    </div>`).join('');
  $('recentGrid').querySelectorAll('.dcard').forEach(c => {
    c.addEventListener('click', () => openModal(parseInt(c.dataset.id)));
  });
}

/* ── Account / Auth ───────────────────────────────────────────────────── */
async function loadUser() {
  if (!S.token) return;
  const d = await api('GET', '/api/users/me');
  if (d.error) { S.token=null; localStorage.removeItem('luma_token'); return; }
  S.user = d;
  $('accountLabel').textContent = d.name.split(' ')[0];
}

function openAccount() {
  $('accScrim').classList.add('on');
  $('accPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderAccountPanel();
}
function closeAccount() {
  $('accPanel').classList.remove('open');
  $('accScrim').classList.remove('on');
  document.body.style.overflow = '';
}

function renderAccountPanel() {
  const body = $('accBody');
  if (S.user) {
    renderLoggedIn(body);
  } else {
    renderAuthForms(body);
  }
}

function renderAuthForms(body) {
  $('accPanelTitle').textContent = 'Sign in';
  body.innerHTML = `
    <div class="acc-tabs">
      <button class="acc-tab active" id="tabSignin">Sign in</button>
      <button class="acc-tab" id="tabRegister">Create account</button>
    </div>
    <div id="authForm"></div>`;
  showSignin();
  $('tabSignin').addEventListener('click',   () => { $('tabSignin').classList.add('active');   $('tabRegister').classList.remove('active'); showSignin(); });
  $('tabRegister').addEventListener('click', () => { $('tabRegister').classList.add('active'); $('tabSignin').classList.remove('active');   showRegister(); });
}

function showSignin() {
  $('authForm').innerHTML = `
    <div class="acc-form">
      <input class="acc-input" id="siEmail" type="email" placeholder="Email address"/>
      <input class="acc-input" id="siPass"  type="password" placeholder="Password"/>
      <button class="acc-btn" id="siBtn">Sign in</button>
      <p class="acc-err" id="siErr"></p>
      <p class="acc-divider">— or try —</p>
      <button class="acc-btn" style="background:var(--sand2);color:var(--ink)" id="demoLogin">
        Sign in as demo user
      </button>
    </div>`;
  $('siBtn').addEventListener('click', async () => {
    const email=$('siEmail').value.trim(), pass=$('siPass').value;
    if (!email||!pass) { $('siErr').textContent='Please fill in all fields.'; return; }
    const d = await api('POST','/api/users/login',{email,password:pass});
    if (d.error) { $('siErr').textContent=d.error; return; }
    S.token=d.token; S.user=d.user; localStorage.setItem('luma_token',d.token);
    $('accountLabel').textContent = d.user.name.split(' ')[0];
    toast(`Welcome back, ${d.user.name.split(' ')[0]}! 👋`, 'ok');
    renderLoggedIn($('accBody'));
  });
  $('demoLogin').addEventListener('click', async () => {
    const d = await api('POST','/api/users/login',{email:'jane@example.com',password:'pass123'});
    if (d.error) { $('siErr').textContent=d.error; return; }
    S.token=d.token; S.user=d.user; localStorage.setItem('luma_token',d.token);
    $('accountLabel').textContent = d.user.name.split(' ')[0];
    toast(`Welcome, ${d.user.name.split(' ')[0]}! 👋`, 'ok');
    renderLoggedIn($('accBody'));
  });
}

function showRegister() {
  $('authForm').innerHTML = `
    <div class="acc-form">
      <input class="acc-input" id="regName"  type="text"     placeholder="Your full name"/>
      <input class="acc-input" id="regEmail" type="email"    placeholder="Email address"/>
      <input class="acc-input" id="regPass"  type="password" placeholder="Password (min 6 chars)"/>
      <button class="acc-btn" id="regBtn">Create account</button>
      <p class="acc-err" id="regErr"></p>
    </div>`;
  $('regBtn').addEventListener('click', async () => {
    const name=$('regName').value.trim(), email=$('regEmail').value.trim(), pass=$('regPass').value;
    if (!name||!email||!pass) { $('regErr').textContent='Please fill in all fields.'; return; }
    if (pass.length < 6) { $('regErr').textContent='Password must be at least 6 characters.'; return; }
    const d = await api('POST','/api/users/register',{name,email,password:pass});
    if (d.error) { $('regErr').textContent=d.error; return; }
    S.token=d.token; S.user=d.user; localStorage.setItem('luma_token',d.token);
    $('accountLabel').textContent = d.user.name.split(' ')[0];
    toast(`Account created! Welcome, ${d.user.name.split(' ')[0]} 🎉`, 'ok');
    renderLoggedIn($('accBody'));
  });
}

async function renderLoggedIn(body) {
  $('accPanelTitle').textContent = 'My Account';
  const orders = await api('GET','/api/users/orders');
  const orderList = orders.orders || [];
  const initials = S.user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  body.innerHTML = `
    <div class="logged-in-view">
      <div class="user-card">
        <div class="user-avatar">${initials}</div>
        <div>
          <p class="user-name">${S.user.name}</p>
          <p class="user-email">${S.user.email}</p>
          <p class="user-joined">Member since ${S.user.joined}</p>
        </div>
      </div>
      <div>
        <p class="co-label">Order History</p>
        ${orderList.length ? orderList.map(o => `
          <div class="order-card" style="margin-bottom:10px">
            <p class="order-card-id">Order #${o.orderId}</p>
            <p class="order-card-items">${o.items?.map(i=>`${i.name} × ${i.quantity}`).join(', ')||'—'}</p>
            <p class="order-card-total">${o.total ? fmt(o.total) : ''}</p>
            <p class="order-card-date">${new Date(o.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
          </div>`) .join('') : `<p class="orders-empty">No orders yet. Start shopping!</p>`}
      </div>
      <button class="logout-btn" id="logoutBtn">Sign out</button>
    </div>`;
  $('logoutBtn').addEventListener('click', async () => {
    await api('POST','/api/users/logout');
    S.token=null; S.user=null; localStorage.removeItem('luma_token');
    $('accountLabel').textContent = 'Sign in';
    toast('Signed out');
    closeAccount();
  });
}

/* ── Checkout ─────────────────────────────────────────────────────────── */
function openCheckout() {
  if (!S.cart.length) { toast('Your cart is empty','err'); return; }
  const sub  = S.cart.reduce((s,i) => s+i.price*i.quantity, 0);
  const disc = S.promoApplied==='LUMA10' ? sub*0.10 : 0;
  const total = sub - disc + (sub>=45?0:4.99);

  $('coItems').innerHTML = S.cart.map(item => `
    <div class="coi">
      <span class="coi-em">${item.emoji||'📦'}</span>
      <span class="coi-name">${item.name} × ${item.quantity}</span>
      <span>${fmt(item.price*item.quantity)}</span>
    </div>`).join('');
  $('coSub').textContent = fmt(sub);
  $('coTotal').textContent = fmt(total);
  $('formError').textContent = '';

  // Pre-fill if logged in
  if (S.user) {
    const parts = S.user.name.split(' ');
    const fi = $('custFirst'), la = $('custLast'), em = $('custEmail');
    if (fi && !fi.value) fi.value = parts[0]||'';
    if (la && !la.value) la.value = parts.slice(1).join(' ')||'';
    if (em && !em.value) em.value = S.user.email||'';
  }

  $('coBg').classList.add('on');
  $('coModal').classList.add('open');
  closeCart();
}

async function placeOrder() {
  const name  = ($('custFirst').value + ' ' + $('custLast').value).trim();
  const email = $('custEmail').value.trim();
  const addr  = $('custAddress').value.trim();
  const card  = $('custCard').value.replace(/\s/g,'');
  const err   = $('formError');

  if (!name)  { err.textContent='Please enter your name.'; return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent='Please enter a valid email.'; return; }
  if (!addr)  { err.textContent='Please enter a delivery address.'; return; }
  if (!card || card.length < 16) { err.textContent='Please enter a valid card number.'; return; }
  err.textContent = '';

  const btn = $('placeOrderBtn'); btn.textContent='Placing order…'; btn.disabled=true;
  const d = await api('POST','/api/orders',{customerName:name,email});
  btn.textContent='Place order'; btn.disabled=false;

  if (d.error) { err.textContent=d.error; return; }

  // Save to user order history if logged in
  if (S.user && S.token) {
    await api('POST',`/api/users/orders/${d.order.id}`,{
      items:    d.order.items,
      total:    d.order.total,
      status:   d.order.status,
    });
  }

  $('coBg').classList.remove('on');
  $('coModal').classList.remove('open');
  S.promoApplied = null;
  await refreshCart();

  const o = d.order;
  $('confirmedMsg').textContent = `Confirmation sent to ${o.email}.`;
  $('orderReceipt').textContent = `Order #${o.id}\nItems: ${o.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}\nTotal: ${fmt(o.total)}\nPlaced: ${new Date(o.placedAt).toLocaleString()}`;
  $('confirmedScreen').style.display = 'flex';

  ['custFirst','custLast','custEmail','custAddress','custCity','custPost','custCard','custExpiry','custCvv'].forEach(id => { const el=$(id); if(el) el.value=''; });
}

/* ── Sidebar helpers ──────────────────────────────────────────────────── */
const openCart  = () => { $('cartPanel').classList.add('open');  $('cartScrim').classList.add('on');  document.body.style.overflow='hidden'; };
const closeCart = () => { $('cartPanel').classList.remove('open'); $('cartScrim').classList.remove('on'); document.body.style.overflow=''; };
const openWishlist  = () => { $('wlPanel').classList.add('open');  $('wlScrim').classList.add('on');  document.body.style.overflow='hidden'; };
const closeWishlist = () => { $('wlPanel').classList.remove('open'); $('wlScrim').classList.remove('on'); document.body.style.overflow=''; };

/* ── Event wiring ─────────────────────────────────────────────────────── */
$('cartToggle').addEventListener('click', openCart);
$('cartClose').addEventListener('click',  closeCart);
$('cartScrim').addEventListener('click',  closeCart);
$('wishlistNavBtn').addEventListener('click', openWishlist);
$('wlClose').addEventListener('click',  closeWishlist);
$('wlScrim').addEventListener('click',  closeWishlist);
$('accountBtn').addEventListener('click', openAccount);
$('accClose').addEventListener('click',   closeAccount);
$('accScrim').addEventListener('click',   closeAccount);
$('checkoutBtn').addEventListener('click', openCheckout);
$('coClose').addEventListener('click', () => { $('coModal').classList.remove('open'); $('coBg').classList.remove('on'); });
$('coBg').addEventListener('click',  () => { $('coModal').classList.remove('open'); $('coBg').classList.remove('on'); });
$('placeOrderBtn').addEventListener('click', placeOrder);

$('successClose').addEventListener('click', () => { $('confirmedScreen').style.display='none'; loadProducts(); });
$('trackOrder').addEventListener('click',   () => { toast('📦 Your order is on its way!', 'ok'); $('confirmedScreen').style.display='none'; });

$('modalBg').addEventListener('click',  closeModal);
$('modalClose').addEventListener('click', closeModal);

$('cmpMbg').addEventListener('click',    () => { $('cmpModal').classList.remove('open'); $('cmpMbg').classList.remove('on');   document.body.style.overflow=''; });
$('cmpModalClose').addEventListener('click', () => { $('cmpModal').classList.remove('open'); $('cmpMbg').classList.remove('on'); document.body.style.overflow=''; });
$('compareGoBtn').addEventListener('click',   openCompareModal);
$('compareBtn').addEventListener('click',     openCompareModal);
$('compareClearBtn').addEventListener('click', () => { S.compareList=[]; renderCompareBar(); loadProducts(); });

$('emptyReset').addEventListener('click', () => {
  S.activeCategory='All'; S.search=''; S.activeTag=null; S.activeDeals=false; S.sort='';
  $('searchInput').value=''; $('sortSelect').value='';
  document.querySelectorAll('.cb').forEach(c => c.classList.toggle('active', c.dataset.cat==='All' && !c.dataset.tag && !c.dataset.deal));
  loadProducts();
});

// Category bar
document.querySelectorAll('.cb').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cb').forEach(c => c.classList.remove('active'));
    pill.classList.add('active');
    S.activeCategory = pill.dataset.cat || 'All';
    S.activeTag      = pill.dataset.tag  || null;
    S.activeDeals    = pill.dataset.deal === 'true';
    if (S.activeTag || S.activeDeals) S.activeCategory = 'All';
    loadProducts();
    $('productsSection').scrollIntoView({ behavior:'smooth' });
  });
});

// Category showcase cards
document.querySelectorAll('.csg-card').forEach(card => {
  card.addEventListener('click', () => {
    S.activeCategory = card.dataset.cat; S.activeTag=null; S.activeDeals=false;
    document.querySelectorAll('.cb').forEach(c => c.classList.toggle('active', c.dataset.cat===card.dataset.cat));
    loadProducts();
    $('productsSection').scrollIntoView({ behavior:'smooth' });
  });
});

// Hero CTA
document.querySelectorAll('.hcta-primary').forEach(btn => {
  btn.addEventListener('click', () => {
    S.activeCategory = btn.dataset.cat || 'All';
    loadProducts();
    $('productsSection').scrollIntoView({ behavior:'smooth' });
  });
});
$('heroDealBtn').addEventListener('click', () => $('dealsSection').scrollIntoView({ behavior:'smooth' }));
$('dealsNavBtn').addEventListener('click', () => $('dealsSection').scrollIntoView({ behavior:'smooth' }));

// Hero mosaic
document.querySelectorAll('.hm-cell').forEach(cell => {
  cell.addEventListener('click', () => { const id=parseInt(cell.dataset.id); if(id) openModal(id); });
});

// Search
let sT;
$('searchInput').addEventListener('input', e => {
  clearTimeout(sT);
  S.search = e.target.value;
  $('searchClear').style.display = S.search ? 'block' : 'none';
  sT = setTimeout(loadProducts, 260);
});
$('searchClear').addEventListener('click', () => {
  $('searchInput').value = ''; S.search = '';
  $('searchClear').style.display = 'none';
  loadProducts();
});
$('searchInput').addEventListener('keydown', e => { if (e.key==='Enter') loadProducts(); });

// Sort & view
$('sortSelect').addEventListener('change', e => { S.sort=e.target.value; loadProducts(); });
$('gridView').addEventListener('click', () => { S.view='grid'; $('gridView').classList.add('active'); $('listView').classList.remove('active'); loadProducts(); });
$('listView').addEventListener('click', () => { S.view='list'; $('listView').classList.add('active'); $('gridView').classList.remove('active'); loadProducts(); });

// Promo
$('promoBtn').addEventListener('click', () => {
  const v = $('promoInput').value.trim().toUpperCase();
  if (v === 'LUMA10')   { S.promoApplied='LUMA10'; toast('10% off applied! 🎉','ok'); renderCart(); }
  else if (v === 'FREESHIP') { toast('Free delivery already included on orders over £45','ok'); }
  else toast("That code isn't valid",'err');
  $('promoInput').value = '';
});

// Card input formatting
$('custCard').addEventListener('input', e => { e.target.value=e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19); });
$('custExpiry').addEventListener('input', e => { let v=e.target.value.replace(/\D/g,''); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); e.target.value=v.slice(0,5); });

// Logo → scroll to top
$('logoHome').addEventListener('click', e => { e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); });

// Back to top
$('backTop').addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

/* ── Intersection Observer for scroll reveal ──────────────────────────── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); }});
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ── Init ─────────────────────────────────────────────────────────────── */
(async () => {
  startCountdown();
  await Promise.all([loadUser(), loadProducts(), loadDeals(), refreshCart()]);
  renderWishlist();
  initScrollReveal();
})();
