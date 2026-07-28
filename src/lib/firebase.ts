/**
 * @fileoverview firebase.ts
 * @module firebase
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
// Imports core Firebase initialization and app retrieval methods from the Firebase SDK to set up the client instance.
import { initializeApp, getApps, getApp } from 'firebase/app';
// Imports the getAuth factory function to initialize the Firebase Authentication module for this app instance.
import { getAuth } from 'firebase/auth';
// Imports the getStorage factory function to initialize Firebase Cloud Storage for uploading and downloading files.
import { getStorage } from 'firebase/storage';
// Imports the getFirestore factory function to initialize the Cloud Firestore database module for real-time data sync.
import { getFirestore } from 'firebase/firestore';
// Imports App Check initialization and ReCaptcha provider classes to protect the backend services from abuse.
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Defines the Firebase configuration object containing all necessary public keys and endpoints needed to connect to the cloud project.
const firebaseConfig = {
  // Reads the API key from Vite's environment variables, falling back to a mock string to prevent crashes during CI or local testing.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock_api_key',
  // Reads the Auth Domain from environment variables, which is used for OAuth redirects and email verification links.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
  // Reads the unique Project ID that identifies this specific Firebase project within Google Cloud.
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock_project_id',
  // Reads the Storage Bucket URL where all user-uploaded files and media will be stored.
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
  // Reads the Messaging Sender ID used by Firebase Cloud Messaging to send push notifications to this client.
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  // Reads the unique App ID generated by Firebase to identify this specific web client application.
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:mockappid',
};

// Checks if the primary API key is missing from the environment variables, which indicates the app is running in a development or CI environment without actual secrets.
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  // Logs a warning to the console so developers know that mock credentials are being used and live backend connections will fail.
  console.warn('Firebase configuration secrets missing. Using mock fallback credentials for testing/CI.');
}

// Checks if a Firebase app has already been initialized (which can happen during hot module reloading); if not, initializes it with the config, otherwise returns the existing instance.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Reads the ReCaptcha site key from environment variables, explicitly casting it as a string or undefined for TypeScript.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
// Defines a type-guard helper function to validate whether the provided ReCaptcha key is a legitimate, usable string.
const isValidRecaptchaSiteKey = (key: string | undefined): key is string => {
  // Checks if the key is missing entirely, or if it matches the default placeholder value indicating it hasn't been set.
  if (!key || key === '6Lc_your_site_key_here') {
    // Returns false because the key cannot be used to initialize App Check.
    return false;
  }
  // Returns true only if the key starts with '6L', which is the standard prefix for Google ReCaptcha site keys.
  return key.startsWith('6L');
};

// Checks if the code is running in a browser environment (window is defined) and if the ReCaptcha key passed validation.
if (typeof window !== 'undefined' && isValidRecaptchaSiteKey(recaptchaSiteKey)) {
  // Initializes Firebase App Check with the valid ReCaptcha key to verify that incoming requests are originating from the actual app.
  initializeAppCheck(app, {
    // Creates a new ReCaptchaV3Provider instance using the validated site key to handle the silent background verification.
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    // Enables automatic background refreshing of the App Check token so the user session doesn't expire while they are using the app.
    isTokenAutoRefreshEnabled: true,
  });
}

// Initializes and exports the Firebase Authentication service instance tied to the configured app.
export const auth = getAuth(app);
// Initializes and exports the Firebase Cloud Storage service instance tied to the configured app.
export const storage = getStorage(app);
// Initializes and exports the Cloud Firestore database service instance tied to the configured app.
export const db = getFirestore(app);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
try {
  messagingInstance = getMessaging(app);
} catch {
  messagingInstance = null;
}
export const messaging = messagingInstance;
export { getToken, onMessage };
export default app;
