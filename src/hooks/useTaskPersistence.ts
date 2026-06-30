/**
 * @fileoverview useTaskPersistence.ts
 * @module useTaskPersistence
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface TaskStats {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  efficiency: number;
  dailyActiveAvg: number;
}

export const useTaskPersistence = (userId: string | undefined) => {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSavedFingerprintRef = useRef<string>('');
  const lastSavedAtRef = useRef<number>(0);
  const writeCooldownUntilRef = useRef<number>(0);
  const cooldownWarningShownRef = useRef<boolean>(false);
  const SAVE_DEBOUNCE_MS = 30_000;
  const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
  const devWritesEnabled = import.meta.env.VITE_ENABLE_TASK_FIRESTORE_SYNC === 'true';
  const allowFirestoreWrites = !import.meta.env.DEV || devWritesEnabled;
  const quotaCooldownKey = userId ? `zync-task-sync-cooldown:${userId}` : '';

  const normalizeStats = (input: TaskStats): TaskStats => ({
    total: Number(input?.total || 0),
    inProgress: Number(input?.inProgress || 0),
    completed: Number(input?.completed || 0),
    overdue: Number(input?.overdue || 0),
    efficiency: Number(input?.efficiency || 0),
    dailyActiveAvg: Number(input?.dailyActiveAvg || 0),
  });

  const buildFingerprint = (input: TaskStats): string => {
    const normalized = normalizeStats(input);
    return JSON.stringify(normalized);
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (quotaCooldownKey) {
      const persistedCooldown = Number(localStorage.getItem(quotaCooldownKey) || '0');
      if (persistedCooldown > Date.now()) {
        writeCooldownUntilRef.current = persistedCooldown;
      }
    }

    const docRef = doc(db, 'tasks', userId);


    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setStats(docSnap.data() as TaskStats);
        } else {
          setStats({
            total: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0,
            efficiency: 0,
            dailyActiveAvg: 0,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching task stats from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const saveStats = useCallback(
    async (newStats: TaskStats) => {
      if (!userId || !allowFirestoreWrites) {
        return;
      }

      const now = Date.now();
      if (writeCooldownUntilRef.current > now) {
        return;
      }

      const normalized = normalizeStats(newStats);
      const fingerprint = buildFingerprint(normalized);


      if (fingerprint === lastSavedFingerprintRef.current) {
        return;
      }


      if (now - lastSavedAtRef.current < SAVE_DEBOUNCE_MS) {
        return;
      }

      try {
        await setDoc(doc(db, 'tasks', userId), normalized, { merge: true });
        lastSavedFingerprintRef.current = fingerprint;
        lastSavedAtRef.current = now;
        cooldownWarningShownRef.current = false;
      } catch (error) {
        const code = (error as any)?.code || '';
        if (code === 'resource-exhausted') {
          writeCooldownUntilRef.current = now + QUOTA_COOLDOWN_MS;
          if (quotaCooldownKey) {
            localStorage.setItem(quotaCooldownKey, String(writeCooldownUntilRef.current));
          }
          if (!cooldownWarningShownRef.current) {
            console.warn('Firestore quota reached; pausing task stat writes temporarily.');
            cooldownWarningShownRef.current = true;
          }
          return;
        }
        console.error('Error saving task stats to Firestore:', error);
      }
    },
    [userId, allowFirestoreWrites, quotaCooldownKey]
  );

  const markTaskOpened = async (taskId: string) => {
    if (!userId || !allowFirestoreWrites) {
      return;
    }


    try {
      const docRef = doc(db, 'tasks', userId);
      const snap = await getDoc(docRef);
      const currentStats = snap.exists()
        ? (snap.data() as TaskStats)
        : { total: 0, inProgress: 0, completed: 0, overdue: 0 };



      await setDoc(
        docRef,
        { ...currentStats, overdue: (currentStats.overdue || 0) + 1 },
        { merge: true }
      );
    } catch (error) {
      console.error('Error marking task as opened:', error);
    }
  };

  return { stats, loading, saveStats, markTaskOpened };
};
