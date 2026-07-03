/**
 * @fileoverview commitAnalysisService.js
 * @module commitAnalysisService
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
const Groq = require('groq-sdk'); // WHAT: Import the Groq SDK. WHY: To interact with the Groq API for LLM-based commit analysis.

// WHAT: Initialize the Groq client if an API key is available. WHY: To avoid crashing if the API key is missing and allow a fallback logic.
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) // WHAT: Create Groq instance. WHY: To authenticate requests using the provided key.
  : null; // WHAT: Set groq to null. WHY: To signify that the Groq service is unavailable.
const MODEL_NAME = 'llama-3.1-8b-instant'; // WHAT: Define the LLM model to use. WHY: To specify which model should handle the commit message analysis.


// WHAT: Define a fallback function to analyze commit messages using Regular Expressions. WHY: To provide basic task linking if the LLM is unavailable or fails.
const filterCommitMessage = (message) => {

  const taskRegex = /(?:TASK-|#)(\d+)/i; // WHAT: Define a regex for task IDs like TASK-123 or #123. WHY: To extract task identifiers efficiently without an LLM.
  const match = message.match(taskRegex); // WHAT: Execute the regex on the commit message. WHY: To find the first occurrence of a task ID pattern.

  // WHAT: Check if a task ID was found. WHY: To decide whether to return task details or a null response.
  if (match) {
    // WHAT: Return a structured task analysis object. WHY: To standardize the output format for the calling service.
    return {
      found: true, // WHAT: Flag indicating a task was found. WHY: To allow quick checking by the consumer.
      id: match[0].toUpperCase().replace('#', 'TASK-'), // WHAT: Normalize the task ID (e.g., #123 to TASK-123). WHY: To maintain consistent task IDs across the system.
      action: message.toLowerCase().includes('fix') ? 'Complete' : 'In Progress', // WHAT: Determine action based on 'fix' keyword. WHY: To automatically update task status based on commit intent.
      confidence: 0.8 // WHAT: Hardcode confidence score. WHY: To indicate this is a regex match, not a 100% certain LLM extraction.
    };
  }
  // WHAT: Return default empty state. WHY: To gracefully handle commits with no task IDs without throwing errors.
  return { found: false, id: null, action: null, confidence: 0 };
};


// WHAT: Define the main asynchronous function to analyze commit messages using Groq LLM. WHY: To intelligently extract task IDs and intents using natural language understanding.
const analyzeCommit = async (message) => {
  // WHAT: Check if the Groq client is initialized. WHY: To fallback to regex if we don't have API credentials.
  if (!groq) {
    console.warn('GROQ_API_KEY not found. Defaulting to regex logic.'); // WHAT: Log a warning. WHY: To alert developers that the LLM feature is disabled.
    return filterCommitMessage(message); // WHAT: Call the regex fallback. WHY: To ensure the system still functions without the LLM.
  }

  // WHAT: Start a try-catch block. WHY: To handle any network or API errors from Groq gracefully.
  try {
    // WHAT: Construct the prompt for the LLM. WHY: To give specific instructions on how to parse the commit message and format the output.
    const prompt = `
            You are a system that analyzes Git commit messages to identify linked tasks.

            Commit Message: "${message}"

            Analyze the message for any references to Task IDs (e.g. TASK-123, ID-456, #123).
            If found, return the task ID and the action (e.g. "Complete", "In Progress", "Reference").

            If the commit says "Fixes TASK-123", action is "Complete".
            If "Updates TASK-123", action is "In Progress".
            If just referencing, action is "Reference".

            Return JSON:
            {
                "found": boolean,
                "id": string | null,
                "action": "Complete" | "In Progress" | "Reference" | null,
                "confidence": number
            }

            If no specific task ID pattern is found, set "found": false.
        `;

    // WHAT: Send the prompt to the Groq API. WHY: To get the LLM's analysis of the commit message.
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }], // WHAT: Set the user message. WHY: To pass the prompt to the model.
      model: MODEL_NAME, // WHAT: Specify the model. WHY: To use the predefined LLM model for this task.
      response_format: { type: 'json_object' }, // WHAT: Force JSON output. WHY: To ensure the response can be programmatically parsed.
    });

    // WHAT: Extract the text response from the API result. WHY: To get the actual content generated by the LLM.
    const responseText = completion.choices?.[0]?.message?.content;
    // WHAT: Check if the response is empty. WHY: To fallback to regex if the LLM failed to return anything.
    if (!responseText) {
      return filterCommitMessage(message); // WHAT: Call regex fallback. WHY: To guarantee a result is returned.
    }

    let analysis; // WHAT: Declare analysis variable. WHY: To hold the parsed JSON result outside the try-catch scope.
    // WHAT: Start a nested try-catch. WHY: To handle potential JSON parsing errors if the LLM hallucinated markdown.
    try {
      // WHAT: Clean up the response text by removing markdown formatting. WHY: To ensure JSON.parse works even if the LLM wrapped it in markdown.
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanJson); // WHAT: Parse the cleaned string. WHY: To convert the text response into a JavaScript object.
    } catch (e) {
      console.error("Groq JSON Parse Error", e); // WHAT: Log parse error. WHY: To debug LLM output formatting issues.
      return filterCommitMessage(message); // WHAT: Call regex fallback. WHY: To recover from the parsing failure.
    }

    // WHAT: Check if the LLM found a task. WHY: To return the analysis if valid, or fallback otherwise.
    if (analysis.found) {
      return analysis; // WHAT: Return the successful LLM analysis. WHY: To provide the extracted task data.
    } else {
      return filterCommitMessage(message); // WHAT: Call regex fallback. WHY: To double-check using regex if LLM missed it.
    }

  } catch (error) {
    console.error('Groq Analysis Error:', error.message); // WHAT: Log API error. WHY: To debug network or authentication issues with Groq.
    return filterCommitMessage(message); // WHAT: Call regex fallback. WHY: To maintain functionality despite API failures.
  }
};

module.exports = { filterCommitMessage, analyzeCommit }; // WHAT: Export the functions. WHY: To make them available to other modules in the application.
