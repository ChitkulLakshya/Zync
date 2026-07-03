/**
 * @fileoverview useChatHistory.ts
 * @module useChatHistory
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
