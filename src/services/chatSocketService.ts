/**
 * @fileoverview chatSocketService.ts
 * @module chatSocketService
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
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
  if (socket?.connected) { return socket; }

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



export function onMessage(cb: MessageCallback) {
  messageListeners.add(cb);
  return () => { messageListeners.delete(cb); };
}

export function onDelivered(cb: DeliveredCallback) {
  deliveredListeners.add(cb);
  return () => { deliveredListeners.delete(cb); };
}

export function onSeen(cb: SeenCallback) {
  seenListeners.add(cb);
  return () => { seenListeners.delete(cb); };
}

export function onCleared(cb: ClearedCallback) {
  clearedListeners.add(cb);
  return () => { clearedListeners.delete(cb); };
}

export function onTyping(cb: TypingCallback) {
  typingListeners.add(cb);
  return () => { typingListeners.delete(cb); };
}
