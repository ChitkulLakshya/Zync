import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import {
  onMessage,
  onDelivered,
  onSeen,
  onCleared,
  ChatMessage,
} from '@/services/chatSocketService';

const fetchChatHistory = async (chatId: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE_URL}/api/chat/history/${chatId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chat history: ${res.statusText}`);
  }

  return res.json();
};

export const useChatHistory = (chatId: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = ['chat', 'history', chatId];

  const query = useQuery<ChatMessage[]>({
    queryKey,
    queryFn: () => fetchChatHistory(chatId!),
    enabled: !!chatId && !!auth.currentUser,
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (!chatId) {
      return;
    }

    const unsubMessage = onMessage((msg) => {
      if (msg.chatId === chatId) {
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
          const messages = old || [];
          if (messages.some((m) => m.id === msg.id)) {
            return messages;
          }
          return [...messages, msg];
        });
      }
    });

    const unsubDelivered = onDelivered((data) => {
      const ids = data.messageIds || (data.messageId ? [data.messageId] : []);
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        return (old || []).map((m) =>
          ids.includes(m.id) ? { ...m, delivered: true, deliveredAt: new Date().toISOString() } : m
        );
      });
    });

    const unsubSeen = onSeen((data) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        return (old || []).map((m) =>
          data.messageIds.includes(m.id)
            ? { ...m, seen: true, seenAt: new Date().toISOString() }
            : m
        );
      });
    });

    const unsubCleared = onCleared((data) => {
      if (data.chatId === chatId) {
        queryClient.setQueryData(queryKey, []);
      }
    });

    return () => {
      unsubMessage();
      unsubDelivered();
      unsubSeen();
      unsubCleared();
    };
  }, [chatId, queryClient, queryKey]);

  return query;
};
