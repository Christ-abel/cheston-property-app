// ============================================================
// js/data.js  —  Realtime Database Data Layer (all methods async)
// ============================================================

const DB = {
  PATHS: {
    USERS:       'cheston_users',
    SUBMISSIONS: 'cheston_submissions',
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
        await db.ref(this.PATHS.USERS + '/' + adminId).set({
          id:        adminId,
          name:      'Admin',
          email:     'admin@cheston.co.ke',
          password:  'Admin@123',
          role:      'admin',
          phone:     '+254700000000',
          status:    'active',
          createdAt: new Date().toISOString(),
          lastLogin: null,
        });
        console.log('✅ Default admin created in Realtime DB.');
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

  // ----------------------------------------------------------
  // SESSION  (stays synchronous — sessionStorage is fine)
  // ----------------------------------------------------------
  getCurrentUser() {
    const raw = sessionStorage.getItem('cheston_current_user');
    return raw ? JSON.parse(raw) : null;
  },
  setCurrentUser(user) {
    sessionStorage.setItem('cheston_current_user', JSON.stringify(user));
    if (user && db) this.updateUser(user.id, { lastLogin: new Date().toISOString() }).catch(() => {});
  },
  logout() {
    sessionStorage.removeItem('cheston_current_user');
  },
};
