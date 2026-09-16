import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC_Yw6oabBq6PaMMLoxcBySERE94njH3Ak",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pharmacy-next-9a100.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pharmacy-next-9a100",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pharmacy-next-9a100.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "611921598052",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:611921598052:web:098afa7daea4342ea87171",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DSJM4P5Y4H",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
