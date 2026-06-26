// Declares a constant variable named 'express' and assigns it the Express.js module. `require()` is a Node.js function used to import modules.
// This line imports the Express.js framework, which is essential for building web applications and defining API routes in Node.js.
const express = require('express');
// Declares a constant variable named 'router' and initializes it with a new Express router instance. `express.Router()` creates a new router object.
// This router object is used to define a set of routes that can be mounted as a middleware, allowing for modular organization of API endpoints, specifically for handling beta signup requests.
const router = express.Router();
// Declares a constant variable named 'nodemailer' and assigns it the Nodemailer module. `require()` is a Node.js function used to import modules.
// This line imports the Nodemailer library, which is used to send emails from Node.js applications, specifically for notifying an admin about new beta signups.

// Defines a new route handler for HTTP POST requests to the root path ('/') relative to where this router is mounted.
// The `async` keyword indicates that this function will perform asynchronous operations, allowing `await` to be used inside.
// `req` is the request object containing incoming HTTP request details, and `res` is the response object used to send back HTTP responses.
// This sets up the API endpoint that clients will call to submit their beta application data, allowing the server to process the request asynchronously.
router.post('/', async (req, res) => {
  // Uses object destructuring to extract 'githubUsername', 'githubProfileUrl', and 'email' properties from the `req.body` object.
  // `req.body` contains the data sent in the POST request's body, typically from a form submission or JSON payload.
  // This efficiently retrieves the necessary user input from the incoming request, which includes the details required for the beta application.
  const { githubUsername, githubProfileUrl, email } = req.body;

  // Checks if either 'githubUsername' or 'email' is a falsy value (e.g., null, undefined, or an empty string).
  // The `!` operator negates the truthiness of the variable, and `||` is the logical OR operator.
  // This performs basic server-side validation to ensure that essential fields are provided by the user, preventing incomplete applications from being processed.
  if (!githubUsername || !email) {
    // Sends an HTTP response with a status code of 400 (Bad Request) and a JSON object containing an error message.
    // The `return` keyword stops further execution of the function.
    // If required fields are missing, this immediately informs the client about the validation error, indicating that their request was malformed or incomplete.
    return res.status(400).json({ error: 'GitHub username and email are required.' });
  }

  // Starts a `try` block, which encloses code that might throw an error.
  // This block is used to safely execute the email sending logic, allowing any potential errors during the process to be caught and handled gracefully.
  try {

    // Declares a constant variable 'adminEmail'. It attempts to retrieve the 'ADMIN_EMAIL' environment variable.
    // If `process.env.ADMIN_EMAIL` is falsy (e.g., not set), it defaults to the string 'admin@example.com'.
    // This sets the recipient email address for the beta application notifications, prioritizing a configured environment variable for flexibility and security, or providing a fallback.
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    // Checks if both 'SMTP_HOST' and 'SMTP_USER' environment variables are set and are truthy.
    // The `&&` operator is the logical AND operator.
    // This condition determines whether the application has the necessary SMTP credentials configured to actually send emails, preventing attempts to send emails without proper setup.
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      // Declares a constant variable 'transporter' and assigns it a Nodemailer transporter object.
      // `nodemailer.createTransport()` initializes a new transporter with the provided configuration object.
      // This creates the email sending mechanism, configuring it with the necessary SMTP server details to connect to an email service provider.
      const transporter = nodemailer.createTransport({
        // Sets the SMTP server host address for the transporter, retrieved from the 'SMTP_HOST' environment variable.
        // This specifies the address of the mail server that Nodemailer should connect to for sending emails.
        host: process.env.SMTP_HOST,
        // Sets the port number for the SMTP server. It retrieves 'SMTP_PORT' from environment variables, defaults to '587' if not set, and `parseInt()` converts the string to an integer with base 10.
        // This specifies the network port on the SMTP server to establish a connection, ensuring the email client communicates correctly.
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        // Sets the 'secure' option for the transporter. It evaluates to `true` if the 'SMTP_PORT' environment variable is exactly '465', indicating a secure connection (SMTPS).
        // This configures the connection security, enabling SSL/TLS encryption if the standard secure port (465) is used, protecting sensitive email content during transmission.
        secure: process.env.SMTP_PORT === '465',
        // Defines an 'auth' object within the transporter configuration.
        // This block holds the authentication credentials required to log in to the SMTP server, ensuring that the application is authorized to send emails.
        auth: {
          // Sets the username for SMTP authentication, retrieved from the 'SMTP_USER' environment variable.
          // This provides the username needed to authenticate with the SMTP server, allowing the application to send emails through the configured account.
          user: process.env.SMTP_USER,
          // Sets the password for SMTP authentication, retrieved from the 'SMTP_PASS' environment variable.
          // This provides the password needed to authenticate with the SMTP server, completing the credentials required for sending emails.
          pass: process.env.SMTP_PASS,
        },
      });

      // Declares a constant variable 'mailOptions' and assigns it an object containing the email's content and metadata.
      // This object defines all the specifics of the email to be sent, including sender, recipient, subject, and the HTML body, preparing it for dispatch.
      const mailOptions = {
        // Sets the sender's address for the email. It uses a template literal to include a friendly name "Zync Beta Onboarding" and the email address from 'SMTP_USER'.
        // This specifies who the email appears to be from, making it clear to the recipient (the admin) that it's an official notification from the Zync system.
        from: `"Zync Beta Onboarding" <${process.env.SMTP_USER}>`,
        // Sets the recipient's email address to the value stored in the 'adminEmail' variable.
        // This ensures the beta application notification is sent to the designated administrator.
        to: adminEmail,
        // Sets the subject line of the email. It uses a template literal to dynamically include the 'githubUsername' in the subject.
        // This provides a concise summary of the email's content, making it easy for the admin to identify new beta signups and the associated user at a glance.
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #333;">New Beta Collaborator Signup</h2>
            <p style="color: #555; line-height: 1.5;">A new user has requested to join the Zync Beta program!</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>GitHub Username:</strong> ${githubUsername}</p>
              <p style="margin: 0 0 10px 0;"><strong>GitHub Profile:</strong> <a href="${githubProfileUrl}" style="color: #0366d6;">${githubProfileUrl}</a></p>
              <p style="margin: 0;"><strong>Email Address:</strong> <a href="mailto:${email}" style="color: #0366d6;">${email}</a></p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">This message was generated automatically by the Zync Onboarding System.</p>
          </div>
        `,
        // Sets the HTML content of the email body. It uses a multi-line template literal to define a structured and styled email message.
        // This provides a rich, formatted message for the admin, presenting the new collaborator's details clearly and professionally within the email.
        subject: `New Zync Beta Collaborator: ${githubUsername}`,
      };

      // Calls the `sendMail` method on the 'transporter' object, passing the 'mailOptions' object.
      // The `await` keyword pauses the execution of the `async` function until the promise returned by `sendMail` is resolved (email sent or failed).
      // This line actually dispatches the email using the configured SMTP transporter, sending the beta application notification to the admin.
      await transporter.sendMail(mailOptions);
    // Starts an `else` block, which executes if the preceding `if` condition (`process.env.SMTP_HOST && process.env.SMTP_USER`) was false.
    // This block handles the scenario where SMTP credentials are not configured, providing a fallback mechanism to log the application details instead of sending an email.
    } else {
      // Logs a warning message to the console. `console.warn()` is used for non-critical but important messages.
      // This informs the developer or administrator that email sending was skipped due to missing configuration, which is crucial for debugging and operational awareness.
      console.warn('SMTP credentials not found in .env. Skipping actual email dispatch.');
      // Logs a message to the console, using a template literal to include the 'githubUsername' and 'email' of the applicant.
      // This ensures that even without email dispatch, the essential details of the beta signup are recorded in the server logs, providing a record of applications.
      console.log(`[BETA SIGNUP] User: ${githubUsername}, Email: ${email}`);
    }

    // Sends an HTTP response with a status code of 200 (OK) and a JSON object indicating success.
    // This informs the client that their beta application was successfully processed (either email sent or logged), providing positive feedback.
    res.status(200).json({ success: true, message: 'Application received successfully.' });
  // Starts a `catch` block, which executes if any error occurs within the preceding `try` block.
  // The `error` object contains details about the exception that was thrown.
  // This block is essential for handling any unexpected issues during the email sending process, preventing the server from crashing and allowing for graceful error reporting.
  } catch (error) {
    // Logs an error message to the console, including a descriptive string and the 'error' object itself.
    // `console.error()` is used for critical error messages.
    // This provides detailed information about the error that occurred during the email dispatch, which is vital for debugging and troubleshooting.
    console.error('Error dispatching collaborator beta email:', error);
    // Sends an HTTP response with a status code of 500 (Internal Server Error) and a JSON object containing a user-friendly error message.
    // This informs the client that a server-side error prevented their application from being fully processed, advising them to retry later without exposing internal error details.
    res.status(500).json({ error: 'Failed to process your application. Please try again later.' });
  }
});

// Exports the 'router' object, making it available for other files to import using `require()`.
// `module.exports` is a Node.js construct for exporting modules.
// This allows the defined API routes to be integrated into the main Express application, enabling the server to handle requests to these endpoints.
module.exports = router;