// Imports the User type from Firebase to strongly type the user object passed into the redirect function.
import type { User } from 'firebase/auth';
// Imports the NavigateFunction type from React Router to type the navigation handler.
import type { NavigateFunction } from 'react-router-dom';
// Imports the base API URL to dynamically construct requests to the backend server.
import { API_BASE_URL } from '@/lib/utils';

/** Show Welcome flow for accounts created within this window (first visit only). */
// Defines the time window (48 hours in milliseconds) during which an account is considered "new" and eligible for the welcome screen.
const NEW_USER_WINDOW_MS = 48 * 60 * 60 * 1000;
// Defines a much shorter time window (2 minutes) to detect if the user's current sign-in is their very first sign-in.
const FRESH_SIGNIN_MATCH_WINDOW_MS = 2 * 60 * 1000;

// Defines a helper function that generates a unique local storage key based on the user's ID to track if they've completed the welcome flow.
const welcomeDoneKey = (uid: string) => `zync_welcome_done_${uid}`;

// Defines an asynchronous function to fetch the user's profile from the backend, with built-in retry logic to handle delayed database syncs.
async function fetchMeWithRetry(
  token: string,
  attempts = 5
): Promise<Record<string, unknown> | null> {
  // Loops up to the specified number of attempts to allow the backend time to create the user record after Firebase auth succeeds.
  for (let i = 0; i < attempts; i++) {
    // Sends a GET request to the /me endpoint, passing the Firebase JWT token for authentication.
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // If the request succeeds (status 200-299), parses and returns the JSON response data immediately.
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>;
    }
    // If the record wasn't found (404) and we haven't exhausted our attempts, wait before trying again using an exponential-like backoff.
    if (res.status === 404 && i < attempts - 1) {
      // Delays the next attempt by 400ms multiplied by the current iteration to reduce server load.
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      // Continues to the next iteration of the loop.
      continue;
    }
    // Returns null if the request failed for a reason other than 404 or if all attempts are exhausted.
    return null;
  }
  // Fallback return null if the loop exits without success.
  return null;
}

// Defines a function to evaluate whether a Firebase user account is completely fresh based on its metadata timestamps.
function isFreshFirebaseAccount(user: User): boolean {
  // Extracts the account creation timestamp in milliseconds, handling potential missing data gracefully by returning NaN.
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).getTime()
    : NaN;
  // Extracts the last sign-in timestamp in milliseconds, also handling missing data safely.
  const lastSignIn = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).getTime()
    : NaN;

  // If the creation time is invalid or missing, we cannot safely assume it's a new account, so return false.
  if (Number.isNaN(createdAt)) {
    return false;
  }
  // If the last sign-in time is missing, check if the creation time falls within the generic "new user" window (48 hours).
  if (Number.isNaN(lastSignIn)) {
    return Date.now() - createdAt < NEW_USER_WINDOW_MS;
  }

  // Returns true if the difference between creation and last sign-in is extremely small (within 2 minutes), strongly implying this is their first login.
  return Math.abs(lastSignIn - createdAt) <= FRESH_SIGNIN_MATCH_WINDOW_MS;
}

/**
 * After Firebase auth succeeds, send users to `/welcome` (new accounts) or `/dashboard`.
 * Retries `/me` briefly so Mongo upsert from `useUserSync` can finish.
 */
// Exports the primary routing function called immediately after a user successfully logs in.
export async function postLoginRedirect(navigate: NavigateFunction, user: User): Promise<void> {
  // Checks local storage to see if this specific user has already completed the welcome onboarding flow on this device.
  const done =
    typeof localStorage !== 'undefined' && localStorage.getItem(welcomeDoneKey(user.uid));
  // Initially determines if the account is new based purely on Firebase metadata.
  let isFreshAccount = isFreshFirebaseAccount(user);

  try {
    // Generates a fresh JWT token to authorize the backend fetch request.
    const token = await user.getIdToken();
    // Attempts to fetch the complete user profile from the backend, retrying if the record is still being created.
    const me = await fetchMeWithRetry(token);
    // If the backend returns a valid profile with a createdAt timestamp, use that timestamp for a more accurate evaluation.
    if (me?.createdAt) {
      // Parses the backend creation timestamp into milliseconds.
      const created = new Date(String(me.createdAt)).getTime();
      // If the parsed date is valid, recalculate the fresh account status based on the backend data instead of Firebase.
      if (!Number.isNaN(created)) {
        isFreshAccount = Date.now() - created < NEW_USER_WINDOW_MS;
      }
    }
  } catch {
    // Silently catches and ignores any errors during the fetch, falling back to the initial Firebase-based evaluation.
  }

  // Evaluates the final conditions to determine where the user should be sent.
  if (isFreshAccount && !done) {
    // Navigates new users who haven't completed onboarding to the welcome screen, replacing the current history entry so they can't hit 'back' to return to login.
    navigate('/welcome', { replace: true });
  } else {
    // Navigates returning users directly to the main dashboard.
    navigate('/dashboard', { replace: true });
  }
}

// Exports a utility function used by the welcome screen to mark the onboarding process as complete.
export function markWelcomeComplete(uid: string): void {
  try {
    // Writes a specific flag to local storage using the unique key for this user.
    localStorage.setItem(welcomeDoneKey(uid), '1');
  } catch {
    // Silently ignores errors if local storage is unavailable or restricted (e.g., in incognito mode).
  }
}
