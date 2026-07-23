// ============================================================
// js/app.js  —  Full async SPA (Firestore + Cloudinary)
// ============================================================

// ============================
// LOADING STATE HELPER
// ============================
function loadingHTML(msg = 'Loading…') {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;min-height:300px">
      <div class="spinner" style="width:44px;height:44px;border-width:3px;color:var(--navy);margin-bottom:16px"></div>
      <p style="color:var(--text-muted);font-size:0.9rem;font-weight:500">${msg}</p>
    </div>`;
}

// ============================
// SETUP SCREEN (shown if Firebase not configured)
// ============================
function renderSetupScreen() {
  document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--navy);padding:40px 24px">
      <div style="background:#fff;border-radius:18px;padding:40px;max-width:600px;width:100%;border-top:4px solid var(--gold)">
        <div style="text-align:center;margin-bottom:28px">
          
          <h2 style="color:var(--navy);font-size:1.4rem;margin-bottom:8px">Firebase Setup Required</h2>
          <p style="color:var(--text-secondary);font-size:0.9rem">Open <strong>js/config.js</strong> and fill in your credentials to get started.</p>
        </div>
        <div style="background:var(--bg-primary);border-radius:10px;padding:20px;font-size:0.85rem;line-height:1.9;color:var(--text-secondary)">
          <strong style="color:var(--navy)">Quick Setup (10 minutes):</strong><br>
          1️⃣  <a href="https://console.firebase.google.com" target="_blank" style="color:var(--navy)">console.firebase.google.com</a> → Add project<br>
          2️⃣  Project Settings → Add Web App → Copy <code>firebaseConfig</code><br>
          3️⃣  Build → Firestore → Create database (test mode)<br>
          4️⃣  <a href="https://cloudinary.com" target="_blank" style="color:var(--navy)">cloudinary.com</a> → Sign up free → Get cloud name<br>
          5️⃣  Cloudinary Settings → Upload → Add unsigned preset<br>
          6️⃣  Paste all values into <code>js/config.js</code> → Refresh
        </div>
        <div style="margin-top:20px;padding:14px;background:var(--gold-light);border-radius:8px;font-size:0.8rem;color:var(--navy);text-align:center">
          Full guide is in the <strong>walkthrough artifact</strong> in your IDE.
        </div>
      </div>
    </div>`;
}

// ============================
// UTILITY FUNCTIONS
// ============================
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—';
  return CONFIG.currency + ' ' + Number(amount).toLocaleString('en-KE');
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}
function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });
}

// ============================
// HTML SANITIZER — prevents XSS when inserting user data into innerHTML
// ============================
function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================
// PASSWORD HASHING  (SHA-256 via Web Crypto API — no library needed)
// ============================
async function hashPassword(plain) {
  // Append a fixed app-level salt so rainbow tables don't work
  const msgBuffer = new TextEncoder().encode(plain + '::realestateco2026:salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(input, stored, isHashed) {
  if (isHashed) {
    const h = await hashPassword(input);
    return h === stored;
  }
  // Legacy plain-text comparison (migration path)
  return input === stored;
}

// ============================
// BADGE HELPER
// ============================
function listingBadgeClass(type) {
  if (type === 'For Sale')        return 'badge-sale';
  if (type === 'For Rent')        return 'badge-rent';
  if (type === 'For Sale & Rent') return 'badge-both';
  return 'badge-rent';
}

function submissionStatusBadge(status) {
  if (status === 'published')    return '<span class="badge badge-active">Published</span>';
  if (status === 'under review') return '<span class="badge badge-review">Under Review</span>';
  return '<span class="badge badge-pending">Submitted</span>';
}

// ============================
// LIGHTBOX VIEWER
// ============================
const LightboxViewer = {
  images: [],
  current: 0,

  open(urls, startIndex = 0) {
    this.images  = urls;
    this.current = startIndex;
    let overlay  = document.getElementById('lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lightbox-overlay';
      overlay.innerHTML = `
        <div class="lightbox-backdrop" onclick="LightboxViewer.close()"></div>
        <div class="lightbox-box">
          <button class="lightbox-close" onclick="LightboxViewer.close()">✕</button>
          <button class="lightbox-nav lightbox-prev" onclick="LightboxViewer.prev()">&#8592;</button>
          <div class="lightbox-media" id="lightbox-media"></div>
          <button class="lightbox-nav lightbox-next" onclick="LightboxViewer.next()">&#8594;</button>
          <div class="lightbox-counter" id="lightbox-counter"></div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this._render();
  },

  close() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  prev() { this.current = (this.current - 1 + this.images.length) % this.images.length; this._render(); },
  next() { this.current = (this.current + 1) % this.images.length; this._render(); },

  _render() {
    const url     = this.images[this.current];
    const mediaEl = document.getElementById('lightbox-media');
    const cntEl   = document.getElementById('lightbox-counter');
    if (!mediaEl) return;
    const isVideo = /\.(mp4|mov|avi|webm|mkv)/i.test(url) || url.includes('/video/upload/');
    mediaEl.innerHTML = isVideo
      ? `<video src="${url}" controls autoplay playsinline style="max-width:100%;max-height:80vh;border-radius:8px;background:#000"></video>`
      : `<img src="${url}" alt="" style="max-width:100%;max-height:80vh;border-radius:8px;object-fit:contain" />`;
    if (cntEl) cntEl.textContent = `${this.current + 1} / ${this.images.length}`;
    // Hide nav arrows if only one image
    document.querySelectorAll('.lightbox-nav').forEach(el => el.style.display = this.images.length > 1 ? '' : 'none');
  },
};

// Close lightbox with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') LightboxViewer.close();
  if (e.key === 'ArrowLeft')  LightboxViewer.prev();
  if (e.key === 'ArrowRight') LightboxViewer.next();
});

// ============================
// CLOUDINARY UPLOADER
// ============================
const CloudinaryUploader = {
  async upload(file, resourceType = 'auto') {
    if (!CLOUDINARY_CONFIGURED) {
      // Graceful fallback: store filename only (no actual upload)
      console.warn('Cloudinary not configured — file stored by name only.');
      return `pending_upload://${file.name}`;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY.uploadPreset);
    formData.append('folder', CLOUDINARY.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Upload failed (${res.status})`);
    }
    const data = await res.json();
    
    let url = data.secure_url;
    // Automatically apply the company logo watermark to photos and videos
    if (resourceType === 'image' || resourceType === 'video') {
      // Logo public ID: mzxbgjmgh0qumndt51g7
      const watermarkTransform = "l_mzxbgjmgh0qumndt51g7,w_0.15,c_scale/fl_layer_apply,g_south_east,x_30,y_30/";
      url = url.replace('/upload/', `/upload/${watermarkTransform}`);
    }
    return url;
  },

  async uploadAll(photos, videos, docs, onProgress) {
    const urls  = { photos: [], videos: [], documents: [] };
    const total = photos.length + videos.length + docs.length;
    if (total === 0) return urls;
    let done = 0;

    for (let i = 0; i < photos.length; i++) {
      onProgress && onProgress(`Uploading photo ${i + 1} of ${photos.length}…`, done, total);
      urls.photos.push(await this.upload(photos[i], 'image'));
      done++;
    }
    for (let i = 0; i < videos.length; i++) {
      onProgress && onProgress(`Uploading video ${i + 1} of ${videos.length}…`, done, total);
      urls.videos.push(await this.upload(videos[i], 'video'));
      done++;
    }
    for (let i = 0; i < docs.length; i++) {
      onProgress && onProgress(`Uploading document ${i + 1} of ${docs.length}…`, done, total);
      urls.documents.push(await this.upload(docs[i], 'raw'));
      done++;
    }
    return urls;
  },
};

// ============================
// TOAST NOTIFICATIONS
// ============================
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 5000); },
  info(msg)    { this.show(msg, 'info'); },
};

// ============================
// CONFIRM MODAL — replaces browser confirm() dialogs
// ============================
const ConfirmModal = {
  show(message, onConfirm, { title = 'Confirm Action', confirmLabel = 'Confirm', confirmClass = 'btn-danger' } = {}) {
    let overlay = document.getElementById('confirm-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'confirm-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3 class="modal-title">${sanitize(title)}</h3>
        </div>
        <div style="padding:16px 24px 0;color:var(--text-secondary);font-size:0.9rem;line-height:1.6">${sanitize(message)}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
          <button class="btn ${confirmClass}" id="confirm-ok-btn">${sanitize(confirmLabel)}</button>
        </div>
      </div>`;
    setTimeout(() => overlay.classList.add('open'), 10);
    document.getElementById('confirm-cancel-btn').onclick = () => overlay.classList.remove('open');
    document.getElementById('confirm-ok-btn').onclick = () => {
      overlay.classList.remove('open');
      onConfirm();
    };
  }
};

// ============================
// MARKETING KIT
// ============================
const MarketingKit = {
  _sub: null,

  open(sub) {
    this._sub = sub;
    let overlay = document.getElementById('mkit-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'mkit-overlay';
      document.body.appendChild(overlay);
    }

    const copy      = this.generateCopy(sub);
    const videoUrls = (sub.videos || []).filter(u => u.startsWith('http'));

    overlay.innerHTML = `
      <div class="modal mkit-modal">
        <div class="modal-header">
          <h3 class="modal-title">Marketing Kit — ${sanitize(sub.propertyLocation)} · ${sanitize(sub.listingType)}</h3>
          <button class="modal-close" onclick="MarketingKit.close()">✕</button>
        </div>
        <div class="mkit-body">

          <!-- POSTER -->
          <div class="mkit-section">
            <div class="mkit-section-title">Property Poster</div>
            <p class="form-hint" style="margin-bottom:10px">Generated from the listing data. Click Download to save as PNG (1080×1080, ready for social media).</p>
            <div class="mkit-poster-wrap">
              <canvas id="mkit-canvas" width="1080" height="1080"></canvas>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="MarketingKit.downloadPoster()">Download Poster PNG</button>
              ${videoUrls.length > 0 ? `<button class="btn btn-secondary" id="mkit-vid-toggle" onclick="MarketingKit.toggleVideos()">Show Video Downloads (${videoUrls.length})</button>` : ''}
            </div>
            ${videoUrls.length > 0 ? `
              <div id="mkit-video-links" style="display:none;margin-top:14px;padding:14px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border)">
                <div class="mkit-copy-label" style="margin-bottom:10px">Video files — right-click → Save As, or tap Download</div>
                ${videoUrls.map((url, i) => `
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <a href="${url}" download target="_blank" class="btn btn-secondary btn-sm">Video ${i + 1}</a>
                    <span style="font-size:0.72rem;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${url}</span>
                  </div>`).join('')}
                <div class="info-box" style="margin-top:10px">
                  <span>To automatically brand videos with your logo, open <strong>cloudinary.com → Settings → Upload Presets</strong> → your unsigned preset, and add a logo overlay transformation.</span>
                </div>
              </div>` : ''}
          </div>

          <!-- MARKETING COPY -->
          <div class="mkit-section">
            <div class="mkit-section-title">Marketing Copy</div>

            <div class="mkit-copy-block">
              <div class="mkit-copy-header">
                <div class="mkit-copy-label">Buy Rent Kenya — Listing Description</div>
                <button class="btn btn-secondary btn-sm" onclick="MarketingKit.copy('mkit-brk')">Copy</button>
              </div>
              <textarea class="form-control mkit-textarea" id="mkit-brk" readonly>${copy.buyRentKenya}</textarea>
            </div>

            <div class="mkit-copy-block">
              <div class="mkit-copy-header">
                <div class="mkit-copy-label">Instagram / Facebook Caption</div>
                <button class="btn btn-secondary btn-sm" onclick="MarketingKit.copy('mkit-social')">Copy</button>
              </div>
              <textarea class="form-control mkit-textarea" id="mkit-social" readonly>${copy.social}</textarea>
            </div>

            <div class="mkit-copy-block">
              <div class="mkit-copy-header">
                <div class="mkit-copy-label">Google Ads — Headlines &amp; Descriptions</div>
                <button class="btn btn-secondary btn-sm" onclick="MarketingKit.copy('mkit-google')">Copy</button>
              </div>
              <textarea class="form-control mkit-textarea mkit-textarea-sm" id="mkit-google" readonly>${copy.googleAds}</textarea>
            </div>

            <div class="mkit-copy-block">
              <div class="mkit-copy-header">
                <div class="mkit-copy-label">Meta (Facebook / Instagram) Ad Copy</div>
                <button class="btn btn-secondary btn-sm" onclick="MarketingKit.copy('mkit-meta')">Copy</button>
              </div>
              <textarea class="form-control mkit-textarea" id="mkit-meta" readonly>${copy.metaAds}</textarea>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="MarketingKit.close()">Close</button>
        </div>
      </div>`;

    setTimeout(() => {
      overlay.classList.add('open');
      this.drawPoster(sub);
    }, 10);
  },

  // ---- Copy generation (property name intentionally omitted — clients must contact us) ----
  generateCopy(sub) {
    const location  = sub.propertyLocation || '';
    const type      = sub.listingType || 'For Sale';
    const typeUpper = type === 'For Rent' ? 'FOR RENT' : type === 'For Sale' ? 'FOR SALE' : 'FOR SALE & RENT';
    const price     = Number(sub.startingPrice || sub.listingPrice || 0);
    const priceDisp = price
      ? (sub.unitVariants && sub.unitVariants.length > 1 ? 'From KSh ' : 'KSh ') + price.toLocaleString('en-KE')
      : '';
    const unitTypes = sub.unitVariants && sub.unitVariants.length > 0
      ? [...new Set(sub.unitVariants.map(v => v.unitType))].join(', ')
      : (sub.propertySize || '');
    const amenities = sub.amenities ? sub.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
    const notes     = (sub.fieldNotes || '').trim();
    const phone     = sub.salespersonContact || '+254 712 345 678';
    // Public headline — no property name
    const headline  = unitTypes ? `${unitTypes} ${typeUpper} — ${location}, Nairobi`
                                : `${typeUpper} — ${location}, Nairobi`;

    // --- Buy Rent Kenya ---
    const brkLines = [`${headline}`];
    if (priceDisp)          brkLines.push(`PRICE: ${priceDisp}`);
    if (unitTypes)          brkLines.push(`TYPE: ${unitTypes}`);
    if (amenities.length)   brkLines.push(`AMENITIES: ${amenities.slice(0, 8).join(' | ')}`);
    if (notes)              brkLines.push('', notes.slice(0, 600) + (notes.length > 600 ? '…' : ''));
    brkLines.push(`\n${location}, Nairobi`, `Contact: ${phone}`,
      `Listed by Real Estate Company — +254 712 345 678`,
      `(Viewing by appointment. Property name disclosed on request.)`);
    const buyRentKenya = brkLines.join('\n');

    // --- Social media ---
    const hashtagBase = '#RealEstateCompany #NairobiRealEstate #KenyaProperties';
    const hashtagLoc  = '#' + location.replace(/\s+/g, '');
    const hashtagType = type === 'For Rent' ? '#PropertyForRent #NairobiRentals' : '#PropertyForSale #BuyProperty';
    const socialLines = [`${headline}`];
    if (priceDisp)        socialLines.push(`${priceDisp}`);
    if (amenities.length) socialLines.push(`${amenities.slice(0, 4).join(' · ')}`);
    if (notes)            socialLines.push('', notes.slice(0, 250) + (notes.length > 250 ? '…' : ''));
    socialLines.push('', `${location}, Nairobi`,
      `Book a viewing: ${phone}`,
      `realestateco.co.ke`, '',
      `${hashtagBase} ${hashtagType} ${hashtagLoc}`);
    const social = socialLines.join('\n');

    // --- Google Ads ---
    const gh1 = (`${unitTypes || 'Property'} ${typeUpper}`).slice(0, 30);
    const gh2 = (`${typeUpper} in ${location}`).slice(0, 30);
    const gh3 = (priceDisp || 'Real Estate Company').slice(0, 30);
    const gd1 = (`${unitTypes ? unitTypes + ' a' : 'A'}vailable in ${location}. ${amenities.slice(0, 2).join(', ')}.`).slice(0, 90);
    const gd2 = (`Contact Real Estate Company. Call ${phone}. Structured property solutions.`).slice(0, 90);
    const googleAds = [
      `HEADLINE 1 (max 30 chars): ${gh1}`,
      `HEADLINE 2 (max 30 chars): ${gh2}`,
      `HEADLINE 3 (max 30 chars): ${gh3}`,
      `DESCRIPTION 1 (max 90 chars): ${gd1}`,
      `DESCRIPTION 2 (max 90 chars): ${gd2}`,
      `FINAL URL: https://realestateco.co.ke`,
    ].join('\n');

    // --- Meta Ads ---
    const metaLines = [`${headline}`, ''];
    if (notes) {
      metaLines.push(notes.slice(0, 400) + (notes.length > 400 ? '…' : ''), '');
    } else {
      metaLines.push(`Premium property available in ${location}, Nairobi.`, '');
    }
    if (priceDisp)        metaLines.push(`Asking: ${priceDisp}`);
    if (unitTypes)        metaLines.push(`${unitTypes}`);
    if (amenities.length) metaLines.push(`${amenities.slice(0, 5).join(', ')}`);
    metaLines.push('', `${location}, Nairobi`,
      `Call/WhatsApp: ${phone}`,
      `realestateco.co.ke`, '',
      `DM or call to book a viewing. Property name disclosed on enquiry.`);
    const metaAds = metaLines.join('\n');

    return { buyRentKenya, social, googleAds, metaAds };
  },

  // ---- Canvas poster drawing — layout adapts to photo count, no property name ----
  async drawPoster(sub) {
    const canvas = document.getElementById('mkit-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1080;
    const NAVY = '#123527', GOLD = '#c97c3d', WHITE = '#ffffff';

    const photos   = (sub.photos || []).filter(u => u.startsWith('http'));
    const nPhotos  = photos.length;
    const price    = Number(sub.startingPrice || sub.listingPrice || 0);
    const priceDisp= price
      ? (sub.unitVariants && sub.unitVariants.length > 1 ? 'From KSh ' : 'KSh ') + price.toLocaleString('en-KE')
      : '';
    const units    = sub.unitVariants && sub.unitVariants.length
      ? [...new Set(sub.unitVariants.map(v => v.unitType))].join('  ·  ')
      : (sub.propertySize || '');
    const amenArr  = sub.amenities ? sub.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
    const typeLabel= sub.listingType === 'For Rent' ? 'FOR RENT'
      : sub.listingType === 'For Sale' ? 'FOR SALE' : 'FOR SALE & RENT';

    // ── BACKGROUND ────────────────────────────────────────────
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);
    // Decorative corner accent
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.moveTo(W - 200, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 200); ctx.closePath(); ctx.fill();

    // ── HEADER (0–105) ────────────────────────────────────────
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, 105);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 38px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('REAL ESTATE COMPANY', W / 2, 56);
    ctx.font = '17px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('Structured Property Solutions', W / 2, 85);

    // ── TYPE + PRICE BAND (105–157) ───────────────────────────
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, 105, W, 52);
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(typeLabel, 24, 141);
    if (priceDisp) {
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(priceDisp, W - 24, 141);
    }

    // ── COMPUTE PHOTO LAYOUT SLOTS ────────────────────────────
    // Each slot: { x, y, w, h }
    let slots = [];
    const GAP = 4;
    if (nPhotos >= 4) {
      // 1 large + 3 equal thumbnails
      slots = [
        { x: 0,           y: 157, w: W,           h: 378 },
        { x: 0,           y: 539, w: W/3 - GAP,   h: 148 },
        { x: W/3 + GAP/2, y: 539, w: W/3 - GAP,   h: 148 },
        { x: 2*W/3 + GAP, y: 539, w: W/3 - GAP,   h: 148 },
      ];
    } else if (nPhotos === 3) {
      // 1 large + 2 side-by-side thumbnails
      slots = [
        { x: 0,         y: 157, w: W,         h: 378 },
        { x: 0,         y: 539, w: W/2 - GAP, h: 148 },
        { x: W/2 + GAP, y: 539, w: W/2 - GAP, h: 148 },
      ];
    } else if (nPhotos === 2) {
      // 2 equal side-by-side (taller, more presence)
      slots = [
        { x: 0,         y: 157, w: W/2 - GAP, h: 440 },
        { x: W/2 + GAP, y: 157, w: W/2 - GAP, h: 440 },
      ];
    } else if (nPhotos === 1) {
      // Single full-width image
      slots = [{ x: 0, y: 157, w: W, h: 440 }];
    }
    // nPhotos === 0 → no image area at all

    const mediaBottom = slots.length > 0
      ? Math.max(...slots.map(s => s.y + s.h)) + GAP
      : 157;

    // Draw placeholder backgrounds (while images load)
    slots.forEach(s => {
      ctx.fillStyle = '#ddd8cc';
      ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    // ── DETAILS SECTION (mediaBottom → 895) ──────────────────
    const detY = mediaBottom;
    const detH = 895 - detY;
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, detY, W, detH);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, detY, 6, detH);

    // For 0 photos: make location the hero
    if (nPhotos === 0) {
      ctx.fillStyle = NAVY;
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRIME LOCATION', W / 2, detY + 55);
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 58px Georgia, serif';
      const loc = (sub.propertyLocation || '').toUpperCase();
      ctx.fillText(loc.length > 16 ? loc.slice(0, 15) + '…' : loc, W / 2, detY + 130);
      ctx.fillStyle = NAVY;
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('NAIROBI, KENYA', W / 2, detY + 170);
      ctx.fillStyle = GOLD;
      ctx.fillRect(W / 2 - 80, detY + 185, 160, 3);
      if (units) {
        ctx.fillStyle = '#444';
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('' + (units.length > 50 ? units.slice(0, 48) + '…' : units), W / 2, detY + 225);
      }
      if (amenArr.length) {
        ctx.font = '17px Arial, sans-serif';
        ctx.fillStyle = '#555';
        const al = amenArr.slice(0, 5).join('  ·  ');
        ctx.fillText('' + (al.length > 60 ? al.slice(0, 58) + '…' : al), W / 2, detY + 260);
      }
      ctx.textAlign = 'left';
    } else {
      // Normal layout: location prominent, no property name
      ctx.fillStyle = NAVY;
      ctx.font = 'bold 34px Georgia, serif';
      ctx.textAlign = 'left';
      const locFull = '' + (sub.propertyLocation || '').toUpperCase() + ', NAIROBI';
      ctx.fillText(locFull.length > 36 ? locFull.slice(0, 34) + '…' : locFull, 28, detY + 46);

      if (units) {
        ctx.font = '21px Arial, sans-serif';
        ctx.fillStyle = '#444';
        ctx.fillText('' + (units.length > 58 ? units.slice(0, 56) + '…' : units), 28, detY + 84);
      }
      if (amenArr.length) {
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = '#555';
        const al = amenArr.slice(0, 5).join('  ·  ');
        ctx.fillText('' + (al.length > 64 ? al.slice(0, 62) + '…' : al), 28, detY + 118);
      }
      // Description snippet if space allows
      const notes = (sub.fieldNotes || '').trim();
      if (notes && detH > 165) {
        ctx.font = 'italic 15px Georgia, serif';
        ctx.fillStyle = '#888';
        ctx.fillText(notes.slice(0, 95) + (notes.length > 95 ? '…' : ''), 28, detY + 152);
      }
      // Price right-aligned in details
      if (priceDisp) {
        ctx.fillStyle = NAVY;
        ctx.font = 'bold 28px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText(priceDisp, W - 28, detY + 46);
      }
    }

    // ── FOOTER (895–1080) ─────────────────────────────────────
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 895, W, 185);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, 895, W, 4);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CALL US: +254 712 345 678', W / 2, 963);
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.font = '19px Arial, sans-serif';
    ctx.fillText('hello@realestateco.co.ke  |  realestateco.co.ke', W / 2, 1005);
    ctx.fillStyle = GOLD;
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('@realestateco  ·  fb: Real Estate Company', W / 2, 1043);

    // ── LOAD REAL PHOTOS INTO SLOTS ───────────────────────────
    if (photos.length > 0 && slots.length > 0) {
      await this._drawPhotos(ctx, photos, slots);
    }
  },

  _drawPhotos(ctx, urls, slots) {
    return new Promise(resolve => {
      const toLoad = Math.min(urls.length, slots.length);
      if (toLoad === 0) { resolve(); return; }
      let done = 0;

      const drawCover = (img, s) => {
        const sAR = img.width / img.height, dAR = s.w / s.h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (sAR > dAR) { sw = sh * dAR; sx = (img.width - sw) / 2; }
        else           { sh = sw / dAR; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, s.x, s.y, s.w, s.h);
      };

      for (let i = 0; i < toLoad; i++) {
        const slot = slots[i];
        const img  = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => { drawCover(img, slot); if (++done >= toLoad) resolve(); };
        img.onerror = () => { if (++done >= toLoad) resolve(); };
        img.src = urls[i];
      }
    });
  },

  async downloadPoster() {
    await this.drawPoster(this._sub);
    const canvas = document.getElementById('mkit-canvas');
    if (!canvas) return;
    try {
      const a = document.createElement('a');
      a.download = 'realestateco-' + (this._sub.propertyLocation || 'property').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-poster.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (err) {
      Toast.error('Export failed — your Cloudinary account may need CORS enabled for canvas export. Try downloading the poster without photos.');
    }
  },

  copy(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    copyToClipboard(el.value);
    Toast.success('Copied to clipboard!');
  },

  toggleVideos() {
    const el  = document.getElementById('mkit-video-links');
    const btn = document.getElementById('mkit-vid-toggle');
    if (!el) return;
    const shown = el.style.display !== 'none';
    el.style.display  = shown ? 'none' : 'block';
    if (btn) btn.textContent = shown ? `Show Video Downloads (${(this._sub.videos || []).filter(u => u.startsWith('http')).length})` : 'Hide Video Downloads';
  },

  close() {
    document.getElementById('mkit-overlay')?.classList.remove('open');
  },
};

// ============================
// USER SETTINGS
// ============================
const UserSettings = {
  openChangePasswordModal() {
    let overlay = document.getElementById('pwd-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'pwd-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Change Password</h3>
          <button class="modal-close" onclick="document.getElementById('pwd-modal-overlay').classList.remove('open')">✕</button>
        </div>
        <form onsubmit="UserSettings.savePassword(event)">
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <input type="password" id="cpwd-current" class="form-control" required />
          </div>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input type="password" id="cpwd-new" class="form-control" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <input type="password" id="cpwd-confirm" class="form-control" required />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('pwd-modal-overlay').classList.remove('open')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="cpwd-btn">Save Password</button>
          </div>
        </form>
      </div>`;
    setTimeout(() => overlay.classList.add('open'), 10);
  },
  async savePassword(e) {
    e.preventDefault();
    const curr = document.getElementById('cpwd-current').value;
    const pwd1 = document.getElementById('cpwd-new').value;
    const pwd2 = document.getElementById('cpwd-confirm').value;
    const btn  = document.getElementById('cpwd-btn');

    if (pwd1 !== pwd2)  return Toast.error('New passwords do not match.');
    if (pwd1.length < 6) return Toast.error('Password must be at least 6 characters.');

    const user = DB.getCurrentUser();
    // Verify current password (handles both hashed and legacy)
    const ok = await verifyPassword(curr, user.password, user.passwordHashed === true);
    if (!ok) return Toast.error('Current password is incorrect.');

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const hashed = await hashPassword(pwd1);
      await DB.updateUser(user.id, { password: hashed, passwordHashed: true });
      user.password = hashed;
      user.passwordHashed = true;
      DB.setCurrentUser(user);
      Toast.success('Password changed successfully!');
      document.getElementById('pwd-modal-overlay').classList.remove('open');
    } catch (err) {
      Toast.error('Failed to update password.');
      btn.disabled = false; btn.textContent = 'Save Password';
    }
  }
};

// ============================
// ROUTER
// ============================
const Router = {
  render(html) {
    const app = document.getElementById('app');
    app.innerHTML = html;
    const main = app.querySelector('.page-enter-target') || app.firstElementChild;
    if (main) main.classList.add('page-enter');
    this.attachGlobalEvents();
  },
  attachGlobalEvents() {
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.addEventListener('click', () => { DB.logout(); Router.go('login'); });
    });
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const user = DB.getCurrentUser();
        if (!user) return Router.go('login');
        if (user.role === 'admin') AdminDashboard.showSection(el.dataset.nav);
        else SalespersonDashboard.showSection(el.dataset.nav);
      });
    });
  },
  go(view) {
    switch (view) {
      case 'login':       return LoginPage.render();
      case 'admin':       return AdminDashboard.render();
      case 'salesperson': return SalespersonDashboard.render();
      default:            return LoginPage.render();
    }
  },
};

// ============================
// LOGIN PAGE
// ============================
const LoginPage = {
  render() {
    Router.render(`
      <div class="login-page">
        <div class="login-container">
          <div class="login-header">
            
            <h1 class="login-title">${CONFIG.appName}</h1>
            <p class="login-subtitle">${CONFIG.appTagline}</p>
          </div>
          <div class="login-card">
            <div class="login-tabs">
              <button class="login-tab active" id="tab-login" onclick="LoginPage.switchTab('login')">Sign In</button>
              <button class="login-tab" id="tab-reset" onclick="LoginPage.switchTab('reset')">Forgot Password</button>
            </div>

            <!-- Sign In panel -->
            <div id="login-panel">
              <div class="info-box" style="margin-bottom:16px">
                
                <span>
                  <strong>Demo mode</strong> — this is a portfolio showcase. Sign in with
                  <strong>admin@realestateco.co.ke</strong> / <strong>Demo@2026</strong>,
                  or <button type="button" onclick="LoginPage.fillDemoLogin()" style="background:none;border:none;color:var(--navy);font-weight:700;text-decoration:underline;cursor:pointer;padding:0;font-size:inherit">click here to sign in instantly</button>.
                </span>
              </div>
              <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
                <div class="form-group">
                  <label class="form-label" for="login-email">Email Address</label>
                  <input id="login-email" type="email" class="form-control" placeholder="you@realestateco.co.ke" required autocomplete="email" value="admin@realestateco.co.ke" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="login-password">Password</label>
                  <div class="password-wrapper">
                    <input id="login-password" type="password" class="form-control" placeholder="Enter your password" required autocomplete="current-password" />
                    <button type="button" class="password-toggle" onclick="LoginPage.togglePassword('login-password', this)">Show</button>
                  </div>
                </div>
                <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:8px">Sign In</button>
              </form>
              <p style="text-align:center;margin-top:14px;font-size:0.78rem;color:var(--text-muted)">Forgot your password? <button onclick="LoginPage.switchTab('reset')" style="background:none;border:none;color:var(--navy);font-weight:600;cursor:pointer;font-size:0.78rem">Reset it →</button></p>
            </div>

            <!-- Forgot Password panel (3 steps) -->
            <div id="reset-panel" style="display:none">
              <!-- Step 1: Enter email -->
              <div id="fp-step-1">
                <div style="text-align:center;padding:12px 0 20px">
                  
                  <h3 style="font-size:1rem;color:var(--navy);margin-bottom:6px">Reset Your Password</h3>
                  <p style="color:var(--text-muted);font-size:0.82rem">Enter your email to receive a 6-digit reset code.</p>
                </div>
                <form id="fp-email-form" onsubmit="LoginPage.handleForgotPassword(event)">
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="fp-email" class="form-control" placeholder="you@realestateco.co.ke" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" id="fp-email-btn">Send Reset Code</button>
                </form>
                <p style="text-align:center;margin-top:14px;font-size:0.78rem;color:var(--text-muted)">No account? Contact <strong>admin@realestateco.co.ke</strong></p>
              </div>
              <!-- Step 2: Enter OTP -->
              <div id="fp-step-2" style="display:none">
                <div style="text-align:center;padding:12px 0 20px">
                  
                  <h3 style="font-size:1rem;color:var(--navy);margin-bottom:6px">Check Your Email</h3>
                  <p style="color:var(--text-muted);font-size:0.82rem">Enter the 6-digit code sent to <strong id="fp-email-display"></strong></p>
                </div>
                <form id="fp-otp-form" onsubmit="LoginPage.handleVerifyOTP(event)">
                  <div class="form-group">
                    <label class="form-label">Reset Code</label>
                    <input type="text" id="fp-otp" class="form-control" placeholder="000000" maxlength="6" required
                      style="text-align:center;letter-spacing:8px;font-size:1.5rem;font-weight:700" />
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" id="fp-otp-btn">Verify Code</button>
                  <button type="button" class="btn btn-secondary btn-full" style="margin-top:8px" onclick="LoginPage.showFPStep(1)">← Back</button>
                </form>
              </div>
              <!-- Step 3: New password -->
              <div id="fp-step-3" style="display:none">
                <div style="text-align:center;padding:12px 0 20px">
                  
                  <h3 style="font-size:1rem;color:var(--navy);margin-bottom:6px">Set New Password</h3>
                  <p style="color:var(--text-muted);font-size:0.82rem">Choose a new password for your account.</p>
                </div>
                <form id="fp-newpwd-form" onsubmit="LoginPage.handleResetPassword(event)">
                  <div class="form-group">
                    <label class="form-label">New Password</label>
                    <div class="password-wrapper">
                      <input type="password" id="fp-newpwd" class="form-control" placeholder="Min 6 characters" required minlength="6" />
                      <button type="button" class="password-toggle" onclick="LoginPage.togglePassword('fp-newpwd',this)">Show</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" id="fp-confirmpwd" class="form-control" placeholder="Repeat password" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" id="fp-save-btn">Save New Password</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>`);
  },

  resetEmail:  '',
  resetUserId: '',

  switchTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reset').classList.toggle('active', tab === 'reset');
    document.getElementById('login-panel').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('reset-panel').style.display = tab === 'reset' ? 'block' : 'none';
    if (tab === 'reset') this.showFPStep(1);
  },

  showFPStep(step) {
    [1, 2, 3].forEach(s => {
      const el = document.getElementById(`fp-step-${s}`);
      if (el) el.style.display = s === step ? 'block' : 'none';
    });
  },

  fillDemoLogin() {
    document.getElementById('login-email').value = 'admin@realestateco.co.ke';
    document.getElementById('login-password').value = 'Demo@2026';
    document.getElementById('login-form').requestSubmit();
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
    else { input.type = 'password'; btn.textContent = 'Show'; }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const user = await DB.getUserByEmail(email);
      if (!user) { Toast.error('No account found with this email.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }

      // Verify password (supports both hashed and legacy plain-text)
      const ok = await verifyPassword(password, user.password, user.passwordHashed === true);
      if (!ok) { Toast.error('Incorrect password. Please try again.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }
      if (user.status !== 'active') { Toast.error('Your account has been deactivated. Contact admin.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }

      // Auto-migrate: hash plain-text password on first login
      if (!user.passwordHashed) {
        const hashed = await hashPassword(password);
        await DB.updateUser(user.id, { password: hashed, passwordHashed: true }).catch(() => {});
        user.password = hashed;
        user.passwordHashed = true;
      }

      DB.setCurrentUser(user);
      Toast.success(`Welcome back, ${sanitize(user.name)}!`);
      if (user.role === 'admin') Router.go('admin');
      else Router.go('salesperson');
    } catch (err) {
      console.error('Login error:', err);
      Toast.error('Connection error. Check your internet and try again.');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('fp-email').value.trim();
    const btn   = document.getElementById('fp-email-btn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending…';
    try {
      const result = await DB.createPasswordReset(email);
      if (!result) {
        Toast.error('No account found with this email.');
        btn.disabled = false; btn.textContent = 'Send Reset Code'; return;
      }
      this.resetEmail = email;

      if (EMAILJS_CONFIGURED) {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          to_email: email,
          to_name:  result.user.name,
          otp_code: result.otp,
        }, EMAILJS_CONFIG.publicKey);
        Toast.success('Reset code sent! Check your email.');
      } else {
        // EmailJS not set up yet — show code on screen (dev mode)
        Toast.info(`Dev mode — code is: ${result.otp}`, 10000);
      }

      const disp = document.getElementById('fp-email-display');
      if (disp) disp.textContent = email;
      this.showFPStep(2);
    } catch (err) {
      Toast.error('Failed to send reset code. Try again.');
    }
    btn.disabled = false; btn.textContent = 'Send Reset Code';
  },

  async handleVerifyOTP(e) {
    e.preventDefault();
    const otp = document.getElementById('fp-otp').value.trim();
    const btn = document.getElementById('fp-otp-btn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Verifying…';
    try {
      const result = await DB.verifyPasswordReset(this.resetEmail, otp);
      if (!result.success) { Toast.error(result.error); btn.disabled = false; btn.textContent = 'Verify Code'; return; }
      this.resetUserId = result.user.id;
      this.showFPStep(3);
    } catch (err) {
      Toast.error('Verification failed. Try again.');
    }
    btn.disabled = false; btn.textContent = 'Verify Code';
  },

  async handleResetPassword(e) {
    e.preventDefault();
    const pwd1 = document.getElementById('fp-newpwd').value;
    const pwd2 = document.getElementById('fp-confirmpwd').value;
    if (pwd1 !== pwd2) { Toast.error('Passwords do not match.'); return; }
    if (pwd1.length < 6) { Toast.error('Password must be at least 6 characters.'); return; }
    const btn = document.getElementById('fp-save-btn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
    try {
      const hashed = await hashPassword(pwd1);
      await DB.updateUser(this.resetUserId, { password: hashed, passwordHashed: true });
      await DB.clearPasswordReset(this.resetUserId);
      Toast.success('Password reset! Please sign in with your new password.');
      this.resetEmail = ''; this.resetUserId = '';
      this.switchTab('login');
    } catch (err) {
      Toast.error('Failed to save new password. Try again.');
    }
    btn.disabled = false; btn.textContent = 'Save New Password';
  },
};

// ============================
// ADMIN DASHBOARD
// ============================
const AdminDashboard = {
  currentSection: 'overview',

  render() {
    const user = DB.getCurrentUser();
    if (!user || user.role !== 'admin') return Router.go('login');

    document.getElementById('app').innerHTML = `
      <div class="page">
        ${this._navbar(user)}
        <div class="dashboard-layout">
          <aside class="sidebar" id="admin-sidebar">${this._sidebar(0, 0)}</aside>
          <main class="main-content page-enter-target" id="admin-main">${loadingHTML('Loading dashboard…')}</main>
        </div>
      </div>`;
    Router.attachGlobalEvents();
    this.showSection('overview');
  },

  _navbar(user) {
    return `
      <nav class="navbar">
        <div class="navbar-inner">
          <div class="logo">
            <div><div class="logo-text">${CONFIG.appName}</div><span class="logo-sub">Admin Portal · <span class="badge badge-rent" style="vertical-align:middle">Demo</span></span></div>
          </div>
          <div class="nav-actions">
            <div class="nav-user">
              <div class="nav-avatar">${getInitials(user.name)}</div>
              <div>
                <div class="nav-user-name">${sanitize(user.name)}</div>
                <div class="nav-user-role"><span class="badge badge-admin" style="padding:1px 6px;font-size:0.65rem">Admin</span></div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="UserSettings.openChangePasswordModal()">Change Password</button>
            <button class="btn btn-secondary btn-sm" data-action="logout">Logout</button>
          </div>
        </div>
      </nav>`;
  },

  _sidebar(spCount = 0, subCount = 0) {
    const sections = [
      { id: 'overview', label: 'Overview' },
      { id: 'accounts', label: 'User Accounts', badge: spCount },
      { id: 'submissions', label: 'All Submissions', badge: subCount },
    ];
    return `
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${sections.map(s => `
          <button class="sidebar-item ${this.currentSection === s.id ? 'active' : ''}" data-nav="${s.id}">
            ${s.label}
            ${s.badge !== undefined ? `<span class="sidebar-badge">${s.badge}</span>` : ''}
          </button>`).join('')}
      </div>`;
  },

  async _updateSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;
    try {
      const [users, subs] = await Promise.all([DB.getUsers(), DB.getSubmissions()]);
      sidebar.innerHTML = this._sidebar(users.length, subs.length);
      Router.attachGlobalEvents();
    } catch (e) {}
  },

  async showSection(section) {
    this.currentSection = section;
    const main = document.getElementById('admin-main');
    if (!main) return;

    main.innerHTML = loadingHTML();
    document.querySelectorAll('.sidebar-item').forEach(el =>
      el.classList.toggle('active', el.dataset.nav === section));

    try {
      main.innerHTML = await this._renderSection(section);
      main.classList.add('page-enter');
      setTimeout(() => main.classList.remove('page-enter'), 400);
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error loading section</div><div class="empty-state-text">${err.message}</div></div>`;
    }
    Router.attachGlobalEvents();
    this._updateSidebar();
  },

  async _renderSection(section) {
    switch (section) {
      case 'overview':    return this._overview();
      case 'accounts':    return this._accounts();
      case 'submissions': return this._submissions();
      default:            return this._overview();
    }
  },

  async _overview() {
    const [subs, users] = await Promise.all([DB.getSubmissions(), DB.getUsers()]);
    const totalValue = subs.reduce((s, x) => s + (Number(x.startingPrice || x.listingPrice) || 0), 0);
    const forSale    = subs.filter(s => s.listingType === 'For Sale').length;
    const forRent    = subs.filter(s => s.listingType === 'For Rent').length;
    const forBoth    = subs.filter(s => s.listingType === 'For Sale & Rent').length;
    const recent     = subs.slice(0, 5);

    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Dashboard Overview</h2><p class="section-subtitle">Welcome back! Here's what's happening.</p></div>
          <button class="btn btn-primary btn-sm" onclick="AdminDashboard.showSection('accounts')">+ Add User</button>
        </div>
        <div class="stats-grid">
          <div class="stat-card" style="--stat-color:var(--navy)"><div class="stat-value">${users.length}</div><div class="stat-label">Total Users</div></div>
          <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-value">${subs.length}</div><div class="stat-label">Total Submissions</div></div>
          <div class="stat-card" style="--stat-color:var(--gold)"><div class="stat-value" style="font-size:1.3rem">${formatCurrency(totalValue)}</div><div class="stat-label">Total Portfolio Value</div></div>
          <div class="stat-card" style="--stat-color:var(--warning)">
            
            <div class="stat-value" style="font-size:1rem">
              <span style="color:var(--navy)">${forSale}</span><span style="font-size:0.7rem;color:var(--text-muted)"> sale</span>
              &nbsp;/&nbsp;
              <span style="color:var(--success)">${forRent}</span><span style="font-size:0.7rem;color:var(--text-muted)"> rent</span>
              &nbsp;/&nbsp;
              <span style="color:#475569">${forBoth}</span><span style="font-size:0.7rem;color:var(--text-muted)"> both</span>
            </div>
            <div class="stat-label">Sale / Rent / Both</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Submissions</span>
            <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.showSection('submissions')">View All →</button>
          </div>
          ${recent.length === 0 ? `
            <div class="empty-state"><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Salespersons haven't submitted any properties yet.</div></div>
          ` : `
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Property</th><th>Agent</th><th>Type</th><th>Price (KSh)</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  ${recent.map(s => `
                    <tr>
                      <td><div class="td-name">${sanitize(s.propertyTitle)}</div><div class="td-secondary">${sanitize(s.propertyLocation)}</div></td>
                      <td>${sanitize(s.salespersonName)}</td>
                      <td><span class="badge ${listingBadgeClass(s.listingType)}">${sanitize(s.listingType)}</span></td>
                      <td class="td-price">${s.unitVariants && s.unitVariants.length > 0 ? 'From ' + formatCurrency(s.startingPrice) : formatCurrency(s.listingPrice || s.startingPrice)}</td>
                      <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(s.createdAt)}</td>
                      <td><button class="btn btn-secondary btn-sm" onclick="AdminDashboard.viewSubmission('${s.id}')">View</button></td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>`;
  },

  async _accounts() {
    const users = await DB.getUsers();
    // Sort users: admins first, then by name
    users.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">User Accounts</h2><p class="section-subtitle">Manage Admins and Salespersons.</p></div>
          <button class="btn btn-primary" onclick="AdminDashboard.openAddUserModal()">Add User</button>
        </div>
        <div class="info-box" style="margin-bottom:20px">
          
          <span>Create an account for your team. Admins can view all data and manage users. Salespersons can only submit listings.</span>
        </div>
        ${users.length === 0 ? `
          <div class="card"><div class="empty-state"><div class="empty-state-title">No user accounts yet</div><div class="empty-state-text">Create the first account to get started.</div></div></div>
        ` : `
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="nav-avatar" style="width:36px;height:36px;font-size:13px;flex-shrink:0">${getInitials(u.name)}</div><div class="td-name">${sanitize(u.name)}</div></div></td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-rent'}">${u.role === 'admin' ? 'Admin' : 'Salesperson'}</span></td>
                    <td style="font-size:0.82rem">${sanitize(u.email)}</td>
                    <td style="font-size:0.82rem">${sanitize(u.phone || '—')}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:4px">
                        ${u.passwordHashed
                          ? `<span style="font-size:0.72rem;color:var(--success);background:var(--success-light);padding:2px 8px;border-radius:100px">Hashed</span>`
                          : `<span style="font-size:0.72rem;color:var(--warning);background:var(--warning-light);padding:2px 8px;border-radius:100px">Plain-text — ask user to reset password</span>`
                        }
                      </div>
                    </td>
                    <td><span class="badge badge-${u.status}">${sanitize(u.status)}</span></td>
                    <td>
                      <div class="account-row-actions">
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.editUser('${u.id}')">Edit</button>
                        <button class="btn ${u.status === 'active' ? 'btn-danger' : 'btn-success'} btn-sm" onclick="AdminDashboard.toggleUserStatus('${u.id}')">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                        ${u.id !== DB.getCurrentUser().id ? `<button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteUser('${u.id}')">Delete</button>` : ''}
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}

        <!-- Add/Edit User Modal -->
        <div class="modal-overlay" id="add-user-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title" id="modal-title">Add User Account</h3>
              <button class="modal-close" onclick="AdminDashboard.closeModal('add-user-modal')">✕</button>
            </div>
            <form id="add-user-form" onsubmit="AdminDashboard.saveUser(event)">
              <input type="hidden" id="edit-user-id" value="" />
              <div class="form-row">
                <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input type="text" id="user-name" class="form-control" placeholder="Jane Doe" required /></div>
                <div class="form-group">
                  <label class="form-label">Role <span class="required">*</span></label>
                  <select id="user-role" class="form-control" required>
                    <option value="salesperson">Salesperson</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Email Address <span class="required">*</span></label><input type="email" id="user-email" class="form-control" placeholder="jane@realestateco.co.ke" required /></div>
                <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" id="user-phone" class="form-control" placeholder="+254712345678" /></div>
              </div>
              <div class="form-group">
                <label class="form-label">Password <span class="required">*</span></label>
                <div style="display:flex;gap:8px">
                  <div class="password-wrapper" style="flex:1"><input type="text" id="user-password" class="form-control" placeholder="Set a secure password" required /></div>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('user-password').value=generatePassword()">Generate</button>
                </div>
                <p class="form-hint">The user will use these credentials to log in.</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="AdminDashboard.closeModal('add-user-modal')">Cancel</button>
                <button type="submit" class="btn btn-primary" id="save-user-btn">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  async _submissions() {
    const [subs, users] = await Promise.all([DB.getSubmissions(), DB.getSalespersons()]);
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">All Property Submissions</h2><p class="section-subtitle">${subs.length} listing${subs.length !== 1 ? 's' : ''} submitted</p></div>
        </div>
        <div class="search-bar">
          <div class="search-input-wrapper">
            
            <input type="text" class="form-control" placeholder="Search properties…" id="search-subs" oninput="AdminDashboard.filterUI()" />
          </div>
          <select class="form-control" id="filter-agent" onchange="AdminDashboard.filterUI()" style="width:auto;min-width:180px">
            <option value="">All Agents</option>
            ${users.map(u => `<option value="${u.id}">${sanitize(u.name)}</option>`).join('')}
          </select>
          <select class="form-control" id="filter-type" onchange="AdminDashboard.filterUI()" style="width:auto;min-width:150px">
            <option value="">All Types</option>
            ${CONFIG.listingTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div id="submissions-grid">${this._subsGrid(subs)}</div>
        <script id="subs-json" type="application/json">${JSON.stringify(subs)}<\/script>
      </div>`;
  },

  _subsGrid(subs) {
    if (subs.length === 0) return `<div class="empty-state"><div class="empty-state-title">No submissions found</div><div class="empty-state-text">No properties match your search.</div></div>`;
    return `
      <div class="properties-grid">
        ${subs.map(s => {
          const thumb      = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
          const dispPrice  = s.unitVariants && s.unitVariants.length > 0
            ? 'From ' + formatCurrency(s.startingPrice)
            : formatCurrency(s.listingPrice || s.startingPrice);
          const unitSummary = s.unitVariants && s.unitVariants.length > 0
            ? s.unitVariants.map(v => v.unitType).filter((v,i,a) => a.indexOf(v) === i).join(', ')
            : (s.propertySize || '');
          return `
            <div class="property-card">
              <div class="property-card-header">
                <div><div class="property-title">${sanitize(s.propertyTitle)}</div><div class="property-location">${sanitize(s.propertyLocation)}</div></div>
                <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                  <span class="badge ${listingBadgeClass(s.listingType)}">${sanitize(s.listingType)}</span>
                  ${submissionStatusBadge(s.status)}
                </div>
              </div>
              ${thumb ? `<div style="height:160px;overflow:hidden;cursor:pointer" onclick="LightboxViewer.open(${JSON.stringify(s.photos.filter(u=>u.startsWith('http')))},0)"><img src="${thumb}" loading="lazy" alt="${sanitize(s.propertyTitle)}" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
              <div class="property-card-body">
                <div class="property-detail">${sanitize(unitSummary || 'N/A')}</div>
                <div class="property-detail">${sanitize(s.amenities || 'N/A')}</div>
                ${s.fieldNotes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${sanitize(s.fieldNotes)}</div>` : ''}
              </div>
              <div class="property-card-footer">
                <div><div class="property-price">${dispPrice}</div><div class="property-agent">${sanitize(s.salespersonName)} · ${formatDate(s.createdAt)}</div></div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.viewSubmission('${s.id}')">View</button>
                  <button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteSubmission('${s.id}')">Delete</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  filterUI() {
    const q       = (document.getElementById('search-subs')?.value || '').toLowerCase();
    const agent   = document.getElementById('filter-agent')?.value || '';
    const type    = document.getElementById('filter-type')?.value || '';
    const dataEl  = document.getElementById('subs-json');
    if (!dataEl) return;
    let subs = JSON.parse(dataEl.textContent || '[]');
    if (agent) subs = subs.filter(s => s.salespersonId === agent);
    if (type)  subs = subs.filter(s => s.listingType === type);
    if (q)     subs = subs.filter(s =>
      s.propertyTitle.toLowerCase().includes(q) ||
      s.propertyLocation.toLowerCase().includes(q) ||
      s.salespersonName.toLowerCase().includes(q) ||
      (s.fieldNotes || '').toLowerCase().includes(q));
    document.getElementById('submissions-grid').innerHTML = this._subsGrid(subs);
  },

  async viewSubmission(id) {
    let sub;
    try { sub = await DB.getSubmissionById(id); } catch (e) { Toast.error('Could not load submission.'); return; }
    if (!sub) return;

    let overlay = document.getElementById('detail-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'detail-modal-overlay';
      document.body.appendChild(overlay);
    }

    const photoUrls = (sub.photos || []).filter(u => u.startsWith('http'));
    const videoUrls = (sub.videos || []).filter(u => u.startsWith('http'));

    const gallery = (urls, type) => {
      if (!urls || urls.length === 0) return '';
      const httpList    = urls.filter(u => u.startsWith('http'));
      const pendingList = urls.filter(u => !u.startsWith('http'));
      if (httpList.length === 0 && pendingList.length === 0) return '';
      return `
        <div style="margin-bottom:16px">
          <div class="detail-label" style="margin-bottom:8px">${type === 'photo' ? `Photos (${urls.length})` : `Videos (${urls.length})`}</div>
          <div class="photo-grid">
            ${httpList.map((url, idx) =>
              type === 'photo'
                ? `<div class="photo-thumb lightbox-trigger" onclick="LightboxViewer.open(${JSON.stringify(httpList)},${idx})" title="Click to enlarge"><img src="${url}" alt="" loading="lazy" /></div>`
                : `<div class="photo-thumb lightbox-trigger" onclick="LightboxViewer.open(${JSON.stringify(httpList)},${idx})" title="Click to play"><video src="${url}" preload="metadata" style="width:100%;height:100%;object-fit:cover"></video></div>`
            ).join('')}
            ${pendingList.map(url =>
              `<div class="photo-thumb" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:1.4rem;background:var(--bg-primary)">${type === 'photo' ? 'Photo' : 'Video'}<span style="font-size:0.6rem;color:var(--text-muted);text-align:center;padding:0 4px">${url.replace('pending_upload://', '')}</span></div>`
            ).join('')}
          </div>
        </div>`;
    };

    // Unit variants table
    const variantsHtml = sub.unitVariants && sub.unitVariants.length > 0 ? `
      <div style="margin-bottom:20px">
        <div class="detail-label" style="margin-bottom:8px">Unit Types & Pricing</div>
        <div class="table-wrapper">
          <table class="data-table variants-table">
            <thead><tr><th>Unit Type</th><th>Size</th><th>Price (KSh)</th><th>Floor / Position</th><th>Units Available</th></tr></thead>
            <tbody>
              ${sub.unitVariants.map(v => `
                <tr>
                  <td><strong>${sanitize(v.unitType)}</strong></td>
                  <td>${sanitize(v.size || '—')}</td>
                  <td style="color:var(--navy);font-weight:600">${formatCurrency(v.price)}</td>
                  <td>${sanitize(v.floorRange || '—')}</td>
                  <td>${sanitize(v.quantity || '—')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">Starting from: <strong style="color:var(--navy)">${formatCurrency(sub.startingPrice)}</strong></div>
      </div>` : '';

    // Fallback for old submissions (single price)
    const legacyPriceHtml = (!sub.unitVariants || sub.unitVariants.length === 0) ? `
      <div class="detail-item"><div class="detail-label">Size</div><div class="detail-value">${sub.propertySize || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Price</div><div class="detail-value" style="color:var(--navy);font-weight:700">${formatCurrency(sub.listingPrice || sub.startingPrice)}</div></div>` : '';

    overlay.innerHTML = `
      <div class="modal" style="max-width:760px">
        <div class="modal-header">
          <h3 class="modal-title">${sanitize(sub.propertyTitle)}</h3>
          <button class="modal-close" onclick="document.getElementById('detail-modal-overlay').classList.remove('open')">✕</button>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Agent</div><div class="detail-value">${sanitize(sub.salespersonName)}</div></div>
          <div class="detail-item"><div class="detail-label">Contact</div><div class="detail-value">${sanitize(sub.salespersonContact)}</div></div>
          <div class="detail-item"><div class="detail-label">Location</div><div class="detail-value">${sanitize(sub.propertyLocation)}</div></div>
          <div class="detail-item"><div class="detail-label">Listing Type</div><div class="detail-value"><span class="badge ${listingBadgeClass(sub.listingType)}">${sanitize(sub.listingType)}</span></div></div>
          <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${submissionStatusBadge(sub.status)}</div></div>
          ${legacyPriceHtml}
          <div class="detail-item"><div class="detail-label">Amenities</div><div class="detail-value">${sanitize(sub.amenities || 'None listed')}</div></div>
          <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${formatDateTime(sub.createdAt)}</div></div>
        </div>
        ${variantsHtml}
        ${sub.fieldNotes ? `<div style="margin-bottom:20px"><div class="detail-label" style="margin-bottom:8px">Field Notes & Description</div><div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:0.875rem;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap">${sanitize(sub.fieldNotes)}</div></div>` : ''}
        ${gallery(sub.photos, 'photo')}
        ${gallery(sub.videos, 'video')}
        ${sub.documents && sub.documents.length > 0 ? `
          <div style="margin-bottom:16px">
            <div class="detail-label" style="margin-bottom:8px">Documents (${sub.documents.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${sub.documents.map(url => `
                <a href="${url.startsWith('http') ? url : '#'}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;font-size:0.8rem;color:var(--navy);text-decoration:none">
                  ${url.startsWith('http') ? 'View Document' : url.replace('pending_upload://', '')}
                </a>`).join('')}
            </div>
          </div>` : ''}
        <script type="application/json" id="detail-sub-json">${JSON.stringify(sub).replace(/<\/script/gi, '<\\/script')}<\/script>
        <div class="modal-footer">
          <button class="btn btn-danger" onclick="AdminDashboard.deleteSubmission('${sub.id}')">Delete</button>
          <button class="btn btn-primary" onclick="MarketingKit.open(JSON.parse(document.getElementById('detail-sub-json').textContent))">Marketing Kit</button>
          <button class="btn btn-secondary" onclick="document.getElementById('detail-modal-overlay').classList.remove('open')">Close</button>
        </div>
      </div>`;
    setTimeout(() => overlay.classList.add('open'), 10);
  },

  openAddUserModal(userId = null) {
    const modal = document.getElementById('add-user-modal');
    if (!modal) { this.showSection('accounts').then(() => setTimeout(() => this.openAddUserModal(userId), 200)); return; }
    document.getElementById('edit-user-id').value = userId || '';
    document.getElementById('modal-title').textContent = userId ? 'Edit Account' : 'Add User Account';
    document.getElementById('save-user-btn').textContent = userId ? 'Save Changes' : 'Create Account';
    if (userId) {
      DB.getUserById(userId).then(u => {
        if (u) {
          document.getElementById('user-name').value = u.name;
          document.getElementById('user-email').value = u.email;
          document.getElementById('user-phone').value = u.phone || '';
          document.getElementById('user-password').value = u.password;
          document.getElementById('user-role').value = u.role || 'salesperson';
        }
      });
    } else {
      document.getElementById('add-user-form').reset();
      document.getElementById('user-password').value = generatePassword();
      document.getElementById('user-role').value = 'salesperson';
    }
    modal.classList.add('open');
  },

  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

  async saveUser(e) {
    e.preventDefault();
    const editId   = document.getElementById('edit-user-id').value;
    const name     = document.getElementById('user-name').value.trim();
    const email    = document.getElementById('user-email').value.trim();
    const phone    = document.getElementById('user-phone').value.trim();
    const role     = document.getElementById('user-role').value;
    const password = document.getElementById('user-password').value.trim();
    const btn      = document.getElementById('save-user-btn');
    if (!name || !email || !password) return Toast.error('Please fill in all required fields.');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
    try {
      const existing = await DB.getUserByEmail(email);
      if (existing && existing.id !== editId) {
        Toast.error('An account with this email already exists.');
        btn.disabled = false; btn.textContent = editId ? 'Save Changes' : 'Create Account'; return;
      }
      // Always store a hashed password
      const hashed = await hashPassword(password);
      if (editId) {
        await DB.updateUser(editId, { name, email, phone, role, password: hashed, passwordHashed: true });
        Toast.success('Account updated!');
      } else {
        await DB.addUser({ name, email, phone, role, status: 'active', password: hashed, passwordHashed: true });
        Toast.success(`Account created for ${name}!`);
      }
      this.closeModal('add-user-modal');
      this.showSection('accounts');
    } catch (err) {
      Toast.error('Failed to save. Try again.'); btn.disabled = false; btn.textContent = editId ? 'Save Changes' : 'Create Account';
    }
  },

  editUser(id) { this.openAddUserModal(id); },

  togglePwd(userId, pwd) {
    const el = document.getElementById(`pwd-${userId}`);
    if (el) el.textContent = el.textContent === '••••••••' ? pwd : '••••••••';
  },

  async toggleUserStatus(id) {
    try {
      const u = await DB.getUserById(id);
      if (!u) return;
      const ns = u.status === 'active' ? 'inactive' : 'active';
      await DB.updateUser(id, { status: ns });
      Toast.info(`Account ${ns === 'active' ? 'activated' : 'deactivated'}.`);
      this.showSection('accounts');
    } catch (e) { Toast.error('Failed to update status.'); }
  },

  deleteUser(id) {
    ConfirmModal.show(
      'Delete this user account? Their submissions will remain.',
      async () => {
        try { await DB.deleteUser(id); Toast.success('Account deleted.'); this.showSection('accounts'); }
        catch (e) { Toast.error('Failed to delete.'); }
      },
      { title: 'Delete User', confirmLabel: 'Delete' }
    );
  },

  deleteSubmission(id) {
    ConfirmModal.show(
      'Permanently delete this property submission? This cannot be undone.',
      async () => {
        try {
          await DB.deleteSubmission(id);
          document.getElementById('detail-modal-overlay')?.classList.remove('open');
          Toast.success('Submission deleted.');
          this.showSection('submissions');
        } catch (e) { Toast.error('Failed to delete.'); }
      },
      { title: 'Delete Submission', confirmLabel: 'Delete' }
    );
  },
};

// ============================
// SALESPERSON DASHBOARD
// ============================
const SalespersonDashboard = {
  currentSection: 'overview',

  render() {
    const user = DB.getCurrentUser();
    if (!user || user.role !== 'salesperson') return Router.go('login');
    this.currentSection = 'overview';

    document.getElementById('app').innerHTML = `
      <div class="page">
        ${this._navbar(user)}
        <div class="dashboard-layout">
          <aside class="sidebar" id="sales-sidebar">${this._sidebar(0)}</aside>
          <main class="main-content page-enter-target" id="sales-main">${loadingHTML('Loading your dashboard…')}</main>
        </div>
      </div>`;
    Router.attachGlobalEvents();
    this.showSection('overview');
  },

  _navbar(user) {
    return `
      <nav class="navbar">
        <div class="navbar-inner">
          <div class="logo">
            <div><div class="logo-text">${CONFIG.appName}</div><span class="logo-sub">Salesperson Portal · <span class="badge badge-rent" style="vertical-align:middle">Demo</span></span></div>
          </div>
          <div class="nav-actions">
            <div class="nav-user">
              <div class="nav-avatar">${getInitials(user.name)}</div>
              <div><div class="nav-user-name">${sanitize(user.name)}</div><div class="nav-user-role" style="color:var(--success);font-size:0.7rem">● Salesperson</div></div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="UserSettings.openChangePasswordModal()">Change Password</button>
            <button class="btn btn-secondary btn-sm" data-action="logout">Logout</button>
          </div>
        </div>
      </nav>`;
  },

  _sidebar(subCount = 0) {
    const sections = [
      { id: 'overview', label: 'My Dashboard' },
      { id: 'submit', label: 'Submit Property' },
      { id: 'my-submissions', label: 'My Submissions', badge: subCount },
    ];
    return `
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${sections.map(s => `
          <button class="sidebar-item ${this.currentSection === s.id ? 'active' : ''}" data-nav="${s.id}">
            ${s.label}
            ${s.badge !== undefined ? `<span class="sidebar-badge">${s.badge}</span>` : ''}
          </button>`).join('')}
      </div>`;
  },

  async _updateSidebar() {
    const sidebar = document.getElementById('sales-sidebar');
    const user    = DB.getCurrentUser();
    if (!sidebar || !user) return;
    try {
      const subs = await DB.getSubmissionsByUser(user.id);
      sidebar.innerHTML = this._sidebar(subs.length);
      Router.attachGlobalEvents();
    } catch (e) {}
  },

  async showSection(section) {
    this.currentSection = section;
    const main = document.getElementById('sales-main');
    if (!main) return;
    main.innerHTML = loadingHTML();
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.toggle('active', el.dataset.nav === section));
    try {
      main.innerHTML = await this._renderSection(section);
      main.classList.add('page-enter');
      setTimeout(() => main.classList.remove('page-enter'), 400);
      if (section === 'submit') PropertyForm.init();
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
    }
    Router.attachGlobalEvents();
    this._updateSidebar();
  },

  async _renderSection(section) {
    switch (section) {
      case 'overview':       return this._overview();
      case 'submit':         return PropertyForm.render();
      case 'my-submissions': return this._mySubmissions();
      default:               return this._overview();
    }
  },

  async _overview() {
    const user = DB.getCurrentUser();
    const subs = await DB.getSubmissionsByUser(user.id);
    const totalValue = subs.reduce((s, x) => s + (Number(x.startingPrice || x.listingPrice) || 0), 0);
    const recent = subs.slice(0, 3);
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Welcome, ${sanitize(user.name)}!</h2><p class="section-subtitle">Manage your property listings and submissions.</p></div>
          <button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">Submit Property</button>
        </div>
        <div class="stats-grid">
          <div class="stat-card" style="--stat-color:var(--navy)"><div class="stat-value">${subs.length}</div><div class="stat-label">Total Submissions</div></div>
          <div class="stat-card" style="--stat-color:var(--gold)"><div class="stat-value" style="font-size:1.3rem">${formatCurrency(totalValue)}</div><div class="stat-label">Portfolio Value</div></div>
          <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-value">${subs.filter(s => s.listingType === 'For Sale').length}</div><div class="stat-label">For Sale</div></div>
          <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-value">${subs.filter(s => s.listingType === 'For Rent').length}</div><div class="stat-label">For Rent</div></div>
        </div>
        ${recent.length > 0 ? `
          <div class="card">
            <div class="card-header">
              <span class="card-title">Recent Activity</span>
              <button class="btn btn-secondary btn-sm" onclick="SalespersonDashboard.showSection('my-submissions')">View All →</button>
            </div>
            <div class="properties-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
              ${recent.map(s => {
                const thumb     = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
                const dispPrice = s.unitVariants && s.unitVariants.length > 0
                  ? 'From ' + formatCurrency(s.startingPrice)
                  : formatCurrency(s.listingPrice || s.startingPrice);
                return `
                  <div class="property-card">
                    <div class="property-card-header">
                      <div><div class="property-title">${sanitize(s.propertyTitle)}</div><div class="property-location">${sanitize(s.propertyLocation)}</div></div>
                      <span class="badge ${listingBadgeClass(s.listingType)}">${sanitize(s.listingType)}</span>
                    </div>
                    ${thumb ? `<div style="height:120px;overflow:hidden"><img src="${thumb}" loading="lazy" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
                    <div class="property-card-footer">
                      <div class="property-price">${dispPrice}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${formatDate(s.createdAt)}</div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="card">
            <div class="empty-state"><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Start by submitting your first property listing.</div></div>
            <div style="text-align:center;margin-top:16px"><button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">Submit First Property</button></div>
          </div>`}
      </div>`;
  },

  async _mySubmissions() {
    const user = DB.getCurrentUser();
    const subs = await DB.getSubmissionsByUser(user.id);
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">My Submissions</h2><p class="section-subtitle">${subs.length} propert${subs.length !== 1 ? 'ies' : 'y'} submitted</p></div>
          <button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">New Submission</button>
        </div>
        ${subs.length === 0 ? `
          <div class="empty-state"><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Submit a property to see it here.</div></div>
        ` : `
          <div class="properties-grid">
            ${subs.map(s => {
              const thumb     = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
              const dispPrice = s.unitVariants && s.unitVariants.length > 0
                ? 'From ' + formatCurrency(s.startingPrice)
                : formatCurrency(s.listingPrice || s.startingPrice);
              const unitSummary = s.unitVariants && s.unitVariants.length > 0
                ? s.unitVariants.map(v => v.unitType).filter((v,i,a) => a.indexOf(v) === i).join(', ')
                : (s.propertySize || '');
              return `
                <div class="property-card">
                  <div class="property-card-header">
                    <div><div class="property-title">${sanitize(s.propertyTitle)}</div><div class="property-location">${sanitize(s.propertyLocation)}</div></div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                      <span class="badge ${listingBadgeClass(s.listingType)}">${sanitize(s.listingType)}</span>
                      ${submissionStatusBadge(s.status)}
                    </div>
                  </div>
                  ${thumb ? `<div style="height:160px;overflow:hidden"><img src="${thumb}" loading="lazy" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
                  <div class="property-card-body">
                    <div class="property-detail">${sanitize(unitSummary || 'N/A')}</div>
                    <div class="property-detail">${sanitize(s.amenities || 'N/A')}</div>
                  </div>
                  <div class="property-card-footer">
                    <div><div class="property-price">${dispPrice}</div><div class="property-agent">${formatDate(s.createdAt)}${s.updatedAt ? ' • edited' : ''}</div></div>
                    <button class="btn btn-secondary btn-sm" onclick="PropertyForm.openEdit('${s.id}')">Edit</button>
                  </div>
                </div>`;
            }).join('')}
          </div>`}
      </div>`;
  },
};

// ============================
// PROPERTY FORM
// ============================
const PropertyForm = {
  selectedPhotos:    [],
  selectedVideos:    [],
  selectedDocs:      [],
  selectedAmenities: [],
  unitVariants:      [],   // [{unitType, size, price, floorRange, quantity}]
  // --- edit mode ---
  editMode:          false,
  editSubmissionId:  null,
  _editData:         null,
  existingPhotos:    [],
  existingVideos:    [],
  existingDocs:      [],

  render() {
    const user = DB.getCurrentUser();
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Submit Property Listing</h2><p class="section-subtitle">Fill in all details about the property.</p></div>
        </div>
        <form id="property-form" onsubmit="PropertyForm.handleSubmit(event)" novalidate>

          <!-- Agent Info -->
          <div class="form-card">
            <div class="form-section-title">Agent Information</div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Salesperson Name</label><input type="text" class="form-control" value="${user.name}" readonly style="opacity:0.7;cursor:not-allowed" /></div>
              <div class="form-group"><label class="form-label">Contact Number <span class="required">*</span></label><input type="tel" class="form-control" value="${user.phone || ''}" id="sp-contact" placeholder="+254712345678" required /></div>
            </div>
          </div>

          <!-- Property Info -->
          <div class="form-card">
            <div class="form-section-title">Property Information</div>
            <div class="form-group">
              <label class="form-label" for="prop-title">Property Title <span class="required">*</span></label>
              <input type="text" id="prop-title" class="form-control" placeholder="e.g. Riverside Heights Apartments" required />
              <span class="form-error">Property title is required.</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="prop-location">Location <span class="required">*</span></label>
                <select id="prop-location" class="form-control" required>
                  <option value="">Select location…</option>
                  ${CONFIG.propertyLocations.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
                <span class="form-error">Please select a location.</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="listing-type">Listing Type <span class="required">*</span></label>
                <select id="listing-type" class="form-control" required>
                  <option value="">Select type…</option>
                  ${CONFIG.listingTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span class="form-error">Please select a listing type.</span>
              </div>
            </div>
          </div>

          <!-- Unit Variants / Pricing -->
          <div class="form-card">
            <div class="form-section-title">Unit Types & Pricing <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">— Add one row per unit size or floor level</span></div>
            <div class="info-box" style="margin-bottom:16px">
              
              <span>Add <strong>one row per unit type</strong>. For the same bedroom count at different floors/sizes, add separate rows. The lowest price will be shown as the “Starting from” price.</span>
            </div>
            <div id="unit-variants-container"></div>
            <button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="PropertyForm.addVariantRow()">
              + Add Unit Type
            </button>
            <p id="variants-error" class="form-error" style="display:none;margin-top:8px">Please add at least one unit type with a price.</p>
          </div>

          <!-- Amenities -->
          <div class="form-card">
            <div class="form-section-title">Amenities & Features</div>
            <div class="form-group">
              <label class="form-label">Amenities Available</label>
              <div class="amenities-chips" id="amenities-chips">
                ${CONFIG.amenities.map(a => `<button type="button" class="amenity-chip" data-amenity="${a}" onclick="PropertyForm.toggleAmenity('${a}',this)">${a}</button>`).join('')}
              </div>
              <div class="amenity-custom-row">
                <input type="text" id="amenity-custom-input" class="form-control" placeholder="Add custom amenity…" style="flex:1" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="PropertyForm.addCustomAmenity()">+ Add</button>
              </div>
              <p class="form-hint">Click to select. Type and click + Add for unlisted amenities.</p>
              <div id="amenities-selected-display" class="amenities-selected-display"></div>
            </div>
          </div>

          <!-- Field Notes -->
          <div class="form-card">
            <div class="form-section-title">Field Notes & Description</div>
            <div class="form-group">
              <label class="form-label" for="field-notes">Raw Field Notes & Description <span class="required">*</span></label>
              <textarea id="field-notes" class="form-control" rows="6" placeholder="Describe the property in detail. Include condition, nearby amenities, special features, access routes, etc." required></textarea>
              <span class="form-error">Please add a description.</span>
            </div>
          </div>

          <div class="form-card">
            <div class="form-section-title">Media & Documents
              ${CLOUDINARY_CONFIGURED
                ? '<span style="font-size:0.7rem;background:rgba(26,140,91,0.12);color:var(--success);border-radius:100px;padding:2px 10px;margin-left:8px;font-weight:600">Cloudinary Connected</span>'
                : '<span style="font-size:0.7rem;background:var(--warning-light);color:var(--warning);border-radius:100px;padding:2px 10px;margin-left:8px;font-weight:600">Cloudinary not configured — files stored by name only</span>'}
            </div>

            <div class="form-group">
              <label class="form-label">Photos</label>
              <div class="file-upload-zone" id="photos-zone">
                <input type="file" id="photos-input" multiple accept="image/*" onchange="PropertyForm.handleFiles('photos',this.files)" />
                
                <div class="file-upload-text"><strong>Click to upload</strong> or drag & drop photos</div>
                <div class="file-upload-hint">JPG, PNG, WEBP · Max 10MB each</div>
              </div>
              <div class="camera-capture-row">
                <label class="btn-capture" title="Take photo with camera">
                  Take Photo
                  <input type="file" accept="image/*" capture="environment" multiple onchange="PropertyForm.handleFiles('photos',this.files)" />
                </label>
              </div>
              <div class="file-list" id="photos-list"></div>
            </div>

            <div class="form-group">
              <label class="form-label">Video Walkthrough</label>
              <div class="file-upload-zone" id="videos-zone">
                <input type="file" id="videos-input" multiple accept="video/*" onchange="PropertyForm.handleFiles('videos',this.files)" />
                
                <div class="file-upload-text"><strong>Click to upload</strong> or drag & drop videos</div>
                <div class="file-upload-hint">MP4, MOV, AVI · Max 500MB each</div>
              </div>
              <div class="camera-capture-row">
                <label class="btn-capture" title="Record video with camera">
                  Record Video
                  <input type="file" accept="video/*" capture="environment" onchange="PropertyForm.handleFiles('videos',this.files)" />
                </label>
              </div>
              <div class="file-list" id="videos-list"></div>
            </div>

            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Agreement Document</label>
              <div class="file-upload-zone" id="docs-zone">
                <input type="file" id="docs-input" accept=".pdf,.doc,.docx" onchange="PropertyForm.handleFiles('docs',this.files)" />
                
                <div class="file-upload-text"><strong>Click to upload</strong> agreement document</div>
                <div class="file-upload-hint">PDF, DOC, DOCX · Max 10MB</div>
              </div>
              <div class="file-list" id="docs-list"></div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:12px;padding-bottom:40px">
            <button type="button" class="btn btn-secondary btn-lg" onclick="ConfirmModal.show('Clear all form data and start over?',()=>{PropertyForm.editMode=false;PropertyForm.editSubmissionId=null;PropertyForm._editData=null;PropertyForm.existingPhotos=[];PropertyForm.existingVideos=[];PropertyForm.existingDocs=[];document.getElementById('property-form').reset();PropertyForm.init();},{title:'Reset Form',confirmLabel:'Clear',confirmClass:'btn-secondary'})">Reset</button>
            <button type="submit" id="submit-btn" class="btn btn-primary btn-lg">Submit Listing</button>
          </div>
        </form>

        <div class="submit-overlay" id="submit-overlay">
          <div class="spinner"></div>
          <p id="submit-overlay-msg">Uploading media…</p>
          <div id="submit-progress-bar" style="width:280px;height:6px;background:rgba(201,168,76,0.2);border-radius:3px;margin-top:8px;overflow:hidden">
            <div id="submit-progress-fill" style="height:100%;background:var(--gold);border-radius:3px;width:0%;transition:width 0.3s"></div>
          </div>
        </div>
      </div>`;
  },

  init() {
    this.selectedPhotos    = [];
    this.selectedVideos    = [];
    this.selectedDocs      = [];
    this.selectedAmenities = [];
    this.unitVariants      = [];
    ['photos-zone','videos-zone','docs-zone'].forEach(zoneId => {
      const zone = document.getElementById(zoneId);
      if (!zone) return;
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        PropertyForm.handleFiles(zoneId.replace('-zone',''), e.dataTransfer.files);
      });
    });
    const ci = document.getElementById('amenity-custom-input');
    if (ci) ci.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); PropertyForm.addCustomAmenity(); } });

    if (this.editMode && this._editData) {
      this._prefillEdit();
    } else {
      // Add first blank row for a new submission
      this.addVariantRow();
    }
  },

  // ----------------------------------------------------------
  // EDIT SUBMISSION
  // ----------------------------------------------------------
  async openEdit(submissionId) {
    Toast.info('Loading submission…');
    try {
      const sub = await DB.getSubmissionById(submissionId);
      if (!sub) { Toast.error('Could not load submission.'); return; }
      this.editMode         = true;
      this.editSubmissionId = submissionId;
      this._editData        = sub;
      this.existingPhotos   = (sub.photos    || []).filter(u => u.startsWith('http'));
      this.existingVideos   = (sub.videos    || []).filter(u => u.startsWith('http'));
      this.existingDocs     = (sub.documents || []).filter(u => u.startsWith('http'));
      SalespersonDashboard.showSection('submit');
    } catch (err) {
      Toast.error('Failed to open editor: ' + err.message);
    }
  },

  _prefillEdit() {
    const sub = this._editData;

    // --- text fields ---
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('prop-title',    sub.propertyTitle);
    set('prop-location', sub.propertyLocation);
    set('listing-type',  sub.listingType);
    set('field-notes',   sub.fieldNotes);
    set('sp-contact',    sub.salespersonContact);

    // --- unit variants ---
    if (sub.unitVariants && sub.unitVariants.length > 0) {
      sub.unitVariants.forEach((v, idx) => {
        this.unitVariants.push(v);
        this.addVariantRowFromData(idx, v);
      });
    } else {
      this.addVariantRow(); // legacy fallback
    }

    // --- amenities ---
    if (sub.amenities) {
      sub.amenities.split(', ').forEach(a => {
        const name = a.trim();
        if (!name) return;
        const chip = document.querySelector(`[data-amenity="${CSS.escape(name)}"]`);
        if (chip) { this.selectedAmenities.push(name); chip.classList.add('active'); }
        else {
          this.selectedAmenities.push(name);
          const chips = document.getElementById('amenities-chips');
          if (chips) {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'amenity-chip active custom-amenity';
            btn.dataset.amenity = name; btn.textContent = name;
            btn.onclick = () => PropertyForm.toggleAmenity(name, btn);
            chips.appendChild(btn);
          }
        }
      });
      this.renderSelectedAmenities();
    }

    // --- existing media ---
    this.renderExistingMedia();

    // --- UI labels ---
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.innerHTML = 'Update Listing';
    const title = document.querySelector('.section-title');
    if (title) title.textContent = 'Edit Property Listing';
    const sub2 = document.querySelector('.section-subtitle');
    if (sub2) sub2.textContent = 'Update the property details below.';
  },

  renderExistingMedia() {
    const types = [
      { key: 'existingPhotos', type: 'photos',  containerId: 'photos-list' },
      { key: 'existingVideos', type: 'videos',  containerId: 'videos-list' },
      { key: 'existingDocs',   type: 'docs',    containerId: 'docs-list'   },
    ];
    types.forEach(({ key, type, containerId }) => {
      const arr       = this[key];
      const container = document.getElementById(containerId);
      if (!container || !arr || arr.length === 0) return;
      const html = arr.map((url, i) => `
        <div class="file-item" id="existing-${type}-${i}">
          ${type === 'photos'
            ? `<img src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;border:1.5px solid var(--border)" />`
            : type === 'videos'
              ? `<video src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0"></video>`
              : ''}
          <span style="flex:1;font-size:0.78rem;color:var(--success)">Uploaded to Cloudinary</span>
          <button class="file-remove" type="button" onclick="PropertyForm.removeExisting('${type}',${i})">✕</button>
        </div>`);
      container.innerHTML = html.join('');
    });
  },

  removeExisting(type, index) {
    const key = type === 'photos' ? 'existingPhotos' : type === 'videos' ? 'existingVideos' : 'existingDocs';
    this[key].splice(index, 1);
    this.renderExistingMedia();
    Toast.info('Removed from list. Save the form to confirm.');
  },

  // ----------------------------------------------------------
  // UNIT VARIANTS
  // ----------------------------------------------------------
  addVariantRow() {
    const container = document.getElementById('unit-variants-container');
    if (!container) return;
    const idx = this.unitVariants.length;
    this.unitVariants.push({ unitType: '', size: '', price: '', floorRange: '', quantity: '' });
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.id = `variant-row-${idx}`;
    row.innerHTML = `
      <div class="variant-row-inner">
        <div class="form-group" style="flex:2;min-width:140px">
          ${idx === 0 ? '<label class="form-label">Unit Type <span class="required">*</span></label>' : ''}
          <select class="form-control" id="vt-type-${idx}" onchange="PropertyForm.updateVariant(${idx},'unitType',this.value)">
            <option value="">Select type…</option>
            ${CONFIG.unitTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            <option value="__custom__">Custom…</option>
          </select>
        </div>
        <div class="form-group" style="flex:1.5;min-width:100px">
          ${idx === 0 ? '<label class="form-label">Size (sqft/sqm)</label>' : ''}
          <input type="text" class="form-control" id="vt-size-${idx}" placeholder="e.g. 900 sqft" oninput="PropertyForm.updateVariant(${idx},'size',this.value)" />
        </div>
        <div class="form-group" style="flex:2;min-width:140px">
          ${idx === 0 ? '<label class="form-label">Price (KSh) <span class="required">*</span></label>' : ''}
          <input type="number" class="form-control" id="vt-price-${idx}" placeholder="e.g. 5000000" min="1" oninput="PropertyForm.updateVariant(${idx},'price',this.value)" />
        </div>
        <div class="form-group" style="flex:1.5;min-width:110px">
          ${idx === 0 ? '<label class="form-label">Floor / Position</label>' : ''}
          <input type="text" class="form-control" id="vt-floor-${idx}" placeholder="e.g. Floors 1-5" oninput="PropertyForm.updateVariant(${idx},'floorRange',this.value)" />
        </div>
        <div class="form-group" style="flex:1;min-width:80px">
          ${idx === 0 ? '<label class="form-label">Units Avail.</label>' : ''}
          <input type="number" class="form-control" id="vt-qty-${idx}" placeholder="e.g. 8" min="0" oninput="PropertyForm.updateVariant(${idx},'quantity',this.value)" />
        </div>
        <div style="${idx === 0 ? 'padding-top:28px' : ''}">
          <button type="button" class="btn btn-danger btn-sm" onclick="PropertyForm.removeVariantRow(${idx})" title="Remove row">✕</button>
        </div>
      </div>`;
    container.appendChild(row);
    document.getElementById(`vt-type-${idx}`)?.addEventListener('change', function() {
      if (this.value === '__custom__') {
        const custom = prompt('Enter custom unit type:');
        if (custom) {
          const opt = document.createElement('option');
          opt.value = custom; opt.textContent = custom; opt.selected = true;
          this.insertBefore(opt, this.lastElementChild);
          PropertyForm.updateVariant(idx, 'unitType', custom);
        } else { this.value = ''; }
      }
    });
  },

  removeVariantRow(idx) {
    if (this.unitVariants.length <= 1) { Toast.info('You need at least one unit type.'); return; }
    const row = document.getElementById(`variant-row-${idx}`);
    if (row) row.remove();
    this.unitVariants.splice(idx, 1);
    // Re-render remaining rows to update indices
    const container = document.getElementById('unit-variants-container');
    if (!container) return;
    const saved = [...this.unitVariants];
    container.innerHTML = '';
    this.unitVariants = [];
    saved.forEach(v => {
      const newIdx = this.unitVariants.length;
      this.unitVariants.push(v);
      this.addVariantRowFromData(newIdx, v);
    });
  },

  addVariantRowFromData(idx, data) {
    const container = document.getElementById('unit-variants-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.id = `variant-row-${idx}`;
    row.innerHTML = `
      <div class="variant-row-inner">
        <div class="form-group" style="flex:2;min-width:140px">
          ${idx === 0 ? '<label class="form-label">Unit Type <span class="required">*</span></label>' : ''}
          <select class="form-control" id="vt-type-${idx}" onchange="PropertyForm.updateVariant(${idx},'unitType',this.value)">
            <option value="">Select type…</option>
            ${CONFIG.unitTypes.map(t => `<option value="${t}" ${data.unitType===t?'selected':''}>${t}</option>`).join('')}
            ${data.unitType && !CONFIG.unitTypes.includes(data.unitType) ? `<option value="${data.unitType}" selected>${data.unitType}</option>` : ''}
            <option value="__custom__">Custom…</option>
          </select>
        </div>
        <div class="form-group" style="flex:1.5;min-width:100px">
          ${idx === 0 ? '<label class="form-label">Size (sqft/sqm)</label>' : ''}
          <input type="text" class="form-control" id="vt-size-${idx}" placeholder="e.g. 900 sqft" value="${data.size||''}" oninput="PropertyForm.updateVariant(${idx},'size',this.value)" />
        </div>
        <div class="form-group" style="flex:2;min-width:140px">
          ${idx === 0 ? '<label class="form-label">Price (KSh) <span class="required">*</span></label>' : ''}
          <input type="number" class="form-control" id="vt-price-${idx}" placeholder="e.g. 5000000" value="${data.price||''}" min="1" oninput="PropertyForm.updateVariant(${idx},'price',this.value)" />
        </div>
        <div class="form-group" style="flex:1.5;min-width:110px">
          ${idx === 0 ? '<label class="form-label">Floor / Position</label>' : ''}
          <input type="text" class="form-control" id="vt-floor-${idx}" placeholder="e.g. Floors 1-5" value="${data.floorRange||''}" oninput="PropertyForm.updateVariant(${idx},'floorRange',this.value)" />
        </div>
        <div class="form-group" style="flex:1;min-width:80px">
          ${idx === 0 ? '<label class="form-label">Units Avail.</label>' : ''}
          <input type="number" class="form-control" id="vt-qty-${idx}" placeholder="e.g. 8" value="${data.quantity||''}" min="0" oninput="PropertyForm.updateVariant(${idx},'quantity',this.value)" />
        </div>
        <div style="${idx === 0 ? 'padding-top:28px' : ''}">
          <button type="button" class="btn btn-danger btn-sm" onclick="PropertyForm.removeVariantRow(${idx})" title="Remove row">✕</button>
        </div>
      </div>`;
    container.appendChild(row);
  },

  updateVariant(idx, field, value) {
    if (this.unitVariants[idx]) this.unitVariants[idx][field] = value;
  },

  readVariants() {
    return this.unitVariants.map((v, idx) => ({
      unitType:   document.getElementById(`vt-type-${idx}`)?.value  || v.unitType,
      size:       document.getElementById(`vt-size-${idx}`)?.value  || v.size,
      price:      Number(document.getElementById(`vt-price-${idx}`)?.value || v.price || 0),
      floorRange: document.getElementById(`vt-floor-${idx}`)?.value || v.floorRange,
      quantity:   document.getElementById(`vt-qty-${idx}`)?.value   || v.quantity,
    })).filter(v => v.unitType && v.price > 0);
  },


  toggleAmenity(name, btn) {
    const idx = this.selectedAmenities.indexOf(name);
    if (idx === -1) { this.selectedAmenities.push(name); btn.classList.add('active'); }
    else { this.selectedAmenities.splice(idx, 1); btn.classList.remove('active'); }
    this.renderSelectedAmenities();
  },

  addCustomAmenity() {
    const input = document.getElementById('amenity-custom-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (this.selectedAmenities.includes(val)) { Toast.info(`"${val}" already added.`); return; }
    this.selectedAmenities.push(val);
    input.value = '';
    const chips = document.getElementById('amenities-chips');
    if (chips && !chips.querySelector(`[data-amenity="${CSS.escape(val)}"]`)) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'amenity-chip active custom-amenity';
      btn.dataset.amenity = val; btn.textContent = val;
      btn.onclick = () => PropertyForm.toggleAmenity(val, btn);
      chips.appendChild(btn);
    } else if (chips) {
      const ex = chips.querySelector(`[data-amenity="${CSS.escape(val)}"]`);
      if (ex) ex.classList.add('active');
    }
    this.renderSelectedAmenities();
    Toast.success(`"${val}" added!`);
  },

  renderSelectedAmenities() {
    const display = document.getElementById('amenities-selected-display');
    if (!display) return;
    if (this.selectedAmenities.length === 0) { display.innerHTML = ''; return; }
    display.innerHTML = `<span class="amenities-count">${this.selectedAmenities.length} selected: </span>` +
      this.selectedAmenities.map(a => `<span class="amenity-tag">${sanitize(a)}</span>`).join('');
  },

  handleFiles(type, fileList) {
    const key    = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const limits = { photos: 10, videos: 500, docs: 10 }; // MB per file
    const maxMB  = limits[type] || 10;
    this[key] = this[key] || [];
    Array.from(fileList).forEach(f => {
      const sizeMB = f.size / 1024 / 1024;
      if (sizeMB > maxMB) {
        Toast.error(`"${sanitize(f.name)}" is ${sizeMB.toFixed(1)} MB — exceeds the ${maxMB} MB limit and was skipped.`);
        return;
      }
      if (!this[key].find(x => x.name === f.name)) this[key].push(f);
    });
    this.renderFileList(type);
  },

  renderFileList(type) {
    const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const container = document.getElementById(`${type}-list`);
    if (!container) return;
    if (!this[key] || this[key].length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = this[key].map((file, i) => {
      const url = URL.createObjectURL(file);
      const preview = type === 'photos'
        ? `<img src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;border:1.5px solid var(--border)" alt="" />`
        : type === 'videos'
          ? `<video src="${url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;border:1.5px solid var(--border)"></video>`
          : '';
      return `
        <div class="file-item" style="align-items:center">
          ${preview}
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem">${file.name}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap">${(file.size/1024/1024).toFixed(1)} MB</span>
          <button class="file-remove" type="button" onclick="PropertyForm.removeFile('${type}',${i})">✕</button>
        </div>`;
    }).join('');
  },

  removeFile(type, index) {
    const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
    this[key].splice(index, 1);
    this.renderFileList(type);
  },

  async handleSubmit(e) {
    e.preventDefault();
    // Validate required text fields
    let valid = true;
    ['prop-title','prop-location','listing-type','field-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('is-invalid', !el.value.trim());
      if (!el.value.trim()) valid = false;
    });
    const contact = document.getElementById('sp-contact');
    if (contact && !contact.value.trim()) { contact.classList.add('is-invalid'); valid = false; }

    // Validate unit variants
    const variants = this.readVariants();
    const varErr   = document.getElementById('variants-error');
    if (variants.length === 0) {
      if (varErr) varErr.style.display = 'block';
      valid = false;
    } else {
      if (varErr) varErr.style.display = 'none';
    }

    if (!valid) {
      Toast.error('Please fill in all required fields.');
      document.querySelector('.is-invalid, #variants-error[style*="block"]')?.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    const startingPrice = Math.min(...variants.map(v => v.price));
    // Build a human-readable summary for propertySize (backward compat)
    const sizeSummary   = [...new Set(variants.map(v => v.unitType))].join(', ');

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner"></span> Processing…'; }

    const overlay = document.getElementById('submit-overlay');
    const msgEl   = document.getElementById('submit-overlay-msg');
    const fillEl  = document.getElementById('submit-progress-fill');
    overlay.classList.add('show');

    const setProgress = (msg, done, total) => {
      if (msgEl) msgEl.textContent = msg;
      if (fillEl && total > 0) fillEl.style.width = `${Math.round((done / total) * 80)}%`;
    };

    try {
      const user  = DB.getCurrentUser();
      const total = this.selectedPhotos.length + this.selectedVideos.length + this.selectedDocs.length;
      let newPhotoUrls = [], newVideoUrls = [], newDocUrls = [];

      if (total > 0) {
        if (msgEl) msgEl.textContent = 'Uploading media to Cloudinary…';
        const urls = await CloudinaryUploader.uploadAll(
          this.selectedPhotos, this.selectedVideos, this.selectedDocs, setProgress
        );
        newPhotoUrls = urls.photos;
        newVideoUrls = urls.videos;
        newDocUrls   = urls.documents;
      }

      if (msgEl) msgEl.textContent = 'Saving to database…';
      if (fillEl) fillEl.style.width = '90%';

      // Merge existing media with newly uploaded media
      const finalPhotos = [...(this.editMode ? this.existingPhotos : []), ...newPhotoUrls];
      const finalVideos = [...(this.editMode ? this.existingVideos : []), ...newVideoUrls];
      const finalDocs   = [...(this.editMode ? this.existingDocs   : []), ...newDocUrls];

      const payload = {
        salespersonId:      user.id,
        salespersonName:    user.name,
        salespersonContact: contact.value.trim(),
        propertyTitle:      document.getElementById('prop-title').value.trim(),
        propertyLocation:   document.getElementById('prop-location').value,
        propertySize:       sizeSummary,          // human-readable summary
        listingType:        document.getElementById('listing-type').value,
        unitVariants:       variants,             // full variants array
        startingPrice:      startingPrice,        // min price for display
        listingPrice:       startingPrice,        // kept for backward compat
        amenities:          this.selectedAmenities.join(', '),
        fieldNotes:         document.getElementById('field-notes').value.trim(),
        photos:             finalPhotos,
        videos:             finalVideos,
        documents:          finalDocs,
      };

      if (this.editMode && this.editSubmissionId) {
        await DB.updateSubmission(this.editSubmissionId, payload);
      } else {
        await DB.addSubmission(payload);
      }

      if (fillEl) fillEl.style.width = '100%';
      setTimeout(() => {
        overlay.classList.remove('show');
        Toast.success(this.editMode ? 'Property updated successfully!' : 'Property submitted successfully!');
        
        // Reset edit state
        this.editMode = false;
        this.editSubmissionId = null;
        this._editData = null;
        this.existingPhotos = [];
        this.existingVideos = [];
        this.existingDocs = [];
        
        SalespersonDashboard.showSection('my-submissions');
      }, 400);

    } catch (err) {
      console.error('Submission error:', err);
      overlay.classList.remove('show');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = this.editMode ? 'Update Listing' : 'Submit Listing'; }
      Toast.error(`Failed to submit: ${err.message}`);
    }
  },
};

// ============================
// BOOT
// ============================
(async function boot() {
  if (!FIREBASE_CONFIGURED) {
    renderSetupScreen();
    return;
  }
  try { await DB.init(); } catch (e) { console.warn('DB init:', e.message); }
  const user = DB.getCurrentUser();
  if (!user) Router.go('login');
  else if (user.role === 'admin') AdminDashboard.render();
  else SalespersonDashboard.render();
})();
