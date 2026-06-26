/**
 * EDUCATIONAL COMMENT: What and Why
 * What: A wrapper around the email-sending capabilities, primarily using the configured Google Meet/Gmail service.
 * Why: Provides a simplified, centralized interface for dispatching emails across the application, adding robust error handling for authentication failures and network issues.
 */
const { send_ZYNC_email } = require('./googleMeet'); // WHAT: Imports the core email sending function from a local module. WHY: Centralizes the actual SMTP/API logic in one place.

const sendZyncEmail = async (to, subject, html, text) => { // WHAT: Defines an async wrapper function for sending emails. WHY: Provides a standardized signature and adds error handling on top of the underlying mailer.
    try { // WHAT: Try block wrapping the email sending process. WHY: To catch and handle authentication or network failures gracefully.

        const result = await send_ZYNC_email(to, subject, html, text); // WHAT: Awaits the execution of the actual email sending logic. WHY: We need the result to know if it succeeded before continuing.
        return result; // WHAT: Returns the result object if successful. WHY: Allows the caller to verify success or access message IDs.
    } catch (error) { // WHAT: Catch block to handle any errors thrown during sending. WHY: Prevents the application from crashing and allows for specific error handling.
        if (error.code === 'EAUTH' || (error.response && error.response.status === 401)) { // WHAT: Checks if the error is specifically an authentication failure. WHY: Distinguishes between bad credentials (which need admin fixing) and generic network errors.
            console.error('Email Authentication Failed (Bad Credentials). Email was NOT sent.'); // WHAT: Logs a specific, actionable error message. WHY: Helps developers quickly identify that SMTP/API credentials are invalid.
            return null; // WHAT: Returns null instead of throwing on auth errors. WHY: Prevents the system from failing completely if email notifications break.
        }
        console.error('Error sending email:', error); // WHAT: Logs generic errors to the console. WHY: Provides context for debugging other types of failures.
        throw error; // WHAT: Re-throws non-authentication errors. WHY: Allows upstream callers to handle other types of failures appropriately.
    }
};

module.exports = { sendZyncEmail }; // WHAT: Exports the wrapped function. WHY: Makes it available for other services to send emails.
