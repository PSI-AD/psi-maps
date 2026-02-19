import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCt5DngU6nykCcp7Lk1m2xUgpzOFLB7KKY",
  authDomain: "psimaps-pro.firebaseapp.com",
  projectId: "psimaps-pro",
  storageBucket: "psimaps-pro.firebasestorage.app",
  messagingSenderId: "618627128805",
  appId: "1:618627128805:web:b9a7a3e475f54f590b230c"
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);

export { db };
