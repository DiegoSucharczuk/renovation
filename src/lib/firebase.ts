import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase lazily - only when needed
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let initialized = false;

function validateFirebaseConfig() {
  // Check if config has actual values (not undefined)
  const hasValidConfig = 
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId;

  if (!hasValidConfig) {
    const errorMsg = `Missing Firebase configuration. Please create a .env.local file in the root directory with these variables:\n\nNEXT_PUBLIC_FIREBASE_API_KEY=your-value\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-value\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=your-value\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-value\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-value\nNEXT_PUBLIC_FIREBASE_APP_ID=your-value\n\nSee QUICKSTART.md for details.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

function initializeFirebase() {
  if (initialized) return;
  if (typeof window === 'undefined') {
    console.warn('Firebase initialization skipped on server-side');
    return;
  }

  try {
    validateFirebaseConfig();
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    initialized = true;
    console.debug('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Initialize Firebase immediately when this module is imported on the client
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Getter functions that initialize on first use
export function getFirebaseApp() {
  initializeFirebase();
  return app;
}

export function getFirebaseAuth() {
  initializeFirebase();
  return auth;
}

export function getFirebaseDb() {
  initializeFirebase();
  if (!db) {
    throw new Error('Firestore not initialized. Check .env.local configuration.');
  }
  return db;
}

export function getFirebaseStorage() {
  initializeFirebase();
  return storage;
}

// Deprecated - use getter functions instead
// Always ensure db is initialized before using
export { app, auth, db, storage };
