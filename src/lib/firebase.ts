import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

declare global {
  interface Window {
    __FIREBASE_CONFIG__?: {
      apiKey?: string;
      authDomain?: string;
      projectId?: string;
      storageBucket?: string;
      messagingSenderId?: string;
      appId?: string;
      measurementId?: string;
    };
  }
}

const defaultConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: 'favorable-tree-318603.firebaseapp.com',
  projectId: 'favorable-tree-318603',
  storageBucket: 'favorable-tree-318603.firebasestorage.app',
  messagingSenderId: '411316001592',
  appId: '1:411316001592:web:dd36be004a25cd74cfbfcd',
  measurementId: 'G-Z9MT7N9SX8',
};

const firebaseConfig = {
  ...defaultConfig,
  ...(typeof window !== 'undefined' && window.__FIREBASE_CONFIG__ ? window.__FIREBASE_CONFIG__ : {}),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
