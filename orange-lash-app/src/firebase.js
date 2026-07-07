import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqjRT-RsJsQEnfAWXePdLZVtwRJZwKEUU",
  authDomain: "orangelash-63f99.firebaseapp.com",
  projectId: "orangelash-63f99",
  storageBucket: "orangelash-63f99.firebasestorage.app",
  messagingSenderId: "185793229138",
  appId: "1:185793229138:web:d74d4ccb305862188b8a8b",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
