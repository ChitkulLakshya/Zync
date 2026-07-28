import { useEffect, useRef } from 'react';
import { auth, messaging, getToken, onMessage } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export const usePushNotifications = () => {
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messaging || !VAPID_KEY) { return; }

    const messagingInstance = messaging;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        registeredTokenRef.current = null;
        return;
      }

      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        return;
      }

      try {
        const token = await getToken(messagingInstance, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        if (token && token !== registeredTokenRef.current) {
          registeredTokenRef.current = token;
          const firebaseToken = await user.getIdToken();
          await fetch(`${API_BASE_URL}/api/users/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${firebaseToken}`,
            },
            body: JSON.stringify({ token, platform: 'web' }),
          });
        }
      } catch (err) {
        console.warn('[PushNotifications] Failed to register FCM token:', err);
      }
    });

    const unsubscribeOnMessage = onMessage(messagingInstance, (payload) => {
      const title = payload.notification?.title || 'Zync Notification';
      const body = payload.notification?.body || '';
      const data = payload.data || {};

      if (data.type === 'task-assigned') {
        toast(title, {
          description: body,
          duration: 5000,
          action: {
            label: 'View Task',
            onClick: () => {
              localStorage.setItem('ZYNC-active-section', 'Tasks');
              window.dispatchEvent(new CustomEvent('ZYNC-navigate', { detail: { section: 'Tasks' } }));
            },
          },
        });
      } else if (data.type === 'meeting-invite') {
        toast(title, {
          description: body,
          duration: 5000,
          action: {
            label: 'Join Meeting',
            onClick: () => {
              if (data.meetLink) {
                window.open(data.meetLink, '_blank');
              }
            },
          },
        });
      } else {
        toast(title, { description: body, duration: 4000 });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOnMessage();
    };
  }, []);
};
