import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0054317751",
  appId: "1:617141794693:web:6a022924d3fb448adfb6ec",
  apiKey: "AIzaSyATjwwIw_5Yl0ikDbHHqHb2ojOSpHK17gQ",
  authDomain: "gen-lang-client-0054317751.firebaseapp.com",
  storageBucket: "gen-lang-client-0054317751.firebasestorage.app",
  messagingSenderId: "617141794693"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-94cf005c-b744-42a5-ad8e-2c7356e93879");
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
