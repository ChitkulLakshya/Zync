import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error(
    'CRITICAL: Firebase Configuration Missing. Please ensure .env file exists and contains VITE_FIREBASE_API_KEY.'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// App Check (reCAPTCHA v3) — only when a real site key is set. A missing/placeholder key
// causes CSP/network noise and can interfere with Auth in dev.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const isValidRecaptchaSiteKey = (key: string | undefined): key is string => {
  if (!key || key === '6Lc_your_site_key_here') {
    return false;
  }
  return key.startsWith('6L');
};

if (typeof window !== 'undefined' && isValidRecaptchaSiteKey(recaptchaSiteKey)) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;
