/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Initializes and provides access to the Firebase Admin SDK and Firestore database instance.
 * Why: Ensures that Firebase is initialized exactly once per backend lifecycle (singleton pattern) using secure credentials, avoiding initialization errors during hot reloads or multiple invocations.
 */
// WHAT: Import Firebase app management. WHY: Necessary to set up Firebase Admin SDK.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
// WHAT: Import Firestore accessor. WHY: Allows getting a database reference.
const { getFirestore } = require('firebase-admin/firestore');

// WHAT: Hold Firestore instance. WHY: Implements singleton pattern for database.
let firestoreInstance = null;
// WHAT: Track init attempts. WHY: Prevents multiple initialization loops on failure.
let attemptedInit = false;

// WHAT: Parse service account JSON. WHY: Environment vars often mangle strings.
const parseServiceAccount = () => {
  // WHAT: Read raw key. WHY: Keeps credentials out of source.
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  // WHAT: Return null if missing. WHY: Graceful fallback.
  if (!raw) return null;

  // WHAT: Trim whitespace. WHY: Removes accidental spaces.
  let normalized = raw.trim();
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1);
  }

  // WHAT: Parse to object. WHY: Firebase SDK requires an object.
  const parsed = JSON.parse(normalized);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
};

// WHAT: Get Firestore instance. WHY: Centralized database access.
const getFirestoreAdmin = () => {
  // WHAT: Return existing instance. WHY: Enforces singleton.
  if (firestoreInstance) return firestoreInstance;
  if (attemptedInit) return null;

  // WHAT: Mark init attempt. WHY: Prevents retry loops.
  attemptedInit = true;
  try {
    // WHAT: Parse credentials. WHY: Required to authenticate with GCP.
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      console.warn('[FirebaseAdmin] GCP_SERVICE_ACCOUNT_KEY not set; Firestore sync disabled.');
      return null;
    }

    // WHAT: Check if already initialized. WHY: Prevents "app already exists" errors.
    if (!getApps().length) {
      // WHAT: Initialize default app. WHY: Establishes connection.
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }

    // WHAT: Retrieve Firestore instance. WHY: Creates client for data access.
    firestoreInstance = getFirestore();
    return firestoreInstance;
  } catch (error) {
    console.error('[FirebaseAdmin] Failed to initialize firebase-admin:', error.message);
    return null;
  }
};

// WHAT: Export getter. WHY: Exposes Firestore to other modules.
module.exports = { getFirestoreAdmin };
