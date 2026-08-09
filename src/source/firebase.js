// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCU_uhwWIkcWA53mKA0LvPgkZiZH3Jlq6s",
  authDomain: "raincoat-22ae0.firebaseapp.com",
  projectId: "raincoat-22ae0",
  storageBucket: "raincoat-22ae0.firebasestorage.app",
  messagingSenderId: "826867412161",
  appId: "1:826867412161:web:11632add503231d0adb840"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
