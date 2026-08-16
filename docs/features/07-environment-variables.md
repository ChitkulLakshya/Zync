# 07 — Environment Variables

**NEW document** — Complete env var reference with types, defaults, and descriptions

---

## Feature Summary

Every environment variable used across the Zync codebase, organized by subsystem. Includes which files reference each variable, whether it's required, and its default behavior.

---

## Environment Variable Index

### Firebase (Auth + FCM + Firestore)

| Variable | Required | Used By | Description |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | `src/lib/firebase.ts` | Firebase client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `src/lib/firebase.ts` | Firebase auth domain (e.g., `zync-meet.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | `src/lib/firebase.ts` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Yes | `src/lib/firebase.ts` | Firebase app ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | `src/lib/firebase.ts` | FCM sender ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | `src/lib/firebase.ts` | Firebase storage bucket URL |
| `FIREBASE_CLIENT_EMAIL` | Yes | `backend/services/firebaseAdmin.js` | Firebase Admin service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | `backend/services/firebaseAdmin.js` | Firebase Admin private key (replace `\n` with newlines) |
| `FIREBASE_PROJECT_ID` | Yes | `backend/services/firebaseAdmin.js` | Firebase Admin project ID (server-side) |
| `FIREBASE_STORAGE_BUCKET` | No | `backend/services/firebaseAdmin.js` | Storage bucket for server-side file ops |
| `VITE_FIREBASE_VAPID_KEY` | Yes | `src/hooks/use-push-notifications.ts` | VAPID public key for web push notifications |

### Database

| Variable | Required | Used By | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | `backend/index.js`, Prisma schema | MongoDB Atlas connection string |

### Redis

| Variable | Required | Used By | Description |
|---|---|---|---|
| `REDIS_URL` | No | `backend/utils/redisClient.js` | Redis connection URL. Fails open if missing. |

### Server Configuration

| Variable | Required | Used By | Default | Description |
|---|---|---|---|---|
| `PORT` | No | `backend/index.js` | 5000 | Server listen port |
| `NODE_ENV` | No | `backend/index.js` | — | "production" for prod rate limits |
| `FRONTEND_URL` | Yes | `backend/index.js` (CORS) | — | Frontend URL for CORS allowlist |
| `ALLOWED_ORIGINS` | No | `backend/index.js` (CORS) | — | Comma-separated extra CORS origins |
| `INTERNAL_API_SECRET` | Yes | `backend/index.js` | — | Secret for `/internal/*` routes |

### Security & Encryption

| Variable | Required | Used By | Description |
|---|---|---|---|
| `MASTER_ENCRYPTION_KEY` | Yes | `backend/utils/encryption.js` | AES-256 encryption key for token storage |
| `GITHUB_WEBHOOK_SECRET` | Yes | `backend/middleware/verifyGithub.js` | HMAC SHA-256 secret for GitHub webhooks |
| `LOAD_SHED_HEAP_LIMIT_MB` | No | `backend/middleware/loadShedding.js` | Default 400. Heap threshold for load shedding. |
| `LOAD_SHED_RETRY_AFTER_SECONDS` | No | `backend/middleware/loadShedding.js` | Default 15. Retry-After header value. |
| `LOAD_SHED_HEAVY_PATHS` | No | `backend/middleware/loadShedding.js` | Custom comma-separated heavy path prefixes |

### GitHub Integration

| Variable | Required | Used By | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | `backend/routes/github.js` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Yes | `backend/routes/github.js` | GitHub OAuth client secret |
| `GITHUB_APP_ID` | Yes | `backend/utils/githubAppAuth.js` | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | `backend/utils/githubAppAuth.js` | GitHub App private key (PEM format) |
| `GITHUB_INSTALLATION_ID` | No | `backend/utils/githubInstallation.js` | Default installation ID |

### Google Integration

| Variable | Required | Used By | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | `backend/routes/googleRoutes.js` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | `backend/routes/googleRoutes.js` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | `backend/routes/googleRoutes.js` | Google OAuth redirect URI |
| `GOOGLE_PROJECT_NUMBER` | No | `backend/services/googleMeet.js` | Google Cloud project number for Meet API |

### LinkedIn Integration

| Variable | Required | Used By | Description |
|---|---|---|---|
| `LINKEDIN_CLIENT_ID` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn OAuth client secret |
| `LINKEDIN_REDIRECT_URI` | Yes | `backend/routes/linkedinRoutes.js` | LinkedIn OAuth redirect URI |

### Cloudinary (Media)

| Variable | Required | Used By | Description |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Yes | `backend/services/cloudinaryService.js` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | `backend/services/cloudinaryService.js` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | `backend/services/cloudinaryService.js` | Cloudinary API secret |

### AI Services

| Variable | Required | Used By | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | `backend/utils/taskGenerator.js`, `backend/utils/commitAnalysisService.js` | Groq LPU API key |
| `KILO_CODE_GATEWAY_URL` | Yes | `backend/services/kiloCodeGateway.js` | Kilo Code Gateway base URL |
| `KILO_CODE_GATEWAY_API_KEY` | Yes | `backend/services/kiloCodeGateway.js` | Kilo Code Gateway API key |

### Email (Nodemailer)

| Variable | Required | Used By | Description |
|---|---|---|---|
| `SMTP_HOST` | Yes | `backend/utils/emailService.js` | SMTP server host |
| `SMTP_PORT` | Yes | `backend/utils/emailService.js` | SMTP server port |
| `SMTP_USER` | Yes | `backend/utils/emailService.js` | SMTP username |
| `SMTP_PASS` | Yes | `backend/utils/emailService.js` | SMTP password |
| `SMTP_FROM` | No | `backend/utils/emailService.js` | From email address |

### Frontend API

| Variable | Required | Used By | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | Frontend API calls | Backend API base URL (e.g., `http://localhost:5000` or `https://zync-backend.onrender.com`) |

### Google Sheets Logger

| Variable | Required | Used By | Description |
|---|---|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | No | `backend/services/sheetLogger.js` | Google Sheets ID for audit logging |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | `backend/services/sheetLogger.js` | Service account email for Sheets API |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | No | `backend/services/sheetLogger.js` | Service account private key |

### Usage & Quota

| Variable | Required | Used By | Description |
|---|---|---|---|
| `USAGE_MONTHLY_LIMIT` | No | `backend/services/usageService.js` | Monthly usage limit per user |

---

## .env.example Files

### Root `.env.example`
**File:** `.env.example`
Contains frontend env vars (VITE_* prefix)

### Backend `.env.example`
**File:** `backend/.env.example`
Contains all backend env vars with descriptions

### Backend `.env.kilo.example`
**File:** `backend/.env.kilo.example`
Contains Kilo Code Gateway specific env vars

---

## Env Var Loading

### Frontend (Vite)
- Vite loads `.env` files automatically
- `VITE_` prefix required for client-side exposure
- Files loaded in order: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`

### Backend (Node.js)
- `dotenv` loads `.env` at startup: `require('dotenv').config()` (`backend/index.js:77`)
- `backend/utils/safeEnv.js` provides safe integer parsing: `getSafeEnvInt(name, min, max, default)`

---

## Cross-References

- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security env vars in context
- [06-middleware-stack.md](./06-middleware-stack.md) — Middleware env vars in context
- [04-service-inventory.md](./04-service-inventory.md) — Which services need which env vars
