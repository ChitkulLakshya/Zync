/**
 * @fileoverview teamFirebaseSync.js
 * @module teamFirebaseSync
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
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Handles synchronization of team and user membership states to Firestore, managing team creation, member additions, removals, and ownership transfers.
 * Why: Keeps the external NoSQL datastore (Firestore) strictly consistent with our internal business logic, allowing fast client-side querying and real-time updates for collaborative team features.
 */
const { getFirestoreAdmin } = require('./firebaseAdmin'); // WHAT: Imports the Firebase Admin SDK instances. WHY: Needed to interact with Firestore with elevated privileges.
const { FieldValue } = require('firebase-admin/firestore'); // WHAT: Imports Firestore FieldValue. WHY: Needed for arrayUnion and arrayRemove.

const normalizeUid = (value) => { // WHAT: Normalizes a user ID into a plain string. WHY: Ensures consistent string formatting regardless of how the ID was passed in.
  if (!value) return ''; // WHAT: Returns empty string for falsy values. WHY: Prevents errors when accessing properties of undefined.
  if (typeof value === 'string') return value; // WHAT: Returns the value directly if it's already a string. WHY: Fast path for correct input.
  if (typeof value === 'object') return String(value.uid || value.id || value._id || ''); // WHAT: Extracts string ID from an object. WHY: Handles various user object shapes flexibly.
  return String(value); // WHAT: Coerces any other type to a string. WHY: Fallback to guarantee a string return type.
};

const extractOwnerUid = (team) => normalizeUid( // WHAT: Extracts the owner's UID from a team object. WHY: Teams might have different owner properties depending on how they were constructed.
  team?.ownerId || // WHAT: Tries standard ownerId. WHY: Most common pattern.
  team?.ownerUid || // WHAT: Tries ownerUid. WHY: Fallback 1.
  team?.leaderId || // WHAT: Tries leaderId. WHY: Fallback 2.
  team?.createdBy || // WHAT: Tries createdBy. WHY: Fallback 3.
  team?.createdByUid || // WHAT: Tries createdByUid. WHY: Fallback 4.
  team?.owner?.uid || // WHAT: Extracts nested uid. WHY: Fallback 5 for populated objects.
  team?.owner?.id || // WHAT: Extracts nested id. WHY: Fallback 6.
  team?.owner?._id // WHAT: Extracts nested _id. WHY: Fallback 7 (e.g., from MongoDB).
);

const extractTeamId = (teamOrId) => { // WHAT: Extracts the team ID from either an object or a string. WHY: Allows functions to accept both full team objects and raw IDs interchangeably.
  if (!teamOrId) return ''; // WHAT: Returns empty string if missing. WHY: Prevents undefined errors.
  if (typeof teamOrId === 'string') return teamOrId; // WHAT: Returns directly if it's a string. WHY: Base case.
  return String(teamOrId.id || teamOrId._id || teamOrId.teamId || ''); // WHAT: Extracts the ID property from the object. WHY: Handles multiple common ID property names.
};

const toIsoOrNow = (value) => { // WHAT: Converts a value to an ISO 8601 string or returns the current time. WHY: Standardizes timestamps for Firestore storage.
  if (!value) return new Date().toISOString(); // WHAT: Uses current time if no value provided. WHY: Fallback for missing timestamps.
  if (value instanceof Date) return value.toISOString(); // WHAT: Calls toISOString on Date objects. WHY: Formats Dates correctly.
  const parsed = new Date(value); // WHAT: Attempts to parse the value as a Date. WHY: Handles string timestamps.
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(); // WHAT: Checks if parsing failed, returning now if invalid. WHY: Ensures we always return a valid ISO string.
};

const safeArray = (value) => (Array.isArray(value) ? value : []); // WHAT: Ensures a value is an array. WHY: Prevents mapping over undefined or null values.

const upsertTeamSnapshot = async (team) => { // WHAT: Upserts a team into Firestore. WHY: Keeps the Firestore 'teams' collection in sync.
  const db = getFirestoreAdmin(); // WHAT: Gets the Firestore instance. WHY: Needed to run queries.
  if (!db || !team) return; // WHAT: Early return if DB or team is missing. WHY: Prevents execution without necessary prerequisites.

  const teamId = extractTeamId(team); // WHAT: Gets the normalized team ID. WHY: Needed as the document ID in Firestore.
  if (!teamId) return; // WHAT: Early return if no valid team ID. WHY: Cannot write a document without an ID.

  const ownerId = extractOwnerUid(team); // WHAT: Extracts the owner's UID. WHY: Crucial for determining who controls the team.
  const memberIds = safeArray(team.members).map(normalizeUid).filter(Boolean); // WHAT: Normalizes the array of member IDs. WHY: Ensures all IDs are valid strings.
  const members = Array.from(new Set([...memberIds, ownerId].filter(Boolean))); // WHAT: Creates a deduplicated array of all members including the owner. WHY: Ensures the owner is always treated as a member and no duplicates exist.
  const now = new Date().toISOString(); // WHAT: Grabs the current ISO timestamp. WHY: Used for updated and synced timestamps.

  const payload = { // WHAT: Constructs the payload for Firestore. WHY: Maps the application's team structure to Firestore's schema.
    name: team.name || 'Team', // WHAT: Sets the team name. WHY: Default fallback to 'Team'.
    ownerId, // WHAT: Sets the ownerId. WHY: Stores the primary owner.
    leaderId: ownerId, // WHAT: Mirrors ownerId to leaderId. WHY: Compatibility with older schemas or clients.
    members, // WHAT: Sets the array of member IDs. WHY: Allows querying for all members.
    inviteCode: team.inviteCode || '', // WHAT: Stores the invite code. WHY: Allows joining via link.
    logoId: team.logoId || 'rocket', // WHAT: Sets the logo ID. WHY: Default fallback to 'rocket'.
    type: team.type || 'Other', // WHAT: Sets the team type. WHY: Default fallback to 'Other'.
    createdAt: toIsoOrNow(team.createdAt), // WHAT: Ensures valid creation timestamp. WHY: Consistency in timestamps.
    updatedAt: now, // WHAT: Sets the updated timestamp. WHY: Tracks last modification.
    syncedAt: now, // WHAT: Sets the synced timestamp. WHY: Tracks when this snapshot was pushed.
  };

  await db.collection('teams').doc(teamId).set(payload, { merge: true }); // WHAT: Writes the payload to the 'teams' collection. WHY: merge: true ensures we don't overwrite fields we aren't explicitly sending.

  if (ownerId) { // WHAT: Checks if there is an owner. WHY: Avoids writing to a blank user ID.
    await db.collection('users').doc(ownerId).set({ // WHAT: Updates the owner's user document. WHY: Keeps the user's membership arrays in sync.
      uid: ownerId, // WHAT: Sets the uid. WHY: Redundancy for querying.
      ownedTeamIds: FieldValue.arrayUnion(teamId), // WHAT: Adds the team to the user's owned teams. WHY: Uses arrayUnion to avoid duplicates safely.
      teamMemberships: FieldValue.arrayUnion(teamId), // WHAT: Adds the team to the user's memberships. WHY: The owner is also a member.
      updatedAt: now, // WHAT: Updates the timestamp. WHY: Reflects the modification.
    }, { merge: true }); // WHAT: Merges with existing user data. WHY: Prevents overwriting other user properties.
  }

  for (const memberId of members) { // WHAT: Loops through all other members. WHY: Updates each member's user document.
    await db.collection('users').doc(memberId).set({ // WHAT: Updates the member's user document. WHY: Keeps their membership array in sync.
      uid: memberId, // WHAT: Sets the uid. WHY: Redundancy for querying.
      teamMemberships: FieldValue.arrayUnion(teamId), // WHAT: Adds the team to their memberships. WHY: Enables querying "which teams am I in".
      updatedAt: now, // WHAT: Updates the timestamp. WHY: Reflects the modification.
    }, { merge: true }); // WHAT: Merges with existing user data. WHY: Safe partial update.
  }
};

const addMemberToTeam = async (teamIdOrObj, memberUid) => { // WHAT: Adds a specific member to a team. WHY: Targeted update for a single membership change without syncing the whole team.
  const db = getFirestoreAdmin(); // WHAT: Gets Firestore instance. WHY: Needed for queries.
  if (!db) return; // WHAT: Early return if DB fails. WHY: Prevents crashes.
  const teamId = extractTeamId(teamIdOrObj); // WHAT: Extracts the team ID. WHY: Needed for document path.
  const uid = normalizeUid(memberUid); // WHAT: Normalizes the member UID. WHY: Ensures it's a valid string.
  if (!teamId || !uid) return; // WHAT: Returns early if either ID is missing. WHY: Cannot proceed without both.

  const now = new Date().toISOString(); // WHAT: Grabs current timestamp. WHY: For tracking update times.
  await db.collection('teams').doc(teamId).set({ // WHAT: Updates the team document. WHY: Adds the member to the team's array.
    members: FieldValue.arrayUnion(uid), // WHAT: Uses arrayUnion to safely add the member. WHY: Avoids pulling and pushing the whole array, and prevents duplicates.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
    syncedAt: now, // WHAT: Updates sync time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other team data.

  await db.collection('users').doc(uid).set({ // WHAT: Updates the user document. WHY: Adds the team to the user's array.
    uid, // WHAT: Ensures uid field exists. WHY: Data consistency.
    teamMemberships: FieldValue.arrayUnion(teamId), // WHAT: Uses arrayUnion to safely add the team. WHY: Prevents duplicates.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other user data.
};

const removeMemberFromTeam = async (teamIdOrObj, memberUid) => { // WHAT: Removes a specific member from a team. WHY: Handles leaving or kicking a user.
  const db = getFirestoreAdmin(); // WHAT: Gets Firestore instance. WHY: Needed for queries.
  if (!db) return; // WHAT: Early return. WHY: Prevents crashes.
  const teamId = extractTeamId(teamIdOrObj); // WHAT: Extracts team ID. WHY: For pathing.
  const uid = normalizeUid(memberUid); // WHAT: Normalizes user ID. WHY: For formatting.
  if (!teamId || !uid) return; // WHAT: Early return if missing IDs. WHY: Failsafe.

  const now = new Date().toISOString(); // WHAT: Gets timestamp. WHY: Auditing.
  await db.collection('teams').doc(teamId).set({ // WHAT: Updates the team document. WHY: Removes the user from the members array.
    members: FieldValue.arrayRemove(uid), // WHAT: Uses arrayRemove to pull the specific ID. WHY: Atomic and safe operation.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
    syncedAt: now, // WHAT: Updates sync time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other team data.

  await db.collection('users').doc(uid).set({ // WHAT: Updates the user document. WHY: Removes the team from their lists.
    uid, // WHAT: Ensures uid field exists. WHY: Data consistency.
    teamMemberships: FieldValue.arrayRemove(teamId), // WHAT: Atomic removal from memberships. WHY: Clean removal.
    ownedTeamIds: FieldValue.arrayRemove(teamId), // WHAT: Atomic removal from owned teams. WHY: Ensures they don't appear as an owner if removed.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other user data.
};

const transferTeamOwnership = async (teamIdOrObj, previousOwnerUid, nextOwnerUid) => { // WHAT: Transfers ownership from one user to another. WHY: Handles ownership succession.
  const db = getFirestoreAdmin(); // WHAT: Gets Firestore instance. WHY: Needed for queries.
  if (!db) return; // WHAT: Early return. WHY: Prevents crashes.
  const teamId = extractTeamId(teamIdOrObj); // WHAT: Extracts team ID. WHY: For pathing.
  const prevOwner = normalizeUid(previousOwnerUid); // WHAT: Normalizes old owner ID. WHY: For formatting.
  const newOwner = normalizeUid(nextOwnerUid); // WHAT: Normalizes new owner ID. WHY: For formatting.
  if (!teamId || !newOwner) return; // WHAT: Early return if missing critical IDs. WHY: Failsafe.

  const now = new Date().toISOString(); // WHAT: Gets timestamp. WHY: Auditing.
  await db.collection('teams').doc(teamId).set({ // WHAT: Updates the team document. WHY: Reassigns the owner properties.
    ownerId: newOwner, // WHAT: Sets new owner ID. WHY: Updates ownership.
    leaderId: newOwner, // WHAT: Sets new leader ID. WHY: Updates legacy field.
    members: FieldValue.arrayUnion(newOwner), // WHAT: Ensures new owner is in members array. WHY: An owner must be a member.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
    syncedAt: now, // WHAT: Updates sync time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other team data.

  if (prevOwner) { // WHAT: Checks if there was a previous owner. WHY: Avoids invalid updates if it was unowned.
    await db.collection('users').doc(prevOwner).set({ // WHAT: Updates old owner's document. WHY: Removes their owner status.
      uid: prevOwner, // WHAT: Ensures uid field exists. WHY: Data consistency.
      ownedTeamIds: FieldValue.arrayRemove(teamId), // WHAT: Removes from ownedTeamIds. WHY: They no longer own it.
      updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
    }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other user data.
  }

  await db.collection('users').doc(newOwner).set({ // WHAT: Updates new owner's document. WHY: Grants them owner status.
    uid: newOwner, // WHAT: Ensures uid field exists. WHY: Data consistency.
    ownedTeamIds: FieldValue.arrayUnion(teamId), // WHAT: Adds to ownedTeamIds. WHY: Grants ownership role.
    teamMemberships: FieldValue.arrayUnion(teamId), // WHAT: Ensures they are in teamMemberships. WHY: Consistency.
    updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
  }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other user data.
};

const deleteTeamSnapshot = async (teamIdOrObj, memberUids = [], ownerUid) => { // WHAT: Deletes a team and cleans up user records. WHY: Complete teardown of a team in Firestore.
  const db = getFirestoreAdmin(); // WHAT: Gets Firestore instance. WHY: Needed for queries.
  if (!db) return; // WHAT: Early return. WHY: Prevents crashes.
  const teamId = extractTeamId(teamIdOrObj); // WHAT: Extracts team ID. WHY: For pathing.
  if (!teamId) return; // WHAT: Early return if missing ID. WHY: Failsafe.

  const allMembers = Array.from( // WHAT: Gathers all unique members involved. WHY: We need to clean up the records of everyone attached to this team.
    new Set([
      ...safeArray(memberUids).map(normalizeUid).filter(Boolean), // WHAT: Maps and filters the member list. WHY: Extracts valid strings.
      normalizeUid(ownerUid), // WHAT: Includes the owner. WHY: Owner also needs cleanup.
    ].filter(Boolean))
  );

  const now = new Date().toISOString(); // WHAT: Gets timestamp. WHY: Auditing.
  await db.collection('teams').doc(teamId).delete(); // WHAT: Deletes the team document outright. WHY: Removes the core record.

  for (const uid of allMembers) { // WHAT: Iterates over all involved users. WHY: Cleans up each user sequentially.
    await db.collection('users').doc(uid).set({ // WHAT: Updates user document. WHY: Pulls the deleted team from their arrays.
      uid, // WHAT: Ensures uid field exists. WHY: Data consistency.
      teamMemberships: FieldValue.arrayRemove(teamId), // WHAT: Removes team from memberships. WHY: Cleanup.
      ownedTeamIds: FieldValue.arrayRemove(teamId), // WHAT: Removes team from owned teams. WHY: Cleanup.
      updatedAt: now, // WHAT: Updates modified time. WHY: Auditing.
    }, { merge: true }); // WHAT: Merges safely. WHY: Preserves other user data.
  }
};

module.exports = {
  upsertTeamSnapshot,
  addMemberToTeam,
  removeMemberFromTeam,
  transferTeamOwnership,
  deleteTeamSnapshot,
};
