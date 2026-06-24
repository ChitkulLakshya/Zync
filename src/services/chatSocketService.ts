import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string | null;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  receiverId: string;
  type: 'text' | 'image' | 'file' | 'project-invite' | 'request';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  projectId?: string | null;
  projectName?: string | null;
  projectOwnerId?: string | null;
  seen: boolean;
  seenAt?: string | null;
  delivered: boolean;
  deliveredAt?: string | null;
  createdAt: string;
}

type MessageCallback = (msg: ChatMessage) => void;
type DeliveredCallback = (data: { messageId?: string; messageIds?: string[] }) => void;
type SeenCallback = (data: { messageIds: string[] }) => void;
type ClearedCallback = (data: { chatId: string }) => void;
type TypingCallback = (data: { chatId: string; userId: string; isTyping: boolean }) => void;

let socket: Socket | null = null;
const messageListeners = new Set<MessageCallback>();
const deliveredListeners = new Set<DeliveredCallback>();
const seenListeners = new Set<SeenCallback>();
const clearedListeners = new Set<ClearedCallback>();
const typingListeners = new Set<TypingCallback>();

/**
 * Connect to the /chat namespace. Safe to call multiple times —
 * only one connection per userId will be maintained.
 */
export function connectChat(userId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = SOCKET_BASE_URL;

  socket = io(`${socketUrl}/chat`, {
    query: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('new-message', (msg: ChatMessage) => {
    messageListeners.forEach((cb) => cb(msg));
  });

  socket.on('message-delivered', (data: { messageId?: string; messageIds?: string[] }) => {
    deliveredListeners.forEach((cb) => cb(data));
  });

  socket.on('message-seen', (data: { messageIds: string[] }) => {
    seenListeners.forEach((cb) => cb(data));
  });

  socket.on('messages-cleared', (data: { chatId: string }) => {
    clearedListeners.forEach((cb) => cb(data));
  });

  socket.on('user-typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
    typingListeners.forEach((cb) => cb(data));
  });

  return socket;
}

export function disconnectChat() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// ── Emit helpers ─────────────────────────────────────────────────────

export function sendMessage(payload: {
  chatId: string;
  text: string;
  receiverId: string;
  senderName: string;
  senderPhotoURL?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  projectId?: string;
  projectName?: string;
  projectOwnerId?: string;
}) {
  socket?.emit('send-message', payload);
}

export function markSeen(messageIds: string[], senderId: string) {
  socket?.emit('mark-seen', { messageIds, senderId });
}

export function emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
  socket?.emit('typing', { chatId, receiverId, isTyping });
}

export function clearChat(chatId: string, otherUserId: string) {
  socket?.emit('clear-chat', { chatId, otherUserId });
}

// ── Subscribe / unsubscribe ──────────────────────────────────────────

export function onMessage(cb: MessageCallback) {
  messageListeners.add(cb);
  return () => {
    messageListeners.delete(cb);
  };
}

export function onDelivered(cb: DeliveredCallback) {
  deliveredListeners.add(cb);
  return () => {
    deliveredListeners.delete(cb);
  };
}

export function onSeen(cb: SeenCallback) {
  seenListeners.add(cb);
  return () => {
    seenListeners.delete(cb);
  };
}

export function onCleared(cb: ClearedCallback) {
  clearedListeners.add(cb);
  return () => {
    clearedListeners.delete(cb);
  };
}

export function onTyping(cb: TypingCallback) {
  typingListeners.add(cb);
  return () => {
    typingListeners.delete(cb);
  };
}
