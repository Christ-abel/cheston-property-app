// ============================================================
// js/config.js
// ============================================================
// STEP 1 — FIREBASE SETUP
// ---------------------------------------------------------------
// 1. Go to: https://console.firebase.google.com
// 2. Click "Add project" → give it a name (e.g. cheston-property)
// 3. Disable Google Analytics (not needed) → Create project
// 4. Click the Web icon </> → register app (name: cheston-web)
// 5. Copy the firebaseConfig object below and paste your values
// 6. In the Firebase Console: Build → Firestore Database → Create database
//    Choose "Start in test mode" → select a region (e.g. europe-west1) → Enable
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey:            "AIzaSyBz3Ll3yB0vjuzkzaP5-Xu4QZ51ZlMp6AA",
  authDomain:        "chestone-property-onboarding.firebaseapp.com",
  projectId:         "chestone-property-onboarding",
  storageBucket:     "chestone-property-onboarding.firebasestorage.app",
  messagingSenderId: "906025592955",
  appId:             "1:906025592955:web:cbe60faf514eaa4c019ade",
  databaseURL:       "https://chestone-property-onboarding-default-rtdb.europe-west1.firebasedatabase.app"
};

// Detect placeholder — show setup screen if not yet configured
const FIREBASE_CONFIGURED = !firebaseConfig.apiKey.startsWith('PASTE_');

let db = null;
if (FIREBASE_CONFIGURED) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  } catch (e) {
    console.warn('Firebase init error:', e.message);
  }
} else {
  console.warn('⚠️  Firebase not configured yet. Update js/config.js with your credentials.');
}

// ============================================================
// STEP 2 — CLOUDINARY SETUP
// ---------------------------------------------------------------
// 1. Sign up free at: https://cloudinary.com (no credit card needed)
// 2. Note your "Cloud name" on the Dashboard
// 3. Go to: Settings → Upload → "Add upload preset"
//    - Signing Mode: Unsigned
//    - Folder: cheston-properties
//    - Save the preset name
// 4. Fill in cloudName and uploadPreset below
// ---------------------------------------------------------------
const CLOUDINARY = {
  cloudName:    'dlifykbon',
  uploadPreset: 'cheston_unsigned',
  folder:       'cheston-properties',
};
const CLOUDINARY_CONFIGURED = !CLOUDINARY.cloudName.startsWith('PASTE_');

// ============================================================
// APP CONFIG — locations, listing types, amenities
// ============================================================
const CONFIG = {
  appName:    'Cheston Property',
  appTagline: 'Internal Onboarding System',
  currency:   'KSh',

  propertyLocations: [
    'Kileleshwa', 'Lavington', 'Kilimani',
    'Westlands',  'Riverside', 'Karen',
  ],

  listingTypes: ['For Sale', 'For Rent'],

  amenities: [
    'Swimming Pool',      'Gym/Fitness Center',   'Parking',
    'Security/CCTV',      'Generator Backup',      'Borehole Water',
    'Solar Power',        'Garden',                'Balcony/Terrace',
    'Elevator/Lift',      'Servants Quarter',      'Study Room',
    'Home Theatre',       'Smart Home Features',   'EV Charging',
    'Concierge Service',
  ],
};
