import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// IMPORTANT: For local development with Firebase Emulators:
// 1. Ensure you have the Firebase CLI installed and configured.
// 2. Run `firebase init emulators` in your project if you haven't already.
// 3. Start the emulators: `firebase emulators:start`
//
// The Firebase SDK will automatically connect to the emulators if they are running on their default ports.
// Forcing connection for development environment:
if (process.env.NODE_ENV === 'development') {
  try {
    // Make sure emulators are running before uncommenting these lines.
    // connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    // connectFirestoreEmulator(db, "localhost", 8080);
    // connectStorageEmulator(storage, "localhost", 9199);
    console.log("Attempting to connect to Firebase emulators...");
    // Check if emulators are already connected (Firebase SDK might do this automatically)
    // This is a simplified check; actual connection logic is handled by the SDK.
    // The lines above are usually sufficient. If you encounter issues,
    // ensure your firebase.json is configured correctly for emulators.
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export { app, auth, db, storage };
