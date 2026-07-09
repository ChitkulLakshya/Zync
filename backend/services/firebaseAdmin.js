const admin = require('firebase-admin');

let firestoreInstance = null;
let attemptedInit = false;

const parseServiceAccount = () => {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  let normalized = raw.trim();
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1);
  }

  const parsed = JSON.parse(normalized);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
};

const getFirestoreAdmin = () => {
  if (firestoreInstance) return firestoreInstance;
  if (attemptedInit) return null;

  attemptedInit = true;
  try {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      console.warn('[FirebaseAdmin] GCP_SERVICE_ACCOUNT_KEY not set; Firestore sync disabled.');
      return null;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }

    firestoreInstance = admin.firestore();
    return firestoreInstance;
  } catch (error) {
    console.error('[FirebaseAdmin] Failed to initialize firebase-admin:', error.message);
    return null;
  }
};

module.exports = { admin, getFirestoreAdmin };
