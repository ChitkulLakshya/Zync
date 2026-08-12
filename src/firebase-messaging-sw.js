importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-sw.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-sw.js');

// Bare identifiers below are substituted at build time by Vite's `define`
// (vite.config.ts). They are intentionally NOT quoted strings — Vite replaces
// identifiers, not string literals.
firebase.initializeApp({
  apiKey: __FIREBASE_API_KEY__,
  authDomain: __FIREBASE_AUTH_DOMAIN__,
  projectId: __FIREBASE_PROJECT_ID__,
  storageBucket: __FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: __FIREBASE_MESSAGING_SENDER_ID__,
  appId: __FIREBASE_APP_ID__,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Zync Notification';
  const body = payload.notification?.body || '';
  const data = payload.data || {};

  const notificationOptions = {
    body,
    icon: '/zync-white.webp',
    badge: '/zync-white.webp',
    data,
    requireInteraction: data.type === 'meeting-invite',
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.type === 'meeting-invite' && data.meetLink
    ? data.meetLink
    : '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
