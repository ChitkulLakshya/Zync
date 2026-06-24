# 🔒 Security and Authentication Architecture

Zync is built with an enterprise-grade security posture. Rather than managing raw passwords and local hashing, the architecture delegates core identity management to Firebase, while heavily fortifying the Node.js API layer.

---

## 1. Authentication (Identity Provider)

Zync utilizes **Firebase Authentication** as its primary Identity Provider (IdP). There is no local `bcrypt` password hashing or manual salt management within the Node.js codebase.

### The Authentication Flow
1. **Client-Side Auth**: The React frontend authenticates the user via Firebase (Email/Password or OAuth providers like Google/GitHub).
2. **Token Generation**: Firebase returns a cryptographically signed JWT (JSON Web Token).
3. **API Authorization**: The frontend attaches this JWT as a `Bearer` token in the `Authorization` header of all requests to the backend.
4. **Middleware Verification**: The `backend/middleware/authMiddleware.js` utilizes the **Firebase Admin SDK** (`admin.auth().verifyIdToken()`) to securely decode and validate the token on every protected route. If valid, the user's `uid` is injected into the Express `req.user` object for downstream controllers.

---

## 2. API Security & HTTP Headers

The `index.js` server implements several layers of active defense using Express middleware:

### Helmet
[Helmet](https://helmetjs.github.io/) is configured to set secure HTTP headers to mitigate cross-site scripting (XSS) and clickjacking.
- **Content Security Policy (CSP)**: Strictly controls where scripts, images, and frames can be loaded from, allowing only explicitly trusted domains (e.g., `apis.google.com`).
- **Referrer Policy**: Set to `strict-origin-when-cross-origin` to protect origin metadata.

### Strict CORS Policy
Cross-Origin Resource Sharing (CORS) is explicitly locked down. The server checks the `origin` against an allowed array (`http://localhost:5173`, `.zync.app`, etc.) and enforces `credentials: true` to allow secure cookie/session transmission only from trusted frontend domains.

---

## 3. Rate Limiting & Load Shedding (DDoS Protection)

To protect the server from brute-force attacks, scraping, and Denial of Service (DoS):

### Express Rate Limit
The `express-rate-limit` middleware is applied globally to the `/api/` router. 
- In **Development**, limits are relaxed.
- In **Production**, it strictly throttles IP addresses to **100 requests per 15 minutes**. It utilizes Express's `trust proxy` setting to ensure rate limits correctly identify original client IPs passing through reverse proxies (like Render/Vercel).

### Load Shedding Middleware
Zync implements advanced `loadSheddingMiddleware`. Before processing complex AI generation or database queries, the server checks its own Event Loop lag and CPU utilization. If the server is experiencing extreme load, it proactively rejects incoming non-critical requests with a `503 Service Unavailable` to prevent cascading node failures.

---

## 4. Webhook Security

Zync integrates deeply with GitHub via bidirectional webhooks. To ensure these incoming webhooks are authentic and haven't been tampered with in transit:
- The backend utilizes a custom `express.json` parser that preserves the raw cryptographic buffer (`req.rawBody`) *exclusively* for the `/api/webhooks` and `/api/github-app` routes.
- This allows the backend to perform strict HMAC SHA-256 signature verification against the payload using the GitHub App secret, guaranteeing the payload originated from GitHub.
