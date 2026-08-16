# 55 — API Client & Interceptors

**NEW document** — Axios instance, request/response interceptors, auth token injection, error normalization

---

## Feature Summary

The frontend uses a centralized Axios instance with interceptors for automatic JWT injection, error normalization, and 401 handling. All API calls go through this client, ensuring consistent auth headers and error handling across the app.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ────────────────────────────┐
│                                                         │
│  src/lib/api.ts (Axios instance)                        │
│                                                         │
│  Request Interceptor:                                   │
│  ├─ Get Firebase JWT from auth.currentUser              │
│  ├─ Set Authorization: Bearer <token>                   │
│  └─ Set Content-Type: application/json                  │
│                                                         │
│  Response Interceptor:                                  │
│  ├─ On 2xx: return response.data                        │
│  ├─ On 401: sign out user, redirect to /login           │
│  ├─ On 429: return rate limit error                     │
│  ├─ On 500: return server error                         │
│  └─ On network error: return connection error           │
│                                                         │
│  Base URL: VITE_API_URL || http://localhost:5000        │
│  Timeout: 30000ms (30s)                                 │
│  withCredentials: true (for cookies)                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation

### File: `src/lib/api.ts`
```ts
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor: inject JWT
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      auth.signOut();
      window.location.href = '/login';
    }
    const normalized = {
      status: error.response?.status || 0,
      message: error.response?.data?.error || error.response?.data?.message || 'Network error',
      data: error.response?.data,
    };
    return Promise.reject(normalized);
  }
);

export default api;
```

---

## Usage Pattern

### In Custom Hooks
```ts
import api from '@/lib/api';

// Query
const data = await api.get('/projects');
// data is already response.data (interceptor strips it)

// Mutation
const result = await api.post('/projects', { name, description });

// Error handling
try {
  await api.delete(`/projects/${id}`);
} catch (err) {
  // err is normalized: { status, message, data }
  showToast(err.message);
}
```

### File Uploads
```ts
const formData = new FormData();
formData.append('file', file);
await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

## Token Refresh

Firebase Auth automatically refreshes expired JWTs:
```ts
// In request interceptor:
const token = await user.getIdToken();
// getIdToken() automatically refreshes if token is expired
```
- No manual refresh logic needed
- Firebase handles token lifecycle internally
- Interceptor always gets a fresh token

---

## Error Normalization

All errors are normalized to a consistent shape:
```ts
{
  status: number,      // HTTP status code (0 for network errors)
  message: string,     // Human-readable error message
  data: any,           // Original response data (if any)
}
```

This allows UI components to always access `err.message` without checking error shape.

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Firebase Auth token management
- [54-frontend-state-management.md](./54-frontend-state-management.md) — TanStack Query uses this client
- [51-middleware-stack-overview.md](./51-middleware-stack-overview.md) — Backend auth middleware
