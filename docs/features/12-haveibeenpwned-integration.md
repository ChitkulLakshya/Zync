# 12 — HaveIBeenPwned Integration

**NEW document** — K-anonymity SHA-256 prefix matching for password breach checks

---

## Feature Summary

Zync integrates the Have I Been Pwned (HIBP) Pwned Passwords API to check if a user's password has appeared in known data breaches. The integration uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent to the API, ensuring the actual password or full hash is never transmitted. The service fails open — if the API is down, users are not blocked.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND (Signup/Settings) ───────────┐
│                                                            │
│  User enters password                                      │
│     │                                                      │
│     ▼                                                      │
│  POST /api/users/check-breached-password                   │
│     { password: "user_input" }                             │
│     │                                                      │
│     ▼                                                      │
│  ┌─────────────────── BACKEND ─────────────────────────┐  │
│  │                                                      │  │
│  │  haveIBeenPwnedService.js                            │  │
│  │                                                      │  │
│  │  Step 1: SHA-1 hash the password                     │  │
│  │    crypto.createHash('sha1')                         │  │
│  │    .update(password).digest('hex').toUpperCase()     │  │
│  │    → e.g., "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"│  │
│  │                                                      │  │
│  │  Step 2: Split into prefix + suffix                  │  │
│  │    prefix = first 5 chars → "5BAA6"                  │  │
│  │    suffix = remaining 35 chars → "1E4C9B93F3F..."    │  │
│  │                                                      │  │
│  │  Step 3: Query HIBP API with prefix ONLY             │  │
│  │    GET https://api.pwnedpasswords.com/range/5BAA6    │  │
│  │    Headers: { 'Add-Padding': 'true' }                │  │
│  │    Timeout: 5000ms                                   │  │
│  │                                                      │  │
│  │  Step 4: API returns ~500 hash suffixes              │  │
│  │    "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3"           │  │
│  │    "2BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8:1"      │  │
│  │    ...                                               │  │
│  │                                                      │  │
│  │  Step 5: Local match — find our suffix in results    │  │
│  │    if hashSuffix === suffix → COMPROMISED            │  │
│  │    return { isCompromised: true, count: 3 }          │  │
│  │                                                      │  │
│  │  Fail-open: on API error → { isCompromised: false }  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Frontend shows warning if isCompromised === true          │
│  "This password has been found in N data breaches"         │
└────────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/haveIBeenPwnedService.js` (122 lines)

### Imports (lines 81-82)
```js
const crypto = require('crypto');
const axios = require('axios');
```

### API Endpoint (line 84)
```js
const PWNED_PASSWORDS_BASE = 'https://api.pwnedpasswords.com/range/';
```

### checkPassword Function (lines 94-119)

#### Step 1: SHA-1 Hash (line 95)
```js
const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
```
- Uses Node.js built-in `crypto` module (no external dependency)
- Uppercase required by HIBP API specification

#### Step 2: Split Hash (lines 96-97)
```js
const prefix = sha1.substring(0, 5);
const suffix = sha1.substring(5);
```
- **Prefix (5 chars):** Sent to API — shared by ~500 other hashes
- **Suffix (35 chars):** Kept locally — used for matching

#### Step 3: API Request (lines 100-103)
```js
const response = await axios.get(`${PWNED_PASSWORDS_BASE}${prefix}`, {
  headers: { 'Add-Padding': 'true' },
  timeout: 5000,
});
```
- **Add-Padding header:** Obfuscates actual match count — adds zero-count entries to prevent timing attacks
- **5-second timeout:** Prevents backend from hanging if API is unresponsive

#### Step 4: Parse Response (lines 105-111)
```js
const lines = response.data.split('\n');
for (const line of lines) {
  const [hashSuffix, count] = line.trim().split(':');
  if (hashSuffix === suffix) {
    return { isCompromised: true, count: parseInt(count, 10) };
  }
}
```
- Response is plain text, one hash suffix per line
- Format: `SUFFIX:COUNT` (e.g., `1E4C9B93F3F0682250B6CF8331B7EE68FD8:3`)
- Local comparison only — full hash never leaves the server

#### Step 5: No Match (line 113)
```js
return { isCompromised: false, count: 0 };
```

#### Error Handling — Fail Open (lines 114-118)
```js
catch (error) {
  console.error('HIBP password check failed:', error.message);
  return { isCompromised: false, count: 0 };
}
```
- **Fail-open design:** If HIBP API is down, return "not compromised"
- **Rationale:** Don't block user registration/login because a third-party API is unavailable
- Error is logged for monitoring

---

### Route Integration
**File:** `backend/routes/userRoutes.js:161-174`

```js
router.post('/check-breached-password', async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password is required' });
  }
  try {
    const result = await checkPassword(password);
    res.json(result);
  } catch (error) {
    console.error('Breached password check error:', error.message);
    res.status(429).json({ message: error.message });
  }
});
```

- **No auth required** — endpoint is called during signup before user exists
- **Input validation:** password must be a non-empty string
- **429 on rate limit:** HIBP API may rate-limit aggressive callers

---

## Frontend Trace

### Signup Page
**File:** `src/pages/Signup.tsx`
- Password input field with real-time breach check
- On password entry (debounced), calls `POST /api/users/check-breached-password`
- If `isCompromised === true`: shows warning banner
  - "This password has been found in {count} data breaches. Please choose a different password."
- If `isCompromised === false`: shows green checkmark
- User can still proceed even with compromised password (warning, not block)

### SettingsView — Security Tab
**File:** `src/components/views/SettingsView.tsx`
- Password change form includes breach check
- Same warning UI as signup

---

## Privacy & Security Analysis

### K-Anonymity Model
1. **What is sent:** Only first 5 chars of SHA-1 hash (e.g., "5BAA6")
2. **What is NOT sent:** Password, full hash, user identity, IP address (axios doesn't forward)
3. **API response:** ~500 hash suffixes matching the prefix
4. **Local matching:** Full hash suffix compared locally — HIBP never knows which hash was queried
5. **Result:** HIBP cannot determine which password was checked — privacy preserved

### Add-Padding Header
- Without padding: response size correlates with match count → timing attack possible
- With padding: all responses have similar size → timing attack mitigated
- Adds fake zero-count entries to response

### Fail-Open Design
- If HIBP API is unavailable, the check returns "not compromised"
- User experience is not degraded by third-party outage
- Trade-off: a compromised password might be accepted during API downtime

---

## Error Paths

| Scenario | HTTP Status | Response | User Impact |
|---|---|---|---|
| No password provided | 400 | `{ message: "Password is required" }` | Validation error |
| HIBP API timeout (>5s) | 200 | `{ isCompromised: false, count: 0 }` | No warning shown (fail-open) |
| HIBP API error | 200 | `{ isCompromised: false, count: 0 }` | No warning shown (fail-open) |
| HIBP API rate limit | 429 | `{ message: error.message }` | Error toast shown |
| Password compromised | 200 | `{ isCompromised: true, count: N }` | Warning banner shown |
| Password safe | 200 | `{ isCompromised: false, count: 0 }` | Green checkmark shown |

---

## Environment Variables

None required — HIBP Pwned Passwords API is free and public.

---

## Cross-References

- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security overview
- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Signup flow where breach check is used
- [09-user-profile-management.md](./09-user-profile-management.md) — Settings security tab
