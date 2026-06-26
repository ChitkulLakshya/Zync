/**
 * @fileoverview projectHelper.js
 * @module projectHelper
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
const Project = require('../models/Project'); // WHAT: Import Project model. WHY: To interact with projects collection.
const Step = require('../models/Step'); // WHAT: Import Step model. WHY: To query project steps.
const ProjectTask = require('../models/ProjectTask'); // WHAT: Import ProjectTask model. WHY: To fetch tasks within steps.
const User = require('../models/User'); // WHAT: Import User model. WHY: To retrieve owner details.
const { normalizeDoc, normalizeDocs } = require('./normalize'); // WHAT: Import normalization utilities. WHY: To format documents before sending.

const attachOwnerData = async (projects) => { // WHAT: Function to populate owner info. WHY: Enriches project objects with user data.
  if (!projects || projects.length === 0) return projects; // WHAT: Guard clause for empty array. WHY: Skip DB calls if nothing to process.

  const ownerUids = [...new Set(projects.map((p) => p.ownerUid).filter(Boolean))]; // WHAT: Extract unique owner UIDs. WHY: Minimize database queries by fetching each user once.
  if (ownerUids.length === 0) return projects; // WHAT: Check if any valid UIDs exist. WHY: Avoid empty queries.

  const owners = await User.find({ uid: { $in: ownerUids } }) // WHAT: Find users matching UIDs. WHY: Retrieve user documents from DB.
    .select('uid displayName photoURL') // WHAT: Select specific fields. WHY: Limit payload size and protect sensitive info.
    .lean(); // WHAT: Use lean query. WHY: Improves performance by returning plain objects.

  const ownerByUid = new Map( // WHAT: Create map of owners by UID. WHY: Fast O(1) lookup when attaching to projects.
    owners.map((owner) => [owner.uid, { // WHAT: Map user data to key-value pairs. WHY: Initialize Map structure.
      uid: owner.uid, // WHAT: Assign UID. WHY: Identifier.
      displayName: owner.displayName || 'Unknown', // WHAT: Assign display name with fallback. WHY: Prevent undefined values in UI.
      photoURL: owner.photoURL || null, // WHAT: Assign photo URL. WHY: For user avatars.
    }])
  );

  return projects.map((project) => ({ // WHAT: Map over projects to attach owner. WHY: Create new enriched project objects.
    ...project, // WHAT: Spread existing project properties. WHY: Retain original data.
    owner: ownerByUid.get(project.ownerUid) || null, // WHAT: Look up owner or null. WHY: Append fetched owner data to the project.
  }));
};

/**
 * Fetch a single project with its steps (ordered) and their tasks.
 * Returns a plain object with `id` instead of `_id`.
 */
async function getProjectWithSteps(projectId) { // WHAT: Function to get complete project structure. WHY: Fetches nested data efficiently.
  const project = await Project.findById(projectId).lean(); // WHAT: Fetch project by ID. WHY: Get base entity.
  if (!project) return null; // WHAT: Handle not found. WHY: Prevent errors on invalid ID.

  const steps = await Step.find({ projectId: project._id }) // WHAT: Fetch associated steps. WHY: Get the next hierarchical level.
    .sort({ order: 1 }) // WHAT: Sort steps by order. WHY: Ensure correct sequential display.
    .lean(); // WHAT: Fetch plain objects. WHY: Performance.

  const stepIds = steps.map(s => s._id); // WHAT: Extract step IDs. WHY: Prepare for task query.
  const tasks = stepIds.length > 0 // WHAT: Conditionally fetch tasks. WHY: Avoid query if no steps exist.
    ? await ProjectTask.find({ stepId: { $in: stepIds } }).lean() // WHAT: Find tasks in fetched steps. WHY: Batch query for efficiency.
    : []; // WHAT: Fallback to empty array. WHY: No steps means no tasks.

  const tasksByStep = {}; // WHAT: Initialize grouping object. WHY: Organize tasks by their parent step.
  tasks.forEach(t => { // WHAT: Iterate over fetched tasks. WHY: Populate grouping object.
    const key = t.stepId.toString(); // WHAT: Get step ID as string. WHY: Object keys must be strings/symbols.
    if (!tasksByStep[key]) tasksByStep[key] = []; // WHAT: Ensure array exists for key. WHY: Prevent push on undefined.
    tasksByStep[key].push(normalizeDoc(t)); // WHAT: Add normalized task to array. WHY: Group tasks for easy assignment later.
  });

  const result = normalizeDoc(project); // WHAT: Normalize the main project document. WHY: Standardize ID format.
  result.steps = steps.map(s => { // WHAT: Attach steps to project. WHY: Build nested structure.
    const ns = normalizeDoc(s); // WHAT: Normalize each step. WHY: Standardize ID format.
    ns.tasks = tasksByStep[s._id.toString()] || []; // WHAT: Attach grouped tasks to step. WHY: Complete the nested hierarchy.
    return ns; // WHAT: Return step with tasks. WHY: Add to steps array.
  });

  const [withOwner] = await attachOwnerData([result]); // WHAT: Attach owner data to the project. WHY: Enrich with user info via helper.
  return withOwner; // WHAT: Return fully populated project. WHY: Send back complete data to caller.
}

/**
 * Fetch multiple projects (by filter) with steps and tasks.
 */
async function getProjectsWithSteps(filter, sort = { createdAt: -1 }) { // WHAT: Fetch list of projects with nested data. WHY: For dashboard or listing views.
  const projects = await Project.find(filter).sort(sort).lean(); // WHAT: Query projects with filter and sort. WHY: Get baseline project list.
  if (projects.length === 0) return []; // WHAT: Early exit if empty. WHY: Save processing time.

  const projectIds = projects.map(p => p._id); // WHAT: Extract project IDs. WHY: Needed for steps query.

  const steps = await Step.find({ projectId: { $in: projectIds } }) // WHAT: Find all steps for these projects. WHY: Batch fetch to avoid N+1 queries.
    .sort({ order: 1 }) // WHAT: Sort steps by order. WHY: Sequential display is required.
    .lean(); // WHAT: Use lean for performance. WHY: Faster processing of large datasets.

  const stepIds = steps.map(s => s._id); // WHAT: Extract step IDs. WHY: Needed for tasks query.
  const tasks = stepIds.length > 0 // WHAT: Check if we have steps. WHY: Avoid querying tasks for zero steps.
    ? await ProjectTask.find({ stepId: { $in: stepIds } }).lean() // WHAT: Find all tasks in these steps. WHY: Batch query for tasks.
    : []; // WHAT: Empty fallback. WHY: Safe default.


  const tasksByStep = {}; // WHAT: Object to group tasks. WHY: Map tasks to parent step.
  tasks.forEach(t => { // WHAT: Loop through tasks. WHY: Populate the grouping.
    const key = t.stepId.toString(); // WHAT: Stringify step ID. WHY: Object keys.
    if (!tasksByStep[key]) tasksByStep[key] = []; // WHAT: Initialize array. WHY: Handle first item for a step.
    tasksByStep[key].push(normalizeDoc(t)); // WHAT: Add normalized task. WHY: Organize data.
  });


  const stepsByProject = {}; // WHAT: Object to group steps. WHY: Map steps to parent project.
  steps.forEach(s => { // WHAT: Loop through steps. WHY: Populate project-to-step mapping.
    const key = s.projectId.toString(); // WHAT: Stringify project ID. WHY: Object keys.
    if (!stepsByProject[key]) stepsByProject[key] = []; // WHAT: Initialize array. WHY: Handle first step for a project.
    const ns = normalizeDoc(s); // WHAT: Normalize step doc. WHY: Consistent format.
    ns.tasks = tasksByStep[s._id.toString()] || []; // WHAT: Attach nested tasks to the step. WHY: Build hierarchy.
    stepsByProject[key].push(ns); // WHAT: Add complete step to project array. WHY: Store mapped steps.
  });

  const normalizedProjects = projects.map(p => { // WHAT: Iterate through baseline projects. WHY: Attach mapped steps.
    const np = normalizeDoc(p); // WHAT: Normalize project. WHY: Clean ID field.
    np.steps = stepsByProject[p._id.toString()] || []; // WHAT: Attach its steps. WHY: Complete project tree.
    return np; // WHAT: Return modified project. WHY: Build final array.
  });

  return attachOwnerData(normalizedProjects); // WHAT: Finally attach owner info. WHY: Complete response dataset.
}

module.exports = { getProjectWithSteps, getProjectsWithSteps }; // WHAT: Export module functions. WHY: Expose helpers to other files.
