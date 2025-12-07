\// src/lib/firebaseClient.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtB2RU0Ek2xsLt2m6mX8IVWLslDRDStZw",
  authDomain: "focushub-f1320.firebaseapp.com",
  projectId: "focushub-f1320",
  storageBucket: "focushub-f1320.firebasestorage.app",
  messagingSenderId: "437953550940",
  appId: "1:437953550940:web:36fb5571c409a492ec6499",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function signInAnon() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (e) {
    console.error("Anon sign-in failed", e);
    return null;
  }
}

export {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  signInAnon,
  onAuthStateChanged,
};
