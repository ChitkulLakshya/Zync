/**
 * @fileoverview emailTemplates.test.js
 * @module emailTemplates.test
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
const { describe, test, expect } = require("bun:test"); // WHAT: Imports testing utilities from bun test. WHY: To define test suites, test cases, and assertions for the email templates.
const { // WHAT: Starts destructuring imports from the emailTemplates module. WHY: Selectively imports only the functions needed for these tests.
  getMeetingEmailHtml, // WHAT: Imports the meeting email HTML generator.
  getMeetingInviteTextVersion, // WHAT: Imports the meeting invite plain text generator.
  getSupportNotificationTemplate // WHAT: Imports the support notification HTML generator.
} = require("./emailTemplates"); // WHAT: Specifies the source module to import from. WHY: Points to the local implementation file.

describe("Email Templates", () => { // WHAT: Creates a test suite for all email template utilities. WHY: Groups related tests together logically in the test runner output.
  describe("getMeetingEmailHtml", () => { // WHAT: Creates a nested suite specifically for the getMeetingEmailHtml function. WHY: Isolates tests for this specific template.
    test("should return valid HTML string with correct data", () => { // WHAT: Defines a test verifying data injection into HTML. WHY: Ensures the template interpolates dynamic values correctly.
      const data = { // WHAT: Defines a mock data object. WHY: Simulates the payload that would be passed to the template generator in production.
        inviterName: "Alice", // WHAT: Sets the inviter's name.
        attendeeName: "Bob", // WHAT: Sets the attendee's name.
        meetingTopic: "Project Sync", // WHAT: Sets the topic of the meeting.
        date: "October 24, 2023", // WHAT: Sets the meeting date.
        time: "10:00 AM", // WHAT: Sets the meeting time.
        meetingLink: "https://meet.google.com/abc-defg-hij" // WHAT: Sets the mock meeting URL.
      };

      const result = getMeetingEmailHtml(data); // WHAT: Calls the template function with the mock data. WHY: Generates the actual HTML string to be tested.

      expect(result).toContain("<!DOCTYPE html>"); // WHAT: Asserts the result has a valid HTML doctype. WHY: Verifies the output is a properly structured HTML document.
      expect(result).toContain("Alice"); // WHAT: Asserts the HTML contains the inviter's name. WHY: Verifies data interpolation worked.
      expect(result).toContain("Bob"); // WHAT: Asserts the HTML contains the attendee's name. WHY: Verifies data interpolation worked.
      expect(result).toContain("October 24, 2023"); // WHAT: Asserts the HTML contains the correct date. WHY: Verifies data interpolation worked.
      expect(result).toContain("10:00 AM"); // WHAT: Asserts the HTML contains the correct time. WHY: Verifies data interpolation worked.
      expect(result).toContain("https://meet.google.com/abc-defg-hij"); // WHAT: Asserts the HTML contains the meeting link. WHY: Verifies the CTA link is present.
    });
  });

  describe("getMeetingInviteTextVersion", () => { // WHAT: Creates a nested test suite for the text version generator. WHY: Isolates tests for the plaintext fallback email.
    test("should return plain text string with provided data", () => { // WHAT: Defines a test checking plaintext generation. WHY: Verifies the fallback template correctly formats data without HTML tags.
      const data = { // WHAT: Defines a mock payload. WHY: Simulates expected production input.
        recipientName: "Bob", // WHAT: Sets recipient name.
        senderName: "Alice", // WHAT: Sets sender name.
        meetingUrl: "https://meet.google.com/abc-defg-hij", // WHAT: Sets meeting link.
        meetingDate: "2023-10-24T10:00:00Z", // WHAT: Sets a specific ISO date string.
        meetingTime: "2023-10-24T10:00:00Z", // WHAT: Sets a specific ISO time string.
        projectName: "Project Alpha" // WHAT: Sets the topic/project name.
      };

      const result = getMeetingInviteTextVersion(data); // WHAT: Calls the plaintext generator. WHY: Executes the function under test.

      expect(result).toContain("Hey Bob"); // WHAT: Asserts the greeting is correctly formatted. WHY: Checks interpolation of recipient.
      expect(result).toContain("Alice wants to build software together with you"); // WHAT: Asserts the sender name is included in the invitation sentence. WHY: Checks interpolation.
      expect(result).toContain("Topic: Project Alpha"); // WHAT: Asserts the topic is present. WHY: Checks interpolation.
      expect(result).toContain("https://meet.google.com/abc-defg-hij"); // WHAT: Asserts the URL is present. WHY: Critical for the user to join.

      expect(result).not.toContain("Date: Today"); // WHAT: Asserts the default fallback 'Today' is absent. WHY: Because a specific date was provided.
      expect(result).not.toContain("Time: Now"); // WHAT: Asserts the default fallback 'Now' is absent. WHY: Because a specific time was provided.
    });

    test("should use default values when optional parameters are missing", () => { // WHAT: Defines a test case for missing data. WHY: Ensures the template handles incomplete payloads gracefully using defaults.
      const data = { // WHAT: Defines a minimal payload with only the required URL. WHY: Simulates a partial input scenario.
        meetingUrl: "https://meet.google.com/abc-defg-hij" // WHAT: Only the URL is provided.
      };

      const result = getMeetingInviteTextVersion(data); // WHAT: Calls the text generator with minimal data. WHY: Triggers the default fallback logic.

      expect(result).toContain("Hey there"); // WHAT: Asserts the fallback generic greeting is used. WHY: Recipient name was missing.
      expect(result).toContain("A colleague wants to build software together with you"); // WHAT: Asserts the fallback sender descriptor is used. WHY: Sender name was missing.
      expect(result).toContain("Topic: Instant Meeting"); // WHAT: Asserts the fallback topic is used. WHY: Project name was missing.
      expect(result).toContain("Date: Today"); // WHAT: Asserts the fallback date is used. WHY: Date was missing.
      expect(result).toContain("Time: Now"); // WHAT: Asserts the fallback time is used. WHY: Time was missing.
      expect(result).toContain("https://meet.google.com/abc-defg-hij"); // WHAT: Asserts the provided URL is still rendered. WHY: Essential required data.
    });
  });

  describe("getSupportNotificationTemplate", () => { // WHAT: Creates a nested suite for the support email template. WHY: Groups tests for the support system notifications.
    test("should return HTML string with user details", () => { // WHAT: Defines a test checking standard data injection. WHY: Verifies the support desk gets all relevant user info.
      const data = { // WHAT: Defines mock user support request data. WHY: Simulates a form submission.
        firstName: "John", // WHAT: Sets first name.
        lastName: "Doe", // WHAT: Sets last name.
        userEmail: "john@example.com", // WHAT: Sets user email.
        message: "I need help with login.", // WHAT: Sets user message.
        timestamp: new Date("2023-10-24T12:00:00Z") // WHAT: Sets a specific date object.
      };

      const result = getSupportNotificationTemplate(data); // WHAT: Generates the HTML support notification. WHY: Prepares the output for validation.

      expect(result).toContain("John Doe"); // WHAT: Asserts full name is rendered. WHY: Checks interpolation.
      expect(result).toContain("john@example.com"); // WHAT: Asserts email is rendered. WHY: Checks interpolation.
      expect(result).toContain("I need help with login."); // WHAT: Asserts message body is present. WHY: Checks interpolation.
      expect(result).toContain("From User"); // WHAT: Asserts standard header is present. WHY: Checks structural integrity.

      expect(result).toContain("2023"); // WHAT: Asserts the year is rendered. WHY: Basic check that the timestamp was processed.
    });

    test("should include phone number if provided", () => { // WHAT: Defines a test for the optional phone number field. WHY: Ensures optional contact info is conditionally rendered.
      const data = { // WHAT: Defines mock data including a phone number. WHY: Simulates a user providing extended contact details.
        firstName: "Jane", // WHAT: Sets first name.
        lastName: "Smith", // WHAT: Sets last name.
        userEmail: "jane@example.com", // WHAT: Sets user email.
        phone: "+1234567890", // WHAT: Sets the optional phone number.
        message: "Call me back." // WHAT: Sets the message.
      };

      const result = getSupportNotificationTemplate(data); // WHAT: Generates the template. WHY: To test conditional logic.

      expect(result).toContain("+1234567890"); // WHAT: Asserts the phone number appears in the output HTML. WHY: Verifies the optional field was correctly injected.
    });

    test("should format message newlines as <br/>", () => { // WHAT: Defines a test checking text formatting. WHY: Ensures multiline user input is converted to HTML line breaks so it remains readable.
      const data = { // WHAT: Defines mock data with newline characters. WHY: Simulates a multiline textarea input.
        firstName: "User", // WHAT: Sets first name.
        lastName: "Test", // WHAT: Sets last name.
        userEmail: "test@example.com", // WHAT: Sets a message with a newline.
        message: "Line 1\nLine 2" // WHAT: Sets a message with a newline.
      };

      const result = getSupportNotificationTemplate(data); // WHAT: Generates the template. WHY: Invokes the newline replacement logic.

      expect(result).toContain("Line 1<br/>Line 2"); // WHAT: Asserts the raw newline was replaced with a <br/> tag. WHY: Proves the formatting logic behaves correctly for HTML rendering.
    });
  });
});
