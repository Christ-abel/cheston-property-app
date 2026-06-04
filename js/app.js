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
          <div style="font-size:3rem;margin-bottom:12px">⚙️</div>
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
          📄 Full guide is in the <strong>walkthrough artifact</strong> in your IDE.
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
    return data.secure_url;
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
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
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
            <div class="login-logo">🏢</div>
            <h1 class="login-title">${CONFIG.appName}</h1>
            <p class="login-subtitle">${CONFIG.appTagline}</p>
          </div>
          <div class="login-card">
            <div class="login-tabs">
              <button class="login-tab active" id="tab-login" onclick="LoginPage.switchTab('login')">Sign In</button>
              <button class="login-tab" id="tab-reset" onclick="LoginPage.switchTab('reset')">Get Help</button>
            </div>
            <div id="login-panel">
              <form id="login-form" onsubmit="LoginPage.handleLogin(event)">
                <div class="form-group">
                  <label class="form-label" for="login-email">Email Address</label>
                  <input id="login-email" type="email" class="form-control" placeholder="you@cheston.co.ke" required autocomplete="email" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="login-password">Password</label>
                  <div class="password-wrapper">
                    <input id="login-password" type="password" class="form-control" placeholder="Enter your password" required autocomplete="current-password" />
                    <button type="button" class="password-toggle" onclick="LoginPage.togglePassword('login-password', this)">👁️</button>
                  </div>
                </div>
                <button type="submit" id="login-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:8px">Sign In</button>
              </form>
            </div>
            <div id="reset-panel" style="display:none">
              <div style="text-align:center;padding:20px 0;">
                <div style="font-size:2.5rem;margin-bottom:16px">🤝</div>
                <h3 style="margin-bottom:8px;font-size:1rem;color:var(--navy)">Need Access?</h3>
                <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.6">Your account must be created by the admin. Contact your manager to get your login credentials.</p>
                <div style="margin-top:20px;padding:14px;background:var(--gold-light);border:1px solid rgba(201,168,76,0.3);border-radius:8px;font-size:0.8rem;color:var(--navy)">
                  📧 Contact: admin@cheston.co.ke
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`);
  },

  switchTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reset').classList.toggle('active', tab === 'reset');
    document.getElementById('login-panel').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('reset-panel').style.display = tab === 'reset' ? 'block' : 'none';
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁️'; }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const user = await DB.getUserByEmail(email);
      if (!user) { Toast.error('No account found with this email.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }
      if (user.password !== password) { Toast.error('Incorrect password. Please try again.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }
      if (user.status !== 'active') { Toast.error('Your account has been deactivated. Contact admin.'); btn.disabled = false; btn.textContent = 'Sign In'; return; }
      DB.setCurrentUser(user);
      Toast.success(`Welcome back, ${user.name}! 👋`);
      if (user.role === 'admin') Router.go('admin');
      else Router.go('salesperson');
    } catch (err) {
      console.error('Login error:', err);
      Toast.error('Connection error. Check your internet and try again.');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
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
            <div class="logo-icon">🏢</div>
            <div><div class="logo-text">${CONFIG.appName}</div><span class="logo-sub">Admin Portal</span></div>
          </div>
          <div class="nav-actions">
            <div class="nav-user">
              <div class="nav-avatar">${getInitials(user.name)}</div>
              <div>
                <div class="nav-user-name">${user.name}</div>
                <div class="nav-user-role"><span class="badge badge-admin" style="padding:1px 6px;font-size:0.65rem">Admin</span></div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" data-action="logout">🚪 Logout</button>
          </div>
        </div>
      </nav>`;
  },

  _sidebar(spCount = 0, subCount = 0) {
    const sections = [
      { id: 'overview',    icon: '📊', label: 'Overview' },
      { id: 'accounts',   icon: '👥', label: 'User Accounts', badge: spCount },
      { id: 'submissions', icon: '🏠', label: 'All Submissions', badge: subCount },
    ];
    return `
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${sections.map(s => `
          <button class="sidebar-item ${this.currentSection === s.id ? 'active' : ''}" data-nav="${s.id}">
            <span class="sidebar-icon">${s.icon}</span>${s.label}
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
      main.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Error loading section</div><div class="empty-state-text">${err.message}</div></div>`;
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
    const totalValue = subs.reduce((s, x) => s + (Number(x.listingPrice) || 0), 0);
    const forSale    = subs.filter(s => s.listingType === 'For Sale').length;
    const forRent    = subs.filter(s => s.listingType === 'For Rent').length;
    const recent     = subs.slice(0, 5);

    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Dashboard Overview</h2><p class="section-subtitle">Welcome back! Here's what's happening.</p></div>
          <button class="btn btn-primary btn-sm" onclick="AdminDashboard.showSection('accounts')">+ Add User</button>
        </div>
        <div class="stats-grid">
          <div class="stat-card" style="--stat-color:var(--navy)"><div class="stat-icon">👥</div><div class="stat-value">${users.length}</div><div class="stat-label">Total Users</div></div>
          <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-icon">🏠</div><div class="stat-value">${subs.length}</div><div class="stat-label">Total Submissions</div></div>
          <div class="stat-card" style="--stat-color:var(--gold)"><div class="stat-icon">💰</div><div class="stat-value" style="font-size:1.3rem">${formatCurrency(totalValue)}</div><div class="stat-label">Total Portfolio Value</div></div>
          <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-icon">🏷️</div><div class="stat-value">${forSale} / ${forRent}</div><div class="stat-label">For Sale / For Rent</div></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">🕐 Recent Submissions</span>
            <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.showSection('submissions')">View All →</button>
          </div>
          ${recent.length === 0 ? `
            <div class="empty-state"><div class="empty-state-icon">🏗️</div><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Salespersons haven't submitted any properties yet.</div></div>
          ` : `
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Property</th><th>Agent</th><th>Type</th><th>Price (KSh)</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  ${recent.map(s => `
                    <tr>
                      <td><div class="td-name">${s.propertyTitle}</div><div class="td-secondary">📍 ${s.propertyLocation}</div></td>
                      <td>${s.salespersonName}</td>
                      <td><span class="badge ${s.listingType === 'For Sale' ? 'badge-sale' : 'badge-rent'}">${s.listingType}</span></td>
                      <td class="td-price">${formatCurrency(s.listingPrice)}</td>
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
          <button class="btn btn-primary" onclick="AdminDashboard.openAddUserModal()">➕ Add User</button>
        </div>
        <div class="info-box" style="margin-bottom:20px">
          <span class="info-icon">💡</span>
          <span>Create an account for your team. Admins can view all data and manage users. Salespersons can only submit listings.</span>
        </div>
        ${users.length === 0 ? `
          <div class="card"><div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No user accounts yet</div><div class="empty-state-text">Create the first account to get started.</div></div></div>
        ` : `
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="nav-avatar" style="width:36px;height:36px;font-size:13px;flex-shrink:0">${getInitials(u.name)}</div><div class="td-name">${u.name}</div></div></td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-rent'}">${u.role === 'admin' ? 'Admin' : 'Salesperson'}</span></td>
                    <td style="font-size:0.82rem">${u.email}</td>
                    <td style="font-size:0.82rem">${u.phone || '—'}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:4px">
                        <span class="password-cell" id="pwd-${u.id}">••••••••</span>
                        <button class="copy-btn" onclick="AdminDashboard.togglePwd('${u.id}','${u.password}')" title="Show">👁️</button>
                        <button class="copy-btn" onclick="copyToClipboard('${u.password}');Toast.success('Copied!')" title="Copy">📋</button>
                      </div>
                    </td>
                    <td><span class="badge badge-${u.status}">${u.status}</span></td>
                    <td>
                      <div class="account-row-actions">
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.editUser('${u.id}')">Edit</button>
                        <button class="btn ${u.status === 'active' ? 'btn-danger' : 'btn-success'} btn-sm" onclick="AdminDashboard.toggleUserStatus('${u.id}')">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                        ${u.id !== DB.getCurrentUser().id ? `<button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteUser('${u.id}')">🗑️</button>` : ''}
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
              <h3 class="modal-title" id="modal-title">➕ Add User Account</h3>
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
                <div class="form-group"><label class="form-label">Email Address <span class="required">*</span></label><input type="email" id="user-email" class="form-control" placeholder="jane@cheston.co.ke" required /></div>
                <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" id="user-phone" class="form-control" placeholder="+254700000000" /></div>
              </div>
              <div class="form-group">
                <label class="form-label">Password <span class="required">*</span></label>
                <div style="display:flex;gap:8px">
                  <div class="password-wrapper" style="flex:1"><input type="text" id="user-password" class="form-control" placeholder="Set a secure password" required /></div>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('user-password').value=generatePassword()">🎲 Generate</button>
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
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" placeholder="Search properties…" id="search-subs" oninput="AdminDashboard.filterUI()" />
          </div>
          <select class="form-control" id="filter-agent" onchange="AdminDashboard.filterUI()" style="width:auto;min-width:180px">
            <option value="">All Agents</option>
            ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
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
    if (subs.length === 0) return `<div class="empty-state"><div class="empty-state-icon">🏗️</div><div class="empty-state-title">No submissions found</div><div class="empty-state-text">No properties match your search.</div></div>`;
    return `
      <div class="properties-grid">
        ${subs.map(s => {
          const thumb = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
          return `
            <div class="property-card">
              <div class="property-card-header">
                <div><div class="property-title">${s.propertyTitle}</div><div class="property-location">📍 ${s.propertyLocation}</div></div>
                <span class="badge ${s.listingType === 'For Sale' ? 'badge-sale' : 'badge-rent'}">${s.listingType}</span>
              </div>
              ${thumb ? `<div style="height:160px;overflow:hidden"><img src="${thumb}" alt="${s.propertyTitle}" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
              <div class="property-card-body">
                <div class="property-detail"><span class="property-detail-icon">🛏️</span>${s.propertySize}</div>
                <div class="property-detail"><span class="property-detail-icon">🌟</span>${s.amenities || 'N/A'}</div>
                ${s.fieldNotes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${s.fieldNotes}</div>` : ''}
              </div>
              <div class="property-card-footer">
                <div><div class="property-price">${formatCurrency(s.listingPrice)}</div><div class="property-agent">👤 ${s.salespersonName} · ${formatDate(s.createdAt)}</div></div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.viewSubmission('${s.id}')">View</button>
                  <button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteSubmission('${s.id}')">🗑️</button>
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

    const gallery = (urls, type) => {
      if (!urls || urls.length === 0) return '';
      return `
        <div style="margin-bottom:16px">
          <div class="detail-label" style="margin-bottom:8px">${type === 'photo' ? `Photos (${urls.length})` : `Videos (${urls.length})`}</div>
          <div class="photo-grid">
            ${urls.map(url => url.startsWith('http')
              ? (type === 'photo'
                  ? `<div class="photo-thumb"><img src="${url}" alt="" /></div>`
                  : `<div class="photo-thumb"><video src="${url}" controls style="width:100%;height:100%;object-fit:cover"></video></div>`)
              : `<div class="photo-thumb">${type === 'photo' ? '🖼️' : '🎥'}<br><span style="font-size:0.6rem;color:var(--text-muted)">${url.replace('pending_upload://', '')}</span></div>`
            ).join('')}
          </div>
        </div>`;
    };

    overlay.innerHTML = `
      <div class="modal" style="max-width:720px">
        <div class="modal-header">
          <h3 class="modal-title">🏠 ${sub.propertyTitle}</h3>
          <button class="modal-close" onclick="document.getElementById('detail-modal-overlay').classList.remove('open')">✕</button>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Agent</div><div class="detail-value">👤 ${sub.salespersonName}</div></div>
          <div class="detail-item"><div class="detail-label">Contact</div><div class="detail-value">📞 ${sub.salespersonContact}</div></div>
          <div class="detail-item"><div class="detail-label">Location</div><div class="detail-value">📍 ${sub.propertyLocation}</div></div>
          <div class="detail-item"><div class="detail-label">Size</div><div class="detail-value">🛏️ ${sub.propertySize}</div></div>
          <div class="detail-item"><div class="detail-label">Listing Type</div><div class="detail-value"><span class="badge ${sub.listingType === 'For Sale' ? 'badge-sale' : 'badge-rent'}">${sub.listingType}</span></div></div>
          <div class="detail-item"><div class="detail-label">Price</div><div class="detail-value" style="color:var(--navy);font-weight:700">${formatCurrency(sub.listingPrice)}</div></div>
          <div class="detail-item"><div class="detail-label">Amenities</div><div class="detail-value">${sub.amenities || 'None listed'}</div></div>
          <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${formatDateTime(sub.createdAt)}</div></div>
        </div>
        ${sub.fieldNotes ? `<div style="margin-bottom:20px"><div class="detail-label" style="margin-bottom:8px">Field Notes & Description</div><div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:0.875rem;line-height:1.7;color:var(--text-secondary)">${sub.fieldNotes}</div></div>` : ''}
        ${gallery(sub.photos, 'photo')}
        ${gallery(sub.videos, 'video')}
        ${sub.documents && sub.documents.length > 0 ? `
          <div style="margin-bottom:16px">
            <div class="detail-label" style="margin-bottom:8px">Documents (${sub.documents.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${sub.documents.map(url => `
                <a href="${url.startsWith('http') ? url : '#'}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;font-size:0.8rem;color:var(--navy);text-decoration:none">
                  📄 ${url.startsWith('http') ? 'View Document ↗' : url.replace('pending_upload://', '')}
                </a>`).join('')}
            </div>
          </div>` : ''}
        <div class="modal-footer">
          <button class="btn btn-danger" onclick="AdminDashboard.deleteSubmission('${sub.id}')">🗑️ Delete</button>
          <button class="btn btn-secondary" onclick="document.getElementById('detail-modal-overlay').classList.remove('open')">Close</button>
        </div>
      </div>`;
    setTimeout(() => overlay.classList.add('open'), 10);
  },

  openAddUserModal(userId = null) {
    const modal = document.getElementById('add-user-modal');
    if (!modal) { this.showSection('accounts').then(() => setTimeout(() => this.openAddUserModal(userId), 200)); return; }
    document.getElementById('edit-user-id').value = userId || '';
    document.getElementById('modal-title').textContent = userId ? '✏️ Edit Account' : '➕ Add User Account';
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
      if (editId) { await DB.updateUser(editId, { name, email, phone, password, role }); Toast.success('Account updated!'); }
      else { await DB.addUser({ name, email, phone, password, role, status: 'active' }); Toast.success(`Account created for ${name}! 🎉`); }
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

  async deleteUser(id) {
    if (!confirm('Delete this user account? Their submissions will remain.')) return;
    try { await DB.deleteUser(id); Toast.success('Account deleted.'); this.showSection('accounts'); }
    catch (e) { Toast.error('Failed to delete.'); }
  },

  async deleteSubmission(id) {
    if (!confirm('Delete this property submission?')) return;
    try {
      await DB.deleteSubmission(id);
      document.getElementById('detail-modal-overlay')?.classList.remove('open');
      Toast.success('Submission deleted.');
      this.showSection('submissions');
    } catch (e) { Toast.error('Failed to delete.'); }
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
            <div class="logo-icon">🏢</div>
            <div><div class="logo-text">${CONFIG.appName}</div><span class="logo-sub">Salesperson Portal</span></div>
          </div>
          <div class="nav-actions">
            <div class="nav-user">
              <div class="nav-avatar">${getInitials(user.name)}</div>
              <div><div class="nav-user-name">${user.name}</div><div class="nav-user-role" style="color:var(--success);font-size:0.7rem">● Salesperson</div></div>
            </div>
            <button class="btn btn-secondary btn-sm" data-action="logout">🚪 Logout</button>
          </div>
        </div>
      </nav>`;
  },

  _sidebar(subCount = 0) {
    const sections = [
      { id: 'overview',        icon: '📊', label: 'My Dashboard' },
      { id: 'submit',          icon: '➕', label: 'Submit Property' },
      { id: 'my-submissions',  icon: '🏠', label: 'My Submissions', badge: subCount },
    ];
    return `
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${sections.map(s => `
          <button class="sidebar-item ${this.currentSection === s.id ? 'active' : ''}" data-nav="${s.id}">
            <span class="sidebar-icon">${s.icon}</span>${s.label}
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
      main.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
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
    const totalValue = subs.reduce((s, x) => s + (Number(x.listingPrice) || 0), 0);
    const recent = subs.slice(0, 3);
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Welcome, ${user.name}! 👋</h2><p class="section-subtitle">Manage your property listings and submissions.</p></div>
          <button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">➕ Submit Property</button>
        </div>
        <div class="stats-grid">
          <div class="stat-card" style="--stat-color:var(--navy)"><div class="stat-icon">🏠</div><div class="stat-value">${subs.length}</div><div class="stat-label">Total Submissions</div></div>
          <div class="stat-card" style="--stat-color:var(--gold)"><div class="stat-icon">💰</div><div class="stat-value" style="font-size:1.3rem">${formatCurrency(totalValue)}</div><div class="stat-label">Portfolio Value</div></div>
          <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-icon">🏷️</div><div class="stat-value">${subs.filter(s => s.listingType === 'For Sale').length}</div><div class="stat-label">For Sale</div></div>
          <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-icon">🔑</div><div class="stat-value">${subs.filter(s => s.listingType === 'For Rent').length}</div><div class="stat-label">For Rent</div></div>
        </div>
        ${recent.length > 0 ? `
          <div class="card">
            <div class="card-header">
              <span class="card-title">🕐 Recent Activity</span>
              <button class="btn btn-secondary btn-sm" onclick="SalespersonDashboard.showSection('my-submissions')">View All →</button>
            </div>
            <div class="properties-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
              ${recent.map(s => {
                const thumb = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
                return `
                  <div class="property-card">
                    <div class="property-card-header">
                      <div><div class="property-title">${s.propertyTitle}</div><div class="property-location">📍 ${s.propertyLocation}</div></div>
                      <span class="badge ${s.listingType === 'For Sale' ? 'badge-sale' : 'badge-rent'}">${s.listingType}</span>
                    </div>
                    ${thumb ? `<div style="height:120px;overflow:hidden"><img src="${thumb}" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
                    <div class="property-card-footer">
                      <div class="property-price">${formatCurrency(s.listingPrice)}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${formatDate(s.createdAt)}</div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="card">
            <div class="empty-state"><div class="empty-state-icon">🏗️</div><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Start by submitting your first property listing.</div></div>
            <div style="text-align:center;margin-top:16px"><button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">➕ Submit First Property</button></div>
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
          <button class="btn btn-primary" onclick="SalespersonDashboard.showSection('submit')">➕ New Submission</button>
        </div>
        ${subs.length === 0 ? `
          <div class="empty-state"><div class="empty-state-icon">🏗️</div><div class="empty-state-title">No submissions yet</div><div class="empty-state-text">Submit a property to see it here.</div></div>
        ` : `
          <div class="properties-grid">
            ${subs.map(s => {
              const thumb = s.photos && s.photos.length > 0 && s.photos[0].startsWith('http') ? s.photos[0] : null;
              return `
                <div class="property-card">
                  <div class="property-card-header">
                    <div><div class="property-title">${s.propertyTitle}</div><div class="property-location">📍 ${s.propertyLocation}</div></div>
                    <span class="badge ${s.listingType === 'For Sale' ? 'badge-sale' : 'badge-rent'}">${s.listingType}</span>
                  </div>
                  ${thumb ? `<div style="height:160px;overflow:hidden"><img src="${thumb}" style="width:100%;height:100%;object-fit:cover" /></div>` : ''}
                  <div class="property-card-body">
                    <div class="property-detail"><span class="property-detail-icon">🛏️</span>${s.propertySize}</div>
                    <div class="property-detail"><span class="property-detail-icon">🌟</span>${s.amenities || 'N/A'}</div>
                  </div>
                  <div class="property-card-footer">
                    <div><div class="property-price">${formatCurrency(s.listingPrice)}</div><div class="property-agent">${formatDate(s.createdAt)}</div></div>
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
  selectedPhotos: [],
  selectedVideos: [],
  selectedDocs:   [],
  selectedAmenities: [],

  render() {
    const user = DB.getCurrentUser();
    return `
      <div>
        <div class="section-header">
          <div><h2 class="section-title">Submit Property Listing</h2><p class="section-subtitle">Fill in all details about the property.</p></div>
        </div>
        <form id="property-form" onsubmit="PropertyForm.handleSubmit(event)" novalidate>

          <div class="form-card">
            <div class="form-section-title">👤 Agent Information</div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Salesperson Name</label><input type="text" class="form-control" value="${user.name}" readonly style="opacity:0.7;cursor:not-allowed" /></div>
              <div class="form-group"><label class="form-label">Contact Number <span class="required">*</span></label><input type="tel" class="form-control" value="${user.phone || ''}" id="sp-contact" placeholder="+254700000000" required /></div>
            </div>
          </div>

          <div class="form-card">
            <div class="form-section-title">🏠 Property Information</div>
            <div class="form-group">
              <label class="form-label" for="prop-title">Property Title <span class="required">*</span></label>
              <input type="text" id="prop-title" class="form-control" placeholder="e.g. Riverside Heights 3BR Apartment" required />
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
                <label class="form-label" for="prop-size">Size / Bedrooms <span class="required">*</span></label>
                <input type="text" id="prop-size" class="form-control" placeholder="e.g. 2 bedrooms, 1500 sqft" required />
                <span class="form-error">Property size is required.</span>
              </div>
            </div>
          </div>

          <div class="form-card">
            <div class="form-section-title">💼 Listing Details</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="listing-type">Listing Type <span class="required">*</span></label>
                <select id="listing-type" class="form-control" required>
                  <option value="">Select type…</option>
                  ${CONFIG.listingTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span class="form-error">Please select a listing type.</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="listing-price">Listing Price (KSh) <span class="required">*</span></label>
                <input type="number" id="listing-price" class="form-control" placeholder="e.g. 5000000" required min="1" />
                <span class="form-error">Please enter a valid price.</span>
              </div>
            </div>
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

          <div class="form-card">
            <div class="form-section-title">📝 Field Notes & Description</div>
            <div class="form-group">
              <label class="form-label" for="field-notes">Raw Field Notes & Description <span class="required">*</span></label>
              <textarea id="field-notes" class="form-control" rows="6" placeholder="Describe the property in detail. Include condition, nearby amenities, special features, access routes, etc." required></textarea>
              <span class="form-error">Please add a description.</span>
            </div>
          </div>

          <div class="form-card">
            <div class="form-section-title">📸 Media & Documents
              ${CLOUDINARY_CONFIGURED
                ? '<span style="font-size:0.7rem;background:rgba(26,140,91,0.12);color:var(--success);border-radius:100px;padding:2px 10px;margin-left:8px;font-weight:600">☁️ Cloudinary Connected</span>'
                : '<span style="font-size:0.7rem;background:var(--warning-light);color:var(--warning);border-radius:100px;padding:2px 10px;margin-left:8px;font-weight:600">⚠️ Cloudinary not configured — files stored by name only</span>'}
            </div>

            <div class="form-group">
              <label class="form-label">Photos</label>
              <div class="file-upload-zone" id="photos-zone">
                <input type="file" id="photos-input" multiple accept="image/*" onchange="PropertyForm.handleFiles('photos',this.files)" />
                <div class="file-upload-icon">🖼️</div>
                <div class="file-upload-text"><strong>Click to upload</strong> or drag & drop photos</div>
                <div class="file-upload-hint">JPG, PNG, WEBP · Max 10MB each</div>
              </div>
              <div class="camera-capture-row">
                <label class="btn-capture" title="Take photo with camera">
                  📷 Take Photo
                  <input type="file" accept="image/*" capture="environment" multiple onchange="PropertyForm.handleFiles('photos',this.files)" />
                </label>
              </div>
              <div class="file-list" id="photos-list"></div>
            </div>

            <div class="form-group">
              <label class="form-label">Video Walkthrough</label>
              <div class="file-upload-zone" id="videos-zone">
                <input type="file" id="videos-input" multiple accept="video/*" onchange="PropertyForm.handleFiles('videos',this.files)" />
                <div class="file-upload-icon">🎥</div>
                <div class="file-upload-text"><strong>Click to upload</strong> or drag & drop videos</div>
                <div class="file-upload-hint">MP4, MOV, AVI · Max 500MB each</div>
              </div>
              <div class="camera-capture-row">
                <label class="btn-capture" title="Record video with camera">
                  🎬 Record Video
                  <input type="file" accept="video/*" capture="environment" onchange="PropertyForm.handleFiles('videos',this.files)" />
                </label>
              </div>
              <div class="file-list" id="videos-list"></div>
            </div>

            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Agreement Document</label>
              <div class="file-upload-zone" id="docs-zone">
                <input type="file" id="docs-input" accept=".pdf,.doc,.docx" onchange="PropertyForm.handleFiles('docs',this.files)" />
                <div class="file-upload-icon">📄</div>
                <div class="file-upload-text"><strong>Click to upload</strong> agreement document</div>
                <div class="file-upload-hint">PDF, DOC, DOCX · Max 10MB</div>
              </div>
              <div class="file-list" id="docs-list"></div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:12px;padding-bottom:40px">
            <button type="button" class="btn btn-secondary btn-lg" onclick="if(confirm('Clear the form?')){document.getElementById('property-form').reset();PropertyForm.init();}">Reset</button>
            <button type="submit" id="submit-btn" class="btn btn-primary btn-lg">🚀 Submit Listing</button>
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
    display.innerHTML = `<span class="amenities-count">✅ ${this.selectedAmenities.length} selected: </span>` +
      this.selectedAmenities.map(a => `<span class="amenity-tag">${a}</span>`).join('');
  },

  handleFiles(type, fileList) {
    const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
    this[key] = this[key] || [];
    Array.from(fileList).forEach(f => {
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
          : `<span style="font-size:1.4rem">📄</span>`;
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
    // Validate
    let valid = true;
    ['prop-title','prop-location','prop-size','listing-type','listing-price','field-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('is-invalid', !el.value.trim());
      if (!el.value.trim()) valid = false;
    });
    const contact = document.getElementById('sp-contact');
    if (contact && !contact.value.trim()) { contact.classList.add('is-invalid'); valid = false; }
    if (!valid) { Toast.error('Please fill in all required fields.'); document.querySelector('.is-invalid')?.scrollIntoView({ behavior:'smooth', block:'center' }); return; }

    const overlay  = document.getElementById('submit-overlay');
    const msgEl    = document.getElementById('submit-overlay-msg');
    const fillEl   = document.getElementById('submit-progress-fill');
    overlay.classList.add('show');

    const setProgress = (msg, done, total) => {
      if (msgEl) msgEl.textContent = msg;
      if (fillEl && total > 0) fillEl.style.width = `${Math.round((done / total) * 80)}%`;
    };

    try {
      const user  = DB.getCurrentUser();
      const total = this.selectedPhotos.length + this.selectedVideos.length + this.selectedDocs.length;
      let photoUrls = [], videoUrls = [], docUrls = [];

      if (total > 0) {
        if (msgEl) msgEl.textContent = 'Uploading media to Cloudinary…';
        const urls = await CloudinaryUploader.uploadAll(
          this.selectedPhotos, this.selectedVideos, this.selectedDocs, setProgress
        );
        photoUrls = urls.photos;
        videoUrls = urls.videos;
        docUrls   = urls.documents;
      }

      if (msgEl) msgEl.textContent = 'Saving to database…';
      if (fillEl) fillEl.style.width = '90%';

      await DB.addSubmission({
        salespersonId:      user.id,
        salespersonName:    user.name,
        salespersonContact: contact.value.trim(),
        propertyTitle:      document.getElementById('prop-title').value.trim(),
        propertyLocation:   document.getElementById('prop-location').value,
        propertySize:       document.getElementById('prop-size').value.trim(),
        listingType:        document.getElementById('listing-type').value,
        listingPrice:       Number(document.getElementById('listing-price').value),
        amenities:          this.selectedAmenities.join(', '),
        fieldNotes:         document.getElementById('field-notes').value.trim(),
        photos:             photoUrls,
        videos:             videoUrls,
        documents:          docUrls,
      });

      if (fillEl) fillEl.style.width = '100%';
      setTimeout(() => {
        overlay.classList.remove('show');
        Toast.success('Property submitted successfully! 🎉');
        SalespersonDashboard.showSection('my-submissions');
      }, 400);

    } catch (err) {
      console.error('Submission error:', err);
      overlay.classList.remove('show');
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
