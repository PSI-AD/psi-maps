import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCt5DngU6nykCcp7Lklm2xUgpzOFLB7KKY",
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
export const analytics: Analytics | null = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { db, storage };
