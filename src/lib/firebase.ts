// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoRrOTMYVBY1FF-tvv6rn2YFLImrO_ad0",
  authDomain: "Zync-7c9b0.firebaseapp.com",
  projectId: "Zync-7c9b0",
  storageBucket: "Zync-7c9b0.firebasestorage.app",
  messagingSenderId: "504395777430",
  appId: "1:504395777430:web:4968b84164c6e4426109b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
