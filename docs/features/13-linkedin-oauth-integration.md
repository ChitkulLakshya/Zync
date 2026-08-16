# 13 — LinkedIn OAuth Integration

**NEW document** — LinkedIn OAuth flow, custom token generation, Firebase user creation, profile sync

---

## Feature Summary

LinkedIn sign-in uses a server-side OAuth 2.0 flow. Unlike Google/GitHub which use Firebase's `signInWithPopup`, LinkedIn requires a full redirect-based OAuth flow handled by the backend. The backend exchanges the LinkedIn auth code for an access token, fetches the user's LinkedIn profile, creates or retrieves a Firebase user, generates a Firebase custom token, and redirects the frontend to `/login?customToken=<token>`.

---

## Architecture Diagram

```
┌──────────────── FRONTEND ──────────────────────────────┐
│                                                         │
│  Login.tsx → LinkedinSignInButton component              │
│  └─ Links to: /api/linkedin/auth (full page redirect)   │
│                                                         │
│  After redirect back:                                   │
│  Login.tsx useEffect reads URL params:                  │
│  ├─ ?customToken=<token> → signInWithCustomToken(auth)  │
│  ├─ ?error=<msg> → toast error                          │
│  └─ postLoginRedirect(navigate, user)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────── BACKEND (linkedinRoutes.js) ───────────┐
│                                                         │
│  GET /api/linkedin/auth                                 │
│  ├─ Build LinkedIn OAuth URL with:                      │
│  │   client_id, redirect_uri, state, scope              │
│  └─ res.redirect(authUrl) → user goes to LinkedIn       │
│                                                         │
│  GET /api/linkedin/callback                             │
│  ├─ Receive ?code=<auth_code> from LinkedIn             │
│  ├─ POST https://www.linkedin.com/oauth/v2/accessToken  │
│  │   Exchange code for access_token                     │
│  ├─ GET https://api.linkedin.com/v2/userinfo            │
│  │   Fetch profile: email, name, picture, sub           │
│  ├─ Firebase Admin: getUserByEmail(email)                │
│  │   ├─ If exists: use existing userRecord              │
│  │   └─ If not: createUser({ uid, email, displayName }) │
│  ├─ getAuth().createCustomToken(userRecord.uid)         │
│  └─ res.redirect(FRONTEND_URL/login?customToken=token)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram

```
User        Frontend      Backend       LinkedIn API    Firebase Admin
 │              │            │              │                │
 │ Click LinkedIn│           │              │                │
 │─────────────►│            │              │                │
 │              │ Redirect to /api/linkedin/auth             │
 │              │───────────►│              │                │
 │              │            │ Build OAuth URL               │
 │              │            │──────────────►│                │
 │ Redirected to LinkedIn login               │                │
 │◄──────────────────────────────────────────►│                │
 │ Authorizes app              │              │                │
 │              │              │              │                │
 │ Redirected to /api/linkedin/callback?code=XXX              │
 │───────────────────────────►│              │                │
 │              │            │ Exchange code for token        │
 │              │            │──────────────►│                │
 │              │            │ access_token  │                │
 │              │            │◄──────────────│                │
 │              │            │ Fetch userinfo │                │
 │              │            │──────────────►│                │
 │              │            │ Profile data  │                │
 │              │            │◄──────────────│                │
 │              │            │ getUserByEmail │                │
 │              │            │───────────────────────────────►│
 │              │            │ userRecord     │                │
 │              │            │◄───────────────────────────────│
 │              │            │ createCustomToken              │
 │              │            │───────────────────────────────►│
 │              │            │ custom token   │                │
 │              │            │◄───────────────────────────────│
 │              │            │ Redirect to /login?customToken │
 │◄──────────────────────────│              │                │
 │              │            │              │                │
 │ Frontend: signInWithCustomToken(auth, token)              │
 │              │───────────────────────────────────────────►│
 │              │            │              │  Firebase user │
 │              │◄───────────────────────────────────────────│
 │              │ postLoginRedirect → /dashboard             │
 │◄─────────────│            │              │                │
```

---

## Backend Trace

### File: `backend/routes/linkedinRoutes.js` (302 lines)

### Imports (lines 78-86)
```js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
```

### Configuration (lines 88-106)
| Variable | Source | Default | Purpose |
|---|---|---|---|
| `LINKEDIN_CLIENT_ID` | env | — | OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | env | — | OAuth client secret |
| `FRONTEND_URL` | env | `http://localhost:5173` | Frontend redirect URL |

### Endpoint: GET /auth (lines 110-128)
1. **Build redirect URI:** `${req.protocol}://${req.get('host')}/api/linkedin/callback`
   - Dynamic — works for both localhost and production
2. **Scope:** `'openid profile email'` — OpenID Connect scopes
3. **State:** Random string for CSRF protection: `Math.random().toString(36).substring(7)`
4. **Auth URL:** `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&state=...&scope=...`
5. **Response:** `res.redirect(authUrl)` — browser follows redirect to LinkedIn

### Endpoint: GET /callback (lines 132-298)

#### Error Handling (lines 135-155)
- If `error` in query params: redirect to `${FRONTEND_URL}/login?error=<msg>`
- If no `code` in query params: redirect to `${FRONTEND_URL}/login?error=NoCodeProvided`

#### Step 1: Exchange Code for Token (lines 166-200)
```js
const tokenResponse = await axios.post(
  'https://www.linkedin.com/oauth/v2/accessToken',
  null,
  {
    params: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }
);
const accessToken = tokenResponse.data.access_token;
```

#### Step 2: Fetch LinkedIn Profile (lines 208-221)
```js
const userinfoResponse = await axios.get(
  'https://api.linkedin.com/v2/userinfo',
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
const profile = userinfoResponse.data;
```
- Profile fields: `email`, `sub` (LinkedIn user ID), `name`, `given_name`, `family_name`, `picture`

#### Step 3: Create or Retrieve Firebase User (lines 242-277)
```js
let userRecord;
try {
  userRecord = await getAuth().getUserByEmail(email);
} catch (error) {
  if (error.code === 'auth/user-not-found') {
    userRecord = await getAuth().createUser({
      uid: `linkedin:${profile.sub}`,
      email: email,
      emailVerified: true,
      displayName: displayName,
      photoURL: photoURL,
    });
  } else {
    throw error;
  }
}
```
- **UID format:** `linkedin:<sub>` — prefixed to distinguish from other providers
- **Email verified:** Set to `true` since LinkedIn verified the email
- **Existing user:** If email matches an existing Firebase user, links to that account

#### Step 4: Generate Custom Token (line 281)
```js
const customToken = await getAuth().createCustomToken(userRecord.uid);
```

#### Step 5: Redirect to Frontend (line 285)
```js
res.redirect(`${FRONTEND_URL}/login?customToken=${customToken}`);
```

#### Error Fallback (lines 286-297)
- Any unhandled error: redirect to `${FRONTEND_URL}/login?error=LinkedIn Login Failed`
- Error logged: `console.error('LinkedIn OAuth Error:', err?.response?.data || err.message)`

---

## Frontend Trace

### LinkedinSignInButton Component
**File:** `src/components/auth/LinkedinSignInButton.tsx`
- Renders a LinkedIn-branded button
- On click: `window.location.href = '/api/linkedin/auth'` (full page redirect)
- No popup — LinkedIn OAuth requires full redirect flow

### Login Page — Custom Token Handling
**File:** `src/pages/Login.tsx:174-196`
```js
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const customToken = params.get('customToken');
  const authError = params.get('error');

  if (authError) {
    toast({ variant: 'destructive', title: 'Login Error', description: decodeURIComponent(authError) });
    navigate('/login', { replace: true });
  } else if (customToken) {
    signInWithCustomToken(auth, customToken)
      .then(async (cred) => {
        toast({ title: 'Success', description: 'Logged in successfully' });
        await postLoginRedirect(navigate, cred.user);
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      });
  }
}, [location, navigate, toast]);
```

---

## OAuth Scopes

| Scope | Access | Purpose |
|---|---|---|
| `openid` | OpenID Connect | Standard OIDC scope |
| `profile` | name, given_name, family_name, picture, sub | User profile data |
| `email` | email address | User email for Firebase account |

---

## Error Paths

| Scenario | Handling | User Sees |
|---|---|---|
| User denies permission | Redirect to `/login?error=<description>` | Error toast |
| No code returned | Redirect to `/login?error=NoCodeProvided` | Error toast |
| Token exchange fails | Redirect to `/login?error=LinkedIn Login Failed` | Error toast |
| Userinfo fetch fails | Redirect to `/login?error=LinkedIn Login Failed` | Error toast |
| Firebase user creation fails | Redirect to `/login?error=LinkedIn Login Failed` | Error toast |
| Custom token generation fails | Redirect to `/login?error=LinkedIn Login Failed` | Error toast |
| Frontend: custom token invalid | `signInWithCustomToken` rejects | Error toast |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LINKEDIN_CLIENT_ID` | Yes | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | Yes | LinkedIn OAuth client secret |
| `FRONTEND_URL` | Yes | Frontend URL for redirect (e.g., `https://zync-meet.vercel.app`) |

---

## LinkedIn App Configuration

### Required OAuth 2.0 Settings
- **Redirect URL:** `https://<backend-domain>/api/linkedin/callback` (production) + `http://localhost:5000/api/linkedin/callback` (development)
- **Scopes:** `openid`, `profile`, `email`
- **Products:** "Sign In with LinkedIn using OpenID Connect"

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Custom token flow in Login.tsx
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — OAuth security
- [09-user-profile-management.md](./09-user-profile-management.md) — User sync after LinkedIn login
