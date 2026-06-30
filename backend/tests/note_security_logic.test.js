/**
 * @fileoverview note_security_logic.test.js
 * @module note_security_logic.test
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
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


const mockNotes = [
  { id: '1', title: 'Secret Note', ownerId: 'victim', folderId: null },
  { id: '2', title: 'My Note', ownerId: 'me', folderId: null },
];

const prisma = {
  note: {
    findMany: jest.fn((args) => {
      const query = args.where;
      return Promise.resolve(
        mockNotes.filter((n) => {
          if (query.OR) {
            return query.OR.some(
              (c) =>
                c.ownerId === n.ownerId ||
                (c.folderId === n.folderId && n.folderId !== null)
            );
          }
          if (query.folderId) return n.folderId === query.folderId;
          return false;
        })
      );
    }),
  },
  folder: {
    findUnique: jest.fn(() => Promise.resolve(null)),
    findMany: jest.fn(() => Promise.resolve([])),
  },
};

const fixedHandler = async (req, res) => {
  try {
    const userId = req.user ? req.user.uid : null;
    const { folderId } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (folderId && typeof folderId !== 'string') {
      return res.status(400).json({ error: 'Invalid Folder ID format' });
    }

    let where = {};

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (folder) {
        const isOwner = folder.ownerId === userId;
        const isCollaborator =
          folder.collaborators && folder.collaborators.includes(userId);

        if (isOwner || isCollaborator) {
          where = { folderId };
        } else {
          return res
            .status(403)
            .json({ error: 'Access denied to this folder' });
        }
      } else {
        return res.status(404).json({ error: 'Folder not found' });
      }
    } else {
      const sharedFolders = await prisma.folder.findMany({
        where: { collaborators: { has: userId } },
        select: { id: true },
      });
      const sharedFolderIds = sharedFolders.map((f) => f.id);

      where = {
        OR: [
          { ownerId: userId },
          { folderId: { in: sharedFolderIds } },
          { collaborators: { has: userId } },
        ],
      };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

describe('Fixed IDOR Vulnerability (Handler Logic)', () => {
  it('uses authenticated user ID instead of query param', async () => {
    const req = {
      query: { userId: 'victim' },
      user: { uid: 'me' },
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    await fixedHandler(req, res);

    expect(prisma.note.findMany).toHaveBeenCalled();
    const callArgs = prisma.note.findMany.mock.calls[0][0];

    expect(callArgs.where.OR).toBeDefined();
    const ownerIdCheckMe = callArgs.where.OR.find((c) => c.ownerId === 'me');
    expect(ownerIdCheckMe).toBeDefined();

    const ownerIdCheckVictim = callArgs.where.OR.find(
      (c) => c.ownerId === 'victim'
    );
    expect(ownerIdCheckVictim).toBeUndefined();

    expect(res.json).toHaveBeenCalled();

    const result = res.json.mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].ownerId).toBe('me');
  });

  it('returns 401 if not authenticated', async () => {
    const req = {
      query: { userId: 'victim' },
      user: null,
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    await fixedHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
