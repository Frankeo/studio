
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

// Define known placeholder values for the API key
const PLACEHOLDER_API_KEYS = ["YOUR_API_KEY", "YOUR_FIREBASE_API_KEY", ""];

// Validate environment variables
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
export let isFirebaseConfigured: boolean;

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);
const apiKeyIsInvalid = firebaseConfig.apiKey && (PLACEHOLDER_API_KEYS.includes(firebaseConfig.apiKey) || firebaseConfig.apiKey.trim() === "" || firebaseConfig.apiKey === "null" || firebaseConfig.apiKey === "undefined");


if (missingKeys.length > 0 || apiKeyIsInvalid) {
  isFirebaseConfigured = false;
  const reason = missingKeys.length > 0
    ? `Firebase configuration is missing or empty for the following keys: ${missingKeys.join(', ')}.`
    : `Firebase API key (NEXT_PUBLIC_FIREBASE_API_KEY) is set to a placeholder or invalid value ("${firebaseConfig.apiKey}").`;
  
  console.warn(
    `${reason} 
Firebase services will not be initialized. The application may not function as expected.
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
  // Attempt to initialize Firebase only if all keys are present and API key is not a known placeholder
  try {
    const firebaseAppInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    app = firebaseAppInstance;
    auth = getAuth(firebaseAppInstance);
    db = getFirestore(firebaseAppInstance);
    storage = getStorage(firebaseAppInstance);
    isFirebaseConfigured = true; // Set to true only if initialization succeeds
    console.log("Firebase configured and initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    isFirebaseConfigured = false; // Explicitly set to false on error
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

export { app, auth, db, storage, firebaseConfig as firebaseConfigValues };
