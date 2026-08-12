/**
 * @fileoverview renderEmailTemplatesDemo.js
 * @module renderEmailTemplatesDemo
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const {
  getMeetingEmailHtml,
  getNewUserRegistrationTemplate,
  getSupportNotificationTemplate,
  getPhoneVerificationEmailHtml,
  getChatRequestEmailHtml,
  getAccountDeletionCodeEmailHtml,
  getTaskAssignmentEmailHtml,
} = require('../utils/emailTemplates');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');
const OUT_DIR = path.join(TEMPLATE_DIR, 'demo');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readTemplateRaw(filename) {
  const fullPath = path.join(TEMPLATE_DIR, filename);
  return fs.readFileSync(fullPath, 'utf8');
}

function replaceBracketFirstName(html, firstName) {

  return html.replaceAll('[First Name]', firstName);
}

function writeDemo(filename, html) {
  ensureDir(OUT_DIR);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, html, 'utf8');
}

function renderDemoByFilename(filename) {
  switch (filename) {
    case 'meet-invitation.html':
      return getMeetingEmailHtml({
        inviterName: 'Alice',
        attendeeName: 'Bob',
        meetingTopic: 'Demo Topic',
        date: 'October 24, 2023',
        time: '10:00 AM',
        meetingLink: 'https://meet.google.com/demo-demo-demo',
      });

    case 'meet-new-user.html':
      return getNewUserRegistrationTemplate({
        name: 'Eesha',
        email: 'eesha@example.com',
        uid: 'demo_uid_123',
      });

    case 'support-notification.html':
      return getSupportNotificationTemplate({
        firstName: 'Eesha',
        lastName: 'K',
        userEmail: 'eesha@example.com',
        phone: '+1 (555) 010-1234',
        message: 'Hello Support,\nI need help with something.',
        timestamp: new Date('2023-10-24T12:00:00Z'),
      });

    case 'phone-verification-code.html':
      return getPhoneVerificationEmailHtml({ code: '123456' });

    case 'chat-request.html':
      return getChatRequestEmailHtml({
        senderName: 'Alice',
        message: 'Hey! Want to collaborate?',
      });

    case 'account-deletion-code.html':
      return getAccountDeletionCodeEmailHtml({ code: '654321' });

    case 'task-assignment.html':
      return getTaskAssignmentEmailHtml({
        projectName: 'Zync Demo Project',
        lines: [
          { label: 'Step', value: 'Backlog' },
          { label: 'Task', value: 'Implement login screen' },
          { label: 'Description', value: 'Add UI + validation' },
          { label: 'Assigned By', value: 'Admin' },
        ],
      });

    case 'welcome.html': {
      const raw = readTemplateRaw(filename);
      return replaceBracketFirstName(raw, 'Eesha');
    }

    case 'password-reset.html': {
      const raw = readTemplateRaw(filename);
      return replaceBracketFirstName(raw, 'Eesha');
    }

    default:

      return readTemplateRaw(filename);
  }
}

function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Template directory not found: ${TEMPLATE_DIR}`);
  }

  const files = fs
    .readdirSync(TEMPLATE_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();

  const written = [];
  for (const file of files) {
    const html = renderDemoByFilename(file);
    writeDemo(file, html);
    written.push(file);
  }


  console.log(
    `[Email template demos] Wrote ${written.length} file(s) to: ${OUT_DIR}`
  );
  console.log(written.map((f) => `- ${f}`).join('\n'));
}

main();
