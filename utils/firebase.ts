import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB6JvSC_BlZBpki5qf0Z7X_EqUG43BV2vQ",
  authDomain: "psimaps-pro.firebaseapp.com",
  projectId: "psimaps-pro",
  storageBucket: "psimaps-pro.firebasestorage.app",
  messagingSenderId: "618627128805",
  appId: "1:618627128805:web:b9a7a3e475f54f590b230c",
  measurementId: "G-KXCXB3TXNZ"
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Analytics disabled — API key lacks firebaseinstallations.googleapis.com permission.
// Re-enable once the key is updated in Google Cloud Console.
export const analytics = null;

export { db, storage };
