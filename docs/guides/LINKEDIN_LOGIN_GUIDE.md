# 💼 LinkedIn Authentication Integration Guide

## Overview

Zync supports enterprise single sign-on (SSO) via LinkedIn. Rather than relying on third-party frontend wrappers or unsupported IDP configurations, Zync implements a secure **OAuth 2.0 Authorization Code Flow** managed directly by the Express backend, bridging authentications into **Firebase Custom Tokens**.

---

## ⚡ Architecture & Authentication Flow

### 1. Frontend Trigger (`LinkedinSignInButton.tsx`)
When a user clicks "Sign in with LinkedIn", the client initiates a full-page redirect directly to the backend auth endpoint:
```javascript
window.location.href = `${API_BASE_URL}/api/linkedin/auth`;
```

### 2. Backend Handshake (`backend/routes/linkedinRoutes.js`)
1. **Authorization Request (`GET /api/linkedin/auth`)**: Redirects the user to LinkedIn's OAuth v2 authorization endpoint requesting `openid profile email` scopes.
2. **Code Exchange (`GET /api/linkedin/callback`)**:
   - Intercepts the returned authorization `code`.
   - Exchanges the code via `axios.post('https://www.linkedin.com/oauth/v2/accessToken')` using `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.
3. **Profile Ingestion**: Retrieves profile metadata from `https://api.linkedin.com/v2/userinfo`.
4. **Firebase Identity Bridging**:
   - Checks if a user exists in Firebase Admin via `admin.auth().getUserByEmail(email)`.
   - If not found, provisions a new Firebase account (`admin.auth().createUser`).
   - Mints a cryptographically secure Firebase Custom Token via `admin.auth().createCustomToken(uid)`.
5. **Client Handoff**: Redirects back to the frontend login route with the token attached (`/login?customToken=<token>`), allowing the client SDK to immediately authenticate.

---

## 🔐 Environment Configuration

Ensure your `backend/.env` contains the required LinkedIn developer credentials:
```env
LINKEDIN_CLIENT_ID="your_client_id"
LINKEDIN_CLIENT_SECRET="your_client_secret"
FRONTEND_URL="https://your-frontend-domain.com"
```

---

## 🚫 Purged Speculative Documentation

Older versions of this guide incorrectly referenced NextAuth.js v5 and native Firebase OIDC provider IDs (`oidc.linkedin`). Those references were hallucinated consumer tutorials and have been purged to reflect true production codebase execution.
