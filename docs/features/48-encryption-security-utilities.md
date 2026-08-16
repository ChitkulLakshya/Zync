# 48 — Encryption & Security Utilities

**NEW document** — AES-256 token encryption, CryptoJS usage, encryption key management, sensitive data handling

---

## Feature Summary

Zync uses AES-256 encryption to protect sensitive data at rest: GitHub OAuth tokens, Google OAuth tokens, and any other credentials stored in the database. The encryption utility provides `encrypt()` and `decrypt()` functions used across all integration services.

---

## Architecture Diagram

```
┌─────────────────── BACKEND ─────────────────────────────┐
│                                                         │
│  backend/utils/encryption.js                            │
│                                                         │
│  encrypt(plaintext) → ciphertext string                 │
│  decrypt(ciphertext) → plaintext string                 │
│                                                         │
│  Algorithm: AES-256 (CryptoJS)                          │
│  Key: process.env.ENCRYPTION_KEY                        │
│                                                         │
│  Consumers:                                             │
│  ├─ github.js → encrypt/decrypt GitHub access tokens    │
│  ├─ googleRoutes.js → encrypt/decrypt Google tokens     │
│  ├─ userRoutes.js → encrypt/decrypt sensitive fields    │
│  └─ Any route storing third-party credentials           │
│                                                         │
│  Data Flow:                                             │
│  1. User connects GitHub → accessToken received         │
│  2. encrypt(accessToken) → ciphertext                   │
│  3. Store ciphertext in User.githubIntegration.accessToken │
│  4. When needed: decrypt(ciphertext) → plaintext        │
│  5. Use plaintext for GitHub API calls                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/utils/encryption.js`

### encrypt(plaintext)
```js
const CryptoJS = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const encrypt = (text) => {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};
```
- Returns Base64-encoded ciphertext string
- If input is null/empty: returns null (no encryption needed)

### decrypt(ciphertext)
```js
const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
};
```
- Returns plaintext string
- On error (wrong key, corrupted data): returns null
- Never throws — callers check for null

---

## Usage Patterns

### GitHub Token Storage
```js
// On connect:
const encrypted = encrypt(accessToken);
User.findOneAndUpdate({ uid }, { $set: { 'githubIntegration.accessToken': encrypted } });

// When needed:
const user = await User.findOne({ uid });
const token = decrypt(user.githubIntegration.accessToken);
// Use token for GitHub API calls
```

### Google Token Storage
```js
// On connect:
User.findOneAndUpdate({ uid }, {
  $set: {
    'googleIntegration.accessToken': encrypt(accessToken),
    'googleIntegration.refreshToken': encrypt(refreshToken),
  }
});
```

### Security Measures
- **Tokens never returned to frontend:** `.select('-githubIntegration.accessToken')`
- **Encryption at rest:** Even if DB is compromised, tokens are encrypted
- **Key separation:** `ENCRYPTION_KEY` is separate from JWT secret
- **No logging:** Decrypted tokens are never logged

---

## Key Management

### Development
- `ENCRYPTION_KEY` in `.env` file (not committed)
- Can be any string (CryptoJS uses it as passphrase)

### Production
- `ENCRYPTION_KEY` set via environment variable in hosting platform
- Should be a strong random string (32+ characters)
- Key rotation requires re-encrypting all stored tokens

### Key Rotation Process
1. Generate new `ENCRYPTION_KEY`
2. For each user with tokens:
   a. Decrypt with old key
   b. Re-encrypt with new key
   c. Update User document
3. Switch `ENCRYPTION_KEY` to new value
4. Old key can be safely discarded

---

## Error Paths

| Scenario | Handling |
|---|---|
| `ENCRYPTION_KEY` not set | CryptoJS uses empty string (insecure — should fail in prod) |
| Decrypt with wrong key | Returns null (no crash) |
| Decrypt corrupted data | Returns null (no crash) |
| Encrypt null input | Returns null (no-op) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | Yes (prod) | AES-256 encryption passphrase |

---

## Cross-References

- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub token encryption
- [40-google-oauth-integration.md](./40-google-oauth-integration.md) — Google token encryption
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security overview
- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — HMAC verification (different from AES)
