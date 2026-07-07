// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAqjRT-RsJsQEnfAWXePdLZVtwRJZwKEUU",
  authDomain: "orangelash-63f99.firebaseapp.com",
  projectId: "orangelash-63f99",
  storageBucket: "orangelash-63f99.firebasestorage.app",
  messagingSenderId: "185793229138",
  appId: "1:185793229138:web:d74d4ccb305862188b8a8b",
  measurementId: "G-3DGJMKQD1K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);