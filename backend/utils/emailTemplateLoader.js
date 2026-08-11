/**
 * @fileoverview emailTemplateLoader.js
 * @module emailTemplateLoader
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
const fs = require('fs'); // WHAT: Import the Node.js filesystem module. WHY: To interact with files on disk, specifically to read email templates.
const path = require('path'); // WHAT: Import the Node.js path module. WHY: To resolve file paths cross-platform reliably.

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email'); // WHAT: Construct the path to the email templates directory. WHY: To know exactly where to look for .html template files.

/** In-memory cache so we do not re-read disk on every send. */
const cache = new Map(); // WHAT: Initialize an in-memory cache using a Map. WHY: To store previously read templates and avoid redundant, slow disk I/O operations.

/**
 * List all `.html` files in `backend/templates/email/`.
 * @returns {string[]}
 */
function getTemplateFileNames() {
    if (!fs.existsSync(TEMPLATE_DIR)) { // WHAT: Check if the templates directory exists. WHY: To prevent a crash if the directory was accidentally deleted or not created yet.
        return []; // WHAT: Return an empty array. WHY: Because no templates can be found if the directory doesn't exist.
    }
    return fs
        .readdirSync(TEMPLATE_DIR) // WHAT: Read the directory contents synchronously. WHY: To get a list of all files in the template directory.
        .filter((f) => f.endsWith('.html')) // WHAT: Filter the list to only include .html files. WHY: To ignore non-template files like text documents or scripts.
        .sort(); // WHAT: Sort the resulting filenames alphabetically. WHY: To ensure a consistent, predictable order.
}

/**
 * Read a template file by basename (e.g. `welcome.html`).
 * @param {string} filename
 * @returns {string}
 */
function readTemplateFile(filename) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.html$/.test(filename)) { // WHAT: Validate the filename using a regular expression. WHY: To prevent directory traversal attacks (e.g. passing '../secret.txt' as filename).
        throw new Error(`Invalid email template filename: ${filename}`); // WHAT: Throw an error if validation fails. WHY: To immediately stop execution on a potentially malicious or malformed input.
    }
    if (cache.has(filename)) { // WHAT: Check if the template is already in the cache. WHY: To skip the disk read if we already have the content in memory.
        return cache.get(filename); // WHAT: Return the cached template content. WHY: To provide the fastest possible response.
    }
    const fullPath = path.join(TEMPLATE_DIR, filename); // WHAT: Create the absolute path to the template file. WHY: So fs.readFileSync knows exactly what file to open.
    const html = fs.readFileSync(fullPath, 'utf8'); // WHAT: Read the file contents from disk synchronously using UTF-8 encoding. WHY: To load the template into a string variable.
    cache.set(filename, html); // WHAT: Store the newly read template in the cache. WHY: So the next time this template is needed, it can be served from memory.
    return html; // WHAT: Return the template string. WHY: To provide the caller with the template content.
}

function escapeHtml(value) {
    return String(value ?? '') // WHAT: Convert the input value to a string, defaulting to an empty string if null/undefined. WHY: To ensure the string replacement methods can safely be called.
        .replace(/&/g, '&amp;') // WHAT: Replace ampersands with their HTML entity. WHY: To prevent XSS vulnerabilities.
        .replace(/</g, '&lt;') // WHAT: Replace less-than signs with their HTML entity. WHY: To prevent injection of arbitrary HTML tags.
        .replace(/>/g, '&gt;') // WHAT: Replace greater-than signs with their HTML entity. WHY: To prevent injection of arbitrary HTML tags.
        .replace(/"/g, '&quot;'); // WHAT: Replace double quotes with their HTML entity. WHY: To prevent breaking out of HTML attributes.
}

/**
 * Replace `{{key}}` placeholders. Values are HTML-escaped unless listed in `options.rawKeys`
 * (trusted pre-rendered snippets, e.g. line breaks or styled rows built with escapeHtml in JS).
 * @param {string} html
 * @param {Record<string, string | number | undefined | null>} vars
 * @param {{ rawKeys?: string[] }} [options]
 * @returns {string}
 */
function renderTemplate(html, vars = {}, options = {}) {
    const rawKeys = new Set(options.rawKeys || []); // WHAT: Create a Set of keys that should NOT be HTML-escaped. WHY: A Set allows for fast O(1) lookup during the iteration.
    let out = html; // WHAT: Initialize the output string with the raw HTML template. WHY: We will iteratively replace placeholders in this string.
    for (const [key, value] of Object.entries(vars)) { // WHAT: Loop over each key-value pair in the provided variables object. WHY: To process every variable that needs to be injected into the template.
        const replacement = rawKeys.has(key) // WHAT: Check if the current key is allowed to be inserted as raw, unescaped HTML. WHY: To decide whether to escape the value or not based on the options.
            ? String(value ?? '') // WHAT: Convert the raw value to a string, handling nulls. WHY: Because it's trusted, we don't escape it, but we still need it to be a string.
            : escapeHtml(value); // WHAT: HTML-escape the value. WHY: Because it's not explicitly trusted, we must sanitize it to prevent XSS.
        out = out.split(`{{${key}}}`).join(replacement); // WHAT: Replace all occurrences of the placeholder with the sanitized (or raw) value. WHY: This is the actual mechanism of templating.
    }
    return out; // WHAT: Return the fully rendered HTML string. WHY: This string is now ready to be sent as the email body.
}

/**
 * Load a file from `backend/templates/email/` and apply `{{key}}` replacements.
 * @param {string} filename
 * @param {Record<string, string | number | undefined | null>} vars
 * @param {{ rawKeys?: string[] }} [options]
 */
function renderEmailTemplate(filename, vars, options) {
    return renderTemplate(readTemplateFile(filename), vars, options); // WHAT: Read the template file and then pass it to the render function along with variables and options. WHY: This is a convenience wrapper to combine loading and rendering in one step.
}

module.exports = {
    TEMPLATE_DIR, // WHAT: Export the template directory path. WHY: To allow other modules to know where templates are stored, if needed.
    getTemplateFileNames, // WHAT: Export the function to list template files. WHY: Useful for debugging or pre-loading templates.
    readTemplateFile, // WHAT: Export the function to read a single template file. WHY: Useful if a module needs raw template access without rendering.
    renderTemplate, // WHAT: Export the string rendering function. WHY: Useful for rendering templates that don't come from a file.
    renderEmailTemplate, // WHAT: Export the combined load-and-render function. WHY: This is the main function most consumers will use.
    escapeHtml, // WHAT: Export the HTML escaping utility. WHY: To allow other modules to safely escape strings for HTML insertion.
};
