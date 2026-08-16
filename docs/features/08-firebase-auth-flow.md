# 08 — Firebase Auth Flow

**NEW document** — Complete authentication flow: login, signup, Google/GitHub OAuth, LinkedIn, custom token, account linking, token refresh

---

## Feature Summary

Zync uses Firebase Authentication as its identity provider. Users can sign in via email/password, Google OAuth, GitHub OAuth, or LinkedIn (via custom token). Firebase issues a JWT (ID token) that the frontend sends as a Bearer token to all API calls. The backend verifies this token via Firebase Admin SDK.

---

## Architecture Diagram

```
┌─────────────────── SIGN-IN METHODS ───────────────────────┐
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Email/Pass  │  │ Google OAuth│  │ GitHub OAuth│        │
│  │ signInWith  │  │ signInWith  │  │ signInWith  │        │
│  │ EmailAndPwd │  │ Popup(Google)│  │ Popup(GitHub)│       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐        │
│  │  LinkedIn   │  │ Custom Token│  │ Account     │        │
│  │  OAuth      │  │ (redirect)  │  │ Linking     │        │
│  │  via backend│  │ signInWith  │  │ linkWith    │        │
│  │  → custom   │  │ CustomToken │  │ Credential  │        │
│  └──────┬──────┘  └──────┴──────┘  └──────┴──────┘        │
│         │                │                │                │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
┌───────────────────────────────────────────────────────────┐
│              Firebase Auth (Client SDK)                     │
│  onAuthStateChanged() → updates currentUser state          │
│  currentUser.getIdToken() → JWT Bearer token               │
└───────────────────────────┬───────────────────────────────┘
                            │
                            │ Authorization: Bearer <JWT>
                            ▼
┌───────────────────────────────────────────────────────────┐
│              Backend (Express + Firebase Admin)             │
│  verifyToken middleware:                                    │
│    getAuth().verifyIdToken(token)                           │
│    → req.user = { uid, email }                              │
│  If invalid: 403                                            │
│  If missing: 401                                            │
└───────────────────────────────────────────────────────────┘
```

---

## Frontend Trace

### Firebase Initialization
**File:** `src/lib/firebase.ts:76-152`

1. **Config object** (lines 89-102): Reads `VITE_FIREBASE_*` env vars with mock fallbacks for CI
2. **App init** (line 111): `getApps().length === 0 ? initializeApp(config) : getApp()` — prevents double-init during HMR
3. **App Check** (lines 127-135): `initializeAppCheck` with `ReCaptchaV3Provider` if valid key exists
4. **Exports** (lines 138-152):
   - `auth` — `getAuth(app)` for all auth operations
   - `storage` — `getStorage(app)` for file uploads
   - `db` — `getFirestore(app)` for real-time sync
   - `messaging` — `getMessaging(app)` for FCM (wrapped in try/catch)

### Login Page
**File:** `src/pages/Login.tsx:119-546`

#### State Variables (lines 122-138)
| Variable | Type | Purpose |
|---|---|---|
| `email` | string | Email input field |
| `password` | string | Password input field |
| `loading` | boolean | Disable buttons during auth |
| `currentUser` | User \| null | Current Firebase user |
| `confirmState` | { message, resolve } \| null | Custom confirm dialog |

#### Custom Token Flow (lines 174-196)
1. Reads `customToken` from URL query params (used by LinkedIn OAuth redirect)
2. Calls `signInWithCustomToken(auth, customToken)`
3. On success: toast + `postLoginRedirect(navigate, cred.user)`
4. On error: toast with error message

#### Auth State Listener (lines 198-207)
- `onAuthStateChanged(auth, (user) => setCurrentUser(user))`
- Shows "Continue as [user]" UI if already logged in
- Shows login form if no user

#### Email Login (lines 233-252)
```js
const cred = await signInWithEmailAndPassword(auth, email, password);
toast({ title: 'Success', description: 'Logged in successfully' });
await postLoginRedirect(navigate, cred.user);
```

#### Google OAuth Login
- `signInWithPopup(auth, new GoogleAuthProvider())`
- On success: toast + redirect
- On `auth/account-exists-with-different-credential`: triggers account linking flow

#### GitHub OAuth Login
- `signInWithPopup(auth, new GithubAuthProvider())`
- Same error handling and linking flow as Google

#### Account Linking Flow (lines 254-273)
1. Catches `auth/account-exists-with-different-credential` error
2. Extracts `pendingCred` from error
3. Gets `email` from `error.customData`
4. Calls `fetchSignInMethodsForEmail(email)` to find existing provider
5. Signs in with existing provider
6. Calls `linkWithCredential(user, pendingCred)` to link the new provider
7. Redirects to dashboard

#### Continue / Switch Account (lines 209-231)
- **Continue:** `postLoginRedirect(navigate, currentUser)` — go to dashboard with existing user
- **Switch:** `signOutAndClearState(auth)` → clears state → shows login form

### Signup Page
**File:** `src/pages/Signup.tsx`
- `createUserWithEmailAndPassword(auth, email, password)`
- Creates user in Firebase Auth
- Syncs to MongoDB via `/api/users/sync` endpoint
- Redirects to dashboard

### Post-Login Redirect
**File:** `src/lib/postLoginRedirect.ts`
- Determines redirect target after login
- Checks for redirect URL in location state
- Falls back to dashboard (`/dashboard`)
- Handles PWA install wall redirect

### Auth Headers
**File:** `src/lib/auth-headers.ts:80-102`

#### `getAuthHeaders()` (lines 80-92)
```js
const user = auth.currentUser;
const token = user ? await user.getIdToken() : null;
return {
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
};
```

#### `getAuthToken()` (lines 95-102)
- Returns raw JWT string
- Throws `'Not authenticated'` if no user

### Auth Sign-Out
**File:** `src/lib/auth-signout.ts`
- Calls `auth.signOut()`
- Clears TanStack Query cache: `queryClient.clear()`
- Redirects to `/login`

### User Sync Hook
**File:** `src/hooks/use-user-sync.ts`
- After Firebase auth state changes, syncs user to MongoDB
- Calls `POST /api/users/sync` with Firebase UID + email
- Creates or updates MongoDB User record

---

## Backend Trace

### Firebase Admin Initialization
**File:** `backend/services/firebaseAdmin.js`
- Initializes Firebase Admin SDK with service account credentials
- Uses `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID` env vars
- `getFirestoreAdmin()` — lazy initialization of Firestore Admin
- `getAuth()` — returns Firebase Admin Auth instance

### Token Verification Middleware
**File:** `backend/middleware/authMiddleware.js:96-119`

```js
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    return res.status(403).json({ message: `Unauthorized: ${error.message}` });
  }
};
```

### User Sync Endpoint
**File:** `backend/routes/userRoutes.js`
- `POST /api/users/sync` — creates or updates MongoDB User from Firebase UID
- Checks if User with `uid` exists
- If not, creates new User with `uid`, `email`, `displayName`
- If yes, updates `lastSeen` and `status: 'online'`

### LinkedIn OAuth (Custom Token Flow)
**File:** `backend/routes/linkedinRoutes.js`
1. `GET /api/linkedin/auth` — redirects to LinkedIn OAuth URL
2. `GET /api/linkedin/callback` — receives LinkedIn auth code
3. Exchanges code for LinkedIn access token
4. Fetches LinkedIn profile (name, email, photo)
5. Creates/updates Firebase user via Admin SDK
6. Generates Firebase custom token: `getAuth().createCustomToken(uid)`
7. Redirects to frontend: `FRONTEND_URL/login?customToken=<token>`
8. Frontend calls `signInWithCustomToken(auth, customToken)`

---

## Token Lifecycle

```
1. User signs in (email/Google/GitHub/LinkedIn)
   └─ Firebase issues JWT (ID token), valid for 1 hour

2. Frontend stores user session (Firebase handles persistence)
   └─ auth.currentUser available across page reloads

3. API calls include: Authorization: Bearer <JWT>
   └─ getAuthHeaders() calls currentUser.getIdToken()
   └─ Firebase auto-refreshes if token is expired

4. Backend verifies: getAuth().verifyIdToken(token)
   └─ Returns decodedToken with uid, email, exp
   └─ Rejects expired or invalid tokens (403)

5. User signs out: auth.signOut()
   └─ Clears session, TanStack cache, redirects to /login
```

---

## Error Paths

| Scenario | Layer | Error Code | Handling |
|---|---|---|---|
| Invalid email/password | Frontend | `auth/wrong-password` | Toast error message |
| Email already in use | Frontend | `auth/email-already-in-use` | Toast, suggest login |
| Account exists with different credential | Frontend | `auth/account-exists-with-different-credential` | Account linking flow |
| No Authorization header | Backend | 401 | `{ message: "Unauthorized: No token provided" }` |
| Expired/invalid JWT | Backend | 403 | `{ message: "Unauthorized: <error>" }` |
| Firebase Admin not initialized | Backend | — | Falls back to `initializeApp()` with default creds |
| LinkedIn callback error | Backend | — | Redirects to `/login?error=<msg>` |
| Custom token invalid | Frontend | `auth/invalid-custom-token` | Toast error |

---

## Environment Variables

| Variable | Required | Used By | Description |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | `src/lib/firebase.ts` | Client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `src/lib/firebase.ts` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | `src/lib/firebase.ts` | Project ID |
| `VITE_FIREBASE_APP_ID` | Yes | `src/lib/firebase.ts` | App ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | `src/lib/firebase.ts` | FCM sender ID |
| `VITE_RECAPTCHA_SITE_KEY` | No | `src/lib/firebase.ts` | ReCaptcha for App Check |
| `FIREBASE_CLIENT_EMAIL` | Yes | `backend/services/firebaseAdmin.js` | Admin service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | `backend/services/firebaseAdmin.js` | Admin private key |
| `FIREBASE_PROJECT_ID` | Yes | `backend/services/firebaseAdmin.js` | Admin project ID |
| `LINKEDIN_CLIENT_ID` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn OAuth |
| `LINKEDIN_REDIRECT_URI` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn callback URL |
| `FRONTEND_URL` | Yes | `backend/routes/linkedinRoutes.js` | Frontend redirect URL |

---

## Cross-References

- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security overview
- [06-middleware-stack.md](./06-middleware-stack.md) — verifyToken middleware detail
- [09-user-profile-management.md](./09-user-profile-management.md) — Profile CRUD after auth
- [13-linkedin-oauth-integration.md](./13-linkedin-oauth-integration.md) — LinkedIn deep dive
- [22-github-oauth-integration.md](./22-github-oauth-integration.md) — GitHub OAuth deep dive
