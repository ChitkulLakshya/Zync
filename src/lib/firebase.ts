// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoRrOTMYVBY1FF-tvv6rn2YFLImrO_ad0",
  authDomain: "zync-7c9b0.firebaseapp.com",
  projectId: "zync-7c9b0",
  storageBucket: "zync-7c9b0.firebasestorage.app",
  messagingSenderId: "504395777430",
  appId: "1:504395777430:web:4968b84164c6e4426109b7",
  databaseURL: "https://zync-7c9b0-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
