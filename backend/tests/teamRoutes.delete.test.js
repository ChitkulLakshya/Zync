/**
 * @fileoverview teamRoutes.delete.test.js
 * @module teamRoutes.delete.test
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
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require("express");
const request = require("supertest");

const createLeanChain = (result) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("../middleware/authMiddleware", () => (req, _res, next) => {
  req.user = { uid: "owner_uid", email: "owner@test.com" };
  next();
});

jest.mock("../models/User", () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../models/Team", () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock("../services/teamFirebaseSync", () => ({
  upsertTeamSnapshot: jest.fn(),
  addMemberToTeam: jest.fn(),
  removeMemberFromTeam: jest.fn(),
  transferTeamOwnership: jest.fn(),
  deleteTeamSnapshot: jest.fn(),
}));

jest.mock("../utils/cache", () => ({
  invalidate: jest.fn(),
}));

const User = jest.requireMock("../models/User");
const Team = jest.requireMock("../models/Team");
const cache = jest.requireMock("../utils/cache");
const { deleteTeamSnapshot } = jest.requireMock("../services/teamFirebaseSync");

const teamRoutes = require("../routes/teamRoutes");

const app = express();
app.use(express.json());
app.use("/api/teams", teamRoutes);

describe("Team delete route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes team, removes memberships, syncs firebase delete, and invalidates me-cache", async () => {
    const teamId = "team_123";
    const ownerUid = "owner_uid";
    const memberUid = "member_uid";

    Team.findById.mockImplementation(() =>
      createLeanChain({
        _id: teamId,
        ownerId: ownerUid,
        members: [ownerUid, memberUid],
      })
    );
    Team.findByIdAndDelete.mockResolvedValue({ _id: teamId });


    User.findOne.mockImplementation(({ uid }) => {
      if (uid === ownerUid) {
        return createLeanChain({
          uid: ownerUid,
          teamMemberships: [{ toString: () => teamId }, "other_team"],
          securityPin: "hashed_pin",
        });
      }
      if (uid === memberUid) {
        return createLeanChain({
          uid: memberUid,
          teamMemberships: [teamId, "other_team"],
        });
      }
      return createLeanChain(null);
    });
    User.updateOne.mockResolvedValue({ acknowledged: true });
    cache.invalidate.mockResolvedValue();
    deleteTeamSnapshot.mockResolvedValue();

    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", "Bearer valid_token")
      .send({ pin: "123456" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Team deleted successfully" });

    expect(User.updateOne).toHaveBeenCalledTimes(2);
    expect(User.updateOne).toHaveBeenNthCalledWith(
      1,
      { uid: ownerUid },
      { $set: { teamMemberships: ["other_team"] } }
    );
    expect(User.updateOne).toHaveBeenNthCalledWith(
      2,
      { uid: memberUid },
      { $set: { teamMemberships: ["other_team"] } }
    );

    expect(Team.findByIdAndDelete).toHaveBeenCalledWith(teamId);
    expect(deleteTeamSnapshot).toHaveBeenCalledWith(teamId, [ownerUid, memberUid], ownerUid);
    expect(cache.invalidate).toHaveBeenCalledWith(
      "user:me:owner_uid",
      "user:me:member_uid"
    );
  });
});
