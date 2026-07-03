/**
 * @fileoverview sheetLogger.js
 * @module sheetLogger
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
 * What: Appends data rows to a specified Google Sheet using the Google Sheets API and a service account.
 * Why: Allows for quick, structured logging of events (like waitlist signups or metrics) into a highly accessible format for non-technical team members without requiring complex admin dashboards.
 */
require('dotenv').config(); // WHAT: Loads environment variables from a .env file into process.env. WHY: Required to access the Google Sheets credentials locally.
const { google } = require('googleapis'); // WHAT: Imports the Google API client library. WHY: Necessary for authenticating and making requests to the Google Sheets API.


const SPREADSHEET_ID = '1dSLg9N40XzLgPxogA-sHyFXhN3GL5MVWcoxxnvVug7E'; // WHAT: Hardcodes the ID of the target Google Sheet. WHY: Determines exactly which spreadsheet the data will be appended to.


const getAuth = () => { // WHAT: Defines a function to construct the Google API authentication object. WHY: Encapsulates credential retrieval and auth logic.
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL; // WHAT: Retrieves the service account email from environment variables. WHY: Required to authenticate the API request as a specific service account.
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY; // WHAT: Retrieves the service account private key from environment variables. WHY: Provides the cryptographic key for authentication.

    if (!clientEmail || !privateKey) { // WHAT: Checks if either credential is missing. WHY: Prevents the application from attempting to authenticate without required secrets.
        throw new Error( // WHAT: Throws an explicit error. WHY: Fails fast and clearly informs the developer about missing configuration.
            'Missing GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY in .env'
        );
    }

    const auth = new google.auth.GoogleAuth({ // WHAT: Instantiates a new GoogleAuth object with the credentials. WHY: Creates the necessary authentication context for the Sheets API client.
        credentials: {
            client_email: clientEmail, // WHAT: Passes the client email. WHY: Identifies the service account.
            private_key: privateKey.replace(/\\n/g, '\n'), // WHAT: Corrects escaped newlines in the private key string. WHY: Environment variables often mangle newlines, and the crypto library requires literal newlines to parse the RSA key.
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'], // WHAT: Requests the specific OAuth scope for spreadsheets. WHY: Grants the application permission to read/write Google Sheets.
    });

    return auth; // WHAT: Returns the configured auth object. WHY: So it can be passed to the Sheets API client.
};


const appendRow = async (name, email, date = new Date().toISOString()) => { // WHAT: Defines an async function to append a row of data. WHY: Provides a reusable interface for logging user signups or events.
    try {
        const auth = getAuth(); // WHAT: Retrieves the authenticated GoogleAuth object. WHY: Required to initialize the API client.
        const sheets = google.sheets({ version: 'v4', auth }); // WHAT: Initializes the Google Sheets API client (v4). WHY: Provides the methods to interact with the spreadsheets endpoint.

        const request = { // WHAT: Constructs the payload for the append API request. WHY: Defines exactly where and what data to insert.
            spreadsheetId: SPREADSHEET_ID, // WHAT: Specifies the target spreadsheet. WHY: Tells Google which file to modify.
            range: 'Sheet1!A:C', // WHAT: Specifies the target sheet and column range. WHY: Defines the bounds where the new row should be appended.
            valueInputOption: 'USER_ENTERED', // WHAT: Sets how input data should be interpreted. WHY: 'USER_ENTERED' parses dates and numbers as if a user typed them into the UI.
            insertDataOption: 'INSERT_ROWS', // WHAT: Specifies how to insert the new data. WHY: 'INSERT_ROWS' adds a new row below existing data rather than overwriting.
            resource: {
                values: [[name, email, date]], // WHAT: Provides the actual data to insert as a 2D array. WHY: The API expects rows and columns in this structure.
            },
        };

        const response = await sheets.spreadsheets.values.append(request); // WHAT: Executes the append request asynchronously. WHY: Sends the data to Google's servers.
        console.log('Row appended successfully:', response.data); // WHAT: Logs success. WHY: Provides confirmation for debugging.
        return response.data; // WHAT: Returns the API response. WHY: Allows the caller to inspect the result (e.g., how many cells were updated).
    } catch (error) { // WHAT: Catches any errors during the API request. WHY: Prevents unhandled rejections if Google's API fails.
        console.error('Error appending row to Google Sheet:', error); // WHAT: Logs the error. WHY: Facilitates debugging network or permission issues.
        throw error; // WHAT: Re-throws the error. WHY: Allows the caller to handle the failure (e.g., returning a 500 response).
    }
};


if (require.main === module) { // WHAT: Checks if this file is being run directly as a script (e.g., `node sheetLogger.js`). WHY: Allows for manual testing of the script from the command line.
    const args = process.argv.slice(2); // WHAT: Extracts command-line arguments. WHY: Skips the 'node' and filename arguments.
    const name = args[0] || 'Test User'; // WHAT: Gets the first argument or defaults to 'Test User'. WHY: Provides a default name for testing.
    const email = args[1] || 'test@example.com'; // WHAT: Gets the second argument or defaults to 'test@example.com'. WHY: Provides a default email for testing.

    appendRow(name, email) // WHAT: Calls the appendRow function with the test data. WHY: Executes the test.
        .then(() => console.log('Done.')) // WHAT: Logs 'Done.' on success. WHY: Confirms the test finished successfully.
        .catch(err => console.error('Failed:', err)); // WHAT: Logs the error on failure. WHY: Shows what went wrong during the test.
}

module.exports = { appendRow }; // WHAT: Exports the appendRow function. WHY: Makes it usable by other modules in the application.
