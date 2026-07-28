# Feature Architecture: Frontend Firebase Cloud Messaging (FCM) Setup

## Overview
This document details the frontend Firebase Cloud Messaging implementation for Zync, including messaging initialization, the push notification hook, service worker for background notifications, and Vite build configuration for service worker environment variable injection.

## 1. Firebase Messaging Initialization

**File**: `src/lib/firebase.ts`

### Changes
- Imported `getMessaging`, `getToken`, and `onMessage` from `firebase/messaging`.
- Initialized the `messaging` instance with a safe null fallback:
```typescript
import { getMessaging, type Messaging } from 'firebase/messaging';

let messaging: Messaging | null = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase Messaging not available:', error);
}
export { messaging, getToken, onMessage };
```

### Why Null Fallback?
- Firebase Messaging requires browser APIs (`navigator`, `serviceWorker`) that may not exist in all environments.
- The null check in the hook prevents runtime crashes when messaging is unavailable.
- This allows the app to function normally on browsers without FCM support.

## 2. Push Notifications Hook

**File**: `src/hooks/use-push-notifications.ts`

### Purpose
Registers the FCM device token with the backend and listens for incoming push messages while the app is in the foreground.

### Hook Flow
```
usePushNotifications()
  │
  ├── onAuthStateChanged(user)
  │     ├── No user → clear token, return
  │     ├── Notification permission !== 'granted' → return
  │     └── getToken(messaging, { vapidKey, swRegistration })
  │           ├── New token? → POST /api/users/fcm-token
  │           └── Store in ref to prevent duplicate registrations
  │
  └── onMessage(messaging, callback)
        └── Show toast notification with payload data
```

### Key Implementation Details

- **VAPID Key**: Read from `import.meta.env.VITE_FIREBASE_VAPID_KEY`.
- **Token Deduplication**: Uses `useRef` to track the currently registered token and only sends to backend if the token changed.
- **Permission Check**: Only attempts token registration if `Notification.permission === 'granted'`.
- **Service Worker Registration**: Uses `navigator.serviceWorker.ready` to ensure the SW is active before requesting a token.
- **Foreground Messages**: `onMessage` callback displays a `sonner` toast with the notification title and body.
- **Cleanup**: The `onAuthStateChanged` and `onMessage` listeners are properly unsubscribed on unmount.

### Token Registration Request
```typescript
await fetch(`${API_BASE_URL}/api/users/fcm-token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${firebaseToken}`,
  },
  body: JSON.stringify({ token, platform: navigator.userAgent }),
});
```

## 3. Firebase Messaging Service Worker

**File**: `public/firebase-messaging-sw.js`

### Purpose
Handles push notifications when the app is in the background or closed. The service worker receives the push event, displays a notification, and handles click actions.

### Background Message Handler
```javascript
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || payload.data;
  self.registration.showNotification(title || 'Zync', {
    body: body || '',
    icon: '/zync-white.webp',
    badge: '/zync-white.webp',
    data: payload.data || {},
  });
});
```

### Notification Click Handler
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  const url = data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
```

- Clicking a notification opens/focuses the app and navigates to the relevant section.
- The `data.url` field can be set by the backend to deep-link to a specific task or meeting.

## 4. Vite Configuration for Service Worker

**File**: `vite.config.ts`

### Problem
The service worker (`firebase-messaging-sw.js`) is a standalone file in `public/` and is not processed by Vite's bundler. Environment variables (`import.meta.env.VITE_*`) are not available in `public/` files.

### Solution
Use Vite's `define` option to replace placeholder strings in the service worker at build time:
```typescript
define: {
  '__VITE_FIREBASE_API_KEY__': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
  '__VITE_FIREBASE_AUTH_DOMAIN__': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
  '__VITE_FIREBASE_PROJECT_ID__': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
  '__VITE_FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  '__VITE_FIREBASE_APP_ID__': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
}
```

In the service worker, these placeholders are used in the Firebase config object:
```javascript
const firebaseConfig = {
  apiKey: '__VITE_FIREBASE_API_KEY__',
  authDomain: '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId: '__VITE_FIREBASE_PROJECT_ID__',
  messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__VITE_FIREBASE_APP_ID__',
};
```

At build time, Vite replaces the `__VITE_*__` strings with the actual environment variable values.

## 5. App Integration

**File**: `src/App.tsx`

- `usePushNotifications()` is called inside the `AppContent` component.
- The hook activates on app load and reacts to authentication state changes.
- No props or configuration needed — the hook is self-contained.

## Environment Variables Required

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_FIREBASE_VAPID_KEY` | Frontend | Web push VAPID key for FCM |
| `VITE_FIREBASE_API_KEY` | Frontend + SW | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Frontend + SW | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Frontend + SW | Firebase project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Frontend + SW | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Frontend + SW | Firebase app ID |

## Conclusion
The frontend FCM setup provides real-time push notification delivery to installed PWA users. The architecture cleanly separates token management (hook), background delivery (service worker), and build-time configuration (Vite define), ensuring maintainability and environment isolation.
