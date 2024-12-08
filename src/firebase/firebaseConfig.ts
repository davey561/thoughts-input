// src/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCfxouckycyZmMsh7racAOOtlJCAVG9Mlk",
    authDomain: "pastself.firebaseapp.com",
    projectId: "pastself",
    storageBucket: "pastself.firebasestorage.app",
    messagingSenderId: "214807503030",
    appId: "1:214807503030:web:6b616138894d4d24ce4617",
    measurementId: "G-85W8VF7KYR"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
