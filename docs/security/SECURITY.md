# 🛡️ Enterprise Security Policy & Procedures

## Supported Production Versions

Zync follows continuous deployment practices. Security patches and hardening updates are applied exclusively to the latest active production deployment on the `main` branch.

| Branch / Release | Status | Security Support |
| :--- | :--- | :--- |
| `main` (Production) | ✅ Active | Fully supported with automated vulnerability scanning |
| Legacy Branches | ❌ Unsupported | Deprecated; no ongoing security patches |

---

## 🚨 Reporting Vulnerabilities

**⚠️ Do NOT report security vulnerabilities via public GitHub issues, pull requests, or discussion boards.**

We take the security of our enterprise workspace platform seriously. If you discover a potential security flaw, please report it responsibly directly to our core security engineering team.

### Submission Guidelines

1. **Email Contact**: Send encrypted or detailed reports to [consolemaster@gmail.com](mailto:consolemaster@gmail.com)
2. **Subject Line**: Use prefix `[VULNERABILITY] <Brief Description>`
3. **Required Information**:
   - Detailed step-by-step reproduction guide.
   - Proof-of-concept (PoC) scripts or HTTP request captures.
   - Assessment of potential blast radius and data impact.
   - Contact details for coordinated disclosure.

### Response & Patch SLAs

| Phase | Target SLA |
| :--- | :--- |
| **Initial Acknowledgment** | Within 12 hours |
| **Triage & Reproduction** | Within 48 hours |
| **Patch Deployment (Critical/High)** | Within 7 days |
| **Public Advisory Publication** | Coordinated post-patch confirmation |

---

## 🔒 Codebase Security Architecture

Zync implements multi-layered security controls across its Web Application and API infrastructure:

### 1. API & Network Security (`backend/index.js`)
- **HTTP Header Hardening**: Secured via `helmet` enforcing strict Content Security Policies (CSP), frameguarding (`DENY`), and cross-site scripting filters.
- **DDoS & Brute Force Defense**: Global IP rate limiting via `express-rate-limit` (100 requests per 15-minute window) coupled with dynamic server **Event Loop Load Shedding** (`loadSheddingMiddleware.js`) to automatically drop traffic during CPU spikes.
- **CORS Enforcement**: Explicit origin whitelisting matching verified frontend domains (`credentials: true`).

### 2. Authentication & Identity (`backend/middleware/authMiddleware.js`)
- **Stateless Verification**: API endpoints authenticate incoming requests using **Firebase Authentication ID Tokens** verified cryptographically via `firebase-admin`.
- **Encrypted Integrations**: Third-party OAuth tokens (GitHub, LinkedIn, Google) are encrypted at rest using high-entropy AES-256 keys before ingestion into MongoDB.

### 3. Cryptographic Webhook Validation (`backend/middleware/verifyGithub.js`)
- **HMAC Signatures**: Incoming GitHub push events (`POST /api/github-app/webhook`) are intercepted prior to standard JSON parsing to compute SHA-256 HMAC digests (`x-hub-signature-256`) against raw request body buffers.

### 4. Client-Side Data Sandboxing
- **CRDT Isolation**: Collaborative rich-text documents (`Yjs`) sync over isolated Socket.IO namespaces (`/notes`), persisting binary blobs locally via `IndexedDB` without exposing raw database queries to client bundles.

---

## ✅ Pre-Commit Contributor Checklist

All submitted pull requests must satisfy our automated CI security gates:
- [ ] No hardcoded API keys, JWT secrets, or `.env` credentials.
- [ ] No usage of dangerous JavaScript primitives (`eval()`, `Function()`).
- [ ] All database mutations utilize parameterized queries or sanitized ORM constructs (`Prisma` / `Mongoose`).
- [ ] Dependencies audited via `npm audit` with zero unresolved high/critical CVEs.
