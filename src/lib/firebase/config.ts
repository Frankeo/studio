
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate environment variables
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

export let isFirebaseConfigured: boolean;
export let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let storage: FirebaseStorage | null = null;

if (missingKeys.length > 0) {
  isFirebaseConfigured = false;
  console.warn(
`Firebase configuration is missing or empty for the following keys: ${missingKeys.join(', ')}. 
Falling back to mock data and auth where applicable.
Please ensure all NEXT_PUBLIC_FIREBASE_ prefixed variables are set correctly in your .env.local file and that the Next.js development server was restarted after changes.
Example .env.local:
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"`
  );
} else {
  isFirebaseConfigured = true;
  // Initialize Firebase only if all keys are present
  try {
    const firebaseAppInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    app = firebaseAppInstance;
    auth = getAuth(firebaseAppInstance);
    db = getFirestore(firebaseAppInstance);
    storage = getStorage(firebaseAppInstance);
  } catch (error) {
    // This catch block is a fallback, though the primary check is `missingKeys`.
    // It could catch other Firebase initialization errors.
    console.error("Firebase initialization failed:", error);
    isFirebaseConfigured = false;
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

export { firebaseConfig as firebaseConfigValues };
