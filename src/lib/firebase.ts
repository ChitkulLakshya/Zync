import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock_api_key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock_project_id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:mockappid',
};

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn('Firebase configuration secrets missing. Using mock fallback credentials for testing/CI.');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();



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
