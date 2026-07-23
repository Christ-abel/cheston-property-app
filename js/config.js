// ============================================================
// js/config.js
// ============================================================
// STEP 1 — FIREBASE SETUP
// ---------------------------------------------------------------
// 1. Go to: https://console.firebase.google.com
// 2. Click "Add project" → give it a name (e.g. realestate-demo)
// 3. Disable Google Analytics (not needed) → Create project
// 4. Click the Web icon </> → register app (name: realestate-web)
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
  console.warn('Firebase not configured yet. Update js/config.js with your credentials.');
}

// ============================================================
// STEP 2 — CLOUDINARY SETUP
// ---------------------------------------------------------------
// 1. Sign up free at: https://cloudinary.com (no credit card needed)
// 2. Note your "Cloud name" on the Dashboard
// 3. Go to: Settings → Upload → "Add upload preset"
//    - Signing Mode: Unsigned
//    - Folder: realestate-properties
//    - Save the preset name
// 4. Fill in cloudName and uploadPreset below
// ---------------------------------------------------------------
const CLOUDINARY = {
  cloudName:    'dlifykbon',
  uploadPreset: 'cheston_unsigned', // NOTE: tied to an existing Cloudinary preset — see caveats
  folder:       'realestate-properties',
};
const CLOUDINARY_CONFIGURED = !CLOUDINARY.cloudName.startsWith('PASTE_');

// ============================================================
// STEP 3 — EMAILJS SETUP (for Password Reset emails)
// ---------------------------------------------------------------
// This lets the system send password reset codes directly from
// the browser — NO server or backend needed.
//
// 1. Sign up FREE at: https://www.emailjs.com  (200 emails/month free)
// 2. Go to "Email Services" → Connect your Gmail or Outlook
//    - Click "Add New Service" → Gmail → Connect Account → Save
//    - Note your SERVICE ID (e.g. "service_abc123")
// 3. Go to "Email Templates" → "Create New Template"
//    - Subject:  "Your Real Estate Company Password Reset Code"
//    - Body:     Hello {{to_name}},
//                Your password reset code is: {{otp_code}}
//                This code expires in 15 minutes.
//                If you did not request this, ignore this email.
//    - To Email: {{to_email}}
//    - Save → Note your TEMPLATE ID (e.g. "template_xyz789")
// 4. Go to "Account" → Note your PUBLIC KEY
// 5. Paste all three values below
// ---------------------------------------------------------------
const EMAILJS_CONFIG = {
  publicKey:  'PASTE_YOUR_EMAILJS_PUBLIC_KEY_HERE',
  serviceId:  'PASTE_YOUR_SERVICE_ID_HERE',
  templateId: 'PASTE_YOUR_TEMPLATE_ID_HERE',
};
const EMAILJS_CONFIGURED = !EMAILJS_CONFIG.publicKey.startsWith('PASTE_');

// ============================================================
// APP CONFIG — locations, listing types, amenities
// ============================================================
const CONFIG = {
  appName:    'Real Estate Company',
  appTagline: 'Property Onboarding Demo',
  currency:   'KSh',

  propertyLocations: [
    'Kileleshwa', 'Lavington',    'Kilimani',
    'Westlands',  'Riverside',    'Karen', 'Ongata Rongai',
  ],

  listingTypes: ['For Sale', 'For Rent', 'For Sale & Rent'],

  unitTypes: [
    'Bedsitter / Studio',
    '1 Bedroom',
    '2 Bedroom',
    '3 Bedroom',
    '4 Bedroom',
    '5 Bedroom',
    'Penthouse',
    'Townhouse',
    'Maisonette',
    'Villa',
    'Bungalow',
    'Shop / Commercial',
    'Office Space',
    'Land / Plot',
  ],

  amenities: [
    'Swimming Pool',      'Gym/Fitness Center',   'Parking',
    'Security/CCTV',      'Generator Backup',      'Borehole Water',
    'Solar Power',        'Garden',                'Balcony/Terrace',
    'Elevator/Lift',      'Servants Quarter',      'Study Room',
    'Home Theatre',       'Smart Home Features',   'EV Charging',
    'Concierge Service',
  ],
};
