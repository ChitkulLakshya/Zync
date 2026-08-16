# 56 — Environment Variables Reference

**NEW document** — Complete environment variable catalog, required vs optional, defaults, descriptions

---

## Feature Summary

This document is a comprehensive reference for all environment variables used across the Zync backend and frontend. Variables are organized by category: Firebase, Database, Redis, GitHub, Google, Cloudinary, SMTP, AI Gateway, Security, and Frontend.

---

## Complete Environment Variable Catalog

### Firebase
| Variable | Required | Default | Description |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | — | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | — | Firebase private key (PEM) |
| `FIREBASE_API_KEY` | Yes | — | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | Yes | — | Firebase auth domain |
| `FIREBASE_STORAGE_BUCKET` | No | — | Firebase storage bucket |

### Database (MongoDB)
| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |

### Redis
| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes (prod) | — | Redis connection URL |
| `REDIS_HOST` | No | localhost | Redis host (alternative to URL) |
| `REDIS_PORT` | No | 6379 | Redis port |

### GitHub
| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | — | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | — | OAuth app client secret |
| `GITHUB_APP_ID` | Yes | — | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | — | GitHub App private key (PEM) |
| `GITHUB_APP_REDIRECT_URI` | No | — | OAuth callback URL |
| `WEBHOOK_SECRET` | Yes | — | HMAC secret for webhook verification |

### Google
| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | — | OAuth callback URL |

### LinkedIn
| Variable | Required | Default | Description |
|---|---|---|---|
| `LINKEDIN_CLIENT_ID` | Yes | — | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | Yes | — | LinkedIn OAuth client secret |
| `LINKEDIN_REDIRECT_URI` | Yes | — | OAuth callback URL |

### Cloudinary
| Variable | Required | Default | Description |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary API secret |

### SMTP / Email
| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_USER` | Yes | — | Gmail/SMTP email address |
| `SMTP_PASS` | Yes | — | Gmail app password |
| `SMTP_SERVICE` | No | gmail | SMTP service name |
| `SUPPORT_EMAIL` | Yes | — | Email to receive support requests |

### AI Gateway (Kilo Code)
| Variable | Required | Default | Description |
|---|---|---|---|
| `KILO_CODE_GATEWAY_URL` | Yes | — | Gateway API base URL |
| `KILO_CODE_GATEWAY_API_KEY` | Yes | — | Gateway API key |
| `KILO_CODE_GATEWAY_MODEL` | No | kilo-auto/free | Model identifier |

### Quota & Rate Limiting
| Variable | Required | Default | Description |
|---|---|---|---|
| `WEEKLY_GEN_LIMIT` | No | 4 | Per-user weekly AI generations |
| `DAILY_GEN_CAP` | No | 150 | Global daily generation cap |
| `CHAT_MIN_GAP_MS` | No | 2000 | Min ms between chat AI calls |
| `DELIVERY_CATCHUP_BATCH_SIZE` | No | 200 | Chat delivery catch-up batch |
| `DELIVERY_CATCHUP_MAX_BATCHES` | No | 10 | Max catch-up batches |

### Security
| Variable | Required | Default | Description |
|---|---|---|---|
| `ENCRYPTION_KEY` | Yes (prod) | — | AES-256 encryption passphrase |
| `JWT_SECRET` | No | — | (Not used — Firebase handles JWT) |

### Caching
| Variable | Required | Default | Description |
|---|---|---|---|
| `ARCHITECTURE_CACHE_TTL_MS` | No | 21600000 | Architecture cache TTL (6h) |
| `ARCHITECTURE_CACHE_MAX_ENTRIES` | No | 100 | Max cached analyses |

### Server
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | 5000 | Backend server port |
| `FRONTEND_URL` | Yes | http://localhost:3000 | Frontend URL for CORS |
| `NODE_ENV` | No | development | Environment mode |
| `LOG_LEVEL` | No | info | Logging level |
| `DEBUG_WEBHOOKS` | No | false | Enable webhook debug logging |

### Frontend (Vite)
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | http://localhost:5000 | Backend API URL |
| `VITE_FIREBASE_API_KEY` | Yes | — | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | — | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Yes | — | Firebase app ID |

---

## .env.example Template

```bash
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=

# Database
MONGODB_URI=

# Redis
REDIS_URL=

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
WEBHOOK_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# SMTP
SMTP_USER=
SMTP_PASS=
SUPPORT_EMAIL=

# AI Gateway
KILO_CODE_GATEWAY_URL=
KILO_CODE_GATEWAY_API_KEY=

# Security
ENCRYPTION_KEY=

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## Cross-References

- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security variables
- [48-encryption-security-utilities.md](./48-encryption-security-utilities.md) — ENCRYPTION_KEY usage
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota variables
- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub variables
- [40-google-oauth-integration.md](./40-google-oauth-integration.md) — Google variables
