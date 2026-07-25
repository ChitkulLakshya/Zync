/**
 * @fileoverview useTeamPersistence.ts
 * @module useTeamPersistence
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
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  collection,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

export interface TeamMetadata {
  id: string;
  name: string;
  leaderId: string;
  ownerId: string;
  members: string[];
  inviteCode: string;
  logoId?: string;
  updatedAt?: string;
  createdAt?: string;
}

export const useTeamPersistence = (userId: string | undefined) => {
  const [myTeams, setMyTeams] = useState<TeamMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeUid = (value: any): string => {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return String(value.uid || value.id || value._id || '');
    }
    return String(value);
  };

  const normalizeTeamPayload = (team: any, fallbackUserId?: string): TeamMetadata | null => {
    const id = String(team?.id || team?._id || team?.teamId || '');
    if (!id) {
      return null;
    }

    const ownerId = normalizeUid(
      team?.ownerId ||
        team?.ownerUid ||
        team?.leaderId ||
        team?.createdBy ||
        team?.createdByUid ||
        fallbackUserId
    );

    const rawMembers = Array.isArray(team?.members) ? team.members : [];
    const members = Array.from(
      new Set(
        [...rawMembers.map((m: any) => normalizeUid(m)).filter(Boolean), ownerId].filter(Boolean)
      )
    );

    return {
      id,
      name: team?.name || 'Team',
      ownerId,
      leaderId: ownerId,
      members,
      inviteCode: String(team?.inviteCode || ''),
      logoId: team?.logoId || null,
      createdAt: team?.createdAt,
      updatedAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }


    const q = query(collection(db, 'teams'), where('members', 'array-contains', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const teams: TeamMetadata[] = [];
        snapshot.forEach((docSnapshot) => {
          const normalized = normalizeTeamPayload({ id: docSnapshot.id, ...docSnapshot.data() });
          if (normalized) {
            teams.push(normalized);
          }
        });
        setMyTeams(teams);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching teams from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const upsertTeamSync = useCallback(async (teamPayload: any, fallbackUserId?: string) => {
    const team = normalizeTeamPayload(teamPayload, fallbackUserId);
    if (!team) {
      return;
    }

    try {
      await setDoc(
        doc(db, 'teams', team.id),
        {
          name: team.name,
          ownerId: team.ownerId,
          leaderId: team.ownerId,
          members: team.members,
          inviteCode: team.inviteCode,
          logoId: team.logoId || null,
          createdAt: team.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (team.ownerId) {
        await setDoc(
          doc(db, 'users', team.ownerId),
          {
            uid: team.ownerId,
            ownedTeamIds: arrayUnion(team.id),
            teamMemberships: arrayUnion(team.id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      for (const memberId of team.members) {
        await setDoc(
          doc(db, 'users', memberId),
          {
            uid: memberId,
            teamMemberships: arrayUnion(team.id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error syncing team to Firestore:', error);
    }
  }, []);

  const createTeamSync = useCallback(
    async (teamId: string, name: string, leaderId: string, inviteCode: string, logoId?: string) => {
      await upsertTeamSync(
        {
          id: teamId,
          name,
          ownerId: leaderId,
          leaderId,
          members: [leaderId],
          inviteCode,
          logoId: logoId || null,
        },
        leaderId
      );
    },
    [upsertTeamSync]
  );

  const joinTeamSync = useCallback(
    async (teamOrInviteCode: any, userId: string) => {
      try {
        if (typeof teamOrInviteCode === 'object' && teamOrInviteCode) {
          const normalized = normalizeTeamPayload(teamOrInviteCode, userId);
          if (normalized) {
            await upsertTeamSync(normalized, userId);
            await updateDoc(doc(db, 'teams', normalized.id), {
              members: arrayUnion(userId),
              updatedAt: new Date().toISOString(),
            });
            await setDoc(
              doc(db, 'users', userId),
              {
                uid: userId,
                teamMemberships: arrayUnion(normalized.id),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            return;
          }
        }

        const inviteCode = String(teamOrInviteCode || '');
        if (!inviteCode) {
          return;
        }


        const q = query(collection(db, 'teams'), where('inviteCode', '==', inviteCode));
        const snapshot = await getDocs(q);
        for (const teamDoc of snapshot.docs) {
          await updateDoc(doc(db, 'teams', teamDoc.id), {
            members: arrayUnion(userId),
            updatedAt: new Date().toISOString(),
          });
          await setDoc(
            doc(db, 'users', userId),
            {
              uid: userId,
              teamMemberships: arrayUnion(teamDoc.id),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (error) {
        console.error('Error joining team in Firestore:', error);
      }
    },
    [upsertTeamSync]
  );

  const syncTeamsFromApi = useCallback(
    async (teams: any[], fallbackUserId?: string) => {
      try {
        if (!Array.isArray(teams) || teams.length === 0) {
          return;
        }
        for (const team of teams) {
          await upsertTeamSync(team, fallbackUserId);
        }
      } catch (error) {
        console.error('Error syncing teams list to Firestore:', error);
      }
    },
    [upsertTeamSync]
  );

  return { myTeams, loading, createTeamSync, joinTeamSync, upsertTeamSync, syncTeamsFromApi };
};
