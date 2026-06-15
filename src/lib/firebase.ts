/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration using environment variables or direct fallbacks to verify live connection
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATZn1U1B_JywQkdSrVxQ-_K4C5Q82KxCE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fabian-tracking.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fabian-tracking",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fabian-tracking.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "108032115841",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:108032115841:web:7f1236ab5a8a715c83b980",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TGX770ZQ7M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services and export them
export const auth = getAuth(app);
export const db = getFirestore(app);
