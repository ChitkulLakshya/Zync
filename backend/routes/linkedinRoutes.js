// Declares a constant variable 'express' and assigns it the Express.js module, which is a web framework for Node.js.
// This is needed to create and manage the server and routes for the API.
const express = require('express');
// Declares a constant variable 'router' and initializes it with a new Express router instance.
// This is needed to define a modular, mountable route handler for LinkedIn-specific API endpoints, keeping the main application file clean.
const router = express.Router();
// Declares a constant variable 'axios' and assigns it the Axios library, which is a promise-based HTTP client for the browser and Node.js.
// This is needed to make HTTP requests to the LinkedIn OAuth and API endpoints for token exchange and user information retrieval.
const axios = require('axios');
// Declares a constant variable 'admin' and assigns it the Firebase Admin SDK.
// This is needed to interact with Firebase services (like Authentication) from the backend, specifically for creating custom tokens and managing users.
const admin = require('firebase-admin');

// Checks if the Firebase Admin SDK has already been initialized by checking the length of the 'apps' array.
// This is needed to ensure Firebase Admin SDK is initialized only once, preventing errors if the module is loaded multiple times in a development environment or during hot-reloading.
if (!admin.apps.length) {
  // Initializes the Firebase Admin SDK with default credentials (usually from environment variables or a service account file).
  // This is needed to configure the SDK so it can communicate with Firebase services.
  admin.initializeApp();
}

// Declares a constant variable 'LINKEDIN_CLIENT_ID' and assigns it the value of the environment variable 'LINKEDIN_CLIENT_ID'.
// This is needed to securely retrieve the LinkedIn application's client ID, which is required for OAuth authentication, without hardcoding it in the source code.
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
// Declares a constant variable 'LINKEDIN_CLIENT_SECRET' and assigns it the value of the environment variable 'LINKEDIN_CLIENT_SECRET'.
// This is needed to securely retrieve the LinkedIn application's client secret, which is crucial for server-side token exchange, without hardcoding it.
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// Declares a constant variable 'FRONTEND_URL' and assigns it the value of the environment variable 'FRONTEND_URL'.
// If 'FRONTEND_URL' is not defined, it defaults to 'http://localhost:5173'.
// This is needed to define the URL of the frontend application, which is used for redirecting users after authentication, allowing for different environments (production, development).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Defines an HTTP GET route for the '/auth' path using the Express router.
// This endpoint initiates the LinkedIn OAuth flow by redirecting the user to LinkedIn's authorization page.
router.get('/auth', (req, res) => {
  // Constructs the 'redirectUri' dynamically using the request's protocol and host.
  // This is needed to dynamically construct the callback URL that LinkedIn will redirect to after the user grants permission, ensuring it matches the current server's address.
  const redirectUri = `${req.protocol}://${req.get('host')}/api/linkedin/callback`;
  // Defines the 'scope' variable, specifying the permissions requested from the user on LinkedIn.
  // This is needed to specify the permissions (scopes) requested from the user on LinkedIn, allowing the application to access basic profile information and email.
  const scope = 'openid profile email';
  // Generates a random string for the 'state' parameter.
  // This is needed to generate a unique, random string that acts as a CSRF (Cross-Site Request Forgery) token, which will be verified in the callback to prevent malicious attacks.
  const state = Math.random().toString(36).substring(7);

  // Constructs the full LinkedIn authorization URL with all necessary parameters.
  // This is needed to build the complete URL for LinkedIn's authorization endpoint, including all necessary parameters like client ID, redirect URI, state, and requested scopes, to initiate the OAuth flow.
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  // Redirects the user's browser to the constructed LinkedIn authorization URL.
  // This is needed to send the user's browser to the LinkedIn authorization page, where they can log in and grant permissions to the application.
  res.redirect(authUrl);
});

// Defines an asynchronous HTTP GET route for the '/callback' path.
// This endpoint handles the redirect from LinkedIn after the user has authorized the application, processing the authorization code to obtain an access token.
router.get('/callback', async (req, res) => {
  // Uses destructuring assignment to extract 'code', 'error', and 'error_description' from the request's query parameters.
  // This is needed to retrieve the authorization code (if successful) or error information (if unsuccessful) sent by LinkedIn in the redirect URL.
  const { code, error, error_description } = req.query;

  // Checks if an 'error' parameter was received from LinkedIn.
  // This is needed to detect if LinkedIn returned an error during the authorization process, indicating the user denied access or an issue occurred.
  if (error) {
    // Redirects the user back to the frontend's login page with an encoded error message.
    // This is needed to immediately redirect the user back to the frontend's login page with an error message if LinkedIn reported an authorization error.
    return res.redirect(
      // Constructs the redirect URL for the frontend login page, including a URL-encoded error message.
      // This is needed to construct the URL for redirecting to the frontend login page, including a URL-encoded error message for display to the user.
      `${FRONTEND_URL}/login?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Checks if the 'code' parameter (authorization code) is missing.
  // This is needed to check if an authorization code was not provided by LinkedIn, which is necessary for the next step of the OAuth flow.
  if (!code) {
    // Redirects the user back to the frontend's login page with a specific error message.
    // This is needed to redirect the user back to the frontend's login page with a specific error message if the authorization code is missing, indicating an incomplete OAuth flow.
    return res.redirect(`${FRONTEND_URL}/login?error=NoCodeProvided`);
  }

  // Reconstructs the 'redirectUri' exactly as it was sent in the initial authorization request.
  // This is needed to reconstruct the exact same redirect URI that was used in the initial authorization request, which is required by LinkedIn for token exchange to prevent tampering.
  const redirectUri = `${req.protocol}://${req.get('host')}/api/linkedin/callback`;

  // Starts a try-catch block to handle potential errors during the token exchange and user information retrieval.
  // This is needed to gracefully handle any potential errors that might occur during the asynchronous operations of exchanging the code for a token, fetching user info, or interacting with Firebase.
  try {
    // Makes an asynchronous POST request to LinkedIn's token endpoint to exchange the authorization code for an access token.
    // This is needed to make an asynchronous POST request to LinkedIn's token endpoint to exchange the authorization code for an access token.
    const tokenResponse = await axios.post(
      // Specifies the URL for LinkedIn's OAuth token endpoint.
      // This is the specific LinkedIn endpoint designed for exchanging an authorization code for an access token.
      'https://www.linkedin.com/oauth/v2/accessToken',
      // Sends no direct request body, as parameters are sent via 'params' with 'application/x-www-form-urlencoded'.
      // LinkedIn's token endpoint expects parameters to be sent as `application/x-www-form-urlencoded` in the `params` object, not in the request body itself for this specific call.
      null,
      {
        // Defines the query parameters to be sent with the POST request.
        // This is needed to specify query parameters that will be appended to the URL or sent as `application/x-www-form-urlencoded` in the request body (depending on `Content-Type` header and method).
        params: {
          // Specifies the grant type as 'authorization_code' as per OAuth 2.0.
          // This is needed to inform LinkedIn that the application is requesting an access token using an authorization code, as per the OAuth 2.0 specification.
          grant_type: 'authorization_code',
          // Includes the authorization code received from LinkedIn.
          // This is needed to send the authorization code received from LinkedIn in the previous step, which is required to obtain an access token.
          code,
          // Includes the redirect URI, which LinkedIn verifies for security.
          // This is needed to send the exact redirect URI used in the initial authorization request, which LinkedIn verifies for security purposes.
          redirect_uri: redirectUri,
          // Includes the LinkedIn client ID.
          // This is needed to identify the application to LinkedIn, ensuring the request comes from a registered client.
          client_id: LINKEDIN_CLIENT_ID,
          // Includes the LinkedIn client secret for server-side authentication.
          // This is needed to authenticate the application with LinkedIn, proving its identity for server-side token exchange.
        },
        // Defines the HTTP headers for the request.
        // This is needed to specify HTTP headers for the request, such as the content type.
        headers: {
          // Sets the 'Content-Type' header to 'application/x-www-form-urlencoded'.
          // This is needed to explicitly tell LinkedIn that the request body (or parameters in this case) is formatted as URL-encoded key-value pairs, which is required by their token endpoint.
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Extracts the 'access_token' from the response data.
    // This is needed to extract the access token from LinkedIn's response, which is needed to make authenticated requests to LinkedIn's user information API.
    const accessToken = tokenResponse.data.access_token;

    // Makes an asynchronous GET request to LinkedIn's userinfo endpoint to retrieve the user's profile data.
    // This is needed to make an asynchronous GET request to LinkedIn's user information endpoint to retrieve the authenticated user's profile data.
    const userinfoResponse = await axios.get(
      // Specifies the URL for LinkedIn's user information endpoint.
      // This is the specific LinkedIn endpoint that provides basic profile information for the authenticated user.
      'https://api.linkedin.com/v2/userinfo',
      {
        // Defines the HTTP headers for the request.
        // This is needed to specify HTTP headers for the request, including the authorization token.
        headers: {
          // Sets the 'Authorization' header with the access token in 'Bearer' format.
          // This is needed to include the obtained access token in the `Authorization` header, authenticating the request to LinkedIn's userinfo endpoint.
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Extracts the user's profile data from the response.
    // This is needed to extract the user's profile data (e.g., name, email, picture) from LinkedIn's response for use in creating or updating a Firebase user.
    const profile = userinfoResponse.data;
    // Extracts the user's email from the profile data.
    // This is needed to extract the user's email address, which is essential for identifying or creating a user in Firebase Authentication.
    const email = profile.email;
    // Constructs a unique user ID (UID) for Firebase, prefixed with 'linkedin:'.
    // This is needed to create a unique user ID (UID) for Firebase that clearly indicates the user originated from LinkedIn, using LinkedIn's unique subject identifier.
    const uid = `linkedin:${profile.sub}`;
    // Determines the user's display name, prioritizing 'profile.name' or combining 'given_name' and 'family_name'.
    // This is needed to prioritize using the full name provided by LinkedIn, but fall back to combining the given and family names if the full name is not directly available.
    const displayName =
      profile.name || `${profile.given_name} ${profile.family_name}`;
    // Extracts the user's profile picture URL.
    // This is needed to extract the URL of the user's profile picture, which can be stored in Firebase Authentication for a richer user profile.
    const photoURL = profile.picture;

    // Declares a variable to hold the Firebase user record.
    // This is needed to declare a variable that will hold the Firebase user record, which might be either an existing user or a newly created one.
    let userRecord;
    // Starts a try-catch block to attempt to retrieve or create a Firebase user.
    // This is needed to attempt to retrieve an existing Firebase user by email and catch a specific error if the user is not found, allowing for user creation.
    try {
      // Attempts to retrieve a Firebase user by their email address.
      // This is needed to check if a Firebase user with the obtained LinkedIn email already exists in the Firebase project.
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (authErr) {
      // Checks if the error code indicates that the user was not found.
      // This is needed to specifically identify the error indicating that no Firebase user was found with the given email, which means a new user needs to be created.
      if (authErr.code === 'auth/user-not-found') {
        // Creates a new Firebase user with the LinkedIn profile information.
        // This is needed to create a new user account in Firebase if no existing user was found with the LinkedIn email.
        userRecord = await admin.auth().createUser({
          // Sets the unique Firebase user ID.
          // This is needed to set the unique Firebase user ID, using the LinkedIn-derived UID to maintain a clear link to the original identity provider.
          uid: uid,
          // Sets the user's email address.
          // This is needed to set the user's email address in Firebase, allowing them to be identified and potentially log in with email/password later.
          email: email,
          // Marks the email as verified since it came from LinkedIn OAuth.
          // This is needed to mark the email as verified, as it has been confirmed through the LinkedIn OAuth process.
          emailVerified: true,
          // Sets the user's display name.
          // This is needed to set the user's display name in Firebase, making their profile more user-friendly.
          displayName: displayName,
          // Sets the user's profile picture URL.
          // This is needed to set the user's profile picture URL in Firebase, using the picture provided by LinkedIn.
          photoURL: photoURL,
        });
      } else {
        // Re-throws any other authentication errors.
        // This is needed to propagate unexpected authentication errors up to the outer `catch` block, ensuring they are not silently ignored.
        throw authErr;
      }
    }

    // Creates a Firebase custom authentication token for the retrieved or newly created user.
    // This is needed to generate a secure, short-lived custom token for the authenticated Firebase user, which the frontend can use to sign in to Firebase.
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Redirects the user back to the frontend's login page, passing the custom token as a query parameter.
    // This is needed to redirect the user back to the frontend's login page, passing the Firebase custom token as a query parameter so the frontend can complete the Firebase authentication.
    res.redirect(`${FRONTEND_URL}/login?customToken=${customToken}`);
  } catch (err) {
    // Logs any errors that occurred during the OAuth process to the console.
    // This is needed to log detailed error information to the server console, helping with debugging by showing LinkedIn's specific error response or a general error message.
    console.error('LinkedIn OAuth Error:', err?.response?.data || err.message);
    // Redirects the user back to the frontend's login page with a generic error message.
    // This is needed to redirect the user back to the frontend's login page with a generic error message if any unhandled error occurred during the OAuth process.
    res.redirect(
      // Constructs the redirect URL for the frontend login page, including a URL-encoded generic error message.
      // This is needed to construct the URL for redirecting to the frontend login page, including a URL-encoded generic error message for display to the user.
      `${FRONTEND_URL}/login?error=${encodeURIComponent('LinkedIn Login Failed')}`
    );
  }
});

// Exports the router object, making it available for other modules to import and use.
// This is needed to export the configured router object, making it available for other files (e.g., the main `app.js` file) to import and use as middleware for specific routes.
module.exports = router;