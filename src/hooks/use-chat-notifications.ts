import { useEffect, useRef } from 'react';
import { onMessage, ChatMessage } from '@/services/chatSocketService';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useChatNotifications = () => {
  const navigate = useNavigate();

  const startTimeRef = useRef(Date.now());
  const notifiedIds = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        return;
      }

      const unsubscribeMessage = onMessage((msg: ChatMessage) => {
        // Only notify for messages targeted at the current user
        if (msg.receiverId !== user.uid) {
          return;
        }

        const messageTime = new Date(msg.createdAt).getTime();
        if (messageTime <= startTimeRef.current) {
          return;
        }

        if (notifiedIds.current.has(msg.id)) {
          return;
        }
        notifiedIds.current.add(msg.id);

        const activeSection = localStorage.getItem('ZYNC-active-section');

        if (activeSection !== 'Chat') {
          toast(msg.senderName || 'New Message', {
            description: msg.text
              ? msg.text.length > 50
                ? msg.text.substring(0, 50) + '...'
                : msg.text
              : 'Sent a file/image',
            duration: 3000,
            action: {
              label: 'Open Chat',
              onClick: () => {
                localStorage.setItem('ZYNC-active-section', 'Chat');

                const event = new CustomEvent('ZYNC-open-chat', {
                  detail: {
                    uid: msg.senderId,
                    displayName: msg.senderName,
                    photoURL: msg.senderPhotoURL,
                  },
                });
                window.dispatchEvent(event);

                navigate('/dashboard');
              },
            },
          });
        }
      });

      return () => {
        unsubscribeMessage();
      };
    });

    return () => unsubscribeAuth();
  }, [navigate]);
};
