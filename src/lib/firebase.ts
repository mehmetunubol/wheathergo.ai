
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);


// To use emulators, uncomment the lines below and ensure emulators are running.
// if (process.env.NODE_ENV === 'development') {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log("Firebase emulators connected.");
//   } catch (error) {
//     console.error("Error connecting to Firebase emulators:", error);
//   }
// }

export { app, auth, db };

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
