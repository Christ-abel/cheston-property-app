// ============================================================
// js/data.js  —  Realtime Database Data Layer (all methods async)
// ============================================================

const DB = {
  PATHS: {
    USERS:       'realestate_users',
    SUBMISSIONS: 'realestate_submissions',
  },

  // ----------------------------------------------------------
  // INIT — create default admin if DB is empty
  // ----------------------------------------------------------
  async init() {
    if (!db) return; // Firebase not configured yet
    try {
      const snap = await db.ref(this.PATHS.USERS).orderByChild('role').equalTo('admin').limitToFirst(1).once('value');
      
      if (!snap.exists()) {
        const adminId = 'admin-001';
        // SHA-256('Demo@2026::realestateco2026:salt') — pre-computed; matches hashPassword() in app.js
        const defaultHash = '04016625abe0d969b921bc1b1a292a1badb3b4f9f6458ce480f44461a75fc9ed';
        await db.ref(this.PATHS.USERS + '/' + adminId).set({
          id:             adminId,
          name:           'Demo Admin',
          email:          'admin@realestateco.co.ke',
          password:       defaultHash,
          passwordHashed: true,
          role:           'admin',
          phone:          '+254712345678',
          status:         'active',
          createdAt:      new Date().toISOString(),
          lastLogin:      null,
        });
        console.log('Default admin created in Realtime DB.');
      }
    } catch (e) {
      console.error('DB.init error:', e.message);
    }
  },

  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------
  async getUsers() {
    const snap = await db.ref(this.PATHS.USERS).once('value');
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.keys(data).map(key => ({ ...data[key], _docId: key }));
  },

  async getSalespersons() {
    const snap = await db.ref(this.PATHS.USERS).orderByChild('role').equalTo('salesperson').once('value');
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.keys(data)
      .map(key => ({ ...data[key], _docId: key }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async getUserById(id) {
    const snap = await db.ref(this.PATHS.USERS).orderByChild('id').equalTo(id).limitToFirst(1).once('value');
    if (!snap.exists()) return null;
    const data = snap.val();
    const key = Object.keys(data)[0];
    return { ...data[key], _docId: key };
  },

  async getUserByEmail(email) {
    const snap = await db.ref(this.PATHS.USERS).orderByChild('email').equalTo(email.toLowerCase()).limitToFirst(1).once('value');
    if (!snap.exists()) return null;
    const data = snap.val();
    const key = Object.keys(data)[0];
    return { ...data[key], _docId: key };
  },

  async addUser(user) {
    user.id        = 'user-' + Date.now();
    user.createdAt = new Date().toISOString();
    user.lastLogin = null;
    user.email     = user.email.toLowerCase();
    
    const ref = db.ref(this.PATHS.USERS).push();
    await ref.set(user);
    return { ...user, _docId: ref.key };
  },

  async updateUser(id, updates) {
    const user = await this.getUserById(id);
    if (!user) return null;
    await db.ref(this.PATHS.USERS + '/' + user._docId).update(updates);
    return { ...user, ...updates };
  },

  async deleteUser(id) {
    const user = await this.getUserById(id);
    if (user) {
      await db.ref(this.PATHS.USERS + '/' + user._docId).remove();
    }
  },

  // ----------------------------------------------------------
  // SUBMISSIONS
  // ----------------------------------------------------------
  async getSubmissions() {
    const snap = await db.ref(this.PATHS.SUBMISSIONS).once('value');
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.keys(data)
      .map(key => ({ ...data[key], _docId: key }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getSubmissionsByUser(userId) {
    const snap = await db.ref(this.PATHS.SUBMISSIONS).orderByChild('salespersonId').equalTo(userId).once('value');
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.keys(data)
      .map(key => ({ ...data[key], _docId: key }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getSubmissionById(id) {
    const snap = await db.ref(this.PATHS.SUBMISSIONS).orderByChild('id').equalTo(id).limitToFirst(1).once('value');
    if (!snap.exists()) return null;
    const data = snap.val();
    const key = Object.keys(data)[0];
    return { ...data[key], _docId: key };
  },

  async addSubmission(submission) {
    submission.id        = 'sub-' + Date.now();
    submission.createdAt = new Date().toISOString();
    submission.status    = 'pending';
    const ref = db.ref(this.PATHS.SUBMISSIONS).push();
    await ref.set(submission);
    return { ...submission, _docId: ref.key };
  },

  async deleteSubmission(id) {
    const snap = await db.ref(this.PATHS.SUBMISSIONS).orderByChild('id').equalTo(id).limitToFirst(1).once('value');
    if (snap.exists()) {
      const data = snap.val();
      const key = Object.keys(data)[0];
      await db.ref(this.PATHS.SUBMISSIONS + '/' + key).remove();
    }
  },

  async updateSubmission(id, updates) {
    const snap = await db.ref(this.PATHS.SUBMISSIONS).orderByChild('id').equalTo(id).limitToFirst(1).once('value');
    if (!snap.exists()) return null;
    const data = snap.val();
    const key  = Object.keys(data)[0];
    updates.updatedAt = new Date().toISOString();
    await db.ref(this.PATHS.SUBMISSIONS + '/' + key).update(updates);
    return { ...data[key], ...updates };
  },

  // ----------------------------------------------------------
  // PASSWORD RESET — OTP flow
  // ----------------------------------------------------------
  async createPasswordReset(email) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
    // Store a hash of the OTP — not the OTP itself
    const otpHash = await hashPassword(otp);
    await this.updateUser(user.id, { resetOTP: otpHash, resetExpiry: expiry });
    return { otp, user }; // return plain OTP for sending via email
  },

  async verifyPasswordReset(email, otp) {
    const user = await this.getUserByEmail(email);
    if (!user) return { success: false, error: 'No account found with this email.' };
    if (!user.resetOTP || !user.resetExpiry) return { success: false, error: 'No reset code found. Please request a new one.' };
    if (new Date() > new Date(user.resetExpiry)) return { success: false, error: 'Reset code expired. Please request a new one.' };
    const otpHash = await hashPassword(otp);
    if (user.resetOTP !== otpHash) return { success: false, error: 'Invalid reset code.' };
    return { success: true, user };
  },

  async clearPasswordReset(userId) {
    await this.updateUser(userId, { resetOTP: null, resetExpiry: null });
  },

  // ----------------------------------------------------------
  // SESSION  (stays synchronous — sessionStorage is fine)
  // ----------------------------------------------------------
  getCurrentUser() {
    const raw = sessionStorage.getItem('realestate_current_user');
    return raw ? JSON.parse(raw) : null;
  },
  setCurrentUser(user) {
    sessionStorage.setItem('realestate_current_user', JSON.stringify(user));
    if (user && db) this.updateUser(user.id, { lastLogin: new Date().toISOString() }).catch(() => {});
  },
  logout() {
    sessionStorage.removeItem('realestate_current_user');
  },
};
